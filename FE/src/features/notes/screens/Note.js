import React, { useContext, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, TextInput, Image, Dimensions, SafeAreaView, ActivityIndicator, StatusBar } from 'react-native';
import Icon from "react-native-vector-icons/FontAwesome5"; 
import { AuthContext } from '../../auth/context/AuthContext';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';

const { width } = Dimensions.get('window');
const NOTE_WIDTH = (width - 40) / 2; 

// --- DỮ LIỆU GIẢ ĐỂ TEST (Đảm bảo giao diện luôn hiện) ---
const MOCK_NOTES = [
    { note_id: 1, title: "Ý tưởng Project", content: "Làm app quản lý công việc bằng React Native...", date: new Date().toISOString(), pinned: true },
    { note_id: 2, title: "Mua sắm", content: "Sữa, Trứng, Bánh mì, Cafe...", date: new Date().toISOString(), pinned: false },
    { note_id: 3, title: "Học từ vựng", content: "Review 50 từ vựng N3...", date: new Date().toISOString(), pinned: false },
];

const NOTE_COLORS = ['#fff', '#fef9e7', '#e8f8f5', '#fdedec', '#f4f6f7'];
// Ảnh online để tránh lỗi thiếu file local
const EMPTY_IMAGE = 'https://cdn-icons-png.flaticon.com/512/7486/7486744.png';

export default function Note() {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [addNoteModalVisible, setAddNoteModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const { userData } = useContext(AuthContext);

    // --- LOGIC API ---
    const getAllNotes = async () => {
        setLoading(true);
        try {
            // Kiểm tra user
            if (!userData?.user_id) {
                setNotes(MOCK_NOTES); // Không có user thì hiện data giả
                setLoading(false);
                return;
            }

            const { data } = await axios.get(endpoints.notes.getAllByUser(userData.user_id));
            
            if (Array.isArray(data) && data.length > 0) {
                const sortedNotes = data.sort((a, b) => {
                    if (a.pinned === b.pinned) return new Date(b.date) - new Date(a.date);
                    return a.pinned ? -1 : 1;
                });
                setNotes(sortedNotes);
            } else {
                setNotes([]); // Nếu API trả về rỗng thì để rỗng (sẽ hiện màn hình Empty)
                // setNotes(MOCK_NOTES); // Bật dòng này nếu muốn test giao diện khi API rỗng
            }
        } catch (error) {
            console.error("Error fetching notes:", error);
            setNotes(MOCK_NOTES); // Lỗi mạng thì hiện data giả
        } finally {
            setLoading(false);
        }
    };

    async function deleteJSON(noteId) {
        try {
            await axios.delete(endpoints.notes.remove(noteId));
            getAllNotes();
            setModalVisible(false);
        } catch (error) { console.error(error); }
    };

    async function postJSON(data) {
        try {
            const res = await axios.post(endpoints.notes.create(userData.user_id), data);
            return res.data;
        } catch (error) { return null; }
    }

    useEffect(() => {
        getAllNotes();
    }, []);

    // --- HANDLERS ---
    const handleLongPress = (item) => { setSelectedNote(item); setModalVisible(true); };
    function formatDate(isoString) {
        if(!isoString) return "--/--";
        const date = new Date(isoString);
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
    const pinNote = () => {
        const updatedNotes = notes.map(n => n.note_id === selectedNote.note_id ? { ...n, pinned: !n.pinned } : n);
        setNotes(updatedNotes.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1)));
        setModalVisible(false);
    };
    const deleteNote = () => { if (selectedNote) deleteJSON(selectedNote.note_id); };
    const saveNewNote = async () => {
        if (!newTitle.trim() && !newDescription.trim()) return;
        const newNote = { title: newTitle, content: newDescription, date: new Date().toISOString() };
        await postJSON(newNote);
        getAllNotes(); 
        setNewTitle(''); setNewDescription(''); setAddNoteModalVisible(false);
    };

    // --- RENDER ITEM ---
    const renderNote = ({ item, index }) => {
        const bgColor = NOTE_COLORS[index % NOTE_COLORS.length];
        return (
            <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleLongPress(item)} style={[styles.noteCard, { backgroundColor: bgColor }]}>
                <View style={styles.noteHeader}>
                    <Text style={styles.noteTitle} numberOfLines={1}>{item.title || "Không tiêu đề"}</Text>
                    {item.pinned && <Icon name="thumbtack" size={12} color="#ffab33" solid />}
                </View>
                <Text style={styles.noteContent} numberOfLines={5}>{item.content || "..."}</Text>
                <Text style={styles.noteDate}>{formatDate(item.date)}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Ghi chú</Text>
                    <TouchableOpacity style={styles.searchBtn}>
                        <Icon name="search" size={18} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Body */}
                <View style={styles.container}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#ffab33" style={{marginTop: 50}} />
                    ) : notes.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Image source={{ uri: EMPTY_IMAGE }} style={styles.emptyImage} resizeMode="contain" />
                            <Text style={styles.emptyText}>Chưa có ghi chú nào</Text>
                            <Text style={styles.emptySubText}>Hãy tạo ghi chú đầu tiên ngay nhé!</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notes}
                            keyExtractor={(item) => item.note_id.toString()}
                            numColumns={2}
                            columnWrapperStyle={{ justifyContent: 'space-between' }}
                            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
                            renderItem={renderNote}
                            showsVerticalScrollIndicator={false}
                            style={{ flex: 1 }} // QUAN TRỌNG: Giúp list dãn ra
                        />
                    )}
                </View>

                {/* FAB */}
                <TouchableOpacity style={styles.fab} onPress={() => setAddNoteModalVisible(true)} activeOpacity={0.8}>
                    <Icon name="plus" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Option Modal */}
                <Modal transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)} animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                        <View style={styles.optionModalContent}>
                            <Text style={styles.modalHeaderTitle}>Tùy chọn</Text>
                            <TouchableOpacity onPress={pinNote} style={styles.optionItem}>
                                <Icon name="thumbtack" size={16} color="#555" style={{width: 30}} />
                                <Text style={styles.optionText}>{selectedNote?.pinned ? "Bỏ ghim" : "Ghim ghi chú"}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={deleteNote} style={styles.optionItem}>
                                <Icon name="trash-alt" size={16} color="#e74c3c" style={{width: 30}} />
                                <Text style={[styles.optionText, {color: '#e74c3c'}]}>Xóa ghi chú</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Add Note Modal */}
                <Modal transparent={true} visible={addNoteModalVisible} onRequestClose={() => setAddNoteModalVisible(false)} animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.addNoteContainer}>
                            <View style={styles.addNoteHeader}>
                                <Text style={styles.addNoteTitle}>Ghi chú mới</Text>
                                <TouchableOpacity onPress={() => setAddNoteModalVisible(false)}>
                                    <Icon name="times" size={20} color="#555" />
                                </TouchableOpacity>
                            </View>
                            <TextInput style={styles.titleInput} placeholder="Tiêu đề" value={newTitle} onChangeText={setNewTitle} placeholderTextColor="#999" />
                            <TextInput style={styles.contentInput} placeholder="Nội dung ghi chú..." value={newDescription} onChangeText={setNewDescription} multiline textAlignVertical="top" placeholderTextColor="#999" />
                            <TouchableOpacity style={styles.saveButton} onPress={saveNewNote}>
                                <Text style={styles.saveButtonText}>Lưu ghi chú</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 0, paddingBottom: 15,
        backgroundColor: '#f8f9fa' // Màu nền header trùng màu nền chính
    },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333' },
    searchBtn: { padding: 10, backgroundColor: '#fff', borderRadius: 20, elevation: 2 },
    container: { flex: 1, paddingHorizontal: 15 },
    
    // Note Card
    noteCard: {
        width: NOTE_WIDTH, borderRadius: 16, padding: 15, marginBottom: 15,
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    noteTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, marginRight: 5 },
    noteContent: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 10, minHeight: 40 },
    noteDate: { fontSize: 11, color: '#999', alignSelf: 'flex-end', fontStyle: 'italic' },

    // Empty State
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50, opacity: 0.8 },
    emptyImage: { width: 120, height: 120, marginBottom: 20 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: '#555' },
    emptySubText: { fontSize: 14, color: '#888', marginTop: 5 },

    // FAB
    fab: {
        position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#ffab33',
        justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: "#ffab33", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4,
    },

    // Option Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    optionModalContent: { width: 250, backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 5 },
    modalHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, textAlign: 'center' },
    optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    optionText: { fontSize: 16, color: '#333' },

    // Add Note Modal
    addNoteContainer: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 20, padding: 20, height: '60%', elevation: 10 },
    addNoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    addNoteTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    titleInput: { fontSize: 18, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 10, marginBottom: 15, color: '#333' },
    contentInput: { flex: 1, fontSize: 16, color: '#333', lineHeight: 24, textAlignVertical: 'top' },
    saveButton: { backgroundColor: '#ffab33', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 15 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});