import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AuthContext } from "../context/AuthContext";
import Config from './config.json';

const { width } = Dimensions.get('window');

// Dữ liệu giả phòng hờ
const MOCK_DATA = [
    { project_id: 1, projectName: "Dự án mẫu", projectDescription: "Mô tả dự án mẫu khi chưa có dữ liệu" },
];

export default function Project({ navigation }) {
    const { userData } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [searchText, setSearchText] = useState('');
    
    // State cho Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [joinModalVisible, setJoinModalVisible] = useState(false);
    const [joinProjectCode, setJoinProjectCode] = useState('');
    
    const [loading, setLoading] = useState(false);
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            fetchData();
        }
    }, [isFocused]);

    async function fetchData() {
        setLoading(true);
        try {
            const response = await fetch(`${Config.URLAPI}/getprjectbyuserId?userId=${userData?.user_id}`);
            const data = await response.json();
            
            if (data && data.length > 0) {
                setTasks(data);
            } else {
                // Nếu API trả về rỗng, có thể để mảng rỗng hoặc mock data tùy bạn
                setTasks([]); 
            }
        } catch (error) {
            console.error("Lỗi lấy danh sách dự án:", error);
        } finally {
            setLoading(false);
        }
    }

    // --- HÀM XỬ LÝ THAM GIA DỰ ÁN (Logic từ code cũ) ---
    const handleJoinProject = async () => {
        if (!joinProjectCode.trim()) {
            Alert.alert("Thông báo", "Vui lòng nhập mã dự án!");
            return;
        }

        setLoading(true);

        try {
            // BƯỚC 1: Gọi API Join Project
            // Lưu ý: Code cũ bạn dùng joinProjectCode làm projectId
            const joinUrl = `${Config.URLAPI}/joinproject?userId=${userData.user_id}&projectId=${joinProjectCode}`;
            
            const responseJoin = await fetch(joinUrl, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            // Nếu server trả về ok (status 200-299)
            if (responseJoin.ok) {
                // BƯỚC 2: Gọi API Update User Project (Set Role)
                // Logic cũ: roleId=1
                const roleUrl = `${Config.URLAPI}/updateuserproject?projectId=${joinProjectCode}&userId=${userData.user_id}&roleId=1`;
                
                await fetch(roleUrl, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                });

                // THÀNH CÔNG
                Alert.alert('Thành công', 'Tham gia dự án thành công!');
                setJoinModalVisible(false); // Tắt modal
                setJoinProjectCode('');     // Xóa mã đã nhập
                fetchData();                // Tải lại danh sách dự án
            } else {
                Alert.alert("Thất bại", "Mã dự án không đúng hoặc lỗi hệ thống.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi mạng", "Không thể kết nối đến server");
        } finally {
            setLoading(false);
        }
    };

    const gotoChat = (id, name, des) => navigation.navigate('Chat', { projectId: id, projectName: name, projectDes: des });
    const gotoPlan = (id, name) => navigation.navigate('Plan', { projectId: id, projectName: name });
    const gotoAddProject = () => navigation.navigate('AddProject');

    const filteredTasks = tasks.filter(task => 
        task.projectName?.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderProjectItem = ({ item }) => (
        <TouchableOpacity 
            activeOpacity={0.9}
            style={styles.cardContainer}
            onPress={() => gotoChat(item.project_id, item.projectName, item.projectDescription)}
        >
            <View style={styles.iconContainer}>
                <Image source={require("./images/group.png")} style={styles.projectIcon} />
            </View>
            <View style={styles.contentContainer}>
                <Text style={styles.projectTitle} numberOfLines={1}>{item.projectName}</Text>
                <Text style={styles.projectDesc} numberOfLines={2}>
                    {item.projectDescription || "No description"}
                </Text>
            </View>
            <TouchableOpacity style={styles.planButton} onPress={() => gotoPlan(item.project_id, item.projectName)}>
                <Icon name="list-ul" color={'#ffab33'} size={20} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={{flex: 1, backgroundColor: '#f9f9f9'}}> 
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.searchWrapper}>
                        <Icon name="search" size={16} color="#999" style={{marginRight: 10}}/>
                        <TextInput
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={setSearchText}
                            placeholder="Tìm kiếm dự án..."
                        />
                    </View>
                    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
                        <Icon name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* List */}
                {loading && tasks.length === 0 ? (
                    <ActivityIndicator size="large" color="#ffab33" style={{marginTop: 50}} />
                ) : (
                    <FlatList
                        data={filteredTasks}
                        keyExtractor={(item) => item.project_id.toString()}
                        renderItem={renderProjectItem}
                        contentContainerStyle={styles.listContent}
                        style={{flex: 1}}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.6 }}>
                                <Image source={require("./images/sleepbee.png")} style={{width: 100, height: 100, marginBottom: 10}} resizeMode="contain"/>
                                <Text style={{fontSize: 16, color: '#888'}}>Bạn chưa có dự án nào</Text>
                            </View>
                        }
                    />
                )}
                
                {/* MODAL 1: TÙY CHỌN */}
                 <Modal
                    animationType="fade"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Tùy chọn</Text>
                            
                            <TouchableOpacity 
                                onPress={() => { setModalVisible(false); gotoAddProject(); }} 
                                style={[styles.modalButton, styles.primaryBtn]}
                            >
                                <Icon name="plus-circle" size={18} color="#FFF" style={{marginRight: 8}}/>
                                <Text style={styles.buttonText}>Tạo dự án mới</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => { setModalVisible(false); setJoinModalVisible(true); }} 
                                style={[styles.modalButton, styles.secondaryBtn]}
                            >
                                <Icon name="sign-in" size={18} color="#ffab33" style={{marginRight: 8}}/>
                                <Text style={[styles.buttonText, {color: '#ffab33'}]}>Tham gia dự án</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeTextBtn}>
                                <Text style={styles.closeText}>Đóng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* MODAL 2: NHẬP MÃ DỰ ÁN */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={joinModalVisible}
                    onRequestClose={() => setJoinModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <Text style={styles.modalTitle}>Nhập mã dự án</Text>
                            
                            <TextInput 
                                style={styles.inputCode}
                                placeholder="Nhập ID dự án..."
                                value={joinProjectCode}
                                onChangeText={setJoinProjectCode}
                               // keyboardType="numeric" // Vì code cũ có vẻ dùng ID số
                            />

                            <View style={{flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10}}>
                                <TouchableOpacity 
                                    onPress={() => setJoinModalVisible(false)} 
                                    style={[styles.smallBtn, {backgroundColor: '#eee'}]}
                                >
                                    <Text style={{color: '#666'}}>Hủy</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    onPress={handleJoinProject} 
                                    style={[styles.smallBtn, {backgroundColor: '#ffab33'}]}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={{color: '#fff', fontWeight: 'bold'}}>Tham gia</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 60,
    },
    headerContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 15,
        alignItems: 'center',
        height: 50,
    },
    searchWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 25,
        height: 45,
        alignItems: 'center',
        paddingHorizontal: 15,
        marginRight: 10,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    addButton: {
        width: 45, height: 45, backgroundColor: "#ffab33", borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', elevation: 5,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    cardContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 15,
        padding: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    iconContainer: {
        width: 50, height: 50, borderRadius: 12, backgroundColor: '#fff5e6',
        justifyContent: 'center', alignItems: 'center', marginRight: 15,
    },
    projectIcon: { width: 30, height: 30, resizeMode: 'contain', tintColor: '#ffab33' },
    contentContainer: { flex: 1, justifyContent: 'center' },
    projectTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    projectDesc: { fontSize: 13, color: '#888' },
    planButton: { padding: 10, backgroundColor: '#fff5e6', borderRadius: 10, marginLeft: 10 },
    
    // Modal styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContainer: { width: width * 0.85, padding: 25, backgroundColor: 'white', borderRadius: 20, alignItems: 'center', elevation: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    modalButton: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    primaryBtn: { backgroundColor: '#ffab33' },
    secondaryBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#ffab33' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
    closeTextBtn: { marginTop: 10, padding: 10 },
    closeText: { color: '#888', fontSize: 15 },
    
    // Input styles
    inputCode: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 12,
        paddingHorizontal: 15,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: '#f9f9f9'
    },
    smallBtn: {
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100
    }
});