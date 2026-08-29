import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AIAssistantDrawer from './components/AIAssistantDrawer';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProjectList from './pages/ProjectList';
import ProjectDetailDashboard from './pages/ProjectDetailDashboard';
import CalendarView from './pages/CalendarView';
import Notes from './pages/Notes';
import ProfileSettings from './pages/ProfileSettings';

const ProtectedLayout = ({ children }) => {
  const { user, loading, activeProject } = useAuth();
  const [isAiOpen, setIsAiOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        Loading HiveHub Web Dashboard...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar onOpenAI={() => setIsAiOpen(true)} />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {children}
        </main>
        <AIAssistantDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} activeProject={activeProject} user={user} />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedLayout>
              <ProjectList />
            </ProtectedLayout>
          }
        />

        <Route
          path="/projects/:projectId"
          element={
            <ProtectedLayout>
              <ProjectDetailDashboard />
            </ProtectedLayout>
          }
        />

        <Route
          path="/calendar"
          element={
            <ProtectedLayout>
              <CalendarView />
            </ProtectedLayout>
          }
        />

        <Route
          path="/notes"
          element={
            <ProtectedLayout>
              <Notes />
            </ProtectedLayout>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedLayout>
              <ProfileSettings />
            </ProtectedLayout>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
