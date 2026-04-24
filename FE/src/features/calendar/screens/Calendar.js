import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Background from '../../../components/common/Background2';
import GanttChart from '../components/GanttChartCalendar';
import { AuthContext } from "../../auth/context/AuthContext";
import {useIsFocused} from "@react-navigation/native";
import Icon from 'react-native-vector-icons/FontAwesome5';
import * as Notifications from 'expo-notifications';
import { Calendar as MonthCalendar } from 'react-native-calendars';
import axios from 'axios';
import { endpoints } from '../../../config/endpoints';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function toDayKey(input) {
    return String(input || new Date().toISOString()).slice(0, 10);
}

function parseAiReminderCommand(commandText, fallbackDay) {
    const raw = String(commandText || '').trim();
    if (!raw) return null;
    const text = raw.toLowerCase();
    const now = new Date();

    let targetDate = fallbackDay || toDayKey(new Date().toISOString());
    const isoDateMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const dmyMatch = text.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
    if (isoDateMatch?.[1]) {
        targetDate = isoDateMatch[1];
    } else if (dmyMatch) {
        const day = Number(dmyMatch[1]);
        const month = Number(dmyMatch[2]);
        let year = dmyMatch[3] ? Number(dmyMatch[3]) : now.getFullYear();
        if (year < 100) year += 2000;
        targetDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (text.includes('ngay mai') || text.includes('mai')) {
        const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        targetDate = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    }

    const hhmmMatch = text.match(/\b(\d{1,2}):(\d{2})\b/);
    const hMatch = text.match(/\b(\d{1,2})h(?:\s*(\d{1,2}))?\b/);
    let hour = null;
    let minute = 0;
    if (hhmmMatch) {
        hour = Number(hhmmMatch[1]);
        minute = Number(hhmmMatch[2]);
    } else if (hMatch) {
        hour = Number(hMatch[1]);
        minute = Number(hMatch[2] || 0);
    }

    if (hour === null || Number.isNaN(hour) || Number.isNaN(minute)) {
        return { targetDate, reminderAtIso: null, titleText: raw };
    }

    if ((text.includes('chieu') || text.includes('chiều') || text.includes('toi') || text.includes('tối') || text.includes('pm')) && hour < 12) {
        hour += 12;
    }
    if ((text.includes('sang') || text.includes('sáng') || text.includes('am')) && hour === 12) {
        hour = 0;
    }
    if (hour > 23 || minute > 59) {
        return { targetDate, reminderAtIso: null, titleText: raw };
    }

    const reminderAtIso = new Date(`${targetDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).toISOString();
    const titleText = raw
        .replace(/nhắc tôi|nhac toi|remind me|set reminder|create reminder|đặt lịch|dat lich/gi, '')
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '')
        .replace(/\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g, '')
        .replace(/\b\d{1,2}:\d{2}\b/g, '')
        .replace(/\b\d{1,2}h(?:\s*\d{1,2})?\b/gi, '')
        .replace(/\b(vao|vào|luc|lúc|at|ngay mai|mai|chieu|chiều|toi|tối|sang|sáng|pm|am)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    return {
        targetDate,
        reminderAtIso,
        titleText: titleText || 'Nhac viec tu AI',
    };
}

export default function Calendar({ navigation }) {
    const { userData } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [notes, setNotes] = useState([]);
    const [selectedDay, setSelectedDay] = useState(toDayKey(new Date().toISOString()));
    const [addVisible, setAddVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [reminderTime, setReminderTime] = useState('');
    const [aiCommand, setAiCommand] = useState('');
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused && userData?.user_id) {
            fetchData();
        }
    }, [isFocused, userData?.user_id]);

    useEffect(() => {
        Notifications.requestPermissionsAsync().catch(() => null);
    }, []);

    useEffect(() => {
        syncScheduledReminders(notes).catch(() => null);
    }, [notes]);

    async function fetchData() {
        if (!userData?.user_id) return;
        try {
            const [taskRes, noteRes] = await Promise.all([
                axios.get(endpoints.tasks.getByUser(userData.user_id)),
                axios.get(endpoints.notes.getAllByUser(userData.user_id)),
            ]);
            setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
            setNotes(Array.isArray(noteRes.data) ? noteRes.data : []);
        } catch (error) {
            setTasks([]);
            setNotes([]);
        }
    }

    const notesByDay = useMemo(() => {
        const map = {};
        notes.forEach((item) => {
            const key = toDayKey(item.noteDate || item.date);
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return map;
    }, [notes]);

    const markedDates = useMemo(() => {
        const markers = {};
        Object.keys(notesByDay).forEach((key) => {
            markers[key] = { marked: true, dotColor: '#f59e0b' };
        });
        markers[selectedDay] = { ...(markers[selectedDay] || {}), selected: true, selectedColor: '#f59e0b' };
        return markers;
    }, [notesByDay, selectedDay]);

    async function scheduleReminderIfNeeded(note) {
        if (!note.reminderAt) return;
        const triggerDate = new Date(note.reminderAt);
        if (Number.isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) return;
        await Notifications.scheduleNotificationAsync({
            content: {
                title: note.title || 'Lich nhac viec',
                body: note.content || 'Ban co mot ghi chu can thuc hien.',
                data: { noteId: String(note.note_id || '') },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
        });
    }

    async function syncScheduledReminders(noteList) {
        const source = Array.isArray(noteList) ? noteList : [];
        if (!source.length) return;
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        const scheduledByNoteId = new Set(
            pending
                .map((item) => String(item?.content?.data?.noteId || ''))
                .filter(Boolean),
        );
        for (const item of source) {
            const noteId = String(item?.note_id || '');
            if (!noteId || scheduledByNoteId.has(noteId)) continue;
            await scheduleReminderIfNeeded(item);
        }
    }

    async function saveNote() {
        if (!title.trim() && !content.trim()) return;
        const reminderAtIso = reminderTime.trim()
            ? new Date(`${selectedDay}T${reminderTime.trim()}:00`).toISOString()
            : null;
        const payload = {
            title: title.trim(),
            content: content.trim(),
            noteDate: `${selectedDay}T00:00:00.000Z`,
            reminderAt: reminderAtIso,
            date: new Date().toISOString(),
        };
        try {
            const { data } = await axios.post(endpoints.notes.create(userData.user_id), payload);
            await scheduleReminderIfNeeded(data || payload);
            setAddVisible(false);
            setTitle('');
            setContent('');
            setReminderTime('');
            fetchData();
        } catch (_error) {
            Alert.alert('Loi', 'Khong the luu ghi chu lich.');
        }
    }

    async function deleteNote(noteId) {
        try {
            await axios.delete(endpoints.notes.remove(noteId));
            fetchData();
        } catch (_error) {
            Alert.alert('Loi', 'Khong the xoa ghi chu.');
        }
    }

    async function runAiCalendarCommand() {
        const cmd = aiCommand.trim();
        if (!cmd) return;
        const parsed = parseAiReminderCommand(cmd, selectedDay);
        const targetDate = parsed?.targetDate || selectedDay;
        const reminderAtIso = parsed?.reminderAtIso || null;
        const titleText = parsed?.titleText || 'Nhac viec tu AI';
        if (!reminderAtIso) {
            Alert.alert('Thieu gio nhac', 'Vui long them gio cu the. Vi du: 15:30 26/4 hoac 3h chieu 26/4.');
            return;
        }
        const payload = {
            title: titleText,
            content: cmd,
            noteDate: `${targetDate}T00:00:00.000Z`,
            reminderAt: reminderAtIso,
            date: new Date().toISOString(),
        };
        try {
            const { data } = await axios.post(endpoints.notes.create(userData.user_id), payload);
            await scheduleReminderIfNeeded(data || payload);
            setSelectedDay(targetDate);
            setAiCommand('');
            fetchData();
            Alert.alert('Da tao lich', 'Lenh AI da duoc chuyen thanh ghi chu lich.');
        } catch (_error) {
            Alert.alert('Loi', 'Khong the tao lich tu lenh AI.');
        }
    }

    const [currentMonth, setCurrentMonth] = useState(new Date());

    return (
        <Background>
            <SafeAreaView style={{ marginTop: 0, flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.chartCard}>
                        <GanttChart tasks={tasks} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} />
                    </View>

                    <View style={styles.notesCard}>
                        <Text style={styles.sectionTitle}>Lich & Ghi chu</Text>
                        <MonthCalendar
                            markedDates={markedDates}
                            onDayPress={(day) => setSelectedDay(day.dateString)}
                            theme={{
                                selectedDayBackgroundColor: '#f59e0b',
                                todayTextColor: '#b45309',
                            }}
                        />

                        <View style={styles.aiBox}>
                            <TextInput
                                style={styles.aiInput}
                                placeholder="Ra lenh AI de tao lich nhanh (vd: nhac toi hop 2026-05-01 09:30)"
                                value={aiCommand}
                                onChangeText={setAiCommand}
                            />
                            <TouchableOpacity style={styles.aiBtn} onPress={runAiCalendarCommand}>
                                <Icon name="robot" size={14} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.dayHeader}>
                            <Text style={styles.dayText}>Ngay {selectedDay}</Text>
                            <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
                                <Icon name="plus" size={12} color="#fff" />
                                <Text style={styles.addText}>Them</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={notesByDay[selectedDay] || []}
                            keyExtractor={(item) => String(item.note_id)}
                            scrollEnabled={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                            ListEmptyComponent={<Text style={styles.empty}>Chua co ghi chu cho ngay nay.</Text>}
                            renderItem={({ item }) => (
                                <View style={styles.noteRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.noteTitle}>{item.title || 'Khong tieu de'}</Text>
                                        <Text style={styles.noteContent}>{item.content || '-'}</Text>
                                        {item.reminderAt ? (
                                            <Text style={styles.noteMeta}>Nhac luc: {new Date(item.reminderAt).toLocaleString()}</Text>
                                        ) : null}
                                    </View>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(item.note_id)}>
                                        <Icon name="trash" size={11} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    </View>
                </ScrollView>

                <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalCard}>
                            <Text style={styles.modalTitle}>Them ghi chu ngay {selectedDay}</Text>
                            <TextInput style={styles.input} placeholder="Tieu de" value={title} onChangeText={setTitle} />
                            <TextInput style={[styles.input, { height: 80 }]} placeholder="Noi dung" value={content} onChangeText={setContent} multiline />
                            <TextInput style={styles.input} placeholder="Gio nhac (HH:mm), vd 09:30" value={reminderTime} onChangeText={setReminderTime} />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setAddVisible(false)}>
                                    <Text style={styles.cancelText}>Huy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btn, styles.save]} onPress={saveNote}>
                                    <Text style={styles.saveText}>Luu</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </Background>
    );
}

const styles = StyleSheet.create({
    scrollContent: { padding: 0, paddingBottom: 32 },
    chartCard: { borderRadius: 14, backgroundColor: '#fff', overflow: 'hidden', minHeight: 360 },
    notesCard: { marginTop: 12, borderRadius: 14, backgroundColor: '#fff', padding: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
    aiBox: { flexDirection: 'row', marginTop: 2, gap: 8 },
    aiInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    aiBtn: { width: 38, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
    dayHeader: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dayText: { color: '#334155', fontWeight: '700' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    addText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
    empty: { color: '#94a3b8', textAlign: 'center', marginTop: 16, marginBottom: 8 },
    noteRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#f1f5f9' },
    noteTitle: { color: '#111827', fontSize: 14, fontWeight: '700' },
    noteContent: { color: '#475569', fontSize: 12, marginTop: 4 },
    noteMeta: { color: '#0369a1', fontSize: 11, marginTop: 6 },
    deleteBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', maxWidth: 380, borderRadius: 12, backgroundColor: '#fff', padding: 14 },
    modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
    input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, backgroundColor: '#f8fafc' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
    btn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginLeft: 8 },
    cancel: { backgroundColor: '#e2e8f0' },
    save: { backgroundColor: '#f59e0b' },
    cancelText: { color: '#334155', fontWeight: '600' },
    saveText: { color: '#fff', fontWeight: '700' },
});
