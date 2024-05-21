import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import Background from '../components/Background2';
import { AuthContext } from "../context/AuthContext";
import Config from './config.json';
const Stack = createStackNavigator();

export default function Project({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [searchText, setSearchText] = useState('');
    console.log(tasks);
    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/getprjectbyuserId?userId=${userData.user_id}`);
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error(error);
        }
    }

    const gotoChat = (id) => {
        navigation.navigate('Chat', { projectId: id });
    };

    const gotoPlan = (id) => {
        navigation.navigate('Plan', { projectId: id });
    };

    const gotoAddProject = () => {
        navigation.navigate('AddProject');
    };

    return (
        <Background>
            <View style={{ flexDirection: 'row', marginTop: 80 }}>
                <TextInput
                    style={styles.input}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Tìm kiếm"
                />
                <TouchableOpacity onPress={gotoAddProject}>
                    <View style={styles.add}>
                        <Text style={{ color: "#FFFFFF", fontSize: 30 }}>+</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={{ padding: 10 }}>
                <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.project_id}
                    renderItem={({ item }) => (
                        <View style={{ flexDirection: "row", gap: 5 }}>
                            <TouchableOpacity onPress={() => gotoChat(item.id)}>
                                <View style={styles.projectItem}>
                                    <View>
                                        <Image source={{ uri: item.avt }} />
                                    </View>
                                    <View>
                                        <Text>{item.projectName}</Text>
                                        <Text> {item.projectDescription}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <View>
                                <TouchableOpacity onPress={() => gotoPlan(item.project_id)}>
                                    <View style={styles.projectPlan}>
                                        <Icon name="list" color={'#FFFFFF'} size={25} />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            </View>
        </Background>
    );
}

const styles = StyleSheet.create({
    input: {
        width: 280,
        borderColor: "#ffab33",
        height: 40,
        marginTop: 12,
        marginLeft: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
    },
    projectItem: {
        height:60,
        width: 330,
        backgroundColor: "#ffb267",
        marginTop: 15,
        flexDirection: 'row',
        borderRadius: 15,
        paddingLeft: 15,
        paddingTop: 10,
        gap: 15,
    },
    projectPlan: {
        width: 50,
        marginTop: 15,
        flexDirection: 'row',
        backgroundColor: "#e78f3a",
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        height: 60
    },
    add: {
        backgroundColor: "#ffab33",
        width: 80,
        height: 40,
        margin: 12,
        borderRadius: 5,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    }
});
