import {StyleSheet, Image, View, Platform} from 'react-native';
import React, {useLayoutEffect, useState} from 'react';
import Animated, {useAnimatedStyle, interpolate} from 'react-native-reanimated';
const CustomImage = ({item, x, index, size, spacer}) => {
    const [aspectRatio, setAspectRatio] = useState(1);

    // Get Image Width and Height to Calculate AspectRatio
    useLayoutEffect(() => {
        if (item.image) {
            if (Platform.OS === 'web') {
                // Default fallback aspect ratio on web to avoid resolveAssetSource crash
                setAspectRatio(16 / 9);
            } else {
                try {
                    const resolved = Image.resolveAssetSource(item.image);
                    if (resolved && resolved.width && resolved.height) {
                        setAspectRatio(resolved.width / resolved.height);
                    } else {
                        setAspectRatio(1);
                    }
                } catch (e) {
                    setAspectRatio(1);
                }
            }
        }
    }, [item.image]);

    const style = useAnimatedStyle(() => {
        const scale = interpolate(
            x.value,
            [(index - 2) * size, (index - 1) * size, index * size],
            [0.8, 1, 0.8],
        );
        return {
            transform: [{scale}],
        };
    });

    if (!item.image) {
        return <View style={{width: spacer}} key={index} />;
    }
    return (
        <View style={{width: size}} key={index}>
            <Animated.View style={[styles.imageContainer, style]}>
                <Image
                    source={item.image}
                    style={[styles.image, {aspectRatio: aspectRatio}]}
                />
            </Animated.View>
        </View>
    );
};

export default CustomImage;

const styles = StyleSheet.create({
    imageContainer: {
        borderRadius: 34,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: undefined,
    },
});