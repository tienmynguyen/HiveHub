import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { CheckCircle2, Clock, Calendar as CalendarIcon, Folder, ChevronRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

const COLORS = ['#f43f5e', '#ff9500', '#a855f7', '#22c55e'];

const Dashboard = () => {
  const { user, projects, activeProject } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeProject?.project_id) {
      fetchTasks();
    }
  }, [activeProject]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/gettaskbyprojectid?projectId=${activeProject.project_id}`);
      const taskList = Array.isArray(res.data) ? res.data : [];
      setTasks(taskList);

      // Filter today's tasks
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayList = taskList.filter((t) => (t.deadline || t.timeStart || '').slice(0, 10) === todayStr || t.taskStatus === 'IN_PROGRESS' || t.taskStatus === 'TODO');
      setTodayTasks(todayList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const todoCount = tasks.filter((t) => t.taskStatus === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.taskStatus === 'IN_PROGRESS').length;
  const inReviewCount = tasks.filter((t) => t.taskStatus === 'IN_REVIEW').length;
  const doneCount = tasks.filter((t) => t.taskStatus === 'DONE' || t.taskStatus === 'APPROVED' || t.is_approved).length;

  const pieData = [
    { name: 'To Do', value: todoCount },
    { name: 'In Progress', value: inProgressCount },
    { name: 'In Review', value: inReviewCount },
    { name: 'Done', value: doneCount },
  ];

  const barData = [
    { name: 'Thứ 2', completed: 4, created: 6 },
    { name: 'Thứ 3', completed: 7, created: 5 },
    { name: 'Thứ 4', completed: 9, created: 8 },
    { name: 'Thứ 5', completed: 6, created: 4 },
    { name: 'Thứ 6', completed: 12, created: 10 },
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
      {/* Top Greeting matching Image2.jpg */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>Xin chào,</div>
          <h1 className="font-heading" style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {user?.username || 'Member'}
          </h1>
        </div>

        {/* User Profile Avatar */}
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(255,149,0,0.3)' }}>
          {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
        </div>
      </div>

      {/* Top Mobile-styled Stat Widgets (Orange Main Card + 2 Right Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '20px' }}>
        {/* Large Orange Project Card */}
        <div
          style={{
            background: 'var(--accent-gradient)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            minHeight: '140px',
            boxShadow: '0 8px 24px rgba(255, 149, 0, 0.35)',
          }}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Folder size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: '800', lineHeight: '1' }}>{projects.length}</div>
            <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.95, marginTop: '4px' }}>Dự án</div>
          </div>
        </div>

        {/* Stat Card 2: Total Tasks */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800' }}>{tasks.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Tổng task</div>
          </div>
        </div>

        {/* Stat Card 3: Today's Tasks */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--accent-light)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarIcon size={22} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800' }}>{todayTasks.length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Hôm nay</div>
          </div>
        </div>

        {/* Stat Card 4: Proof of Work */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '28px', fontWeight: '800' }}>{tasks.filter((t) => t.is_approved).length}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Blockchain PoW</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Tasks (Matching Image2) & Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Today's Tasks Section matching Image2 */}
        <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Công việc hôm nay</h3>
              <span style={{ background: 'var(--accent-gradient)', color: '#fff', fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '999px' }}>
                {todayTasks.length}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
            {todayTasks.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', padding: '30px' }}>
                Không có công việc nào cần xử lý hôm nay.
              </div>
            ) : (
              todayTasks.slice(0, 5).map((t) => (
                <div
                  key={t.task_id}
                  className="glass-card"
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    borderLeft: `5px solid ${t.taskStatus === 'DONE' ? '#22c55e' : t.taskStatus === 'IN_PROGRESS' ? '#ff9500' : '#f43f5e'}`,
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {t.taskName}
                    </h4>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {t.projectName || activeProject?.projectName || 'Dự án cá nhân'}
                    </div>
                  </div>

                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Task Distribution Pie Chart */}
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
  );
};

export default Dashboard;
