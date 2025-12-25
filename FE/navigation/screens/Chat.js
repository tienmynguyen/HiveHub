import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, KeyboardAvoidingView, Platform, Modal, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';

// --- IMPORT QUAN TRỌNG CHO STOMP ---
import { Client } from '@stomp/stompjs';
import * as encoding from 'text-encoding'; // Polyfill cho React Native
const TextEncoder = encoding.TextEncoder;
Object.assign(global, { TextEncoder }); // Hack để STOMP hoạt động

import { AuthContext } from "../context/AuthContext";
import Config from "./config.json";
import Icon from 'react-native-vector-icons/FontAwesome';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const Chat = ({ route, navigation }) => {
    const { projectId, projectName } = route.params;
    const { userData } = useContext(AuthContext);
    
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const flatListRef = useRef(null);
    // Ref giữ kết nối STOMP
    const stompClient = useRef(null);

    useEffect(() => {
        getuser();
        fetchHistory();
        connectStomp();

        // Cleanup khi thoát màn hình
        return () => {
            if (stompClient.current) {
                stompClient.current.deactivate();
            }
        };
    }, [projectId]);

    // --- 1. LẤY LỊCH SỬ CHAT CŨ ---
    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${Config.URLAPI}/chat/getallmessage?projectId=${projectId}`);
            const data = await response.json();
            setMessages(data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    // --- 2. KẾT NỐI STOMP (WEBSOCKET) ---
    const connectStomp = () => {
        // Chuyển http://... thành ws://...
        const wsUrl = Config.URLAPI.replace("http", "ws") + "/ws"; 
        
        const client = new Client({
            brokerURL: wsUrl,
            forceBinaryWSFrames: true,
            appendMissingNULLonIncoming: true,
            reconnectDelay: 5000, // Tự động kết nối lại sau 5s nếu mất mạng
            onConnect: () => {
                console.log(">>> STOMP CONNECTED!");
                
                // Đăng ký nhận tin nhắn từ Room này
                // Backend gửi về: /topic/project/{id}
                client.subscribe(`/topic/project/${projectId}`, (message) => {
                    if (message.body) {
                        const newMessage = JSON.parse(message.body);
                        setMessages((prev) => [...prev, newMessage]);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
                console.error('Additional details: ' + frame.body);
            },
        });

        client.activate();
        stompClient.current = client;
    };

    // --- 3. GỬI TIN NHẮN ---
    const sendMessage = () => {
        if (!message.trim() || !stompClient.current || !stompClient.current.connected) return;

        const chatPayload = {
            user_id: userData.user_id,
            message: message,
            date: new Date().toISOString(),
            project_id: projectId,
            users: userData // Gửi kèm info để backend khỏi phải query lại (tuỳ logic)
        };

        // Gửi lên Server thông qua STOMP
        // Destination khớp với @MessageMapping bên Java
        stompClient.current.publish({
            destination: '/app/chat.sendMessage',
            body: JSON.stringify(chatPayload),
        });

        setMessage('');
    };

    // --- UI HELPERS (Giữ nguyên) ---
    useEffect(() => {
        if (messages.length > 0) flatListRef.current?.scrollToEnd({ animated: true });
    }, [messages]);

    async function getuser() {
        try {
            const response = await fetch(`${Config.URLAPI}/getalluserbyprojectId?projectId=${projectId}`);
            const data = await response.json();
            // ... (Logic map role giữ nguyên)
            setUser(data); 
        } catch (error) {}
    }

    const renderItem = ({ item }) => {
        const isOwnMessage = item.users?.user_id === userData.user_id;
        return (
            <View style={[styles.messageRow, isOwnMessage ? styles.rowEnd : styles.rowStart]}>
                {!isOwnMessage && (
                    <Image source={{ uri: item.users?.imagePath || DEFAULT_AVATAR }} style={styles.avatarSmall} />
                )}
                <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
                    {!isOwnMessage && <Text style={styles.senderName}>{item.users?.username}</Text>}
                    <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther]}>{item.message}</Text>
                    <Text style={[styles.timeText, isOwnMessage ? styles.timeOwn : styles.timeOther]}>
                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    // --- RENDER (Giữ nguyên UI) ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Icon name="chevron-left" size={20} color="#333" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{projectName}</Text>
                    <Text style={styles.headerSubtitle}>{user.length} thành viên</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.menuBtn}>
                    <Icon name="bars" size={20} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.container}>
                {loading ? <ActivityIndicator size="large" color="#ffab33" style={{marginTop: 20}}/> : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.inputContainer}>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Nhập tin nhắn..."
                        style={styles.input}
                        multiline
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
                        <Icon name="paper-plane" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Modal Members giữ nguyên */}
            <Modal transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thành viên nhóm</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><Icon name="times" size={20} color="#666" /></TouchableOpacity>
                        </View>
                        <FlatList 
                            data={user}
                            keyExtractor={item => item.user_id.toString()}
                            renderItem={({item}) => (
                                <View style={styles.userItem}>
                                    <Image source={{ uri: item.imagePath || DEFAULT_AVATAR }} style={styles.avatarList} />
                                    <View>
                                        <Text style={styles.userNameList}>{item.username}</Text>
                                        <Text style={styles.userRole}>{item.roleName}</Text>
                                    </View>
                                </View>
                            )}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#f2f2f2' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2, marginTop: Platform.OS === 'android' ? 30 : 0 },
    backBtn: { padding: 8 },
    headerInfo: { flex: 1, marginLeft: 10 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    headerSubtitle: { fontSize: 12, color: '#888' },
    menuBtn: { padding: 8 },
    listContent: { paddingVertical: 15, paddingHorizontal: 10 },
    messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
    rowEnd: { justifyContent: 'flex-end' },
    rowStart: { justifyContent: 'flex-start' },
    avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 8, backgroundColor: '#ddd' },
    bubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, elevation: 1 },
    bubbleOwn: { backgroundColor: '#ffab33', borderBottomRightRadius: 4 },
    bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    senderName: { fontSize: 11, color: '#999', marginBottom: 2, fontWeight: 'bold' },
    messageText: { fontSize: 15, lineHeight: 20 },
    textOwn: { color: '#fff' },
    textOther: { color: '#333' },
    timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
    timeOwn: { color: 'rgba(255,255,255,0.7)' },
    timeOther: { color: '#aaa' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, color: '#333', fontSize: 15 },
    sendBtn: { marginLeft: 10, backgroundColor: '#ffab33', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
    avatarList: { width: 40, height: 40, borderRadius: 20, marginRight: 15, backgroundColor: '#eee' },
    userNameList: { fontSize: 16, fontWeight: '600', color: '#333' },
    userRole: { fontSize: 13, color: '#888', marginTop: 2 },
});

export default Chat;