import React, { useState, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, 
    ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, 
    Keyboard, Linking
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import { AuthContext } from "../../auth/context/AuthContext";
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { getAvatarSource } from '../../../utils/avatar';

export default function PlanDetail({ navigation, route }) {
    const { task, projectId } = route.params; 
    const { userData } = useContext(AuthContext);

    // --- HELPER: LOGIC KHỞI TẠO ---
    const isAlreadyApproved = task.taskStatus === 'COMPLETED' || task.taskStatus === 'APPROVED';
    
    // --- STATE ---
    const [isModalVisible, setModalVisible] = useState(false); 
    const [isCommentModalVisible, setCommentModalVisible] = useState(false); 
    
    const [commentList, setCommentList] = useState(task.commentList || []);
    
    const [status, setStatus] = useState(isAlreadyApproved ? 'APPROVED' : task.taskStatus);

    const [users, setUsers] = useState([]);
    const [comment, setComment] = useState(''); 
    const [role, setRole] = useState(1); 
    
    const [pendingStatus, setPendingStatus] = useState(null);
    const [statusReason, setStatusReason] = useState('');
    const [approvalInfo, setApprovalInfo] = useState(null);

    const [projectMembers, setProjectMembers] = useState([]);
    const [isAssigneeModalVisible, setAssigneeModalVisible] = useState(false);

    useEffect(() => {
        fetchData();
        fetchComments();
        checkRole();
        fetchApprovalInfo();
        fetchProjectMembers();
    }, []);

    // --- API HELPER ---
    async function checkRole() {
        try {
            const pId = task.project_id || projectId; 
            if(!pId) return;

            const { data: json } = await axios.get(endpoints.projects.getRole(pId, userData.user_id));
            
            if (json.role && json.role.role_id) {
                setRole(Number(json.role.role_id)); 
            }
        } catch (error) { 
            console.log("Lỗi check role:", error); 
        }
    }

    async function fetchData() {
        try {
            const { data } = await axios.get(endpoints.tasks.getUsers(task.task_id));
            if (Array.isArray(data)) setUsers(data);
        } catch (error) { console.error("Lỗi fetch users:", error); }
    }

    async function fetchComments() {
        try {
            const { data } = await axios.get(endpoints.tasks.getComments(task.task_id));
            if (Array.isArray(data)) setCommentList(data);
        } catch (error) { console.error("Lỗi fetch comments:", error); }
    }

    async function fetchApprovalInfo() {
        try {
            const { data } = await axios.get(endpoints.tasks.getApproval(task.task_id));
            setApprovalInfo(data || null);
        } catch (_error) {
            setApprovalInfo(null);
        }
    }

    async function fetchProjectMembers() {
        try {
            const pId = task.project_id || projectId;
            if (!pId) return;
            const { data } = await axios.get(endpoints.projects.getUsers(pId));
            if (Array.isArray(data)) setProjectMembers(data);
        } catch (error) {
            console.error("Lỗi fetch project members:", error);
        }
    }

    async function handleAddAssignee(memberId) {
        try {
            const res = await axios.post(endpoints.tasks.addUser(task.task_id, memberId, userData.user_id));
            if (res.data) {
                fetchData();
            }
        } catch (error) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể thêm người đảm nhận.");
        }
    }

    async function handleRemoveAssignee(memberId) {
        try {
            const res = await axios.post(endpoints.tasks.removeUser(task.task_id, memberId, userData.user_id));
            if (res.data) {
                fetchData();
            }
        } catch (error) {
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa người đảm nhận.");
        }
    }

    // --- CÁC HÀM GỌI API ---
    async function apiUpdateTask(data) {
        try {
            const res = await axios.post(endpoints.tasks.update(task.task_id, userData.user_id), data);
            return res.data;
        } catch (error) { return null; }
    }

    async function apiApproveTask() {
        try {
            const safeProjectId = (task.project_id || projectId || "0").toString();
            const res = await axios.post(endpoints.tasks.approve(), {
                    taskId: task.task_id,
                    projectId: safeProjectId,
                    adminId: userData.user_id
            });
            return res.data;
        } catch (error) { return null; }
    }

    async function apiRejectTask(reason) {
        try {
            const url = endpoints.tasks.reject(task.task_id, userData.user_id, reason);
            const res = await axios.post(url, {});
            return res.data;
        } catch (error) { return null; }
    }

    async function apiPostComment(content) {
        if (!content || content.trim() === "") return null;
        try {
            const commentBody = { commmentContent: content, date: new Date().toISOString() };
            const res = await axios.post(endpoints.tasks.postComment(task.task_id, userData.user_id), commentBody);
            return res.data;
        } catch (error) { return null; }
    }

    function formatDate(isoString) {
        if (!isoString) return "N/A";
        const date = new Date(isoString);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}`;
    }

    // --- LOGIC UI ---
    const handleStatusSelect = (selectedStatus) => {
        setModalVisible(false); 
        setTimeout(() => {
            if (['DONE', 'ERROR', 'REJECTED', 'COMPLETED'].includes(selectedStatus)) {
                setPendingStatus(selectedStatus);
                setStatusReason('');
                setCommentModalVisible(true);
            } else {
                confirmStatusUpdate(selectedStatus, "");
            }
        }, 400);
    };

    const handleOwnerAction = (action) => {
        setPendingStatus(action); 
        setStatusReason('');
        setCommentModalVisible(true);
    };

    // --- HÀM UPDATE CHÍNH (ĐÃ SỬA LOGIC FORCE COMPLETED) ---
    const confirmStatusUpdate = async (newStatus, reason) => {
        Keyboard.dismiss();
        setCommentModalVisible(false);

        const currentRole = Number(role); 
        const isManager = currentRole === 3 || currentRole === 2;
        
        const isApproveAction = (newStatus === 'APPROVED' || newStatus === 'COMPLETED' || newStatus === 'DONE');

        setTimeout(async () => {
            try {
                let updatedTask = null;
                let isApprovedSuccess = false;

                if (isManager && isApproveAction) {
                    const res = await apiApproveTask();
                    
                    if (res && (res.taskStatus === 'APPROVED' || res.taskStatus === 'COMPLETED')) {
                        updatedTask = { taskStatus: 'APPROVED' }; 
                        setStatus('APPROVED');
                        isApprovedSuccess = true;
                        
                        Alert.alert("Thành công! 🎉", "Đã duyệt công việc.");
                    } else {
                        Alert.alert("Lỗi", res?.message || "Không thể duyệt bài. Vui lòng thử lại.");
                    }

                } else if (isManager && newStatus === 'REJECTED') {
                    // --- CASE 2: TỪ CHỐI ---
                    updatedTask = await apiRejectTask(reason);
                    if (updatedTask) {
                        setStatus('REJECTED'); 
                    }

                } else {
                    // --- CASE 3: UPDATE THƯỜNG ---
                    updatedTask = await apiUpdateTask({ taskStatus: newStatus });
                    if (updatedTask) {
                        setStatus(newStatus);
                    }
                }

                // --- TỰ ĐỘNG COMMENT ---
                if (updatedTask) {
                    let prefix = `[TRẠNG THÁI: ${newStatus}]`;
                    
                    // Nếu duyệt thành công thì ghi đè prefix cho đẹp
                    if (isApprovedSuccess) prefix = `✅ MANAGER ĐÃ DUYỆT (ON-CHAIN)`;
                    else if (newStatus === 'REJECTED') prefix = `❌ MANAGER ĐÃ TỪ CHỐI`;

                    let finalComment = prefix;
                    if (reason && reason.trim() !== "") finalComment += `: ${reason}`;
                    await apiPostComment(finalComment);
                    fetchComments();
                    fetchApprovalInfo();
                }

            } catch (error) {
                Alert.alert("Lỗi", "Đã xảy ra lỗi không mong muốn khi cập nhật.");
            }
        }, 400);
    };

    const handleSendChat = async () => {
        Keyboard.dismiss();
        if (comment.trim() === '') return;
        const newComment = await apiPostComment(comment);
        if (newComment) {
            setComment(''); 
            setCommentList([...commentList, newComment]); 
        }
    };

    const getStatusStyle = (st) => {
        if (st === 'COMPLETED' || st === 'APPROVED') {
            return { bg: '#d5f5e3', color: '#27ae60', label: 'Approved' };
        }

        switch (st) {
            case 'REJECTED': return { bg: '#fadbd8', color: '#c0392b', label: 'Rejected' };
            case 'DONE': return { bg: '#e8f8f5', color: '#2ecc71', label: 'Done' }; // Done chưa duyệt
            case 'DOING': return { bg: '#fef9e7', color: '#f1c40f', label: 'Doing' };
            case 'TODO': return { bg: '#fdedec', color: '#e74c3c', label: 'To Do' };
            case 'ERROR': return { bg: '#333', color: '#fff', label: 'Error' };
            default: return { bg: '#f4f6f7', color: '#95a5a6', label: st };
        }
    };

    const currentStatusStyle = getStatusStyle(status);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="chevron-left" size={20} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết công việc</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    
                    {/* INFO CARD */}
                    <View style={styles.card}>
                        <View style={styles.titleRow}>
                            <Text style={styles.taskTitle}>{task.taskName}</Text>
                            
                            {/* BADGE TRẠNG THÁI */}
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.statusBadge, { backgroundColor: currentStatusStyle.bg }]}>
                                <Text style={[styles.statusText, { color: currentStatusStyle.color }]}>{currentStatusStyle.label}</Text>
                                <Icon name="edit" size={12} color={currentStatusStyle.color} style={{ marginLeft: 5 }} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.description}>{task.description || "Không có mô tả."}</Text>
                        {approvalInfo?.txHash ? (
                            <View style={styles.chainInfoBox}>
                                <Text style={styles.chainInfoTitle}>Blockchain approval</Text>
                                <Text style={styles.chainInfoSub} numberOfLines={1}>txHash: {approvalInfo.txHash}</Text>
                                <TouchableOpacity
                                    style={styles.chainLinkBtn}
                                    onPress={() => {
                                        const url = approvalInfo.explorerTxUrl;
                                        if (!url) {
                                            Alert.alert('Thiếu cấu hình', 'Chưa có BLOCKCHAIN_EXPLORER_TX_URL trên backend.');
                                            return;
                                        }
                                        Linking.openURL(url).catch(() => {
                                            Alert.alert('Lỗi', 'Không thể mở explorer URL.');
                                        });
                                    }}
                                >
                                    <Icon name="external-link-alt" size={12} color="#2563eb" />
                                    <Text style={styles.chainLinkText}>Xem trên explorer</Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}

                        {/* OWNER ACTIONS */}
                        {(Number(role) === 3 || Number(role) === 2) && status !== 'APPROVED' && status !== 'COMPLETED' && status !== 'REJECTED' && (
                            <View style={styles.ownerActionBlock}>
                                <Text style={styles.ownerLabel}>Xác nhận của Owner / Management:</Text>
                                <View style={styles.ownerBtnRow}>
                                    <TouchableOpacity style={[styles.ownerBtn, {backgroundColor: '#d5f5e3', borderColor: '#2ecc71'}]} onPress={() => handleOwnerAction('APPROVED')}>
                                        <Icon name="check" size={14} color="#27ae60" />
                                        <Text style={{color: '#27ae60', fontWeight: 'bold', marginLeft: 5}}>Duyệt</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={[styles.ownerBtn, {backgroundColor: '#fadbd8', borderColor: '#c0392b'}]} onPress={() => handleOwnerAction('REJECTED')}>
                                        <Icon name="times" size={14} color="#c0392b" />
                                        <Text style={{color: '#c0392b', fontWeight: 'bold', marginLeft: 5}}>Từ chối</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* TIMELINE */}
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

                    {/* MEMBERS */}
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={[styles.sectionHeader, { marginBottom: 0 }]}>Người thực hiện ({users.length})</Text>
                            {(role === 3 || role === 2) && (
                                <TouchableOpacity onPress={() => setAssigneeModalVisible(true)} style={styles.manageAssigneeBtn}>
                                    <Icon name="user-plus" size={14} color="#ffad44" />
                                    <Text style={styles.manageAssigneeText}>Thêm/Bớt</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {Array.isArray(users) && users.length > 0 ? (
                            users.map((user, index) => (
                                <View key={user.user_id || index} style={styles.memberRow}>
                                    <Image source={getAvatarSource(user)} style={styles.avatarImage} />
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{user.username}</Text>
                                        <Text style={styles.memberEmail}>{user.email}</Text>
                                    </View>
                                    {(role === 3 || role === 2) && (
                                        <TouchableOpacity onPress={() => handleRemoveAssignee(user.user_id)} style={styles.removeUserBtn}>
                                            <Icon name="user-minus" size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noAssigneeText}>Chưa có người đảm nhận.</Text>
                        )}
                    </View>

                    {/* COMMENTS */}
                    <View style={[styles.card, {flex: 1, minHeight: 300}]}>
                        <Text style={styles.sectionHeader}>Thảo luận & Lịch sử</Text>
                        <ScrollView style={styles.commentArea} nestedScrollEnabled={true}>
                            {(!commentList || commentList.length === 0) ? (
                                <View style={styles.emptyComment}>
                                    <Icon name="comments" size={40} color="#eee" />
                                    <Text style={{color: '#ccc', marginTop: 10}}>Chưa có bình luận nào</Text>
                                </View>
                            ) : (
                                commentList.map((cmt, index) => {
                                    const isMe = cmt.users && cmt.users.user_id === userData.user_id;
                                    return (
                                        <View key={cmt.comment_id || index} style={[styles.commentItem, isMe ? styles.commentItemMe : styles.commentItemOther]}>
                                            {!isMe && (
                                                <Image source={getAvatarSource(cmt.users)} style={styles.commentAvatarImage} />
                                            )}
                                            <View style={[styles.commentBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                                {!isMe && <Text style={styles.commentUser}>{cmt.users?.username}</Text>}
                                                <Text style={[styles.commentContent, isMe ? {color:'#fff'} : {color:'#333'}]}>{cmt.commmentContent}</Text>
                                                <Text style={[styles.commentTime, isMe ? {color:'#eee'} : {color:'#999'}]}>{formatDate(cmt.date)}</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                        
                        <View style={styles.inputContainer}>
                            <TextInput 
                                style={styles.input}
                                placeholder="Viết bình luận..."
                                value={comment}
                                onChangeText={setComment}
                            />
                            <TouchableOpacity style={styles.sendButton} onPress={handleSendChat}>
                                <Icon name="paper-plane" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* MODAL 1: CHỌN TRẠNG THÁI */}
            <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)} style={styles.bottomModal} useNativeDriver={true} hideModalContentWhileAnimating={true}>
                <View style={styles.modalContent}>
                    <View style={styles.modalIndicator} />
                    <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
                    {['TODO', 'DOING', 'DONE', 'ERROR'].map((st) => {
                         const style = getStatusStyle(st);
                         return (
                            <TouchableOpacity key={st} style={styles.modalOption} onPress={() => handleStatusSelect(st)}>
                                <View style={[styles.modalDot, {backgroundColor: style.color}]} />
                                <Text style={styles.modalOptionText}>{st} ({style.label})</Text>
                                {status === st && <Icon name="check" size={16} color="#ffad44" />}
                            </TouchableOpacity>
                         )
                    })}
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                        <Text style={{color: '#666'}}>Hủy bỏ</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
            
            {/* MODAL 2: NHẬP LÝ DO (REASON) */}
            <Modal isVisible={isCommentModalVisible} style={styles.centerModal} avoidKeyboard={true} useNativeDriver={true}>
                <View style={styles.dialogCard}>
                    <Icon name={pendingStatus === 'APPROVED' || pendingStatus === 'COMPLETED' ? "check-circle" : (pendingStatus === 'REJECTED' ? "times-circle" : "pen-alt")} 
                          size={40} 
                          color={pendingStatus === 'APPROVED' || pendingStatus === 'COMPLETED' ? "#27ae60" : (pendingStatus === 'REJECTED' ? "#c0392b" : "#ffad44")} 
                          style={{ alignSelf: 'center', marginBottom: 15 }} />
                    
                    <Text style={styles.dialogTitle}>
                        {pendingStatus === 'APPROVED' || pendingStatus === 'COMPLETED' ? "Xác nhận Duyệt" : (pendingStatus === 'REJECTED' ? "Xác nhận Từ chối" : "Cập nhật trạng thái")}
                    </Text>
                    
                    <Text style={styles.dialogSub}>
                        {pendingStatus === 'APPROVED' || pendingStatus === 'COMPLETED' ? 'Duyệt công việc và ghi blockchain.' : `Bạn đang chuyển sang ${pendingStatus}.`}
                        {'\n'}Nhập ghi chú (nếu có):
                    </Text>
                    
                    <TextInput 
                        style={styles.reasonInput}
                        placeholder={pendingStatus === 'REJECTED' ? "Lý do từ chối..." : "Ghi chú..."}
                        multiline={true}
                        numberOfLines={3}
                        value={statusReason}
                        onChangeText={setStatusReason}
                    />
                    
                    <View style={styles.dialogButtonRow}>
                        <TouchableOpacity style={[styles.dialogBtn, styles.btnCancel]} onPress={() => setCommentModalVisible(false)}>
                            <Text style={{color: '#666'}}>Hủy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.dialogBtn, styles.btnConfirm]} 
                            activeOpacity={0.7}
                            onPress={() => confirmStatusUpdate(pendingStatus, statusReason)}
                        >
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* MODAL 3: QUẢN LÝ NGƯỜI ĐẢM NHẬN */}
            <Modal isVisible={isAssigneeModalVisible} onBackdropPress={() => setAssigneeModalVisible(false)} style={styles.bottomModal} useNativeDriver={true} hideModalContentWhileAnimating={true}>
                <View style={[styles.modalContent, { maxHeight: '70%', width: '100%' }]}>
                    <View style={styles.modalIndicator} />
                    <Text style={styles.modalTitle}>Quản lý người đảm nhận</Text>
                    <ScrollView style={{ width: '100%', marginBottom: 15 }}>
                        {projectMembers.map((member) => {
                            const isAssigned = users.some((u) => Number(u.user_id) === Number(member.user_id));
                            return (
                                <View key={member.user_id} style={styles.memberSelectRow}>
                                    <Image source={getAvatarSource(member)} style={styles.avatarImage} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.memberName}>{member.username}</Text>
                                        <Text style={styles.memberEmail}>{member.email}</Text>
                                    </View>
                                    {isAssigned ? (
                                        <TouchableOpacity onPress={() => handleRemoveAssignee(member.user_id)} style={[styles.selectBtn, styles.removeBtn]}>
                                            <Text style={styles.selectBtnTextActive}>Xoá</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity onPress={() => handleAddAssignee(member.user_id)} style={[styles.selectBtn, styles.addBtn]}>
                                            <Text style={styles.selectBtnText}>Thêm</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => setAssigneeModalVisible(false)}>
                        <Text style={{color: '#666', fontWeight: 'bold'}}>Đóng</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 0, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    scrollContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    taskTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    description: { color: '#666', fontSize: 15, lineHeight: 22 },
    chainInfoBox: { marginTop: 12, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 10 },
    chainInfoTitle: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
    chainInfoSub: { color: '#1e40af', fontSize: 11, marginTop: 4 },
    chainLinkBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center' },
    chainLinkText: { color: '#2563eb', fontWeight: '700', fontSize: 12, marginLeft: 6 },
    
    // Owner Actions
    ownerActionBlock: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    ownerLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8, fontStyle: 'italic' },
    ownerBtnRow: { flexDirection: 'row', gap: 10 },
    ownerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, borderWidth: 1 },

    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#ffad44', paddingLeft: 10 },
    timelineContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    timeItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    verticalDivider: { width: 1, height: '100%', backgroundColor: '#eee', marginHorizontal: 10 },
    timeLabel: { fontSize: 12, color: '#999' },
    timeValue: { fontSize: 14, fontWeight: '600', color: '#333' },
    deadlineContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8ec', padding: 10, borderRadius: 8 },
    deadlineText: { color: '#ffad44', fontWeight: 'bold', marginLeft: 10 },
    memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
    avatarImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#eee' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '600', color: '#333' },
    memberEmail: { fontSize: 13, color: '#888' },
    commentArea: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 10, height: 300 },
    emptyComment: { alignItems: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, color: '#333' },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffad44', justifyContent: 'center', alignItems: 'center' },
    bottomModal: { justifyContent: 'flex-end', margin: 0 },
    modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, alignItems: 'center' },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    modalOption: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    modalDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
    modalOptionText: { fontSize: 16, color: '#333', flex: 1 },
    cancelButton: { marginTop: 20, padding: 10 },
    centerModal: { justifyContent: 'center', margin: 20 },
    dialogCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    dialogTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
    dialogSub: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
    reasonInput: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, height: 80, textAlignVertical: 'top', marginBottom: 20, color: '#333' },
    dialogButtonRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dialogBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
    btnCancel: { backgroundColor: '#eee' },
    btnConfirm: { backgroundColor: '#ffad44' },
    commentItem: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    commentItemMe: { justifyContent: 'flex-end' },
    commentItemOther: { justifyContent: 'flex-start' },
    commentAvatarImage: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ccc', marginRight: 8 },
    commentBubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
    bubbleMe: { backgroundColor: '#ffad44', borderBottomRightRadius: 2 },
    bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
    commentUser: { fontSize: 11, color: '#888', marginBottom: 2, fontWeight: 'bold' },
    commentContent: { fontSize: 14 },
    commentTime: { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
    manageAssigneeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, borderWidth: 1, borderColor: '#ffad44' },
    manageAssigneeText: { color: '#ffad44', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
    removeUserBtn: { padding: 8 },
    noAssigneeText: { color: '#888', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
    memberSelectRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    selectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, minWidth: 60, alignItems: 'center' },
    addBtn: { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffad44' },
    removeBtn: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
    selectBtnText: { color: '#ffad44', fontSize: 12, fontWeight: 'bold' },
    selectBtnTextActive: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
});