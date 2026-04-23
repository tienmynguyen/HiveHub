import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import { AuthContext } from '../../auth/context/AuthContext';
import { endpoints } from '../../../config/endpoints';

function formatDate(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '--';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getStoryStatusUi(status) {
  const normalized = String(status || 'TODO').toUpperCase();
  switch (normalized) {
    case 'IN_PROGRESS':
      return { label: 'In Progress', bg: '#DEEBFF', color: '#0747A6' };
    case 'DONE':
      return { label: 'Done', bg: '#E3FCEF', color: '#006644' };
    case 'TODO':
    default:
      return { label: 'To Do', bg: '#DFE1E6', color: '#42526E' };
  }
}

export default function StoryDetail({ navigation, route }) {
  const { userData } = useContext(AuthContext);
  const { story: initialStory, projectId } = route.params || {};

  const [story, setStory] = useState(initialStory || null);
  const [subTasks, setSubTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [myRole, setMyRole] = useState('Member');

  const completion = useMemo(() => {
    if (!subTasks.length) return 0;
    const done = subTasks.filter((x) => x.taskStatus === 'COMPLETED' || x.taskStatus === 'DONE').length;
    return Math.round((done * 100) / subTasks.length);
  }, [subTasks]);
  const statusUi = getStoryStatusUi(story?.storyStatus);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!initialStory?.story_id) return;
    setLoading(true);
    try {
      const [storyRes, subTaskRes, commentRes] = await Promise.all([
        axios.get(endpoints.stories.getById(initialStory.story_id)),
        axios.get(endpoints.tasks.getByStory(initialStory.story_id)),
        axios.get(endpoints.stories.getComments(initialStory.story_id)),
      ]);
      if (projectId && userData?.user_id) {
        const { data: roleRes } = await axios.get(endpoints.projects.getRole(projectId, userData.user_id));
        setMyRole(roleRes?.role?.roleName || 'Member');
      }
      setStory(storyRes.data || initialStory);
      setSubTasks(Array.isArray(subTaskRes.data) ? subTaskRes.data : []);
      setComments(Array.isArray(commentRes.data) ? commentRes.data : []);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu story.');
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    if (!newComment.trim() || !story?.story_id || !userData?.user_id) return;
    try {
      await axios.post(endpoints.stories.postComment(story.story_id, userData.user_id), {
        commmentContent: newComment.trim(),
        date: new Date().toISOString(),
      });
      setNewComment('');
      loadData();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi comment.');
    }
  }

  async function updateStoryStatus(nextStatus) {
    if (!story?.story_id || !userData?.user_id) return;
    try {
      await axios.post(endpoints.stories.update(story.story_id, userData.user_id), {
        storyStatus: nextStatus,
      });
      setStatusModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái story.');
    }
  }

  const onCreateSubTask = () => {
    if (myRole !== 'Owner') {
      Alert.alert('Không có quyền', 'Chỉ Owner mới có thể tạo subtask.');
      return;
    }
    navigation.navigate('AddTask', {
      projectId,
      initialStoryId: story?.story_id,
      storyName: story?.storyName,
    });
  };

  const goTaskDetail = (task) => {
    navigation.navigate('TaskDetail', { task, projectId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={16} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Story Detail</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.storyTitle}>{story?.storyName || 'Story'}</Text>
          <Text style={styles.storyDesc}>{story?.description || 'Chưa có mô tả'}</Text>
          <View style={styles.metaRow}>
            <TouchableOpacity
              style={[styles.statusPill, { backgroundColor: statusUi.bg }]}
              onPress={() => setStatusModalVisible(true)}
            >
              <Text style={[styles.statusPillText, { color: statusUi.color }]}>
                Trạng thái: {statusUi.label}
              </Text>
              <Icon name="chevron-down" size={10} color={statusUi.color} />
            </TouchableOpacity>
            <Text style={styles.metaText}>Hoàn thành: {completion}%</Text>
          </View>
          {loading ? <Text style={styles.loadingText}>Đang tải...</Text> : null}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Subtask ({subTasks.length})</Text>
            {myRole === 'Owner' ? (
              <TouchableOpacity style={styles.createBtn} onPress={onCreateSubTask}>
                <Text style={styles.createBtnText}>+ Create</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {subTasks.length === 0 ? <Text style={styles.emptyText}>Chưa có subtask</Text> : null}
          {subTasks.map((task, idx) => (
            <TouchableOpacity key={task.task_id || idx} style={styles.taskRow} onPress={() => goTaskDetail(task)}>
              <View style={styles.taskTextWrap}>
                <Text style={styles.taskTitle}>{idx + 1}. {task.taskName}</Text>
                <Text style={styles.taskSub}>{task.taskStatus || 'TODO'} - Deadline {formatDate(task.deadline)}</Text>
              </View>
              <Icon name="chevron-right" size={12} color="#999" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Comment</Text>
          {comments.length === 0 ? <Text style={styles.emptyText}>Chưa có comment</Text> : null}
          {comments.map((cmt, idx) => (
            <View key={cmt.comment_id || idx} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{cmt?.users?.username || 'User'}</Text>
              <Text style={styles.commentText}>{cmt.commmentContent}</Text>
            </View>
          ))}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Viết comment..."
            />
            <TouchableOpacity style={styles.sendBtn} onPress={submitComment}>
              <Icon name="paper-plane" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={statusModalVisible}
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chỉnh sửa trạng thái Story</Text>
            {['TODO', 'IN_PROGRESS', 'DONE'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.statusOption, { backgroundColor: getStoryStatusUi(st).bg }]}
                onPress={() => updateStoryStatus(st)}
              >
                <Text style={[styles.statusOptionText, { color: getStoryStatusUi(st).color }]}>
                  {getStoryStatusUi(st).label}
                </Text>
                {story?.storyStatus === st ? <Icon name="check" size={12} color="#16a34a" /> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 36, paddingBottom: 12, backgroundColor: '#fff' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f1f1' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  content: { padding: 14, paddingBottom: 30 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1 },
  storyTitle: { fontSize: 18, fontWeight: '700', color: '#2c3e50' },
  storyDesc: { fontSize: 13, color: '#666', marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  metaText: { fontSize: 12, color: '#556' },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 12, fontWeight: '700', marginRight: 6 },
  loadingText: { marginTop: 8, color: '#888' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 8 },
  createBtn: { backgroundColor: '#ffad44', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#999', fontSize: 12, marginTop: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eef0f5', borderRadius: 10, padding: 10, marginTop: 8 },
  taskTextWrap: { flex: 1, marginRight: 8 },
  taskTitle: { fontWeight: '600', color: '#2e3440', fontSize: 13 },
  taskSub: { color: '#888', fontSize: 11, marginTop: 4 },
  commentRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f2f4' },
  commentAuthor: { fontSize: 12, fontWeight: '700', color: '#444' },
  commentText: { fontSize: 13, color: '#555', marginTop: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { flex: 1, backgroundColor: '#f2f4f8', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ffad44', justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 8, borderRadius: 8, marginBottom: 6 },
  statusOptionText: { fontSize: 14, fontWeight: '600' },
  cancelBtn: { alignSelf: 'flex-end', marginTop: 10, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  cancelBtnText: { color: '#334155', fontWeight: '600' },
});
