import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../../theme/theme';

export default function Loading({ size = 'large', style }) {
    return (
        <View style={[styles.container, style]}>
            <ActivityIndicator size={size} color={theme.colors.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});
