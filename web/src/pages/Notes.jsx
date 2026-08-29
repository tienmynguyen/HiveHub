import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Edit3,
  X,
  Search,
  Pin,
  BookOpen,
  LayoutGrid,
  CalendarDays,
  StickyNote,
} from 'lucide-react';

const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const Notes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().slice(0, 10));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteTime, setNoteTime] = useState('09:00');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.user_id) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const res = await api.get(`/getallnotebyuser?userId=${user.user_id}`);
      setNotes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Generate calendar days for current selected month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days = [];
    
    // Fill leading empty days from previous month
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon...
    for (let i = 0; i < startDayOfWeek; i++) {
      const prevDate = new Date(year, month, -startDayOfWeek + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    return days;
  }, [currentMonth]);

  // Open modal to add a new note
  const handleOpenAddModal = (dateStr = selectedDateStr) => {
    setEditingNote(null);
    setTitle('');
    setContent('');
    setNoteDate(dateStr);
    setNoteTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    setPinned(false);
    setIsModalOpen(true);
  };

  // Open modal to edit existing note
  const handleOpenEditModal = (note) => {
    setEditingNote(note);
    setTitle(note.title || '');
    setContent(note.content || '');
    setNoteDate(note.noteDate || note.date ? (note.noteDate || note.date).slice(0, 10) : selectedDateStr);
    setNoteTime(note.noteTime || '09:00');
    setPinned(Boolean(note.pinned));
    setIsModalOpen(true);
  };

  // Submit note (create or update)
  const handleSubmitNote = async (e) => {
    e.preventDefault();
    if (!title.trim() || !user) return;
    setLoading(true);
    try {
      const payload = {
        title,
        content,
        noteDate,
        noteTime,
        pinned,
      };

      if (editingNote?.note_id) {
        await api.post(`/updatenote?noteId=${editingNote.note_id}`, payload);
      } else {
        await api.post(`/addnote?userId=${user.user_id}`, payload);
      }

      setIsModalOpen(false);
      fetchNotes();
    } catch (err) {
      alert('Lỗi lưu ghi chú: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    try {
      await api.delete(`/deletenote?noteId=${noteId}`);
      setNotes((prev) => prev.filter((n) => Number(n.note_id) !== Number(noteId)));
    } catch (err) {
      alert('Không thể xóa ghi chú');
    }
  };

  // Map notes by YYYY-MM-DD
  const notesByDate = useMemo(() => {
    const map = {};
    notes.forEach((n) => {
      const dateKey = (n.noteDate || n.date || '').slice(0, 10);
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(n);
      }
    });
    return map;
  }, [notes]);

  const selectedDateNotes = notesByDate[selectedDateStr] || [];

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 64px)' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '26px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CalendarDays size={28} color="var(--accent-primary)" />
            Cuốn Lịch Ghi Chú & Lịch Trình
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Quản lý ghi chú gắn liền với từng Ngày và Giờ cụ thể trên cuốn lịch tương tác
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'calendar' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'calendar' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <CalendarDays size={16} /> Cuốn Lịch
            </button>

            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-muted)',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={16} /> Tất Cả ({notes.length})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm ghi chú..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none', width: '200px' }}
            />
          </div>

          <button onClick={() => handleOpenAddModal(selectedDateStr)} className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Plus size={16} /> Thêm Ghi Chú
          </button>
        </div>
      </div>

      {/* VIEW 1: CALENDAR BOOKLET VIEW */}
      {viewMode === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '24px', flex: 1 }}>
          
          {/* Left Column: Interactive Month Calendar Booklet Grid */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Calendar Header Month Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: '800' }}>
                  Tháng {currentMonth.getMonth() + 1} năm {currentMonth.getFullYear()}
                </h2>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date());
                    setSelectedDateStr(todayStr);
                  }}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                >
                  Hôm nay
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '6px 10px' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '6px 10px' }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              {dayNames.map((d, i) => (
                <div key={d} style={{ color: i === 0 ? '#f43f5e' : 'inherit' }}>{d}</div>
              ))}
            </div>

            {/* Month Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', flex: 1 }}>
              {calendarDays.map((cell, idx) => {
                const dateStr = cell.date.toISOString().slice(0, 10);
                const isSelected = dateStr === selectedDateStr;
                const isToday = dateStr === todayStr;
                const dateNotes = notesByDate[dateStr] || [];

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateStr(dateStr)}
                    style={{
                      minHeight: '70px',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected
                        ? 'var(--accent-light)'
                        : isToday
                        ? 'rgba(255, 149, 0, 0.08)'
                        : cell.isCurrentMonth
                        ? 'var(--bg-card)'
                        : 'var(--bg-elevated)',
                      border: isSelected
                        ? '2px solid var(--accent-primary)'
                        : isToday
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-color)',
                      opacity: cell.isCurrentMonth ? 1 : 0.4,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: isToday || isSelected ? '800' : '600',
                          color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)',
                        }}
                      >
                        {cell.date.getDate()}
                      </span>

                      {dateNotes.length > 0 && (
                        <span style={{ fontSize: '10px', fontWeight: '800', background: 'var(--accent-primary)', color: '#fff', borderRadius: '999px', padding: '1px 6px' }}>
                          {dateNotes.length}
                        </span>
                      )}
                    </div>

                    {/* Preview Notes Titles in Day Cell */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px', overflow: 'hidden' }}>
                      {dateNotes.slice(0, 2).map((n) => (
                        <div
                          key={n.note_id}
                          style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            background: 'var(--accent-gradient)',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {n.noteTime ? `${n.noteTime} ` : ''}{n.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Right Column: Selected Date Notes Booklet Details Panel */}
          <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div>
                <h3 className="font-heading" style={{ fontSize: '17px', fontWeight: '800' }}>
                  Ghi Chú Ngày: {new Date(selectedDateStr).toLocaleDateString('vi-VN')}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {selectedDateNotes.length} ghi chú được lên lịch
                </span>
              </div>

              <button onClick={() => handleOpenAddModal(selectedDateStr)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                <Plus size={14} /> Thêm Ghi Chú
              </button>
            </div>

            {/* Selected Date Notes Timeline List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
              {selectedDateNotes.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  <StickyNote size={36} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                  Chưa có ghi chú nào cho ngày này. Bấm "+ Thêm Ghi Chú" để tạo ghi chú mới!
                </div>
              ) : (
                selectedDateNotes.map((n) => (
                  <div
                    key={n.note_id}
                    className="glass-card"
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderLeft: n.pinned ? '4px solid var(--accent-primary)' : '4px solid #3b82f6',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: '6px' }}>
                          <Clock size={12} /> {n.noteTime || '09:00'}
                        </span>
                        <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {n.title}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => handleOpenEditModal(n)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title="Sửa">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => handleDeleteNote(n.note_id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title="Xóa">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {n.content && (
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line', margin: 0 }}>
                        {n.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {/* VIEW 2: ALL NOTES GRID VIEW */}
      {viewMode === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', flex: 1, overflowY: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
              Chưa có ghi chú nào phù hợp.
            </div>
          ) : (
            filteredNotes.map((n) => (
              <div key={n.note_id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px', borderRadius: 'var(--radius-lg)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {n.noteTime || '09:00'}
                      </span>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {n.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => handleOpenEditModal(n)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDeleteNote(n.note_id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {n.content}
                  </p>
                </div>

                <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📅 {new Date(n.noteDate || n.date || Date.now()).toLocaleDateString('vi-VN')}</span>
                  {n.pinned && <Pin size={14} color="var(--accent-primary)" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add / Edit Note Modal (With Date & Time Selectors) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarDays size={22} color="var(--accent-primary)" />
                <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800' }}>
                  {editingNote ? 'Sửa Ghi Chú Lịch' : 'Thêm Ghi Chú Vào Lịch'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNote} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Note Title */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Tiêu đề ghi chú:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Họp review sản phẩm Sprint 2"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
                />
              </div>

              {/* Date & Time Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    📅 Chọn Ngày trong lịch:
                  </label>
                  <input
                    type="date"
                    required
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    ⏰ Chọn Giờ trong lịch:
                  </label>
                  <input
                    type="time"
                    required
                    value={noteTime}
                    onChange={(e) => setNoteTime(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Note Content */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
                  Nội dung ghi chú:
                </label>
                <textarea
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập thông tin ghi chú hoặc nội dung công việc..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Hủy</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Đang lưu...' : editingNote ? 'Cập Nhật' : 'Lưu Vào Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Notes;
