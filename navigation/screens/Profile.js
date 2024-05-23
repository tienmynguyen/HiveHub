import React, { useContext, useState,useEffect  } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, TextInput } from 'react-native';
import Background from '../components/Background2';
import { AuthContext } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Config from "./config.json";
import Icon from 'react-native-vector-icons/FontAwesome';
import Modal from 'react-native-modal';

export default function Profile({ navigation }) {
    const [image, setImage] = useState(null);
    const { userData, logout } = useContext(AuthContext);
    const [picture, setPicture] = useState(userData.imagePath);
    const [modal, setModal] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [description, setDescription] = useState(userData.description);
    const [editname, setEditname] = useState(userData.username);
    const [editemail, setEditemail] = useState(userData.email);

    useEffect(() => {
        if (userData) {
            setPicture(userData.imagePath);

            setDescription(userData.description);
            setEditname(userData.username);
            setEditemail(userData.email);
        }
    }, [userData]);

    if (!userData) {
        return <Text>Loading...</Text>;
    }



    async function postJSON(data) {

        try {
            const response = await fetch(`${Config.URLAPI}/updateuser?userId=${userData.user_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log("Success:", result);
        } catch (error) {
            console.error("Error:", error);
            return null;
        }
    }



    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            const source = {
                uri: asset.uri,
                type: asset.mimeType,
                name: asset.fileName ? asset.fileName : `IMG_${Date.now()}.jpg`,
            };


            handleUpdate(source);
            setPicture(asset.uri);
        }
    };
    const handleSaveDescription = async () => {


        const newDescription = {
            userName: editname,
            emaildto: editemail,
            description: description,
            imagePath: picture
        };

        const addedNote = await postJSON(newDescription);

        setModalVisible(false);
    };

    const handleUpdate = (photo) => {
        const data = new FormData();
        data.append('file', photo);
        data.append('upload_preset', 'HiveHub');
        data.append('cloud_name', 'dndzoxaym');

        fetch('https://api.cloudinary.com/v1_1/dndzoxaym/image/upload', {
            method: 'POST',
            body: data,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'multipart/form-data',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setPicture(data.url);
                setModal(false);

                handleSaveDescription();
            })
            .catch((err) => {
                Alert.alert('Error While Uploading');
            });
    };

    return (
        <Background>
            <View style={styles.container}>
                <TouchableOpacity style={styles.iconedit} onPress={() => setModalVisible(true)}>
                    <Icon name="edit" size={40} color="#794400" />
                </TouchableOpacity>
                <TouchableOpacity >
                    <Image
                        style={styles.avt}
                        source={picture ? { uri: picture } : require('../assets/logo.png')}
                    />
                </TouchableOpacity>
                <View>
                    <Text style={styles.nameText}>{userData.username}</Text>
                </View>
                <View>
                    <Text style={styles.emailText}>{userData.email}</Text>
                </View>
            </View>
            <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{description}</Text>

            </View>
            <Modal isVisible={modalVisible}>
                <View style={styles.modalContent}>
                    <TextInput
                        style={styles.input}
                        value={editname}
                        onChangeText={setEditname}
                        placeholder="Edit your name"
                    />
                    <TextInput
                        style={styles.input}
                        value={editemail}
                        onChangeText={setEditemail}
                        placeholder="Edit your email"
                    />
                    <TextInput
                        style={styles.input}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Edit your description"
                    />
                    <View>
                        <TouchableOpacity onPress={pickImage}>
                           <View style={styles.changeavt}>
                               <Text style={{color:"#FFFFFF",fontWeight:"bold",fontSize:16}}>
                                   change avata
                               </Text>
                           </View>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={handleSaveDescription}>
                        <View style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </Modal>
            <View style={styles.logoutContainer}>
                <TouchableOpacity onPress={logout}>
                    <View style={styles.logoutButton}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </Background>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 80,
        padding: 20,
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#ffad44',
    },
    changeavt:{
        backgroundColor: '#ffad44',
        padding:15,
        borderRadius:15,
        margin:10
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconedit:{
        color:"#794400",
        position: 'absolute',
        top: 50,
        right: 10,
    },
    avt: {
        height: 150,
        width: 150,
        borderRadius: 50,
        marginBottom: 15,
        backgroundColor: '#e8e8e8',
    },
    nameContainer: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    nameText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#333',
    },
    emailText: {
        fontSize: 16,
        color: '#777',
    },
    descriptionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#ffd263',
    },
    descriptionText: {
        fontSize: 16,
        color: '#333',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        borderRadius:10,
        width: '80%',
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    saveButton: {
        backgroundColor: '#ffad44',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
    },
    logoutContainer: {
        padding: 20,
        alignItems: 'center',
        marginTop: 20,
    },
    logoutButton: {
        backgroundColor: '#ffad44',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    logoutText: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
    },
});

