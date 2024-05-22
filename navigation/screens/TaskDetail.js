import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Modal from 'react-native-modal';
import Config from "./config.json";

export default function PlanDetail({ route }) {
    const { task } = route.params;
    const [isModalVisible, setModalVisible] = useState(false);
    const [status, setStatus] = useState(task.taskStatus);

    const toggleModal = () => {
        setModalVisible(!isModalVisible);
    };
    function formatDate(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async function postJSON(data) {

        try {
            const response = await fetch(`${Config.URLAPI}/updatetask?taskId=${task.task_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log("Success:", result);
            return result; // Return the added note
        } catch (error) {
            console.error("Error:", error);
            return null;
        }
    }

    const handleStatusChange = async (newStatus) => {
        console.log(newStatus);
        setStatus(newStatus);
        const newst = {
            taskStatus: newStatus
        };

        const addedNote = await postJSON(newst);

        toggleModal();
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'DONE':
                return styles.done;
            case 'DOING':
                return styles.doing;
            case 'TODO':
                return styles.todo;
            default:
                return styles.default;
        }
    };

    return (
        <SafeAreaView>
            <View style={{ padding: 15, marginTop: 80 }}>
                <View style={styles.TaskItem}>
                    <View style={{ flexDirection: "column", justifyContent: "center" }}>
                        <Text style={{ fontSize: 20, color: "#ffad44" }}>{task.taskName}</Text>
                        <Text>{task.description}</Text>
                    </View>
                    <TouchableOpacity onPress={toggleModal}>
                        <Text style={getStatusStyle(status)}>{status}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.TaskItem2}>
                    <Text>Phụ trách: {task.user}</Text>
                    <Text>Ngày bắt đầu: {formatDate(task.timeStart)}</Text>
                    <Text>Ngày kết thúc: {formatDate(task.timeEnd)}</Text>
                    <Text>Deadline: {formatDate(task.deadline)}</Text>
                </View>
            </View>

            <Modal isVisible={isModalVisible} onBackdropPress={toggleModal}>
                <View style={styles.modalContent}>
                    <TouchableOpacity onPress={() => handleStatusChange('TODO')}>
                        <Text style={styles.optionText}>TODO</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatusChange('DOING')}>
                        <Text style={styles.optionText}>DOING</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatusChange('DONE')}>
                        <Text style={styles.optionText}>DONE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleStatusChange('ERROR')}>
                        <Text style={styles.optionText}>ERROR</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    TaskItem: {
        borderColor: "#ffad44",
        marginTop: 15,
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 15,
        alignItems: "center",
        justifyContent: "space-between"
    },
    TaskItem2: {
        borderColor: "#ffad44",
        marginTop: 15,
        flexDirection: 'column',
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 15
    },
    done: {
        color: '#20BD4C',
    },
    doing: {
        color: '#CCC403',
    },
    todo: {
        color: '#FF577F',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center'
    },
    optionText: {
        fontSize: 18,
        marginVertical: 10
    }
});
