import React, { useContext, useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import Icon from "react-native-vector-icons/FontAwesome";
import Background from '../components/Background2';
import Config from './config.json';
import { AuthContext } from '../context/AuthContext';

export default function Note() {
    const [notes, setNotes] = useState([]);
    const [selectedNote, setSelectedNote] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [addNoteModalVisible, setAddNoteModalVisible] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const { userData, logout } = useContext(AuthContext);

    const getAllNotes = async () => {
        try {
            const response = await fetch(`${Config.URLAPI}/getallnotebyuser?userId=${userData.user_id}`);
            const notes = await response.json();
            setNotes(notes);
        } catch (error) {
            console.error("Error fetching notes:", error);
        }
    };

    async function deleteJSON(noteId) {

        try {
            const response = await fetch(`${Config.URLAPI}/deletenote?noteId=${noteId}`);

            getAllNotes();
            setModalVisible(false);
        } catch (error) {
            console.error("Error delete notes:", error);
        }
    };

    async function postJSON(data) {

        try {
            const response = await fetch(`${Config.URLAPI}/addnote?userId=${userData.user_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            console.log("Success:", result);
            return result; // Return the added note
        } catch (error) {
            console.error("Error:", error);
            return null;
        }
    }

    useEffect(() => {
        getAllNotes();
    }, []);

    const handleLongPress = (item) => {
        setSelectedNote(item);
        setModalVisible(true);
    };

    function formatDate(isoString) {
        const date = new Date(isoString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getCurrentFormattedDate() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const pinNote = () => {
        const updatedNotes = notes.map(note => {
            if (note.note_id === selectedNote.note_id) {
                // Nếu note đã được pin, unpin nó
                return { ...note, pinned: !note.pinned };
            }
            return note;
        });
        setNotes(updatedNotes);
        setModalVisible(false);
    };

    const deleteNote = () => {
        if (selectedNote) {

            deleteJSON(selectedNote.note_id);

        }
    };

    const saveNewNote = async () => {
        const newNote = {
            title: newTitle,
            content: newDescription,
            date: getCurrentFormattedDate(),
        };

        const addedNote = await postJSON(newNote);
        if (addedNote) {
            setNotes([...notes, addedNote]); // Add the new note to the state
            setNewTitle('');
            setNewDescription('');
            setAddNoteModalVisible(false);
        }
    };

    const renderNote = ({ item }) => (
        <TouchableOpacity onLongPress={() => handleLongPress(item)}>
            <View style={styles.noteContainer}>
                {item.pinned && <Icon name="thumb-tack" size={20} color="#9f0808" style={styles.pinIcon} />}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.content}>{item.content}</Text>
                <View style={{ height: 15 }}></View>
                <Text style={styles.date}> {formatDate(item.date)}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <Background>
            <View style={{ marginTop: 80 }}>
                <View>
                    <TouchableOpacity onPress={() => setAddNoteModalVisible(true)}>
                        <View style={styles.addButton}>
                            <Text>ADD NOTE</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={notes}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    renderItem={renderNote}
                />
                {selectedNote && (
                    <Modal
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalBackground}>
                            <View style={styles.modalContainer}>
                                <TouchableOpacity onPress={pinNote} style={styles.modalButton}>
                                    <Text style={styles.modalButtonText}>Pin</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={deleteNote} style={styles.modalButton}>
                                    <Text style={styles.modalButtonText}>Delete</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalButton}>
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                )}
                <Modal
                    transparent={true}
                    visible={addNoteModalVisible}
                    onRequestClose={() => setAddNoteModalVisible(false)}
                >
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Title"
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Description"
                                value={newDescription}
                                onChangeText={setNewDescription}
                            />
                            <TouchableOpacity onPress={saveNewNote} style={styles.modalButton}>
                                <Text style={styles.modalButtonText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setAddNoteModalVisible(false)} style={styles.modalButton}>
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </Background>
    );
}

const styles = StyleSheet.create({
    noteContainer: {
        flex: 1,
        width: 185,
        margin: 10,
        padding: 20,
        backgroundColor: "#ffb267",
        borderRadius: 15,
        position: 'relative',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.29,
        shadowRadius: 4.65,

        elevation: 7,

    },
    content: {
        marginTop: 10,
        backgroundColor:"#ffeaa0",
        padding:10,
        borderRadius:10
    },
    date: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        fontStyle: 'italic'
    },
    pinIcon: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    create: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        color: "#9f0808",
    },
    addButton: {
        backgroundColor: "#ffa733",
        padding: 10,
        flexDirection: "column",
        alignItems: "center",
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: 300,
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
    },
    modalButton: {
        margin: 10,
        padding: 10,
        backgroundColor: "#ffa733",
        borderRadius: 10,
        width: '100%',
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 18,
    },
    input: {
        width: '100%',
        borderBottomWidth: 1,
        borderColor: '#ccc',
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
});
