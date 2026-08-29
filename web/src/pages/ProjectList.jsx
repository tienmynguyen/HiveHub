import React, { useState } from 'react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import CreateProjectModal from '../components/CreateProjectModal';
import JoinProjectModal from '../components/JoinProjectModal';
import AddMemberModal from '../components/AddMemberModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import { Folder, Plus, KeyRound, Search, Kanban, Layers, MessageSquare, Settings, UserPlus, Copy, Check, ArrowRight } from 'lucide-react';

const ProjectList = () => {
  const { user, projects, activeProject, selectProject, fetchUserProjects, refreshProjects } = useAuth();
  const navigate = useNavigate();

  const handleRefresh = () => {
    if (typeof fetchUserProjects === 'function') fetchUserProjects();
    else if (typeof refreshProjects === 'function') refreshProjects();
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetProject, setTargetProject] = useState(null);
  const [copiedCodeId, setCopiedCodeId] = useState(null);

  const handleCopyCode = (e, projId) => {
    e.stopPropagation();
    navigator.clipboard.writeText(projId);
    setCopiedCodeId(projId);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleSelectProject = (proj) => {
    selectProject(proj);
    navigate(`/projects/${proj.project_id}`);
  };

  const handleOpenSettings = (e, proj) => {
    e.stopPropagation();
    setTargetProject(proj);
    setIsSettingsOpen(true);
  };

  const handleOpenAddMember = (e, proj) => {
    e.stopPropagation();
    setTargetProject(proj);
    setIsAddMemberOpen(true);
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (p.projectName || '').toLowerCase().includes(q) || (p.projectDescription || '').toLowerCase().includes(q) || (p.project_id || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="font-heading" style={{ fontSize: '28px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Folder size={28} color="var(--accent-primary)" />
            Danh Sách Dự Án ({projects.length})
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Bấm vào bất kỳ dự án nào bên dưới để mở Bảng Điều Khiển Chi Tiết Dự Án
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm kiếm dự án..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '10px 14px 10px 38px', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '220px' }}
            />
          </div>

          <button onClick={() => setIsJoinOpen(true)} className="btn-secondary" style={{ padding: '10px 16px' }}>
            <KeyRound size={16} color="var(--accent-primary)" />
            Tham Gia Dự Án
          </button>

          <button onClick={() => setIsCreateOpen(true)} className="btn-primary" style={{ padding: '10px 18px' }}>
            <Plus size={18} />
            Tạo Dự Án Mới
          </button>
        </div>
      </div>

      {/* Projects Grid List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredProjects.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            <Folder size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
            Không tìm thấy dự án nào. Hãy bấm "Tạo Dự Án Mới" hoặc "Tham Gia Dự Án" bằng mã code!
          </div>
        ) : (
          filteredProjects.map((p) => {
            const isActive = activeProject?.project_id === p.project_id;

            return (
              <div
                key={p.project_id}
                onClick={() => handleSelectProject(p)}
                className="glass-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  borderRadius: 'var(--radius-lg)',
                  border: isActive ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 8px 24px rgba(255, 149, 0, 0.15)' : '0 4px 14px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <div>
                  {/* Top Bar: Title & Active Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                        {p.projectName}
                      </h3>
                      <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: '700', marginTop: '2px' }}>
                        Mã: {p.project_id}
                      </div>
                    </div>

                    {isActive && (
                      <span style={{ padding: '4px 10px', borderRadius: '999px', background: 'var(--accent-gradient)', color: '#fff', fontSize: '11px', fontWeight: '700' }}>
                        Đang mở
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.projectDescription || 'Chưa có mô tả chi tiết cho dự án này.'}
                  </p>

                  {/* Methodology & Scale Badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    {(() => {
                      const mKey = (p.methodology || 'SCRUM').toUpperCase();
                      const meta = {
                        SCRUM: { label: '🎯 Agile Scrum', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.15)' },
                        WATERFALL: { label: '🌊 Waterfall', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
                        SCRUMBAN: { label: '⚡ Scrumban', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
                        XP: { label: '🚀 XP Programming', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
                        HYBRID: { label: '🔀 Phase Hybrid', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
                      }[mKey] || { label: '🎯 Agile Scrum', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.15)' };

                      return (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: meta.color, background: meta.bg, padding: '3px 10px', borderRadius: '999px' }}>
                          {meta.label}
                        </span>
                      );
                    })()}

                    {p.projectScale && (
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 8px', borderRadius: '6px' }}>
                        Quy mô: {p.projectScale}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Open Button & Quick Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                  
                  <div className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '13px' }}>
                    Mở Bảng Điều Khiển Dự Án <ArrowRight size={16} />
                  </div>

                  {/* Bottom Tool Icons (Copy Code, Add Member, Settings) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <button
                      onClick={(e) => handleCopyCode(e, p.project_id)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Sao chép mã dự án"
                    >
                      {copiedCodeId === p.project_id ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                      <span>{copiedCodeId === p.project_id ? 'Đã chép' : 'Chép mã'}</span>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => handleOpenAddMember(e, p)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Mời thành viên qua email"
                      >
                        <UserPlus size={14} /> Mời TV
                      </button>

                      <button
                        onClick={(e) => handleOpenSettings(e, p)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Cài đặt dự án"
                      >
                        <Settings size={14} /> Cài đặt
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        user={user}
        onProjectCreated={handleRefresh}
      />

      <JoinProjectModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        user={user}
        onProjectJoined={handleRefresh}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        activeProject={targetProject || activeProject}
        user={user}
      />

      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProject={targetProject || activeProject}
        user={user}
        onProjectUpdated={refreshProjects}
      />

    </div>
  );
};

export default ProjectList;
