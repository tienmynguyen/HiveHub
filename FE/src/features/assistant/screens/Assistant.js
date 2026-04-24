import React, { useContext, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import * as Speech from 'expo-speech';
import { AuthContext } from '../../auth/context/AuthContext';
import { endpoints } from '../../../config/endpoints';

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value || '');
  }
}

export default function Assistant({ route }) {
  const { userData } = useContext(AuthContext);
  const routeProjectId = route?.params?.projectId || null;
  const routeSprintId = route?.params?.sprintId || null;
  const routeStoryId = route?.params?.storyId || null;
  const [messages, setMessages] = useState([
    {
      id: 'sys-1',
      role: 'assistant',
      text: 'Xin chào! Mình có thể giải đáp, tạo project/story/task theo quyền, và lập báo cáo sprint.',
    },
  ]);
  const [input, setInput] = useState('');
  const [projectIdInput, setProjectIdInput] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingClarification, setPendingClarification] = useState(null);
  const [latestGuide, setLatestGuide] = useState(null);
  const [sessionMemory, setSessionMemory] = useState({
    projectId: routeProjectId,
    sprintId: routeSprintId,
    storyId: routeStoryId,
  });
  const initialAssistantMessage = {
    id: 'sys-1',
    role: 'assistant',
    text: 'Xin chào! Mình có thể giải đáp, tạo project/story/task theo quyền, và lập báo cáo sprint.',
  };

  const canSend = useMemo(() => input.trim().length > 0, [input]);
  const effectiveProjectId = projectIdInput.trim() || sessionMemory.projectId || routeProjectId || '';

  function mergeWithContext(payload = {}) {
    return {
      ...payload,
      projectId: payload.projectId || effectiveProjectId || undefined,
      sprintId: payload.sprintId || sessionMemory.sprintId || routeSprintId || undefined,
      storyId: payload.storyId || sessionMemory.storyId || routeStoryId || undefined,
    };
  }

  function syncMemoryFromResponse(data) {
    if (!data) return;
    const m = data.sessionMemory || {};
    setSessionMemory((prev) => ({
      projectId: m.projectId || data?.parsedPayload?.projectId || prev.projectId || routeProjectId || null,
      sprintId: m.sprintId || data?.parsedPayload?.sprintId || prev.sprintId || routeSprintId || null,
      storyId: m.storyId || data?.parsedPayload?.storyId || prev.storyId || routeStoryId || null,
    }));
  }

  function pushMessage(role, text) {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text },
    ]);
  }

  function clearChat() {
    setMessages([initialAssistantMessage]);
    setInput('');
    setPreviewResult(null);
    setIdempotencyKey(null);
    setConfirmModalVisible(false);
    setPendingClarification(null);
    setLatestGuide(null);
    setSessionMemory({
      projectId: routeProjectId || null,
      sprintId: routeSprintId || null,
      storyId: routeStoryId || null,
    });
  }

  function speakText(text) {
    if (!text) return;
    setSpeaking(true);
    Speech.speak(text, {
      language: 'vi-VN',
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }

  async function onChat() {
    const message = input.trim();
    if (!message) return;
    setInput('');
    pushMessage('user', message);

    // Missing-field follow-up flow: ask exactly once, then retry preview.
    if (pendingClarification) {
      try {
        const key = `${Date.now()}-${Math.random()}`;
        setIdempotencyKey(key);
        const previewRes = await axios.post(endpoints.agent.preview(), {
          userId: userData?.user_id,
          intent: pendingClarification.intent,
          payload: mergeWithContext(pendingClarification.basePayload || {}),
          commandText: message,
          idempotencyKey: key,
        });
        setPreviewResult(previewRes.data);
        syncMemoryFromResponse(previewRes.data);
        setLatestGuide(previewRes.data?.guide || null);
        setPendingClarification(null);
        const doneMsg = 'Đã nhận đủ thông tin bổ sung và tạo preview. Bạn có thể bấm "Mở xác nhận execute" để xem lại trước khi thực thi.';
        pushMessage('assistant', doneMsg);
        speakText(doneMsg);
      } catch (error) {
        const missing = error?.response?.data?.missingFields;
        if (pendingClarification.retryLeft <= 0) {
          setPendingClarification(null);
          const stopMsg = `Sau 1 lần hỏi bổ sung, vẫn thiếu dữ liệu (${Array.isArray(missing) ? missing.join(', ') : 'không xác định'}). Vui lòng gửi lại lệnh đầy đủ.`;
          pushMessage('assistant', stopMsg);
          speakText(stopMsg);
        } else {
          const askAgain = Array.isArray(missing) ? missing.join(', ') : 'dữ liệu bắt buộc';
          setPendingClarification((prev) => ({ ...prev, retryLeft: prev.retryLeft - 1 }));
          const askMsg = `Mình vẫn thiếu: ${askAgain}. Trả lời 1 lần nữa để mình thực hiện.`;
          pushMessage('assistant', askMsg);
          speakText(askMsg);
        }
      }
      return;
    }

    try {
      const { data } = await axios.post(endpoints.agent.chat(), {
        userId: userData?.user_id,
        message,
      });
      syncMemoryFromResponse(data);

      const actionableIntents = ['CREATE_PROJECT', 'CREATE_SPRINT', 'CREATE_STORY', 'CREATE_TASK', 'UPDATE_SPRINT_STATUS'];
      const clarificationActive = Boolean(data?.clarification?.active);
      if (actionableIntents.includes(String(data?.intent || '')) && data?.actionReady && !clarificationActive) {
        // Với lệnh thao tác, không hiển thị câu trả lời kiểu "đã tạo" trước khi execute thành công.
        try {
          const key = `${Date.now()}-${Math.random()}`;
          setIdempotencyKey(key);
          const previewRes = await axios.post(endpoints.agent.preview(), {
            userId: userData?.user_id,
            intent: data.intent,
          payload: mergeWithContext(data.parsedPayload || {}),
            commandText: message,
            idempotencyKey: key,
          });
          setPreviewResult(previewRes.data);
          syncMemoryFromResponse(previewRes.data);
          setLatestGuide(previewRes.data?.guide || data?.guide || null);
          const previewMsg = `Đã tạo preview cho lệnh "${message}". Chưa thực thi. Bạn bấm "Mở xác nhận execute" để xem và xác nhận.`;
          pushMessage('assistant', previewMsg);
          speakText(previewMsg);
        } catch (previewError) {
          const msg = previewError?.response?.data?.message || 'Không thể tạo preview tự động.';
          pushMessage('assistant', `Lệnh đã được nhận diện nhưng preview thất bại: ${msg}`);
        }
      } else if (actionableIntents.includes(String(data?.intent || '')) && (!data?.actionReady || clarificationActive)) {
        const missing = Array.isArray(data?.missingFields) ? data.missingFields.join(', ') : '';
        const askMsg =
          data?.guide?.question ||
          `Mình cần thêm thông tin để thực hiện: ${missing || 'projectId/storyName/taskName'}. Vui lòng trả lời bổ sung ngay tin nhắn tiếp theo.`;
        pushMessage('assistant', askMsg);
        speakText(askMsg);
        setLatestGuide(data?.guide || null);
        setPendingClarification({
          intent: data?.intent,
          basePayload: data?.parsedPayload || {},
          retryLeft: 1,
        });
      } else {
        // Câu hỏi thông thường mới dùng text LLM nguyên bản.
        pushMessage('assistant', data?.answer || 'Mình chưa có câu trả lời phù hợp.');
        speakText(data?.answer || '');
      }
    } catch (error) {
      pushMessage('assistant', 'Không thể gọi AI Agent lúc này.');
    }
  }

  async function onPreview(intent, payload = {}) {
    try {
      const key = `${Date.now()}-${Math.random()}`;
      setIdempotencyKey(key);
      const { data } = await axios.post(endpoints.agent.preview(), {
        userId: userData?.user_id,
        intent,
        payload: mergeWithContext(payload),
        idempotencyKey: key,
      });
      setPreviewResult(data);
      syncMemoryFromResponse(data);
      setLatestGuide(data?.guide || null);
      pushMessage('assistant', `Preview: ${data?.previewSummary || 'Action draft đã sẵn sàng.'}`);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Không thể tạo preview.';
      Alert.alert('Lỗi preview', msg);
    }
  }

  async function onExecute() {
    if (!previewResult?.confirmationToken) return;
    try {
      const { data } = await axios.post(endpoints.agent.execute(), {
        userId: userData?.user_id,
        confirmationToken: previewResult.confirmationToken,
        idempotencyKey,
      });
      syncMemoryFromResponse(data);
      const okMsg = `Đã thực thi thành công ${data?.executedAction || 'ACTION'}.`;
      pushMessage('assistant', okMsg);
      speakText('Đã thực thi thành công thao tác.');
      setPreviewResult(null);
      setConfirmModalVisible(false);
      setPendingClarification(null);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Không thể thực thi action.';
      Alert.alert('Lỗi execute', msg);
    }
  }

  async function onReport() {
    if (!projectIdInput.trim()) {
      if (!effectiveProjectId) {
        Alert.alert('Thiếu thông tin', 'Nhập project ID hoặc nói lệnh có chứa project để AI nhớ ngữ cảnh.');
        return;
      }
    }
    try {
      const { data } = await axios.post(endpoints.agent.report(), {
        projectId: effectiveProjectId,
        userId: userData?.user_id,
      });
      syncMemoryFromResponse(data);
      pushMessage('assistant', `Báo cáo:\n${prettyJson(data?.summary || data)}`);
    } catch (error) {
      const msg = error?.response?.data?.message || 'Không lấy được báo cáo.';
      Alert.alert('Lỗi báo cáo', msg);
    }
  }

  function renderContextPill(label, value) {
    if (!value) return null;
    return (
      <View style={styles.contextPill}>
        <Text style={styles.contextPillText}>{label}: {String(value)}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.clearBtn} onPress={clearChat}>
            <Icon name="trash-alt" size={13} color="#b91c1c" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ttsBtn}
            onPress={() => {
              if (speaking) {
                Speech.stop();
                setSpeaking(false);
              } else {
                const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
                speakText(lastAssistant?.text || 'Chưa có nội dung để đọc.');
              }
            }}
          >
            <Icon name={speaking ? 'volume-mute' : 'volume-up'} size={15} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contextRow}>
        {renderContextPill('Project', effectiveProjectId)}
        {renderContextPill('Sprint', sessionMemory.sprintId)}
        {renderContextPill('Story', sessionMemory.storyId)}
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => onPreview('CREATE_PROJECT', { projectName: `Project ${Date.now().toString().slice(-4)}` })}>
          <Text style={styles.quickText}>Preview Create Project</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setConfirmModalVisible(Boolean(previewResult?.confirmationToken))}>
          <Text style={styles.quickText}>Mở xác nhận execute</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => onPreview('CREATE_TASK', mergeWithContext({ taskName: 'Task from AI' }))}>
          <Text style={styles.quickText}>Preview Create Task</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickBtn} onPress={onExecute} disabled={!previewResult?.confirmationToken}>
          <Text style={styles.quickText}>Confirm Execute</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportRow}>
        <TextInput
          style={styles.projectInput}
          placeholder="Nhập Project ID để báo cáo..."
          value={projectIdInput}
          onChangeText={setProjectIdInput}
        />
        <TouchableOpacity style={styles.reportBtn} onPress={onReport}>
          <Text style={styles.reportText}>Báo cáo</Text>
        </TouchableOpacity>
      </View>

      {latestGuide ? (
        <View style={styles.guideCard}>
          <Text style={styles.guideTitle}>{latestGuide.title || 'Hướng dẫn'}</Text>
          <Text style={styles.guideQuestion}>{latestGuide.question || ''}</Text>
          {latestGuide.hint ? <Text style={styles.guideHint}>{latestGuide.hint}</Text> : null}
          {Array.isArray(latestGuide.examples) && latestGuide.examples.length > 0 ? (
            <View style={{ marginTop: 6 }}>
              {latestGuide.examples.slice(0, 2).map((ex, idx) => (
                <Text key={`ex-${idx}`} style={styles.guideExample}>- {ex}</Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.aiRow]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.micBtn}
          onPress={() =>
            Alert.alert(
              'Voice Input',
              'MVP hiện hỗ trợ Voice Output (đọc phản hồi). Với Voice Input, bạn có thể dùng nút micro trên bàn phím để đọc lệnh.'
            )
          }
        >
          <Icon name="microphone" size={16} color="#fff" />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Nhập câu hỏi hoặc lệnh..."
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity style={[styles.sendBtn, !canSend && { opacity: 0.5 }]} disabled={!canSend} onPress={onChat}>
          <Icon name="paper-plane" size={15} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Xác nhận thao tác AI</Text>
            {previewResult?.action ? (
              <Text style={styles.modalBody}>{prettyJson(previewResult.action)}</Text>
            ) : (
              <Text style={styles.modalBody}>Chưa có preview action.</Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.cancelText}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.executeBtn, !previewResult?.confirmationToken ? { opacity: 0.5 } : null]}
                onPress={onExecute}
                disabled={!previewResult?.confirmationToken}
              >
                <Text style={styles.executeText}>Execute</Text>
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
  header: { paddingTop: 0, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  clearBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },
  ttsBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginTop: 8 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10 },
  quickText: { fontSize: 11, fontWeight: '600', color: '#334155', textAlign: 'center' },
  reportRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 8, gap: 8 },
  projectInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe2ea', borderRadius: 10, paddingHorizontal: 10 },
  reportBtn: { backgroundColor: '#f59e0b', borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  reportText: { color: '#fff', fontWeight: '700' },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 8, gap: 6 },
  contextPill: { backgroundColor: '#e0f2fe', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  contextPillText: { color: '#075985', fontSize: 11, fontWeight: '600' },
  guideCard: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 10 },
  guideTitle: { color: '#9a3412', fontSize: 12, fontWeight: '700' },
  guideQuestion: { color: '#7c2d12', marginTop: 4, fontSize: 12, fontWeight: '600' },
  guideHint: { color: '#9a3412', marginTop: 4, fontSize: 11 },
  guideExample: { color: '#b45309', fontSize: 11, marginTop: 2 },
  messageRow: { maxWidth: '85%', borderRadius: 12, padding: 10, marginBottom: 8 },
  userRow: { backgroundColor: '#ffedd5', alignSelf: 'flex-end' },
  aiRow: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb' },
  messageText: { color: '#1f2937', fontSize: 13, lineHeight: 18 },
  inputBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  modalBody: { color: '#334155', fontSize: 12, lineHeight: 18, maxHeight: 220 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  executeBtn: { backgroundColor: '#16a34a' },
  cancelText: { color: '#334155', fontWeight: '600' },
  executeText: { color: '#fff', fontWeight: '700' },
});
