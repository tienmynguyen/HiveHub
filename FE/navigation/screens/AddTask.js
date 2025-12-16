import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import AntDesign from 'react-native-vector-icons/AntDesign';
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // Import thêm FontAwesome để thay thế icon lỗi
import { useIsFocused } from "@react-navigation/native";
import Config from "./config.json";
import DateTimePickerModal from "react-native-modal-datetime-picker";

export default function AddTask({ route, navigation }) {
    const { projectId } = route.params;

    // State
    const [task, setTask] = useState('');
    const [description, setDescription] = useState('');
    const [selected, setSelected] = useState([]); 
    const [userList, setUserList] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Date states
    const [TimeStart, setStart] = useState(new Date());
    const [TimeEnd, setEnd] = useState(new Date());
    const [deadline, setDeadline] = useState(new Date());

    // Picker visibility
    const [isStartPickerVisible, setStartPickerVisibility] = useState(false);
    const [isEndPickerVisible, setEndPickerVisibility] = useState(false);
    const [isDeadlinePickerVisible, setDeadlinePickerVisibility] = useState(false);

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused]);

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbyprojectId?projectId=${projectId}`);
            const rawData = await response.json();
            
            if (Array.isArray(rawData)) {
                const cleanData = rawData.map(u => ({
                    label: u.username,
                    value: u.user_id 
                }));
                setUserList(cleanData);
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        }
    }

    // --- DATE PICKER HANDLERS ---
    const showStartPicker = () => setStartPickerVisibility(true);
    const hideStartPicker = () => setStartPickerVisibility(false);
    const handleStartConfirm = (date) => { if(date) setStart(date); hideStartPicker(); };

    const showEndPicker = () => setEndPickerVisibility(true);
    const hideEndPicker = () => setEndPickerVisibility(false);
    const handleEndConfirm = (date) => { if(date) setEnd(date); hideEndPicker(); };

    const showDeadlinePicker = () => setDeadlinePickerVisibility(true);
    const hideDeadlinePicker = () => setDeadlinePickerVisibility(false);
    const handleDeadlineConfirm = (date) => { if(date) setDeadline(date); hideDeadlinePicker(); };

    // --- SUBMIT HANDLER ---
    const handleAddPress = () => {
        if (!task || !description || selected.length === 0) {
            Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên, mô tả và chọn người phụ trách.');
            return;
        }
        onSubmitPressed();
    };

    const onSubmitPressed = async () => {
        setLoading(true);
        try {
            const payload = {
                taskName: task,
                description: description,
                taskStatus: "TODO",
                timeStart: TimeStart.toISOString(),
                timeEnd: TimeEnd.toISOString(),
                deadline: deadline.toISOString()
            };

            // Log request để kiểm tra
            console.log("SENDING PAYLOAD:", JSON.stringify(payload, null, 2));

            // 1. Tạo Task
            const response = await fetch(`${Config.URLAPI}/addtask?projectId=${projectId}`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            // --- FIX RANGE ERROR: ĐỌC TEXT TRƯỚC KHI PARSE JSON ---
            const responseText = await response.text(); 
            console.log("RAW SERVER RESPONSE:", responseText); // Log chuỗi thô từ server xem có gì lạ không

            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                throw new Error("Server trả về dữ liệu không phải JSON hợp lệ.");
            }

            // Kiểm tra kết quả tạo task
            if (responseData && responseData.task_id) {
                const taskId = responseData.task_id;
                console.log(`Task created with ID: ${taskId}. Adding users...`);

                // 2. Thêm User (Dùng Promise.all)
                const userPromises = selected.map(userId => {
                    // Đảm bảo userId là chuỗi hoặc số
                    const cleanId = typeof userId === 'object' ? userId.value : userId;
                    
                    return fetch(`${Config.URLAPI}/addusertask?taskId=${taskId}&userId=${cleanId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}) 
                    });
                });

                await Promise.all(userPromises);
                console.log("All users added.");

                setLoading(false);
                Alert.alert('Thành công', 'Đã tạo công việc mới!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                // Nếu server trả về lỗi trong JSON
                throw new Error(responseData.message || 'Không nhận được task_id từ server');
            }

        } catch (error) {
            console.error('Submit Error Details:', error);
            setLoading(false);
            Alert.alert('Lỗi', `Chi tiết: ${error.message}`);
        }
    };

    const formatDate = (date) => {
        if(!date) return "";
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.headerTitle}>Tạo Công Việc Mới</Text>
                
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
                        placeholder="Mô tả nội dung..."
                        value={description}
                        onChangeText={setDescription}
                        multiline={true}
                    />
                </View>

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
                            data={userList} 
                            labelField="label"
                            valueField="value"
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

                    {/* Date Pickers */}
                    <Text style={styles.label}>Ngày bắt đầu:</Text>
                    <TouchableOpacity onPress={showStartPicker} activeOpacity={0.7}>
                        <View style={styles.dateDisplay}>
                            <AntDesign name="calendar" size={18} color="#666" style={{marginRight: 10}}/>
                            <Text style={styles.dateText}>{formatDate(TimeStart)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal isVisible={isStartPickerVisible} mode="date" onConfirm={handleStartConfirm} onCancel={hideStartPicker} confirmTextIOS="Chọn" cancelTextIOS="Hủy"/>

                    <Text style={styles.label}>Ngày kết thúc:</Text>
                    <TouchableOpacity onPress={showEndPicker} activeOpacity={0.7}>
                        <View style={styles.dateDisplay}>
                            <AntDesign name="calendar" size={18} color="#666" style={{marginRight: 10}}/>
                            <Text style={styles.dateText}>{formatDate(TimeEnd)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal isVisible={isEndPickerVisible} mode="date" onConfirm={handleEndConfirm} onCancel={hideEndPicker} confirmTextIOS="Chọn" cancelTextIOS="Hủy"/>

                    <Text style={styles.label}>Deadline:</Text>
                    <TouchableOpacity onPress={showDeadlinePicker} activeOpacity={0.7}>
                        <View style={[styles.dateDisplay, {borderColor: '#ff6b6b'}]}>
                            {/* ĐÃ SỬA ICON THÀNH FontAwesome clock-o */}
                            <FontAwesome name="clock-o" size={18} color="#ff6b6b" style={{marginRight: 10}}/>
                            <Text style={[styles.dateText, {color: '#ff6b6b'}]}>{formatDate(deadline)}</Text>
                        </View>
                    </TouchableOpacity>
                    <DateTimePickerModal isVisible={isDeadlinePickerVisible} mode="date" onConfirm={handleDeadlineConfirm} onCancel={hideDeadlinePicker} confirmTextIOS="Chọn" cancelTextIOS="Hủy"/>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.addbtn} onPress={handleAddPress} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.taddbtn}>TẠO TASK</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    scrollContainer: { padding: 20, paddingBottom: 50 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffad44', textAlign: 'center', marginBottom: 20, marginTop: 10 },
    sectionContainer: { borderColor: "#ffad44", borderWidth: 1, borderRadius: 15, padding: 15, marginBottom: 20, backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8, marginTop: 10 },
    input: { borderColor: '#ddd', borderWidth: 1, borderRadius: 8, padding: 10, backgroundColor: '#f9f9f9', fontSize: 16 },
    dateDisplay: { flexDirection: 'row', alignItems: 'center', height: 45, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#f9f9f9' },
    dateText: { fontSize: 16, color: '#333' },
    dropdownContainer: { marginBottom: 10 },
    dropdown: { height: 50, borderColor: '#ddd', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#f9f9f9' },
    placeholderStyle: { fontSize: 16, color: '#999' },
    selectedTextStyle: { fontSize: 14 },
    inputSearchStyle: { height: 40, fontSize: 16 },
    iconStyle: { width: 20, height: 20 },
    icon: { marginRight: 10 },
    selectedStyle: { borderRadius: 12, backgroundColor: '#ffe0b2', borderColor: '#ffad44', borderWidth: 1, marginTop: 5 },
    buttonContainer: { alignItems: 'center', marginTop: 10 },
    addbtn: { backgroundColor: '#ffad44', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 50, elevation: 3, minWidth: 150, alignItems: 'center' },
    taddbtn: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
});