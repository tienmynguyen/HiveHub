import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { User, Mail, ShieldCheck, Wallet, Lock, LogOut, CheckCircle2 } from 'lucide-react';

const ProfileSettings = () => {
  const { user, logout, login } = useAuth();
  const [username, setUsername] = useState(user?.username || user?.userName || '');
  const [description, setDescription] = useState(user?.description || '');
  const [walletAddress, setWalletAddress] = useState(user?.walletAddress || '');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setSuccessMsg('');

    try {
      const res = await api.post(`/updateuser?userId=${user.user_id}`, {
        username,
        description,
        walletAddress,
      });

      if (res.data) {
        setSuccessMsg('Cập nhật thông tin cá nhân thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      alert('Không thể cập nhật thông tin: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
      
      {/* Header matching Mobile Profile.js */}
      <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '88px', height: '88px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontSize: '36px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', boxShadow: '0 8px 24px rgba(255,149,0,0.35)' }}>
          {username ? username.charAt(0).toUpperCase() : 'U'}
        </div>
        <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800' }}>{username || 'Thành viên'}</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>{user?.email}</p>
      </div>

      {successMsg && (
        <div style={{ padding: '12px 18px', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid #22c55e', color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
          <CheckCircle2 size={18} />
          {successMsg}
        </div>
      )}

      {/* Edit Profile Form */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <h2 className="font-heading" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} color="var(--accent-primary)" />
          Chỉnh sửa thông tin cá nhân
        </h2>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Tên hiển thị:
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên..."
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              Mô tả cá nhân (Giới thiệu):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Fullstack Developer / UI Designer"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: 'var(--text-muted)' }}>
              <Wallet size={15} color="var(--accent-primary)" />
              Địa chỉ Ví Blockchain Ganache / Web3:
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'monospace', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
            <button type="button" onClick={logout} style={{ background: 'transparent', border: '1px solid #f43f5e', color: '#e11d48', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <LogOut size={16} />
              Đăng xuất
            </button>

            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px 24px' }}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default ProfileSettings;
