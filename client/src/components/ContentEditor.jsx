import React, { useState, useRef } from 'react';
import { Bold, Italic, Underline, Link as LinkIcon, Image } from 'lucide-react';
import { apiClient, endpoints } from '../api';
import { useModal } from '../contexts/ModalContext';
import './ContentEditor.css';

export default function ContentEditor({ onSave, onCancel, initialPost }) {
  const modal = useModal();
  const [title, setTitle] = useState(initialPost?.title || '');
  const [content, setContent] = useState([]);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const savedSelectionRef = useRef(null);

  // Load initial content if editing
  React.useEffect(() => {
    if (initialPost?.content && editorRef.current) {
      editorRef.current.innerHTML = initialPost.content;
    }
  }, [initialPost]);

  const applyFormat = (command) => {
    document.execCommand(command, false, null);
    editorRef.current.focus();
  };

  const insertLink = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    // Save the current selection/range
    if (selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
    
    if (selectedText) {
      setLinkText(selectedText);
    }
    setShowLinkModal(true);
  };

  const handleLinkSubmit = () => {
    setShowLinkModal(false);
    
    if (linkUrl) {
      // Need to delay slightly to ensure modal is closed and focus is back
      setTimeout(() => {
        editorRef.current.focus();
        
        // Restore the saved selection
        if (savedSelectionRef.current) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
        }
        
        const link = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText || linkUrl}</a>`;
        document.execCommand('insertHTML', false, link);
        
        savedSelectionRef.current = null;
      }, 0);
    }
    
    setLinkText('');
    setLinkUrl('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    console.log('File selected:', file);
    
    if (!file) {
      console.log('No file selected');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      await modal.alert('Please select an image file', 'Invalid File');
      return;
    }
    
    // Show loading indicator (use base64 preview temporarily)
    const reader = new FileReader();
    reader.onerror = async (error) => {
      console.error('FileReader error:', error);
      await modal.alert('Failed to read image file', 'Error');
    };
    
    reader.onload = async (event) => {
      console.log('File loaded, inserting temp image');
      
      // Focus editor before inserting
      editorRef.current.focus();
      
      const tempImageHTML = `<div class="image-wrapper uploading" contenteditable="false" data-temp="true"><img src="${event.target.result}" class="blog-image" alt="Uploading..." /></div>`;
      document.execCommand('insertHTML', false, tempImageHTML);
      
      console.log('Temp image inserted, starting upload');
        
        try {
          // Upload to Supabase via API
          const formData = new FormData();
          formData.append('image', file);
          
          console.log('Uploading to server...');
          const { data } = await apiClient.upload(endpoints.blog.uploadImage, formData);
          console.log('Upload successful, image URL:', data.url);
          
          // Replace temp image with actual URL
          const tempWrapper = editorRef.current.querySelector('.image-wrapper[data-temp="true"]');
          if (tempWrapper) {
            const imageHTML = `<div class="image-wrapper" contenteditable="false"><img src="${data.url}" class="blog-image" alt="Blog image" /></div><p><br></p>`;
            tempWrapper.outerHTML = imageHTML;
            console.log('Image inserted successfully');
          } else {
            console.warn('Could not find temp image wrapper');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          // Remove the temporary image on error
          const tempWrapper = editorRef.current.querySelector('.image-wrapper[data-temp="true"]');
          if (tempWrapper) {
            tempWrapper.remove();
          }
          await modal.alert(`Failed to upload image: ${error.message}`, 'Upload Error');
        }
        
      // Add event listeners to handle deletion
      setTimeout(() => {
        const images = editorRef.current.querySelectorAll('.image-wrapper');
        images.forEach(wrapper => {
          if (!wrapper.hasAttribute('data-listener')) {
            wrapper.setAttribute('data-listener', 'true');
            wrapper.addEventListener('click', function() {
              this.classList.toggle('selected');
            });
          }
        });
      }, 0);
    };
    
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    // Handle backspace and delete for image wrappers
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        
        // Check if we're adjacent to an image wrapper
        let imageWrapper = null;
        
        if (e.key === 'Backspace') {
          // Look backwards
          const prev = container.nodeType === 3 ? container.previousSibling : 
                      range.startOffset === 0 && container.previousSibling;
          if (prev && prev.classList && prev.classList.contains('image-wrapper')) {
            imageWrapper = prev;
          }
        } else if (e.key === 'Delete') {
          // Look forwards
          const next = container.nodeType === 3 ? container.nextSibling : 
                      container.childNodes[range.startOffset];
          if (next && next.classList && next.classList.contains('image-wrapper')) {
            imageWrapper = next;
          }
        }
        
        // Also check for selected image wrappers
        const selected = editorRef.current.querySelector('.image-wrapper.selected');
        if (selected) {
          imageWrapper = selected;
        }
        
        if (imageWrapper) {
          e.preventDefault();
          imageWrapper.remove();
          return;
        }
      }
    }
  };

  const handleSave = () => {
    const editorContent = editorRef.current.innerHTML;
    onSave({
      title,
      content: editorContent,
      excerpt: editorRef.current.innerText.substring(0, 150)
    });
  };

  return (
    <div className="content-editor-overlay">
      <div className="content-editor-modal">
        <div className="editor-header">
          <input
            type="text"
            placeholder="Post Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="title-input"
          />
        </div>

        <div className="editor-toolbar">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="toolbar-btn"
            title="Bold"
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="toolbar-btn"
            title="Italic"
          >
            <Italic size={18} />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="toolbar-btn"
            title="Underline"
          >
            <Underline size={18} />
          </button>
          <div className="toolbar-divider"></div>
          <button
            type="button"
            onClick={insertLink}
            className="toolbar-btn"
            title="Insert Link"
          >
            <LinkIcon size={18} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="toolbar-btn"
            title="Insert Image"
          >
            <Image size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>

        <div
          ref={editorRef}
          contentEditable
          className="editor-content"
          onKeyDown={handleKeyDown}
          suppressContentEditableWarning
        >
        </div>

        <div className="editor-actions">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save Post
          </button>
        </div>

        {showLinkModal && (
          <div className="link-modal-overlay" onClick={() => setShowLinkModal(false)}>
            <div className="link-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Insert Link</h3>
              <input
                type="text"
                placeholder="Link text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                className="link-input"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="link-input"
              />
              <div className="link-modal-actions">
                <button onClick={() => setShowLinkModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleLinkSubmit} className="btn-primary">
                  Insert
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
