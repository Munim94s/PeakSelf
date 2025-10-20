import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../utils/api';
import './AdminUsers.css';
import './AdminTraffic.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminUsers() {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm);
      if (filter && filter !== 'all') params.set('filter', filter);
      const res = await apiFetch(`${API_BASE}/api/admin/users?${params.toString()}`, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filter]);

  const inviteUser = async () => {
    const email = window.prompt('Enter email to invite:');
    if (!email) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/users/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invite failed');
      alert(data.message || 'Invitation sent');
      load();
    } catch (e) {
      alert(e.message || 'Invite failed');
    }
  };

  const exportCsv = () => {
    // Open CSV in a new tab; cookies will be sent for same-origin
    window.open(`${API_BASE}/api/admin/users.csv`, '_blank');
  };

  const makeAdmin = async (id) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/users/${encodeURIComponent(id)}/make-admin`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to promote user');
      load();
    } catch (e) {
      alert(e.message || 'Failed to promote user');
    }
  };

  const removeAdmin = async (id) => {
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/users/${encodeURIComponent(id)}/remove-admin`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove admin role');
      load();
    } catch (e) {
      alert(e.message || 'Failed to remove admin role');
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm('Are you sure you want to remove this user?')) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user');
      load();
    } catch (e) {
      alert(e.message || 'Failed to remove user');
    }
  };

  // Keyboard shortcut: Ctrl/Cmd+K focuses Users search, Esc clears
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('users-search-input');
        if (el) el.focus();
      }
      if (e.key === 'Escape') setSearchTerm('');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="admin-users">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Users</div>
        </div>

        <form className="traffic-search-form" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="traffic-search" role="search">
            <span className="search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              id="users-search-input"
              type="search"
              className="traffic-search-input"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search users"
            />
            {searchTerm && (
              <button
                type="button"
                className="traffic-search-clear"
                aria-label="Clear search"
                title="Clear"
                onClick={() => { setSearchTerm(''); setTimeout(load, 0); }}
              >
                ×
              </button>
            )}
            <button type="submit" className="btn primary search-btn">Search</button>
          </div>
        </form>

        <div className="traffic-chip-row">
          {[
            {key: 'all', label: 'All'},
            {key: 'admins', label: 'Admins'},
            {key: 'unverified', label: 'Unverified'}
          ].map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`traffic-chip ${filter === f.key ? 'active' : ''}`}
              aria-pressed={filter === f.key}
            >
              {f.label}
            </button>
          ))}
          <button type="button" className="traffic-chip" onClick={inviteUser}>Invite User</button>
          <button type="button" className="traffic-chip" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {loading && <div style={{padding: '0.75rem'}}>Loading users...</div>}
      {error && !loading && <div style={{padding: '0.75rem', color: '#b91c1c'}}>Error: {error}</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {['Name', 'Email', 'Role', 'Verified', 'Actions'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td><span className={`role ${u.role}`}>{u.role}</span></td>
                  <td>{u.verified ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn small" onClick={() => alert(JSON.stringify(u, null, 2))}>View</button>
                      {u.role !== 'admin' ? (
                        <button className="btn small" onClick={() => makeAdmin(u.id)}>Make Admin</button>
                      ) : (
                        <button className="btn small" onClick={() => removeAdmin(u.id)}>Remove Admin</button>
                      )}
                      <button className="btn small danger" onClick={() => removeUser(u.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', color: '#666' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
