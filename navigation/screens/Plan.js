import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity, Image, Alert } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from "react-native-vector-icons/FontAwesome";
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";
import { useIsFocused } from "@react-navigation/native";
import { Clipboard } from 'react-native';// Import Clipboard from @react-native-clipboard/clipboard

export default function Plan({ navigation, route }) {
    const { userData, logout } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const { projectId } = route.params;
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused]);
    console.log(projectId)

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/gettaskbyprojectid?projectid=${projectId}`);
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error(error);
        }
    }

    function formatDate(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

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

    const gotoTaskDetail = (item) => {
        navigation.navigate('TaskDetail', { task: item });
    };

    const gotoAddTask = (projectId) => {
        navigation.navigate('AddTask', { projectId: projectId });
    };

    const copyToClipboard = () => {
        Clipboard.setString(projectId);
        Alert.alert('Copied to Clipboard', `Invite code ${projectId} copied!`);
    };

    return (
        <SafeAreaView>
            <View style={{ padding: 15, marginTop: 80 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={copyToClipboard} style={{ flexDirection: "row", gap: 5 }}>
                        <Text style={{ fontSize: 15 }}>Invite code: {projectId}</Text>
                        <Icon name={"copy"} style={{ fontSize: 17 }} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.task_id}
                    renderItem={({ item }) =>
                        <TouchableOpacity style={styles.TaskItem} onPress={() => gotoTaskDetail(item)}>
                            <View style={{ flexDirection: "column", justifyContent: "center" }}>
                                <Text style={{ fontSize: 20, color: "#000000" }}>{item.taskName}</Text>
                                <Text style={{ fontSize: 16, color: "#000000" }}>{item.description}</Text>
                                <View style={{ height: 10 }}></View>
                                <Text>{formatDate(item.deadline)}</Text>
                            </View>
                            <View>
                                <Text style={getStatusStyle(item.taskStatus)}>{item.taskStatus}</Text>
                            </View>
                        </TouchableOpacity>
                    }
                />
                <TouchableOpacity style={styles.addbtnbox} onPress={() => gotoAddTask(projectId)}>
                    <Image
                        source={require("./images/add.png")}
                        style={styles.addbtn}
                    />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    TaskItem: {
        backgroundColor: "#ffb267",
        marginTop: 15,
        flexDirection: 'row',
        borderRadius: 15,
        padding: 15,
        gap: 15,
        alignItems: "center",
        justifyContent: "space-between",
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.29,
        shadowRadius: 4.65,
        elevation: 7,
    },
    done: {
        color: '#009d2c', // Màu xanh lá cho trạng thái done
    },
    doing: {
        color: '#d37e22', // Màu vàng cho trạng thái doing
    },
    todo: {
        color: '#e8174a', // Màu đỏ cho trạng thái todo
    },
    addbtnbox: {
        marginTop: 30,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
