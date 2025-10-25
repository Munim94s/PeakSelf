import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ContentEditor from './ContentEditor';
import { apiFetch } from '../utils/api';
import './AdminContent.css';
import './AdminSessions.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminContent() {
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
      const res = await apiFetch(`${API_BASE}/api/admin/blog`, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch posts');
      setPosts(data.posts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePost = async (postData) => {
    try {
      if (editingPost) {
        // Update existing post
        const res = await apiFetch(`${API_BASE}/api/admin/blog/${editingPost.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update post');
        setPosts(posts.map(p => p.id === editingPost.id ? data.post : p));
        setEditingPost(null);
      } else {
        // Create new post
        const res = await apiFetch(`${API_BASE}/api/admin/blog`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create post');
        setPosts([data.post, ...posts]);
      }
      setShowEditor(false);
    } catch (err) {
      alert(err.message);
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
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const res = await apiFetch(`${API_BASE}/api/admin/blog/${postId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete post');
      }
      setPosts(posts.filter(p => p.id !== postId));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div style={{padding: '2rem'}}>Loading posts...</div>;
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
          <button className="traffic-chip" type="button">All Posts</button>
          <button className="traffic-chip" type="button">Drafts</button>
          <button className="traffic-chip" type="button">Categories</button>
        </div>
      </div>

      <div className="card-grid">
        {posts.map((p) => (
          <div key={p.id} className="content-card">
            <div className="content-title">{p.title}</div>
            <div className="content-excerpt">{p.excerpt}</div>
            <div className="row-actions">
              <button className="btn small" onClick={() => handleEditPost(p)}>Edit</button>
              <button className="btn small">Publish</button>
              <button className="btn small danger" onClick={() => handleDeletePost(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

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
