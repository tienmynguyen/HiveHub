import * as React from 'react';
import { View, Text } from 'react-native';
import Background from '../components/Background2';
export default function Calendar({ navigation }) {
    return (
        <Background>

            <Text
                onPress={() => alert('This is the "Calendar" screen.')}
                style={{ fontSize: 26, fontWeight: 'bold' }}>Calendar</Text>
        </Background>
    );
}