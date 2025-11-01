import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import AdminTags from './AdminTags';
import SkeletonGrid from './SkeletonGrid';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import './AdminContent.css';
import './AdminSessions.css';

export default function AdminContent() {
  const modal = useModal();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(endpoints.admin.blogPosts);
      setPosts(data.posts);
    } catch (err) {
      setError(response.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEditPost = (post) => {
    navigate(`/admin/content/edit?id=${post.id}`);
  };

  const handleCreatePost = () => {
    navigate('/admin/content/new');
  };

  const handleDeletePost = async (postId) => {
    const confirmed = await modal.confirm('Are you sure you want to delete this post?', 'Confirm Delete', { variant: 'danger' });
    if (!confirmed) return;
    
    try {
      await apiClient.delete(endpoints.blog.delete(postId));
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  const handleTogglePublish = async (postId, currentStatus) => {
    try {
      const { data } = await apiClient.patch(endpoints.blog.publish(postId));
      setPosts(posts.map(p => p.id === postId ? { ...p, status: data.post.status } : p));
      await modal.alert(data.message, 'Success');
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  if (loading) return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Content</div>
        </div>
      </div>
      <SkeletonGrid cards={6} type="content" />
    </div>
  );
  if (error) return <div style={{padding: '2rem', color: '#b91c1c'}}>Error: {error}</div>;

  return (
    <div className="admin-content">
      <div className="traffic-toolbar">
        <div className="toolbar-top">
          <div className="title">Content</div>
          <button 
            className="add-content-btn" 
            onClick={handleCreatePost}
            title="Add Content"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="traffic-chip-row">
          <button 
            className={`traffic-chip ${activeTab === 'posts' ? 'active' : ''}`} 
            type="button"
            onClick={() => setActiveTab('posts')}
          >
            All Posts
          </button>
          <button 
            className={`traffic-chip ${activeTab === 'drafts' ? 'active' : ''}`} 
            type="button"
            onClick={() => setActiveTab('drafts')}
          >
            Drafts
          </button>
          <button 
            className={`traffic-chip ${activeTab === 'tags' ? 'active' : ''}`} 
            type="button"
            onClick={() => setActiveTab('tags')}
          >
            Tags
          </button>
        </div>
      </div>

      {activeTab === 'tags' ? (
        <AdminTags />
      ) : (
        <div className="card-grid">
          {posts
            .filter(p => activeTab === 'drafts' ? p.status === 'draft' : true)
            .map((p) => (
              <div key={p.id} className="content-card">
                <div className="content-title">{p.title}</div>
                <div className="content-excerpt">{p.excerpt}</div>
                {p.tags && p.tags.length > 0 && (
                  <div className="content-tags">
                    {p.tags.map(tag => (
                      <span 
                        key={tag.id} 
                        className="post-tag"
                        style={{ 
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: tag.color
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="row-actions">
                  <button className="btn small" onClick={() => handleEditPost(p)}>Edit</button>
                  <button 
                    className="btn small" 
                    onClick={() => handleTogglePublish(p.id, p.status)}
                  >
                    {p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn small danger" onClick={() => handleDeletePost(p.id)}>Delete</button>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
