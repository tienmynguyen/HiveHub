import React from 'react'
import { ImageBackground, StyleSheet, KeyboardAvoidingView } from 'react-native'
import { theme } from '../../theme/theme'
import {LinearGradient} from 'expo-linear-gradient'
export default function Background({ children }) {
    return (
        <ImageBackground

            style={styles.background}
        >
            <KeyboardAvoidingView style={styles.container} behavior="padding">
                {children}
            </KeyboardAvoidingView>
        </ImageBackground>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        // backgroundColor: theme.colors.surface,
        backgroundColor:'#FFFFFF'

    },
    container: {
        flex: 1,
    },
})