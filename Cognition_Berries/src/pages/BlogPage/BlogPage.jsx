import { useState, useEffect } from 'react';
import { apiRequest } from '../../config/api';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import './BlogPage.css';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const POSTS_PER_PAGE = 6;

  useEffect(() => {
    fetchPosts();
  }, [currentPage, selectedCategory]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiRequest(
        `/blog-posts?page=${currentPage}&limit=${POSTS_PER_PAGE}&category=${selectedCategory}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch blog posts');
      }

      setPosts(data.posts);
      setTotalPages(Math.ceil(data.total / POSTS_PER_PAGE));
    } catch (err) {
      setError(err.message || 'An error occurred while fetching blog posts');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const categories = [
    'all',
    'finance',
    'investment',
    'trading',
    'cryptocurrency',
    'personal-finance',
    'market-analysis'
  ];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="blog-page">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading blog posts...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="blog-page">
          <div className="error-container">
            <h3>Error</h3>
            <p>{error}</p>
            <button onClick={fetchPosts} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="blog-page">
        <header className="blog-header">
          <h1>Financial Insights & Knowledge Hub</h1>
          <p>Explore our latest articles on finance, investment strategies, and market analysis</p>
        </header>

        <div className="category-filter">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => {
                setSelectedCategory(category);
                setCurrentPage(1);
              }}
            >
              {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>

        {posts.length === 0 ? (
          <div className="no-posts">
            <h3>No posts found</h3>
            <p>There are currently no blog posts in this category.</p>
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map(post => (
              <article key={post._id} className="blog-card">
                <div className="blog-card-image">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} />
                  ) : (
                    <div className="placeholder-image">
                      <span>CB</span>
                    </div>
                  )}
                </div>
                <div className="blog-card-content">
                  <div className="blog-meta">
                    <span className="blog-category">{post.category}</span>
                    <span className="blog-date">{formatDate(post.publishedAt || post.createdAt)}</span>
                  </div>
                  <h2 className="blog-title">{post.title}</h2>
                  <p className="blog-excerpt">{post.excerpt || post.content.substring(0, 150)}...</p>
                  <div className="blog-footer">
                    <div className="author-info">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} className="author-avatar" />
                      ) : (
                        <div className="author-avatar-placeholder">
                          {post.author.name.charAt(0)}
                        </div>
                      )}
                      <span className="author-name">{post.author.name}</span>
                    </div>
                    <button className="read-more-btn">Read More</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="pagination-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <div className="page-numbers">
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  className={`page-number ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(index + 1)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <button
              className="pagination-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
