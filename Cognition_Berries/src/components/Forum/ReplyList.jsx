// src/components/forum/ReplyList.jsx
import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import ReplyForm from './ReplyForm';

function ReplyItem({ reply, currentUser, onUpdate, onDelete, onReply, depth = 0 }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const isOwner = currentUser && (
    currentUser.uid === reply.uid ||
    currentUser.email === reply.userEmail
  );

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
      if (diffMins < 60) return `${diffMins}m ago`;
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

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    
    try {
      await onUpdate(reply._id || reply.reply_id, { content: editContent.trim() });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update reply:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await onDelete(reply._id || reply.reply_id);
    } catch (err) {
      console.error('Failed to delete reply:', err);
    }
  };

  const handleReply = async (replyData) => {
    try {
      await onReply({
        ...replyData,
        parentReplyId: reply._id || reply.reply_id
      });
      setIsReplying(false);
    } catch (err) {
      console.error('Failed to post reply:', err);
      throw err;
    }
  };

  return (
    <div 
      className={`reply-item ${depth > 0 ? 'reply-nested' : ''} ${reply.isOptimistic ? 'reply-optimistic' : ''}`}
      style={{ marginLeft: depth > 0 ? '2rem' : '0' }}
    >
      <div className="reply-header">
        <div className="reply-author">
          <div className="author-avatar" aria-hidden="true">
            {(reply.userEmail || 'A')[0].toUpperCase()}
          </div>
          <div className="author-info">
            <span className="author-name">
              {reply.userName || reply.userEmail?.split('@')[0] || 'Anonymous'}
            </span>
            <time dateTime={reply.createdAt} className="reply-date">
              {formatDate(reply.createdAt)}
            </time>
          </div>
        </div>

        {isOwner && !isEditing && (
          <div className="reply-actions">
            <button
              onClick={() => setIsEditing(true)}
              className="btn-text btn-small"
              aria-label="Edit reply"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="btn-text btn-small text-danger"
              aria-label="Delete reply"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="reply-content">
        {isEditing ? (
          <div className="reply-edit-form">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="reply-textarea"
              rows={4}
            />
            <div className="reply-edit-actions">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(reply.content);
                }}
                className="btn-secondary btn-small"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="btn-primary btn-small"
                disabled={!editContent.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="reply-text">{reply.content}</p>
            {currentUser && depth < 2 && !isReplying && (
              <button
                onClick={() => setIsReplying(true)}
                className="btn-reply"
                aria-label="Reply to this comment"
              >
                Reply
              </button>
            )}
          </>
        )}
      </div>

      {isReplying && (
        <div className="reply-form-container">
          <ReplyForm
            onSubmit={handleReply}
            onCancel={() => setIsReplying(false)}
            placeholder="Write your reply..."
            parentReplyId={reply._id || reply.reply_id}
          />
        </div>
      )}
    </div>
  );
}

function ReplyList({ replies, currentUser, onUpdate, onDelete, onReply }) {
  // Organize replies into a tree structure
  const replyTree = useMemo(() => {
    const topLevel = [];
    const childrenMap = {};

    // First pass: separate top-level and nested replies
    replies.forEach(reply => {
      if (!reply.parentReplyId) {
        topLevel.push(reply);
      } else {
        if (!childrenMap[reply.parentReplyId]) {
          childrenMap[reply.parentReplyId] = [];
        }
        childrenMap[reply.parentReplyId].push(reply);
      }
    });

    // Second pass: attach children to parents
    const attachChildren = (reply, depth = 0) => {
      const replyId = reply._id || reply.reply_id;
      const children = childrenMap[replyId] || [];
      return {
        ...reply,
        children: children.map(child => attachChildren(child, depth + 1)),
        depth
      };
    };

    return topLevel
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map(reply => attachChildren(reply));
  }, [replies]);

  const renderReply = (reply, depth = 0) => {
    return (
      <div key={reply._id || reply.reply_id || Math.random()}>
        <ReplyItem
          reply={reply}
          currentUser={currentUser}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onReply={onReply}
          depth={depth}
        />
        {reply.children && reply.children.length > 0 && (
          <div className="reply-children">
            {reply.children.map(child => renderReply(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!replies || replies.length === 0) {
    return (
      <div className="empty-state">
        <p>No replies yet. Be the first to share your thoughts!</p>
      </div>
    );
  }

  return (
    <div className="reply-list">
      {replyTree.map(reply => renderReply(reply))}
    </div>
  );
}

ReplyItem.propTypes = {
  reply: PropTypes.shape({
    _id: PropTypes.string,
    reply_id: PropTypes.string,
    content: PropTypes.string.isRequired,
    uid: PropTypes.string,
    userEmail: PropTypes.string,
    userName: PropTypes.string,
    createdAt: PropTypes.string,
    parentReplyId: PropTypes.string,
    isOptimistic: PropTypes.bool
  }).isRequired,
  currentUser: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired,
  depth: PropTypes.number
};

ReplyList.propTypes = {
  replies: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      reply_id: PropTypes.string,
      content: PropTypes.string.isRequired,
      parentReplyId: PropTypes.string
    })
  ).isRequired,
  currentUser: PropTypes.object,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReply: PropTypes.func.isRequired
};

export default ReplyList;