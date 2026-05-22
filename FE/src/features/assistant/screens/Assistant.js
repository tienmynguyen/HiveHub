import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  const [isAnalyzingIntent, setIsAnalyzingIntent] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [contextProjectId, setContextProjectId] = useState(routeProjectId ? String(routeProjectId) : '');
  const [contextSprintId, setContextSprintId] = useState(routeSprintId ? String(routeSprintId) : '');
  const [contextStoryId, setContextStoryId] = useState(routeStoryId ? String(routeStoryId) : '');
  const [riskyConfirmChecked, setRiskyConfirmChecked] = useState(false);
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
  const effectiveProjectId = contextProjectId.trim() || projectIdInput.trim() || sessionMemory.projectId || routeProjectId || '';
  const effectiveSprintId = contextSprintId.trim() || sessionMemory.sprintId || routeSprintId || '';
  const effectiveStoryId = contextStoryId.trim() || sessionMemory.storyId || routeStoryId || '';

  function mergeWithContext(payload = {}) {
    return {
      ...payload,
      projectId: payload.projectId || effectiveProjectId || undefined,
      sprintId: payload.sprintId || effectiveSprintId || undefined,
      storyId: payload.storyId || effectiveStoryId || undefined,
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
    if (m.projectId || data?.parsedPayload?.projectId) setContextProjectId(String(m.projectId || data.parsedPayload.projectId));
    if (m.sprintId || data?.parsedPayload?.sprintId) setContextSprintId(String(m.sprintId || data.parsedPayload.sprintId));
    if (m.storyId || data?.parsedPayload?.storyId) setContextStoryId(String(m.storyId || data.parsedPayload.storyId));
  }

  const previewAction = previewResult?.action || {};
  const previewActionType = String(previewAction?.type || previewResult?.intent || '').toUpperCase();
  const previewPayload = previewAction?.payload || previewResult?.parsedPayload || {};
  const requiredFieldsByAction = {
    CREATE_PROJECT: ['projectName'],
    CREATE_PROJECT_BLUEPRINT: ['projectName'],
    CREATE_SPRINT: ['projectId', 'sprintName'],
    CREATE_STORY: ['projectId', 'storyName'],
    CREATE_TASK: ['projectId', 'taskName'],
    UPDATE_SPRINT_STATUS: ['projectId', 'sprintId', 'sprintStatus'],
    CREATE_CALENDAR_NOTE: ['title'],
  };
  const previewMissingRequired = (requiredFieldsByAction[previewActionType] || []).filter((key) => {
    const value = previewPayload?.[key];
    return value === undefined || value === null || String(value).trim() === '';
  });
  const riskyActionTypes = ['UPDATE_SPRINT_STATUS', 'DELETE_PROJECT', 'REMOVE_MEMBER'];
  const isRiskyAction = riskyActionTypes.includes(previewActionType);

  function pushMessage(role, text) {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text },
    ]);
  }

  async function clearChat() {
    setMessages([initialAssistantMessage]);
    setInput('');
    setPreviewResult(null);
    setIdempotencyKey(null);
    setConfirmModalVisible(false);
    setPendingClarification(null);
    setLatestGuide(null);
    setIsAnalyzingIntent(false);
    setIsPreviewLoading(false);
    setRiskyConfirmChecked(false);
    setSessionMemory({
      projectId: routeProjectId || null,
      sprintId: routeSprintId || null,
      storyId: routeStoryId || null,
    });
    try {
      if (userData?.user_id) {
        await axios.post(endpoints.agent.clearMemory(), { userId: userData.user_id });
      }
    } catch (e) {
      console.error('Failed to clear backend memory', e);
    }
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

    setIsAnalyzingIntent(true);
    // Missing-field follow-up flow: ask exactly once, then retry preview.
    if (pendingClarification) {
      try {
        const key = `${Date.now()}-${Math.random()}`;
        setIdempotencyKey(key);
        setIsPreviewLoading(true);
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
      setIsPreviewLoading(false);
      setIsAnalyzingIntent(false);
      return;
    }

    try {
      const { data } = await axios.post(endpoints.agent.chat(), {
        userId: userData?.user_id,
        message,
      });
      syncMemoryFromResponse(data);

      const actionableIntents = [
        'CREATE_PROJECT',
        'CREATE_PROJECT_BLUEPRINT',
        'CREATE_SPRINT',
        'CREATE_STORY',
        'CREATE_TASK',
        'CREATE_CALENDAR_NOTE',
        'UPDATE_SPRINT_STATUS',
      ];
      const clarificationActive = Boolean(data?.clarification?.active);
      if (actionableIntents.includes(String(data?.intent || '')) && data?.actionReady && !clarificationActive) {
        // Với lệnh thao tác, không hiển thị câu trả lời kiểu "đã tạo" trước khi execute thành công.
        try {
          const key = `${Date.now()}-${Math.random()}`;
          setIdempotencyKey(key);
          setIsPreviewLoading(true);
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
          
          const previewActionType = String(previewRes.data?.action?.type || '').toUpperCase();
          const isRisky = ['UPDATE_SPRINT_STATUS', 'DELETE_PROJECT', 'REMOVE_MEMBER'].includes(previewActionType);
          
          if (!isRisky && previewRes.data?.confirmationToken) {
            try {
              const execRes = await axios.post(endpoints.agent.execute(), {
                userId: userData?.user_id,
                confirmationToken: previewRes.data.confirmationToken,
                idempotencyKey: key,
              });
              syncMemoryFromResponse(execRes.data);
              const okMsg = `Đã thực thi thành công ${execRes.data?.executedAction || 'ACTION'}.`;
              pushMessage('assistant', okMsg);
              speakText('Đã thực thi thành công thao tác.');
              setPreviewResult(null);
            } catch (execErr) {
              const execMsg = execErr?.response?.data?.message || 'Lỗi khi thực thi tự động.';
              pushMessage('assistant', `Preview đã sẵn sàng nhưng thực thi tự động bị lỗi: ${execMsg}`);
            }
          } else {
            const previewMsg = `Đã tạo preview cho lệnh "${message}". Chưa thực thi. Bạn bấm "Mở xác nhận execute" để xem và xác nhận.`;
            pushMessage('assistant', previewMsg);
            speakText(previewMsg);
          }
        } catch (previewError) {
          const msg = previewError?.response?.data?.message || 'Không thể tạo preview tự động.';
          pushMessage('assistant', `Lệnh đã được nhận diện nhưng preview thất bại: ${msg}`);
        } finally {
          setIsPreviewLoading(false);
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
    } finally {
      setIsAnalyzingIntent(false);
    }
  }

  async function onPreview(intent, payload = {}) {
    try {
      const key = `${Date.now()}-${Math.random()}`;
      setIdempotencyKey(key);
      setIsPreviewLoading(true);
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
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function onExecute() {
    if (!previewResult?.confirmationToken) return;
    if (previewMissingRequired.length > 0) {
      Alert.alert('Thiếu dữ liệu', `Preview còn thiếu: ${previewMissingRequired.join(', ')}`);
      return;
    }
    if (isRiskyAction && !riskyConfirmChecked) {
      Alert.alert('Cần xác nhận', 'Vui lòng tick xác nhận trước khi execute thao tác rủi ro.');
      return;
    }
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
      setRiskyConfirmChecked(false);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
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
        {renderContextPill('Sprint', effectiveSprintId)}
        {renderContextPill('Story', effectiveStoryId)}
      </View>

      <View style={styles.contextPickerCard}>
        <Text style={styles.contextPickerTitle}>Context Picker</Text>
        <View style={styles.contextPickerRow}>
          <TextInput style={styles.contextInput} placeholder="Project ID" value={contextProjectId} onChangeText={setContextProjectId} />
          <TextInput style={styles.contextInput} placeholder="Sprint ID" value={contextSprintId} onChangeText={setContextSprintId} />
          <TextInput style={styles.contextInput} placeholder="Story ID" value={contextStoryId} onChangeText={setContextStoryId} />
        </View>
      </View>

      <View style={styles.quickRow}>
        <TouchableOpacity style={styles.quickBtn} onPress={() => setConfirmModalVisible(Boolean(previewResult?.confirmationToken))}>
          <Text style={styles.quickText}>Mở xác nhận execute</Text>
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

      {isAnalyzingIntent ? (
        <View style={styles.intentLoadingBar}>
          <ActivityIndicator size="small" color="#f59e0b" />
          <Text style={styles.intentLoadingText}>AI đang phân tích intent...</Text>
        </View>
      ) : null}

      {isPreviewLoading ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Đang tạo preview...</Text>
          <View style={styles.skeletonLine} />
          <View style={[styles.skeletonLine, { width: '85%' }]} />
          <View style={[styles.skeletonLine, { width: '70%' }]} />
        </View>
      ) : previewResult ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Preview action</Text>
          <Text style={styles.previewLabel}>Action</Text>
          <Text style={styles.previewValue}>{previewActionType || 'N/A'}</Text>
          <Text style={styles.previewLabel}>Payload</Text>
          <Text style={styles.previewJson}>{prettyJson(previewPayload)}</Text>
          {previewMissingRequired.length > 0 ? (
            <Text style={styles.previewError}>Thiếu field bắt buộc: {previewMissingRequired.join(', ')}</Text>
          ) : (
            <Text style={styles.previewOk}>Payload hợp lệ để execute.</Text>
          )}
          {previewResult?.policy?.reason ? (
            <>
              <Text style={styles.previewLabel}>Policy</Text>
              <Text style={styles.previewValue}>{previewResult.policy.reason}</Text>
            </>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
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
            {isRiskyAction ? (
              <View style={styles.riskyBox}>
                <Text style={styles.riskyTitle}>Cảnh báo: thao tác rủi ro</Text>
                <Text style={styles.riskyText}>
                  Action này có thể thay đổi dữ liệu quan trọng. Vui lòng kiểm tra kỹ payload trước khi execute.
                </Text>
                <TouchableOpacity style={styles.riskyCheckRow} onPress={() => setRiskyConfirmChecked((v) => !v)}>
                  <Icon name={riskyConfirmChecked ? 'check-square' : 'square'} size={16} color="#b45309" />
                  <Text style={styles.riskyCheckText}>Tôi đã kiểm tra và muốn tiếp tục.</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
                disabled={!previewResult?.confirmationToken || (isRiskyAction && !riskyConfirmChecked) || previewMissingRequired.length > 0}
              >
                <Text style={styles.executeText}>Execute</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
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
  contextPickerCard: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10 },
  contextPickerTitle: { fontSize: 12, color: '#334155', fontWeight: '700', marginBottom: 8 },
  contextPickerRow: { flexDirection: 'row', gap: 6 },
  contextInput: { flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 12 },
  guideCard: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 10 },
  guideTitle: { color: '#9a3412', fontSize: 12, fontWeight: '700' },
  guideQuestion: { color: '#7c2d12', marginTop: 4, fontSize: 12, fontWeight: '600' },
  guideHint: { color: '#9a3412', marginTop: 4, fontSize: 11 },
  guideExample: { color: '#b45309', fontSize: 11, marginTop: 2 },
  intentLoadingBar: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  intentLoadingText: { color: '#92400e', fontSize: 12, fontWeight: '600' },
  previewCard: { marginHorizontal: 12, marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10 },
  previewTitle: { color: '#0f172a', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  previewLabel: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 6 },
  previewValue: { color: '#1f2937', fontSize: 12, marginTop: 2 },
  previewJson: { color: '#334155', fontSize: 11, marginTop: 2 },
  previewError: { color: '#b91c1c', fontSize: 11, marginTop: 8, fontWeight: '700' },
  previewOk: { color: '#166534', fontSize: 11, marginTop: 8, fontWeight: '700' },
  skeletonLine: { height: 10, borderRadius: 6, backgroundColor: '#e2e8f0', marginTop: 8, width: '100%' },
  messageRow: { maxWidth: '85%', borderRadius: 12, padding: 10, marginBottom: 8 },
  userRow: { backgroundColor: '#ffedd5', alignSelf: 'flex-end' },
  aiRow: { backgroundColor: '#fff', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#e5e7eb' },
  messageText: { color: '#1f2937', fontSize: 13, lineHeight: 18 },
  messagesList: { flex: 1 },
  inputBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  micBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 12, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  modalBody: { color: '#334155', fontSize: 12, lineHeight: 18, maxHeight: 220 },
  riskyBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 10, padding: 10, marginBottom: 10 },
  riskyTitle: { color: '#92400e', fontWeight: '700', fontSize: 12 },
  riskyText: { color: '#b45309', fontSize: 11, marginTop: 4, lineHeight: 16 },
  riskyCheckRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  riskyCheckText: { color: '#92400e', fontSize: 11, fontWeight: '600', flex: 1 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  executeBtn: { backgroundColor: '#16a34a' },
  cancelText: { color: '#334155', fontWeight: '600' },
  executeText: { color: '#fff', fontWeight: '700' },
});
