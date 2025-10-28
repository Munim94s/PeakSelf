import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Users, BookOpen } from 'lucide-react';
import PostList from '../components/PostList';
import PostCard from '../components/PostCard';
import { blogPosts } from '../data/blogPosts';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import './Home.css';

const Home = () => {
  const modal = useModal();
  const featuredPost = blogPosts.find(post => post.featured);
  const recentPosts = blogPosts.filter(post => !post.featured).slice(0, 5);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="py-20">
            
            {/* Header Content */}
            <div className="text-center mb-16">
              {/* Main Title */}
              <h1 className="hero-title">
                PEAKSELF
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


      {/* Featured Article */}
      <section className="featured-section">
        <div className="container">
          <div className="text-center mb-16">
            <div className="featured-badge">
              <span className="featured-badge-text">
                Featured
              </span>
            </div>
            <h2 className="featured-title">
              Editor's Choice
            </h2>
            <p className="featured-description">
              Our most impactful article that's changing how people think about technology and growth
            </p>
          </div>
          
{featuredPost && (
            <div className="featured-card-container">
              <PostCard post={featuredPost} featured={true} showMeta={false} />
            </div>
          )}
        </div>
      </section>

      {/* Recent Articles */}
      <section className="recent-section">
        <div className="container">
          <div className="recent-header">
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
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
{recentPosts.map((post) => (
              <PostCard key={post.id} post={post} showMeta={false} />
            ))}
          </div>
          
          <div className="text-center" style={{marginTop: '3rem'}}>
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

