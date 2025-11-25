// src/pages/CommunityForum/ForumHome.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForum } from '../../hooks/useForum';
import Navbar from '../../components/Navbar/Navbar';
import PostList from '../../components/Forum/PostList';
import CreatePostForm from '../../components/Forum/CreatePostForm';
import './CommunityForum.css';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'Beginner', label: 'Beginner Questions' },
  { value: 'Stocks', label: 'Stock Talk' },
  { value: 'Investing', label: 'Investing Strategies' },
  { value: 'General', label: 'General Discussion' },
  { value: 'News', label: 'Market News' }
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most-replied', label: 'Most Replied' }
];

function ForumHome() {
  const navigate = useNavigate();
  const { posts, replies, isLoading, error, fetchPosts, createPost, currentUser } = useForum();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [page, setPage] = useState(1);
  const [submitError, setSubmitError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch posts when filters change
  useEffect(() => {
    fetchPosts({
      page,
      q: debouncedQuery,
      category: selectedCategory,
      sort: sortBy
    });
  }, [debouncedQuery, selectedCategory, sortBy, page, fetchPosts]);

  // Calculate reply counts for each post
  const postsWithReplyCounts = useMemo(() => {
    return posts.map(post => {
      const postId = post._id || post.post_id;
      const replyCount = replies.filter(r => 
        r.postId === postId || 
        r.postId === post._id ||
        (r.postId && r.postId.toString() === postId)
      ).length;
      
      return { ...post, replyCount };
    });
  }, [posts, replies]);

  // Sort by reply count if selected
  const sortedPosts = useMemo(() => {
    if (sortBy === 'most-replied') {
      return [...postsWithReplyCounts].sort((a, b) => b.replyCount - a.replyCount);
    }
    return postsWithReplyCounts;
  }, [postsWithReplyCounts, sortBy]);

  const handleCreatePost = async (postData) => {
    setSubmitError(null);
    try {
      const newPost = await createPost(postData);
      setShowCreateForm(false);
      
      // Navigate to the new post
      if (newPost && newPost._id) {
        navigate(`/community/post/${newPost._id}`);
      }
      
      return newPost;
    } catch (err) {
      setSubmitError(err.message || 'Failed to create post');
      throw err;
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
    setPage(1);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <>
    <Navbar />
    <div className="forum-home">
      {/* Header Section */}
      <header className="forum-header">
        <div className="forum-header-content">
          <h1>Community Forum</h1>
          <p className="forum-subtitle">
            Engage with peers, share knowledge, and grow together in your financial literacy journey
          </p>
          
          {currentUser && (
            <button
              className="btn-create-post"
              onClick={() => setShowCreateForm(true)}
              aria-label="Create new post"
            >
              <span className="icon">+</span>
              Create New Post
            </button>
          )}
          
          {!currentUser && (
            <p className="auth-notice">
              <button 
                onClick={() => navigate('/login')}
                className="link-button"
              >
                Sign in
              </button>
              {' '}to create posts and participate in discussions
            </p>
          )}
        </div>
      </header>

      {/* Filters and Search */}
      <div className="forum-controls">
        <div className="search-box">
          <label htmlFor="forum-search" className="sr-only">
            Search posts
          </label>
          <input
            id="forum-search"
            type="text"
            placeholder="Search posts, tags, or content..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
            aria-label="Search forum posts"
          />
          <span className="search-icon" aria-hidden="true">🔍</span>
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="category-filter" className="filter-label">
              Category:
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={handleCategoryChange}
              className="filter-select"
              aria-label="Filter by category"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter" className="filter-label">
              Sort by:
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={handleSortChange}
              className="filter-select"
              aria-label="Sort posts"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {submitError && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          {submitError}
          <button 
            onClick={() => setSubmitError(null)}
            className="error-close"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Post</h2>
              <button
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <CreatePostForm
              onSubmit={handleCreatePost}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Posts List */}
      <main className="forum-main">
        <div className="forum-stats">
          <p className="stats-text">
            Showing {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'}
            {debouncedQuery && ` matching "${debouncedQuery}"`}
            {selectedCategory !== 'all' && ` in ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
          </p>
        </div>

        <PostList
          posts={sortedPosts}
          isLoading={isLoading}
          onLoadMore={handleLoadMore}
          hasMore={false} // Client-side pagination - all posts loaded
        />
      </main>
    </div>
  </>
  );
}

export default ForumHome;