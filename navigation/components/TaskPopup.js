import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Popup = ({ task, onClose }) => (
    <View style={styles.container}>
        <Text style={styles.title}>{task.taskName}</Text>
        <Text>Start: {new Date(task.timeStart).toLocaleString()}</Text>
        <Text>End: {new Date(task.timeEnd).toLocaleString()}</Text>
        <Text>Project: {task.project.projectName}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
    </View>
);

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: '50%', // Place the popup in the center of the screen
        left: '50%', // Place the popup in the center of the screen
        transform: [{ translateX: -150 }, { translateY: -100 }], // Center the popup by transforming its position
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'black',
        zIndex: 2, // Ensure the popup is displayed on top
        width: 300, // Set a fixed width for the popup
        alignItems: 'center', // Center the content
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    closeButton: {
        marginTop: 10,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 5,
        backgroundColor: 'lightgrey',
    },
    closeButtonText: {
        fontSize: 16,
    },
});

export default Popup;
