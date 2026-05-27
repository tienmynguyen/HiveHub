import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import axios from 'axios';
import Svg, { Line, Rect, G, Text as SvgText } from 'react-native-svg';
import { AuthContext } from '../../auth/context/AuthContext';
import { endpoints } from '../../../config/endpoints';

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value || '');
  }
}

function MarkdownText({ text, style }) {
  if (!text) return null;

  const renderInlineStyles = (rawText, keyPrefix) => {
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const cleanBoldText = part.slice(2, -2);
        return (
          <Text key={`${keyPrefix}-bold-${index}`} style={{ fontWeight: '700', color: '#0f172a' }}>
            {cleanBoldText}
          </Text>
        );
      }
      return <Text key={`${keyPrefix}-text-${index}`}>{part}</Text>;
    });
  };

  const lines = String(text).split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, lineIdx) => {
        let trimmed = line.trim();

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s*(.*)$/);
        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          const headerContent = headerMatch[2];
          const fontSize = headerLevel === 1 ? 17 : headerLevel === 2 ? 15 : 13;
          return (
            <Text
              key={`line-${lineIdx}`}
              style={{
                fontSize,
                fontWeight: '700',
                color: '#1e293b',
                marginTop: 6,
                marginBottom: 2,
              }}
            >
              {renderInlineStyles(headerContent, `line-${lineIdx}`)}
            </Text>
          );
        }

        // Bullet point
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletContent = trimmed.slice(2);
          return (
            <View key={`line-${lineIdx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
              <Text style={{ fontSize: 13, color: '#1f2937', marginRight: 6 }}>•</Text>
              <Text style={{ flex: 1, fontSize: 13, color: '#1f2937', lineHeight: 18 }}>
                {renderInlineStyles(bulletContent, `line-${lineIdx}`)}
              </Text>
            </View>
          );
        }

        // Ordinary line
        return (
          <Text key={`line-${lineIdx}`} style={[style, { fontSize: 13, color: '#1f2937', lineHeight: 18 }]}>
            {renderInlineStyles(line, `line-${lineIdx}`)}
          </Text>
        );
      })}
    </View>
  );
}

function ProjectReportDashboard({ data }) {
  const project = data?.project || {};
  const summary = data?.summary || {};
  const sprintStats = data?.sprintStats || [];
  const todayFocus = data?.todayFocus || [];
  const blockedItems = data?.blockedItems || [];

  const totalTasks = summary.taskCount || 0;
  const completedTasks = summary.completedTaskCount || 0;
  const progressPct = totalTasks ? Math.round((completedTasks * 100) / totalTasks) : 0;

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.dashboardHeader}>
        <Icon name="folder-open" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
        <Text style={styles.dashboardProjectName} numberOfLines={1}>
          {project.projectName || 'Dự án'}
        </Text>
        <View style={styles.projectIdBadge}>
          <Text style={styles.projectIdBadgeText}>{project.project_id}</Text>
        </View>
      </View>

      {project.projectDescription ? (
        <Text style={styles.dashboardDesc}>{project.projectDescription}</Text>
      ) : null}

      <View style={styles.progressSection}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Tiến độ dự án</Text>
          <Text style={styles.progressVal}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressSubtext}>
          Đã hoàn thành {completedTasks}/{totalTasks} công việc của {summary.sprintCount || 0} sprints
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{summary.sprintCount || 0}</Text>
          <Text style={styles.statLabel}>Sprints</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{summary.storyCount || 0}</Text>
          <Text style={styles.statLabel}>Stories</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{summary.taskCount || 0}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
      </View>

      {sprintStats.length > 0 ? (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Sơ đồ tiến độ Sprint (%)</Text>
          <View style={styles.svgWrapper}>
            <Svg width="100%" height={130} viewBox="0 0 300 130">
              <Line x1="30" y1="15" x2="280" y2="15" stroke="#e2e8f0" strokeDasharray="3,3" />
              <Line x1="30" y1="55" x2="280" y2="55" stroke="#e2e8f0" strokeDasharray="3,3" />
              <Line x1="30" y1="95" x2="280" y2="95" stroke="#cbd5e1" strokeWidth="1" />
              
              <SvgText x="5" y="18" fontSize="8" fill="#94a3b8" fontWeight="600">100%</SvgText>
              <SvgText x="10" y="58" fontSize="8" fill="#94a3b8" fontWeight="600">50%</SvgText>
              <SvgText x="15" y="98" fontSize="8" fill="#94a3b8" fontWeight="600">0%</SvgText>

              {sprintStats.slice(0, 5).map((sprint, idx) => {
                const limitSprints = sprintStats.slice(0, 5);
                const barWidth = 26;
                const gap = (240 - barWidth * limitSprints.length) / (limitSprints.length + 1);
                const x = 30 + gap + idx * (barWidth + gap);
                const pct = Math.min(100, Math.max(0, sprint.progressPct || 0));
                
                const barHeight = (pct / 100) * 80;
                const y = 95 - barHeight;
                const barColor = pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#3b82f6';

                return (
                  <G key={`bar-${idx}`}>
                    <Rect
                      x={x}
                      y={15}
                      width={barWidth}
                      height={80}
                      rx="3"
                      fill="#f1f5f9"
                    />
                    {barHeight > 0 ? (
                      <Rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={barColor}
                      />
                    ) : null}
                    
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 3}
                      fontSize="8"
                      fill="#475569"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {pct}%
                    </SvgText>

                    <SvgText
                      x={x + barWidth / 2}
                      y="110"
                      fontSize="7"
                      fill="#64748b"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      S{idx + 1}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>Xong (100%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.legendText}>Khá (&gt;=50%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.legendText}>Mới (&lt;50%)</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.detailsSection}>
        <Text style={styles.sectionTitle}>Chi tiết các Sprint</Text>
        {sprintStats.map((sprint, idx) => {
          const isDone = ['DONE', 'COMPLETED'].includes(String(sprint.sprintStatus).toUpperCase());
          const isCurrent = String(sprint.sprintStatus).toUpperCase() === 'IN_PROGRESS';
          
          let statusBg = '#f1f5f9';
          let statusText = '#475569';
          let statusLabel = 'Chưa làm';
          if (isDone) {
            statusBg = '#d1fae5';
            statusText = '#065f46';
            statusLabel = 'Xong';
          } else if (isCurrent) {
            statusBg = '#fef3c7';
            statusText = '#92400e';
            statusLabel = 'Đang chạy';
          }

          return (
            <View key={`sprint-detail-${idx}`} style={styles.sprintRow}>
              <View style={styles.sprintRowHeader}>
                <Text style={styles.sprintNameText} numberOfLines={1}>
                  {sprint.sprintName}
                </Text>
                <View style={[styles.sprintStatusBadge, { backgroundColor: statusBg }]}>
                  <Text style={[styles.sprintStatusBadgeText, { color: statusText }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.sprintProgressRow}>
                <View style={styles.miniBarBg}>
                  <View style={[styles.miniBarFill, { width: `${sprint.progressPct}%` }]} />
                </View>
                <Text style={styles.miniBarText}>{sprint.progressPct}% ({sprint.doneTasks}/{sprint.taskCount} tasks)</Text>
              </View>
            </View>
          );
        })}
      </View>

      {blockedItems.length > 0 ? (
        <View style={styles.blockerCard}>
          <View style={styles.blockerCardHeader}>
            <Icon name="exclamation-triangle" size={10} color="#b91c1c" style={{ marginRight: 6 }} />
            <Text style={styles.blockerCardTitle}>Công việc cần đẩy nhanh ({blockedItems.length})</Text>
          </View>
          {blockedItems.slice(0, 3).map((item, idx) => (
            <Text key={`blocked-${idx}`} style={styles.blockerText} numberOfLines={1}>
              ⚠️ {item.taskName} ({item.taskStatus})
            </Text>
          ))}
        </View>
      ) : null}

      {todayFocus.length > 0 ? (
        <View style={styles.todayCard}>
          <View style={styles.todayCardHeader}>
            <Icon name="bullseye" size={10} color="#0369a1" style={{ marginRight: 6 }} />
            <Text style={styles.todayCardTitle}>Trọng tâm hôm nay ({todayFocus.length})</Text>
          </View>
          {todayFocus.map((item, idx) => (
            <Text key={`today-${idx}`} style={styles.todayText} numberOfLines={1}>
              🎯 {item.taskName}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
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
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingClarification, setPendingClarification] = useState(null);
  const [latestGuide, setLatestGuide] = useState(null);
  const [isAnalyzingIntent, setIsAnalyzingIntent] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [contextProjectId, setContextProjectId] = useState(routeProjectId ? String(routeProjectId) : '');
  const [contextSprintId, setContextSprintId] = useState(routeSprintId ? String(routeSprintId) : '');
  const [contextStoryId, setContextStoryId] = useState(routeStoryId ? String(routeStoryId) : '');
  const [riskyConfirmChecked, setRiskyConfirmChecked] = useState(false);
  const [mode, setMode] = useState('agent'); // 'agent' or 'chatbot'
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
    setContextProjectId('');
    setContextSprintId('');
    setContextStoryId('');
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
      } catch (error) {
        const missing = error?.response?.data?.missingFields;
        if (pendingClarification.retryLeft <= 0) {
          setPendingClarification(null);
          const stopMsg = `Sau 1 lần hỏi bổ sung, vẫn thiếu dữ liệu (${Array.isArray(missing) ? missing.join(', ') : 'không xác định'}). Vui lòng gửi lại lệnh đầy đủ.`;
          pushMessage('assistant', stopMsg);
        } else {
          const askAgain = Array.isArray(missing) ? missing.join(', ') : 'dữ liệu bắt buộc';
          setPendingClarification((prev) => ({ ...prev, retryLeft: prev.retryLeft - 1 }));
          const askMsg = `Mình vẫn thiếu: ${askAgain}. Trả lời 1 lần nữa để mình thực hiện.`;
          pushMessage('assistant', askMsg);
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
        mode,
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
        'REPORT',
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
          const isRisky = ['UPDATE_SPRINT_STATUS', 'DELETE_PROJECT', 'REMOVE_MEMBER', 'REPORT'].includes(previewActionType);
          
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
              setPreviewResult(null);
            } catch (execErr) {
              const execMsg = execErr?.response?.data?.message || 'Lỗi khi thực thi tự động.';
              pushMessage('assistant', `Preview đã sẵn sàng nhưng thực thi tự động bị lỗi: ${execMsg}`);
            }
          } else {
            const previewMsg = previewActionType === 'REPORT'
              ? `Đã tìm thấy dự án phù hợp! Vui lòng bấm "Mở xác nhận execute" để xác nhận mã số dự án.`
              : `Đã tạo preview cho lệnh "${message}". Chưa thực thi. Bạn bấm "Mở xác nhận execute" để xem và xác nhận.`;
            pushMessage('assistant', previewMsg);
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
        setLatestGuide(data?.guide || null);
        setPendingClarification({
          intent: data?.intent,
          basePayload: data?.parsedPayload || {},
          retryLeft: 1,
        });
      } else {
        // Câu hỏi thông thường mới dùng text LLM nguyên bản.
        pushMessage('assistant', data?.answer || 'Mình chưa có câu trả lời phù hợp.');
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
      if (data?.executedAction === 'REPORT') {
        setMessages((prev) => [
          ...prev,
          {
            id: `report-${Date.now()}-${Math.random()}`,
            role: 'assistant',
            text: `Báo cáo tiến độ dự án ${data.entity?.project?.projectName || ''} (${data.entity?.project?.project_id || ''})`,
            reportData: data.entity,
          },
        ]);
      } else {
        const okMsg = `Đã thực thi thành công ${data?.executedAction || 'ACTION'}.`;
        pushMessage('assistant', okMsg);
      }
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
      setMessages((prev) => [
        ...prev,
        {
          id: `report-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          text: `Báo cáo tiến độ dự án ${data?.project?.projectName || ''} (${data?.project?.project_id || ''})`,
          reportData: data,
        },
      ]);
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
        </View>
      </View>

      {/* SEGMENTED CONTROL MODE TOGGLE */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'agent' && styles.activeModeTab]}
          onPress={() => setMode('agent')}
        >
          <Icon name="robot" size={13} color={mode === 'agent' ? '#fff' : '#64748b'} />
          <Text style={[styles.modeTabText, mode === 'agent' && styles.activeModeTabText]}>AI Agent (Thực thi)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, mode === 'chatbot' && styles.activeModeTab]}
          onPress={() => setMode('chatbot')}
        >
          <Icon name="comments" size={13} color={mode === 'chatbot' ? '#fff' : '#64748b'} />
          <Text style={[styles.modeTabText, mode === 'chatbot' && styles.activeModeTabText]}>Chatbot (Tư vấn)</Text>
        </TouchableOpacity>
      </View>

      {mode === 'agent' && (
        <>
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
              <TouchableOpacity
                style={{ position: 'absolute', right: 8, top: 8, padding: 4, zIndex: 10 }}
                onPress={() => setLatestGuide(null)}
              >
                <Icon name="times" size={14} color="#9a3412" />
              </TouchableOpacity>
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
        </>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
        renderItem={({ item }) => (
          <View style={[
            styles.messageRow,
            item.role === 'user' ? styles.userRow : styles.aiRow,
            item.reportData ? { maxWidth: '100%', width: '100%', alignSelf: 'stretch', backgroundColor: '#fff', borderWidth: 0, padding: 0 } : null
          ]}>
            {item.reportData ? (
              <ProjectReportDashboard data={item.reportData} />
            ) : (
              <MarkdownText text={item.text} style={styles.messageText} />
            )}
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
            {previewActionType === 'REPORT' ? (
              <View style={styles.confirmReportBox}>
                <Icon name="chart-bar" size={32} color="#f59e0b" style={{ alignSelf: 'center', marginBottom: 10 }} />
                <Text style={styles.confirmReportText}>Bạn đang yêu cầu xem báo cáo tiến độ cho dự án:</Text>
                <Text style={styles.confirmReportName}>✨ {previewPayload?.projectName || 'Dự án'}</Text>
                <Text style={styles.confirmReportCode}>Mã số: {previewPayload?.projectId || 'N/A'}</Text>
              </View>
            ) : previewResult?.action ? (
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
  modeToggleRow: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 20, marginHorizontal: 12, marginTop: 8, padding: 3 },
  modeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 18, gap: 6 },
  activeModeTab: { backgroundColor: '#f59e0b', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
  modeTabText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  activeModeTabText: { color: '#fff' },

  confirmReportBox: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a', borderRadius: 10, padding: 12, marginBottom: 10 },
  confirmReportText: { color: '#b45309', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  confirmReportName: { color: '#92400e', fontSize: 16, fontWeight: '700', marginTop: 6, textAlign: 'center' },
  confirmReportCode: { color: '#d97706', fontSize: 12, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  // Dashboard styles
  dashboardContainer: { width: '100%', padding: 12, borderRadius: 12, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#e2e8f0' },
  dashboardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dashboardProjectName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },
  projectIdBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#cbd5e1' },
  projectIdBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  dashboardDesc: { fontSize: 11, color: '#64748b', marginBottom: 12, lineHeight: 15 },
  
  progressSection: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  progressVal: { fontSize: 15, fontWeight: '800', color: '#f59e0b' },
  progressBarBg: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 4 },
  progressSubtext: { fontSize: 10, color: '#64748b', marginTop: 6 },
  
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#f8fafc', padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
  statNum: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#64748b', marginTop: 2 },
  
  chartContainer: { backgroundColor: '#ffffff', borderRadius: 8, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 8, fontWeight: '600', color: '#64748b' },
  svgWrapper: { alignItems: 'center', justifyContent: 'center', height: 130 },
  
  detailsSection: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  sprintRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sprintRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sprintNameText: { fontSize: 11, fontWeight: '600', color: '#1e293b', flex: 1, marginRight: 6 },
  sprintStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  sprintStatusBadgeText: { fontSize: 8, fontWeight: '700' },
  sprintProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniBarBg: { flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 2 },
  miniBarText: { fontSize: 8, fontWeight: '600', color: '#64748b' },
  
  blockerCard: { backgroundColor: '#fee2e2', borderLeftWidth: 3, borderLeftColor: '#ef4444', borderRadius: 6, padding: 8, marginBottom: 8 },
  blockerCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  blockerCardTitle: { fontSize: 10, fontWeight: '700', color: '#b91c1c' },
  blockerText: { fontSize: 9, color: '#991b1b', marginTop: 2, fontWeight: '500' },
  
  todayCard: { backgroundColor: '#e0f2fe', borderLeftWidth: 3, borderLeftColor: '#0ea5e9', borderRadius: 6, padding: 8 },
  todayCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  todayCardTitle: { fontSize: 10, fontWeight: '700', color: '#0369a1' },
  todayText: { fontSize: 9, color: '#075985', marginTop: 2, fontWeight: '500' },
});
