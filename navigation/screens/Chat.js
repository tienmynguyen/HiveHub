import React from 'react';
import { View, Text } from 'react-native';

export default function Chat({ route }) {
    const { projectId } = route.params;

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text>ID của project: {projectId}</Text>
        </View>
    );
}