import React, { useEffect, useMemo, useState } from 'react';
import { apiClient, endpoints, withQuery, response } from '../api';
import SkeletonTable from './SkeletonTable';
import { useModal } from '../contexts/ModalContext';
import './AdminUsers.css';
import './AdminSessions.css';

export default function AdminUsers() {
  const modal = useModal();
  const [tab, setTab] = useState('active'); // 'active' or 'deleted'
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  async function load() {
    setLoading(true);
    setError('');
    setSelectedIds(new Set()); // Clear selection on reload
    try {
      const params = {};
      if (searchTerm) params.q = searchTerm;
      if (tab === 'active' && filter && filter !== 'all') params.filter = filter;
      
      const endpoint = tab === 'deleted' ? endpoints.admin.deletedUsers : endpoints.admin.users;
      const { data } = await apiClient.get(withQuery(endpoint, params));
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(response.getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filter, tab]);

  const inviteUser = async () => {
    const email = await modal.prompt('Enter the email address to invite:', 'Invite User', '', 'user@example.com');
    if (!email) return;
    try {
      const { data } = await apiClient.post(endpoints.admin.inviteUser, { email });
      await modal.alert(data.message || 'Invitation sent', 'Success');
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const exportCsv = () => {
    // Open CSV in a new tab; cookies will be sent for same-origin
    window.open(endpoints.admin.usersCSV, '_blank');
  };

  const makeAdmin = async (id) => {
    try {
      await apiClient.post(endpoints.admin.makeAdmin(id));
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const removeAdmin = async (id) => {
    try {
      await apiClient.post(endpoints.admin.removeAdmin(id));
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const removeUser = async (id) => {
    const confirmed = await modal.confirm('Are you sure you want to delete this user?', 'Confirm Delete', { variant: 'danger' });
    if (!confirmed) return;
    try {
      await apiClient.delete(endpoints.admin.userById(id));
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const restoreUser = async (id) => {
    const confirmed = await modal.confirm('Restore this user?', 'Confirm Restore', { variant: 'primary' });
    if (!confirmed) return;
    try {
      await apiClient.post(endpoints.admin.restoreUser(id));
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const permanentlyDeleteUser = async (id) => {
    const confirmed = await modal.confirm('PERMANENTLY delete this user? This cannot be undone!', 'Permanent Delete', { variant: 'danger', confirmText: 'Delete Forever' });
    if (!confirmed) return;
    try {
      await apiClient.delete(endpoints.admin.bulkDelete, { ids: [id] });
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map(u => u.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const bulkRestore = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await modal.confirm(`Restore ${selectedIds.size} user(s)?`, 'Bulk Restore', { variant: 'primary', confirmText: 'Restore' });
    if (!confirmed) return;
    try {
      const { data } = await apiClient.post(endpoints.admin.bulkRestore, { ids: Array.from(selectedIds) });
      await modal.alert(data.message || `Restored ${selectedIds.size} users`, 'Success');
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await modal.confirm(`PERMANENTLY delete ${selectedIds.size} user(s)? This cannot be undone!`, 'Bulk Delete', { variant: 'danger', confirmText: 'Delete Forever' });
    if (!confirmed) return;
    try {
      const { data } = await apiClient.delete(endpoints.admin.bulkDelete, { ids: Array.from(selectedIds) });
      await modal.alert(data.message || `Deleted ${selectedIds.size} users`, 'Success');
      load();
    } catch (e) {
      await modal.alert(response.getErrorMessage(e), 'Error');
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
          <div className="tabs">
            <button 
              className={`tab ${tab === 'active' ? 'active' : ''}`}
              onClick={() => setTab('active')}
            >
              Active Users
            </button>
            <button 
              className={`tab ${tab === 'deleted' ? 'active' : ''}`}
              onClick={() => setTab('deleted')}
            >
              Deleted Users
            </button>
          </div>
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
          {tab === 'active' && (
            <>
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
            </>
          )}
          {tab === 'deleted' && selectedIds.size > 0 && (
            <>
              <span className="chip-info">{selectedIds.size} selected</span>
              <button type="button" className="traffic-chip primary" onClick={bulkRestore}>
                Restore Selected ({selectedIds.size})
              </button>
              <button type="button" className="traffic-chip danger" onClick={bulkDelete}>
                Permanently Delete ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <SkeletonTable rows={8} columns={5} />}
      {error && !loading && <div style={{padding: '0.75rem', color: '#b91c1c'}}>Error: {error}</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {tab === 'deleted' && (
                  <th style={{width: '40px'}}>
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedIds.size === users.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {tab === 'active' ? (
                  ['Name', 'Email', 'Role', 'Verified', 'Actions'].map((h) => <th key={h}>{h}</th>)
                ) : (
                  ['Name', 'Email', 'Role', 'Deleted', 'Days Ago', 'Actions'].map((h) => <th key={h}>{h}</th>)
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  {tab === 'deleted' && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        aria-label={`Select ${u.email}`}
                      />
                    </td>
                  )}
                  <td>{u.name || '—'}</td>
                  <td>{u.email}</td>
                  <td><span className={`role ${u.role}`}>{u.role}</span></td>
                  {tab === 'active' ? (
                    <>
                      <td>{u.verified ? 'Yes' : 'No'}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn small" onClick={() => modal.alert(JSON.stringify(u, null, 2), 'User Details')}>View</button>
                          {u.role !== 'admin' ? (
                            <button className="btn small" onClick={() => makeAdmin(u.id)}>Make Admin</button>
                          ) : (
                            <button className="btn small" onClick={() => removeAdmin(u.id)}>Remove Admin</button>
                          )}
                          <button className="btn small danger" onClick={() => removeUser(u.id)}>Remove</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{new Date(u.deleted_at).toLocaleDateString()}</td>
                      <td>{u.days_deleted} days</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn small primary" onClick={() => restoreUser(u.id)}>Restore</button>
                          <button className="btn small danger" onClick={() => permanentlyDeleteUser(u.id)}>Delete Forever</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={tab === 'deleted' ? 7 : 5} style={{ padding: '1rem', color: '#666' }}>
                    {tab === 'deleted' ? 'No deleted users found.' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
