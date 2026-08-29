import React, { useState, useEffect } from 'react';
import api from '../services/api';
import TaskModal from './TaskModal';
import { Lock, Unlock, ArrowDown, CheckCircle2, AlertTriangle, Layers, Plus, Clock } from 'lucide-react';

const WaterfallDependencyView = ({ projectId, user }) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected task modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resTasks, resProjects] = await Promise.all([
        api.get(`/gettaskbyprojectid?projectId=${projectId}`),
        api.get(`/getprjectbyuserId?userId=${user.user_id}`),
      ]);

      const tList = Array.isArray(resTasks.data) ? resTasks.data : [];
      setTasks(tList);

      const pList = Array.isArray(resProjects.data) ? resProjects.data : [];
      const foundP = pList.find((p) => String(p.project_id) === String(projectId));
      setProject(foundP || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (t) => {
    setSelectedTask(t);
    setIsModalOpen(true);
  };

  const phases = project?.phases || [
    { phase_id: 'P1', name: '1. Yêu Cầu & Phân Tích', status: 'IN_PROGRESS', order: 1 },
    { phase_id: 'P2', name: '2. Thiết Kế Hệ Thống', status: 'TODO', order: 2 },
    { phase_id: 'P3', name: '3. Phát Triển & Lập Trình', status: 'TODO', order: 3 },
    { phase_id: 'P4', name: '4. Kiểm Thử (QA / UAT)', status: 'TODO', order: 4 },
    { phase_id: 'P5', name: '5. Nghiệm Thu & Blockchain PoW', status: 'TODO', order: 5 },
  ];

  // Helper to check if task is locked
  const getTaskLockStatus = (t) => {
    if (!t.dependsOnTaskId) return { isLocked: false, prereqTask: null };
    const prereq = tasks.find((item) => Number(item.task_id) === Number(t.dependsOnTaskId));
    if (!prereq) return { isLocked: false, prereqTask: null };

    const isPrereqDone = prereq.taskStatus === 'DONE' || prereq.taskStatus === 'APPROVED' || prereq.is_approved;
    return {
      isLocked: !isPrereqDone,
      prereqTask: prereq,
    };
  };

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={24} color="#3b82f6" />
            Quản Lý Tuần Tự & Ràng Buộc Phụ Thuộc (Waterfall Flow)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Mô hình Waterfall yêu cầu hoàn thành các công việc tiên quyết trước khi mở khóa tác vụ tiếp theo
          </p>
        </div>

        <button onClick={() => { setSelectedTask(null); setIsModalOpen(true); }} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
          <Plus size={16} /> Thêm Task Waterfall
        </button>
      </div>

      {/* Waterfall Phases Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {phases.map((phase, pIdx) => {
          const phaseTasks = tasks.filter((t) => String(t.phaseId || '') === String(phase.phase_id));

          return (
            <div key={phase.phase_id || pIdx} className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', borderLeft: '5px solid #3b82f6' }}>
              
              {/* Phase Banner Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', color: '#fff', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pIdx + 1}
                  </span>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {phase.name}
                  </h3>
                </div>

                <span style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '4px 12px', borderRadius: '999px' }}>
                  {phaseTasks.length} task trong giai đoạn này
                </span>
              </div>

              {/* Tasks List in Phase */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {phaseTasks.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '12px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                    Chưa có công việc nào thuộc giai đoạn này.
                  </div>
                ) : (
                  phaseTasks.map((t) => {
                    const { isLocked, prereqTask } = getTaskLockStatus(t);
                    const isDone = t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved;

                    return (
                      <div
                        key={t.task_id}
                        onClick={() => handleTaskClick(t)}
                        className="glass-card"
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'space-between',
                          borderRadius: 'var(--radius-md)',
                          border: isLocked ? '1px solid #f43f5e' : isDone ? '1px solid #22c55e' : '1px solid var(--border-color)',
                          background: isLocked ? 'rgba(244, 63, 94, 0.05)' : 'var(--bg-card)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Lock / Unlock Icon */}
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: isLocked ? 'rgba(244, 63, 94, 0.15)' : isDone ? 'rgba(34, 197, 94, 0.15)' : 'var(--accent-light)',
                              color: isLocked ? '#f43f5e' : isDone ? '#22c55e' : 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {isLocked ? <Lock size={20} /> : isDone ? <CheckCircle2 size={20} /> : <Unlock size={20} />}
                          </div>

                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{t.taskName}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(#{t.task_id})</span>
                            </div>

                            {/* Prerequisite Info Line */}
                            {t.dependsOnTaskId && (
                              <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isLocked ? (
                                  <span style={{ color: '#f43f5e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertTriangle size={13} />
                                    Bị khóa: Yêu cầu hoàn thành Task tiên quyết #{t.dependsOnTaskId} "{prereqTask?.taskName || 'Prereq'}" trước
                                  </span>
                                ) : (
                                  <span style={{ color: '#22c55e', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CheckCircle2 size={13} />
                                    Đã đủ điều kiện (Task tiên quyết #{t.dependsOnTaskId} đã xong)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`badge-${(t.taskStatus || 'todo').toLowerCase()}`}>
                            {t.taskStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Down Arrow between phases */}
              {pIdx < phases.length - 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                  <ArrowDown size={20} color="#3b82f6" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Task Modal */}
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

export default WaterfallDependencyView;
