import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, StatusBar } from 'react-native';
// Bỏ Background tự tạo, dùng View thường để tránh lỗi
// import Background from '../components/Background2'; 
import { AuthContext } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import Config from "./config.json";
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import Modal from 'react-native-modal';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

export default function Profile({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [picture, setPicture] = useState(DEFAULT_AVATAR);
    const [modalVisible, setModalVisible] = useState(false);
    const [description, setDescription] = useState('');
    const [editname, setEditname] = useState('');
    const [editemail, setEditemail] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Kiểm tra nếu có dữ liệu user thật thì dùng, không thì dùng mặc định để hiện giao diện
        if (userData && userData.user_id) {
            setPicture(userData.imagePath || DEFAULT_AVATAR);
            setDescription(userData.description || "Chưa có mô tả");
            setEditname(userData.username || "User");
            setEditemail(userData.email || "email@example.com");
        } else {
            console.log("Không có User Data, dùng dữ liệu mẫu");
            // Dữ liệu mẫu để test giao diện khi chưa login xong
            setEditname("Người dùng mẫu");
            setEditemail("demo@gmail.com");
            setDescription("Đây là tài khoản demo để test giao diện.");
        }
    }, [userData]);

    async function postJSON(data) {
        if (!userData?.user_id) {
            Alert.alert("Lỗi", "Không tìm thấy ID người dùng");
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${Config.URLAPI}/updateuser?userId=${userData.user_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            console.log("Update Success:", result);
            Alert.alert("Thành công", "Cập nhật thông tin thành công!");
        } catch (error) {
            console.error("Error:", error);
            Alert.alert("Lỗi", "Không thể cập nhật thông tin");
        } finally {
            setLoading(false);
        }
    }

    const pickImage = async () => {
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
            handleUpdate(source); // Upload luôn
            setPicture(asset.uri); // Hiển thị ngay để người dùng thấy
        }
    };

    const handleUpdate = (photo) => {
        setLoading(true);
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
            setLoading(false);
        })
        .catch((err) => {
            Alert.alert('Lỗi Upload ảnh', 'Vui lòng kiểm tra lại mạng');
            setLoading(false);
        });
    };

    const handleSaveDescription = async () => {
        const newInfo = {
            userName: editname,
            emaildto: editemail,
            description: description,
            imagePath: picture
        };
        await postJSON(newInfo);
        setModalVisible(false);
    };

    const handleLogout = () => {
        if (logout) {
            logout();
        } else {
            // Fallback nếu hàm logout chưa có
            navigation.replace('Login'); 
        }
    }

    return (
        // Thay Background bằng View thường màu cam nhạt/xám
        <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* Header Profile Card */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <Image
                                style={styles.avatar}
                                source={{ uri: picture || DEFAULT_AVATAR }}
                            />
                            <TouchableOpacity style={styles.editIconBtn} onPress={() => setModalVisible(true)}>
                                <Icon name="pen" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.username}>{editname}</Text>
                        <Text style={styles.email}>{editemail}</Text>
                    </View>

                    {/* Info Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionTitleRow}>
                            <Icon name="user-tag" size={18} color="#ffab33" />
                            <Text style={styles.sectionTitle}>Giới thiệu</Text>
                        </View>
                        <Text style={styles.descriptionText}>
                            {description || "Hãy viết đôi dòng giới thiệu về bản thân bạn..."}
                        </Text>
                    </View>

                    {/* Menu Actions */}
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => setModalVisible(true)}>
                            <View style={[styles.menuIconBox, {backgroundColor: '#e8f8f5'}]}>
                                <Icon name="user-edit" size={18} color="#2ecc71" />
                            </View>
                            <Text style={styles.menuText}>Chỉnh sửa thông tin</Text>
                            <Icon name="chevron-right" size={14} color="#ccc" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem}>
                            <View style={[styles.menuIconBox, {backgroundColor: '#fef9e7'}]}>
                                <Icon name="lock" size={18} color="#f1c40f" />
                            </View>
                            <Text style={styles.menuText}>Đổi mật khẩu</Text>
                            <Icon name="chevron-right" size={14} color="#ccc" />
                        </TouchableOpacity>
                        
                        {/* Logout Button */}
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Icon name="sign-out-alt" size={18} color="#fff" style={{marginRight: 10}}/>
                            <Text style={styles.logoutText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Edit Profile Modal */}
                <Modal 
                    isVisible={modalVisible} 
                    onBackdropPress={() => setModalVisible(false)}
                    style={styles.bottomModal}
                    // Thêm thuộc tính này để tránh lỗi modal đè lên status bar
                    avoidKeyboard={true}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalIndicator} />
                        <Text style={styles.modalTitle}>Cập nhật thông tin</Text>

                        {/* Avatar Picker in Modal */}
                        <TouchableOpacity style={styles.modalAvatarPicker} onPress={pickImage}>
                            <Image style={styles.modalAvatar} source={{ uri: picture || DEFAULT_AVATAR }} />
                            <View style={styles.modalCameraIcon}>
                                <Icon name="camera" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Tên hiển thị</Text>
                            <TextInput
                                style={styles.input}
                                value={editname}
                                onChangeText={setEditname}
                                placeholder="Nhập tên của bạn"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={editemail}
                                onChangeText={setEditemail}
                                placeholder="Nhập email"
                                keyboardType="email-address"
                                editable={false} // Thường email không cho sửa lung tung
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Giới thiệu</Text>
                            <TextInput
                                style={[styles.input, {height: 80, textAlignVertical: 'top'}]}
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Mô tả bản thân..."
                                multiline
                            />
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDescription} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
                        </TouchableOpacity>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingTop: 40,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    // Header Profile
    profileHeader: {
        alignItems: 'center',
        marginBottom: 25,
        marginTop: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 4,
        borderColor: '#fff',
        backgroundColor: '#eee'
    },
    editIconBtn: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        backgroundColor: '#ffab33',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },

    // Section Card
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 2, // Shadow cho Android
        shadowColor: '#000', // Shadow cho iOS
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 }
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    descriptionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        fontStyle: 'italic',
    },

    // Menu Actions
    menuContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 10,
        marginBottom: 20,
        elevation: 2,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        fontWeight: '500',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#ffab33',
        paddingVertical: 15,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginHorizontal: 10,
        marginBottom: 10,
    },
    logoutText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: 'bold',
    },

    // Modal Styles
    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        padding: 25,
        paddingBottom: 40,
    },
    modalIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#ddd',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalAvatarPicker: {
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#eee',
    },
    modalCameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#333',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
    },
    saveBtn: {
        backgroundColor: '#ffab33',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});