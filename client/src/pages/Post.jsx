import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft, Share2, Heart } from 'lucide-react';
import { apiClient, endpoints } from '../api';
import { trackBlogView, trackBlogReadProgress, trackBlogReadComplete, trackSocialShare } from '../utils/analytics';
import { hasConsent } from '../utils/consent';
import './Post.css';

const Post = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const startTimeRef = useRef(null);
  const hasTrackedView = useRef(false);
  const trackedReadProgress = useRef(new Set());

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get(endpoints.blog.bySlug(slug));
        setPost(data.post);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  // Track blog view when post loads
  useEffect(() => {
    if (post && !hasTrackedView.current && hasConsent()) {
      const category = post.tags && post.tags.length > 0 ? post.tags[0].name : 'uncategorized';
      trackBlogView(post.title, slug, category);
      hasTrackedView.current = true;
      startTimeRef.current = Date.now();
    }
  }, [post, slug]);

  // Track read progress and completion
  useEffect(() => {
    if (!post || !hasConsent()) return;

    const handleScroll = () => {
      const article = document.querySelector('article');
      if (!article) return;

      const scrollTop = window.pageYOffset;
      const articleTop = article.offsetTop;
      const articleHeight = article.offsetHeight;
      const windowHeight = window.innerHeight;

      const scrolledIntoArticle = Math.max(0, scrollTop - articleTop);
      const visibleHeight = Math.min(articleHeight, windowHeight);
      const percentRead = Math.round((scrolledIntoArticle / (articleHeight - visibleHeight)) * 100);

      // Track at 25%, 50%, 75%, 90%
      const milestones = [25, 50, 75, 90];
      for (const milestone of milestones) {
        if (percentRead >= milestone && !trackedReadProgress.current.has(milestone)) {
          trackedReadProgress.current.add(milestone);
          trackBlogReadProgress(slug, milestone);
        }
      }

      // Track completion when user reaches 90% and has spent enough time
      if (percentRead >= 90 && startTimeRef.current) {
        const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
        if (timeSpent > 10 && !trackedReadProgress.current.has('complete')) {
          trackedReadProgress.current.add('complete');
          trackBlogReadComplete(slug, timeSpent);
        }
      }
    };

    let timeoutId;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 500);
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [post, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The article you're looking for doesn't exist.</p>
          <Link
            to="/blog"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content) => {
    const wordsPerMinute = 200;
    // Strip HTML tags for word count
    const text = content.replace(/<[^>]*>/g, ' ');
    const wordCount = text.trim().split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <Link
          to="/blog"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Blog
        </Link>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Meta Information */}
        <div className="flex flex-wrap items-center gap-6 text-gray-600 mb-8">
          {post.author && (
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{post.author}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{formatDate(post.published_at || post.created_at)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>{getReadingTime(post.content)} min read</span>
          </div>
        </div>

        {/* Featured Image */}
        {post.image && (
          <div className="mb-8">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg shadow-lg"
            />
          </div>
        )}

        {/* Article Actions */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="post-tag"
                  style={{
                    backgroundColor: tag.color,
                    color: '#ffffff'
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center space-x-6">
            <button 
              className="flex items-center space-x-2 text-gray-600 hover:text-red-500 transition-colors duration-200"
              data-track-click="blog_like"
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">Like</span>
            </button>
            <button 
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-500 transition-colors duration-200"
              onClick={() => {
                // Track social share
                if (navigator.share) {
                  navigator.share({
                    title: post.title,
                    url: window.location.href
                  }).then(() => {
                    trackSocialShare('native_share', 'blog_post', slug);
                  }).catch(() => {});
                } else {
                  trackSocialShare('share_button', 'blog_post', slug);
                }
              }}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </div>

        {/* Article Content */}
        <div className="prose prose-lg max-w-none">
          {post.excerpt && (
            <div className="text-xl text-gray-600 mb-8 leading-relaxed">
              {post.excerpt}
            </div>
          )}
          
          <div 
            className="post-content text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>

        {/* Author Bio */}
        {post.author && (
          <div className="mt-12 p-6 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {post.author.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {post.author}
                </h3>
                <p className="text-gray-600">
                  Passionate writer and technology enthusiast with over 5 years of experience 
                  in web development and digital innovation. Loves sharing knowledge and helping 
                  others grow in their careers.
                </p>
              </div>
            </div>
          </div>
        )}
      </article>
    </div>
  );
};

export default Post;


