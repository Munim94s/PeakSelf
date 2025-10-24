import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import './AdminContent.css';
import './AdminTraffic.css';

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
        <StatCard title="Total Users" value={fmt(d.total_users)} subtitle={d.signups_24h != null ? `+${fmt(d.signups_24h)} / 24h` : ''} />
        <StatCard title="Verified Users" value={fmt(d.verified_users)} subtitle="" />
        <StatCard title="Newsletter Subs" value={fmt(d.newsletter_total)} subtitle={d.newsletter_signups_24h != null ? `+${fmt(d.newsletter_signups_24h)} / 24h` : ''} />
        <StatCard title="Sessions • Instagram" value={fmt(d.sessions_instagram)} subtitle={"last 7 days"} />
        <StatCard title="Sessions • Facebook" value={fmt(d.sessions_facebook)} subtitle={"last 7 days"} />
        <StatCard title="Sessions • YouTube" value={fmt(d.sessions_youtube)} subtitle={"last 7 days"} />
        <StatCard title="Sessions • Google" value={fmt(d.sessions_google)} subtitle={"last 7 days"} />
        <StatCard title="Sessions • Others" value={fmt(d.sessions_others)} subtitle={"last 7 days"} />
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

function StatCard({ title, value, subtitle }) {
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
      <div style={{ fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#111', lineHeight: 1 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>{subtitle}</div>}
    </div>
  );
}

function fmt(n) {
  if (n == null) return '-';
  try { return Number(n).toLocaleString(); } catch { return String(n); }
}
