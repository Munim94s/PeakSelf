import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, TrendingUp, Share2, BarChart3, Clock, ChevronLeft, ChevronRight, Activity, Target, Heart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../api/client';
import SkeletonGrid from '../components/SkeletonGrid';
import '../components/AdminContent.css';
import '../components/AdminSessions.css';

export default function BlogAnalytics() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [overview, setOverview] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [topPostsTimeline, setTopPostsTimeline] = useState([]);
  const [timelineMetric, setTimelineMetric] = useState('views');
  const [timelinePosts, setTimelinePosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('engagement_score');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  useEffect(() => {
    fetchData();
  }, [sortBy, sortOrder, currentPage, timelineMetric]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [comparisonRes, overviewRes, timelineRes] = await Promise.all([
        api.get(`/api/admin/blog-analytics/comparison?sort_by=${sortBy}&order=${sortOrder}&page=${currentPage}&limit=${pageSize}`),
        api.get('/api/admin/blog-analytics/'),
        api.get(`/api/admin/blog-analytics/top-posts-timeline?days=30&limit=5&metric=${timelineMetric}`)
      ]);
      
      setPosts(comparisonRes.data?.data?.posts || []);
      setPagination(comparisonRes.data?.data?.pagination || null);
      setOverview(overviewRes.data?.data?.overview || {});
      setTopPosts(overviewRes.data?.data?.top_posts_week || []);
      setTopPostsTimeline(timelineRes.data?.data?.timeline || []);
      setTimelinePosts(timelineRes.data?.data?.posts || []);
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

  const getEngagementColor = (rate) => {
    if (!rate) return '#e5e5e5';
    if (rate >= 70) return '#dcfce7'; // green
    if (rate >= 50) return '#dbeafe'; // blue
    if (rate >= 30) return '#fef3c7'; // yellow
    return '#fee2e2'; // red
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    // Reset to page 1 when sorting changes
    setSearchParams({ page: '1' });
  };

  const handlePageChange = (newPage) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-gray-400">⇅</span>;
    return sortOrder === 'DESC' ? <span>↓</span> : <span>↑</span>;
  };

  if (loading) {
    return (
      <div className="admin-content">
        <div className="traffic-toolbar">
          <div className="toolbar-top">
            <div className="title">Blog Analytics</div>
          </div>
        </div>
        <SkeletonGrid cards={4} type="stat" />
        <div style={{ marginTop: '1rem' }}>
          <SkeletonGrid cards={1} type="content" />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Blog Analytics</div>
        </div>
        <div style={{ fontSize: 12, color: '#666', padding: '0 0 0.5rem 0' }}>
          Compare performance across all blog posts
        </div>
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <StatCard icon={Eye} title="Total Views" value={formatNumber(overview.total_views)} color="#3b82f6" />
          <StatCard icon={TrendingUp} title="Avg Engagement" value={overview.avg_engagement_rate ? `${Math.round(overview.avg_engagement_rate)}%` : '0%'} color="#10b981" />
          <StatCard icon={Heart} title="Total Likes" value={formatNumber(overview.total_likes)} color="#ef4444" />
          <StatCard icon={Share2} title="Total Shares" value={formatNumber(overview.total_shares)} color="#8b5cf6" />
          <StatCard icon={Clock} title="Avg Time" value={formatTime(overview.avg_time_on_page || 0)} color="#f59e0b" />
        </div>
      )}

      {/* Top 5 Posts Performance Over Time */}
      {topPostsTimeline && topPostsTimeline.length > 0 && (
        <div style={{ 
          border: '1px solid #d0d0d0', 
          borderRadius: 16, 
          background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginTop: '1.5rem',
          padding: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={20} style={{ color: '#3b82f6' }} />
                Top 5 Posts Performance
              </h3>
              <p style={{ fontSize: 13, color: '#666' }}>Last 30 days trend</p>
            </div>
            <div style={{ display: 'flex', gap: 8, background: '#f0f0f0', padding: 4, borderRadius: 8 }}>
              <button
                onClick={() => setTimelineMetric('views')}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: timelineMetric === 'views' ? '#3b82f6' : 'transparent',
                  color: timelineMetric === 'views' ? '#fff' : '#666'
                }}
              >
                <Eye size={14} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
                Views
              </button>
              <button
                onClick={() => setTimelineMetric('engagement')}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: timelineMetric === 'engagement' ? '#10b981' : 'transparent',
                  color: timelineMetric === 'engagement' ? '#fff' : '#666'
                }}
              >
                <TrendingUp size={14} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
                Engagement
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={topPostsTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 11, fill: '#666' }} />
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
              {timelinePosts.slice(0, 5).map((post, idx) => {
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];
                return (
                  <Line 
                    key={post.id}
                    type="monotone" 
                    dataKey={post.title} 
                    stroke={colors[idx]} 
                    strokeWidth={2.5}
                    dot={{ fill: colors[idx], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Engagement Distribution */}
      {posts && posts.length > 0 && (
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          marginTop: '1.5rem'
        }}>
          <div style={{ 
            border: '1px solid #d0d0d0', 
            borderRadius: 16, 
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={18} style={{ color: '#10b981' }} />
              Engagement Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={[
                { range: 'Low (0-30%)', count: posts.filter(p => (p.engagement_rate || 0) < 30).length, color: '#ef4444' },
                { range: 'Medium (30-50%)', count: posts.filter(p => (p.engagement_rate || 0) >= 30 && (p.engagement_rate || 0) < 50).length, color: '#f59e0b' },
                { range: 'Good (50-70%)', count: posts.filter(p => (p.engagement_rate || 0) >= 50 && (p.engagement_rate || 0) < 70).length, color: '#3b82f6' },
                { range: 'High (70%+)', count: posts.filter(p => (p.engagement_rate || 0) >= 70).length, color: '#10b981' }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#666' }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #d0d0d0', 
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {[
                    { range: 'Low (0-30%)', count: posts.filter(p => (p.engagement_rate || 0) < 30).length, color: '#ef4444' },
                    { range: 'Medium (30-50%)', count: posts.filter(p => (p.engagement_rate || 0) >= 30 && (p.engagement_rate || 0) < 50).length, color: '#f59e0b' },
                    { range: 'Good (50-70%)', count: posts.filter(p => (p.engagement_rate || 0) >= 50 && (p.engagement_rate || 0) < 70).length, color: '#3b82f6' },
                    { range: 'High (70%+)', count: posts.filter(p => (p.engagement_rate || 0) >= 70).length, color: '#10b981' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ 
            border: '1px solid #d0d0d0', 
            borderRadius: 16, 
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} style={{ color: '#8b5cf6' }} />
              Views Comparison
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={posts.slice(0, 5).map(p => ({ 
                name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
                views: p.total_views || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #d0d0d0', 
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="views" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
          
          <div style={{ 
            border: '1px solid #d0d0d0', 
            borderRadius: 16, 
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Heart size={18} style={{ color: '#ef4444' }} />
              Likes Comparison
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={posts
                .filter(p => (p.likes_count || 0) > 0)
                .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
                .slice(0, 5)
                .map(p => ({ 
                  name: p.title.length > 15 ? p.title.substring(0, 15) + '...' : p.title,
                  likes: p.likes_count || 0
                }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#666' }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#666' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#fff', 
                    border: '1px solid #d0d0d0', 
                    borderRadius: 8,
                    fontSize: 12
                  }}
                />
                <Bar dataKey="likes" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div style={{ 
        border: '1px solid #d0d0d0', 
        borderRadius: 12, 
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginTop: '1rem',
        overflow: 'hidden'
      }}>
        {/* Table Header with Pagination Info */}
        {pagination && (
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa'
          }}>
            <div style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>
              Showing {pagination.from}-{pagination.to} of {pagination.total} posts
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111', color: '#fff' }}>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none'}} onClick={() => handleSort('title')}>
                  Post Title <SortIcon field="title" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('total_views')}>
                  Views <SortIcon field="total_views" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('engagement_rate')}>
                  Engagement <SortIcon field="engagement_rate" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('avg_time_on_page')}>
                  Avg Time <SortIcon field="avg_time_on_page" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('avg_scroll_depth')}>
                  Scroll <SortIcon field="avg_scroll_depth" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('likes_count')}>
                  Likes <SortIcon field="likes_count" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('total_shares')}>
                  Shares <SortIcon field="total_shares" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center'}} onClick={() => handleSort('engagement_score')}>
                  Score <SortIcon field="engagement_score" />
                </th>
                <th style={{...tableHeaderStyle, color: '#fff', borderBottom: 'none', textAlign: 'center', cursor: 'default'}}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, idx) => (
                <tr 
                  key={post.id} 
                  style={{
                    borderBottom: '1px solid #e5e5e5',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: idx % 2 === 0 ? '#fff' : '#fafafa'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                  onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                  onClick={() => navigate(`/admin/blog-analytics/${post.id}`)}
                >
                  <td style={tableCellStyle}>
                    <div style={{ fontWeight: 700, color: '#111' }}>{post.title}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ 
                        background: post.status === 'published' ? '#dcfce7' : '#fef3c7',
                        color: post.status === 'published' ? '#166534' : '#92400e',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>{post.status}</span>
                      {post.published_at && (
                        <span style={{ color: '#999' }}>
                          {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center', fontWeight: 600}}>{formatNumber(post.total_views || 0)}</td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>
                    <span style={{
                      background: getEngagementColor(post.engagement_rate),
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#111'
                    }}>
                      {post.engagement_rate ? `${Math.round(post.engagement_rate)}%` : '0%'}
                    </span>
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>{formatTime(post.avg_time_on_page || 0)}</td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>
                    {post.avg_scroll_depth ? `${Math.round(post.avg_scroll_depth)}%` : '0%'}
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center', color: '#ef4444', fontWeight: 600}}>
                    {formatNumber(post.likes_count || 0)}
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>{formatNumber(post.total_shares || 0)}</td>
                  <td style={{ ...tableCellStyle, textAlign: 'center', fontWeight: 700, fontSize: 15 }}>
                    {post.engagement_score ? Math.round(post.engagement_score) : 0}
                  </td>
                  <td style={{...tableCellStyle, textAlign: 'center'}}>
                    <button 
                      className="btn small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/blog-analytics/${post.id}`);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <BarChart3 size={48} style={{ color: '#999', margin: '0 auto 1rem' }} />
            <p style={{ color: '#666', fontWeight: 600 }}>No blog post analytics available yet</p>
            <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>Analytics will appear once blog posts receive views</p>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, color = '#111' }) {
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
    </div>
  );
}

const tableHeaderStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 800,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  cursor: 'pointer',
  userSelect: 'none'
};

const tableCellStyle = {
  padding: '0.75rem 1rem',
  fontSize: 13,
  color: '#111'
};
