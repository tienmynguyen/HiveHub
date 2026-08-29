import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { History, Clock, ArrowRight, User, CheckCircle2, ShieldCheck, Play, RotateCcw } from 'lucide-react';

const statusColors = {
  TODO: '#f43f5e',
  IN_PROGRESS: '#ff9500',
  IN_REVIEW: '#a855f7',
  DONE: '#22c55e',
  APPROVED: '#10b981',
};

const ProjectTaskHistory = ({ projectId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchLogs();
    }
  }, [projectId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gettaskhistory?projectId=${projectId}`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch task history error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={22} color="var(--accent-primary)" />
            Lịch Sử Thay Đổi & Thời Gian Thực Hiện Tác Vụ
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Nhật ký kiểm vết quá trình chuyển trạng thái và tính thời gian làm việc từ "Đang thực hiện" sang "Chờ kiểm duyệt / Done"
          </p>
        </div>

        <button onClick={fetchLogs} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
          <RotateCcw size={14} /> Làm mới
        </button>
      </div>

      {/* History Timeline */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
        {logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            <History size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            Chưa có lịch sử thay đổi trạng thái nào được ghi nhận cho dự án này.
            <br />
            (Kéo thả công việc trên Bảng Kanban hoặc cập nhật trạng thái Task để tạo nhật ký lịch sử!)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative' }}>
            {logs.map((log) => {
              const oldColor = statusColors[log.oldStatus] || 'var(--text-muted)';
              const newColor = statusColors[log.newStatus] || 'var(--accent-primary)';
              const isWorkComplete = log.oldStatus === 'IN_PROGRESS' && (log.newStatus === 'IN_REVIEW' || log.newStatus === 'DONE' || log.newStatus === 'APPROVED');

              return (
                <div
                  key={log.log_id}
                  className="glass-card"
                  style={{
                    padding: '18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `5px solid ${newColor}`,
                  }}
                >
                  {/* Top Log Meta (User + Date) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {log.username ? log.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {log.username}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({log.email || 'Thành viên'})
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleString('vi-VN')}
                    </div>
                  </div>

                  {/* Task Action & Transition */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Tác vụ: <span style={{ color: 'var(--accent-primary)' }}>"{log.taskName}"</span>
                    </div>

                    {/* Status Transition Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-elevated)', color: oldColor }}>
                        {log.oldStatus}
                      </span>
                      <ArrowRight size={14} color="var(--text-muted)" />
                      <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--bg-elevated)', color: newColor }}>
                        {log.newStatus}
                      </span>
                    </div>
                  </div>

                  {/* Execution Duration Highlight Box (When moving from IN_PROGRESS -> IN_REVIEW/DONE) */}
                  {isWorkComplete && log.executionDurationText && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 149, 0, 0.12)',
                        border: '1px solid rgba(255, 149, 0, 0.3)',
                        color: 'var(--accent-primary)',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                      }}
                    >
                      <Clock size={16} />
                      <span>⏱️ Thời gian thực hiện công việc (từ Đang thực hiện ➔ Chờ kiểm duyệt): <strong>{log.executionDurationText}</strong></span>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default ProjectTaskHistory;
