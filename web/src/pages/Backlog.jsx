import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import TaskModal from '../components/TaskModal';
import { Plus, Layers, PlayCircle, Clock, Calendar, CheckCircle2, ChevronRight, X, ArrowRight, Inbox } from 'lucide-react';

const Backlog = () => {
  const { activeProject, user } = useAuth();
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [targetSprintId, setTargetSprintId] = useState(null);

  // Create Sprint Modal State
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [timeStart, setTimeStart] = useState(new Date().toISOString().slice(0, 10));
  const [timeEnd, setTimeEnd] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (activeProject?.project_id) {
      fetchScrumData();
    }
  }, [activeProject]);

  const fetchScrumData = async () => {
    setLoading(true);
    try {
      const [sprintRes, storyRes, taskRes] = await Promise.all([
        api.get(`/getsprintbyprojectid?projectId=${activeProject.project_id}`),
        api.get(`/getstorybyprojectid?projectId=${activeProject.project_id}`),
        api.get(`/gettaskbyprojectid?projectId=${activeProject.project_id}`),
      ]);

      setSprints(Array.isArray(sprintRes.data) ? sprintRes.data : []);
      setStories(Array.isArray(storyRes.data) ? storyRes.data : []);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    if (!sprintName.trim() || !user || !activeProject) return;
    setCreateLoading(true);
    try {
      await api.post(`/addsprint?projectId=${activeProject.project_id}&actorId=${user.user_id}`, {
        sprintName,
        sprintGoal,
        timeStart,
        timeEnd,
      });

      setSprintName('');
      setSprintGoal('');
      setIsSprintModalOpen(false);
      fetchScrumData();
    } catch (err) {
      console.error(err);
      alert('Không thể tạo Sprint: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleAddTaskToSprint = (sprint_id) => {
    setSelectedTask(null);
    setTargetSprintId(sprint_id);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setSelectedTask(task);
    setTargetSprintId(task.sprint_id);
    setIsTaskModalOpen(true);
  };

  const handleMoveTaskToSprint = async (taskId, newSprintId) => {
    try {
      await api.post(`/updatetask?taskId=${taskId}&userId=${user.user_id}`, {
        sprint_id: newSprintId ? Number(newSprintId) : null,
      });
      fetchScrumData();
    } catch (err) {
      alert('Không thể chuyển Sprint: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!activeProject) {
    return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Vui lòng chọn dự án để xem Kế Hoạch Agile</div>;
  }

  // Create story map to find story's sprint_id as fallback
  const storySprintMap = stories.reduce((acc, st) => {
    acc[String(st.story_id)] = st.sprint_id;
    return acc;
  }, {});

  // Helper to determine which sprint a task belongs to
  const getTaskSprintId = (t) => {
    if (t.sprint_id || t.sprintId) return Number(t.sprint_id || t.sprintId);
    if (t.story_id && storySprintMap[String(t.story_id)]) {
      return Number(storySprintMap[String(t.story_id)]);
    }
    return null;
  };

  // Valid sprint IDs set
  const validSprintIds = new Set(sprints.map((s) => Number(s.sprint_id)));

  // Tasks assigned to valid sprints
  const sprintTaskMap = {};
  sprints.forEach((s) => {
    sprintTaskMap[Number(s.sprint_id)] = [];
  });

  // Backlog tasks (not assigned to any valid sprint)
  const backlogTasks = [];

  tasks.forEach((t) => {
    const sId = getTaskSprintId(t);
    if (sId && validSprintIds.has(sId)) {
      if (!sprintTaskMap[sId]) sprintTaskMap[sId] = [];
      sprintTaskMap[sId].push(t);
    } else {
      backlogTasks.push(t);
    }
  });

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={26} color="var(--accent-primary)" />
            Kế Hoạch Agile & Quản Lý Sprints ({sprints.length})
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý các chu kỳ Sprint, User Stories và phân công công việc từ Backlog vào từng Sprint
          </p>
        </div>

        <button onClick={() => setIsSprintModalOpen(true)} className="btn-primary" style={{ padding: '10px 18px' }}>
          <Plus size={18} />
          Tạo Sprint Mới
        </button>
      </div>

      {/* Sprints List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {sprints.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', borderRadius: 'var(--radius-lg)' }}>
            Chưa có Sprint nào trong dự án này. Bấm nút "Tạo Sprint Mới" ở trên để bắt đầu lập kế hoạch!
          </div>
        ) : (
          sprints.map((sprint) => {
            const sprintTasks = sprintTaskMap[Number(sprint.sprint_id)] || [];
            const completedCount = sprintTasks.filter((t) => t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved).length;

            return (
              <div key={sprint.sprint_id} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                {/* Sprint Header Banner */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <PlayCircle size={24} color="var(--accent-primary)" />
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {sprint.sprintName}
                      </h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Mục tiêu: {sprint.sprintGoal || 'Chưa đặt mục tiêu'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', padding: '4px 12px', borderRadius: '999px', background: 'var(--accent-light)' }}>
                      {sprintTasks.length} task ({completedCount} xong)
                    </span>

                    <button
                      onClick={() => handleAddTaskToSprint(sprint.sprint_id)}
                      className="btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      <Plus size={14} /> Thêm Task vào Sprint
                    </button>
                  </div>
                </div>

                {/* Tasks List inside Sprint */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                  {sprintTasks.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                      Chưa có công việc nào trong Sprint này. Bấm nút "+ Thêm Task vào Sprint" hoặc chọn chuyển task từ Backlog bên dưới!
                    </div>
                  ) : (
                    sprintTasks.map((t) => (
                      <div
                        key={t.task_id}
                        className="glass-card"
                        style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleEditTask(t)}>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.taskName}</div>
                          {t.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description}</div>}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Move to another Sprint or Backlog dropdown */}
                          <select
                            value={String(sprint.sprint_id)}
                            onChange={(e) => handleMoveTaskToSprint(t.task_id, e.target.value)}
                            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value={String(sprint.sprint_id)}>📍 {sprint.sprintName}</option>
                            <option value="">📥 Chuyển về Backlog</option>
                            {sprints.filter((s) => s.sprint_id !== sprint.sprint_id).map((s) => (
                              <option key={s.sprint_id} value={String(s.sprint_id)}>Chuyển sang: {s.sprintName}</option>
                            ))}
                          </select>

                          <span className={`badge-${(t.taskStatus || 'todo').toLowerCase()}`}>
                            {t.taskStatus}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Backlog Unassigned Tasks Section */}
      <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border-color)', background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Inbox size={22} color="var(--text-muted)" />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                Hàng Đợi Backlog (Công việc chưa phân vào Sprint)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {backlogTasks.length} task đang chờ được sắp xếp vào các Sprint
              </p>
            </div>
          </div>

          <button onClick={() => handleAddTaskToSprint(null)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
            <Plus size={14} /> Tạo Task Backlog
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {backlogTasks.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              Tất cả các công việc đã được phân vào các Sprint!
            </div>
          ) : (
            backlogTasks.map((t) => (
              <div key={t.task_id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleEditTask(t)}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{t.taskName}</div>
                  {t.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.description}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {/* Select Sprint to move task directly into Sprint */}
                  <select
                    value=""
                    onChange={(e) => handleMoveTaskToSprint(t.task_id, e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', fontWeight: '700', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="">➕ Chọn Sprint để giao...</option>
                    {sprints.map((s) => (
                      <option key={s.sprint_id} value={String(s.sprint_id)}>
                        👉 Giao vào: {s.sprintName}
                      </option>
                    ))}
                  </select>

                  <span className={`badge-${(t.taskStatus || 'todo').toLowerCase()}`}>
                    {t.taskStatus}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        initialSprintId={targetSprintId}
        projectId={activeProject.project_id}
        user={user}
        onSave={fetchScrumData}
      />

      {/* Modal Tạo Sprint Mới */}
      {isSprintModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlayCircle size={22} color="var(--accent-primary)" />
                <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800' }}>Tạo Sprint Mới</h2>
              </div>
              <button onClick={() => setIsSprintModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSprint} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Tên Sprint:
                </label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="Ví dụ: Sprint 1 - Core Web Features"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Mục tiêu Sprint (Sprint Goal):
                </label>
                <input
                  type="text"
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Hoàn thiện tính năng kéo thả & chat real-time"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Ngày bắt đầu:
                  </label>
                  <input
                    type="date"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    Ngày kết thúc:
                  </label>
                  <input
                    type="date"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsSprintModalOpen(false)} className="btn-secondary">Hủy</button>
                <button type="submit" disabled={createLoading} className="btn-primary">
                  {createLoading ? 'Đang tạo...' : 'Tạo Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Backlog;
