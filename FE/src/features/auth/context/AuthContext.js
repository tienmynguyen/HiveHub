// AuthContext.js
import React, { createContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { clearSession, loadSession, saveSession } from '../../../config/authStorage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState(null);
    const [bootstrapped, setBootstrapped] = useState(false);
    const accessTokenRef = useRef(null);
    const refreshTokenRef = useRef(null);
    const refreshPromiseRef = useRef(null);

    const applySession = async (authResponse) => {
        const user = {
            user_id: authResponse.userId,
            email: authResponse.email,
            username: authResponse.username,
            imagePath: authResponse.imagePath,
            description: authResponse.description,
            walletAddress: authResponse.walletAddress,
        };

        accessTokenRef.current = authResponse.accessToken;
        refreshTokenRef.current = authResponse.refreshToken;
        axios.defaults.headers.common.Authorization = `Bearer ${authResponse.accessToken}`;
        setUserData(user);
        setIsAuthenticated(true);
        await saveSession({
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken,
            user,
        });
    };

    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (accessTokenRef.current) {
                    config.headers = config.headers || {};
                    config.headers.Authorization = `Bearer ${accessTokenRef.current}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                const status = error?.response?.status;
                const isAuthCall = originalRequest?.url?.includes('/auth/login')
                    || originalRequest?.url?.includes('/auth/register')
                    || originalRequest?.url?.includes('/auth/refresh');

                if (status !== 401 || originalRequest?._retry || isAuthCall || !refreshTokenRef.current) {
                    return Promise.reject(error);
                }

                originalRequest._retry = true;

                if (!refreshPromiseRef.current) {
                    refreshPromiseRef.current = axios.post(endpoints.auth.refresh(), {
                        refreshToken: refreshTokenRef.current,
                    }).then(async ({ data }) => {
                        await applySession(data);
                        return data.accessToken;
                    }).finally(() => {
                        refreshPromiseRef.current = null;
                    });
                }

                try {
                    const nextAccessToken = await refreshPromiseRef.current;
                    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
                    return axios(originalRequest);
                } catch (refreshError) {
                    await logout();
                    return Promise.reject(refreshError);
                }
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            const session = await loadSession();
            if (session?.accessToken && session?.refreshToken && session?.user) {
                accessTokenRef.current = session.accessToken;
                refreshTokenRef.current = session.refreshToken;
                axios.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
                setUserData(session.user);
                setIsAuthenticated(true);
            }
            setBootstrapped(true);
        };
        bootstrap();
    }, []);

    const logout = async () => {
        if (refreshTokenRef.current) {
            try {
                await axios.post(endpoints.auth.logout(), { refreshToken: refreshTokenRef.current });
            } catch (error) {
                // ignore logout API errors
            }
        }
        delete axios.defaults.headers.common.Authorization;
        accessTokenRef.current = null;
        refreshTokenRef.current = null;
        setIsAuthenticated(false);
        setUserData(null);
        await clearSession();
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, userData, setUserData, logout, applySession, bootstrapped }}>
            {children}
        </AuthContext.Provider>
    );
};
