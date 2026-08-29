import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export async function saveSession({ accessToken, refreshToken, user }) {
    if (Platform.OS === 'web') {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    }
}

export async function loadSession() {
    if (Platform.OS === 'web') {
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const userJson = localStorage.getItem(USER_KEY);
        return {
            accessToken,
            refreshToken,
            user: userJson ? JSON.parse(userJson) : null,
        };
    } else {
        const [accessToken, refreshToken, userJson] = await Promise.all([
            SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
            SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
            SecureStore.getItemAsync(USER_KEY),
        ]);
        return {
            accessToken,
            refreshToken,
            user: userJson ? JSON.parse(userJson) : null,
        };
    }
}

export async function clearSession() {
    if (Platform.OS === 'web') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    } else {
        await Promise.all([
            SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
            SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
            SecureStore.deleteItemAsync(USER_KEY),
        ]);
    }
}

