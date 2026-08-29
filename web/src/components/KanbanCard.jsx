import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, ShieldCheck, UserCheck, Trash2 } from 'lucide-react';

const statusBadgeClasses = {
  TODO: 'badge-todo',
  IN_PROGRESS: 'badge-in_progress',
  IN_REVIEW: 'badge-in_review',
  DONE: 'badge-done',
  APPROVED: 'badge-done',
};

const statusLabels = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  APPROVED: 'Approved',
};

const statusAccentClasses = {
  TODO: 'task-card-accent-todo',
  IN_PROGRESS: 'task-card-accent-in_progress',
  IN_REVIEW: 'task-card-accent-in_review',
  DONE: 'task-card-accent-done',
  APPROVED: 'task-card-accent-done',
};

const KanbanCard = ({ task, index, onClick, onApprove, onDelete, user }) => {
  const isApproved = task.is_approved || task.taskStatus === 'APPROVED';
  const statusKey = isApproved ? 'APPROVED' : (task.taskStatus || 'TODO');
  const accentClass = statusAccentClasses[statusKey] || 'task-card-accent-todo';
  const badgeClass = statusBadgeClasses[statusKey] || 'badge-todo';
  const badgeLabel = statusLabels[statusKey] || 'To Do';

  return (
    <Draggable draggableId={String(task.task_id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`glass-card ${accentClass} ${snapshot.isDragging ? 'kanban-card-dragging' : ''}`}
          style={{
            padding: '16px',
            marginBottom: '12px',
            cursor: 'pointer',
            position: 'relative',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            ...provided.draggableProps.style,
          }}
        >
          {/* Card Top: Title & Status Badge Pill (Matching Image1 & Image5) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.4' }}>
              {task.taskName}
            </h4>

            <span className={badgeClass} style={{ flexShrink: 0 }}>
              {badgeLabel}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {task.description}
            </p>
          )}

          {/* Footer Metadata (Date + Assignees + PoW + Actions) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {task.deadline && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                  <Calendar size={13} color="var(--accent-primary)" />
                  <span>{new Date(task.deadline).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</span>
                </div>
              )}

              {isApproved && (
                <span title="Đã duyệt & Ghi nhận trên Blockchain" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                  <ShieldCheck size={13} /> PoW
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Assignees Avatars Overlapping */}
              {task.assignees && task.assignees.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {task.assignees.map((u, i) => (
                    <div
                      key={u.user_id || i}
                      title={u.username || u.email}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: i % 2 === 0 ? 'var(--accent-primary)' : '#8b5cf6',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid var(--bg-card)',
                        marginLeft: i > 0 ? '-8px' : '0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Approve button if task is DONE but not yet approved */}
              {task.taskStatus === 'DONE' && !isApproved && onApprove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(task.task_id);
                  }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <UserCheck size={12} /> Duyệt
                </button>
              )}

              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.task_id);
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  title="Xóa Task"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
