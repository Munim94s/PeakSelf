import React, { useEffect, useState } from 'react';
import { Database, Activity, HardDrive, Zap, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { apiClient, response } from '../api';
import SkeletonGrid from './SkeletonGrid';
import './AdminContent.css';
import './AdminSessions.css';

export default function AdminPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [queries, setQueries] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [orderBy, setOrderBy] = useState('total_exec_time');
  const [filter, setFilter] = useState('application');
  const [currentPage, setCurrentPage] = useState(1);
  const [resetting, setResetting] = useState(false);

  async function loadData(customOrderBy = null, customFilter = null, customPage = null) {
    setLoading(true);
    setError('');
    try {
      const actualOrderBy = customOrderBy ?? orderBy;
      const actualFilter = customFilter ?? filter;
      const actualPage = customPage ?? currentPage;
      const [summaryRes, queriesRes] = await Promise.all([
        apiClient.get('/api/admin/performance/summary'),
        apiClient.get(`/api/admin/performance/queries?order_by=${actualOrderBy}&filter=${actualFilter}&page=${actualPage}&limit=20`)
      ]);
      setSummary(summaryRes.data);
      setQueries(queriesRes.data.queries);
      setPagination(queriesRes.data.pagination);
    } catch (e) {
      setError(response.getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [orderBy, filter, currentPage]);

  async function handleReset() {
    if (!confirm('Reset all query statistics? This will clear all tracked performance data.')) {
      return;
    }
    setResetting(true);
    try {
      await apiClient.post('/api/admin/performance/reset');
      await loadData();
    } catch (e) {
      alert(response.getErrorMessage(e));
    } finally {
      setResetting(false);
    }
  }

  if (loading) return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Database Performance</div>
        </div>
      </div>
      <SkeletonGrid cards={4} type="stat" />
    </div>
  );

  if (error) return (
    <div style={{ padding: '1rem', color: '#b91c1c' }}>
      Error: {error}
      {error.includes('not enabled') && (
        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Run the migration: <code>node server/migrations/run.js enable_pg_stat_statements up</code>
        </div>
      )}
    </div>
  );

  const stats = summary?.query_stats || {};
  const breakdown = summary?.query_breakdown || {};
  const connections = summary?.connections || {};

  return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Database Performance</div>
          <button
            onClick={handleReset}
            disabled={resetting}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: '1px solid #d0d0d0',
              background: '#fff',
              color: '#333',
              fontSize: 13,
              fontWeight: 600,
              cursor: resetting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: resetting ? 0.6 : 1
            }}
          >
            <RefreshCw size={14} />
            {resetting ? 'Resetting...' : 'Reset Stats'}
          </button>
        </div>
        <div className="traffic-chip-row">
          <div style={{ fontSize: 12, color: '#666' }}>
            pg_stat_statements • Database: {summary?.database_size || 'N/A'}
          </div>
        </div>
      </div>

      <div className="card-grid">
        <StatCard 
          icon={Database} 
          title="Total Queries" 
          value={fmt(stats.total_queries)} 
          subtitle={`${fmt(stats.total_executions)} executions`}
        />
        <StatCard 
          icon={Activity} 
          title="Application Queries" 
          value={fmt(breakdown.application)} 
          subtitle="Your app queries"
          color="#059669"
        />
        <StatCard 
          icon={HardDrive} 
          title="System Queries" 
          value={fmt(breakdown.system)} 
          subtitle="PostgreSQL catalog"
          color="#6366F1"
        />
        <StatCard 
          icon={Clock} 
          title="Avg Query Time" 
          value={`${stats.avg_query_time_ms || 0}ms`} 
          subtitle={`Slowest: ${stats.slowest_query_ms || 0}ms`}
        />
        <StatCard 
          icon={Zap} 
          title="Cache Hit Ratio" 
          value={`${stats.overall_cache_hit_ratio || 0}%`} 
          subtitle="Shared buffer hits"
          color={getColorForCacheRatio(stats.overall_cache_hit_ratio)}
        />
        <StatCard 
          icon={Activity} 
          title="Connections" 
          value={fmt(connections.active_connections)} 
          subtitle={`${connections.active_queries} active • ${connections.idle_connections} idle`}
        />
      </div>

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
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid #e5e5e5',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: '#000' }} />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#000', margin: 0 }}>
              Query Performance
            </h3>
            {pagination && (
              <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>
                ({pagination.total_queries} total)
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={filter}
              onChange={(e) => {
                const newFilter = e.target.value;
                setFilter(newFilter);
                setCurrentPage(1);
                loadData(null, newFilter, 1);
              }}
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                border: '1px solid #d0d0d0',
                fontSize: 12,
                fontWeight: 600,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="application">Application</option>
              <option value="all">All Queries</option>
              <option value="system">System/Catalog</option>
              <option value="extension">Extensions</option>
            </select>
            <select
              value={orderBy}
              onChange={(e) => {
                const newOrderBy = e.target.value;
                setOrderBy(newOrderBy);
                loadData(newOrderBy, null, null);
              }}
              style={{
                padding: '0.5rem',
                borderRadius: 6,
                border: '1px solid #d0d0d0',
                fontSize: 12,
                fontWeight: 600,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="total_exec_time">Total Time</option>
              <option value="mean_exec_time">Avg Time</option>
              <option value="max_exec_time">Max Time</option>
              <option value="calls">Execution Count</option>
            </select>
          </div>
        </div>

        {!queries || queries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No query data available yet. Queries will appear as they are executed.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Query</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Calls</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Total (ms)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Avg (ms)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Max (ms)</th>
                  <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 700, color: '#666', fontSize: 11, textTransform: 'uppercase' }}>Cache %</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q, idx) => (
                  <tr 
                    key={idx}
                    style={{ 
                      borderBottom: '1px solid #eee',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9f9f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem', maxWidth: 400 }}>
                      <code style={{ 
                        fontSize: 12, 
                        color: '#333',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {truncateQuery(q.query)}
                      </code>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {fmt(q.calls)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: getColorForTime(q.total_exec_time_ms) }}>
                      {fmt(q.total_exec_time_ms)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {q.mean_exec_time_ms}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {q.max_exec_time_ms}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, color: getColorForCacheRatio(q.cache_hit_ratio) }}>
                      {q.cache_hit_ratio}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && pagination.total_pages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 8,
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e5e5'
          }}>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination?.has_prev}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 6,
                border: '1px solid #d0d0d0',
                background: pagination?.has_prev ? '#fff' : '#f5f5f5',
                color: pagination?.has_prev ? '#333' : '#999',
                fontSize: 12,
                fontWeight: 600,
                cursor: pagination?.has_prev ? 'pointer' : 'not-allowed'
              }}
            >
              Previous
            </button>
            
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: pagination?.total_pages || 1 }, (_, i) => i + 1)
                .filter(p => {
                  // Show first, last, current, and neighbors
                  return p === 1 || 
                         p === (pagination?.total_pages || 1) || 
                         Math.abs(p - currentPage) <= 1;
                })
                .map((p, idx, arr) => {
                  // Add ellipsis
                  if (idx > 0 && p - arr[idx - 1] > 1) {
                    return [
                      <span key={`ellipsis-${p}`} style={{ padding: '0.5rem', color: '#999' }}>...</span>,
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        style={{
                          minWidth: 32,
                          padding: '0.5rem',
                          borderRadius: 6,
                          border: '1px solid #d0d0d0',
                          background: p === currentPage ? '#000' : '#fff',
                          color: p === currentPage ? '#fff' : '#333',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {p}
                      </button>
                    ];
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      style={{
                        minWidth: 32,
                        padding: '0.5rem',
                        borderRadius: 6,
                        border: '1px solid #d0d0d0',
                        background: p === currentPage ? '#000' : '#fff',
                        color: p === currentPage ? '#fff' : '#333',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
            </div>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination?.has_next}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 6,
                border: '1px solid #d0d0d0',
                background: pagination?.has_next ? '#fff' : '#f5f5f5',
                color: pagination?.has_next ? '#333' : '#999',
                fontSize: 12,
                fontWeight: 600,
                cursor: pagination?.has_next ? 'pointer' : 'not-allowed'
              }}
            >
              Next
            </button>
            
            <span style={{ marginLeft: '1rem', fontSize: 12, color: '#666' }}>
              Page {pagination?.current_page || 1} of {pagination?.total_pages || 1}
            </span>
          </div>
        )}
      </div>
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

function fmt(val) {
  if (val == null) return '0';
  return Number(val).toLocaleString();
}

function truncateQuery(query) {
  if (!query) return '';
  const cleaned = query.replace(/\s+/g, ' ').trim();
  return cleaned.length > 100 ? cleaned.substring(0, 100) + '...' : cleaned;
}

function getColorForTime(ms) {
  if (ms > 1000) return '#dc2626'; // red
  if (ms > 500) return '#ea580c'; // orange
  if (ms > 100) return '#ca8a04'; // yellow
  return '#059669'; // green
}

function getColorForCacheRatio(ratio) {
  if (ratio >= 95) return '#059669'; // green
  if (ratio >= 80) return '#ca8a04'; // yellow
  if (ratio >= 60) return '#ea580c'; // orange
  return '#dc2626'; // red
}
