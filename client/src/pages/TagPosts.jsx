import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiClient, endpoints } from '../api';
import PostCard from '../components/PostCard';
import '../pages/Blog.css';

const TagPosts = () => {
  const { tagSlugs } = useParams(); // comma-separated slugs
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [tagNames, setTagNames] = useState([]);
  const observerRef = useRef();
  const lastPostRef = useRef();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        setPosts([]);
        setHasMore(true);
        // for now, support single tag via existing endpoint; if multiple, fetch sequentially and merge unique
        const slugs = (tagSlugs || '').split(',').map(s => s.trim()).filter(Boolean);
        if (slugs.length === 0) {
          setPosts([]);
          return;
        }

        if (slugs.length === 1) {
          const { data } = await apiClient.get(endpoints.blog.list, { tag: slugs[0], limit: 12 });
          const fetchedPosts = data.posts || [];
          setPosts(fetchedPosts);
          setHasMore(fetchedPosts.length === 12);
          // Extract tag names from posts
          if (fetchedPosts.length > 0 && fetchedPosts[0].tags) {
            const matchedTag = fetchedPosts[0].tags.find(t => t.slug === slugs[0]);
            if (matchedTag) setTagNames([matchedTag.name]);
          }
        } else {
          // Fetch for each tag and merge unique posts (no pagination for multiple tags yet)
          const results = await Promise.all(
            slugs.map(slug =>
              apiClient.get(endpoints.blog.list, { tag: slug, limit: 30 })
            )
          );
          const merged = new Map();
          const names = [];
          results.forEach(({ data }) => {
            (data.posts || []).forEach(p => merged.set(p.id, p));
            // Extract tag names
            if (data.posts && data.posts.length > 0 && data.posts[0].tags) {
              data.posts[0].tags.forEach(t => {
                if (slugs.includes(t.slug) && !names.includes(t.name)) {
                  names.push(t.name);
                }
              });
            }
          });
          const mergedPosts = Array.from(merged.values());
          setPosts(mergedPosts);
          setHasMore(false); // no pagination for multiple tags yet
          setTagNames(names);
        }
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [tagSlugs]);

  // Infinite scroll
  useEffect(() => {
    const slugs = (tagSlugs || '').split(',').map(s => s.trim()).filter(Boolean);
    if (loading || loadingMore || !hasMore || slugs.length !== 1) return;

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
  }, [loading, loadingMore, hasMore, posts, tagSlugs]);

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    
    const slugs = (tagSlugs || '').split(',').map(s => s.trim()).filter(Boolean);
    if (slugs.length !== 1) return; // Only support pagination for single tags
    
    try {
      setLoadingMore(true);
      const { data } = await apiClient.get(endpoints.blog.list, { 
        tag: slugs[0], limit: 12, offset: posts.length 
      });
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
            <div style={{...shimmerStyle, height: '48px', width: '200px', margin: '0 auto'}} />
            <div style={{...shimmerStyle, height: '24px', width: '60%', marginTop: '1rem', margin: '1rem auto 0'}} />
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

  if (error) {
    return (
      <div className="blog-container">
        <div className="blog-content-wrapper">
          <div className="blog-no-results">
            <div className="blog-no-results-title">Failed to load posts</div>
            <p className="blog-no-results-subtitle">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  const displayTags = tagNames.length > 0 ? tagNames.join(', ') : tagSlugs.replace(/,/g, ', ');

  return (
    <div className="blog-container">
      <div className="blog-content-wrapper">
        {/* Header */}
        <div className="blog-header">
          <h1 className="blog-title">
            {tagNames.length === 1 ? `#${displayTags}` : `Tagged: ${displayTags}`}
          </h1>
          <p className="blog-subtitle">
            Dive into our curated collection of articles tagged with {displayTags}. 
            Discover insights, practical tips, and in-depth explorations on this topic, 
            carefully crafted to help you grow and achieve your goals.
          </p>
        </div>

        {/* Results Count */}
        <div className="blog-results-count">
          <p>
            {posts.length === 0 
              ? 'No articles found' 
              : `Showing ${posts.length} article${posts.length !== 1 ? 's' : ''}`
            }
            {hasMore && ` (loading more as you scroll...)`}
          </p>
        </div>

        {/* Posts */}
        {posts.length > 0 ? (
          <div className="recent-cards-container" style={{marginTop: '2rem'}}>
            {posts.map((post, index) => {
              if (index === posts.length - 1) {
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
              No posts with this tag yet
            </p>
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

        {/* End of results - link to main blog */}
        {!hasMore && posts.length > 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
              No more articles with this tag.
            </p>
            <Link to="/blog" className="recent-button">
              <span>View other articles</span>
              <ArrowRight className="recent-button-arrow" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagPosts;
