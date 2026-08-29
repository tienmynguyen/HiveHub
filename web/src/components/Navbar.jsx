import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { NavLink } from 'react-router-dom';
import CreateProjectModal from './CreateProjectModal';
import AddMemberModal from './AddMemberModal';
import JoinProjectModal from './JoinProjectModal';
import ProjectSettingsModal from './ProjectSettingsModal';
import { Plus, UserPlus, KeyRound, Settings, Copy, Check, Moon, Sun, Sparkles, User } from 'lucide-react';

const Navbar = ({ onOpenAI }) => {
  const { user, projects, activeProject, selectProject, refreshProjects } = useAuth();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isJoinProjectOpen, setIsJoinProjectOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleCopyCode = () => {
    if (!activeProject?.project_id) return;
    navigator.clipboard.writeText(activeProject.project_id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      <header
        className="glass-panel"
        style={{
          height: '64px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 40,
          position: 'sticky',
          top: 0,
        }}
      >
        {/* Left Section: Active Project Selector & Project Code Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-muted)' }}>DỰ ÁN:</div>

          {projects.length > 0 ? (
            <select
              value={activeProject?.project_id || ''}
              onChange={(e) => {
                const found = projects.find((p) => String(p.project_id) === e.target.value);
                if (found) selectProject(found);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: '700',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.projectName} ({p.project_id})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Chưa có dự án
            </span>
          )}

          {/* Action Buttons for Project */}
          {activeProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleCopyCode}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Sao chép mã dự án"
              >
                {copiedCode ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                {copiedCode ? 'Đã chép' : 'Sao chép mã'}
              </button>

              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Mời thành viên qua Email"
              >
                <UserPlus size={14} /> Mời TV
              </button>

              <button
                onClick={() => setIsProjectSettingsOpen(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                title="Cài đặt dự án"
              >
                <Settings size={14} /> Cài đặt
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Quick Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Join Project by Code Button */}
          <button
            onClick={() => setIsJoinProjectOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <KeyRound size={15} color="var(--accent-primary)" />
            Tham gia dự án
          </button>

          {/* Create New Project Button */}
          <button
            onClick={() => setIsCreateProjectOpen(true)}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} /> Tạo Dự Án
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAI}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
              color: '#fff',
              border: 'none',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Sparkles size={15} /> Trợ Lý AI
          </button>

          {/* Dark/Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Đổi giao diện Sáng/Tối"
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
          </button>

          {/* User Profile Navigation Button */}
          <NavLink
            to="/profile"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              color: '#fff',
              fontWeight: '700',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(255,149,0,0.3)',
            }}
            title={user?.username || 'Cá nhân'}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : <User size={18} />}
          </NavLink>
        </div>
      </header>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        user={user}
        onProjectCreated={refreshProjects}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        activeProject={activeProject}
        user={user}
      />

      <JoinProjectModal
        isOpen={isJoinProjectOpen}
        onClose={() => setIsJoinProjectOpen(false)}
        user={user}
        onProjectJoined={refreshProjects}
      />

      <ProjectSettingsModal
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        activeProject={activeProject}
        user={user}
        onProjectUpdated={refreshProjects}
      />
    </>
  );
};

export default Navbar;
