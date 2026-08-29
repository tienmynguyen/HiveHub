import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Folder, Calendar, CalendarDays, User } from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { to: '/', label: 'Trang Chủ', icon: LayoutDashboard },
    { to: '/projects', label: 'Dự Án', icon: Folder },
    { to: '/calendar', label: 'Lịch & Gantt', icon: Calendar },
    { to: '/notes', label: 'Cuốn Lịch Ghi Chú', icon: CalendarDays },
    { to: '/profile', label: 'Cá Nhân', icon: User },
  ];

  return (
    <aside
      className="glass-panel"
      style={{
        width: '240px',
        height: 'calc(100vh - 64px)',
        borderRight: '1px solid var(--border-color)',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Brand Header */}
        <div style={{ padding: '0 12px 16px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '16px' }}>
            H
          </div>
          <div>
            <div className="font-heading" style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>HiveHub</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>AGILE WORKSPACE</div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  background: isActive ? 'var(--accent-gradient)' : 'transparent',
                  fontWeight: isActive ? '700' : '500',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(255, 149, 0, 0.35)' : 'none',
                })}
              >
                <IconComponent size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
        HiveHub Mobile & Web Sync v1.0
      </div>
    </aside>
  );
};

export default Sidebar;
