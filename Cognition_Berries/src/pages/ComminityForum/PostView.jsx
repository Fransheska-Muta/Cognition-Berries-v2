// src/pages/CommunityForum/PostView.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForum } from '../../hooks/useForum';
import ReplyList from '../../components/forum/ReplyList';
import ReplyForm from '../../components/forum/ReplyForm';
import CreatePostForm from '../../components/forum/CreatePostForm';
import '../../styles/CommunityForum.css';

function PostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const {
    fetchPost,
    currentUser,
    updatePost,
    deletePost,
    createReply,
    updateReply,
    deleteReply
  } = useForum();

  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPost(postId);
      setPost(data.post);
      setReplies(data.replies);
    } catch (err) {
      setError(err.message || 'Failed to load post');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePost = async (updates) => {
    setActionError(null);
    try {
      const updated = await updatePost(postId, updates);
      setPost(updated);
      setIsEditing(false);
      setSuccessMessage('Post updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setActionError(null);
    try {
      await deletePost(postId);
      navigate('/community');
    } catch (err) {
      setActionError(err.message || 'Failed to delete post');
    }
  };

  const handleCreateReply = async (replyData) => {
    setActionError(null);
    try {
      const newReply = await createReply({
        ...replyData,
        postId: post._id || post.post_id
      });
      setReplies(prev => [...prev, newReply]);
      setSuccessMessage('Reply posted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      return newReply;
    } catch (err) {
      setActionError(err.message || 'Failed to post reply');
      throw err;
    }
  };

  const handleUpdateReply = async (replyId, updates) => {
    setActionError(null);
    try {
      const updated = await updateReply(replyId, updates);
      setReplies(prev => prev.map(r => 
        (r._id === replyId || r.reply_id === replyId) ? updated : r
      ));
      setSuccessMessage('Reply updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to update reply');
      throw err;
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) {
      return;
    }

    setActionError(null);
    try {
      await deleteReply(replyId);
      setReplies(prev => prev.filter(r => 
        r._id !== replyId && r.reply_id !== replyId
      ));
      setSuccessMessage('Reply deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setActionError(err.message || 'Failed to delete reply');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return 'Invalid date';
    }
  };

  const isOwner = currentUser && post && (
    currentUser.uid === post.uid ||
    currentUser.email === post.userEmail
  );

  if (isLoading) {
    return (
      <div className="post-view">
        <div className="loading-container">
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-content"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="post-view">
        <div className="error-container">
          <h2>Error Loading Post</h2>
          <p>{error || 'Post not found'}</p>
          <button onClick={() => navigate('/community')} className="btn-primary">
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="post-view">
      {/* Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <button 
          onClick={() => navigate('/community')}
          className="breadcrumb-link"
        >
          ← Back to Forum
        </button>
      </nav>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-banner" role="status">
          <span className="success-icon">✓</span>
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="error-close"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Post Content */}
      <article className="post-detail">
        {isEditing ? (
          <div className="post-edit-form">
            <h2>Edit Post</h2>
            <CreatePostForm
              initialData={post}
              onSubmit={handleUpdatePost}
              onCancel={() => setIsEditing(false)}
              isEditing={true}
            />
          </div>
        ) : (
          <>
            <header className="post-header">
              <div className="post-meta">
                <span className="post-category">{post.category || 'General'}</span>
                {post.tags && post.tags.length > 0 && (
                  <div className="post-tags" aria-label="Post tags">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <h1 className="post-title">{post.title}</h1>
              
              <div className="post-author-info">
                <div className="author-avatar" aria-hidden="true">
                  {(post.userEmail || 'A')[0].toUpperCase()}
                </div>
                <div className="author-details">
                  <span className="author-name">
                    {post.userName || post.userEmail?.split('@')[0] || 'Anonymous'}
                  </span>
                  <time dateTime={post.createdAt} className="post-date">
                    {formatDate(post.createdAt)}
                  </time>
                </div>
                
                {isOwner && (
                  <div className="post-actions">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-secondary btn-small"
                      aria-label="Edit post"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="btn-danger btn-small"
                      aria-label="Delete post"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </header>

            <div className="post-content">
              <div 
                className="post-body"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              
              {post.attachments && post.attachments.length > 0 && (
                <div className="post-attachments">
                  {post.attachments.map((attachment, index) => (
                    <div key={index} className="attachment">
                      {attachment.data && attachment.data.startsWith('data:image/') ? (
                        <img
                          src={attachment.data}
                          alt={attachment.filename || 'Attachment'}
                          className="attachment-image"
                          loading="lazy"
                        />
                      ) : (
                        <a
                          href={attachment.url || attachment.data}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          📎 {attachment.filename || 'Attachment'}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </article>

      {/* Replies Section */}
      <section className="replies-section">
        <h2 className="replies-header">
          Replies ({replies.length})
        </h2>

        {currentUser ? (
          <div className="reply-form-container">
            <h3>Add a Reply</h3>
            <ReplyForm
              onSubmit={handleCreateReply}
              placeholder="Share your thoughts..."
            />
          </div>
        ) : (
          <div className="auth-prompt">
            <p>
              <button
                onClick={() => navigate('/login')}
                className="link-button"
              >
                Sign in
              </button>
              {' '}to reply to this post
            </p>
          </div>
        )}

        <ReplyList
          replies={replies}
          currentUser={currentUser}
          onUpdate={handleUpdateReply}
          onDelete={handleDeleteReply}
          onReply={handleCreateReply}
        />
      </section>
    </div>
  );
}

export default PostView;