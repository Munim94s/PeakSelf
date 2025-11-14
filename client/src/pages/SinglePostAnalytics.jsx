import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Eye, Clock, TrendingUp, Share2, MousePointerClick, 
  Users, ArrowLeft, Target, Activity, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import SkeletonGrid from '../components/SkeletonGrid';
import '../components/AdminContent.css';
import '../components/AdminSessions.css';

export default function SinglePostAnalytics() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [audience, setAudience] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [postId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [postRes, audienceRes, heatmapRes, timelineRes] = await Promise.all([
        api.get(`/api/admin/blog-analytics/${postId}`),
        api.get(`/api/admin/blog-analytics/${postId}/audience`),
        api.get(`/api/admin/blog-analytics/${postId}/heatmap`),
        api.get(`/api/admin/blog-analytics/${postId}/timeline?days=30`)
      ]);
      
      setPost(postRes.data.data.post);
      setTrends(postRes.data.data.trends);
      setAnalytics(postRes.data.data.post);
      setAudience(audienceRes.data.data || {});
      setHeatmap(heatmapRes.data.data || {});
      setTimeline(timelineRes.data.data.timeline || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  };

  const formatTime = (seconds) => {
    const numSeconds = Number(seconds);
    if (!numSeconds) return '0.00s';
    if (numSeconds < 60) return `${numSeconds.toFixed(2)}s`;
    const mins = Math.floor(numSeconds / 60);
    const secs = numSeconds % 60;
    return secs > 0 ? `${mins}m ${secs.toFixed(2)}s` : `${mins}m`;
  };

  const getTrafficSourceColor = (source) => {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('google') || sourceLower.includes('search') || sourceLower.includes('organic')) return '#4285F4';
    if (sourceLower.includes('facebook')) return '#1877F2';
    if (sourceLower.includes('twitter') || sourceLower.includes('x.com')) return '#1DA1F2';
    if (sourceLower.includes('linkedin')) return '#0A66C2';
    if (sourceLower.includes('instagram')) return '#E4405F';
    if (sourceLower.includes('youtube')) return '#FF0000';
    if (sourceLower.includes('direct')) return '#6B7280';
    if (sourceLower.includes('referral')) return '#8B5CF6';
    if (sourceLower.includes('social')) return '#EC4899';
    if (sourceLower.includes('email')) return '#F59E0B';
    if (sourceLower.includes('reddit')) return '#FF4500';
    if (sourceLower.includes('pinterest')) return '#E60023';
    return '#64748B'; // default color for other sources
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="traffic-toolbar">
          <div className="toolbar-top">
            <div className="title">Post Analytics</div>
          </div>
        </div>
        <SkeletonGrid cards={8} type="stat" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="admin-content">
        <div className="traffic-toolbar">
          <div className="toolbar-top">
            <div className="title">Post Not Found</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <BarChart3 size={48} style={{ color: '#999', margin: '0 auto 1rem' }} />
          <p style={{ color: '#666', fontWeight: 600 }}>Post not found</p>
          <button className="btn small" onClick={() => navigate('/admin/blog-analytics')}>
            ← Back to Analytics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      {/* Header */}
      <div className="traffic-toolbar">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="btn small" 
            onClick={() => navigate('/admin/blog-analytics')}
            style={{ padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            <ArrowLeft size={12} style={{ marginRight: 3 }} />
            Back
          </button>
          <button 
            className="btn small" 
            onClick={() => navigate(`/admin/content/edit?id=${post.id}`)}
            style={{ padding: '4px 8px', fontSize: 11, whiteSpace: 'nowrap' }}
          >
            Edit Post
          </button>
        </div>
        <div className="toolbar-top">
          <div className="title" style={{ width: '100%' }}>{post.title}</div>
        </div>
        <div style={{ fontSize: 11, color: '#666', padding: '0.5rem 0 0 0' }}>
          Status: <span style={{ fontWeight: 700 }}>{post.status}</span> • Created {new Date(post.created_at).toLocaleDateString()}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="card-grid" style={{ gap: '1rem' }}>
        <StatCard icon={Eye} title="Total Views" value={formatNumber(analytics.total_views || 0)} trend={trends?.views_trend} color="#3b82f6" />
        <StatCard icon={Activity} title="Engagement Rate" value={`${Math.round(analytics.engagement_rate || 0)}%`} trend={trends?.engagement_trend} color="#10b981" />
        <StatCard icon={Clock} title="Avg Time" value={formatTime(analytics.avg_time_on_page || 0)} color="#f59e0b" />
        <StatCard icon={Target} title="Avg Scroll" value={`${Math.round(analytics.avg_scroll_depth || 0)}%`} color="#8b5cf6" />
        <StatCard icon={Users} title="Unique Visitors" value={formatNumber(analytics.unique_visitors || 0)} color="#06b6d4" />
        <StatCard icon={Share2} title="Total Shares" value={formatNumber(analytics.total_shares || 0)} color="#ec4899" />
        <StatCard icon={MousePointerClick} title="CTA Clicks" value={formatNumber(analytics.cta_clicks || 0)} color="#f97316" />
        <StatCard icon={BarChart3} title="Score" value={Math.round(analytics.engagement_score || 0)} color="#6366f1" />
      </div>

      {/* Performance Timeline */}
      {timeline && timeline.length > 0 && (
        <div style={{ 
          border: '1px solid #d0d0d0', 
          borderRadius: 16, 
          background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginTop: '1.5rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={20} style={{ color: '#3b82f6' }} />
            Performance Over Time
          </h3>
          <p style={{ fontSize: 13, color: '#666', marginBottom: '1rem' }}>Last 30 days trend</p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="stat_date" 
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#666' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#666' }} />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #d0d0d0', 
                  borderRadius: 8,
                  fontSize: 12,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="views" 
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Views"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="engagement_rate" 
                stroke="#10b981" 
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Engagement %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reading Progression & Share Breakdown */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginTop: '1.5rem'
      }}>
        <ChartCard title="Reading Progression" subtitle="How far do readers scroll?">
          <ResponsiveContainer width="100%" height={250}>
            <RechartsBarChart data={[
              { label: 'Started', value: analytics.total_views || 0, color: '#3b82f6' },
              { label: '25%', value: analytics.scroll_25_percent || 0, color: '#10b981' },
              { label: '50%', value: analytics.scroll_50_percent || 0, color: '#f59e0b' },
              { label: '75%', value: analytics.scroll_75_percent || 0, color: '#8b5cf6' },
              { label: 'Completed', value: analytics.scroll_100_percent || 0, color: '#ef4444' }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#666' }} />
              <YAxis tick={{ fontSize: 11, fill: '#666' }} />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #d0d0d0', 
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {[
                  { label: 'Started', value: analytics.total_views || 0, color: '#3b82f6' },
                  { label: '25%', value: analytics.scroll_25_percent || 0, color: '#10b981' },
                  { label: '50%', value: analytics.scroll_50_percent || 0, color: '#f59e0b' },
                  { label: '75%', value: analytics.scroll_75_percent || 0, color: '#8b5cf6' },
                  { label: 'Completed', value: analytics.scroll_100_percent || 0, color: '#ef4444' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
          {analytics.total_views > 0 && (
            <div style={{ marginTop: 12, padding: 12, background: '#f0f0f0', borderRadius: 8, border: '1px solid #d0d0d0', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: '#111' }}>
                <strong style={{ fontSize: 20, color: '#10b981' }}>{Math.round((analytics.scroll_100_percent / analytics.total_views) * 100)}%</strong> completed the article
              </span>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Share Breakdown" subtitle="How content is being shared">
          {(analytics.twitter_shares || analytics.facebook_shares || analytics.linkedin_shares || analytics.copy_link_count) ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Twitter', value: analytics.twitter_shares || 0, color: '#1DA1F2' },
                      { name: 'Facebook', value: analytics.facebook_shares || 0, color: '#1877F2' },
                      { name: 'LinkedIn', value: analytics.linkedin_shares || 0, color: '#0A66C2' },
                      { name: 'Copy Link', value: analytics.copy_link_count || 0, color: '#6366f1' }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent >= 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    stroke="none"
                  >
                    {[
                      { name: 'Twitter', value: analytics.twitter_shares || 0, color: '#1DA1F2' },
                      { name: 'Facebook', value: analytics.facebook_shares || 0, color: '#1877F2' },
                      { name: 'LinkedIn', value: analytics.linkedin_shares || 0, color: '#0A66C2' },
                      { name: 'Copy Link', value: analytics.copy_link_count || 0, color: '#6366f1' }
                    ].filter(item => item.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#fff', 
                      border: '1px solid #d0d0d0', 
                      borderRadius: 8,
                      fontSize: 12
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 12 }}>
                {[
                  { name: 'Twitter', value: analytics.twitter_shares || 0, color: '#1DA1F2' },
                  { name: 'Facebook', value: analytics.facebook_shares || 0, color: '#1877F2' },
                  { name: 'LinkedIn', value: analytics.linkedin_shares || 0, color: '#0A66C2' },
                  { name: 'Copy Link', value: analytics.copy_link_count || 0, color: '#6366f1' }
                ].filter(item => item.value > 0).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: item.color }} />
                      {item.name}
                    </span>
                    <strong>{formatNumber(item.value)}</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>No share data yet</p>
          )}
        </ChartCard>
      </div>

      {/* Traffic Sources */}
      <ChartCard title="Traffic Sources" subtitle="Where readers come from">
        {audience?.traffic_sources?.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={audience.traffic_sources.map(source => ({
                    name: source.traffic_source.charAt(0).toUpperCase() + source.traffic_source.slice(1),
                    value: source.count
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent >= 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="none"
                >
                  {audience.traffic_sources.map((source, index) => (
                    <Cell key={`cell-${index}`} fill={getTrafficSourceColor(source.traffic_source)} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #d0d0d0', 
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 12 }}>
              {audience.traffic_sources.map((source, idx) => {
                const total = audience.traffic_sources.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? ((source.count / total) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 2, background: getTrafficSourceColor(source.traffic_source) }} />
                      <span style={{ textTransform: 'capitalize' }}>{source.traffic_source}</span>
                    </span>
                    <strong>{formatNumber(source.count)} ({percentage}%)</strong>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>No traffic data yet</p>
        )}
      </ChartCard>

      {/* Engagement Details */}
      {heatmap?.time_distribution && (
        <ChartCard title="Time Spent Distribution" subtitle="How long readers stay">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={Object.entries(heatmap.time_distribution).map(([range, count]) => ({
                  name: range,
                  value: count
                }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent >= 0.01 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                stroke="none"
              >
                {Object.entries(heatmap.time_distribution).map((entry, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #d0d0d0', 
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 12 }}>
            {Object.entries(heatmap.time_distribution).map(([range, count], idx) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
              const total = Object.values(heatmap.time_distribution).reduce((sum, c) => sum + c, 0);
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              return (
                <div key={range} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: colors[idx % colors.length] }} />
                    {range}
                  </span>
                  <strong>{formatNumber(count)} ({percentage}%)</strong>
                </div>
              );
            })}
          </div>
        </ChartCard>
      )}

      {/* Audience Insights */}
      {audience && (
        <div style={{
          border: '1px solid #d0d0d0',
          borderRadius: 12,
          padding: '1.5rem',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginTop: '1rem'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} />
            Audience Insights
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>Visitor Type</div>
              <div style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>New</span>
                  <strong>{audience.visitor_types?.new_visitors || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Returning</span>
                  <strong>{audience.visitor_types?.returning_visitors || 0}</strong>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 8, textTransform: 'uppercase' }}>User Segments</div>
              <div style={{ fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Anonymous</span>
                  <strong>{audience.user_segments?.anonymous || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Registered</span>
                  <strong>{audience.user_segments?.registered || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, trend, color = '#111' }) {
  return (
    <div style={{
      border: '1px solid #e0e0e0',
      borderRadius: 12,
      padding: '1.25rem',
      background: '#fff',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ 
          background: `${color}15`,
          padding: 8,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div style={{ fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#111', marginLeft: 42 }}>{value}</div>
      {trend && trend !== '0%' && (
        <div style={{ fontSize: 11, color: trend.startsWith('+') ? '#16a34a' : '#dc2626', fontWeight: 600, marginTop: 4, marginLeft: 42 }}>
          {trend}
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      border: '1px solid #d0d0d0',
      borderRadius: 16,
      padding: '1.5rem',
      background: '#fff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e5e5' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: 4 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: '#666' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ label, value, max, color }) {
  const percentage = max > 0 ? (value / max * 100) : 0;
  
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: '#666' }}>{new Intl.NumberFormat().format(value)}</span>
      </div>
      <div style={{ width: '100%', height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${Math.min(percentage, 100)}%`, 
            height: '100%', 
            background: color,
            transition: 'width 0.3s ease'
          }} 
        />
      </div>
    </div>
  );
}
