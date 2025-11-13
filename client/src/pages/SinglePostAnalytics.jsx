import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Eye, Clock, TrendingUp, Share2, MousePointerClick, 
  Users, ArrowLeft, Target, Activity, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart as RechartsBarChart, Bar } from 'recharts';
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
    if (!seconds) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
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
      <div className="card-grid">
        <StatCard icon={Eye} title="Total Views" value={formatNumber(analytics.total_views || 0)} trend={trends?.views_trend} />
        <StatCard icon={Activity} title="Engagement Rate" value={`${Math.round(analytics.engagement_rate || 0)}%`} trend={trends?.engagement_trend} />
        <StatCard icon={Clock} title="Avg Time" value={formatTime(analytics.avg_time_on_page || 0)} />
        <StatCard icon={Target} title="Avg Scroll" value={`${Math.round(analytics.avg_scroll_depth || 0)}%`} />
        <StatCard icon={Users} title="Unique Visitors" value={formatNumber(analytics.unique_visitors || 0)} />
        <StatCard icon={Share2} title="Total Shares" value={formatNumber(analytics.total_shares || 0)} />
        <StatCard icon={MousePointerClick} title="CTA Clicks" value={formatNumber(analytics.cta_clicks || 0)} />
        <StatCard icon={BarChart3} title="Score" value={Math.round(analytics.engagement_score || 0)} />
      </div>

      {/* Performance Timeline */}
      {timeline && timeline.length > 0 && (
        <div style={{ 
          border: '1px solid #d0d0d0', 
          borderRadius: 12, 
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginTop: '1rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: '1rem' }}>
            Performance Over Time (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
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
                  fontSize: 12
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="views" 
                stroke="#111" 
                strokeWidth={2}
                dot={{ fill: '#111', r: 3 }}
                name="Views"
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="engagement_rate" 
                stroke="#059669" 
                strokeWidth={2}
                dot={{ fill: '#059669', r: 3 }}
                name="Engagement %"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Reading Progression */}
      <ChartCard title="Reading Progression" subtitle="How far do readers scroll?">
        <ProgressBar label="Started Reading" value={analytics.total_views || 0} max={analytics.total_views || 1} color="#111" />
        <ProgressBar label="Read 25%" value={analytics.scroll_25_percent || 0} max={analytics.total_views || 1} color="#111" />
        <ProgressBar label="Read 50%" value={analytics.scroll_50_percent || 0} max={analytics.total_views || 1} color="#111" />
        <ProgressBar label="Read 75%" value={analytics.scroll_75_percent || 0} max={analytics.total_views || 1} color="#111" />
        <ProgressBar label="Read to End" value={analytics.scroll_100_percent || 0} max={analytics.total_views || 1} color="#111" />
        {analytics.total_views > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: '#f0f0f0', borderRadius: 8, border: '1px solid #d0d0d0' }}>
            <span style={{ fontSize: 13, color: '#111' }}>
              <strong>{Math.round((analytics.scroll_100_percent / analytics.total_views) * 100)}%</strong> completed the article
            </span>
          </div>
        )}
      </ChartCard>

      {/* Traffic Sources */}
      <ChartCard title="Traffic Sources" subtitle="Where readers come from">
        {audience?.traffic_sources?.length > 0 ? (
          audience.traffic_sources.map((source, idx) => {
            const total = audience.traffic_sources.reduce((sum, s) => sum + s.count, 0);
            const percentage = total > 0 ? (source.count / total * 100).toFixed(1) : 0;
            return (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{source.traffic_source}</span>
                  <span style={{ color: '#666' }}>{source.count} ({percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: '#111', transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })
        ) : (
          <p style={{ color: '#999', textAlign: 'center', padding: '2rem 0' }}>No traffic data yet</p>
        )}
      </ChartCard>

      {/* Engagement Details */}
      {heatmap?.time_distribution && (
        <ChartCard title="Time Spent Distribution" subtitle="How long readers stay">
          {Object.entries(heatmap.time_distribution).map(([range, count]) => {
            const total = Object.values(heatmap.time_distribution).reduce((sum, c) => sum + c, 0);
            const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
            return (
              <div key={range} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 700 }}>{range}</span>
                  <span style={{ color: '#666' }}>{count} ({percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: 8, background: '#e5e5e5', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: '#111' }} />
                </div>
              </div>
            );
          })}
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

function StatCard({ icon: Icon, title, value, trend }) {
  return (
    <div style={{
      border: '1px solid #d0d0d0',
      borderRadius: 12,
      padding: '1rem',
      background: '#f6f6f6',
      borderLeft: '3px solid #111'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Icon size={16} style={{ color: '#111' }} />
        <div style={{ fontSize: 12, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>{value}</div>
      {trend && trend !== '0%' && (
        <div style={{ fontSize: 11, color: trend.startsWith('+') ? '#16a34a' : '#dc2626', fontWeight: 600, marginTop: 4 }}>
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
      borderRadius: 12,
      padding: '1.5rem',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      marginTop: '1rem'
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
