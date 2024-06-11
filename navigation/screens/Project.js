import React, { useState, useEffect, useContext } from 'react';
import {View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity, Modal, Alert} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Background from '../components/Background2';
import { AuthContext } from "../context/AuthContext";
import Config from './config.json';

export default function Project({ navigation }) {
    const { userData } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [joinProjectCode, setJoinProjectCode] = useState('');
    const [joinSuccess, setJoinSuccess] = useState(false); // Thêm trạng thái joinSuccess

    const isFocused = useIsFocused();





    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused, joinSuccess]);

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

    const gotoPlan = (id,name) => {
        navigation.navigate('Plan', { projectId: id , projectName: name});
    };

    const gotoAddProject = () => {
        navigation.navigate('AddProject');
    };

    const joinProject = async () => {
        try {
            const response = await fetch(`${Config.URLAPI}/joinproject?userId=${userData.user_id}&projectId=${joinProjectCode}`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });


                setJoinSuccess(true);

            Alert.alert('Tham gia dự án thành công!');
        } catch (error) {
            console.error(error);
            setJoinSuccess(false);
        }
        setJoinModalVisible(false);
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
                <TouchableOpacity onPress={() => setModalVisible(true)}>
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
                        <View style={{flexDirection:"column"}}>
                                <TouchableOpacity onPress={() => gotoChat(item.project_id, item.projectName)}>
                                    <View style={styles.projectcard}>
                                        <View style={{alignItems:"center",justifyContent:"center",backgroundColor:"#ffeded",borderRadius:10}}>
                                            <Image source={require("./images/group.png")}
                                                   style={styles.addbtn}
                                            />
                                        </View>
                                        <View style={styles.projectItem}>

                                            <View>

                                                    <View style={{paddingLeft:5}}>
                                                        <Text style={{fontSize:18}}>{item.projectName}</Text>
                                                    </View>

                                                <View style={{padding:5,backgroundColor:"#ffd69e",borderRadius:10}}>
                                                    <Text> {item.projectDescription}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View>
                                            <TouchableOpacity onPress={() => gotoPlan(item.project_id,item.projectName)}>
                                                <View style={styles.projectPlan}>
                                                    <Icon name="list" color={'#FFFFFF'} size={25} />
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                        </View>
                    )}
                />
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Select an Option</Text>
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity onPress={() => { setModalVisible(false); gotoAddProject(); }} style={styles.modalButton}>
                                <Text style={styles.buttonText}>Create New Project</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setModalVisible(false); setJoinModalVisible(true); }} style={styles.modalButton}>
                                <Text style={styles.buttonText}>Join Project</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={joinModalVisible}
                onRequestClose={() => setJoinModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Join Project</Text>
                        <TextInput
                            style={styles.input}
                            value={joinProjectCode}
                            onChangeText={setJoinProjectCode}
                            placeholder="Enter Project Code"
                        />
                        <TouchableOpacity onPress={joinProject} style={styles.submitButton}>
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setJoinModalVisible(false)} style={styles.closeButton}>
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    projectcard:{
    flexDirection:"row",
        backgroundColor: "#ffb267",
        alignItems:"center",
        padding:10,
        gap:10,
        marginTop:10,
        borderRadius:15,

    },
    projectItem: {
        width: 270,
        flexDirection: 'column',

        paddingLeft: 15,
        paddingRight:15
    },
    projectPlan: {

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
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        backgroundColor: '#ffab33',
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    closeButton: {
        backgroundColor: '#ffab33',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#ffab33',
        padding: 10,
        borderRadius: 5,
        marginTop: 20,
        width: '100%',
        alignItems: 'center',
    },
});
