import React, {useContext, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {emailValidator, nameValidator, passwordValidator, textValidator} from "../helpers/validators";
import Config from "./config.json";
import { AuthContext } from '../context/AuthContext';
import Project from "./Project";
export default function AddProject({ route }) {
    const { userData, logout } = useContext(AuthContext);
    const [ProjectName, setName] = useState('');
    const [ProjectDescription, setDescription] = useState('');
    const [Owner, setOwner] = useState('');
    const [TimeStart, setStart] = useState(new Date());
    const [TimeEnd, setEnd] = useState(new Date());
    const [isStartPickerVisible, setStartPickerVisibility] = useState(false);
    const [isEndPickerVisible, setEndPickerVisibility] = useState(false);
    console.log(userData.username);
    const showStartPicker = () => {
        setStartPickerVisibility(true);
    };

    const hideStartPicker = () => {
        setStartPickerVisibility(false);
    };

    const handleStartConfirm = (date) => {
        setStart(date);
        hideStartPicker();
    };

    const showEndPicker = () => {
        setEndPickerVisibility(true);
    };

    const hideEndPicker = () => {
        setEndPickerVisibility(false);
    };

    const handleEndConfirm = (date) => {
        setEnd(date);
        hideEndPicker();
    };

    console.log(ProjectName,ProjectDescription,Owner,TimeStart,TimeEnd)
    const onSubmitPressed = () => {
        fetch(`${Config.URLAPI}/createdproject?userId=${userData.user_id}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({

                projectName: ProjectName,
                projectDescription: ProjectDescription,
                projectowner: Owner,
                timeStart: TimeStart,
                timeEnd: TimeEnd
            }),
        })
            .then((response) => response.json())
            .then((responseData) => {
                console.log(responseData.projectName,"----",ProjectName)
                if (responseData.projectName == ProjectName) {

                    alert( 'Create sussces');

                } else {
                    alert(responseData.message || 'Create failed');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                alert('Something went wrong. Please try again.');
            });
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };




    return (
        <SafeAreaView style={{ flex: 1, padding: 15, marginTop: 80 }}>
            <View style={styles.TaskItem}>
                <Text style={{ fontSize: 20, color: "#ffad44" }}>Project:</Text>
                <TextInput
                    style={styles.input}
                    value={ProjectName}
                    onChangeText={text => setName(text)}
                    placeholder="New project"
                />
                <Text>Description:</Text>
                <TextInput
                    style={styles.input}
                    value={ProjectDescription}
                    onChangeText={text => setDescription(text)}
                    placeholder="Project description"
                />
            </View>
            <View style={styles.TaskItem2}>
                <Text>Owner:</Text>
                <TextInput
                    style={styles.input}
                    value={userData.user_id.toString()}
                    onChangeText={text => setOwner(text)}
                />
                <Text>Time start:</Text>
                <TouchableOpacity onPress={showStartPicker}>
                    <TextInput
                        style={styles.input}
                        value={formatDate(TimeStart)}
                        editable={false}
                        placeholder="Select start date"
                    />
                </TouchableOpacity>
                <DateTimePickerModal
                    isVisible={isStartPickerVisible}
                    mode="date"
                    onConfirm={handleStartConfirm}
                    onCancel={hideStartPicker}
                />
                <Text>Time end:</Text>
                <TouchableOpacity onPress={showEndPicker}>
                    <TextInput
                        style={styles.input}
                        value={formatDate(TimeEnd)}
                        editable={false}
                        placeholder="Select end date"
                    />
                </TouchableOpacity>
                <DateTimePickerModal
                    isVisible={isEndPickerVisible}
                    mode="date"
                    onConfirm={handleEndConfirm}
                    onCancel={hideEndPicker}
                />
            </View>
            <View style={styles.addbtnContainer}>
                <TouchableOpacity style={styles.addbtn} onPress={onSubmitPressed}>
                    <Text style={styles.taddbtn}>Create</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    TaskItem: {
        borderColor: "#ffad44",
        marginTop: 15,
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 15,
    },
    TaskItem2: {
        borderColor: "#ffad44",
        marginTop: 15,
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 15,
    },
    input: {
        borderColor: "#ffad44",
        height: 40,
        marginLeft: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
    },
    addbtnContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    addbtn: {
        backgroundColor: '#ffad44',
        borderRadius: 15,
        padding: 10,
    },
    taddbtn: {
        color: '#ffffff',
        fontSize: 25,
    },
});