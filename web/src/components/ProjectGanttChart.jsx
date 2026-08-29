import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InteractiveGanttChart from './InteractiveGanttChart';
import TaskModal from './TaskModal';
import { Calendar, Clock, Filter, ShieldCheck, User } from 'lucide-react';

const ProjectGanttChart = ({ projectId, user }) => {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Selected task modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (projectId && user) {
      fetchData();
    }
  }, [projectId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTasks, resMembers, resRole] = await Promise.all([
        api.get(`/gettaskbyprojectid?projectId=${projectId}`),
        api.get(`/getalluserbyprojectId?projectId=${projectId}`),
        api.get(`/findroleinuspr?projectId=${projectId}&userId=${user.user_id}`),
      ]);

      setTasks(Array.isArray(resTasks.data) ? resTasks.data : []);
      setMembers(Array.isArray(resMembers.data) ? resMembers.data : []);
      const role = Number(resRole.data?.roleId || 1);
      setUserRole(role);

      if (role === 1) {
        setSelectedMemberId(String(user.user_id));
      } else {
        setSelectedMemberId('ALL');
      }
    } catch (e) {
      console.error('Fetch Gantt data error', e);
    } finally {
      setLoading(false);
    }
  };

  const isOwnerOrManager = userRole === 2 || userRole === 3;

  const filteredTasks = tasks.filter((t) => {
    if (selectedMemberId === 'ALL') {
      return true;
    }
    const assignees = t.assignees || [];
    return assignees.some((u) => String(u.user_id) === String(selectedMemberId));
  });

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Member Permission Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} color="var(--accent-primary)" />
            Biểu Đồ Gantt Phân Công Nhiệm Vụ
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isOwnerOrManager ? 'Quyền Quản trị/Owner: Đang xem toàn bộ thành viên dự án' : 'Quyền Member: Hiển thị danh sách công việc được phân công'}
          </p>
        </div>

        {/* Member Selector Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Xem theo thành viên:</span>

          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={!isOwnerOrManager && selectedMemberId !== 'ALL'}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: '700',
              fontSize: '13px',
              outline: 'none',
              cursor: isOwnerOrManager ? 'pointer' : 'not-allowed',
            }}
          >
            {isOwnerOrManager && <option value="ALL">-- Tất cả thành viên ({members.length}) --</option>}
            {members.map((m) => (
              <option key={m.user_id} value={String(m.user_id)}>
                {m.username} {Number(m.user_id) === Number(user.user_id) ? '(Bạn)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Visual Interactive Gantt Timeline Chart matching Image1.jpg */}
      <InteractiveGanttChart tasks={filteredTasks} onTaskClick={handleTaskClick} />

      {/* Detailed Tasks Gantt Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', fontWeight: '700', fontSize: '15px' }}>
          Chi Tiết Thời Gian Thực Hiện Các Tác Vụ
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: '700' }}>
                <th style={{ padding: '14px 20px', width: '220px' }}>Thành Viên Phụ Trách</th>
                <th style={{ padding: '14px 20px' }}>Tên Công Việc</th>
                <th style={{ padding: '14px 20px', width: '130px' }}>Trạng Thái</th>
                <th style={{ padding: '14px 20px', width: '130px' }}>Bắt Đầu</th>
                <th style={{ padding: '14px 20px', width: '130px' }}>Deadline</th>
                <th style={{ padding: '14px 20px', width: '160px' }}>Thời Gian Thực Hiện</th>
                <th style={{ padding: '14px 20px', width: '220px' }}>Tiến Độ Gantt</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Không có công việc nào theo điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t) => {
                  const assignees = t.assignees || [];
                  const isDone = t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved;
                  const isInProgress = t.taskStatus === 'IN_PROGRESS';
                  const isInReview = t.taskStatus === 'IN_REVIEW';

                  const barColor = isDone ? '#22c55e' : isInReview ? '#a855f7' : isInProgress ? '#ff9500' : '#f43f5e';
                  const barWidth = isDone ? '100%' : isInReview ? '80%' : isInProgress ? '50%' : '15%';

                  return (
                    <tr key={t.task_id} style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                      
                      {/* Assignees */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {assignees.map((u, i) => (
                              <div
                                key={u.user_id || i}
                                title={u.username || u.email}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  background: i % 2 === 0 ? 'var(--accent-primary)' : '#8b5cf6',
                                  color: '#fff',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid var(--bg-card)',
                                  marginLeft: i > 0 ? '-8px' : '0',
                                }}
                              >
                                {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                              </div>
                            ))}
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {assignees.map((u) => u.username).join(', ') || 'Chưa gán'}
                          </span>
                        </div>
                      </td>

                      {/* Task Name */}
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => handleTaskClick(t)}>
                        {t.taskName}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: '700',
                            background: isDone ? 'var(--status-done-bg)' : isInProgress ? 'var(--status-in-progress-bg)' : isInReview ? 'var(--status-in-review-bg)' : 'var(--status-todo-bg)',
                            color: isDone ? 'var(--status-done-text)' : isInProgress ? 'var(--status-in-progress-text)' : isInReview ? 'var(--status-in-review-text)' : 'var(--status-todo-text)',
                          }}
                        >
                          {t.taskStatus}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)' }}>
                        {t.timeStart ? new Date(t.timeStart).toLocaleDateString('vi-VN') : '--/--'}
                      </td>

                      {/* Deadline */}
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: '600' }}>
                        {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '--/--'}
                      </td>

                      {/* Execution Duration */}
                      <td style={{ padding: '14px 20px' }}>
                        {t.executionDurationText ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: '700', fontSize: '12px' }}>
                            <Clock size={12} /> {t.executionDurationText}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa ghi nhận</span>
                        )}
                      </td>

                      {/* Visual Gantt Bar */}
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ width: '100%', height: '10px', background: 'var(--bg-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ width: barWidth, height: '100%', background: barColor, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Modal when clicking any Gantt bar */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        projectId={projectId}
        user={user}
        onSave={fetchData}
      />

    </div>
  );
};

export default ProjectGanttChart;
