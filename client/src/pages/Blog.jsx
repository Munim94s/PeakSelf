import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { apiClient, endpoints } from '../api';
import PostCard from '../components/PostCard';
import SearchBar from '../components/SearchBar';
import './Blog.css';

const Blog = () => {
  const { nicheSlug } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [niche, setNiche] = useState(null);
  const observerRef = useRef();
  const lastPostRef = useRef();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setPosts([]);
        setHasMore(true);
        
        if (nicheSlug) {
          // Fetch niche-specific posts
          const { data } = await apiClient.get(endpoints.niches.bySlug(nicheSlug));
          setNiche(data.niche);
          setPosts(data.posts || []);
          setHasMore(false); // Niche pages show all posts at once for now
        } else {
          // Fetch all posts with pagination
          const { data } = await apiClient.get(endpoints.blog.list + '?limit=12');
          setPosts(data.posts || []);
          setHasMore(data.posts && data.posts.length === 12);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [nicheSlug]);

  // Infinite scroll
  useEffect(() => {
    if (loading || loadingMore || !hasMore || nicheSlug) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    }, { threshold: 0.1 });

    if (lastPostRef.current) {
      observer.observe(lastPostRef.current);
    }

    observerRef.current = observer;

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [loading, loadingMore, hasMore, posts, nicheSlug]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const { data } = await apiClient.get(endpoints.blog.list + `?limit=12&offset=${posts.length}`);
      const newPosts = data.posts || [];
      
      if (newPosts.length === 0 || newPosts.length < 12) {
        setHasMore(false);
      }
      
      setPosts(prev => [...prev, ...newPosts]);
    } catch (err) {
      console.error('Failed to load more posts:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Fuse.js configuration
  const fuse = useMemo(() => {
    const options = {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'excerpt', weight: 0.2 },
        { name: 'tags.name', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true
    };
    return new Fuse(posts, options);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!searchTerm) return posts;
    
    // Use Fuse.js for fuzzy search
    const results = fuse.search(searchTerm);
    return results.map(result => result.item);
  }, [posts, searchTerm, fuse]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
  }, []);

  const shimmerStyle = {
    background: 'linear-gradient(90deg, #d0d0d0 0%, #f0f0f0 20%, #d0d0d0 40%, #d0d0d0 100%)',
    backgroundSize: '1000px 100%',
    borderRadius: '8px',
    animation: 'shimmer 1.5s infinite linear'
  };

  const SkeletonPostCard = () => (
    <article style={{
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#fff',
      height: '100%',
      minHeight: '380px',
    }}>
      <div style={{ ...shimmerStyle, height: '200px', width: '100%', flexShrink: 0 }} />
      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
        <div style={{ ...shimmerStyle, height: '20px', width: '70px' }} />
        <div style={{ ...shimmerStyle, height: '28px', width: '90%' }} />
        <div style={{ ...shimmerStyle, height: '18px', width: '100%' }} />
        <div style={{ ...shimmerStyle, height: '18px', width: '95%' }} />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ ...shimmerStyle, height: '24px', width: '50px' }} />
          <div style={{ ...shimmerStyle, height: '24px', width: '60px' }} />
        </div>
      </div>
    </article>
  );

  if (loading) {
    return (
      <div className="blog-container">
        <div className="blog-content-wrapper">
          <div className="blog-header">
            <div style={{...shimmerStyle, height: '48px', width: '200px'}} />
            <div style={{...shimmerStyle, height: '24px', width: '60%', marginTop: '1rem'}} />
          </div>
          <div className="recent-cards-container" style={{marginTop: '3rem'}}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{display: 'flex', flexDirection: 'column', minHeight: '380px'}}>
                <SkeletonPostCard />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-container">
      <div className="blog-content-wrapper">
        {/* Header */}
        <div className="blog-header">
          <h1 className="blog-title">
            {niche ? `${niche.display_name || niche.name} Blog` : 'Blog'}
          </h1>
          <p className="blog-subtitle">
            {niche 
              ? `Explore articles and insights about ${(niche.display_name || niche.name).toLowerCase()}`
              : 'Explore our collection of articles covering technology, personal growth, productivity, and lifestyle topics to help you reach your peak potential.'
            }
          </p>
        </div>

        {/* Search and Filters */}
        <div className="blog-filters">
          <div className="blog-search-container">
            <SearchBar 
              onSearch={handleSearch}
              placeholder="Search articles, tags, or topics..."
            />
          </div>
        </div>

        {/* Results Count */}
        <div className="blog-results-count">
          <p>
            {filteredPosts.length === 0 
              ? 'No articles found' 
              : `Showing ${filteredPosts.length} article${filteredPosts.length !== 1 ? 's' : ''}`
            }
            {searchTerm && ` for "${searchTerm}"`}
            {!searchTerm && hasMore && ` (loading more as you scroll...)`}
          </p>
        </div>

        {/* Posts */}
        {filteredPosts.length > 0 ? (
          <div className="recent-cards-container" style={{marginTop: '2rem'}}>
            {filteredPosts.map((post, index) => {
              if (index === filteredPosts.length - 1) {
                return (
                  <div key={`post-${post.id}-${index}`} ref={lastPostRef} style={{display: 'flex', flexDirection: 'column', minHeight: '380px'}}>
                    <PostCard post={post} />
                  </div>
                );
              }
              return (
                <div key={`post-${post.id}-${index}`} style={{display: 'flex', flexDirection: 'column', minHeight: '380px'}}>
                  <PostCard post={post} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="blog-no-results">
            <div className="blog-no-results-title">No articles found</div>
            <p className="blog-no-results-subtitle">
              {searchTerm ? 'Try adjusting your search terms' : 'No articles published yet'}
            </p>
            {searchTerm && (
              <button
                onClick={handleClearFilters}
                className="blog-clear-filters-btn"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {/* Loading more indicator */}
        {loadingMore && (
          <div className="recent-cards-container" style={{marginTop: '2rem'}}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{display: 'flex', flexDirection: 'column', minHeight: '380px'}}>
                <SkeletonPostCard />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;


