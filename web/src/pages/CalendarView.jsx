import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ShieldCheck } from 'lucide-react';

const CalendarView = () => {
  const { activeProject } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeProject?.project_id) {
      fetchTasks();
    }
  }, [activeProject]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gettaskbyprojectid?projectId=${activeProject.project_id}`);
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch tasks error', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate 7 days for current week timeline matching Image1.jpg
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  const diffToMonday = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  startOfWeek.setDate(diffToMonday);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
      
      {/* Month Navigator Header matching Image1 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800' }}>
            Lịch & Tiến độ Gantt
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {activeProject ? activeProject.projectName : 'Vui lòng chọn dự án'}
          </p>
        </div>

        {/* Month Switcher */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
          <button onClick={handlePrevMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px' }}>
            THÁNG {currentDate.getMonth() + 1} NĂM {currentDate.getFullYear()}
          </span>
          <button onClick={handleNextMonth} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Days Timeline Header (Matching Image1.jpg: T2 24, T3 25, T4 26, T5 27, T6 28, T7 29, CN 30) */}
      <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          {weekDays.map((d, idx) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={idx} style={{ padding: '10px 4px', borderRadius: 'var(--radius-md)', background: isToday ? 'var(--accent-light)' : 'transparent', color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>{dayNames[idx]}</div>
                <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Gantt Bars Timeline for Tasks (Matching Image1.jpg) */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '30px' }}>
              Chưa có công việc nào trong dự án này.
            </div>
          ) : (
            tasks.map((t) => {
              const bg = t.taskStatus === 'DONE' ? 'var(--status-done-bg)' : t.taskStatus === 'IN_PROGRESS' ? 'var(--status-in-progress-bg)' : 'var(--status-todo-bg)';
              const color = t.taskStatus === 'DONE' ? 'var(--status-done-text)' : t.taskStatus === 'IN_PROGRESS' ? 'var(--status-in-progress-text)' : 'var(--status-todo-text)';
              const barColor = t.taskStatus === 'DONE' ? '#22c55e' : t.taskStatus === 'IN_PROGRESS' ? '#ff9500' : '#f43f5e';

              return (
                <div key={t.task_id} style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: bg, borderLeft: `6px solid ${barColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', color: color }}>{t.taskName}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description || 'Không có mô tả'}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {t.deadline && (
                      <span style={{ fontSize: '12px', fontWeight: '600', color: color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {new Date(t.deadline).toLocaleDateString('vi-VN')}
                      </span>
                    )}

                    <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'rgba(255,255,255,0.7)', color: color, fontSize: '12px', fontWeight: '700' }}>
                      {t.taskStatus}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default CalendarView;
