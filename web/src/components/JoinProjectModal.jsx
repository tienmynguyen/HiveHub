import React, { useState } from 'react';
import api from '../services/api';
import { X, LogIn, KeyRound } from 'lucide-react';

const JoinProjectModal = ({ isOpen, onClose, user, onProjectJoined }) => {
  const [projectCode, setProjectCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectCode.trim() || !user) return;
    setLoading(true);
    setError('');

    try {
      const code = projectCode.trim();
      await api.post(`/joinproject?userId=${user.user_id}&projectId=${encodeURIComponent(code)}`);
      setProjectCode('');
      onProjectJoined();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Mã dự án không tồn tại hoặc bạn đã ở trong dự án.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={22} color="var(--accent-primary)" />
            <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800' }}>Tham gia dự án</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#fff1f2', border: '1px solid #f43f5e', color: '#e11d48', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Nhập Mã Dự Án (Project Code):
            </label>
            <input
              type="text"
              required
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="Ví dụ: P-WEB-PLATFORM hoặc P-17077652"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary">
              <LogIn size={16} />
              {loading ? 'Đang tham gia...' : 'Tham gia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinProjectModal;
