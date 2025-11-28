import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PostCard from '../components/PostCard';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import './Blog.css';
import './Home.css';

// Helper function to render article sections
const ArticleSection = ({ sectionKey, title, description, posts, niche, background = null }) => {
  const heroSections = niche.hero_sections || {};
  const sectionIds = heroSections[sectionKey] || [];
  const sectionPosts = sectionIds.length > 0
    ? sectionIds.map(id => posts.find(p => p.id === id)).filter(Boolean)
    : [];
  
  if (sectionPosts.length === 0) return null;
  
  return (
    <section className="recent-section" style={background ? { background } : {}}>
      <div className="container">
        <div className="recent-header">
          <div style={{textAlign: 'center', marginBottom: '2rem'}}>
            <h2 className="recent-title">{title}</h2>
            <p className="recent-description">{description}</p>
          </div>
        </div>
        <div className="recent-cards-container">
          {sectionPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
};

const NichePage = () => {
  const modal = useModal();
  const { nicheSlug } = useParams();
  const [niche, setNiche] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNicheData = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(endpoints.niches.bySlug(nicheSlug));
        setNiche(data.niche);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to fetch niche:', err);
        await modal.alert('Niche not found', 'Error');
      } finally {
        setLoading(false);
      }
    };
    fetchNicheData();
  }, [nicheSlug]);

  if (loading) {
    return (
      <div className="blog-container">
        <div className="container">
          <p style={{textAlign: 'center', padding: '3rem'}}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!niche) {
    return (
      <div className="blog-container">
        <div className="container">
          <p style={{textAlign: 'center', padding: '3rem'}}>Niche not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="py-20">
            
            {/* Header Content */}
            <div className="text-center mb-16">
              {/* Logo */}
              {niche.logo_url && (
                <div style={{marginBottom: '1.5rem'}}>
                  <img 
                    src={niche.logo_url} 
                    alt={niche.name}
                    style={{
                      width: '80px',
                      height: '80px',
                      margin: '0 auto',
                      display: 'block',
                      objectFit: 'contain'
                    }}
                  />
                </div>
              )}
              
              {/* Main Title */}
              <h1 className="hero-title">
                {niche.logo_text || 'PEAKSELF'}
              </h1>
              
              {/* Subtitle */}
              <p className="hero-subtitle">
                Deep insights and expert knowledge in {(niche.display_name || niche.name).toLowerCase()}.
                Elevate your understanding with curated articles and resources.
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="hero-buttons-container">
              <Link to={`/${niche.slug}/blog`} className="hero-button-primary">
                <span>View All {niche.display_name || niche.name} Articles</span>
                <ArrowRight className="hero-arrow" />
              </Link>
              <Link to="/blog" className="hero-button-secondary">
                <span>All Blog Posts</span>
                <ArrowRight className="hero-arrow" />
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="trust-section">
              <div className="text-center mb-12">
                <h3 className="trust-title">
                  Expert Content in {niche.display_name || niche.name}
                </h3>
                <p className="trust-subtitle">
                  Curated insights for professionals
                </p>
              </div>
              
              <div className="trust-stats-container">
                <div className="text-center">
                  <div className="trust-stat-number">{posts.length}+</div>
                  <div className="trust-stat-label">Published Articles</div>
                </div>
                <div className="trust-divider"></div>
                <div className="text-center">
                  <div className="trust-stat-number">Expert</div>
                  <div className="trust-stat-label">Insights</div>
                </div>
                <div className="trust-divider"></div>
                <div className="text-center">
                  <div className="trust-stat-number">Weekly</div>
                  <div className="trust-stat-label">Updates</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Articles Section */}
      <section id="articles" className="recent-section">
        <div className="container">
          <div className="recent-header">
            <div style={{textAlign: 'center', marginBottom: '2rem'}}>
              <h2 className="recent-title">
                Latest in {niche.display_name || niche.name}
              </h2>
              <p className="recent-description">
                Stay ahead with our newest articles and fresh insights
              </p>
            </div>
          </div>
          
          {posts.length > 0 ? (
            <div className="recent-cards-container">
              {(() => {
                const heroSections = niche.hero_sections || {};
                const latestIds = heroSections.latest || [];
                const latestPosts = latestIds.length > 0
                  ? latestIds.map(id => posts.find(p => p.id === id)).filter(Boolean)
                  : posts.slice(0, 6);
                return latestPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ));
              })()}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              background: '#fafafa',
              borderRadius: '12px',
              border: '2px dashed #e5e5e5'
            }}>
              <div style={{fontSize: '3rem', marginBottom: '1rem'}}>📝</div>
              <h3 style={{fontSize: '1.5rem', fontWeight: '700', color: '#111', marginBottom: '0.5rem'}}>
                No Articles Yet
              </h3>
              <p style={{color: '#666', marginBottom: '1.5rem'}}>
                We're working on bringing you great content in this niche.
              </p>
              <Link to="/blog" className="recent-button">
                <span>Explore Other Articles</span>
                <ArrowRight className="recent-button-arrow" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <ArticleSection 
        sectionKey="trending"
        title={`Trending in ${niche.display_name || niche.name}`}
        description="Most popular articles gaining traction right now"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      <ArticleSection 
        sectionKey="popular"
        title={`Popular in ${niche.display_name || niche.name}`}
        description="Most loved articles by our community"
        posts={posts}
        niche={niche}
      />

      <ArticleSection 
        sectionKey="recommended"
        title={`Recommended in ${niche.display_name || niche.name}`}
        description="Curated picks to deepen your knowledge"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      <ArticleSection 
        sectionKey="indepth"
        title={`In-Depth ${niche.display_name || niche.name}`}
        description="Deep dives and comprehensive tutorials"
        posts={posts}
        niche={niche}
      />

      <ArticleSection 
        sectionKey="expert"
        title={`Expert ${niche.display_name || niche.name}`}
        description="Professional insights and advanced perspectives"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      <ArticleSection 
        sectionKey="essential"
        title={`Essential ${niche.display_name || niche.name}`}
        description="Must-read articles every enthusiast should know"
        posts={posts}
        niche={niche}
      />

      <ArticleSection 
        sectionKey="beginner"
        title={`Beginner's ${niche.display_name || niche.name}`}
        description="Perfect starting point for newcomers"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      <ArticleSection 
        sectionKey="advanced"
        title={`Advanced ${niche.display_name || niche.name}`}
        description="For experienced practitioners and experts"
        posts={posts}
        niche={niche}
      />

      <ArticleSection 
        sectionKey="tips"
        title={`${niche.display_name || niche.name} Tips & Tricks`}
        description="Practical tips to improve your skills"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      <ArticleSection 
        sectionKey="practices"
        title={`${niche.display_name || niche.name} Best Practices`}
        description="Industry standards and proven methodologies"
        posts={posts}
        niche={niche}
      />

      <ArticleSection 
        sectionKey="more"
        title={`More ${niche.display_name || niche.name}`}
        description="Additional insights and resources"
        posts={posts}
        niche={niche}
        background="#f8f9fa"
      />

      {/* CTA Section */}
      <section className="newsletter-section">
        <div className="container text-center">
          <div className="newsletter-badge">
            <span className="newsletter-badge-text">
              Stay Connected
            </span>
          </div>
          
          <h2 className="newsletter-title">
            Get {niche.display_name || niche.name} Updates
          </h2>
          <p className="newsletter-description">
            Subscribe to receive the latest articles and insights in {(niche.display_name || niche.name).toLowerCase()} delivered to your inbox
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
            Join thousands of readers. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
};

export default NichePage;
