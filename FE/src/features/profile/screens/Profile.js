import React, { useContext, useState, useEffect, useCallback } from 'react';
// Thêm RefreshControl vào import
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, StatusBar, Platform, RefreshControl } from 'react-native';
import { AuthContext } from '../../auth/context/AuthContext';
// Thêm useFocusEffect để tự load lại khi vào màn hình
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import Modal from 'react-native-modal';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';

const { width } = Dimensions.get('window');
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

export default function Profile({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [picture, setPicture] = useState(DEFAULT_AVATAR);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [description, setDescription] = useState('');
    const [editname, setEditname] = useState('');
    const [editemail, setEditemail] = useState('');
    const [editWallet, setEditWallet] = useState(''); 
    
    const [balance, setBalance] = useState('0');
    const [loading, setLoading] = useState(false);
    // State cho việc kéo xuống refresh
    const [refreshing, setRefreshing] = useState(false);

    // Load dữ liệu tĩnh (Tên, Email, Avatar)
    useEffect(() => {
        if (userData && userData.user_id) {
            setPicture(userData.imagePath || DEFAULT_AVATAR);
            setDescription(userData.description || "");
            setEditname(userData.username || "User");
            setEditemail(userData.email || "email@example.com");
            setEditWallet(userData.walletAddress || ""); 
        }
    }, [userData]);

    // --- LOGIC MỚI: TỰ ĐỘNG LOAD SỐ DƯ KHI MÀN HÌNH ĐƯỢC MỞ ---
    useFocusEffect(
        useCallback(() => {
            if (userData && userData.walletAddress) {
                // Gọi hàm lấy số dư mỗi khi vào màn hình Profile
                fetchBalance(userData.walletAddress);
            }
        }, [userData])
    );

    // Hàm lấy số dư từ Backend
    const fetchBalance = async (wallet) => {
        try {
            // console.log("Đang cập nhật số dư...");
            const { data } = await axios.get(endpoints.user.getBalance(wallet));
            if (data.balance) {
                setBalance(data.balance);
            }
        } catch (error) {
            console.log("Lỗi lấy số dư:", error);
        }
    };

    // Hàm xử lý kéo xuống để refresh
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        if (userData && userData.walletAddress) {
            fetchBalance(userData.walletAddress).then(() => setRefreshing(false));
        } else {
            setTimeout(() => setRefreshing(false), 1000);
        }
    }, [userData]);

    async function postJSON(data) {
        if (!userData?.user_id) return;
        setLoading(true);
        try {
            await axios.post(endpoints.user.update(userData.user_id), data);
            Alert.alert("Thành công", "Đã lưu thông tin!");
            
            // Nếu update ví mới -> Load lại số dư ngay lập tức
            if (data.walletAddress) {
                fetchBalance(data.walletAddress);
            }
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật");
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
            handleUpdate(source); 
            setPicture(asset.uri); 
        }
    };

    const handleUpdate = (photo) => {
        setLoading(true);
        const data = new FormData();
        data.append('file', photo);
        data.append('upload_preset', 'HiveHub');
        data.append('cloud_name', 'dndzoxaym');

        axios.post('https://api.cloudinary.com/v1_1/dndzoxaym/image/upload', data, {
            headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
        })
            .then((res) => {
                setPicture(res.data.url);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const handleSaveInfo = async () => {
        const newInfo = {
            userName: editname,
            emaildto: editemail,
            description: description,
            imagePath: picture,
            walletAddress: editWallet 
        };
        await postJSON(newInfo);
        setModalVisible(false);
    };

    const handleLogout = () => {
        if (logout) logout();
        else navigation.replace('Login'); 
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#f4f6f8' }}>
            <SafeAreaView style={{ flex: 1 }}>
                <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />
                
                {/* THÊM RefreshControl VÀO ĐÂY */}
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ffab33']} />
                    }
                >
                    
                    {/* Header */}
                    <View style={styles.profileHeader}>
                        <View style={styles.avatarContainer}>
                            <Image style={styles.avatar} source={{ uri: picture || DEFAULT_AVATAR }} />
                            <TouchableOpacity style={styles.editIconBtn} onPress={() => setModalVisible(true)}>
                                <Icon name="pen" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.username}>{editname}</Text>
                        <Text style={styles.email}>{editemail}</Text>
                    </View>

                    {/* --- WALLET & BALANCE CARD --- */}
                    <View style={styles.balanceCard}>
                        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                            <View>
                                <Text style={styles.balanceLabel}>Số dư Token</Text>
                                <View style={{flexDirection: 'row', alignItems: 'flex-end'}}>
                                    <Text style={styles.balanceValue}>{balance}</Text>
                                    <Text style={styles.balanceSymbol}> HIVE</Text>
                                </View>
                            </View>
                            <View style={styles.coinIcon}>
                                <Icon name="coins" size={24} color="#fff" />
                            </View>
                        </View>
                        
                        <View style={styles.walletRow}>
                            <Icon name="wallet" size={12} color="rgba(255,255,255,0.8)" style={{marginRight: 5}}/>
                            <Text style={styles.walletAddressText} numberOfLines={1} ellipsizeMode="middle">
                                {editWallet ? editWallet : "Chưa liên kết ví"}
                            </Text>
                        </View>
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

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Icon name="sign-out-alt" size={18} color="#fff" style={{marginRight: 10}}/>
                            <Text style={styles.logoutText}>Đăng xuất</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Edit Modal */}
                <Modal isVisible={modalVisible} onBackdropPress={() => setModalVisible(false)} style={styles.bottomModal} avoidKeyboard={true}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIndicator} />
                        <Text style={styles.modalTitle}>Cập nhật thông tin</Text>

                        <TouchableOpacity style={styles.modalAvatarPicker} onPress={pickImage}>
                            <Image style={styles.modalAvatar} source={{ uri: picture || DEFAULT_AVATAR }} />
                            <View style={styles.modalCameraIcon}><Icon name="camera" size={16} color="#fff" /></View>
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Tên hiển thị</Text>
                            <TextInput style={styles.input} value={editname} onChangeText={setEditname} />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Địa chỉ Ví (Metamask/Ganache)</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, borderWidth: 1, borderColor: '#eee'}}>
                                <TextInput style={[styles.input, {flex: 1, borderWidth: 0, backgroundColor: 'transparent'}]} value={editWallet} onChangeText={setEditWallet} placeholder="0x..." autoCapitalize="none" />
                                <Icon name="wallet" size={16} color="#ccc" style={{marginRight: 15}} />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Giới thiệu</Text>
                            <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} value={description} onChangeText={setDescription} multiline />
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInfo} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
                        </TouchableOpacity>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: { paddingTop: 40, paddingBottom: 40, paddingHorizontal: 20 },
    profileHeader: { alignItems: 'center', marginBottom: 20, marginTop: 20 },
    avatarContainer: { position: 'relative', marginBottom: 15, shadowOpacity: 0.2, elevation: 10 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#fff', backgroundColor: '#eee' },
    editIconBtn: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#ffab33', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    username: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    email: { fontSize: 14, color: '#666' },
    
    balanceCard: {
        backgroundColor: '#2ecc71',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 5,
        shadowColor: "#2ecc71",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', marginBottom: 5 },
    balanceValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    balanceSymbol: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 6 },
    coinIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    walletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, backgroundColor: 'rgba(0,0,0,0.1)', padding: 8, borderRadius: 8 },
    walletAddressText: { color: '#fff', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', flex: 1 },

    sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 10 },
    descriptionText: { fontSize: 14, color: '#555', lineHeight: 22, fontStyle: 'italic' },
    menuContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 20, elevation: 2 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { fontSize: 16, color: '#333', flex: 1, fontWeight: '500' },
    logoutButton: { flexDirection: 'row', backgroundColor: '#ffab33', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20, marginHorizontal: 10, marginBottom: 10 },
    logoutText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
    bottomModal: { justifyContent: 'flex-end', margin: 0 },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: 40, maxHeight: '90%' },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
    modalAvatarPicker: { alignSelf: 'center', marginBottom: 20 },
    modalAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee' },
    modalCameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#333', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#333' },
    saveBtn: { backgroundColor: '#ffab33', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});