import React, { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Users as UsersIcon, FileText, Settings as SettingsIcon, Activity } from 'lucide-react';
import { apiFetch } from '../utils/api';
import AdminSettings from '../components/AdminSettings';
import AdminOverview from '../components/AdminOverview';
import AdminUsers from '../components/AdminUsers';
import AdminContent from '../components/AdminContent';
import AdminSessions from '../components/AdminSessions';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Only check authentication on mount, don't load all data
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await apiFetch(`${API_BASE}/api/admin`, {});
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/not-accessible';
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to authenticate');
        if (!cancelled) setUser(json.user);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to authenticate');
      } finally {
        if (!cancelled) setLoading(false);
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

  if (loading) return <div style={{padding: '2rem'}}>Loading admin...</div>;
  if (error) return <div style={{padding: '2rem', color: '#b91c1c'}}>Error: {error}</div>;

  // Get current active section from URL
  const currentPath = location.pathname;
  const activeSection = sections.find(s => s.path === currentPath)?.key || 'overview';

  return (
    <div style={{display: 'flex', minHeight: 'calc(100vh - 64px)', background: '#ebebeb'}}>
      {/* Sidebar */}
      <aside style={{width: 260, borderRight: '1px solid #111', background: '#000'}}>
        <div style={{padding: '1rem 1rem 0.5rem 1rem'}}>
          <div style={{fontSize: 18, fontWeight: 800, color: '#fff'}}>Admin</div>
          <div style={{fontSize: 12, color: '#bbb'}}>Signed in as</div>
          <div style={{fontSize: 13, color: '#ddd', wordBreak: 'break-all'}}>{user?.email}</div>
        </div>
        <div style={{padding: '0.75rem 0.5rem'}}>
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => navigate(s.path)}
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
      <section style={{flex: 1, padding: '1.25rem'}}>
        <Routes>
          <Route index element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="sessions" element={<AdminSessions />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </section>
    </div>
  );
}
