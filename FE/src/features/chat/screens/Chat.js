import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    Modal,
    SafeAreaView,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import io from 'socket.io-client';
import { AuthContext } from "../../auth/context/AuthContext";
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';
import { getAvatarSource } from '../../../utils/avatar';


const Chat = ({ route, navigation }) => {
    const { projectId, projectName } = route.params;
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const socket = useRef(null);
    const flatListRef = useRef(null);
    const { userData } = useContext(AuthContext);
    const [user, setUser] = useState([]);
    const userMapRef = useRef({});

    useEffect(() => {
        getuser();
        socket.current = io(endpoints.chat.socket());

        setLoading(true);
        axios.get(endpoints.chat.getMessages(projectId))
            .then(({ data }) => {
                setMessages(data);
                setLoading(false);
            })
            .catch(error => {
                console.error(error);
                setLoading(false);
            });
            
        socket.current.on('receiveMessage', newMessage => {
            if (String(newMessage?.project_id) !== String(projectId)) return;
            setMessages(prevMessages => [...prevMessages, newMessage]);
        });

        return () => {
            socket.current.disconnect();
        };

    }, [projectId]);

    // Tự động cuộn xuống dưới khi có tin nhắn mới
    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
        }
    }, [messages]);

    async function getuser() {
        try {
            const { data } = await axios.get(endpoints.projects.getUsers(projectId));
            const usersWithRoles = await Promise.all(data.map(async (user) => {
                const roleName = await getRole(user.user_id);
                return { ...user, roleName };
            }));
            setUser(usersWithRoles);
            userMapRef.current = usersWithRoles.reduce((acc, u) => {
                acc[String(u.user_id)] = u;
                return acc;
            }, {});
        } catch (error) {
            console.error(error);
        }
    }

    async function getRole(userId) {
        try {
            const { data: json } = await axios.get(endpoints.projects.getRole(projectId, userId));
            return json.role.roleName;
        } catch (error) { return ''; }
    }

    const scrollToBottom = () => {
        if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
        }
    };

    const sendMessage = () => {
        if (message.trim() === '') return;
        const liveUser = userMapRef.current[String(userData.user_id)] || userData;

        const newMessage = {
            user_id: userData.user_id,
            message: message,
            date: new Date().toISOString(),
            project_id: projectId,
            users: liveUser
        };

        setMessage('');

        axios.post(endpoints.chat.addMessage(), newMessage)
            .catch(error => console.error(error));
    };

    const renderItem = ({ item }) => {
        const resolvedUser = userMapRef.current[String(item.user_id)] || item.users || null;
        const isOwnMessage = Number(item.user_id) === Number(userData.user_id);
        
        return (
            <View style={[styles.messageRow, isOwnMessage ? styles.rowEnd : styles.rowStart]}>
                {!isOwnMessage && (
                    <Image 
                        source={getAvatarSource(resolvedUser)} 
                        style={styles.avatarSmall} 
                    />
                )}
                
                <View style={[styles.bubble, isOwnMessage ? styles.bubbleOwn : styles.bubbleOther]}>
                    {!isOwnMessage && <Text style={styles.senderName}>{resolvedUser?.username}</Text>}
                    <Text style={[styles.messageText, isOwnMessage ? styles.textOwn : styles.textOther]}>
                        {item.message}
                    </Text>
                    <Text style={[styles.timeText, isOwnMessage ? styles.timeOwn : styles.timeOther]}>
                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            {/* Header */}
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

            {/* Chat Body */}
            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator size="large" color="#ffab33" style={{marginTop: 20}}/>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderItem}
                        keyExtractor={(item, index) => index.toString()}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={scrollToBottom}
                        onLayout={scrollToBottom}
                    />
                )}
            </View>

            {/* Input Area */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
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

            {/* Members Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
                animationType="fade"
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => setModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Thành viên nhóm</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Icon name="times" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>
                        <FlatList 
                            data={user}
                            keyExtractor={item => item.user_id.toString()}
                            renderItem={({item}) => (
                                <View style={styles.userItem}>
                                    <Image 
                                        source={getAvatarSource(item)} 
                                        style={styles.avatarList} 
                                    />
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
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
        backgroundColor: '#f2f2f2',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 2,
        marginTop: Platform.OS === 'android' ? 30 : 0, // Fix khoảng trống trên Android
    },
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