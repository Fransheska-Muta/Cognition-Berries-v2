// src/components/forum/ReplyForm.jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

function ReplyForm({ onSubmit, onCancel, placeholder, initialContent, parentReplyId }) {
  const [content, setContent] = useState(initialContent || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Reply content cannot be empty');
      return;
    }

    if (content.length < 3) {
      setError('Reply must be at least 3 characters');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onSubmit({
        content: content.trim(),
        parentReplyId: parentReplyId || null
      });
      
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to submit reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setContent(e.target.value);
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="reply-form" noValidate>
      <div className="form-group">
        <label htmlFor="reply-content" className="sr-only">
          {placeholder || 'Write your reply'}
        </label>
        <textarea
          id="reply-content"
          value={content}
          onChange={handleChange}
          className={`reply-textarea ${error ? 'input-error' : ''}`}
          placeholder={placeholder || 'Write your reply...'}
          rows={4}
          disabled={isSubmitting}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'reply-error' : undefined}
        />
        {error && (
          <span id="reply-error" className="error-message" role="alert">
            {error}
          </span>
        )}
      </div>

      <div className="reply-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary btn-small"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="btn-primary btn-small"
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-small" aria-hidden="true"></span>
              Posting...
            </>
          ) : (
            'Post Reply'
          )}
        </button>
      </div>
    </form>
  );
}

ReplyForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  placeholder: PropTypes.string,
  initialContent: PropTypes.string,
  parentReplyId: PropTypes.string
};

ReplyForm.defaultProps = {
  onCancel: null,
  placeholder: 'Write your reply...',
  initialContent: '',
  parentReplyId: null
};

export default ReplyForm;