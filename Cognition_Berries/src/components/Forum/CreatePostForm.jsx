// src/components/forum/CreatePostForm.jsx
import { useState, useRef } from 'react';
import PropTypes from 'prop-types';

const CATEGORIES = [
  'Beginner',
  'Stocks',
  'Investing',
  'General',
  'News',
  'Other'
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function CreatePostForm({ initialData, onSubmit, onCancel, isEditing }) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    category: initialData?.category || 'General',
    tags: initialData?.tags?.join(', ') || '',
    attachments: initialData?.attachments || []
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length < 10) {
      newErrors.content = 'Content must be at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'Please select a valid image file' }));
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors(prev => ({ 
        ...prev, 
        image: `Image size must be less than ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` 
      }));
      return;
    }

    // Read and convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData(prev => ({
        ...prev,
        attachments: [{
          filename: file.name,
          data: base64String,
          type: file.type
        }]
      }));
      setErrors(prev => ({ ...prev, image: '' }));
    };
    reader.onerror = () => {
      setErrors(prev => ({ ...prev, image: 'Failed to read image file' }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, attachments: [] }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(errors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        tags: formData.tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        attachments: formData.attachments
      };

      await onSubmit(submitData);
      
      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          title: '',
          content: '',
          category: 'General',
          tags: '',
          attachments: []
        });
        setImagePreview(null);
      }
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        submit: err.message || 'Failed to submit post'
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="create-post-form" noValidate>
      {/* Title */}
      <div className="form-group">
        <label htmlFor="title" className="form-label">
          Title <span className="required">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          className={`form-input ${errors.title ? 'input-error' : ''}`}
          placeholder="Enter a descriptive title..."
          maxLength={200}
          required
          aria-invalid={errors.title ? 'true' : 'false'}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && (
          <span id="title-error" className="error-message" role="alert">
            {errors.title}
          </span>
        )}
        <span className="char-count">
          {formData.title.length} / 200
        </span>
      </div>

      {/* Category */}
      <div className="form-group">
        <label htmlFor="category" className="form-label">
          Category <span className="required">*</span>
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          className={`form-select ${errors.category ? 'input-error' : ''}`}
          required
          aria-invalid={errors.category ? 'true' : 'false'}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="">Select a category...</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {errors.category && (
          <span id="category-error" className="error-message" role="alert">
            {errors.category}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="form-group">
        <label htmlFor="content" className="form-label">
          Content <span className="required">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          value={formData.content}
          onChange={handleChange}
          className={`form-textarea ${errors.content ? 'input-error' : ''}`}
          placeholder="Share your thoughts, questions, or insights..."
          rows={10}
          required
          aria-invalid={errors.content ? 'true' : 'false'}
          aria-describedby={errors.content ? 'content-error' : undefined}
        />
        {errors.content && (
          <span id="content-error" className="error-message" role="alert">
            {errors.content}
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="form-group">
        <label htmlFor="tags" className="form-label">
          Tags (optional)
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          value={formData.tags}
          onChange={handleChange}
          className="form-input"
          placeholder="e.g., investing, stocks, beginner (comma-separated)"
          aria-describedby="tags-help"
        />
        <span id="tags-help" className="form-help">
          Separate tags with commas to help others find your post
        </span>
      </div>

      {/* Image Upload */}
      <div className="form-group">
        <label htmlFor="image" className="form-label">
          Image (optional)
        </label>
        <div className="image-upload-area">
          {imagePreview ? (
            <div className="image-preview">
              <img
                src={imagePreview}
                alt="Preview"
                className="preview-image"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="btn-remove-image"
                aria-label="Remove image"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <div className="upload-prompt">
              <input
                id="image"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="file-input"
                aria-describedby="image-help"
              />
              <label htmlFor="image" className="file-label">
                <span className="upload-icon" aria-hidden="true">📎</span>
                Choose Image
              </label>
              <span id="image-help" className="form-help">
                Max size: 5MB. Formats: JPG, PNG, GIF
              </span>
            </div>
          )}
        </div>
        {errors.image && (
          <span className="error-message" role="alert">
            {errors.image}
          </span>
        )}
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-small" aria-hidden="true"></span>
              {isEditing ? 'Updating...' : 'Posting...'}
            </>
          ) : (
            isEditing ? 'Update Post' : 'Create Post'
          )}
        </button>
      </div>
    </form>
  );
}

CreatePostForm.propTypes = {
  initialData: PropTypes.shape({
    title: PropTypes.string,
    content: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    attachments: PropTypes.array
  }),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  isEditing: PropTypes.bool
};

CreatePostForm.defaultProps = {
  initialData: null,
  onCancel: null,
  isEditing: false
};

export default CreatePostForm;