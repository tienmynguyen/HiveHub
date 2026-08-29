import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { Plus } from 'lucide-react';

const columnHeaderColors = {
  TODO: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  IN_REVIEW: '#8b5cf6',
  DONE: '#10b981',
};

const columnTitles = {
  TODO: 'Cần Làm (To Do)',
  IN_PROGRESS: 'Đang Thực Hiện',
  IN_REVIEW: 'Chờ Kiểm Duyệt',
  DONE: 'Hoàn Thành',
};

const KanbanColumn = ({ columnId, tasks, onCardClick, onAddTaskClick, onApproveTask, onDeleteTask, user }) => {
  const accentColor = columnHeaderColors[columnId] || '#6366f1';

  return (
    <div className="kanban-column">
      {/* Column Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: accentColor }} />
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {columnTitles[columnId] || columnId}
          </h3>
          <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: '600' }}>
            {tasks.length}
          </span>
        </div>

        <button
          onClick={() => onAddTaskClick(columnId)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Tạo mới task"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            style={{
              padding: '12px',
              flex: 1,
              overflowY: 'auto',
              transition: 'background-color 0.2s ease',
              background: snapshot.isDraggingOver ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
            }}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.task_id}
                task={task}
                index={index}
                onClick={onCardClick}
                onApprove={onApproveTask}
                onDelete={onDeleteTask}
                user={user}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>
                Thả Task vào đây
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
