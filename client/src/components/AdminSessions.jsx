import React, { useEffect, useMemo, useState } from 'react';
import './AdminTraffic.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

function formatTime(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatFullTime(ts) {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
  });
}

// Small source logos (same style as AdminTraffic)
const logos = {
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="ig-small-sessions" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f58529"/>
          <stop offset="50%" stopColor="#dd2a7b"/>
          <stop offset="100%" stopColor="#8134af"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-small-sessions)"/>
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="#fff" strokeWidth="2"/>
      <circle cx="17" cy="7" r="1.3" fill="#fff"/>
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#1877f2"/>
      <path d="M16 8h-2c-.5 0-1 .5-1 1v2h3l-.5 3h-2.5v7h-3v-7H8v-3h2V9c0-2 1.5-4 4-4h2v3z" fill="#fff"/>
    </svg>
  ),
  youtube: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="6" width="20" height="12" rx="3" fill="#ff0000"/>
      <polygon points="10,9 16,12 10,15" fill="#ffffff"/>
    </svg>
  ),
  google: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  ),
  other: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#666"/>
      <path d="M2 12h20M12 2v20" stroke="#fff" strokeWidth="1.5" opacity="0.6"/>
      <circle cx="12" cy="12" r="5" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.9"/>
    </svg>
  )
};

export default function AdminSessions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(0);

  const [filterSource, setFilterSource] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterVisitorId, setFilterVisitorId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function loadSessions(nextPage = 0) {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterSource) params.set('source', filterSource);
      if (filterUserId) params.set('user_id', filterUserId);
      if (filterVisitorId) params.set('visitor_id', filterVisitorId);
      params.set('limit', '50');
      params.set('offset', String(nextPage * 50));
      const res = await fetch(`${API_BASE}/api/admin/sessions?${params.toString()}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load sessions');
      setSessions(Array.isArray(json.sessions) ? json.sessions : []);
      setPage(nextPage);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  async function openSession(id) {
    try {
      setSelectedId(id);
      setModalOpen(true);
      setDetail(null);
      setEvents([]);
      const [res1, res2] = await Promise.all([
        fetch(`${API_BASE}/api/admin/sessions/${id}`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/admin/sessions/${id}/events`, { credentials: 'include' })
      ]);
      const json1 = await res1.json();
      const json2 = await res2.json();
      if (!res1.ok) throw new Error(json1.error || 'Failed to load session');
      if (!res2.ok) throw new Error(json2.error || 'Failed to load events');
      setDetail(json1.session || null);
      setEvents(Array.isArray(json2.events) ? json2.events : []);
    } catch (e) {
      setError(e.message || 'Failed to load session');
    }
  }

  useEffect(() => { loadSessions(0); /* eslint-disable-line */ }, []);
  useEffect(() => { loadSessions(0); /* eslint-disable-line */ }, [filterSource]);

  if (loading) return <div style={{ padding: 16 }}>Loading sessions…</div>;
  if (error) return <div style={{ padding: 16, color: '#b91c1c' }}>Error: {error}</div>;

  const isEnded = (s) => (s.ended_at || (Date.now() - new Date(s.last_seen_at).getTime() > 30*60*1000));

  return (
    <div className="admin-traffic">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Sessions</div>
        </div>
      </div>

      <div className="traffic-table-wrap" style={{ display: 'grid', gridTemplateColumns: filtersOpen ? '1fr 300px' : '1fr', gap: 12, alignItems: 'start', marginTop: 16 }}>
        <div className="table-card" style={{ background: 'transparent', border: 'none' }}>
          <div style={{ padding: 16 }}>
            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              {sessions.map((s) => (
                <button
                  key={s.session_id}
                  onClick={() => openSession(s.session_id)}
                  style={{
                    position: 'relative',
                    textAlign: 'left',
                    background: '#ffffff',
                    border: '2px solid #e1e5e9',
                    borderBottom: '3px solid var(--accent)',
                    borderRadius: 14,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#e1e5e9';
                  }}
                >
                  {/* Colored left accent strip */}
                  <div style={{ 
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background: `linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%)`
                  }} />

                  {/* Card content - single row layout */}
                  <div style={{ padding: '14px 16px 14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Left: Logo and first source */}
                    <div style={{ 
                      width: 52, 
                      height: 52,
                      minWidth: 52,
                      borderRadius: 12, 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f8f9fa',
                      border: '2px solid #e5e7eb',
                      position: 'relative'
                    }}>
                      {logos[(s.visitor_source || 'other')] || logos.other}
                      <div style={{
                        position: 'absolute',
                        bottom: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#111',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        border: '1.5px solid #fff'
                      }}>
                        {s.visitor_source || 'other'}
                      </div>
                    </div>

                    {/* Middle: Time info in compact grid */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 3 }}>Started</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{formatTime(s.started_at)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#666', fontWeight: 600, marginBottom: 3 }}>Last Seen</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{formatTime(s.last_seen_at)}</div>
                      </div>
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <div style={{ 
                          background: '#f3f4f6', 
                          padding: '4px 10px', 
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Source</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{s.source || 'other'}</span>
                        </div>
                        <div style={{ 
                          background: '#f3f4f6', 
                          padding: '4px 10px', 
                          borderRadius: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>Pages</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>{s.page_count}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status badge */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '2px solid',
                        borderColor: isEnded(s) ? '#e5e7eb' : '#86efac',
                        color: isEnded(s) ? '#6b7280' : '#166534',
                        background: isEnded(s) ? '#f9fafb' : '#dcfce7',
                        minWidth: 70,
                        textAlign: 'center'
                      }}>
                        {isEnded(s) ? 'Ended' : 'Active'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="pagination-controls" style={{ marginTop: 12 }}>
              <button className="btn pagination-btn" onClick={() => { if (page>0) loadSessions(page-1); }} disabled={page===0} style={{ opacity: page === 0 ? 0.5 : 1 }}>Previous</button>
              <button className="btn pagination-btn" onClick={() => loadSessions(page+1)}>Next</button>
            </div>
          </div>
        </div>

        {filtersOpen && (
          <aside className="filters-card">
            <div className="filters-header">Filters</div>
            <div className="filters-body">
              <label className="field">
                <div className="label">Source</div>
                <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                  <option value="">All sources</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="google">Google</option>
                  <option value="other">Others</option>
                </select>
              </label>
              <label className="field">
                <div className="label">User ID</div>
                <input value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} placeholder="UUID" />
              </label>
              <label className="field">
                <div className="label">Visitor ID</div>
                <input value={filterVisitorId} onChange={(e) => setFilterVisitorId(e.target.value)} placeholder="UUID" />
              </label>
              <div className="filter-buttons">
                <button className="btn primary" onClick={() => loadSessions(0)}>Apply</button>
                <button className="btn" onClick={() => { setFilterSource(''); setFilterUserId(''); setFilterVisitorId(''); loadSessions(0); }}>Reset</button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Modal for session details - Redesigned */}
      {modalOpen && selectedId && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content session-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 42, 
                  height: 42, 
                  borderRadius: 10, 
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(9, 105, 218, 0.25)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.2 4.2l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.2-4.2l4.2-4.2"/>
                  </svg>
                </div>
                <div>
                  <h2 className="modal-title" style={{ marginBottom: 2 }}>Session Details</h2>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Complete session analytics & tracking data</div>
                </div>
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {detail ? (
                <div className="session-details-content">
                  {/* Status and Source Banner */}
                  <div className="session-status-banner">
                    <div className="status-sources">
                      <div className="source-item">
                        <div className="source-icon">
                          {logos[(detail.visitor_source || 'other')] || logos.other}
                        </div>
                        <div className="source-info">
                          <div className="source-label">Visitor Source</div>
                          <div className="source-value">{detail.visitor_source || 'other'}</div>
                        </div>
                      </div>
                      <div className="source-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                      <div className="source-item">
                        <div className="source-icon">
                          {logos[(detail.source || 'other')] || logos.other}
                        </div>
                        <div className="source-info">
                          <div className="source-label">Session Source</div>
                          <div className="source-value">{detail.source || 'other'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="status-badge-container">
                      <span className={`status-badge ${(detail.ended_at || (Date.now() - new Date(detail.last_seen_at).getTime() > 30*60*1000)) ? 'ended' : 'active'}`}>
                        <span className="status-dot"></span>
                        {(detail.ended_at || (Date.now() - new Date(detail.last_seen_at).getTime() > 30*60*1000)) ? 'Ended' : 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Session Metrics Cards */}
                  <div className="session-metrics-grid">
                    <div className="metric-card">
                      <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                      </div>
                      <div className="metric-info">
                        <div className="metric-label">Started</div>
                        <div className="metric-value">{formatTime(detail.started_at)}</div>
                        <div className="metric-subtitle">{new Date(detail.started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                      </div>
                      <div className="metric-info">
                        <div className="metric-label">Last Seen</div>
                        <div className="metric-value">{formatTime(detail.last_seen_at)}</div>
                        <div className="metric-subtitle">{new Date(detail.last_seen_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                          <line x1="12" y1="18" x2="12" y2="12"/>
                          <line x1="9" y1="15" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <div className="metric-info">
                        <div className="metric-label">Pages Viewed</div>
                        <div className="metric-value">{detail.page_count}</div>
                        <div className="metric-subtitle">{detail.page_count === 1 ? 'Single page' : 'Multiple pages'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Session Information Card */}
                  <div className="info-section">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="16" x2="12" y2="12"/>
                        <line x1="12" y1="8" x2="12.01" y2="8"/>
                      </svg>
                      Session Information
                    </div>
                    <div className="info-grid">
                      <div className="info-item">
                        <div className="info-label">Session ID</div>
                        <div className="info-value info-code">{detail.id}</div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Visitor ID</div>
                        <div className="info-value info-code">{detail.visitor_id}</div>
                      </div>
                      <div className="info-item full-width">
                        <div className="info-label">User</div>
                        <div className="info-value">
                          {detail.user_id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img 
                                src={detail.user_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(detail.user_name || detail.user_email || 'User')}&background=0969da&color=fff&size=40`}
                                alt={detail.user_name || detail.user_email}
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #e5e7eb'
                                }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 2 }}>
                                  {detail.user_name || detail.user_email}
                                </div>
                                {detail.user_name && detail.user_email && (
                                  <div style={{ fontSize: 12, color: '#666' }}>
                                    {detail.user_email}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: '#f3f4f6',
                                border: '2px solid #e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                  <circle cx="12" cy="7" r="4"/>
                                </svg>
                              </div>
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 14 }}>Guest User</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="info-item">
                        <div className="info-label">Landing Path</div>
                        <div className="info-value info-path">{detail.landing_path || '/'}</div>
                      </div>
                      {detail.referrer !== undefined && (
                        <div className="info-item full-width">
                          <div className="info-label">Referrer</div>
                          <div className="info-value info-url">{detail.referrer || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Direct traffic</span>}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technical Details Card */}
                  <div className="info-section">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      Technical Details
                    </div>
                    <div className="info-grid">
                      {detail.ip && (
                        <div className="info-item">
                          <div className="info-label">IP Address</div>
                          <div className="info-value info-code">{detail.ip}</div>
                        </div>
                      )}
                      <div className="info-item">
                        <div className="info-label">Session Ended</div>
                        <div className="info-value">
                          {(detail.ended_at || (Date.now() - new Date(detail.last_seen_at).getTime() > 30*60*1000)) 
                            ? (detail.ended_at ? new Date(detail.ended_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Ended (inferred)') 
                            : <span style={{ color: '#10b981', fontWeight: 600 }}>Active Session</span>}
                        </div>
                      </div>
                      {detail.user_agent && (
                        <div className="info-item full-width">
                          <div className="info-label">User Agent</div>
                          <div className="info-value info-small">{detail.user_agent}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Events Timeline */}
                  <div className="info-section events-section">
                    <div className="section-header">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                      Session Events Timeline
                      <span className="event-count">{events.length} {events.length === 1 ? 'event' : 'events'}</span>
                    </div>
                    {events.length > 0 ? (
                      <div className="events-timeline">
                        {events.map((e, idx) => (
                          <div key={idx} className="event-item">
                            <div className="event-marker">
                              <div className="event-dot"></div>
                              {idx !== events.length - 1 && <div className="event-line"></div>}
                            </div>
                            <div className="event-content">
                              <div className="event-header">
                                <div className="event-time">{formatTime(e.occurred_at)}</div>
                                <div className="event-time-full">{new Date(e.occurred_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                              </div>
                              <div className="event-path">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                </svg>
                                {e.path || '/'}
                              </div>
                              {e.referrer && (
                                <div className="event-referrer">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                                  </svg>
                                  from {e.referrer}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="8" x2="12" y2="12"/>
                          <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div className="empty-title">No Events Recorded</div>
                        <div className="empty-description">This session doesn't have any tracked events yet.</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <div style={{ marginTop: 12, fontSize: 14, color: 'var(--text-muted)' }}>Loading session details...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
