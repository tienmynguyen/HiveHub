import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import KanbanBoard from './KanbanBoard';
import Backlog from './Backlog';
import ProjectChat from './ProjectChat';
import BlockchainRewards from './BlockchainRewards';
import ProjectGanttChart from '../components/ProjectGanttChart';
import ProjectTaskHistory from '../components/ProjectTaskHistory';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import AddMemberModal from '../components/AddMemberModal';
import WaterfallDependencyView from '../components/WaterfallDependencyView';

import {
  LayoutDashboard,
  Kanban,
  Layers,
  MessageSquare,
  ShieldCheck,
  Settings,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  UserPlus,
  ArrowLeft,
  History,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#f43f5e', '#ff9500', '#a855f7', '#22c55e'];

const ProjectDetailDashboard = () => {
  const { projectId } = useParams();
  const { user, projects, activeProject, selectProject, fetchUserProjects, refreshProjects } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Prioritize resolving project by URL param projectId
  const currentProject = projects.find((p) => String(p.project_id) === String(projectId)) || 
                         (activeProject && String(activeProject.project_id) === String(projectId) ? activeProject : null);

  // Fetch projects from API if empty
  useEffect(() => {
    if (user?.user_id && (!projects || projects.length === 0)) {
      const doRefresh = fetchUserProjects || refreshProjects;
      if (typeof doRefresh === 'function') doRefresh();
    }
  }, [user, projects]);

  // Sync active project in context
  useEffect(() => {
    if (currentProject && activeProject?.project_id !== currentProject.project_id) {
      selectProject(currentProject);
    }
  }, [currentProject]);

  // Fetch tasks and members for the project
  useEffect(() => {
    const targetId = currentProject?.project_id || projectId;
    if (targetId) {
      fetchProjectData(targetId);
    }
  }, [projectId, currentProject?.project_id]);

  const fetchProjectData = async (targetId = projectId) => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [resTasks, resMembers] = await Promise.all([
        api.get(`/gettaskbyprojectid?projectId=${targetId}`),
        api.get(`/getalluserbyprojectId?projectId=${targetId}`),
      ]);
      setTasks(Array.isArray(resTasks.data) ? resTasks.data : []);
      setMembers(Array.isArray(resMembers.data) ? resMembers.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    const pId = currentProject?.project_id || projectId;
    if (!pId) return;
    navigator.clipboard.writeText(pId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Construct effective project object fallback if projects array is still loading
  const effectiveProject = currentProject || {
    project_id: projectId,
    projectName: `Dự án ${projectId}`,
    projectDescription: 'Dự án quản lý công việc Agile Scrum',
    methodology: 'SCRUM',
  };

  const todoCount = tasks.filter((t) => t.taskStatus === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.taskStatus === 'IN_PROGRESS').length;
  const inReviewCount = tasks.filter((t) => t.taskStatus === 'IN_REVIEW').length;
  const doneCount = tasks.filter((t) => t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved).length;

  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  const pieData = [
    { name: 'To Do', value: todoCount },
    { name: 'In Progress', value: inProgressCount },
    { name: 'In Review', value: inReviewCount },
    { name: 'Done', value: doneCount },
  ];

  const methodologyKey = (effectiveProject.methodology || 'SCRUM').toUpperCase();

  const getDynamicTabs = () => {
    if (methodologyKey === 'WATERFALL') {
      return [
        { id: 'waterfall', label: '🌊 Sơ Đồ Phụ Thuộc Waterfall', icon: Layers },
        { id: 'kanban', label: 'Bảng Kanban', icon: Kanban },
        { id: 'gantt', label: 'Biểu Đồ Gantt', icon: Calendar },
        { id: 'history', label: 'Lịch Sử Thay Đổi', icon: History },
        { id: 'chat', label: 'Trao Đổi Nhóm', icon: MessageSquare },
        { id: 'blockchain', label: 'Bằng Chứng PoW', icon: ShieldCheck },
      ];
    }
    if (methodologyKey === 'HYBRID') {
      return [
        { id: 'overview', label: 'Tổng Quan Phase Hybrid', icon: LayoutDashboard },
        { id: 'waterfall', label: '🌊 Sơ Đồ Giai Đoạn Waterfall', icon: Layers },
        { id: 'backlog', label: '📑 Kế Hoạch Agile Sprints', icon: Layers },
        { id: 'kanban', label: 'Bảng Kanban', icon: Kanban },
        { id: 'gantt', label: 'Biểu Đồ Gantt', icon: Calendar },
        { id: 'history', label: 'Lịch Sử Thay Đổi', icon: History },
        { id: 'chat', label: 'Trao Đổi Nhóm', icon: MessageSquare },
        { id: 'blockchain', label: 'Bằng Chứng PoW', icon: ShieldCheck },
      ];
    }
    return [
      { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
      { id: 'kanban', label: 'Bảng Kanban', icon: Kanban },
      { id: 'backlog', label: 'Kế Hoạch Agile', icon: Layers },
      { id: 'waterfall', label: 'Sơ Đồ Phụ Thuộc', icon: Layers },
      { id: 'gantt', label: 'Biểu Đồ Gantt', icon: Calendar },
      { id: 'history', label: 'Lịch Sử Thay Đổi', icon: History },
      { id: 'chat', label: 'Trao Đổi Nhóm', icon: MessageSquare },
      { id: 'blockchain', label: 'Bằng Chứng PoW', icon: ShieldCheck },
    ];
  };

  const tabs = getDynamicTabs();

  // Ensure default active tab matches available tabs
  useEffect(() => {
    if (!tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'overview');
    }
  }, [methodologyKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      
      {/* Project Banner Header */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 32px 0 32px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => navigate('/projects')}
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '13px' }}
              title="Quay lại danh sách dự án"
            >
              <ArrowLeft size={16} /> Dự Án
            </button>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 className="font-heading" style={{ fontSize: '24px', fontWeight: '800' }}>
                  {effectiveProject.projectName}
                </h1>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--accent-primary)', fontWeight: '700', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: '6px' }}>
                  Mã: {effectiveProject.project_id}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {effectiveProject.projectDescription || 'Dự án quản lý công việc Agile Scrum'}
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={handleCopyCode} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
              {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
              {copied ? 'Đã chép mã' : 'Sao chép mã'}
            </button>

            <button onClick={() => setIsAddMemberOpen(true)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
              <UserPlus size={15} /> Mời TV
            </button>

            <button onClick={() => setIsSettingsOpen(true)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
              <Settings size={15} /> Cài Đặt
            </button>
          </div>
        </div>

        {/* Project Sub-Tabs Header Bar */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: 'none', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 18px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  background: 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: isActive ? '700' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <IconComp size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
            
            {/* Top Stat Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              
              {/* Progress Card */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>TIẾN ĐỘ DỰ ÁN</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '12px 0 6px 0' }}>
                  <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)' }}>{progressPercent}%</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({doneCount}/{totalTasks} task)</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: '8px', width: '100%', background: 'var(--bg-elevated)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--accent-gradient)', borderRadius: '999px', transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Total Tasks Card */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '800' }}>{totalTasks}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Tổng số công việc</div>
                </div>
              </div>

              {/* Members Count Card */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '800' }}>{members.length}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Thành viên nhóm</div>
                </div>
              </div>

              {/* Blockchain PoW Count Card */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '800' }}>{tasks.filter((t) => t.is_approved).length}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>PoW Verified</div>
                </div>
              </div>
            </div>

            {/* Split Grid: Members List & Status Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              
              {/* Project Members List */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--accent-primary)" /> Thành Viên Nhóm
                  </h3>
                  <button onClick={() => setIsAddMemberOpen(true)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <UserPlus size={14} /> Thêm TV
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '260px', overflowY: 'auto' }}>
                  {members.map((m) => (
                    <div key={m.user_id} className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontWeight: '700', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {m.username ? m.username.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{m.username}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.email}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
                        {Number(m.user_id) === Number(effectiveProject.projectowner) ? 'Owner' : 'Member'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Pie Chart */}
              <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '18px' }}>Phân Bổ Trạng Thái Agile</h3>
                <div style={{ height: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1a1d24', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB: WATERFALL DEPENDENCY & PHASES */}
        {activeTab === 'waterfall' && <WaterfallDependencyView projectId={effectiveProject.project_id} user={user} />}

        {/* TAB 2: KANBAN BOARD */}
        {activeTab === 'kanban' && <KanbanBoard />}

        {/* TAB 3: AGILE BACKLOG & SPRINTS */}
        {activeTab === 'backlog' && <Backlog />}

        {/* TAB 4: GANTT CHART */}
        {activeTab === 'gantt' && <ProjectGanttChart projectId={effectiveProject.project_id} user={user} />}

        {/* TAB 5: TASK HISTORY LOGS */}
        {activeTab === 'history' && <ProjectTaskHistory projectId={effectiveProject.project_id} />}

        {/* TAB 6: GROUP CHAT */}
        {activeTab === 'chat' && <ProjectChat />}

        {/* TAB 7: BLOCKCHAIN POW */}
        {activeTab === 'blockchain' && <BlockchainRewards />}

      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        activeProject={effectiveProject}
        user={user}
      />

      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProject={effectiveProject}
        user={user}
        onProjectUpdated={fetchUserProjects || refreshProjects}
      />
    </div>
  );
};

export default ProjectDetailDashboard;
