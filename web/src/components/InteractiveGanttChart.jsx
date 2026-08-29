import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, User, Calendar } from 'lucide-react';

const statusColors = {
  TODO: { bg: '#ffaa8a', text: '#ffffff', border: '#e86a42' },
  IN_PROGRESS: { bg: '#93c5fd', text: '#ffffff', border: '#3b82f6' },
  IN_REVIEW: { bg: '#d8b4fe', text: '#ffffff', border: '#a855f7' },
  DONE: { bg: '#86efac', text: '#ffffff', border: '#22c55e' },
  APPROVED: { bg: '#86efac', text: '#ffffff', border: '#10b981' },
};

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const InteractiveGanttChart = ({ tasks = [], onTaskClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const rangeStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const rangeEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // Generate date array for the selected month
  const dateArray = useMemo(() => {
    const arr = [];
    for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const cellWidth = 52; // Width of each day column in pixels

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      
      {/* Header Month Switcher matching Image1.jpg (< THÁNG 11 NĂM 2025 >) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
        <button
          onClick={handlePrevMonth}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
        >
          <ChevronLeft size={20} color="var(--text-primary)" />
        </button>

        <h3 className="font-heading" style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          THÁNG {currentMonth.getMonth() + 1} NĂM {currentMonth.getFullYear()}
        </h3>

        <button
          onClick={handleNextMonth}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          }}
        >
          <ChevronRight size={20} color="var(--text-primary)" />
        </button>
      </div>

      {/* Scrollable Gantt Timeline View */}
      <div style={{ overflowX: 'auto', position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)' }}>
        
        {/* Dates Column Header Row matching Image1.jpg (T2 24, T3 25, T4 26, T5 27, T6 28, T7 29, CN 30) */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
          {dateArray.map((d, i) => {
            const dateStr = d.toISOString().slice(0, 10);
            const isToday = dateStr === todayStr;
            const isSunday = d.getDay() === 0;
            const dayName = dayNames[d.getDay()];

            return (
              <div
                key={i}
                style={{
                  width: `${cellWidth}px`,
                  minWidth: `${cellWidth}px`,
                  padding: '10px 4px',
                  textAlign: 'center',
                  borderRight: '1px solid var(--border-color)',
                  background: isSunday ? 'rgba(34, 197, 94, 0.12)' : isToday ? 'var(--accent-light)' : 'transparent',
                  color: isSunday ? '#15803d' : isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontWeight: isSunday || isToday ? '800' : '600',
                }}
              >
                <div style={{ fontSize: '11px', color: isSunday ? '#15803d' : 'var(--text-muted)' }}>{dayName}</div>
                <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '2px' }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Tasks Horizontal Bars Body Area */}
        <div style={{ minHeight: '260px', padding: '16px 0', position: 'relative', background: 'var(--bg-secondary)' }}>
          
          {/* Vertical Grid Lines & Today Green Line matching Image1.jpg */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
            {dateArray.map((d, i) => {
              const dateStr = d.toISOString().slice(0, 10);
              const isToday = dateStr === todayStr;
              const isSunday = d.getDay() === 0;

              return (
                <div
                  key={i}
                  style={{
                    width: `${cellWidth}px`,
                    minWidth: `${cellWidth}px`,
                    borderRight: isToday ? '3px solid #16a34a' : '1px dashed var(--border-color)',
                    background: isSunday ? 'rgba(34, 197, 94, 0.05)' : 'transparent',
                    height: '100%',
                  }}
                />
              );
            })}
          </div>

          {/* Render Horizontal Gantt Pill Bars */}
          {tasks.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', position: 'relative', zIndex: 2 }}>
              Không có công việc nào trong tháng này.
            </div>
          ) : (
            tasks.map((t, idx) => {
              const startDate = t.timeStart ? new Date(t.timeStart) : (t.deadline ? new Date(t.deadline) : rangeStart);
              const endDate = t.deadline ? new Date(t.deadline) : new Date(startDate.getTime() + 2 * 86400000);

              // Calculate start day index in current month array
              const startDayIdx = Math.max(0, Math.floor((startDate.getTime() - rangeStart.getTime()) / 86400000));
              const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);

              const leftPx = startDayIdx * cellWidth;
              const widthPx = Math.max(cellWidth, durationDays * cellWidth - 8);

              const colors = statusColors[t.taskStatus] || statusColors.TODO;

              return (
                <div
                  key={t.task_id || idx}
                  onClick={() => onTaskClick && onTaskClick(t)}
                  style={{
                    position: 'relative',
                    zIndex: 10,
                    marginLeft: `${leftPx + 4}px`,
                    width: `${widthPx}px`,
                    marginBottom: '12px',
                    height: '38px',
                    borderRadius: '16px',
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    fontSize: '13px',
                    fontWeight: '700',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'transform 0.15s ease',
                  }}
                  title={`${t.taskName} (${t.taskStatus}) - Bắt đầu: ${startDate.toLocaleDateString('vi-VN')} - Deadline: ${endDate.toLocaleDateString('vi-VN')}`}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.taskName}
                  </span>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default InteractiveGanttChart;
