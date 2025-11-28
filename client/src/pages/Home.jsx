import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, BookOpen } from 'lucide-react';
import PostList from '../components/PostList';
import PostCard from '../components/PostCard';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import SEOHead from '../components/SEOHead';
import { generateOrganizationSchema } from '../utils/seo';
import './Home.css';

const Home = () => {
  const modal = useModal();
  const [recentPosts, setRecentPosts] = useState([]);
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch niches with posts
        const { data: nichesData } = await apiClient.get(endpoints.niches.public + '?limit=3');
        setNiches(nichesData.niches || []);

        // Fetch recent posts for the main section
        const { data: postsData } = await apiClient.get(endpoints.blog.list + '?limit=6');
        setRecentPosts(postsData.posts || postsData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="home-container">
      <SEOHead
        title="Peakium - Analytics Platform"
        description="Modern, self-hosted analytics and blog platform built with React, Express, and PostgreSQL. Complete control over your data with professional insights for career advancement and technology mastery."
        url="/"
        type="website"
        structuredData={generateOrganizationSchema()}
      />
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="py-20">

            {/* Header Content */}
            <div className="text-center mb-16">
              {/* Main Title */}
              <h1 className="hero-title">
                PEAKIUM
              </h1>

              {/* Subtitle */}
              <p className="hero-subtitle">
                Professional insights and strategic knowledge for career advancement,
                technology mastery, and executive-level productivity.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="hero-buttons-container">
              <Link to="/blog" className="hero-button-primary">
                <span>Explore Articles</span>
                <ArrowRight className="hero-arrow" />
              </Link>
              <Link to="/about" className="hero-button-secondary">
                <span>Learn More</span>
                <ArrowRight className="hero-arrow" />
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="trust-section">
              <div className="text-center mb-12">
                <h3 className="trust-title">
                  Trusted by Professionals Worldwide
                </h3>
                <p className="trust-subtitle">
                  Join thousands of professionals advancing their careers
                </p>
              </div>

              <div className="trust-stats-container">
                <div className="text-center">
                  <div className="trust-stat-number">50+</div>
                  <div className="trust-stat-label">Published Articles</div>
                </div>
                <div className="trust-divider"></div>
                <div className="text-center">
                  <div className="trust-stat-number">10K+</div>
                  <div className="trust-stat-label">Monthly Readers</div>
                </div>
                <div className="trust-divider"></div>
                <div className="text-center">
                  <div className="trust-stat-number">95%</div>
                  <div className="trust-stat-label">Satisfaction Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Niches Section */}
      {niches.length > 0 && (
        <section className="niches-section" style={{ padding: '4rem 0', background: '#fafafa' }}>
          <div className="container">
            {niches.map((niche, index) => (
              <div key={niche.id} style={{ marginBottom: index < niches.length - 1 ? '4rem' : '0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {niche.logo_url && (
                      <img src={niche.logo_url} alt={niche.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    )}
                    <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#111', margin: 0 }}>
                      {niche.logo_text || niche.name}
                    </h2>
                  </div>
                  <Link to={`/${niche.slug}`} className="recent-button" style={{ fontSize: '0.875rem' }}>
                    <span>View All</span>
                    <ArrowRight className="recent-button-arrow" />
                  </Link>
                </div>
                <div style={{ height: '2px', background: 'linear-gradient(90deg, #111 0%, transparent 100%)', marginBottom: '2rem' }} />
                {niche.posts.length > 0 ? (
                  <div className="recent-cards-container">
                    {niche.posts.map((post) => (
                      <PostCard key={post.id} post={post} showMeta={false} />
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>No posts in this niche yet.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Articles */}
      <section className="recent-section">
        <div className="container">
          <div className="recent-header">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 className="recent-title">
                Latest Insights
              </h2>
              <p className="recent-description">
                Fresh perspectives and cutting-edge knowledge delivered weekly
              </p>
            </div>
            <Link to="/blog" className="recent-button">
              <span>View All Articles</span>
              <ArrowRight className="recent-button-arrow" />
            </Link>
          </div>

          <div className="recent-cards-container">
            {loading ? (
              <p style={{ textAlign: 'center', width: '100%' }}>Loading articles...</p>
            ) : recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <PostCard key={post.id} post={post} showMeta={false} />
              ))
            ) : (
              <p style={{ textAlign: 'center', width: '100%' }}>No articles found.</p>
            )}
          </div>

          <div className="text-center" style={{ marginTop: '3rem' }}>
            <Link to="/blog" className="recent-button">
              <span>View All Articles</span>
              <ArrowRight className="recent-button-arrow" />
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="newsletter-section">
        <div className="container text-center">
          <div className="newsletter-badge">
            <span className="newsletter-badge-text">
              Newsletter
            </span>
          </div>

          <h2 className="newsletter-title">
            Stay Ahead of the Curve
          </h2>
          <p className="newsletter-description">
            Get exclusive insights, early access to articles, and weekly productivity tips delivered to your inbox
          </p>

          <form className="newsletter-form" onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            if (!email) return;
            try {
              const { data } = await apiClient.post(endpoints.newsletter.subscribe, { email });
              await modal.alert(data.message || 'Check your email to confirm your subscription.', 'Success');
              e.target.reset();
            } catch (err) {
              await modal.alert(response.getErrorMessage(err), 'Error');
            }
          }}>
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              required
              className="newsletter-input"
            />
            <button type="submit" className="newsletter-button">
              <span>Subscribe</span>
              <ArrowRight className="newsletter-button-arrow" />
            </button>
          </form>

          <p className="newsletter-disclaimer">
            Join 10,000+ readers. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;

