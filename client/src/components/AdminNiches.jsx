import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Upload } from 'lucide-react';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';
import SkeletonTable from './SkeletonTable';
import './AdminTags.css';

export default function AdminNiches() {
  const modal = useModal();
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNiche, setEditingNiche] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    display_name: '',
    logo_url: '', 
    logo_text: 'Peakself',
    is_active: true,
    display_order: 0,
    show_on_route: true
  });

  useEffect(() => {
    fetchNiches();
  }, []);

  const fetchNiches = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get(endpoints.niches.list);
      setNiches(data.niches);
    } catch (err) {
      setError(response.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (niche = null) => {
    if (niche) {
      setEditingNiche(niche);
      setFormData({ 
        name: niche.name,
        display_name: niche.display_name || '',
        logo_url: niche.logo_url || '', 
        logo_text: niche.logo_text || 'Peakself',
        is_active: niche.is_active,
        display_order: niche.display_order ?? 0,
        show_on_route: niche.show_on_route ?? true
      });
    } else {
      setEditingNiche(null);
      setFormData({ 
        name: '',
        display_name: '',
        logo_url: '', 
        logo_text: 'Peakself',
        is_active: true,
        display_order: 0,
        show_on_route: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNiche(null);
    setFormData({ 
      name: '',
      display_name: '',
      logo_url: '', 
      logo_text: 'Peakself',
      is_active: true,
      display_order: 0,
      show_on_route: true
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingNiche) {
        const { data } = await apiClient.put(endpoints.niches.update(editingNiche.id), formData);
        setNiches(niches.map(n => n.id === editingNiche.id ? data.niche : n));
      } else {
        const { data } = await apiClient.post(endpoints.niches.create, formData);
        setNiches([...niches, data.niche]);
      }
      handleCloseModal();
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  const handleDelete = async (niche) => {
    const postCount = parseInt(niche.post_count) || 0;
    const message = postCount > 0
      ? `This niche is used in ${postCount} post${postCount !== 1 ? 's' : ''}. Are you sure you want to delete it?`
      : 'Are you sure you want to delete this niche?';

    const confirmed = await modal.confirm(message, 'Confirm Delete', { variant: 'danger' });
    if (!confirmed) return;

    try {
      await apiClient.delete(endpoints.niches.delete(niche.id));
      setNiches(niches.filter(n => n.id !== niche.id));
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  if (loading) return <SkeletonTable rows={5} />;
  if (error) return <div style={{padding: '2rem', color: '#b91c1c'}}>Error: {error}</div>;

  return (
    <div className="admin-tags">
      <div className="tags-header">
        <h2>Niches</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Niche
        </button>
      </div>

      <div className="tags-grid">
        {niches.map(niche => (
          <div key={niche.id} className="tag-card">
            <div className="tag-info">
              <div className="tag-details">
                <div className="tag-name">
                  {niche.name}
                  {!niche.is_active && <span style={{color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.5rem'}}>(Inactive)</span>}
                </div>
                <div className="tag-meta">
                  Order: {niche.display_order ?? 0} • {niche.post_count} post{niche.post_count !== '1' ? 's' : ''}
                  {niche.show_on_route && ' • Shown in menu'}
                  {niche.logo_text && ` • Logo: ${niche.logo_text}`}
                </div>
              </div>
            </div>
            <div className="tag-actions">
              <button 
                className="btn-icon" 
                onClick={() => handleOpenModal(niche)}
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
              <button 
                className="btn-icon danger" 
                onClick={() => handleDelete(niche)}
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {niches.length === 0 && (
        <div className="no-tags">
          <p>No niches yet. Create your first niche to organize your blog posts.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="tag-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingNiche ? 'Edit Niche' : 'Create Niche'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="niche-name">Niche Name</label>
                <input
                  id="niche-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tech, Dev, Cars"
                  required
                  autoFocus
                />
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Internal name for the niche (used in URLs)
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="display-name">Display Name (Optional)</label>
                <input
                  id="display-name"
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g., Technology, Development, Automotive"
                />
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Name shown in frontend text (e.g., "Get connected with Technology"). Defaults to niche name if empty.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="logo-url">Logo URL (Optional)</label>
                <input
                  id="logo-url"
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  URL for the black P sign or custom logo
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="logo-text">Logo Text</label>
                <input
                  id="logo-text"
                  type="text"
                  value={formData.logo_text}
                  onChange={(e) => setFormData({ ...formData, logo_text: e.target.value })}
                  placeholder="Peakself"
                />
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Text to display next to the logo (e.g., "Peakself", "Peakself Tech")
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="display-order">Display Order</label>
                <input
                  id="display-order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Lower numbers appear first on the route site (0, 1, 2, etc.)
                </small>
              </div>
              <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Only active niches are shown on the website
                </small>
              </div>
              <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input
                    type="checkbox"
                    checked={formData.show_on_route}
                    onChange={(e) => setFormData({ ...formData, show_on_route: e.target.checked })}
                  />
                  Show on Route (Header Menu)
                </label>
                <small style={{color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block'}}>
                  Display this niche in the header navigation menu
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingNiche ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
