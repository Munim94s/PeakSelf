import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ContentEditor from './ContentEditor';
import AdminTags from './AdminTags';
import SkeletonGrid from './SkeletonGrid';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import './AdminContent.css';
import './AdminSessions.css';

export default function AdminContent() {
  const modal = useModal();
  const [activeTab, setActiveTab] = useState('posts');
  const [showEditor, setShowEditor] = useState(false);
  const [posts, setPosts] = useState([]);
  const [editingPost, setEditingPost] = useState(null);
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

  const handleSavePost = async (postData) => {
    try {
      if (editingPost) {
        // Update existing post
        const { data } = await apiClient.put(endpoints.blog.update(editingPost.id), postData);
        setPosts(posts.map(p => p.id === editingPost.id ? data.post : p));
        setEditingPost(null);
      } else {
        // Create new post
        const { data } = await apiClient.post(endpoints.blog.create, postData);
        setPosts([data.post, ...posts]);
      }
      setShowEditor(false);
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingPost(null);
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
            onClick={() => setShowEditor(true)}
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
                  <button className="btn small">Publish</button>
                  <button className="btn small danger" onClick={() => handleDeletePost(p.id)}>Delete</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {showEditor && (
        <ContentEditor 
          onSave={handleSavePost} 
          onCancel={handleCancel}
          initialPost={editingPost}
        />
      )}
    </div>
  );
}
