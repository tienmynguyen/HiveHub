// App.js
import { BackHandler } from 'react-native';
import 'react-native-gesture-handler'
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './navigation/AuthStack';
import MainStack from './navigation/MainContainer';
import { AuthContext, AuthProvider } from './navigation/context/AuthContext';
import { LogBox } from 'react-native';

// Ignore log notification by message
LogBox.ignoreLogs(['Warning: ...']);

//Ignore all log notifications
LogBox.ignoreAllLogs();
// BackHandler backward-compatibility shim
// Some libraries call `BackHandler.removeEventListener`, which is removed
// or undefined in newer React Native versions. Provide a small shim that
// tracks subscriptions created via `addEventListener` and implements
// `removeEventListener(eventName, handler)` so older libraries keep working.
if (typeof BackHandler.removeEventListener !== 'function') {
    const originalAdd = BackHandler.addEventListener && BackHandler.addEventListener.bind(BackHandler);
    const handlersMap = new Map(); // eventName -> [{ handler, sub }]

    if (originalAdd) {
        BackHandler.addEventListener = (eventName, handler) => {
            const sub = originalAdd(eventName, handler);
            const list = handlersMap.get(eventName) || [];
            list.push({ handler, sub });
            handlersMap.set(eventName, list);

            // wrap returned subscription so remove also cleans our map
            const originalRemove = sub && sub.remove ? sub.remove.bind(sub) : null;
            return {
                remove: () => {
                    if (originalRemove) originalRemove();
                    const cur = handlersMap.get(eventName) || [];
                    const idx = cur.findIndex(x => x.handler === handler);
                    if (idx >= 0) cur.splice(idx, 1);
                    if (cur.length) handlersMap.set(eventName, cur); else handlersMap.delete(eventName);
                }
            };
        };
    }

    BackHandler.removeEventListener = (eventName, handler) => {
        const list = handlersMap.get(eventName) || [];
        const idx = list.findIndex(x => x.handler === handler);
        if (idx >= 0) {
            const entry = list[idx];
            if (entry && entry.sub && typeof entry.sub.remove === 'function') {
                try { entry.sub.remove(); } catch (e) { /* ignore */ }
            }
            list.splice(idx, 1);
            if (list.length) handlersMap.set(eventName, list); else handlersMap.delete(eventName);
        }
    };
}
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
