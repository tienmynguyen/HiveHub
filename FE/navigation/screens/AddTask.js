import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign'; // Đảm bảo import đúng
import { useIsFocused } from "@react-navigation/native";
import Config from "./config.json";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export default function AddTask({ route }) {
    const { projectId } = route.params;

    // State
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [selected, setSelected] = useState([]); // Mảng ID các user được chọn
    const [data, setData] = useState([]); // Danh sách user để chọn
    
    // Date states
    const [TimeStart, setStart] = useState(new Date());
    const [TimeEnd, setEnd] = useState(new Date());
    const [deadline, setDeadline] = useState(new Date());

    // Picker visibility states
    const [isStartPickerVisible, setStartPickerVisibility] = useState(false);
    const [isEndPickerVisible, setEndPickerVisibility] = useState(false);
    const [isDeadlinePickerVisible, setDeadlinePickerVisibility] = useState(false);

    // --- XỬ LÝ DATE PICKER (START) ---
    const showStartPicker = () => setStartPickerVisibility(true);
    const hideStartPicker = () => setStartPickerVisibility(false);
    const handleStartConfirm = (date) => {
        if(date) setStart(date);
        hideStartPicker();
    };

    // --- XỬ LÝ DATE PICKER (END) ---
    const showEndPicker = () => setEndPickerVisibility(true);
    const hideEndPicker = () => setEndPickerVisibility(false);
    const handleEndConfirm = (date) => {
        if(date) setEnd(date);
        hideEndPicker();
    };

    // --- XỬ LÝ DATE PICKER (DEADLINE) ---
    const showDeadlinePicker = () => setDeadlinePickerVisibility(true);
    const hideDeadlinePicker = () => setDeadlinePickerVisibility(false);
    const handleDeadlineConfirm = (date) => {
        if(date) setDeadline(date);
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
        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi", "Không thể tải danh sách thành viên.");
        }
    }

    const handleAddPress = () => {
        if (!task || !description || selected.length === 0) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên task, mô tả và chọn người phụ trách.');
        } else {
            onSubmitPressed();
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
                if (responseData.taskName == task) {
                    // Loop qua danh sách user đã chọn để add vào task
                    // Lưu ý: Cách này gọi nhiều API liên tục, có thể tối ưu phía Backend sau này
                    selected.forEach(user_id => {
                        addusertask(responseData.task_id, user_id);
                    });
                    Alert.alert('Thành công', 'Đã tạo công việc mới!');
                } else {
                    Alert.alert('Thất bại', responseData.message || 'Tạo thất bại');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                Alert.alert('Lỗi', 'Đã xảy ra lỗi hệ thống.');
            });
    };

    const addusertask = (taskid, userid) => {
        fetch(`${Config.URLAPI}/addusertask?taskId=${taskid}&userId=${userid}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
        })
        .then((response) => response.json())
        .catch((error) => console.error('Error add user task:', error));
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${day}/${month}/${year}`;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.headerTitle}>Tạo Công Việc Mới</Text>
                
                {/* PHẦN 1: THÔNG TIN CƠ BẢN */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.label}>Tên công việc <Text style={{color:'red'}}>*</Text>:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập tên task..."
                        value={task}
                        onChangeText={setTask}
                    />
                    
                    <Text style={styles.label}>Mô tả chi tiết:</Text>
                    <TextInput
                        style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
                        placeholder="Mô tả nội dung công việc..."
                        value={description}
                        onChangeText={setDescription}
                        multiline={true}
                    />
                </View>

                {/* PHẦN 2: PHÂN CÔNG & THỜI GIAN */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.label}>Phụ trách <Text style={{color:'red'}}>*</Text>:</Text>
                    <View style={styles.dropdownContainer}>
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
                            placeholder="Chọn thành viên"
                            searchPlaceholder="Tìm kiếm..."
                            value={selected}
                            onChange={item => setSelected(item)}
                            renderLeftIcon={() => (
                                <AntDesign style={styles.icon} color="black" name="user" size={20} />
                            )}
                            selectedStyle={styles.selectedStyle}
                        />
                    </View>

                    {/* Start Time */}
                    <Text style={styles.label}>Ngày bắt đầu:</Text>
                    <TouchableOpacity onPress={showStartPicker} activeOpacity={0.7}>
                        <View style={styles.dateDisplay}>
                            <AntDesign name="calendar" size={18} color="#666" style={{marginRight: 10}}/>
                            <Text style={styles.dateText}>{formatDate(TimeStart)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal
                        isVisible={isStartPickerVisible}
                        mode="date"
                        onConfirm={handleStartConfirm}
                        onCancel={hideStartPicker}
                        confirmTextIOS="Chọn"
                        cancelTextIOS="Hủy"
                    />

                    {/* End Time */}
                    <Text style={styles.label}>Ngày kết thúc:</Text>
                    <TouchableOpacity onPress={showEndPicker} activeOpacity={0.7}>
                        <View style={styles.dateDisplay}>
                            <AntDesign name="calendar" size={18} color="#666" style={{marginRight: 10}}/>
                            <Text style={styles.dateText}>{formatDate(TimeEnd)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal
                        isVisible={isEndPickerVisible}
                        mode="date"
                        onConfirm={handleEndConfirm}
                        onCancel={hideEndPicker}
                        confirmTextIOS="Chọn"
                        cancelTextIOS="Hủy"
                    />

                    {/* Deadline */}
                    <Text style={styles.label}>Deadline:</Text>
                    <TouchableOpacity onPress={showDeadlinePicker} activeOpacity={0.7}>
                        <View style={[styles.dateDisplay, {borderColor: '#ff6b6b'}]}>
                            <AntDesign name="clockcircleo" size={18} color="#ff6b6b" style={{marginRight: 10}}/>
                            <Text style={[styles.dateText, {color: '#ff6b6b'}]}>{formatDate(deadline)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal
                        isVisible={isDeadlinePickerVisible}
                        mode="date"
                        onConfirm={handleDeadlineConfirm}
                        onCancel={hideDeadlinePicker}
                        confirmTextIOS="Chọn"
                        cancelTextIOS="Hủy"
                    />
                </View>

                {/* BUTTON ADD */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.addbtn} onPress={handleAddPress}>
                        <Text style={styles.taddbtn}>TẠO TASK</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 50,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ffad44',
        textAlign: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    sectionContainer: {
        borderColor: "#ffad44",
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fff',
        // Shadow nhẹ cho đẹp
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 8,
        marginTop: 10,
    },
    input: {
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        backgroundColor: '#f9f9f9',
        fontSize: 16,
    },
    // Styles cho Date Picker giả lập
    dateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 45,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        backgroundColor: '#f9f9f9',
    },
    dateText: {
        fontSize: 16,
        color: '#333',
    },
    // Styles Dropdown
    dropdownContainer: {
        marginBottom: 10,
    },
    dropdown: {
        height: 50,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        backgroundColor: '#f9f9f9',
    },
    placeholderStyle: {
        fontSize: 16,
        color: '#999',
    },
    selectedTextStyle: {
        fontSize: 14,
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
        marginRight: 10,
    },
    selectedStyle: {
        borderRadius: 12,
        backgroundColor: '#ffe0b2', // Màu cam nhạt cho item đã chọn
        borderColor: '#ffad44',
        borderWidth: 1,
        marginTop: 5,
    },
    // Button style
    buttonContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    addbtn: {
        backgroundColor: '#ffad44',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 50,
        elevation: 3,
    },
    taddbtn: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});