import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Image, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Dimensions, ActivityIndicator, StatusBar, RefreshControl, Switch } from 'react-native';
import { AuthContext } from '../../auth/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import Modal from 'react-native-modal';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { DEFAULT_AVATAR, getAvatarSource } from '../../../utils/avatar';

const { width } = Dimensions.get('window');

export default function Profile({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [picture, setPicture] = useState(DEFAULT_AVATAR);
    const [modalVisible, setModalVisible] = useState(false);
    
    const [description, setDescription] = useState('');
    const [editname, setEditname] = useState('');
    const [editemail, setEditemail] = useState('');
    const [loading, setLoading] = useState(false);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    // State cho việc kéo xuống refresh
    const [refreshing, setRefreshing] = useState(false);
    const [myProjects, setMyProjects] = useState([]);
    const [myStats, setMyStats] = useState({ done: 0, overdue: 0, totalTasks: 0, totalProjects: 0 });
    const [notificationEnabled, setNotificationEnabled] = useState(true);

    function guessMimeType(uri = '') {
        const lower = String(uri).toLowerCase();
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.webp')) return 'image/webp';
        if (lower.endsWith('.heic')) return 'image/heic';
        return 'image/jpeg';
    }

    // Load dữ liệu tĩnh (Tên, Email, Avatar)
    useEffect(() => {
        if (userData && userData.user_id) {
            setPicture(userData.imagePath || DEFAULT_AVATAR);
            setDescription(userData.description || "");
            setEditname(userData.username || "User");
            setEditemail(userData.email || "email@example.com");
            loadDashboardData();
        }
    }, [userData]);

    // Hàm xử lý kéo xuống để refresh
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadDashboardData().finally(() => setRefreshing(false));
    }, []);

    async function loadDashboardData() {
        if (!userData?.user_id) return;
        setDashboardLoading(true);
        try {
            const [projectsRes, tasksRes] = await Promise.all([
                axios.get(endpoints.projects.getByUser(userData.user_id)),
                axios.get(endpoints.tasks.getByUser(userData.user_id)),
            ]);
            const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
            const tasks = Array.isArray(tasksRes.data) ? tasksRes.data : [];

            const roleList = await Promise.all(
                projects.map(async (p) => {
                    try {
                        const { data } = await axios.get(endpoints.projects.getRole(p.project_id, userData.user_id));
                        return { ...p, roleName: data?.role?.roleName || 'Member' };
                    } catch (_err) {
                        return { ...p, roleName: 'Member' };
                    }
                }),
            );
            setMyProjects(roleList);

            const done = tasks.filter((t) => {
                const st = String(t.taskStatus || '').toUpperCase();
                return st === 'DONE' || st === 'COMPLETED' || st === 'APPROVED';
            }).length;
            const overdue = tasks.filter((t) => {
                const st = String(t.taskStatus || '').toUpperCase();
                if (st === 'DONE' || st === 'COMPLETED' || st === 'APPROVED') return false;
                const dueRaw = t?.deadline || t?.timeEnd || t?.timeStart;
                if (!dueRaw) return false;
                const due = new Date(dueRaw);
                return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
            }).length;
            setMyStats({
                done,
                overdue,
                totalTasks: tasks.length,
                totalProjects: projects.length,
            });
        } catch (_error) {
            // silent fail for dashboard cards
        } finally {
            setDashboardLoading(false);
        }
    }

    async function postJSON(data) {
        if (!userData?.user_id) return;
        setLoading(true);
        try {
            await axios.post(endpoints.user.update(userData.user_id), data);
            Alert.alert("Thành công", "Đã lưu thông tin!");
        } catch (error) {
            Alert.alert("Lỗi", "Không thể cập nhật");
        } finally {
            setLoading(false);
        }
    }

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Thiếu quyền", "Vui lòng cấp quyền truy cập ảnh để cập nhật avatar.");
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });
        if (!result.canceled) {
            const asset = result.assets[0];
            const mimeType = asset.mimeType || guessMimeType(asset.uri);
            const base64Data = asset.base64 || (await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }).catch(() => null));
            const source = {
                uri: asset.uri,
                type: mimeType,
                name: asset.fileName ? asset.fileName : `IMG_${Date.now()}.jpg`,
                base64: base64Data,
            };
            handleUpdate(source);
        }
    };

    const handleUpdate = async (photo) => {
        setLoading(true);
        try {
            const data = new FormData();
            const mimeType = photo.type || 'image/jpeg';
            if (!photo.base64) {
                throw new Error('Không thể đọc dữ liệu ảnh (base64).');
            }
            data.append('file', `data:${mimeType};base64,${photo.base64}`);
            data.append('upload_preset', 'HiveHub');
            // Use fetch to avoid global axios Authorization header leaking to Cloudinary.
            const response = await fetch('https://api.cloudinary.com/v1_1/dndzoxaym/image/upload', {
                method: 'POST',
                body: data,
            });
            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData?.error?.message || 'Cloudinary upload failed');
            }
            const uploadedUrl = resData?.secure_url || resData?.url;
            if (!uploadedUrl) {
                throw new Error('Upload response missing image URL');
            }
            setPicture(uploadedUrl);
        } catch (error) {
            const detail = error?.message || 'Không xác định';
            Alert.alert("Lỗi tải ảnh", `Không thể tải ảnh lên: ${detail}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInfo = async () => {
        const newInfo = {
            userName: editname,
            email: editemail,
            description: description,
            imagePath: picture,
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
                            <Image style={styles.avatar} source={getAvatarSource({ imagePath: picture })} />
                            <TouchableOpacity style={styles.editIconBtn} onPress={() => setModalVisible(true)}>
                                <Icon name="pen" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.username}>{editname}</Text>
                        <Text style={styles.email}>{editemail}</Text>
                    </View>

                    <View style={styles.sectionCard}>
                        <View style={styles.sectionTitleRow}>
                            <Icon name="chart-line" size={18} color="#ffab33" />
                            <Text style={styles.sectionTitle}>Thống kê cá nhân</Text>
                        </View>
                        {dashboardLoading ? (
                            <ActivityIndicator color="#ffab33" style={{ marginVertical: 8 }} />
                        ) : (
                            <View style={styles.statsGrid}>
                                <View style={styles.statsBox}>
                                    <Text style={styles.statsValue}>{myStats.totalProjects}</Text>
                                    <Text style={styles.statsLabel}>Projects</Text>
                                </View>
                                <View style={styles.statsBox}>
                                    <Text style={styles.statsValue}>{myStats.totalTasks}</Text>
                                    <Text style={styles.statsLabel}>Tasks</Text>
                                </View>
                                <View style={styles.statsBox}>
                                    <Text style={styles.statsValue}>{myStats.done}</Text>
                                    <Text style={styles.statsLabel}>Done</Text>
                                </View>
                                <View style={styles.statsBox}>
                                    <Text style={[styles.statsValue, { color: myStats.overdue > 0 ? '#ef4444' : '#0f172a' }]}>{myStats.overdue}</Text>
                                    <Text style={styles.statsLabel}>Overdue</Text>
                                </View>
                            </View>
                        )}
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

                    <View style={styles.sectionCard}>
                        <View style={styles.sectionTitleRow}>
                            <Icon name="users" size={18} color="#ffab33" />
                            <Text style={styles.sectionTitle}>Project & Role</Text>
                        </View>
                        {myProjects.length === 0 ? (
                            <Text style={styles.descriptionText}>Bạn chưa tham gia dự án nào.</Text>
                        ) : (
                            myProjects.slice(0, 6).map((project) => (
                                <View key={String(project.project_id)} style={styles.projectRoleRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.projectRoleName} numberOfLines={1}>{project.projectName}</Text>
                                        <Text style={styles.projectRoleId} numberOfLines={1}>{project.project_id}</Text>
                                    </View>
                                    <View style={styles.roleBadge}>
                                        <Text style={styles.roleBadgeText}>{project.roleName || 'Member'}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.sectionCard}>
                        <View style={styles.sectionTitleRow}>
                            <Icon name="sliders-h" size={18} color="#ffab33" />
                            <Text style={styles.sectionTitle}>Settings</Text>
                        </View>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Icon name="bell" size={16} color="#334155" />
                                <Text style={styles.settingLabel}>Notification</Text>
                            </View>
                            <Switch
                                value={notificationEnabled}
                                onValueChange={setNotificationEnabled}
                                thumbColor={notificationEnabled ? '#fff' : '#f1f5f9'}
                                trackColor={{ false: '#cbd5e1', true: '#ffab33' }}
                            />
                        </View>
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
                            <Image style={styles.modalAvatar} source={getAvatarSource({ imagePath: picture })} />
                            <View style={styles.modalCameraIcon}><Icon name="camera" size={16} color="#fff" /></View>
                        </TouchableOpacity>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Tên hiển thị</Text>
                            <TextInput style={styles.input} value={editname} onChangeText={setEditname} />
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
    
    sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 10 },
    descriptionText: { fontSize: 14, color: '#555', lineHeight: 22, fontStyle: 'italic' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    statsBox: {
        width: '48%',
        backgroundColor: '#fff5e6',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    statsValue: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    statsLabel: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    projectRoleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        paddingVertical: 10,
    },
    projectRoleName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    projectRoleId: { fontSize: 11, color: '#64748b', marginTop: 2 },
    roleBadge: {
        backgroundColor: '#fff5e6',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginLeft: 8,
    },
    roleBadgeText: { color: '#9a3412', fontSize: 11, fontWeight: '700' },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    settingLabel: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#334155' },
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