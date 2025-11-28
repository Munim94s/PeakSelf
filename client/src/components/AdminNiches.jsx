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
  const [activeTab, setActiveTab] = useState('details');
  const [availablePosts, setAvailablePosts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    logo_url: '',
    logo_text: 'Peakium',
    is_active: true,
    display_order: 0,
    show_on_route: true,
    hero_sections: {}
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

  const handleOpenModal = async (niche = null) => {
    if (niche) {
      setEditingNiche(niche);
      setFormData({
        name: niche.name,
        display_name: niche.display_name || '',
        logo_url: niche.logo_url || '',
        logo_text: niche.logo_text || 'Peakium',
        is_active: niche.is_active,
        display_order: niche.display_order ?? 0,
        show_on_route: niche.show_on_route ?? true,
        hero_sections: niche.hero_sections || {}
      });
      // Fetch all posts via admin endpoint and filter by this niche (published only)
      try {
        const { data } = await apiClient.get(endpoints.admin.blogPosts);
        const allPosts = data.posts || [];
        const nichePosts = allPosts.filter(p => p.niche_id === niche.id && p.status === 'published');
        setAvailablePosts(nichePosts);
      } catch (err) {
        console.error('Failed to fetch posts:', err);
      }
    } else {
      setEditingNiche(null);
      setFormData({
        name: '',
        display_name: '',
        logo_url: '',
        logo_text: 'Peakium',
        is_active: true,
        display_order: 0,
        show_on_route: true,
        hero_sections: {}
      });
      setAvailablePosts([]);
    }
    setActiveTab('details');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingNiche(null);
    setActiveTab('details');
    setAvailablePosts([]);
    setFormData({
      name: '',
      display_name: '',
      logo_url: '',
      logo_text: 'Peakium',
      is_active: true,
      display_order: 0,
      show_on_route: true,
      hero_sections: {}
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
  if (error) return <div style={{ padding: '2rem', color: '#b91c1c' }}>Error: {error}</div>;

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
                  {!niche.is_active && <span style={{ color: '#9ca3af', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(Inactive)</span>}
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

            {/* Tabs */}
            {editingNiche && (
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                padding: '0.5rem',
                background: '#f3f4f6',
                borderRadius: '10px',
                marginBottom: '1.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1.25rem',
                    background: activeTab === 'details' ? 'white' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: activeTab === 'details' ? '#111' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTab === 'details' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'details') {
                      e.target.style.background = '#e5e7eb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'details') {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('hero')}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1.25rem',
                    background: activeTab === 'hero' ? 'white' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    color: activeTab === 'hero' ? '#111' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'all 0.2s ease',
                    boxShadow: activeTab === 'hero' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (activeTab !== 'hero') {
                      e.target.style.background = '#e5e7eb';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTab !== 'hero') {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  Hero Sections
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {activeTab === 'details' && (
                <>
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
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
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
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
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
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
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
                      placeholder="Peakium"
                    />
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Text to display next to the logo (e.g., "Peakium", "Peakium Tech")
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
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Lower numbers appear first on the route site (0, 1, 2, etc.)
                    </small>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                      Active
                    </label>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Only active niches are shown on the website
                    </small>
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.show_on_route}
                        onChange={(e) => setFormData({ ...formData, show_on_route: e.target.checked })}
                      />
                      Show on Homepage & Header
                    </label>
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      Display this niche on the homepage hero section and in the header navigation menu. Niche will still be accessible via direct URL even when unchecked.
                    </small>
                  </div>
                </>
              )}

              {activeTab === 'hero' && editingNiche && (
                <HeroSectionsTab
                  availablePosts={availablePosts}
                  heroSections={formData.hero_sections}
                  onChange={(sections) => setFormData({ ...formData, hero_sections: sections })}
                />
              )}

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

function HeroSectionsTab({ availablePosts, heroSections, onChange }) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState({});

  const sections = [
    { key: 'latest', label: 'Latest', count: 6 },
    { key: 'trending', label: 'Trending', count: 6 },
    { key: 'popular', label: 'Popular', count: 6 },
    { key: 'recommended', label: 'Recommended', count: 6 },
    { key: 'indepth', label: 'In-Depth', count: 6 },
    { key: 'expert', label: 'Expert', count: 6 },
    { key: 'essential', label: 'Essential', count: 6 },
    { key: 'beginner', label: 'Beginner', count: 6 },
    { key: 'advanced', label: 'Advanced', count: 6 },
    { key: 'tips', label: 'Tips & Tricks', count: 6 },
    { key: 'practices', label: 'Best Practices', count: 6 },
    { key: 'more', label: 'More', count: 6 }
  ];

  // Filter posts based on search query
  const filteredPosts = React.useMemo(() => {
    if (!searchQuery.trim()) return availablePosts;
    const query = searchQuery.toLowerCase();
    return availablePosts.filter(post =>
      post.title.toLowerCase().includes(query)
    );
  }, [availablePosts, searchQuery]);

  const handleTogglePost = (sectionKey, postId) => {
    const currentSection = heroSections[sectionKey] || [];
    const isSelected = currentSection.includes(postId);

    let newSection;
    if (isSelected) {
      newSection = currentSection.filter(id => id !== postId);
    } else {
      const section = sections.find(s => s.key === sectionKey);
      if (currentSection.length >= section.count) {
        // Replace the last one
        newSection = [...currentSection.slice(0, section.count - 1), postId];
      } else {
        newSection = [...currentSection, postId];
      }
    }

    onChange({ ...heroSections, [sectionKey]: newSection });
  };

  if (availablePosts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <p>No posts available in this niche yet.</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Create posts first, then come back to configure hero sections.</p>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Select which posts appear in each section on the niche page. Each section can display up to {sections[0].count} posts.
        </p>

        {/* Search Input */}
        <div style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10, paddingBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search posts in this niche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '0.95rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          {searchQuery && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Found {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  marginLeft: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.875rem'
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {sections.map(section => {
        const selectedPosts = heroSections[section.key] || [];

        return (
          <div key={section.key} style={{
            marginBottom: '2rem',
            padding: '1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                {section.label}
              </h4>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {selectedPosts.length}/{section.count} selected
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredPosts.length === 0 && searchQuery ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No posts found matching "{searchQuery}"
                </div>
              ) : (
                <>
                  {filteredPosts.slice(0, expandedSections[section.key] ? undefined : 6).map(post => {
                    const isSelected = selectedPosts.includes(post.id);
                    const selectionIndex = selectedPosts.indexOf(post.id);

                    return (
                      <label
                        key={post.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: isSelected ? '#f0f9ff' : '#fafafa',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePost(section.key, post.id)}
                          style={{ marginRight: '0.75rem' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {post.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {new Date(post.published_at || post.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{
                            background: '#3b82f6',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            #{selectionIndex + 1}
                          </div>
                        )}
                      </label>
                    );
                  })}

                  {filteredPosts.length > 6 && !expandedSections[section.key] && !searchQuery && (
                    <button
                      type="button"
                      onClick={() => setExpandedSections({ ...expandedSections, [section.key]: true })}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        color: '#3b82f6',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = '#e5e7eb'}
                      onMouseOut={(e) => e.target.style.background = '#f3f4f6'}
                    >
                      Show {filteredPosts.length - 6} more posts
                    </button>
                  )}

                  {expandedSections[section.key] && (
                    <button
                      type="button"
                      onClick={() => setExpandedSections({ ...expandedSections, [section.key]: false })}
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        color: '#6b7280',
                        fontWeight: '500',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      Show less
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
