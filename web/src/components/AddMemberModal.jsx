import React, { useState } from 'react';
import api from '../services/api';
import { X, UserPlus, Mail } from 'lucide-react';

const AddMemberModal = ({ isOpen, onClose, activeProject, user }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !activeProject) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      await api.post(`/addmemberbyemail?projectId=${activeProject.project_id}&ownerId=${user.user_id}`, {
        email,
      });

      alert(`Đã thêm thành viên ${email} vào dự án ${activeProject.projectName}!`);
      setEmail('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Không thể thêm thành viên: ' + (err.response?.data?.message || 'Email không tồn tại trong hệ thống.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus color="var(--accent-primary)" size={22} />
            <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: '700' }}>Thêm Thành Viên Vào Dự Án</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>Email thành viên</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vd: member@example.com"
                style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Đang thêm...' : 'Thêm thành viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
