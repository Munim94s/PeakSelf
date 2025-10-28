import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import './PostCard.css';

const PostCard = ({ post, featured = false, showMeta = true }) => {
  // Memoize expensive computations
  const formattedDate = useMemo(() => {
    return new Date(post.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [post.publishedAt]);

  const readingTime = useMemo(() => {
    const wordsPerMinute = 200;
    const wordCount = post.content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  }, [post.content]);

  return (
    <article className="post-card">
      {/* Featured Image */}
      <div className={`post-card-image-container ${featured ? 'featured' : 'regular'}`}>
        <img
          src={post.image || '/api/placeholder/600/400'}
          alt={post.title}
          className="post-card-image"
        />
        <div className="post-card-category">
          <span className="post-card-category-badge">
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="post-card-content">
        {showMeta && (
          <div className="post-card-meta">
            <div className="post-card-meta-item">
              <Calendar className="post-card-meta-icon" />
              <span className="post-card-meta-text">
                {formattedDate}
              </span>
            </div>
            <div className="post-card-meta-item">
              <Clock className="post-card-meta-icon" />
              <span className="post-card-meta-text">
                {readingTime} min read
              </span>
            </div>
            <div className="post-card-meta-item">
              <User className="post-card-meta-icon" />
              <span className="post-card-meta-text">
                {post.author}
              </span>
            </div>
          </div>
        )}

        <h2 className={`post-card-title ${featured ? 'featured' : 'regular'}`}>
          <Link to={`/blog/${post.slug}`} className="post-card-title-link">
            {post.title}
          </Link>
        </h2>

        <p className="post-card-excerpt">
          {post.excerpt}
        </p>

        <div className="post-card-footer">
          <div className="post-card-tags">
            {post.tags?.slice(0, 3).map((tag, index) => (
              <span key={index} className="post-card-tag">
                #{tag}
              </span>
            ))}
          </div>
          
          <Link to={`/blog/${post.slug}`} className="post-card-read-more">
            Read More
            <ArrowRight className="post-card-read-more-arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
};

// Memoize PostCard to prevent re-renders when props don't change
export default React.memo(PostCard);

