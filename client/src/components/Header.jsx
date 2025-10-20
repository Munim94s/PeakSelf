import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search } from 'lucide-react';
import { apiFetch, resetCsrfToken } from '../utils/api';
import './Header.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const Header = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch user function (reusable)
  const fetchMe = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      const data = await res.json();
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
  }, []);

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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

  const logout = async () => {
    console.log('🔴 Frontend: Logout clicked');
    try {
      console.log('   Making logout request to:', `${API_BASE}/api/auth/logout`);
      const res = await apiFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
      console.log('   Logout response status:', res.status);
      const data = await res.json();
      console.log('   Logout response:', data);
      resetCsrfToken(); // Clear CSRF token cache
      setUser(null);
      console.log('   User state cleared, redirecting to /');
      window.location.href = '/';
    } catch (err) {
      console.error('   ❌ Logout error:', err);
      // Still clear user and redirect even on error
      resetCsrfToken();
      setUser(null);
      window.location.href = '/';
    }
  };

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
          <Link to="/" className="header-logo">
            <img src="/logo-p.svg" alt="PeakSelf Logo" className="header-logo-icon" />
            <span className="header-brand-name">PEAKSELF</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="header-nav">
            <Link to="/" className="header-nav-link">
              Home
            </Link>
            <Link to="/blog" className="header-nav-link">
              Blog
            </Link>
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
                <img src="/logo-p.svg" alt="PeakSelf Logo" />
                <span className="mobile-nav-header-title">PEAKSELF</span>
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
                to="/" 
                className={`header-mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/blog" 
                className={`header-mobile-nav-link ${location.pathname === '/blog' ? 'active' : ''}`}
              >
                Blog
              </Link>
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

