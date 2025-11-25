// src/components/forum/PostCard.jsx
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function PostCard({ post }) {
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  const getExcerpt = (content, maxLength = 150) => {
    if (!content) return '';
    
    // Strip HTML tags
    const stripped = content.replace(/<[^>]*>/g, '');
    
    if (stripped.length <= maxLength) return stripped;
    
    return stripped.substring(0, maxLength).trim() + '...';
  };

  const handleClick = () => {
    const postId = post._id || post.post_id;
    if (postId) {
      navigate(`/community/post/${postId}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <article
      className={`post-card ${post.isOptimistic ? 'post-optimistic' : ''}`}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      tabIndex={0}
      role="button"
      aria-label={`View post: ${post.title}`}
    >
      <div className="post-card-header">
        <div className="post-card-meta">
          <span className="post-category">{post.category || 'General'}</span>
          <time dateTime={post.createdAt} className="post-date">
            {formatDate(post.createdAt)}
          </time>
        </div>
      </div>

      <div className="post-card-body">
        <h3 className="post-card-title">{post.title}</h3>
        <p className="post-card-excerpt">{getExcerpt(post.content)}</p>
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="post-card-tags" aria-label="Post tags">
          {post.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">
              #{tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="tag-more">+{post.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="post-card-footer">
        <div className="post-author">
          <div className="author-avatar" aria-hidden="true">
            {(post.userEmail || 'A')[0].toUpperCase()}
          </div>
          <span className="author-name">
            {post.userName || post.userEmail?.split('@')[0] || 'Anonymous'}
          </span>
        </div>

        <div className="post-stats">
          <span className="stat-item" aria-label={`${post.replyCount || 0} replies`}>
            <span aria-hidden="true">💬</span> {post.replyCount || 0}
          </span>
        </div>
      </div>
    </article>
  );
}

PostCard.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string,
    post_id: PropTypes.string,
    title: PropTypes.string.isRequired,
    content: PropTypes.string,
    category: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    userEmail: PropTypes.string,
    userName: PropTypes.string,
    createdAt: PropTypes.string,
    replyCount: PropTypes.number,
    isOptimistic: PropTypes.bool
  }).isRequired
};

export default PostCard;