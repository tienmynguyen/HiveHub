import React, {useContext, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, SafeAreaView, StyleSheet, Alert, ScrollView} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Config from "./config.json";
import { AuthContext } from '../context/AuthContext';

export default function AddProject({ route }) {
    const { userData } = useContext(AuthContext); // Bỏ logout nếu không dùng
    const [ProjectName, setName] = useState('');
    const [ProjectDescription, setDescription] = useState('');
    // const [Owner, setOwner] = useState(''); // Biến này chưa dùng, có thể bỏ
    
    // Khởi tạo ngày mặc định
    const [TimeStart, setStart] = useState(new Date());
    const [TimeEnd, setEnd] = useState(new Date());
    
    const [isStartPickerVisible, setStartPickerVisibility] = useState(false);
    const [isEndPickerVisible, setEndPickerVisibility] = useState(false);

    // --- XỬ LÝ LỊCH START ---
    const showStartPicker = () => setStartPickerVisibility(true);
    const hideStartPicker = () => setStartPickerVisibility(false);

    const handleStartConfirm = (date) => {
        // Kiểm tra xem date có hợp lệ không trước khi set
        if (date) {
            setStart(date);
        }
        hideStartPicker();
    };

    // --- XỬ LÝ LỊCH END ---
    const showEndPicker = () => setEndPickerVisibility(true);
    const hideEndPicker = () => setEndPickerVisibility(false);

    const handleEndConfirm = (date) => {
        if (date) {
            setEnd(date);
        }
        hideEndPicker();
    };

    const onSubmitPressed = () => {
        // Validate cơ bản
        if (!ProjectName || !ProjectDescription) {
            Alert.alert("Thông báo", "Vui lòng nhập tên và mô tả dự án");
            return;
        }

        fetch(`${Config.URLAPI}/createdproject?userId=${userData.user_id}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                projectName: ProjectName,
                projectDescription: ProjectDescription,
                projectowner: userData.user_id,
                timeStart: TimeStart, // API thường nhận định dạng ISO String
                timeEnd: TimeEnd
            }),
        })
            .then((response) => response.json())
            .then((responseData) => {
                if (responseData.projectName == ProjectName) {
                    Alert.alert('Thành công', 'Đã tạo dự án thành công');
                    setrole(responseData.project_id);
                } else {
                    Alert.alert('Thất bại', responseData.message || 'Tạo dự án thất bại');
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại.');
            });
    };

    const setrole = async (role) => {
        try {
            await fetch(`${Config.URLAPI}/updateuserproject?projectId=${role}&userId=${userData.user_id}&roleId=3`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });
        } catch (error) {
            console.error(error);
        }
    };

    // Format ngày hiển thị (DD/MM/YYYY nhìn thân thiện hơn YYYY-MM-DD)
    const formatDate = (date) => {
        if (!date) return "";
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView contentContainerStyle={{ padding: 15, marginTop: 40 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: "#ffad44", marginBottom: 20, textAlign: 'center' }}>
                    Tạo Dự Án Mới
                </Text>

                <View style={styles.TaskItem}>
                    <Text style={styles.label}>Tên dự án:</Text>
                    <TextInput
                        style={styles.input}
                        value={ProjectName}
                        onChangeText={setName}
                        placeholder="Nhập tên dự án..."
                    />
                    
                    <Text style={styles.label}>Mô tả:</Text>
                    <TextInput
                        style={styles.input}
                        value={ProjectDescription}
                        onChangeText={setDescription}
                        placeholder="Mô tả chi tiết..."
                    />
                </View>

                <View style={styles.TaskItem2}>
                    <Text style={styles.label}>Ngày bắt đầu:</Text>
                    <TouchableOpacity onPress={showStartPicker} activeOpacity={0.7}>
                        {/* Dùng View giả lập Input để bắt sự kiện tốt hơn */}
                        <View style={styles.inputDate}>
                            <Text>{formatDate(TimeStart)}</Text>
                        </View>
                    </TouchableOpacity>
                    
                    <DateTimePickerModal
                        isVisible={isStartPickerVisible}
                        mode="date"
                        onConfirm={handleStartConfirm}
                        onCancel={hideStartPicker}
                        // Thêm dòng này để nút bấm rõ hơn trên iOS
                        confirmTextIOS="Chọn"
                        cancelTextIOS="Hủy"
                    />

                    <Text style={styles.label}>Ngày kết thúc:</Text>
                    <TouchableOpacity onPress={showEndPicker} activeOpacity={0.7}>
                        <View style={styles.inputDate}>
                            <Text>{formatDate(TimeEnd)}</Text>
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
                </View>

                <View style={styles.addbtnContainer}>
                    <TouchableOpacity style={styles.addbtn} onPress={onSubmitPressed}>
                        <Text style={styles.taddbtn}>Tạo Dự Án</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    TaskItem: {
        borderColor: "#ffad44",
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 10,
        marginBottom: 15,
    },
    TaskItem2: {
        borderColor: "#ffad44",
        borderWidth: 1,
        borderRadius: 15,
        padding: 15,
        gap: 10,
    },
    label: {
        fontWeight: 'bold',
        color: '#555',
        marginLeft: 5
    },
    input: {
        borderColor: "#ddd",
        borderWidth: 1,
        height: 45,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#f9f9f9'
    },
    inputDate: {
        borderColor: "#ddd",
        borderWidth: 1,
        height: 45,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        justifyContent: 'center' // Căn giữa chữ theo chiều dọc
    },
    addbtnContainer: {
        alignItems: 'center',
        marginTop: 30,
    },
    addbtn: {
        backgroundColor: '#ffad44',
        borderRadius: 15,
        paddingVertical: 12,
        paddingHorizontal: 40,
        elevation: 3, // Bóng đổ cho Android
    },
    taddbtn: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});