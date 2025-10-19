import React, { useEffect, useMemo, useState, useRef } from 'react';
import './AdminTraffic.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

// Custom hook for animated counters
function useAnimatedCounter(end, duration = 1000, delay = 0) {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const frameRef = useRef();
  const startTimeRef = useRef();

  useEffect(() => {
    if (end === undefined || end === null) {
      setCount(0);
      return;
    }

    const startValue = 0;
    const endValue = Number(end) || 0;
    
    if (endValue === 0) {
      setCount(0);
      return;
    }

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOutQuart);
        setCount(currentValue);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setCount(endValue);
          setIsAnimating(false);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timer);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, delay]);

  return { count, isAnimating };
}

const logos = {
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient id="ig-small" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f58529"/>
          <stop offset="50%" stopColor="#dd2a7b"/>
          <stop offset="100%" stopColor="#8134af"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-small)"/>
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

function Card({ title, value, accent, icon, delay = 0 }) {
  const numericValue = typeof value === 'string' ? 
    parseInt(value.replace(/,/g, '')) || 0 : 
    Number(value) || 0;
  
  const { count, isAnimating } = useAnimatedCounter(numericValue, 1200, delay);
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 16px', border: '1px solid #ddd', borderRadius: 12,
      background: '#fff', boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
      transition: 'transform 0.3s ease, box-shadow 0.3s ease'
    }}>
      <div style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 10, 
        background: accent, 
        display: 'grid', 
        placeItems: 'center',
        transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.3s ease'
      }}>
        {icon}
      </div>
      <div style={{flex: 1}}>
        <div style={{fontSize: 12, color: '#666', fontWeight: 500}}>{title}</div>
        <div style={{
          fontSize: 20, 
          fontWeight: 900, 
          transition: 'color 0.3s ease',
          color: isAnimating ? '#0969da' : '#111'
        }}>
          {count.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function AdminTraffic() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterSource, setFilterSource] = useState('');
  const [filterRef, setFilterRef] = useState('');
  const [events, setEvents] = useState([]);
  const [trafficSummary, setTrafficSummary] = useState(null);
  const [page, setPage] = useState(0);
  const [onlyWithRef, setOnlyWithRef] = useState(true);

  // Single time range used for both overview and table
  const [range, setRange] = useState('7d');
  const [filtersOpen, setFiltersOpen] = useState(true);
  // Top-level search term
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);


// Helper function to format time in a better way
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFullTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const rangeOptions = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '365d', label: 'Last Year' }
  ];

  const handleRangeSelect = (value) => {
    setRange(value);
    setDropdownOpen(false);
  };

  const getCurrentRangeLabel = () => {
    return rangeOptions.find(option => option.value === range)?.label || 'Last 7 Days';
  };

async function loadEvents(nextPage = 0) {
  try {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterSource) params.set('source', filterSource);
    if (filterRef) params.set('ref', filterRef);
    if (range) params.set('range', range);
    params.set('limit', '50');
    params.set('offset', String(nextPage * 50));
    const res = await fetch(`${API_BASE}/api/admin/traffic/events?${params.toString()}`, { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load events');
    setEvents(json.events || []);
    setTrafficSummary(json.summary || null);
    setPage(nextPage);
    setError('');
  } catch (e) {
    setError(e.message || 'Failed to load events');
  } finally {
    setLoading(false);
  }
}

  const cards = useMemo(() => {
    if (!trafficSummary) {
      return [
        { key: 'instagram', title: 'Instagram', value: 0, color: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)', icon: logos.instagram },
        { key: 'facebook', title: 'Facebook', value: 0, color: '#1877f2', icon: logos.facebook },
        { key: 'youtube', title: 'YouTube', value: 0, color: '#ff0000', icon: logos.youtube },
        { key: 'google', title: 'Google', value: 0, color: '#f1f3f4', icon: logos.google },
        { key: 'other', title: 'Others', value: 0, color: '#111', icon: logos.other },
      ];
    }
    
    const instagramCount = trafficSummary.traffic_instagram || 0;
    const facebookCount = trafficSummary.traffic_facebook || 0;
    const youtubeCount = trafficSummary.traffic_youtube || 0;
    const googleCount = trafficSummary.traffic_google || 0;
    const otherCount = trafficSummary.traffic_others || 0;
    
    const cardsData = [
      { key: 'instagram', title: 'Instagram', value: instagramCount, color: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)', icon: logos.instagram },
      { key: 'facebook', title: 'Facebook', value: facebookCount, color: '#1877f2', icon: logos.facebook },
      { key: 'youtube', title: 'YouTube', value: youtubeCount, color: '#ff0000', icon: logos.youtube },
      { key: 'google', title: 'Google', value: googleCount, color: '#f1f3f4', icon: logos.google },
      { key: 'other', title: 'Others', value: otherCount, color: '#111', icon: logos.other },
    ];
    return cardsData;
  }, [trafficSummary]);

  const filteredEvents = useMemo(() => {
    let list = Array.isArray(events) ? events : [];
    if (onlyWithRef) {
      list = list.filter(ev => {
        const r = (ev.referrer ?? '').trim();
        return r.length > 0;
      });
    }
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(ev => {
        const ref = String(ev.referrer || '').toLowerCase();
        const route = String(ev.path || '').toLowerCase();
        const ip = String(ev.ip || '').toLowerCase();
        return ref.includes(q) || route.includes(q) || ip.includes(q);
      });
    }
    return list;
  }, [events, onlyWithRef, searchTerm]);

  // Load table when range or filters change - must be before early returns
  useEffect(() => { loadEvents(0).catch(()=>{}); /* eslint-disable-line */ }, [range]);
  useEffect(() => { loadEvents(0).catch(()=>{}); /* eslint-disable-line */ }, [filterSource]);
  useEffect(() => { loadEvents(0).catch(()=>{}); /* eslint-disable-line */ }, [filterRef]);

  // Keyboard shortcuts: Ctrl/Cmd+K to focus, Esc to clear
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('traffic-search-input');
        if (el) el.focus();
      }
      if (e.key === 'Escape') {
        setSearchTerm('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading traffic…</div>;
  if (error) return <div style={{ padding: 16, color: '#b91c1c' }}>Error: {error}</div>;

return (
    <div className="admin-traffic">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Traffic overview</div>
          <div className="range-dropdown-wrapper">
            <button 
              className="range-select" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-label="Select time range"
            >
              {getCurrentRangeLabel()}
            </button>
            {dropdownOpen && (
              <div className="range-dropdown" role="listbox" aria-label="Time ranges">
                {rangeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`range-option ${range === option.value ? 'selected' : ''}`}
                    onClick={() => handleRangeSelect(option.value)}
                    role="option"
                    aria-selected={range === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form className="traffic-search-form" onSubmit={(e) => { e.preventDefault(); setFilterRef(searchTerm); }}>
          <div className="traffic-search" role="search">
            <span className="search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              id="traffic-search-input"
              type="search"
              className="traffic-search-input"
              placeholder="Search referrer, route, or IP..."
              aria-label="Search traffic events"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="traffic-search-clear"
                title="Clear"
                aria-label="Clear search"
                onClick={() => { setSearchTerm(''); setFilterRef(''); }}
              >
                ×
              </button>
            )}
            <button type="submit" className="btn primary search-btn" aria-label="Apply search">Search</button>
          </div>
        </form>

        <div className="traffic-chip-row" aria-label="Source filter" role="tablist">
          {[{key:'',label:'All'}, {key:'instagram',label:'Instagram'}, {key:'youtube',label:'YouTube'}, {key:'google',label:'Google'}, {key:'other',label:'Others'}].map((s) => (
            <button
              key={s.key || 'all'}
              type="button"
              role="tab"
              aria-selected={(filterSource || '') === (s.key || '')}
              className={`traffic-chip ${(filterSource || '') === (s.key || '') ? 'active' : ''}`}
              onClick={() => { setFilterSource(s.key); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {cards.map((c, index) => (
          <Card
            key={c.key}
            title={`Traffic • ${c.title}`}
            value={c.value ?? 0}
            accent={c.color}
            icon={c.icon}
            delay={index * 150} // Staggered animation delay
          />
        ))}
      </div>


      {/* Table + Filters layout */}
      <div className="traffic-table-wrap" style={{ display: 'grid', gridTemplateColumns: filtersOpen ? '1fr 300px' : '1fr', gap: 12, alignItems: 'start', marginTop: 16 }}>
        <div className="table-card">
          <div className="table-header">
            <div className="table-title-section">
              <div className="table-title">Traffic Events</div>
              <div className="page-indicator">Page {page + 1}</div>
            </div>
            <button className="btn small toggle-filters-btn" onClick={() => setFiltersOpen(v => !v)}>{filtersOpen ? 'Hide filters' : 'Show filters'}</button>
          </div>
          <div style={{ padding: 16 }}>
            <div className="table-scroll-container">
              <table className="traffic-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Time</th>
                    <th>Source</th>
                    <th>Referrer</th>
                    <th>Route</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev) => (
                    <tr 
                      key={ev.id} 
                      onClick={() => handleEventClick(ev)}
                      className={selectedEvent?.id === ev.id ? 'selected' : ''}
                    >
                      <td>{ev.id}</td>
                      <td>{formatTime(ev.occurred_at)}</td>
                      <td>
                        <div className={`source-logo ${ev.source}`} title={ev.source}>
                          {logos[ev.source] || logos.other}
                        </div>
                      </td>
                      <td>{ev.referrer || 'No referrer'}</td>
                      <td>{ev.path || '/'}</td>
                      <td>{ev.ip || 'Unknown'}</td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#666', padding: '32px' }}>No events found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-controls">
              <button 
                className="btn pagination-btn" 
                onClick={() => { if (page>0) loadEvents(page-1).catch(()=>{}); }} 
                disabled={page===0}
                style={{ opacity: page === 0 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <button className="btn pagination-btn" onClick={() => loadEvents(page+1).catch(()=>{})}>
                Next
              </button>
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
                  <option value="youtube">YouTube</option>
                  <option value="google">Google</option>
                  <option value="other">Others</option>
                </select>
              </label>
              <label className="field">
                <div className="label">Referrer contains</div>
                <input value={filterRef} onChange={(e) => setFilterRef(e.target.value)} placeholder="e.g. instagram.com" />
              </label>
              <label className="checkbox">
                <input type="checkbox" checked={onlyWithRef} onChange={(e) => setOnlyWithRef(e.target.checked)} />
                <span>Only with referrer</span>
              </label>
              <div className="filter-buttons">
                <button className="btn primary" onClick={() => {}}>Apply</button>
                <button className="btn" onClick={() => { setFilterSource(''); setFilterRef(''); setOnlyWithRef(true); }}>Reset</button>
              </div>
              <div className="hint">Range: {range}</div>
            </div>
          </aside>
        )}
      </div>
      
      {/* Modal for event details */}
      {modalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Request Details</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <div className="detail-label">Event ID</div>
                  <div className="detail-value large">{selectedEvent.id}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Timestamp</div>
                  <div className="detail-value">{formatFullTime(selectedEvent.occurred_at)}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Source</div>
                  <div className="detail-value">
                    <div className="modal-source-container">
                      <div className={`source-logo ${selectedEvent.source}`}>
                        {logos[selectedEvent.source] || logos.other}
                      </div>
                      <span className="modal-source-label">
                        {selectedEvent.source}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">IP Address</div>
                  <div className="detail-value">{selectedEvent.ip || 'Unknown'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Route</div>
                  <div className="detail-value">{selectedEvent.path || '/'}</div>
                </div>
                <div className="detail-item">
                  <div className="detail-label">Referrer</div>
                  <div className="detail-value">{selectedEvent.referrer || 'No referrer'}</div>
                </div>
                {selectedEvent.user_agent && (
                  <div className="detail-item user-agent-detail">
                    <div className="detail-label">User Agent</div>
                    <div className="detail-value">{selectedEvent.user_agent}</div>
                  </div>
                )}
                {selectedEvent.query_params && (
                  <div className="detail-item">
                    <div className="detail-label">Query Parameters</div>
                    <div className="detail-value">{selectedEvent.query_params}</div>
                  </div>
                )}
                {selectedEvent.headers && (
                  <div className="detail-item user-agent-detail">
                    <div className="detail-label">Headers</div>
                    <div className="detail-value">
                      <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedEvent.headers, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
