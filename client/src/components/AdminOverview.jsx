import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Mail, Instagram, Facebook, Youtube, Globe } from 'lucide-react';
import { apiFetch } from '../utils/api';
import './AdminContent.css';
import './AdminSessions.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch(`${API_BASE}/api/admin/overview`, {});
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/not-accessible';
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load dashboard');
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ padding: '1rem' }}>Loading overview…</div>;
  if (error) return <div style={{ padding: '1rem', color: '#b91c1c' }}>Error: {error}</div>;

  const d = data || {};
  const subtitle = d.snapshot_at ? new Date(d.snapshot_at).toLocaleString() : (d.source === 'live' ? 'live' : '');

  return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Overview</div>
        </div>
        <div className="traffic-chip-row">
          <div style={{ fontSize: 12, color: '#666' }}>Source: {d.source || 'snapshot'} {subtitle && `• ${subtitle}`}</div>
        </div>
      </div>

      <div className="card-grid">
        <StatCard icon={Users} title="Total Users" value={fmt(d.total_users)} subtitle={d.signups_24h != null ? `+${fmt(d.signups_24h)} / 24h` : ''} />
        <StatCard icon={UserCheck} title="Verified Users" value={fmt(d.verified_users)} subtitle="" />
        <StatCard icon={Mail} title="Newsletter Subs" value={fmt(d.newsletter_total)} subtitle={d.newsletter_signups_24h != null ? `+${fmt(d.newsletter_signups_24h)} / 24h` : ''} />
        <StatCard icon={Instagram} title="Sessions • Instagram" value={fmt(d.sessions_instagram)} subtitle={"last 7 days"} color="#E4405F" />
        <StatCard icon={Facebook} title="Sessions • Facebook" value={fmt(d.sessions_facebook)} subtitle={"last 7 days"} color="#1877F2" />
        <StatCard icon={Youtube} title="Sessions • YouTube" value={fmt(d.sessions_youtube)} subtitle={"last 7 days"} color="#FF0000" />
        <StatCard icon={GoogleIcon} title="Sessions • Google" value={fmt(d.sessions_google)} subtitle={"last 7 days"} color="#4285F4" />
        <StatCard icon={Globe} title="Sessions • Others" value={fmt(d.sessions_others)} subtitle={"last 7 days"} color="#6366F1" />
      </div>

      {Array.isArray(d.sessions_others_refs) && d.sessions_others_refs.length > 0 && (
        <div className="content-card">
          <div className="content-title">Top "Others" Referrers (7d)</div>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 18 }}>
            {d.sessions_others_refs.map((ref, idx) => (
              <li key={idx} style={{ color: '#444', fontSize: 13, marginTop: 4 }}>{String(ref)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtitle, color }) {
  return (
    <div style={{
      border: '1px solid #d0d0d0',
      borderRadius: 12,
      padding: '1.25rem',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{title}</div>
        {Icon && <Icon size={20} style={{ color: color || '#666', opacity: 0.7 }} />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{subtitle}</div>}
    </div>
  );
}

// Custom Google Icon (multicolor G)
function GoogleIcon({ size = 20, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function fmt(n) {
  if (n == null) return '-';
  try { return Number(n).toLocaleString(); } catch { return String(n); }
}
