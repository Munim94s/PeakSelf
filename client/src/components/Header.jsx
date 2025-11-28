import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { apiClient, endpoints, auth as apiAuth, response } from '../api';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [niches, setNiches] = useState([]);
  const [nichesMenuOpen, setNichesMenuOpen] = useState(false);
  const [nichesMenuClosing, setNichesMenuClosing] = useState(false);
  const [currentNiche, setCurrentNiche] = useState(null);
  const nichesCloseTimerRef = React.useRef(null);
  const nichesRemoveTimerRef = React.useRef(null);

  // Fetch user function (reusable)
  const fetchMe = async () => {
    try {
      const { data } = await apiClient.get(endpoints.auth.me);
      setUser(data.user);
      setLoading(false);
    } catch (_) {
      setUser(null);
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    fetchMe();
    
    // Fetch niches
    const fetchNiches = async () => {
      try {
        const { data } = await apiClient.get(endpoints.niches.public);
        setNiches(data.niches || []);
      } catch (err) {
        console.error('Failed to fetch niches:', err);
      }
    };
    fetchNiches();
  }, []);

  // Detect current niche from URL
  useEffect(() => {
    const path = location.pathname;
    // Check if we're on a niche page (/:nicheSlug or /:nicheSlug/blog)
    const nicheMatch = path.match(/^\/([^/]+)(\/blog)?$/);
    if (nicheMatch && nicheMatch[1] !== 'blog' && nicheMatch[1] !== 'about' && nicheMatch[1] !== 'contact' && nicheMatch[1] !== 'login' && nicheMatch[1] !== 'register' && nicheMatch[1] !== 'admin' && nicheMatch[1] !== 'check-email' && nicheMatch[1] !== 'rate-limit' && nicheMatch[1] !== 'not-accessible') {
      const nicheSlug = nicheMatch[1];
      const niche = niches.find(n => n.slug === nicheSlug);
      setCurrentNiche(niche || null);
    } else {
      setCurrentNiche(null);
    }
  }, [location.pathname, niches]);

  // Refetch when location changes to home (catches OAuth redirects)
  // Only refetch if we're on home page (where OAuth redirects to)
  useEffect(() => {
    if (location.pathname === '/' && !user && !loading) {
      console.log('On home page without user, refetching...');
      // Small delay to let cookies propagate
      const timer = setTimeout(fetchMe, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user, loading]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    function onDocClick(e) {
      if (!userMenuOpen) return;
      // Close the menu if clicking outside any element with data-profile-menu
      const el = e.target.closest('[data-profile-menu]');
      if (!el) setUserMenuOpen(false);
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [userMenuOpen]);

  const logout = useCallback(async () => {
    console.log('🔴 Frontend: Logout clicked');
    try {
      await apiClient.post(endpoints.auth.logout);
      apiAuth.logout(); // Clear CSRF token and auth state
      setUser(null);
      console.log('   User state cleared, redirecting to /');
      window.location.href = '/';
    } catch (err) {
      console.error('   ❌ Logout error:', err);
      // Still clear user and redirect even on error
      apiAuth.logout();
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  const initialsFrom = (nameOrEmail) => {
    if (!nameOrEmail) return 'U';
    const str = String(nameOrEmail);
    if (str.includes(' ')) {
      return str.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
    }
    if (str.includes('@')) return str[0].toUpperCase();
    return str[0].toUpperCase();
  };

  const Avatar = () => {
    const [imgErr, setImgErr] = useState(false);
    if (user?.avatar_url && !imgErr) {
      return (
        <img
          src={user.avatar_url}
          alt={user.name || user.email}
          referrerPolicy="no-referrer"
          onError={() => setImgErr(true)}
          style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.1)' }}
        />
      );
    }
    const initials = initialsFrom(user?.name || user?.email);
    return (
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
        {initials}
      </div>
    );
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          {/* Logo */}
          <Link to={currentNiche ? `/${currentNiche.slug}` : '/'} className="header-logo">
            {currentNiche?.logo_url ? (
              <img src={currentNiche.logo_url} alt={currentNiche.name} className="header-logo-icon" />
            ) : (
              <img src="/logo-p.svg" alt="PeakSelf Logo" className="header-logo-icon" />
            )}
            <span className="header-brand-name">
              {currentNiche ? (currentNiche.logo_text || currentNiche.name.toUpperCase()) : 'PEAKSELF'}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav">
            <Link to={currentNiche ? `/${currentNiche.slug}` : '/'} className="header-nav-link">
              Home
            </Link>
            <Link to={currentNiche ? `/${currentNiche.slug}/blog` : '/blog'} className="header-nav-link">
              Blog
            </Link>
            {niches.length > 0 && (
              <div 
                className="header-niches-dropdown"
                onMouseEnter={() => {
                  // Clear any pending timers
                  if (nichesCloseTimerRef.current) {
                    clearTimeout(nichesCloseTimerRef.current);
                    nichesCloseTimerRef.current = null;
                  }
                  if (nichesRemoveTimerRef.current) {
                    clearTimeout(nichesRemoveTimerRef.current);
                    nichesRemoveTimerRef.current = null;
                  }
                  setNichesMenuClosing(false);
                  setNichesMenuOpen(true);
                }}
                onMouseLeave={() => {
                  // Set a 0.75-second delay before starting close animation
                  nichesCloseTimerRef.current = setTimeout(() => {
                    setNichesMenuClosing(true);
                    // Then remove from DOM after animation completes (0.2s)
                    nichesRemoveTimerRef.current = setTimeout(() => {
                      setNichesMenuOpen(false);
                      setNichesMenuClosing(false);
                    }, 200);
                  }, 750);
                }}
              >
                <button className="header-nav-link" style={{background: 'transparent', border: 'none', cursor: 'pointer'}}>
                  Niches ▾
                </button>
                {nichesMenuOpen && (
                  <div className={`niches-dropdown-menu ${nichesMenuClosing ? 'closing' : ''}`}>
                    {niches.map(niche => (
                      <Link 
                        key={niche.id} 
                        to={`/${niche.slug}`} 
                        className="niches-dropdown-item"
                        onClick={() => {
                          // Immediately close dropdown when clicked
                          if (nichesCloseTimerRef.current) {
                            clearTimeout(nichesCloseTimerRef.current);
                          }
                          if (nichesRemoveTimerRef.current) {
                            clearTimeout(nichesRemoveTimerRef.current);
                          }
                          setNichesMenuOpen(false);
                          setNichesMenuClosing(false);
                        }}
                      >
                        {niche.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link to="/about" className="header-nav-link">
              About
            </Link>
            <Link to="/contact" className="header-nav-link">
              Contact
            </Link>
            {!user && (
              <Link to="/login" className="header-nav-link">
                Login
              </Link>
            )}
          </nav>

          {/* Search and Mobile Menu Button */}
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="header-search-btn">
              <Search className="header-search-icon" />
            </button>

            {/* Auth display */}
            {!loading && user && (
              <div className="profile" data-profile-menu style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="profile-trigger"
                  onClick={() => setUserMenuOpen(v => !v)}
                  data-profile-menu
                >
                  <Avatar />
                  <span className="profile-name" data-profile-menu>{user.name || user.email}</span>
                  <svg data-profile-menu width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="profile-menu" data-profile-menu>
                    <div className="profile-menu-header">
                      <div className="profile-menu-avatar"><Avatar /></div>
                      <div className="profile-menu-info">
                        <div className="profile-menu-name">{user.name || 'User'}</div>
                        <div className="profile-menu-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="profile-menu-sep" />
                    {user?.role === 'admin' && (
                      <a href="/admin" className="profile-menu-item admin-btn">Admin Dashboard</a>
                    )}
                    <button className="profile-menu-item" onClick={logout}>Logout</button>
                  </div>
                )}
              </div>
            )}
            {!loading && !user && (
              <Link to="/register" className="header-nav-link">Sign up</Link>
            )}
            
            {/* Mobile menu button */}
            <button
              onClick={toggleMenu}
              className="header-mobile-menu-btn"
            >
              {isMenuOpen ? <X className="header-mobile-menu-icon" /> : <Menu className="header-mobile-menu-icon" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Backdrop */}
        {isMenuOpen && (
          <div 
            className="mobile-nav-backdrop" 
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="header-mobile-nav">
            {/* Mobile Menu Header */}
            <div className="mobile-nav-header">
              <div className="mobile-nav-header-logo">
                {currentNiche?.logo_url ? (
                  <img src={currentNiche.logo_url} alt={currentNiche.name} />
                ) : (
                  <img src="/logo-p.svg" alt="PeakSelf Logo" />
                )}
                <span className="mobile-nav-header-title">
                  {currentNiche ? (currentNiche.logo_text || currentNiche.name.toUpperCase()) : 'PEAKSELF'}
                </span>
              </div>
              <button 
                className="mobile-nav-close-btn"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close menu"
              >
                <X />
              </button>
            </div>

            <nav className="header-mobile-nav-links">
              {/* User Info Section (if logged in) */}
              {user && (
                <div className="mobile-nav-user-info">
                  <div className="mobile-nav-user-avatar">
                    <Avatar />
                  </div>
                  <div className="mobile-nav-user-details">
                    <div className="mobile-nav-user-name">{user.name || 'User'}</div>
                    <div className="mobile-nav-user-email">{user.email}</div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <Link 
                to={currentNiche ? `/${currentNiche.slug}` : '/'} 
                className={`header-mobile-nav-link ${location.pathname === (currentNiche ? `/${currentNiche.slug}` : '/') ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to={currentNiche ? `/${currentNiche.slug}/blog` : '/blog'} 
                className={`header-mobile-nav-link ${location.pathname === (currentNiche ? `/${currentNiche.slug}/blog` : '/blog') ? 'active' : ''}`}
              >
                Blog
              </Link>
              {niches.length > 0 && (
                <>
                  <div className="mobile-nav-niches-label">Niches</div>
                  <div className="mobile-nav-niches-grid">
                    {niches.map(niche => (
                      <Link 
                        key={niche.id}
                        to={`/${niche.slug}`} 
                        className="mobile-nav-niche-chip"
                      >
                        {niche.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}
              <Link 
                to="/about" 
                className={`header-mobile-nav-link ${location.pathname === '/about' ? 'active' : ''}`}
              >
                About
              </Link>
              <Link 
                to="/contact" 
                className={`header-mobile-nav-link ${location.pathname === '/contact' ? 'active' : ''}`}
              >
                Contact
              </Link>

              {/* Auth Links */}
              {!user && (
                <>
                  <div className="mobile-nav-divider" />
                  <Link 
                    to="/login" 
                    className={`header-mobile-nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                  >
                    Login
                  </Link>
                  <Link 
                    to="/register" 
                    className={`header-mobile-nav-link ${location.pathname === '/register' ? 'active' : ''}`}
                  >
                    Sign up
                  </Link>
                </>
              )}

              {/* Admin Link */}
              {user && user.role === 'admin' && (
                <>
                  <div className="mobile-nav-divider" />
                  <a 
                    href="/admin" 
                    className="header-mobile-nav-link"
                  >
                    Admin Dashboard
                  </a>
                </>
              )}

              {/* Logout Button */}
              {user && (
                <>
                  <div className="mobile-nav-divider" />
                  <button 
                    onClick={logout} 
                    className="header-mobile-nav-link logout-btn"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

