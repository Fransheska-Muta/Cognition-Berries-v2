// src/components/forum/PostList.jsx
import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import PostCard from './PostCard';

function PostList({ posts, currentUser, isLoading, error }) {
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'popular', 'oldest'
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const CATEGORIES = [
    'all',
    'Beginner',
    'Stocks',
    'Investing',
    'General',
    'News',
    'Other'
  ];

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];

    let filtered = [...posts];

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(post => post.category === filterCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title?.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort posts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'popular':
          return (b.replyCount || 0) - (a.replyCount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [posts, sortBy, filterCategory, searchQuery]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleCategoryChange = (e) => {
    setFilterCategory(e.target.value);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setSortBy('recent');
  };

  if (error) {
    return (
      <div className="error-state" role="alert">
        <span className="error-icon" aria-hidden="true">⚠️</span>
        <h3>Unable to Load Posts</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-state" aria-live="polite" aria-busy="true">
        <div className="spinner" aria-hidden="true"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  const hasActiveFilters = searchQuery.trim() || filterCategory !== 'all' || sortBy !== 'recent';

  return (
    <div className="post-list-container">
      {/* Filters and Search */}
      <div className="post-list-controls">
        <div className="search-box">
          <label htmlFor="search-posts" className="sr-only">
            Search posts
          </label>
          <input
            id="search-posts"
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search posts..."
            className="search-input"
            aria-label="Search posts by title, content, or tags"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="clear-search"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label htmlFor="category-filter" className="filter-label">
              Category:
            </label>
            <select
              id="category-filter"
              value={filterCategory}
              onChange={handleCategoryChange}
              className="filter-select"
              aria-label="Filter by category"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
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
              <option value="recent">Most Recent</option>
              <option value="popular">Most Popular</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-text btn-small"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="post-list-header">
        <p className="results-count">
          {filteredAndSortedPosts.length} {filteredAndSortedPosts.length === 1 ? 'post' : 'posts'}
          {hasActiveFilters && ' found'}
        </p>
      </div>

      {/* Post List */}
      {filteredAndSortedPosts.length === 0 ? (
        <div className="empty-state">
          {hasActiveFilters ? (
            <>
              <p>No posts match your search criteria.</p>
              <button onClick={clearFilters} className="btn-secondary">
                Clear Filters
              </button>
            </>
          ) : (
            <>
              <p>No posts yet. Be the first to start a discussion!</p>
              {currentUser && (
                <p className="empty-state-hint">
                  Click "Create Post" to share your thoughts with the community.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="post-list" role="list">
          {filteredAndSortedPosts.map(post => (
            <PostCard
              key={post._id || post.post_id || Math.random()}
              post={post}
            />
          ))}
        </div>
      )}
    </div>
  );
}

PostList.propTypes = {
  posts: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      post_id: PropTypes.string,
      title: PropTypes.string.isRequired,
      content: PropTypes.string,
      category: PropTypes.string,
      tags: PropTypes.arrayOf(PropTypes.string),
      createdAt: PropTypes.string,
      replyCount: PropTypes.number,
      isOptimistic: PropTypes.bool
    })
  ).isRequired,
  currentUser: PropTypes.object,
  isLoading: PropTypes.bool,
  error: PropTypes.string
};

PostList.defaultProps = {
  currentUser: null,
  isLoading: false,
  error: null
};

export default PostList;