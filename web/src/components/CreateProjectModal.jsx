import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, FolderPlus, Compass, Sparkles, Layers, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

const scaleOptions = [
  {
    id: 'SMALL',
    title: 'Nhỏ (Small Project)',
    desc: 'Dưới 5 người, thời gian 1-2 tháng',
    suggestedMethodology: 'XP',
    suggestedText: 'Gợi ý: Extreme Programming (XP) hoặc Agile Scrum',
  },
  {
    id: 'MEDIUM',
    title: 'Vừa (Medium Project)',
    desc: 'Từ 5 - 15 người, thời gian 3-6 tháng',
    suggestedMethodology: 'SCRUMBAN',
    suggestedText: 'Gợi ý: Scrumban hoặc Agile Scrum',
  },
  {
    id: 'LARGE',
    title: 'Lớn / Enterprise (Large Project)',
    desc: 'Trên 15 người, thời gian > 6 tháng',
    suggestedMethodology: 'WATERFALL',
    suggestedText: 'Gợi ý: Waterfall (Thác Nước) hoặc Phase Hybrid',
  },
];

const methodologyOptions = [
  {
    id: 'SCRUM',
    title: '🎯 Agile Scrum',
    badgeColor: '#ff9500',
    desc: 'Quản lý theo Sprints, Backlog, User Stories & Kanban',
  },
  {
    id: 'WATERFALL',
    title: '🌊 Waterfall (Thác Nước)',
    badgeColor: '#3b82f6',
    desc: 'Quản lý theo Giai đoạn tuần tự & Ràng buộc phụ thuộc Task (Prerequisite lock)',
  },
  {
    id: 'SCRUMBAN',
    title: '⚡ Scrumban',
    badgeColor: '#a855f7',
    desc: 'Bảng Kanban liên tục với Giới hạn công việc đang làm (WIP Limits)',
  },
  {
    id: 'XP',
    title: '🚀 Extreme Programming (XP)',
    badgeColor: '#10b981',
    desc: 'Tập trung vào Pair Programming (Lập trình cặp), Spike tasks & CI/CD',
  },
  {
    id: 'HYBRID',
    title: '🔀 Phase Hybrid (Kết Hợp Giai Đoạn)',
    badgeColor: '#ec4899',
    desc: 'Waterfall ở Giai đoạn Đầu/Cuối (Yêu cầu & Release) + Agile ở Giai đoạn Giữa (Lập trình)',
  },
];

const CreateProjectModal = ({ isOpen, onClose, user, onProjectCreated }) => {
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectScale, setProjectScale] = useState('MEDIUM');
  const [methodology, setMethodology] = useState('SCRUMBAN');
  const [timeStart, setTimeStart] = useState(new Date().toISOString().slice(0, 10));
  const [timeEnd, setTimeEnd] = useState(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  // When project scale changes, update suggested methodology automatically
  const handleScaleChange = (scaleId) => {
    setProjectScale(scaleId);
    const found = scaleOptions.find((s) => s.id === scaleId);
    if (found) {
      setMethodology(found.suggestedMethodology);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim() || !user) return;
    setLoading(true);

    try {
      const res = await api.post(`/createdproject?userId=${user.user_id}`, {
        projectName,
        projectDescription,
        projectScale,
        methodology,
        timeStart,
        timeEnd,
      });

      const newProj = res.data;
      setProjectName('');
      setProjectDescription('');
      if (typeof onProjectCreated === 'function') {
        onProjectCreated(newProj);
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Không thể tạo dự án: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderPlus color="var(--accent-primary)" size={24} />
            <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800' }}>Tạo Dự Án & Chọn Mô Hình Quản Lý</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Project Name & Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tên dự án *</label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="vd: Hệ Thống HiveHub Multi-Methodology"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mô tả dự án</label>
            <textarea
              rows={2}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Thêm mục tiêu hoặc mô tả tổng quan..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Step 1: Quy mô dự án (Scale Wizard) */}
          <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              <Compass size={18} color="var(--accent-primary)" />
              <span>1. Gợi Ý Quy Mô Dự Án (Project Scale)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {scaleOptions.map((opt) => {
                const isSelected = projectScale === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleScaleChange(opt.id)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--accent-light)' : 'var(--bg-elevated)',
                      border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {opt.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 149, 0, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
              <Sparkles size={14} />
              <span>{scaleOptions.find((s) => s.id === projectScale)?.suggestedText}</span>
            </div>
          </div>

          {/* Step 2: Lựa chọn Mô hình quản lý (Methodology Selector) */}
          <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              2. Lựa Chọn Mô Hình Quản Lý Dự Án
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {methodologyOptions.map((m) => {
                const isSelected = methodology === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setMethodology(m.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--bg-card)' : 'var(--bg-elevated)',
                      border: `2px solid ${isSelected ? m.badgeColor : 'transparent'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: m.badgeColor }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {m.desc}
                      </div>
                    </div>

                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? m.badgeColor : 'var(--text-muted)'}`,
                        background: isSelected ? m.badgeColor : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ngày bắt đầu</label>
              <input
                type="date"
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ngày dự kiến hoàn thành</label>
              <input
                type="date"
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Đang tạo...' : 'Tạo Dự Án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;
