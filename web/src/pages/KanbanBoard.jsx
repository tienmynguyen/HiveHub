import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import socket, { joinProjectRoom } from '../services/socket';
import KanbanColumn from '../components/KanbanColumn';
import TaskModal from '../components/TaskModal';
import confetti from 'canvas-confetti';
import { Plus, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';

const COLUMN_KEYS = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

const KanbanBoard = () => {
  const { activeProject, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [initialStatus, setInitialStatus] = useState('TODO');

  useEffect(() => {
    if (activeProject?.project_id) {
      fetchBoardData();
      joinProjectRoom(activeProject.project_id);
    } else {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    // Socket.IO real-time listener for task updates
    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask && String(updatedTask.project_id) === String(activeProject?.project_id)) {
        setTasks((prevTasks) => {
          const idx = prevTasks.findIndex((t) => Number(t.task_id) === Number(updatedTask.task_id));
          if (idx >= 0) {
            const copy = [...prevTasks];
            copy[idx] = { ...copy[idx], ...updatedTask };
            return copy;
          } else {
            return [...prevTasks, updatedTask];
          }
        });
      }
    };

    socket.on('task_updated', handleTaskUpdated);
    socket.on('subtask_created', handleTaskUpdated);
    socket.on('subtask_status_changed', handleTaskUpdated);

    return () => {
      socket.off('task_updated', handleTaskUpdated);
      socket.off('subtask_created', handleTaskUpdated);
      socket.off('subtask_status_changed', handleTaskUpdated);
    };
  }, [activeProject]);

  const fetchBoardData = async () => {
    if (!activeProject?.project_id) return;
    setLoading(true);
    try {
      // Fetch tasks
      const taskRes = await api.get(`/gettaskbyprojectid?projectId=${activeProject.project_id}`);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);

      // Fetch sprints
      const sprintRes = await api.get(`/getsprintbyprojectid?projectId=${activeProject.project_id}`);
      setSprints(Array.isArray(sprintRes.data) ? sprintRes.data : []);
    } catch (err) {
      console.error('Error fetching board data', err);
    } finally {
      setLoading(false);
    }
  };

  // Drag & Drop Handler
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    // Dropped outside or in same position
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = Number(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic UI update
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.task_id === taskId ? { ...t, taskStatus: newStatus } : t))
    );

    // Confetti celebration when task is moved to DONE
    if (newStatus === 'DONE' && source.droppableId !== 'DONE') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }

    try {
      // API call to update task status in backend
      const updatedTaskRes = await api.post(`/updatetask?taskId=${taskId}&userId=${user.user_id}`, {
        taskStatus: newStatus,
      });

      // Emit socket event to sync with other clients
      socket.emit('update_subtask_status', {
        taskId,
        taskStatus: newStatus,
        projectId: activeProject.project_id,
        userId: user.user_id,
      });
    } catch (err) {
      console.error('Failed to update task status', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái tác vụ');
      fetchBoardData();
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      const res = await api.post('/approvetask', {
        taskId,
        adminId: user.user_id,
        userId: user.user_id,
        note: 'Duyệt hoàn thành từ Web Dashboard',
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === taskId
            ? { ...t, is_approved: true, taskStatus: 'APPROVED', txHash: res.data.txHash }
            : t
        )
      );

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    } catch (err) {
      alert('Lỗi phê duyệt: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tác vụ này?')) return;
    try {
      await api.delete(`/deletetask?taskId=${taskId}&userId=${user.user_id}`);
      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    } catch (err) {
      alert('Không thể xóa: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedSprint !== 'ALL' && String(t.sprint_id) !== String(selectedSprint)) return false;
    if (priorityFilter !== 'ALL' && (t.priority || 'MEDIUM') !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.taskName?.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  if (!activeProject) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertCircle size={48} style={{ margin: '0 auto 16px auto', color: 'var(--accent-primary)' }} />
        <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Chưa chọn hoặc chưa có Dự Án</h2>
        <p style={{ fontSize: '14px', marginBottom: '20px' }}>Vui lòng chọn dự án ở thanh trên cùng hoặc bấm nút dưới đây để tạo dự án mới.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Board Header & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800' }}>
            Bảng Kanban - {activeProject.projectName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Kéo thả tác vụ giữa các cột để cập nhật tiến độ thời gian thực
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm tác vụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                width: '200px',
              }}
            />
          </div>

          {/* Sprint Filter */}
          <select
            value={selectedSprint}
            onChange={(e) => setSelectedSprint(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">Tất cả Sprint</option>
            {sprints.map((s) => (
              <option key={s.sprint_id} value={s.sprint_id}>
                {s.sprintName || `Sprint ${s.sprint_id}`}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="ALL">Mọi Ưu Tiên</option>
            <option value="HIGH">Ưu tiên Cao</option>
            <option value="MEDIUM">Trung Bình</option>
            <option value="LOW">Ưu tiên Thấp</option>
          </select>

          <button onClick={fetchBoardData} className="btn-secondary" style={{ padding: '8px 12px' }} title="Làm mới">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              setSelectedTask(null);
              setInitialStatus('TODO');
              setIsModalOpen(true);
            }}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} /> Tạo Tác Vụ Mới
          </button>
        </div>
      </div>

      {/* Kanban Drag and Drop Context */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', flex: 1, paddingBottom: '10px' }}>
          {COLUMN_KEYS.map((key) => {
            const colTasks = filteredTasks.filter((t) => {
              if (key === 'DONE') return t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved;
              return t.taskStatus === key;
            });

            return (
              <KanbanColumn
                key={key}
                columnId={key}
                tasks={colTasks}
                onCardClick={(task) => {
                  setSelectedTask(task);
                  setIsModalOpen(true);
                }}
                onAddTaskClick={(statusKey) => {
                  setSelectedTask(null);
                  setInitialStatus(statusKey);
                  setIsModalOpen(true);
                }}
                onApproveTask={handleApproveTask}
                onDeleteTask={handleDeleteTask}
                user={user}
              />
            );
          })}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        initialStatus={initialStatus}
        projectId={activeProject.project_id}
        user={user}
        onSave={fetchBoardData}
        onApprove={handleApproveTask}
      />
    </div>
  );
};

export default KanbanBoard;
