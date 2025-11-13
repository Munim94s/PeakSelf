import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, TrendingUp, Share2, BarChart3, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('engagement_score');
  const [sortOrder, setSortOrder] = useState('DESC');
  
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  useEffect(() => {
    fetchData();
  }, [sortBy, sortOrder, currentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [comparisonRes, overviewRes] = await Promise.all([
        api.get(`/api/admin/blog-analytics/comparison?sort_by=${sortBy}&order=${sortOrder}&page=${currentPage}&limit=${pageSize}`),
        api.get('/api/admin/blog-analytics/')
      ]);
      
      setPosts(comparisonRes.data.data.posts || []);
      setPagination(comparisonRes.data.data.pagination || null);
      setOverview(overviewRes.data.data.overview || {});
      setTopPosts(overviewRes.data.data.top_posts_week || []);
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
        <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <StatCard icon={Eye} title="Total Views" value={formatNumber(overview.total_views)} />
          <StatCard icon={TrendingUp} title="Avg Engagement" value={overview.avg_engagement_rate ? `${Math.round(overview.avg_engagement_rate)}%` : '0%'} />
          <StatCard icon={Share2} title="Total Shares" value={formatNumber(overview.total_shares)} />
        </div>
      )}

      {/* Top Posts This Week */}
      {topPosts && topPosts.length > 0 && (
        <div style={{ 
          border: '1px solid #d0d0d0', 
          borderRadius: 12, 
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          marginTop: '1rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111', marginBottom: '1rem' }}>
            Top Posts This Week
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={topPosts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="title" 
                tick={{ fontSize: 11, fill: '#666' }}
                tickFormatter={(value) => value.length > 30 ? value.substring(0, 30) + '...' : value}
              />
              <YAxis tick={{ fontSize: 11, fill: '#666' }} />
              <Tooltip 
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #d0d0d0', 
                  borderRadius: 8,
                  fontSize: 12
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line 
                type="monotone" 
                dataKey="views" 
                stroke="#111" 
                strokeWidth={2}
                dot={{ fill: '#111', r: 4 }}
                name="Views"
              />
            </LineChart>
          </ResponsiveContainer>
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

function StatCard({ icon: Icon, title, value }) {
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
