import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand Section */}
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <img src="/logo-p.svg" alt="PeakSelf Logo" className="footer-logo-icon" />
              <span className="footer-brand-name">PEAKSELF</span>
            </Link>
            <p className="footer-description">
              A professional blog platform dedicated to personal growth, technology insights, 
              and sharing knowledge that helps you reach your peak potential.
            </p>
            <div className="footer-social">
              <a href="#" className="footer-social-link">
                <Github className="footer-social-icon" />
              </a>
              <a href="#" className="footer-social-link">
                <Twitter className="footer-social-icon" />
              </a>
              <a href="#" className="footer-social-link">
                <Linkedin className="footer-social-icon" />
              </a>
              <a href="#" className="footer-social-link">
                <Mail className="footer-social-icon" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Quick Links</h3>
            <div className="footer-links">
              <Link to="/" className="footer-link">
                Home
              </Link>
              <Link to="/blog" className="footer-link">
                Blog
              </Link>
              <Link to="/about" className="footer-link">
                About
              </Link>
              <Link to="/contact" className="footer-link">
                Contact
              </Link>
            </div>
          </div>

          {/* Categories */}
          <div className="footer-section">
            <h3 className="footer-section-title">Categories</h3>
            <div className="footer-links">
              <a href="#" className="footer-link">
                Technology
              </a>
              <a href="#" className="footer-link">
                Personal Growth
              </a>
              <a href="#" className="footer-link">
                Productivity
              </a>
              <a href="#" className="footer-link">
                Lifestyle
              </a>
            </div>
          </div>
        </div>

        <div className="footer-divider">
          <p className="footer-copyright">
            © 2024 PeakSelf. All rights reserved. Built with React.
          </p>
        </div>
      </div>
    </footer>
  );
};

// Memoize Footer since it's static content and rendered on most pages
export default React.memo(Footer);

