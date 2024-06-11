import React from 'react'
import { ImageBackground, StyleSheet, KeyboardAvoidingView } from 'react-native'
import { theme } from '../core/theme'
import {LinearGradient} from 'expo-linear-gradient'
export default function Background({ children }) {
    return (
        <LinearGradient colors={['rgba(255,236,154,0.4)','rgba(255,191,145,0.4)']}  style={styles.background}>


               <KeyboardAvoidingView style={styles.container} behavior="padding">
                   {children}
               </KeyboardAvoidingView>


        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        // backgroundColor: theme.colors.surface,

    },
    container: {

    },
})