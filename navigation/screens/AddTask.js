import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useIsFocused } from "@react-navigation/native";
import Config from "./config.json";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export default function AddTask({ route }) {
    const { projectId } = route.params;

    // State to manage the input values
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [selected, setSelected] = useState([]);
    const [data, setData] = useState([]);
    const [TimeStart, setStart] = useState(new Date());
    const [TimeEnd, setEnd] = useState(new Date());
    const [deadline, setDeadline] = useState(new Date());
    const [isStartPickerVisible, setStartPickerVisibility] = useState(false);
    const [isEndPickerVisible, setEndPickerVisibility] = useState(false);
    const [isDeadlinePickerVisible, setDeadlinePickerVisibility] = useState(false);

    // Function to handle the add button press


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

    const showDeadlinePicker = () => {
        setDeadlinePickerVisibility(true);
    };

    const hideDeadlinePicker = () => {
        setDeadlinePickerVisibility(false);
    };

    const handleDeadlineConfirm = (date) => {
        setDeadline(date);
        hideDeadlinePicker();
    };

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused]);

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbyprojectId?projectId=${projectId}`);
            const data = await response.json();
            setData(data);
            console.log(data);
        } catch (error) {
            console.error(error);
        }
    }

    const handleAddPress = () => {
        if (task === '' || description === '' || selected.length === 0 || TimeStart === '' || TimeEnd === '' || deadline === '') {
            Alert.alert('Error', 'All fields are required.');
        } else {
          onSubmitPressed()
        }
    };

    const onSubmitPressed = () => {
        fetch(`${Config.URLAPI}/addtask?projectId=${projectId}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({

                taskName: task,
                description: description,
                taskStatus: "TODO",
                timeStart: TimeStart,
                timeEnd: TimeEnd,
                deadline: deadline
            }),
        })
            .then((response) => response.json())
            .then((responseData) => {
                console.log(responseData.taskName,"----",task)
                if (responseData.taskName == task) {

                    selected.forEach(user_id => {
                        addusertask(responseData.task_id, user_id);
                    });

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

    const addusertask = (taskid,userid) => {
        fetch(`${Config.URLAPI}/addusertask?taskId=${taskid}&userId=${userid}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({

            }),
        })
            .then((response) => response.json())
            .then((responseData) => {
                console.log(responseData.task,"----",task)

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
        <SafeAreaView>
            <View style={{ padding: 15, marginTop: 80 }}>
                <View style={styles.TaskItem}>
                    <Text style={{ fontSize: 20, color: "#ffad44" }}>Task:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder=""
                        value={task}
                        onChangeText={setTask}
                    />
                    <Text>Description:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder=""
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>
                <View style={styles.TaskItem2}>
                    <View style={styles.container}>
                        <MultiSelect
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            inputSearchStyle={styles.inputSearchStyle}
                            iconStyle={styles.iconStyle}
                            search
                            data={data}
                            labelField="username"
                            valueField="user_id"
                            placeholder="Phụ trách"
                            searchPlaceholder="Search..."
                            value={selected}
                            onChange={item => {
                                setSelected(item);
                            }}
                            renderLeftIcon={() => (
                                <AntDesign
                                    style={styles.icon}
                                    color="black"
                                    name="Safety"
                                    size={20}
                                />
                            )}
                            selectedStyle={styles.selectedStyle}
                        />
                    </View>
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
                    <Text>Deadline:</Text>
                    <TouchableOpacity onPress={showDeadlinePicker}>
                        <TextInput
                            style={styles.input}
                            value={formatDate(deadline)}
                            editable={false}
                            placeholder="Select deadline date"
                        />
                    </TouchableOpacity>
                    <DateTimePickerModal
                        isVisible={isDeadlinePickerVisible}
                        mode="date"
                        onConfirm={handleDeadlineConfirm}
                        onCancel={hideDeadlinePicker}
                    />
                </View>
            </View>
            <View>
                <TouchableOpacity style={styles.addbtn} onPress={handleAddPress}>
                    <Text style={styles.taddbtn}>
                        ADD
                    </Text>
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
        flexDirection: 'column',
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 15,
    },
    container: {
        marginBottom: 15,
    },
    dropdown: {
        height: 50,
        borderColor: 'gray',
        borderWidth: 0.5,
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    placeholderStyle: {
        fontSize: 16,
    },
    selectedTextStyle: {
        fontSize: 16,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: 16,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    icon: {
        marginRight: 5,
    },
    selectedStyle: {
        borderRadius: 12,
        backgroundColor: '#f1f1f1',
    },
    input: {
        borderColor: "#ffad44",
        height: 40,
        marginLeft: 12,
        borderWidth: 1,
        padding: 10,
        borderRadius: 5,
    },
    addbtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    taddbtn: {
        color: '#ffffff',
        backgroundColor: '#ffad44',
        fontSize: 25,
        borderRadius: 15,
        padding: 5,
    },
});
