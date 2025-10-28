import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Users as UsersIcon, FileText, Settings as SettingsIcon, Activity, Menu, X } from 'lucide-react';
import { apiClient, endpoints, auth as apiAuth } from '../api';
import AdminSettings from '../components/AdminSettings';
import AdminOverview from '../components/AdminOverview';
import AdminUsers from '../components/AdminUsers';
import AdminContent from '../components/AdminContent';
import AdminSessions from '../components/AdminSessions';

export default function Admin() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check authentication on mount, redirect if unauthorized
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const { data } = await apiClient.get(endpoints.admin.dashboard);
        if (!cancelled) setUser(data.user);
      } catch (e) {
        if (apiAuth.isAuthError(e)) {
          window.location.href = '/not-accessible';
          return;
        }
        // For other errors, still render but user will be null
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, []);

  const sections = useMemo(() => {
    const base = [
      { key: 'overview', label: 'Overview', icon: BarChart3, path: '/admin/overview' },
      { key: 'sessions', label: 'Sessions', icon: Activity, path: '/admin/sessions' },
      { key: 'users', label: 'Users', icon: UsersIcon, path: '/admin/users' },
      { key: 'content', label: 'Content', icon: FileText, path: '/admin/content' },
      { key: 'settings', label: 'Settings', icon: SettingsIcon, path: '/admin/settings' }
    ];
    return base;
  }, []);

  // Get current active section from URL
  const currentPath = location.pathname;
  const activeSection = sections.find(s => s.path === currentPath)?.key || 'overview';

  return (
    <div style={{display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#ebebeb', position: 'relative'}}>
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: 80,
          left: 16,
          zIndex: 1000,
          background: '#000',
          border: '1px solid #333',
          borderRadius: 8,
          padding: '0.5rem',
          cursor: 'pointer',
          display: 'none',
          color: '#fff'
        }}
        className="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 998,
            display: 'none'
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 260,
          borderRight: '1px solid #111',
          background: '#000',
          position: 'fixed',
          height: 'calc(100vh - 64px)',
          paddingTop: 60,
          zIndex: 999,
          transition: 'transform 0.3s ease'
        }}
        className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
        <div style={{padding: '1rem 1rem 0.5rem 1rem'}}>
          <div style={{fontSize: 18, fontWeight: 800, color: '#fff'}}>Admin</div>
          <div style={{fontSize: 12, color: '#bbb'}}>Signed in as</div>
          <div style={{fontSize: 13, color: '#ddd', wordBreak: 'break-all'}}>{user?.email}</div>
        </div>
        <div style={{padding: '0.75rem 0.5rem'}}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                navigate(s.path);
                setSidebarOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 0.75rem',
                background: activeSection === s.key ? '#fff' : 'transparent',
                color: activeSection === s.key ? '#111' : '#ddd',
                border: '1px solid ' + (activeSection === s.key ? '#fff' : '#333'),
                borderRadius: 8,
                margin: '0.25rem 0',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <s.icon size={16} style={{ color: activeSection === s.key ? '#111' : '#ddd' }} />
              <span style={{fontWeight: 700, fontSize: 14}}>{s.label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <section style={{flex: 1, padding: '1.25rem', marginLeft: 260}} className="admin-main-content">
        <Routes>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          .sidebar-overlay {
            display: block !important;
          }
          .admin-sidebar {
            transform: translateX(-100%);
          }
          .admin-sidebar.sidebar-open {
            transform: translateX(0);
          }
          .admin-main-content {
            margin-left: 0 !important;
          }
        }
        @media (min-width: 769px) {
          .admin-sidebar {
            position: fixed !important;
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </div>
  );
}
