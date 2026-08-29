import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { X, Copy, Check, Shield, UserMinus, Trash2, Settings, Users } from 'lucide-react';

const roleNames = {
  3: 'Owner',
  2: 'Management',
  1: 'Member',
};

const ProjectSettingsModal = ({ isOpen, onClose, activeProject, user, onProjectUpdated }) => {
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [userRole, setUserRole] = useState(1);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (activeProject?.project_id && user?.user_id) {
      fetchMembers();
      fetchUserRole();
    }
  }, [activeProject, user]);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/getalluserbyprojectId?projectId=${activeProject.project_id}`);
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch members error', e);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await api.get(`/findroleinuspr?projectId=${activeProject.project_id}&userId=${user.user_id}`);
      if (res.data && res.data.roleId) {
        setUserRole(Number(res.data.roleId));
      }
    } catch (e) {
      console.error('Fetch role error', e);
    }
  };

  const handleCopyCode = () => {
    if (!activeProject?.project_id) return;
    navigator.clipboard.writeText(activeProject.project_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (targetUserId, newRoleId) => {
    try {
      await api.post(`/updateuserproject?projectId=${encodeURIComponent(activeProject.project_id)}&userId=${targetUserId}&roleId=${newRoleId}&actorId=${user.user_id}`);
      fetchMembers();
    } catch (err) {
      alert('Không thể cập nhật vai trò: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) return;
    try {
      await api.post(`/removememberfromproject?projectId=${encodeURIComponent(activeProject.project_id)}&targetUserId=${targetUserId}&actorId=${user.user_id}`);
      fetchMembers();
      onProjectUpdated();
    } catch (err) {
      alert('Không thể xóa thành viên: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirm !== activeProject.projectName) {
      alert('Vui lòng nhập chính xác tên dự án để xác nhận xóa.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/deleteproject?projectId=${encodeURIComponent(activeProject.project_id)}&actorId=${user.user_id}`);
      onProjectUpdated();
      onClose();
    } catch (err) {
      alert('Không thể xóa dự án: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !activeProject) return null;

  const isProjectOwner = userRole === 3 || Number(activeProject.projectowner) === Number(user?.user_id);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={22} color="var(--accent-primary)" />
            <h2 className="font-heading" style={{ fontSize: '20px', fontWeight: '800' }}>Cài đặt & Quản trị Dự Án</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Project Details & Share Code Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{activeProject.projectName}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{activeProject.projectDescription || 'Chưa có mô tả dự án'}</p>

            <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>MÃ DỰ ÁN (PROJECT CODE):</div>
                <div style={{ fontSize: '15px', fontWeight: '800', fontFamily: 'monospace', color: 'var(--accent-primary)', marginTop: '2px' }}>
                  {activeProject.project_id}
                </div>
              </div>

              <button onClick={handleCopyCode} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
                {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                {copied ? 'Đã chép mã!' : 'Sao chép mã'}
              </button>
            </div>
          </div>

          {/* Members & Roles Management Card */}
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--accent-primary)" />
                <span>Thành viên dự án ({members.length})</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vai trò của bạn: <strong>{roleNames[userRole] || 'Member'}</strong></span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {members.map((m) => (
                <div key={m.user_id} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.username ? m.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600' }}>
                        {m.username} {Number(m.user_id) === Number(user?.user_id) ? '(Bạn)' : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isProjectOwner && Number(m.user_id) !== Number(user?.user_id) ? (
                      <>
                        <select
                          value={m.roleId || 1}
                          onChange={(e) => handleRoleChange(m.user_id, Number(e.target.value))}
                          style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
                        >
                          <option value={1}>Member</option>
                          <option value={2}>Management</option>
                          <option value={3}>Owner</option>
                        </select>

                        <button onClick={() => handleRemoveMember(m.user_id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }} title="Xóa khỏi dự án">
                          <UserMinus size={16} />
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', padding: '4px 10px', borderRadius: '999px', background: 'var(--accent-light)' }}>
                        {roleNames[m.roleId] || 'Member'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Project Danger Zone (Owner Only) */}
          {isProjectOwner && (
            <div className="glass-card" style={{ padding: '20px', border: '1px solid #f43f5e', background: 'rgba(244, 63, 94, 0.04)' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#e11d48', marginBottom: '6px' }}>Vùng Nguy Hiểm: Xóa Dự Án</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Hành động này sẽ xóa vĩnh viễn dự án và toàn bộ Sprints, Tasks, Stories liên quan. Hãy nhập tên dự án <strong>"{activeProject.projectName}"</strong> để xác nhận:
              </p>

              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={activeProject.projectName}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid #f43f5e', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={handleDeleteProject}
                  disabled={loading || deleteConfirm !== activeProject.projectName}
                  style={{ background: '#e11d48', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer', opacity: deleteConfirm !== activeProject.projectName ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={16} />
                  {loading ? 'Đang xóa...' : 'Xóa dự án'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;
