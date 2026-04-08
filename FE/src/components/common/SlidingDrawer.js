import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

const SlidingDrawer = ({ isVisible, onClose, children }) => {
    const translateX = useSharedValue(width);

    useEffect(() => {
        translateX.value = withTiming(isVisible ? width / 2 : width);
    }, [isVisible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }]
    }));

    return (
        <GestureHandlerRootView style={StyleSheet.absoluteFillObject}>
            <PanGestureHandler onGestureEvent={(event) => {
                if (event.nativeEvent.translationX > 0) {
                    translateX.value = withTiming(width);
                    onClose();
                }
            }}>
                <Animated.View style={[styles.drawer, animatedStyle]}>
                    {children}
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    drawer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: width / 2,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 5,
        padding: 20,
    },
});

export default SlidingDrawer;