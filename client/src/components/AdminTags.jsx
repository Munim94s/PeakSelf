import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import SkeletonTable from './SkeletonTable';
import './AdminTags.css';

export default function AdminTags() {
  const modal = useModal();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(endpoints.tags.list);
      setTags(data.tags);
    } catch (err) {
      setError(response.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({ name: tag.name, color: tag.color });
    } else {
      setEditingTag(null);
      setFormData({ name: '', color: '#3b82f6' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTag(null);
    setFormData({ name: '', color: '#3b82f6' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTag) {
        const { data } = await apiClient.put(endpoints.tags.update(editingTag.id), formData);
        setTags(tags.map(t => t.id === editingTag.id ? data.tag : t));
      } else {
        const { data } = await apiClient.post(endpoints.tags.create, formData);
        setTags([data.tag, ...tags]);
      }
      handleCloseModal();
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  const handleDelete = async (tag) => {
    const postCount = parseInt(tag.post_count) || 0;
    const message = postCount > 0
      ? `This tag is used in ${postCount} post${postCount !== 1 ? 's' : ''}. Are you sure you want to delete it?`
      : 'Are you sure you want to delete this tag?';

    const confirmed = await modal.confirm(message, 'Confirm Delete', { variant: 'danger' });
    if (!confirmed) return;

    try {
      await apiClient.delete(endpoints.tags.delete(tag.id));
      setTags(tags.filter(t => t.id !== tag.id));
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  if (loading) return <SkeletonTable rows={5} />;
  if (error) return <div style={{padding: '2rem', color: '#b91c1c'}}>Error: {error}</div>;

  return (
    <div className="admin-tags">
      <div className="tags-header">
        <h2>Tags</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Tag
        </button>
      </div>

      <div className="tags-grid">
        {tags.map(tag => (
          <div key={tag.id} className="tag-card">
            <div className="tag-info">
              <div 
                className="tag-color-preview" 
                style={{ backgroundColor: tag.color }}
              />
              <div className="tag-details">
                <div className="tag-name">{tag.name}</div>
                <div className="tag-meta">
                  {tag.post_count} post{tag.post_count !== '1' ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="tag-actions">
              <button 
                className="btn-icon" 
                onClick={() => handleOpenModal(tag)}
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                className="btn-icon danger" 
                onClick={() => handleDelete(tag)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {tags.length === 0 && (
        <div className="no-tags">
          <p>No tags yet. Create your first tag to organize your blog posts.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="tag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTag ? 'Edit Tag' : 'Create Tag'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="tag-name">Tag Name</label>
                <input
                  id="tag-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Technology, Lifestyle"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="tag-color">Color</label>
                <div className="color-input-wrapper">
                  <input
                    id="tag-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#3b82f6"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTag ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
