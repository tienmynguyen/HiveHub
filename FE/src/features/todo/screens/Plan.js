import React, { useContext, useEffect, useState } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, Image, Alert, Modal, StyleSheet, Dimensions, ActivityIndicator, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; 
import { AuthContext } from "../../auth/context/AuthContext";
import { useIsFocused } from "@react-navigation/native";
import { Clipboard } from 'react-native';
import GanttChart from "../components/GanttChart";
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';

const { width } = Dimensions.get('window');

// DỮ LIỆU GIẢ ĐỂ TEST
const MOCK_TASKS = [
    { task_id: 1, taskName: "Thiết kế Database", description: "Vẽ ERD và tạo bảng", taskStatus: "DONE", is_approved: false, deadline: new Date().toISOString(), timeStart: new Date(), timeEnd: new Date() },
    { task_id: 2, taskName: "Code API Login", description: "JWT Authentication", taskStatus: "DOING", is_approved: false, deadline: new Date().toISOString(), timeStart: new Date(), timeEnd: new Date() },
    { task_id: 3, taskName: "Test giao diện", description: "Kiểm tra trên iPhone", taskStatus: "TODO", is_approved: false, deadline: new Date().toISOString(), timeStart: new Date(), timeEnd: new Date() },
];

export default function Plan({ navigation, route }) {
    const { userData } = useContext(AuthContext);
    const isFocused = useIsFocused();
    
    const [modalVisible, setModalVisible] = useState(false);
    const [editPopupVisible, setEditPopupVisible] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [tasks, setTasks] = useState([]); 
    const [expandedUser, setExpandedUser] = useState(null);
    const [user, setUser] = useState([]);
    const [role, setRole] = useState(3);
    const [loading, setLoading] = useState(false);

    const { projectId, projectName } = route.params || { projectId: null, projectName: "Chi tiết dự án" };

    useEffect(() => {
        if (isFocused) {
            fetchData();
            getuser();
            if(projectId) checkRole();
        }
    }, [isFocused]);

    // --- LOGIC MỚI: TÍNH TOÁN CHO NÚT THÔNG BÁO ---
    const currentUserInfo = user.find(u => u.user_id === userData.user_id);
    const isOwner = currentUserInfo?.roleName === 'Owner'; 

    // Lọc danh sách task DONE nhưng chưa duyệt (chưa có txHash hoặc is_approved = false)
    const pendingTasks = tasks.filter(t => t.taskStatus === 'DONE' && !t.txHash && !t.is_approved);
    const pendingCount = pendingTasks.length;

    const handleReviewTask = async () => {
        // 1. Lấy task cần duyệt
        const taskToApprove = pendingTasks[0]; 
        if (!taskToApprove) {
            Alert.alert("Thông báo", "Không có task nào cần duyệt.");
            return;
        }

        // 2. Lấy ID Admin
        const adminId = userData.user_id; 

        setLoading(true);
        try {
            console.log("Đang gọi API duyệt task...");
            
            // 3. Gọi API Spring Boot
            const { data } = await axios.post(endpoints.tasks.approve(), {
                    taskId: taskToApprove.task_id,
                    projectId: projectId.toString(),
                    adminId: adminId
            });

            // 4. Xử lý kết quả
            if (data?.txHash) {
                Alert.alert(
                    "Thành công! 🎉", 
                    `Đã duyệt và ghi lên Blockchain.\nTxHash: ${data.txHash}`
                );
                fetchData(); 
            } else {
                Alert.alert("Lỗi", data.message || "Không thể duyệt bài.");
            }

        } catch (error) {
            console.error(error);
            Alert.alert("Lỗi mạng", "Không thể kết nối tới Server.");
        } finally {
            setLoading(false);
        }
    };
    // ------------------------------------------------

    async function checkRole() {
        try {
            const { data: json } = await axios.get(endpoints.projects.getRole(projectId, userData.user_id));
            if (json.role && json.role.role_id) setRole(json.role.role_id);
        } catch (error) { console.log(error); }
    }

    async function fetchData() {
        setLoading(true);
        try {
            if (!projectId) {
                setTasks(MOCK_TASKS);
                return;
            }
            const { data } = await axios.get(endpoints.projects.getTasks(projectId));
            
            if (Array.isArray(data) && data.length > 0) {
                setTasks(data);
            } else {
                setTasks([]); 
            }
        } catch (error) {
            setTasks(MOCK_TASKS);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(isoString) {
        if (!isoString) return "--/--";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "--/--";
        return `${date.getDate()}/${date.getMonth() + 1}`;
    }

    const getStatusConfig = (status) => {
        switch (status) {
            case 'COMPLETED': return { color: '#27ae60', bg: '#d5f5e3', label: 'Approved' }; // Đã duyệt blockchain
            case 'DONE': return { color: '#2ecc71', bg: '#e8f8f5', label: 'Done' };
            case 'DOING': return { color: '#f1c40f', bg: '#fef9e7', label: 'Doing' };
            case 'TODO': return { color: '#e74c3c', bg: '#fdedec', label: 'To Do' };
            case 'ERROR': return { color: '#333', bg: '#ddd', label: 'Error' };
            default: return { color: '#95a5a6', bg: '#f4f6f7', label: status || '...' };
        }
    };

    const gotoTaskDetail = (item) => navigation.navigate('TaskDetail', { task: item ,projectId: projectId});
    const gotoAddTask = () => navigation.navigate('AddTask', { projectId: projectId });
    const copyToClipboard = () => {
        Clipboard.setString(projectId ? projectId.toString() : "");
        Alert.alert('Đã sao chép', `Mã: ${projectId}`);
    };

    // --- User & Role Logic ---
    async function getRole(userId) {
        try {
            const { data: json } = await axios.get(endpoints.projects.getRole(projectId, userId));
            return json.role ? json.role.roleName : 'Member';
        } catch (error) { return 'Member'; }
    }
    async function getuser() {
        if(!projectId) return;
        try {
            const { data } = await axios.get(endpoints.projects.getUsers(projectId));
            if (Array.isArray(data)) {
                const usersWithRoles = await Promise.all(data.map(async (u) => {
                    const roleName = await getRole(u.user_id);
                    return { ...u, roleName };
                }));
                setUser(usersWithRoles);
            }
        } catch (error) { console.error(error); }
    }
    async function editRole(uid, rid) {
         try {
            const { data: result } = await axios.post(endpoints.projects.updateUserRole(projectId, uid, rid), {});
            if (result.role && result.role.role_id == rid) {
                const updatedUsers = user.map((u) => {
                    if (u.user_id === uid) u.roleName = rid === 2 ? 'Leader' : 'Member';
                    return u;
                });
                setUser(updatedUsers);
            }
        } catch (error) { console.error(error); }
    }
    const toggleUserExpand = (userId) => { setExpandedUser(expandedUser === userId ? null : userId); setEditPopupVisible(false); };
    const handleUserAction = (userData, action) => {
        let rl = 1; if (action === 'Leader') rl = 2; else if (action === 'Member') rl = 1;
        if (userData.roleName === 'Owner') Alert.alert("Lỗi", "Không thể sửa quyền Owner.");
        else { editRole(userData.user_id, rl); Alert.alert("Xong", `Đã đổi quyền ${userData.username}`); }
        setEditPopupVisible(false);
    };

    const renderTaskItem = ({ item }) => {
        const statusConfig = getStatusConfig(item.taskStatus);
        
        // KIỂM TRA BLOCKCHAIN
        const hasBlockchainProof = item.txHash && item.txHash.length > 5;

        return (
            <TouchableOpacity activeOpacity={0.9} style={[styles.taskCard, { borderLeftColor: statusConfig.color }]} onPress={() => gotoTaskDetail(item)}>
                <View style={styles.taskContent}>
                    {/* Hàng Tiêu đề + Icon Blockchain */}
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={[styles.taskTitle, {flex: 1}]} numberOfLines={1}>{item.taskName}</Text>
                        
                        {/* ICON BLOCKCHAIN (MỚI) */}
                        {hasBlockchainProof && (
                            <View style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f5', padding: 3, borderRadius: 4, marginLeft: 5}}>
                                <Icon name="link" size={10} color="#27ae60" />
                                <Text style={{fontSize: 9, color: '#27ae60', fontWeight: 'bold', marginLeft: 2}}>On-Chain</Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.dateContainer}>
                        <Icon name="clock-o" size={12} color="#888" style={{ marginRight: 5 }} />
                        <Text style={styles.dateText}>{formatDate(item.deadline)}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.container}>
                    {/* --- HEADER --- */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <Icon name="chevron-left" size={18} color="#333" />
                        </TouchableOpacity>
                        
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {projectName}
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            {/* --- NÚT THÔNG BÁO CHO OWNER --- */}
                            {isOwner && (
                                <TouchableOpacity style={styles.iconBtn} onPress={handleReviewTask}>
                                    <Icon name="bell-o" size={18} color="#333" />
                                    {pendingCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>
                                                {pendingCount > 99 ? '99+' : pendingCount}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.iconBtn} onPress={copyToClipboard}>
                                <Icon name="copy" size={18} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconBtn} onPress={() => setModalVisible(true)}>
                                <Icon name="bars" size={18} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* --- CONTENT --- */}
                    <View style={{ flex: 1 }}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#ffab33" style={{ marginTop: 50 }} />
                        ) : (
                            <FlatList
                                data={tasks}
                                keyExtractor={(item) => (item.task_id ? item.task_id.toString() : Math.random().toString())}
                                contentContainerStyle={{ paddingBottom: 80, paddingTop: 10 }}
                                showsVerticalScrollIndicator={false}
                                ListHeaderComponent={
                                    <View style={styles.chartContainer}>
                                            {tasks.length > 0 ? (
                                                <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                                            ) : (
                                                <View style={styles.emptyChart}>
                                                    <Text style={{ color: '#999' }}>Chưa có công việc nào</Text>
                                                </View>
                                            )}
                                    </View>
                                }
                                renderItem={renderTaskItem}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', marginTop: 30 }}>
                                            <Text style={{ color: '#888' }}>Danh sách trống</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>

                    {/* --- FAB BUTTON --- */}
                    {role >= 2 && (
                        <TouchableOpacity style={styles.fab} onPress={gotoAddTask}>
                            <Icon name="plus" size={24} color="#FFF" />
                        </TouchableOpacity>
                    )}

                    {/* --- SIDE DRAWER --- */}
                    <Modal transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="fade">
                        <View style={styles.modalOverlay}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
                            <View style={styles.drawerContent}>
                                <View style={styles.drawerHeader}>
                                    <Text style={styles.drawerTitle}>Thành viên</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Icon name="times" size={20} color="#555" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.inviteBox}>
                                    <Text style={styles.inviteLabel}>Code dự án:</Text>
                                    <TouchableOpacity style={styles.codeBox} onPress={copyToClipboard}>
                                        <Text style={styles.codeText}>{projectId || "..."}</Text>
                                        <Icon name="copy" size={16} color="#ffab33" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={user}
                                    keyExtractor={(item) => item.user_id.toString()}
                                    renderItem={({ item }) => (
                                        <View>
                                            <TouchableOpacity style={styles.userRow} onPress={() => toggleUserExpand(item.user_id)}>
                                                <View style={styles.userInfo}>
                                                    <Image style={styles.avatar} source={item.imagePath ? { uri: item.imagePath } : require('../assets/logo.png')} />
                                                    <View>
                                                        <Text style={styles.userName}>{item.username}</Text>
                                                        <View style={[styles.roleBadge, { backgroundColor: item.roleName === 'Owner' ? '#e8f8f5' : '#f4f6f7' }]}>
                                                            <Text style={styles.roleText}>{item.roleName}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                                <Icon name={expandedUser === item.user_id ? "chevron-up" : "chevron-down"} size={12} color="#999" />
                                            </TouchableOpacity>
                                            {expandedUser === item.user_id && (
                                                <View style={styles.userExpandArea}>
                                                    <Text style={styles.emailText}>{item.email}</Text>
                                                    {role >= 2 && item.roleName !== 'Owner' && userData.user_id !== item.user_id && (
                                                        <View style={styles.actionRow}>
                                                            {editPopupVisible ? (
                                                                <View style={styles.roleOptions}>
                                                                    <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#ffab33' }]} onPress={() => handleUserAction(item, 'Leader')}><Text style={styles.miniBtnText}>Leader</Text></TouchableOpacity>
                                                                    <TouchableOpacity style={[styles.miniBtn, { backgroundColor: '#ccc' }]} onPress={() => handleUserAction(item, 'Member')}><Text style={styles.miniBtnText}>Member</Text></TouchableOpacity>
                                                                </View>
                                                            ) : (
                                                                <TouchableOpacity style={styles.actionBtn} onPress={() => setEditPopupVisible(true)}>
                                                                    <Icon name="pencil" size={14} color="#ffab33" />
                                                                    <Text style={{ marginLeft: 5, color: '#ffab33', fontSize: 12 }}>Đổi quyền</Text>
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 30 : 0, 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#e74c3c', 
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 2,
        zIndex: 10,
        borderWidth: 1.5,
        borderColor: '#fff'
    },
    badgeText: {
        color: 'white',
        fontSize: 9,
        fontWeight: 'bold',
    },
    chartContainer: {
        marginBottom: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 150,
        paddingVertical: 10,
        elevation: 2,
    },
    emptyChart: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    taskCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        borderLeftWidth: 5,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    taskContent: { flex: 1, marginRight: 10 },
    taskTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    taskDesc: { fontSize: 13, color: '#777', marginBottom: 8 },
    dateContainer: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 12, color: '#888' },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    fab: {
        position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffab33',
        justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 999,
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
    drawerContent: { width: '80%', backgroundColor: '#fff', height: '100%', paddingTop: 50, paddingHorizontal: 20, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
    drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    drawerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    inviteBox: { backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, marginBottom: 20 },
    inviteLabel: { fontSize: 12, color: '#777', marginBottom: 5 },
    codeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    codeText: { fontSize: 16, fontWeight: 'bold', color: '#333', letterSpacing: 1 },
    userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#eee' },
    userName: { fontSize: 15, fontWeight: '600', color: '#333' },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 },
    roleText: { fontSize: 10, fontWeight: 'bold', color: '#555' },
    userExpandArea: { backgroundColor: '#fafafa', padding: 10, borderRadius: 8, marginTop: 5, marginBottom: 10 },
    emailText: { fontSize: 13, color: '#666', fontStyle: 'italic', marginBottom: 10 },
    actionRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 6, borderWidth: 1, borderColor: '#ffab33', borderRadius: 6 },
    roleOptions: { flexDirection: 'row', gap: 10 },
    miniBtn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5 },
    miniBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
});