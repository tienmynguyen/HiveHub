import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/FontAwesome5';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { AuthContext } from '../../auth/context/AuthContext';
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

export default function Note() {
  const { userData } = useContext(AuthContext);
  const [notes, setNotes] = useState([]);
  const [selectedDay, setSelectedDay] = useState(toDayKey(new Date().toISOString()));
  const [addVisible, setAddVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [aiCommand, setAiCommand] = useState('');

  async function loadNotes() {
    if (!userData?.user_id) return;
    try {
      const { data } = await axios.get(endpoints.notes.getAllByUser(userData.user_id));
      setNotes(Array.isArray(data) ? data : []);
    } catch (_error) {
      setNotes([]);
    }
  }

  useEffect(() => {
    loadNotes();
    Notifications.requestPermissionsAsync().catch(() => null);
  }, []);

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
        title: note.title || 'Lịch nhắc việc',
        body: note.content || 'Bạn có một ghi chú cần thực hiện.',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  }

  async function saveNote() {
    if (!title.trim() && !content.trim()) return;
    const reminderAtIso =
      reminderTime.trim().length > 0
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
      loadNotes();
    } catch (_error) {
      Alert.alert('Lỗi', 'Không thể lưu ghi chú lịch.');
    }
  }

  async function deleteNote(noteId) {
    try {
      await axios.delete(endpoints.notes.remove(noteId));
      loadNotes();
    } catch (_error) {
      Alert.alert('Lỗi', 'Không thể xoá ghi chú.');
    }
  }

  async function runAiCalendarCommand() {
    const cmd = aiCommand.trim();
    if (!cmd) return;
    const timeMatch = cmd.match(/(\d{1,2}):(\d{2})/);
    const dateMatch = cmd.match(/(\d{4}-\d{2}-\d{2})/);
    const titleText = cmd.replace(/nhắc tôi|nhac toi|remind me|vào|luc|lúc|at/gi, '').trim();

    const targetDate = dateMatch ? dateMatch[1] : selectedDay;
    const hh = timeMatch ? String(timeMatch[1]).padStart(2, '0') : '';
    const mm = timeMatch ? String(timeMatch[2]).padStart(2, '0') : '';
    const reminder = hh && mm ? `${hh}:${mm}` : '';
    setTitle(titleText || 'Nhắc việc từ AI');
    setContent(`Lệnh AI: ${cmd}`);
    setSelectedDay(targetDate);
    setReminderTime(reminder);
    setAddVisible(true);
    setAiCommand('');
    Alert.alert('AI', 'Đã phân tích lệnh. Bạn xác nhận và bấm Lưu để thực thi.');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch & Ghi chú</Text>
      </View>

      <Calendar
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
          placeholder="Lệnh AI lịch (vd: nhắc tôi họp 2026-05-01 09:30)"
          value={aiCommand}
          onChangeText={setAiCommand}
        />
        <TouchableOpacity style={styles.aiBtn} onPress={runAiCalendarCommand}>
          <Icon name="robot" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.dayHeader}>
        <Text style={styles.dayText}>Ngày {selectedDay}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddVisible(true)}>
          <Icon name="plus" size={14} color="#fff" />
          <Text style={styles.addText}>Thêm</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notesByDay[selectedDay] || []}
        keyExtractor={(item) => String(item.note_id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có ghi chú cho ngày này.</Text>}
        renderItem={({ item }) => (
          <View style={styles.noteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>{item.title || 'Không tiêu đề'}</Text>
              <Text style={styles.noteContent}>{item.content || '-'}</Text>
              {item.reminderAt ? <Text style={styles.noteMeta}>Nhắc lúc: {new Date(item.reminderAt).toLocaleString()}</Text> : null}
            </View>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteNote(item.note_id)}>
              <Icon name="trash" size={12} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={addVisible} transparent animationType="fade" onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thêm ghi chú ngày {selectedDay}</Text>
            <TextInput style={styles.input} placeholder="Tiêu đề" value={title} onChangeText={setTitle} />
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Nội dung" value={content} onChangeText={setContent} multiline />
            <TextInput style={styles.input} placeholder="Giờ nhắc (HH:mm), ví dụ 09:30" value={reminderTime} onChangeText={setReminderTime} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btn, styles.cancel]} onPress={() => setAddVisible(false)}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.save]} onPress={saveNote}>
                <Text style={styles.saveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 36, paddingHorizontal: 14, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  aiBox: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 8, gap: 8 },
  aiInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  aiBtn: { width: 38, borderRadius: 10, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  dayHeader: { marginTop: 10, paddingHorizontal: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayText: { color: '#334155', fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 16 },
  noteRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#f1f5f9' },
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