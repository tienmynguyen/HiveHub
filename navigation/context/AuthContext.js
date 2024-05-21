// AuthContext.js
import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userData, setUserData] = useState(null);

    const logout = () => {
        setIsAuthenticated(false);
        setUserData(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, userData, setUserData, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
