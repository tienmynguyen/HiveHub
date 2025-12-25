import React, { useState, useEffect, useContext } from 'react';
import { 
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, 
    ScrollView, TextInput, Image, KeyboardAvoidingView, Platform, 
    Keyboard, Linking, ActivityIndicator 
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/FontAwesome5'; 
import * as ImagePicker from 'expo-image-picker'; 
import Config from "./config.json";
import { AuthContext } from "../context/AuthContext";

export default function PlanDetail({ navigation, route }) {
    const { task, projectId } = route.params; 
    const { userData } = useContext(AuthContext);

    // --- HELPER: LOGIC KHỞI TẠO ---
    const isAlreadyApproved = (task.txHash && task.txHash.length > 5) || task.taskStatus === 'COMPLETED';
    
    // --- STATE ---
    const [isModalVisible, setModalVisible] = useState(false); 
    const [isCommentModalVisible, setCommentModalVisible] = useState(false); 
    const [commentList, setCommentList] = useState(task.commentList || []);
    const [status, setStatus] = useState(isAlreadyApproved ? 'COMPLETED' : task.taskStatus);
    const [currentTxHash, setCurrentTxHash] = useState(task.txHash || null); 
    const [users, setUsers] = useState([]);
    const [comment, setComment] = useState(''); 
    const [role, setRole] = useState(1); 
    const [pendingStatus, setPendingStatus] = useState(null);
    const [statusReason, setStatusReason] = useState('');

    // --- STATE MỚI CHO ẢNH ---
    const [selectedImage, setSelectedImage] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchData();
        fetchComments();
        checkRole();
    }, []);

    useEffect(() => {
        if (currentTxHash) {
            setStatus('COMPLETED');
        }
    }, [currentTxHash]);

    // --- API HELPER ---
    async function checkRole() {
        try {
            const pId = task.project_id || projectId; 
            if(!pId) return;
            const response = await fetch(`${Config.URLAPI}/findroleinuspr?projectId=${pId}&userId=${userData.user_id}`);
            const json = await response.json();
            if (json.role && json.role.role_id) setRole(Number(json.role.role_id)); 
        } catch (error) { console.log("Lỗi check role:", error); }
    }

    async function fetchData() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbytaskId?taskId=${task.task_id}`);
            if (!response.ok) return;
            const data = await response.json();
            if (Array.isArray(data)) setUsers(data);
        } catch (error) { console.error("Lỗi fetch users:", error); }
    }

    async function fetchComments() {
        try {
            const response = await fetch(`${Config.URLAPI}/getallcommentbyTask?taskId=${task.task_id}`);
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) setCommentList(data);
            }
        } catch (error) { console.error("Lỗi fetch comments:", error); }
    }

    // --- CÁC HÀM GỌI API ---
    async function apiUpdateTask(data) {
        try {
            const response = await fetch(`${Config.URLAPI}/updatetask?taskId=${task.task_id}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), 
            });
            return await response.json();
        } catch (error) { return null; }
    }

    async function apiApproveTask() {
        try {
            const safeProjectId = (task.project_id || projectId || "0").toString();
            const response = await fetch(`${Config.URLAPI}/approvetask`, {
                method: "POST", headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify({ taskId: task.task_id, projectId: safeProjectId, adminId: userData.user_id }),
            });
            const text = await response.text();
            try { return JSON.parse(text); } catch (e) { return null; }
        } catch (error) { return null; }
    }

    async function apiRejectTask(reason) {
        try {
            const url = `${Config.URLAPI}/rejecttask?taskId=${task.task_id}&adminId=${userData.user_id}&reason=${encodeURIComponent(reason)}`;
            const response = await fetch(url, { method: "POST" });
            return await response.json();
        } catch (error) { return null; }
    }

    async function apiPostComment(content) {
        if (!content || content.trim() === "") return null;
        try {
            const commentBody = { commmentContent: content, date: new Date().toISOString() };
            const response = await fetch(`${Config.URLAPI}/postcomment?taskId=${task.task_id}&userId=${userData.user_id}`, {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(commentBody),
            });
            return await response.json();
        } catch (error) { return null; }
    }

    // --- HÀM CHỌN ẢNH VÀ UPLOAD ---
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const uploadImageToCloudinary = async (uri) => {
        const data = new FormData();
        data.append('file', { uri, type: 'image/jpeg', name: 'upload.jpg' });
        data.append('upload_preset', 'HiveHub'); 
        data.append('cloud_name', 'dndzoxaym');

        try {
            const res = await fetch('https://api.cloudinary.com/v1_1/dndzoxaym/image/upload', {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' },
            });
            const json = await res.json();
            return json.secure_url;
        } catch (error) {
            console.log("Upload error:", error);
            return null;
        }
    };

    // --- HÀM GỬI CHAT ---
    const handleSendChat = async () => {
        Keyboard.dismiss();
        if (comment.trim() === '' && !selectedImage) return;

        setIsUploading(true);
        let contentToSend = comment;

        if (selectedImage) {
            const imageUrl = await uploadImageToCloudinary(selectedImage);
            if (imageUrl) {
                contentToSend = imageUrl;
            } else {
                Alert.alert("Lỗi", "Không thể tải ảnh lên.");
                setIsUploading(false);
                return;
            }
        }

        const newComment = await apiPostComment(contentToSend);
        if (newComment) {
            setComment(''); 
            setSelectedImage(null);
            setCommentList([...commentList, newComment]); 
        }
        setIsUploading(false);
    };

    // --- RENDER COMMENT CONTENT ---
    const renderCommentContent = (content) => {
        const isImage = content.match(/\.(jpeg|jpg|gif|png)$/) != null || content.includes('cloudinary.com');
        const isLink = content.startsWith('http') || content.startsWith('https');

        if (isImage) {
            return (
                <TouchableOpacity onPress={() => Linking.openURL(content)}>
                    <Image source={{ uri: content }} style={styles.commentImage} resizeMode="cover" />
                </TouchableOpacity>
            );
        } else if (isLink) {
            return (
                <Text 
                    style={[styles.commentContent, {color: '#2980b9', textDecorationLine: 'underline'}]}
                    onPress={() => Linking.openURL(content)}
                >
                    {content} <Icon name="external-link-alt" size={10} />
                </Text>
            );
        } else {
            return <Text style={styles.commentContent}>{content}</Text>;
        }
    };

    function formatDate(isoString) {
        if (!isoString) return "N/A";
        const date = new Date(isoString);
        return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${date.getMinutes()}`;
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
        setPendingStatus(action); setStatusReason(''); setCommentModalVisible(true);
    };

    const confirmStatusUpdate = async (newStatus, reason) => {
        Keyboard.dismiss();
        setCommentModalVisible(false);
        const currentRole = Number(role); 
        const isOwner = currentRole === 3;
        const isBlockchainAction = (newStatus === 'COMPLETED' || newStatus === 'DONE');

        setTimeout(async () => {
            try {
                let updatedTask = null;
                let isBlockchainSuccess = false;

                if (isOwner && isBlockchainAction) {
                    const res = await apiApproveTask();
                    if (res && res.txHash) {
                        updatedTask = { taskStatus: 'COMPLETED', txHash: res.txHash }; 
                        setCurrentTxHash(res.txHash); setStatus('COMPLETED'); isBlockchainSuccess = true;
                        Alert.alert("Thành công! 🎉", `Đã duyệt và ghi lên Blockchain.\nTxHash: ${res.txHash}`);
                    } else { Alert.alert("Lỗi", res?.message || "Không thể duyệt bài."); }
                } else if (isOwner && newStatus === 'REJECTED') {
                    updatedTask = await apiRejectTask(reason);
                    if (updatedTask) { setStatus('REJECTED'); setCurrentTxHash(null); }
                } else {
                    updatedTask = await apiUpdateTask({ taskStatus: newStatus });
                    if (updatedTask) setStatus(newStatus);
                }

                if (updatedTask) {
                    let prefix = `[TRẠNG THÁI: ${newStatus}]`;
                    if (isBlockchainSuccess) prefix = `✅ OWNER ĐÃ DUYỆT (BLOCKCHAIN VERIFIED)`;
                    else if (newStatus === 'REJECTED') prefix = `❌ OWNER ĐÃ TỪ CHỐI`;
                    let finalComment = prefix;
                    if (reason && reason.trim() !== "") finalComment += `: ${reason}`;
                    if (updatedTask.txHash) finalComment += `\nTx: ${updatedTask.txHash}`;
                    await apiPostComment(finalComment);
                    fetchComments();
                }
            } catch (error) { Alert.alert("Lỗi", "Đã xảy ra lỗi."); }
        }, 400);
    };

    const getStatusStyle = (st) => {
        if (currentTxHash || st === 'COMPLETED') return { bg: '#d5f5e3', color: '#27ae60', label: 'Approved (On-Chain)' };
        switch (st) {
            case 'REJECTED': return { bg: '#fadbd8', color: '#c0392b', label: 'Rejected' };
            case 'DONE': return { bg: '#e8f8f5', color: '#2ecc71', label: 'Done' };
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
                            <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.statusBadge, { backgroundColor: currentStatusStyle.bg }]}>
                                <Text style={[styles.statusText, { color: currentStatusStyle.color }]}>{currentStatusStyle.label}</Text>
                                <Icon name="edit" size={12} color={currentStatusStyle.color} style={{ marginLeft: 5 }} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.description}>{task.description || "Không có mô tả."}</Text>
                        {currentTxHash && (
                             <TouchableOpacity style={styles.blockchainBox} onPress={() => Alert.alert("Blockchain Receipt", currentTxHash)}>
                                <Icon name="link" size={12} color="#27ae60" />
                                <Text style={styles.blockchainText}>On-Chain Verified: {currentTxHash.substring(0, 15)}...</Text>
                             </TouchableOpacity>
                        )}
                        {Number(role) === 3 && !currentTxHash && status !== 'REJECTED' && (
                            <View style={styles.ownerActionBlock}>
                                <Text style={styles.ownerLabel}>Xác nhận của Owner:</Text>
                                <View style={styles.ownerBtnRow}>
                                    <TouchableOpacity style={[styles.ownerBtn, {backgroundColor: '#d5f5e3', borderColor: '#2ecc71'}]} onPress={() => handleOwnerAction('COMPLETED')}>
                                        <Icon name="check" size={14} color="#27ae60" />
                                        <Text style={{color: '#27ae60', fontWeight: 'bold', marginLeft: 5}}>Duyệt & Ghi Block</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.ownerBtn, {backgroundColor: '#fadbd8', borderColor: '#c0392b'}]} onPress={() => handleOwnerAction('REJECTED')}>
                                        <Icon name="times" size={14} color="#c0392b" />
                                        <Text style={{color: '#c0392b', fontWeight: 'bold', marginLeft: 5}}>Từ chối</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* --- [ĐÃ KHÔI PHỤC] TIMELINE CARD --- */}
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

                    {/* --- [ĐÃ KHÔI PHỤC] MEMBERS CARD --- */}
                    <View style={styles.card}>
                        <Text style={styles.sectionHeader}>Người thực hiện ({users.length})</Text>
                        {Array.isArray(users) && users.length > 0 ? (
                            users.map((user, index) => (
                                <View key={user.user_id || index} style={styles.memberRow}>
                                    <View style={[styles.avatar, {backgroundColor: index % 2 === 0 ? '#ffad44' : '#4a90e2'}]}>
                                        <Text style={styles.avatarText}>{user.username ? user.username.charAt(0).toUpperCase() : "?"}</Text>
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{user.username}</Text>
                                        <Text style={styles.memberEmail}>{user.email}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{color: '#999', fontStyle: 'italic', paddingVertical: 10, textAlign: 'center'}}>Chưa có người đảm nhận</Text>
                        )}
                    </View>

                    {/* COMMENTS SECTION */}
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
                                                <View style={styles.commentAvatar}>
                                                    <Text style={styles.avatarTextSmall}>{cmt.users?.username?.charAt(0).toUpperCase() || "?"}</Text>
                                                </View>
                                            )}
                                            <View style={[styles.commentBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                                {!isMe && <Text style={styles.commentUser}>{cmt.users?.username}</Text>}
                                                {renderCommentContent(cmt.commmentContent)}
                                                <Text style={[styles.commentTime, isMe ? {color:'#eee'} : {color:'#999'}]}>{formatDate(cmt.date)}</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                        
                        {selectedImage && (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                                    <Icon name="times" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.inputContainer}>
                            <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                                <Icon name="image" size={20} color="#888" />
                            </TouchableOpacity>
                            
                            <TextInput 
                                style={styles.input}
                                placeholder="Viết bình luận..."
                                value={comment}
                                onChangeText={setComment}
                                editable={!isUploading}
                            />
                            
                            <TouchableOpacity style={styles.sendButton} onPress={handleSendChat} disabled={isUploading}>
                                {isUploading ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="paper-plane" size={18} color="#fff" />}
                            </TouchableOpacity>
                        </View>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* MODALS */}
            <Modal isVisible={isModalVisible} onBackdropPress={() => setModalVisible(false)} style={styles.bottomModal} useNativeDriver={true}>
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
            
            <Modal isVisible={isCommentModalVisible} style={styles.centerModal} avoidKeyboard={true} useNativeDriver={true}>
                <View style={styles.dialogCard}>
                    <Icon name={pendingStatus === 'COMPLETED' ? "check-circle" : (pendingStatus === 'REJECTED' ? "times-circle" : "pen-alt")} size={40} color={pendingStatus === 'COMPLETED' ? "#27ae60" : (pendingStatus === 'REJECTED' ? "#c0392b" : "#ffad44")} style={{ alignSelf: 'center', marginBottom: 15 }} />
                    <Text style={styles.dialogTitle}>{pendingStatus === 'COMPLETED' ? "Xác nhận Duyệt" : (pendingStatus === 'REJECTED' ? "Xác nhận Từ chối" : "Cập nhật trạng thái")}</Text>
                    <Text style={styles.dialogSub}>{pendingStatus === 'COMPLETED' ? 'Duyệt bài và ghi nhận lên Blockchain.' : `Bạn đang chuyển sang ${pendingStatus}.`}{'\n'}Nhập ghi chú (nếu có):</Text>
                    <TextInput style={styles.reasonInput} placeholder={pendingStatus === 'REJECTED' ? "Lý do từ chối..." : "Ghi chú..."} multiline={true} numberOfLines={3} value={statusReason} onChangeText={setStatusReason} />
                    <View style={styles.dialogButtonRow}>
                        <TouchableOpacity style={[styles.dialogBtn, styles.btnCancel]} onPress={() => setCommentModalVisible(false)}><Text style={{color: '#666'}}>Hủy</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.dialogBtn, styles.btnConfirm]} activeOpacity={0.7} onPress={() => confirmStatusUpdate(pendingStatus, statusReason)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Xác nhận</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    backButton: { padding: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    scrollContent: { padding: 15, paddingBottom: 30 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    taskTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 10 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
    statusText: { fontWeight: 'bold', fontSize: 12 },
    description: { color: '#666', fontSize: 15, lineHeight: 22 },
    blockchainBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f8f5', padding: 8, borderRadius: 6, marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#d5f5e3' },
    blockchainText: { color: '#27ae60', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
    ownerActionBlock: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    ownerLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8, fontStyle: 'italic' },
    ownerBtnRow: { flexDirection: 'row', gap: 10 },
    ownerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, borderWidth: 1 },
    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#ffad44', paddingLeft: 10 },
    
    // MEMBER STYLES (Đã khôi phục)
    memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '600', color: '#333' },
    memberEmail: { fontSize: 13, color: '#888' },

    // TIMELINE STYLES (Đã khôi phục)
    timelineContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    timeItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    verticalDivider: { width: 1, height: '100%', backgroundColor: '#eee', marginHorizontal: 10 },
    timeLabel: { fontSize: 12, color: '#999' },
    timeValue: { fontSize: 14, fontWeight: '600', color: '#333' },
    deadlineContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff8ec', padding: 10, borderRadius: 8 },
    deadlineText: { color: '#ffad44', fontWeight: 'bold', marginLeft: 10 },

    commentArea: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 8, padding: 10, marginBottom: 10, height: 300 },
    emptyComment: { alignItems: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
    attachButton: { padding: 10, marginRight: 5 },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, color: '#333' },
    sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffad44', justifyContent: 'center', alignItems: 'center' },
    
    imagePreviewContainer: { flexDirection: 'row', marginBottom: 10, marginLeft: 10 },
    imagePreview: { width: 60, height: 60, borderRadius: 8 },
    removeImageBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    commentImage: { width: 150, height: 150, borderRadius: 8, marginTop: 5 },
    
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
    commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarTextSmall: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    commentBubble: { maxWidth: '80%', padding: 10, borderRadius: 12 },
    bubbleMe: { backgroundColor: '#ffad44', borderBottomRightRadius: 2 },
    bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 2, borderWidth: 1, borderColor: '#eee' },
    commentUser: { fontSize: 11, color: '#888', marginBottom: 2, fontWeight: 'bold' },
    commentContent: { fontSize: 14 },
    commentTime: { fontSize: 10, marginTop: 5, alignSelf: 'flex-end' },
});