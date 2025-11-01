import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ContentEditor from '../components/ContentEditor';
import { apiClient, endpoints, response } from '../api';
import { useModal } from '../contexts/ModalContext';

export default function ContentEditorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modal = useModal();
  const postId = searchParams.get('id');
  const [initialPost, setInitialPost] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId) {
      // Load the post data for editing
      const loadPost = async () => {
        try {
          setLoading(true);
          const { data } = await apiClient.get(endpoints.admin.blogPosts);
          const post = data.posts.find(p => p.id === parseInt(postId));
          if (post) {
            setInitialPost(post);
          } else {
            await modal.alert('Post not found', 'Error');
            navigate('/admin/content');
          }
        } catch (err) {
          await modal.alert(response.getErrorMessage(err), 'Error');
          navigate('/admin/content');
        } finally {
          setLoading(false);
        }
      };
      loadPost();
    }
  }, [postId, navigate, modal]);

  const handleSave = async (postData) => {
    try {
      if (postId) {
        // Update existing post
        await apiClient.put(endpoints.blog.update(postId), postData);
      } else {
        // Create new post
        await apiClient.post(endpoints.blog.create, postData);
      }
      navigate('/admin/content');
    } catch (err) {
      await modal.alert(response.getErrorMessage(err), 'Error');
    }
  };

  const handleCancel = () => {
    navigate('/admin/content');
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <ContentEditor
      onSave={handleSave}
      onCancel={handleCancel}
      initialPost={initialPost}
    />
  );
}
