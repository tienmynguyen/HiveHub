import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Calendar, MessageSquare, Send, ShieldCheck, UserCheck, Play, Flag, Clock, Layers, Check } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, task, initialStatus, initialSprintId, projectId, user, onSave, onApprove }) => {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [taskStatus, setTaskStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [sprintId, setSprintId] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [deadline, setDeadline] = useState('');

  // Sprints, Tasks & Members
  const [sprints, setSprints] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);

  // Multi-methodology fields
  const [dependsOnTaskId, setDependsOnTaskId] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [pairUserId, setPairUserId] = useState('');

  // Comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectMembers(projectId);
      fetchProjectSprints(projectId);
      fetchProjectTasks(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (task) {
      setTaskName(task.taskName || '');
      setDescription(task.description || '');
      setTaskStatus(task.taskStatus || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      setSprintId(task.sprint_id ? String(task.sprint_id) : '');
      setDependsOnTaskId(task.dependsOnTaskId ? String(task.dependsOnTaskId) : '');
      setPhaseId(task.phaseId || '');
      setPairUserId(task.pairUserId ? String(task.pairUserId) : '');
      setTimeStart(task.timeStart ? task.timeStart.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setTimeEnd(task.timeEnd ? task.timeEnd.slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setDeadline(task.deadline ? task.deadline.slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

      const assignedIds = Array.isArray(task.assignees) ? task.assignees.map((u) => Number(u.user_id)) : [];
      setSelectedUserIds(assignedIds);
      fetchComments(task.task_id);
    } else {
      setTaskName('');
      setDescription('');
      setTaskStatus(initialStatus || 'TODO');
      setPriority('MEDIUM');
      setSprintId(initialSprintId ? String(initialSprintId) : '');
      setDependsOnTaskId('');
      setPhaseId('');
      setPairUserId('');
      setTimeStart(new Date().toISOString().slice(0, 10));
      setTimeEnd(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setDeadline(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setSelectedUserIds(user ? [Number(user.user_id)] : []);
      setComments([]);
    }
  }, [task, initialStatus, initialSprintId, user]);

  const fetchProjectTasks = async (pId) => {
    try {
      const res = await api.get(`/gettaskbyprojectid?projectId=${pId}`);
      setProjectTasks(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch project tasks error', e);
    }
  };

  const fetchProjectMembers = async (pId) => {
    try {
      const res = await api.get(`/getalluserbyprojectId?projectId=${pId}`);
      setProjectMembers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch project members error', e);
    }
  };

  const fetchProjectSprints = async (pId) => {
    try {
      const res = await api.get(`/getsprintbyprojectid?projectId=${pId}`);
      setSprints(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch project sprints error', e);
    }
  };

  const fetchComments = async (taskId) => {
    try {
      const res = await api.get(`/getallcommentbyTask?taskId=${taskId}`);
      setComments(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleAssignee = async (memberId) => {
    const isAssigned = selectedUserIds.includes(memberId);
    const updatedIds = isAssigned
      ? selectedUserIds.filter((id) => id !== memberId)
      : [...selectedUserIds, memberId];

    setSelectedUserIds(updatedIds);

    if (task?.task_id) {
      try {
        if (isAssigned) {
          await api.post(`/removeusertask?taskId=${task.task_id}&userId=${memberId}&actorId=${user.user_id}`);
        } else {
          await api.post(`/addusertask?taskId=${task.task_id}&userId=${memberId}&actorId=${user.user_id}`);
        }
      } catch (err) {
        console.error('Assignee update error', err);
      }
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    try {
      const res = await api.post(`/postcomment?taskId=${task.task_id}&userId=${user.user_id}`, {
        commmentContent: newComment,
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      console.error('Post comment error', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    setLoading(true);
    try {
      const payload = {
        taskName,
        description,
        taskStatus,
        priority,
        sprint_id: sprintId ? Number(sprintId) : null,
        dependsOnTaskId: dependsOnTaskId ? Number(dependsOnTaskId) : null,
        phaseId: phaseId || null,
        pairUserId: pairUserId ? Number(pairUserId) : null,
        timeStart,
        timeEnd,
        deadline,
      };

      if (task) {
        await api.post(`/updatetask?taskId=${task.task_id}&userId=${user.user_id}`, payload);
      } else {
        const res = await api.post(`/addtask?projectId=${projectId}&ownerId=${user.user_id}`, payload);
        const newTask = res.data;

        if (newTask?.task_id) {
          for (const uid of selectedUserIds) {
            try {
              await api.post(`/addusertask?taskId=${newTask.task_id}&userId=${uid}&actorId=${user.user_id}`);
            } catch (err) {
              console.error('Error assigning user to new task', uid, err);
            }
          }
        }
      }
      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Không thể lưu tác vụ: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isApproved = task?.is_approved || task?.taskStatus === 'APPROVED';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
          <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: '700' }}>
            {task ? 'Chi tiết công việc' : 'Tạo công việc mới'}
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Task Name & Status Banner */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                <input
                  type="text"
                  required
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Tên công việc..."
                  style={{ width: '100%', fontSize: '18px', fontWeight: '700', border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none' }}
                />

                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  style={{ padding: '4px 12px', borderRadius: '999px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '12px', border: 'none', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="IN_REVIEW">IN REVIEW</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>

              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả công việc..."
                style={{ width: '100%', padding: '8px 0', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Waterfall Task Prerequisite Dropdown Selector (Lock Dependency) */}
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
                  🔒 Công việc tiên quyết (Waterfall Prerequisite Task):
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Phải DONE task tiên quyết mới được mở khóa task này</span>
              </div>

              <select
                value={dependsOnTaskId}
                onChange={(e) => setDependsOnTaskId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="">-- Không phụ thuộc công việc nào (Có thể làm ngay) --</option>
                {projectTasks
                  .filter((t) => !task || Number(t.task_id) !== Number(task.task_id))
                  .map((t) => (
                    <option key={t.task_id} value={String(t.task_id)}>
                      Task #{t.task_id}: {t.taskName} ({t.taskStatus})
                    </option>
                  ))}
              </select>
            </div>

            {/* Sprint & Pair Programming Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Sprint Selector */}
              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-primary)' }}>Gán vào Sprint:</span>
                <select
                  value={sprintId}
                  onChange={(e) => setSprintId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">-- Không gán vào Sprint --</option>
                  {sprints.map((s) => (
                    <option key={s.sprint_id} value={String(s.sprint_id)}>
                      {s.sprintName}
                    </option>
                  ))}
                </select>
              </div>

              {/* XP Pair Programmer Selector */}
              <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>🚀 XP Pair Programmer:</span>
                <select
                  value={pairUserId}
                  onChange={(e) => setPairUserId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">-- Chưa gán người ghép cặp --</option>
                  {projectMembers.map((m) => (
                    <option key={m.user_id} value={String(m.user_id)}>
                      {m.username} ({m.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 1: Thời gian */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '4px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                <span>Thời gian</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Play size={18} color="#22c55e" />
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Bắt đầu</div>
                    <input
                      type="date"
                      value={timeStart}
                      onChange={(e) => setTimeStart(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Flag size={18} color="#f43f5e" />
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Kết thúc</div>
                    <input
                      type="date"
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid rgba(255,149,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: '600', fontSize: '13px' }}>
                <Clock size={16} />
                <span>Deadline: {deadline ? new Date(deadline).toLocaleDateString('vi-VN') : '30/11/2025'}</span>
              </div>
            </div>

            {/* Section 2: Người thực hiện (Multi-Assignee Selection List) */}
            <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '4px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                  <span>Phân công người thực hiện ({selectedUserIds.length})</span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bấm để chọn/bỏ chọn thành viên</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {projectMembers.map((m) => {
                  const isSelected = selectedUserIds.includes(Number(m.user_id));
                  return (
                    <div
                      key={m.user_id}
                      onClick={() => toggleAssignee(Number(m.user_id))}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--accent-light)' : 'var(--bg-elevated)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isSelected ? 'var(--accent-primary)' : '#8b5cf6', color: '#fff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {m.username ? m.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {m.username} {Number(m.user_id) === Number(user?.user_id) ? '(Bạn)' : ''}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          color: '#fff',
                        }}
                      >
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Blockchain Audit Banner if task is DONE */}
            {task && (
              <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: isApproved ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-elevated)', border: `1px solid ${isApproved ? '#22c55e' : 'var(--border-color)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck color={isApproved ? '#22c55e' : 'var(--text-muted)'} size={22} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600' }}>
                        {isApproved ? 'Xác thực Proof of Work (Blockchain)' : 'Chờ kiểm duyệt hoàn thành'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {task.txHash ? `TxHash: ${task.txHash.slice(0, 24)}...` : 'Chưa ghi nhận mã giao dịch'}
                      </div>
                    </div>
                  </div>

                  {!isApproved && onApprove && (
                    <button type="button" onClick={() => onApprove(task.task_id)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
                      <UserCheck size={14} /> Phê Duyệt
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Section 3: Thảo luận */}
            {task && (
              <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '4px', height: '16px', background: 'var(--accent-primary)', borderRadius: '2px' }} />
                  <span>Thảo luận ({comments.length})</span>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {comments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', fontStyle: 'italic' }}>
                      <MessageSquare size={32} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
                      Chưa có bình luận nào
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.comment_id} style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>{c.users?.username || 'Thành viên'}</span>
                          <span>{new Date(c.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>{c.commmentContent}</div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Viết bình luận..."
                    style={{ flex: 1, padding: '12px 18px', borderRadius: '999px', background: 'var(--bg-elevated)', border: 'none', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handlePostComment}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      color: '#fff',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(255,149,0,0.3)',
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Đang lưu...' : task ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
