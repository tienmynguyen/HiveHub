import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/FontAwesome5'; // Sử dụng icon cho đẹp
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";

export default function PlanDetail({ navigation, route }) {
    const { task } = route.params;
    const [isModalVisible, setModalVisible] = useState(false);
    const [status, setStatus] = useState(task.taskStatus);
    const [users, setUsers] = useState([]);
    const [comment, setComment] = useState(''); // State cho comment input
    const { userData } = useContext(AuthContext);

    useEffect(() => {
        fetchData();
    }, []);

    const toggleModal = () => {
        setModalVisible(!isModalVisible);
    };

    function formatDate(isoString) {
        if (!isoString) return "N/A";
        const date = new Date(isoString);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbytaskId?taskId=${task.task_id}`);
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
        }
    }

    function checkPermission() {
        return users.some(user => user.user_id === userData.user_id);
    }

    async function postJSON(data) {
        try {
            const response = await fetch(`${Config.URLAPI}/updatetask?taskId=${task.task_id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Error:", error);
            return null;
        }
    }

    const handleStatusChange = async (newStatus) => {
        if (checkPermission()) {
            setStatus(newStatus);
            const newStatusData = { taskStatus: newStatus };
            await postJSON(newStatusData);
        } else {
            Alert.alert("Quyền hạn", "Bạn không có quyền thay đổi trạng thái công việc này.");
        }
        toggleModal();
    };

    // Cấu hình màu sắc cho Status
    const getStatusStyle = (st) => {
        switch (st) {
            case 'DONE': return { bg: '#e8f8f5', color: '#2ecc71', label: 'Hoàn thành' };
            case 'DOING': return { bg: '#fef9e7', color: '#f1c40f', label: 'Đang làm' };
            case 'TODO': return { bg: '#fdedec', color: '#e74c3c', label: 'Cần làm' };
            case 'ERROR': return { bg: '#333', color: '#fff', label: 'Lỗi' };
            default: return { bg: '#f4f6f7', color: '#95a5a6', label: st };
        }
    };

    const currentStatusStyle = getStatusStyle(status);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết công việc</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    
                    {/* SECTION 1: TASK INFO & STATUS */}
                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <Text style={styles.taskTitle}>{task.taskName}</Text>
                            <TouchableOpacity onPress={toggleModal} style={[styles.statusBadge, { backgroundColor: currentStatusStyle.bg }]}>
                                <Text style={[styles.statusText, { color: currentStatusStyle.color }]}>{status}</Text>
                                <Icon name="edit" size={12} color={currentStatusStyle.color} style={{ marginLeft: 5 }} />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.description}>
                            {task.description || "Chưa có mô tả chi tiết cho công việc này."}
                        </Text>
                    </View>

                    {/* SECTION 2: TIMELINE */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Thời gian</Text>
                        <View style={styles.timelineContainer}>
                            <View style={styles.timeItem}>
                                <Icon name="play-circle" size={16} color="#2ecc71" />
                                <View style={{marginLeft: 10}}>
                                    <Text style={styles.timeLabel}>Bắt đầu</Text>
                                    <Text style={styles.timeValue}>{formatDate(task.timeStart)}</Text>
                                </View>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.timeItem}>
                                <Icon name="flag-checkered" size={16} color="#e74c3c" />
                                <View style={{marginLeft: 10}}>
                                    <Text style={styles.timeLabel}>Kết thúc</Text>
                                    <Text style={styles.timeValue}>{formatDate(task.timeEnd)}</Text>
                                </View>
                            </View>
                        </View>
                        
                        <View style={styles.deadlineContainer}>
                            <Icon name="clock" size={16} color="#ffad44" />
                            <Text style={styles.deadlineText}>Deadline: {formatDate(task.deadline)}</Text>
                        </View>
                    </View>

                    {/* SECTION 3: MEMBERS */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Người thực hiện ({users.length})</Text>
                        {users.map((user, index) => (
                            <View key={user.user_id} style={styles.memberRow}>
                                <View style={[styles.avatar, {backgroundColor: index % 2 === 0 ? '#ffad44' : '#4a90e2'}]}>
                                    <Text style={styles.avatarText}>{user.username.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{user.username}</Text>
                                    <Text style={styles.memberEmail}>{user.email}</Text>
                                </View>
                            </View>
                        ))}
                        {users.length === 0 && <Text style={{color:'#999', fontStyle:'italic'}}>Chưa có người phụ trách</Text>}
                    </View>

                    {/* SECTION 4: COMMENTS */}
                    <View style={[styles.card, {flex: 1, minHeight: 300}]}>
                        <Text style={styles.sectionHeader}>Thảo luận</Text>
                        <View style={styles.commentArea}>
                            <View style={styles.emptyComment}>
                                <Icon name="comments" size={40} color="#eee" />
                                <Text style={{color: '#ccc', marginTop: 10}}>Chưa có bình luận nào</Text>
                            </View>
                        </View>
                        
                        {/* Comment Input */}
                        <View style={styles.inputContainer}>
                            <TextInput 
                                style={styles.input}
                                placeholder="Viết bình luận..."
                                value={comment}
                                onChangeText={setComment}
                            />
                            <TouchableOpacity style={styles.sendButton}>
                                <Icon name="paper-plane" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* STATUS MODAL */}
            <Modal isVisible={isModalVisible} onBackdropPress={toggleModal} style={styles.bottomModal}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIndicator} />
                    <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
                    
                    {['TODO', 'DOING', 'DONE', 'ERROR'].map((st) => {
                         const style = getStatusStyle(st);
                         return (
                            <TouchableOpacity key={st} style={styles.modalOption} onPress={() => handleStatusChange(st)}>
                                <View style={[styles.modalDot, {backgroundColor: style.color}]} />
                                <Text style={styles.modalOptionText}>{st} ({style.label})</Text>
                                {status === st && <Icon name="check" size={16} color="#ffad44" />}
                            </TouchableOpacity>
                         )
                    })}
                    
                    <TouchableOpacity style={styles.cancelButton} onPress={toggleModal}>
                        <Text style={{color: '#666'}}>Hủy bỏ</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5', // Nền xám nhạt cho toàn trang
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 40, // Adjust for StatusBar
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    backButton: {
        padding: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 30,
    },
    
    // Cards
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    
    // Title Section
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    taskTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
    },
    statusText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    description: {
        color: '#666',
        fontSize: 15,
        lineHeight: 22,
    },

    // Headers
    sectionHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: '#ffad44',
        paddingLeft: 10,
    },

    // Timeline
    timelineContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    timeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    verticalDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#eee',
        marginHorizontal: 10,
    },
    timeLabel: {
        fontSize: 12,
        color: '#999',
    },
    timeValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    deadlineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff8ec',
        padding: 10,
        borderRadius: 8,
    },
    deadlineText: {
        color: '#ffad44',
        fontWeight: 'bold',
        marginLeft: 10,
    },

    // Members
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    memberEmail: {
        fontSize: 13,
        color: '#888',
    },

    // Comments
    commentArea: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        minHeight: 150,
        justifyContent: 'center',
    },
    emptyComment: {
        alignItems: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginRight: 10,
        color: '#333',
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ffad44',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Modal
    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        alignItems: 'center',
    },
    modalIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#ddd',
        borderRadius: 3,
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    modalDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 15,
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    cancelButton: {
        marginTop: 20,
        padding: 10,
    },
});