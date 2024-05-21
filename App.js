// App.js
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainContainer';
import { AuthContext, AuthProvider } from './navigation/context/AuthContext';

function AppNavigator() {
    const { isAuthenticated } = useContext(AuthContext);

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppNavigator />
        </AuthProvider>
    );
}
