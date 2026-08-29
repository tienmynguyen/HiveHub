import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(() => {
    const saved = localStorage.getItem('activeProject');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    if (user) {
      connectSocket(user.user_id);
      fetchUserProjects();
    } else {
      disconnectSocket();
      setLoading(false);
    }
  }, [user]);

  const fetchUserProjects = async () => {
    try {
      if (!user?.user_id) return;
      // Exact backend route: GET /getprjectbyuserId?userId=...
      const res = await api.get(`/getprjectbyuserId?userId=${user.user_id}`);
      const projectList = Array.isArray(res.data) ? res.data : [];
      setProjects(projectList);

      if (projectList.length > 0) {
        if (!activeProject || !projectList.some((p) => String(p.project_id) === String(activeProject.project_id))) {
          setActiveProject(projectList[0]);
          localStorage.setItem('activeProject', JSON.stringify(projectList[0]));
        }
      } else {
        setActiveProject(null);
        localStorage.removeItem('activeProject');
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data;
    const userData = data.user || data.userInfo || data;
    const accessToken = data.tokens?.accessToken || data.accessToken;
    const refreshToken = data.tokens?.refreshToken || data.refreshToken;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const register = async (email, password, userName) => {
    const res = await api.post('/auth/register', { email, password, userName });
    const data = res.data;
    const userData = data.user || data.userInfo || data;
    const accessToken = data.tokens?.accessToken || data.accessToken;
    const refreshToken = data.tokens?.refreshToken || data.refreshToken;

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('activeProject');
      setUser(null);
      setProjects([]);
      setActiveProject(null);
    }
  };

  const selectProject = (project) => {
    setActiveProject(project);
    localStorage.setItem('activeProject', JSON.stringify(project));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        projects,
        activeProject,
        selectProject,
        fetchUserProjects,
        refreshProjects: fetchUserProjects,
        login,
        register,
        logout,
        theme,
        toggleTheme,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
