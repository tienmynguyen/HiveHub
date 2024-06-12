import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Image, Alert, Modal, StyleSheet,Easing  } from 'react-native'; // Corrected import
import Icon from 'react-native-vector-icons/FontAwesome';
import Background from '../components/Background2';
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";
import { useIsFocused } from "@react-navigation/native";
import { Clipboard } from 'react-native';
import GanttChart from "../components/GanttChart";
import {LinearGradient} from 'expo-linear-gradient'
export default function Plan({ navigation, route }) {
    const { userData, logout } = useContext(AuthContext);
    const isFocused = useIsFocused();
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [tasks, setTasks] = useState([]);
    const [expandedUser, setExpandedUser] = useState(null); // State for expanded user
    const { projectId, projectName } = route.params;
    const [user, setUser] = useState([]);

    useEffect(() => {
        if (isFocused) {
            fetchData();
            getuser();
        }
    }, [isFocused]);

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

    async function getRole(userId) {
        try {
            const response = await fetch(`${Config.URLAPI}/findroleinuspr?projectId=${projectId}&userId=${userId}`);
            const json = await response.json();
            return json.role.roleName;
        } catch (error) {
            console.error(error);
        }
    }

    async function getuser() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbyprojectId?projectId=${projectId}`);
            const data = await response.json();

            const usersWithRoles = await Promise.all(data.map(async (user) => {
                const roleName = await getRole(user.user_id);
                return { ...user, roleName };
            }));

            setUser(usersWithRoles);
        } catch (error) {
            console.error(error);
        }
    }

    const toggleUserExpand = (userId) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    const handleUserAction = (user) => {
        console.log('User info:', user);
    };



    return (
        <Background>
            <SafeAreaView>
                <View style={{ padding: 15, marginTop: 80 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 15 }}>
                        <TouchableOpacity>
                            <Icon name="bell" size={25} color="#000" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Icon name="bars" size={25} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 25 }}>
                        {projectName}
                    </Text>

                    <FlatList
                        style={{ height: 640 }}
                        data={tasks}
                        keyExtractor={(item) => item.task_id}
                        ListHeaderComponent={
                            <View>
                                <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                            </View>
                        }
                        renderItem={({ item }) => (
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
                        )}
                    />

                    <TouchableOpacity style={styles.addbtnbox} onPress={() => gotoAddTask(projectId)}>
                        <Image
                            source={require("./images/add.png")}
                            style={styles.addbtn}
                        />
                    </TouchableOpacity>

                    {/* Modal */}
                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                        animationIn="slideInLeft"
                        animationOut="slideOutRight"
                        animationInTiming={1500}
                        animationOutTiming={750}
                        useNativeDriver={true}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <TouchableOpacity style={styles.modalButton} onPress={copyToClipboard}>
                                    <Text>Copy Invite Code</Text>
                                </TouchableOpacity>

                                <View style={{ marginTop: 10 }}></View>
                                {user.map((userData) => (
                                    <View key={userData.user_id}>
                                        <TouchableOpacity
                                            style={styles.userItem}
                                            onPress={() => toggleUserExpand(userData.user_id)}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Image
                                                    style={styles.avt}
                                                    source={userData.imagePath ? { uri: userData.imagePath } : require('../assets/logo.png')}
                                                />
                                                <Text>{userData.username}</Text>
                                            </View>
                                            <Text>{userData.roleName}</Text>
                                        </TouchableOpacity>
                                        {expandedUser === userData.user_id && (
                                            <View style={styles.userDetails}>
                                                <Text>{userData.email}</Text>
                                                <Text>{userData.description}</Text>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleUserAction(userData)}
                                                >
                                                    <Text>Perform Action</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))}

                                <TouchableOpacity style={styles.modalButton} onPress={() => setModalVisible(false)}>
                                    <Text>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                </View>
            </SafeAreaView>
        </Background>
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
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)'

    },
    modalContent: {
        width: '70%',
        height: '100%',
        backgroundColor: 'rgb(255,224,184)',
        paddingTop: 80,
    },
    modalButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: "#ffb267",
        borderRadius: 5,
        alignItems: 'center'
    },
    avt: {
        height: 50,
        width: 50,
        borderRadius: 10
    },
    userItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        backgroundColor: "#ffb267",
        marginTop: 10,
        borderRadius: 5
    },
    userDetails: {
        paddingLeft: 15,
        paddingBottom: 10,
        marginTop:-5,
        paddingTop: 10,
        backgroundColor: "#fdc288",
        borderBottomEndRadius:5,
        borderBottomStartRadius:5
    },
    actionButton: {
        marginTop: 10,
        padding: 10,
        backgroundColor: "#ffb267",
        borderRadius: 5,
        alignItems: 'center'
    }
});
