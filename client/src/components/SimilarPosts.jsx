import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { apiClient, endpoints } from '../api';
import PostCard from './PostCard';
import './SimilarPosts.css';

const SimilarPosts = ({ postId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilarPosts = async () => {
      if (!postId) return;
      
      try {
        setLoading(true);
        const { data } = await apiClient.get(endpoints.blog.similar(postId));
        setPosts(data.posts || []);
      } catch (error) {
        console.error('Error fetching similar posts:', error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarPosts();
  }, [postId]);

  if (loading) {
    return (
      <div className="similar-posts-section">
        <div className="similar-posts-container">
          <h2 className="similar-posts-title">Related Articles</h2>
          <div className="similar-posts-grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="similar-post-skeleton">
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return null;
  }

  return (
    <div className="similar-posts-section">
      <div className="similar-posts-container">
        <h2 className="similar-posts-title">Related Articles</h2>
        <p className="similar-posts-subtitle">
          Continue exploring topics that might interest you
        </p>
        <div className="similar-posts-grid">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showMeta={false} />
          ))}
        </div>
        <div className="similar-posts-view-more">
          <Link to="/blog" className="view-more-button">
            View More Articles
            <ArrowRight className="view-more-arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SimilarPosts;
