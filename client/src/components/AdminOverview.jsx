import React, { useEffect, useState } from 'react';
import { Users, UserCheck, Mail, Instagram, Facebook, Youtube, Globe, ExternalLink, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { apiClient, endpoints, response } from '../api';
import SkeletonGrid from './SkeletonGrid';
import './AdminContent.css';
import './AdminSessions.css';

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Add timestamp to bust any stale cache
        const { data } = await apiClient.get(`${endpoints.admin.overview}?t=${Date.now()}`);
        if (!cancelled) setData(data);
      } catch (e) {
        if (!cancelled) setError(response.getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTimeline() {
      try {
        const { data } = await apiClient.get(endpoints.admin.sessionsTimeline);
        if (!cancelled) setTimeline(data.timeline || []);
      } catch (e) {
        console.error('Failed to load timeline:', e);
      } finally {
        if (!cancelled) setTimelineLoading(false);
      }
    }
    loadTimeline();
    return () => { cancelled = true; };
  }, []);

  if (loading) return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Overview</div>
        </div>
      </div>
      <SkeletonGrid cards={8} type="stat" />
    </div>
  );
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

      {/* Sessions Timeline Chart */}
      <div style={{ marginTop: '1.5rem' }}>
        <SessionsTimelineChart data={timeline} loading={timelineLoading} />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Session Sources Pie Chart */}
        <ChartCard title="Session Sources" subtitle="Last 7 Days">
          <SessionsPieChart data={{
            instagram: d.sessions_instagram || 0,
            facebook: d.sessions_facebook || 0,
            youtube: d.sessions_youtube || 0,
            google: d.sessions_google || 0,
            others: d.sessions_others || 0
          }} />
        </ChartCard>

        {/* Total Sessions Bar */}
        <ChartCard title="Total Sessions" subtitle="Last 7 Days by Platform">
          <SessionsBarChart data={{
            instagram: d.sessions_instagram || 0,
            facebook: d.sessions_facebook || 0,
            youtube: d.sessions_youtube || 0,
            google: d.sessions_google || 0,
            others: d.sessions_others || 0
          }} />
        </ChartCard>

        {/* User Stats Bar Chart */}
        <ChartCard title="User Overview" subtitle="Current Statistics">
          <UsersBarChart data={{
            total: d.total_users || 0,
            verified: d.verified_users || 0,
            signups24h: d.signups_24h || 0
          }} />
        </ChartCard>

        {/* User Verification Rate */}
        <ChartCard title="Verification Rate" subtitle="User Email Verification">
          <VerificationPieChart data={{
            verified: Number(d.verified_users) || 0,
            unverified: (Number(d.total_users) || 0) - (Number(d.verified_users) || 0)
          }} />
        </ChartCard>

        {/* Newsletter Stats */}
        <ChartCard title="Newsletter Growth" subtitle="Subscriptions">
          <NewsletterBarChart data={{
            total: d.newsletter_total || 0,
            recent: d.newsletter_signups_24h || 0
          }} />
        </ChartCard>

        {/* User Activity Comparison */}
        <ChartCard title="User Activity" subtitle="24-Hour Snapshot">
          <ActivityBarChart data={{
            newUsers: d.signups_24h || 0,
            newNewsletters: d.newsletter_signups_24h || 0
          }} />
        </ChartCard>
      </div>

      {Array.isArray(d.sessions_others_refs) && d.sessions_others_refs.length > 0 && (
        <div style={{
          border: '1px solid #d0d0d0',
          borderRadius: 12,
          padding: '1.5rem',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginTop: '1.5rem'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e5e5e5'
          }}>
            <TrendingUp size={18} style={{ color: '#000' }} />
            <h3 style={{ 
              fontSize: 16, 
              fontWeight: 800, 
              color: '#000',
              margin: 0
            }}>Top "Others" Referrers</h3>
            <span style={{ 
              fontSize: 11, 
              color: '#666', 
              marginLeft: 'auto',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>Last 7 Days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {d.sessions_others_refs.map((ref, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0.75rem',
                  background: '#fff',
                  borderRadius: 8,
                  border: '1px solid #ddd',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#999';
                  const badge = e.currentTarget.querySelector('.rank-badge');
                  const icon = e.currentTarget.querySelector('.link-icon');
                  const text = e.currentTarget.querySelector('.ref-text');
                  if (badge) badge.style.background = '#333';
                  if (icon) icon.style.color = '#000';
                  if (text) text.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#ddd';
                  const badge = e.currentTarget.querySelector('.rank-badge');
                  const icon = e.currentTarget.querySelector('.link-icon');
                  const text = e.currentTarget.querySelector('.ref-text');
                  if (badge) badge.style.background = '#000';
                  if (badge) badge.style.color = '#fff';
                  if (icon) icon.style.color = '#666';
                  if (text) text.style.color = '#111';
                }}
              >
                <div className="rank-badge" style={{
                  minWidth: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 900,
                  color: '#fff',
                  flexShrink: 0,
                  transition: 'all 0.2s ease'
                }}>
                  {idx + 1}
                </div>
                <ExternalLink className="link-icon" size={14} style={{ color: '#666', flexShrink: 0, transition: 'all 0.2s ease' }} />
                <span className="ref-text" style={{ 
                  fontSize: 13, 
                  color: '#111',
                  fontWeight: 600,
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}>
                  {String(ref)}
                </span>
              </div>
            ))}
          </div>
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

// Chart Components
function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      border: '1px solid #d0d0d0',
      borderRadius: 12,
      padding: '1.5rem',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#000', margin: 0 }}>{title}</h3>
        {subtitle && <div style={{ fontSize: 11, color: '#666', marginTop: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function SessionsPieChart({ data }) {
  // Convert to numbers and ensure they're valid
  const chartData = [
    { name: 'Instagram', value: Number(data.instagram) || 0, color: '#E4405F' },
    { name: 'Facebook', value: Number(data.facebook) || 0, color: '#1877F2' },
    { name: 'YouTube', value: Number(data.youtube) || 0, color: '#FF0000' },
    { name: 'Google', value: Number(data.google) || 0, color: '#4285F4' },
    { name: 'Others', value: Number(data.others) || 0, color: '#6366F1' }
  ];

  const totalSessions = chartData.reduce((sum, item) => sum + item.value, 0);

  if (totalSessions === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#999', 
        padding: '3rem 1rem',
        background: '#f9f9f9',
        borderRadius: 8,
        border: '1px dashed #ddd'
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No session data</div>
        <div style={{ fontSize: 12 }}>Sessions will appear here once users visit your site</div>
      </div>
    );
  }

  // Filter out zero values for cleaner display
  const displayData = chartData.filter(item => item.value > 0);

  const renderLabel = ({ name, percent }) => {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={displayData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          stroke="none"
          style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {displayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => value.toLocaleString()} 
          contentStyle={{ fontSize: '13px', fontWeight: 600, borderRadius: 8 }}
        />
        <Legend 
          wrapperStyle={{ fontSize: '13px', fontWeight: 600 }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function UsersBarChart({ data }) {
  const chartData = [
    { name: 'Total Users', value: data.total, fill: '#6366F1' },
    { name: 'Verified', value: data.verified, fill: '#10B981' },
    { name: 'Last 24h', value: data.signups24h, fill: '#F59E0B' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => value.toLocaleString()} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function NewsletterBarChart({ data }) {
  const chartData = [
    { name: 'Total Subscribers', value: data.total, fill: '#8B5CF6' },
    { name: 'Last 24h', value: data.recent, fill: '#EC4899' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => value.toLocaleString()} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function VerificationPieChart({ data }) {
  const total = data.verified + data.unverified;
  
  // Debug logging
  console.log('VerificationPieChart data:', { verified: data.verified, unverified: data.unverified, total });
  
  if (total === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#999', 
        padding: '3rem 1rem',
        background: '#f9f9f9',
        borderRadius: 8,
        border: '1px dashed #ddd'
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No user data</div>
        <div style={{ fontSize: 12 }}>User data will appear once you have registrations</div>
      </div>
    );
  }

  const chartData = [
    { name: 'Verified', value: data.verified, color: '#10B981' },
    { name: 'Unverified', value: data.unverified, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const verificationRate = total > 0 ? ((data.verified / total) * 100).toFixed(1) : 0;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: '#10B981' }}>{verificationRate}%</div>
        <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 700 }}>Verification Rate</div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            fill="#8884d8"
            dataKey="value"
            stroke="none"
            style={{ fontSize: '13px', fontWeight: 600 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ fontSize: '13px', fontWeight: 600, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: '13px', fontWeight: 600 }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SessionsBarChart({ data }) {
  const chartData = [
    { name: 'Instagram', value: data.instagram, fill: '#E4405F' },
    { name: 'Facebook', value: data.facebook, fill: '#1877F2' },
    { name: 'YouTube', value: data.youtube, fill: '#FF0000' },
    { name: 'Google', value: data.google, fill: '#4285F4' },
    { name: 'Others', value: data.others, fill: '#6366F1' }
  ].filter(item => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        color: '#999', 
        padding: '3rem 1rem',
        background: '#f9f9f9',
        borderRadius: 8,
        border: '1px dashed #ddd'
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No session data</div>
        <div style={{ fontSize: 12 }}>Sessions will appear here once users visit your site</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 600 }} width={80} />
        <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ fontSize: '13px', fontWeight: 600, borderRadius: 8 }} />
        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityBarChart({ data }) {
  const chartData = [
    { name: 'New Users', value: data.newUsers, fill: '#6366F1' },
    { name: 'New Subscribers', value: data.newNewsletters, fill: '#8B5CF6' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ fontSize: '13px', fontWeight: 600, borderRadius: 8 }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function SessionsTimelineChart({ data, loading }) {
  const [showTotal, setShowTotal] = useState(false);

  if (loading) {
    return (
      <div style={{
        border: '1px solid #d0d0d0',
        borderRadius: 12,
        padding: '1.5rem',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>Loading timeline...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{
        border: '1px solid #d0d0d0',
        borderRadius: 12,
        padding: '1.5rem',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No timeline data available</div>
      </div>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }));

  // Check which platforms have any sessions across all days
  const platformHasSessions = {
    instagram: data.some(d => d.instagram > 0),
    facebook: data.some(d => d.facebook > 0),
    youtube: data.some(d => d.youtube > 0),
    google: data.some(d => d.google > 0),
    others: data.some(d => d.others > 0)
  };

  return (
    <div style={{
      border: '1px solid #d0d0d0',
      borderRadius: 12,
      padding: '1.5rem',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#000', margin: 0 }}>Sessions Over Time</h3>
          <div style={{ fontSize: 11, color: '#666', marginTop: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Last 7 Days</div>
        </div>
        <button
          onClick={() => setShowTotal(!showTotal)}
          style={{
            padding: '0.5rem 1rem',
            background: showTotal ? '#000' : '#fff',
            color: showTotal ? '#fff' : '#000',
            border: '1px solid #000',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!showTotal) {
              e.currentTarget.style.background = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (!showTotal) {
              e.currentTarget.style.background = '#fff';
            }
          }}
        >
          {showTotal ? 'Show Platforms' : 'Show Total Only'}
        </button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fontWeight: 600 }} 
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 11 }} 
            stroke="#666"
          />
          <Tooltip 
            contentStyle={{ fontSize: '12px', fontWeight: 600, borderRadius: 8, border: '1px solid #ddd' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px', fontWeight: 600 }}
            iconType="line"
          />
          
          {showTotal ? (
            <Line 
              type="monotone" 
              dataKey="total" 
              name="Total Sessions"
              stroke="#000" 
              strokeWidth={3}
              dot={{ fill: '#000', r: 4 }}
              activeDot={{ r: 6 }}
            />
          ) : (
            <>
              {platformHasSessions.instagram && (
                <Line 
                  type="monotone" 
                  dataKey="instagram" 
                  name="Instagram"
                  stroke="#E4405F" 
                  strokeWidth={2}
                  dot={{ fill: '#E4405F', r: 3 }}
                />
              )}
              {platformHasSessions.facebook && (
                <Line 
                  type="monotone" 
                  dataKey="facebook" 
                  name="Facebook"
                  stroke="#1877F2" 
                  strokeWidth={2}
                  dot={{ fill: '#1877F2', r: 3 }}
                />
              )}
              {platformHasSessions.youtube && (
                <Line 
                  type="monotone" 
                  dataKey="youtube" 
                  name="YouTube"
                  stroke="#FF0000" 
                  strokeWidth={2}
                  dot={{ fill: '#FF0000', r: 3 }}
                />
              )}
              {platformHasSessions.google && (
                <Line 
                  type="monotone" 
                  dataKey="google" 
                  name="Google"
                  stroke="#34A853" 
                  strokeWidth={2}
                  dot={{ fill: '#34A853', r: 3 }}
                />
              )}
              {platformHasSessions.others && (
                <Line 
                  type="monotone" 
                  dataKey="others" 
                  name="Others"
                  stroke="#6366F1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366F1', r: 3 }}
                />
              )}
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
