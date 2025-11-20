import { useState, useEffect } from 'react';
import { Share2, Calendar, User, MessageCircle, ThumbsUp, Reply, Send, ArrowLeft, Clock, TrendingUp, Archive, Search, Trash2, Edit, Plus } from 'lucide-react';

// Mock data with Lummi finance images
const mockPosts = [
  {
    _id: '1',
    title: 'Understanding Investment Portfolio Diversification',
    excerpt: 'Learn how to build a resilient investment portfolio that can weather market volatility and maximize returns.',
    content: 'Diversification is the cornerstone of successful investing. By spreading investments across different asset classes, sectors, and geographic regions, investors can reduce risk while maintaining growth potential. This comprehensive guide explores modern portfolio theory, asset allocation strategies, and practical tips for building a diversified portfolio that aligns with your financial goals.',
    category: 'investment',
    coverImage: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
    author: { name: 'Sarah Chen', _id: 'author1' },
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 127,
    views: 1543,
    comments: []
  },
  {
    _id: '2',
    title: 'Cryptocurrency Market Analysis: Trends for 2025',
    excerpt: 'Deep dive into the evolving cryptocurrency landscape and what investors should watch for in the coming year.',
    content: 'The cryptocurrency market continues to mature with institutional adoption, regulatory clarity, and technological innovation. This analysis examines emerging trends including layer-2 scaling solutions, DeFi protocols, and the growing intersection between traditional finance and digital assets.',
    category: 'cryptocurrency',
    coverImage: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80',
    author: { name: 'Michael Torres', _id: 'author2' },
    publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 234,
    views: 2891,
    comments: []
  },
  {
    _id: '3',
    title: 'Smart Personal Finance Strategies for Young Professionals',
    excerpt: 'Essential money management tips to build wealth and financial security early in your career.',
    content: 'Starting your career is the perfect time to establish strong financial habits. From emergency funds to retirement planning, learn how to make your money work for you through strategic budgeting, investing, and debt management.',
    category: 'personal-finance',
    coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80',
    author: { name: 'Emily Rodriguez', _id: 'author3' },
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 189,
    views: 2145,
    comments: []
  },
  {
    _id: '4',
    title: 'Technical Analysis: Reading Market Charts Like a Pro',
    excerpt: 'Master the art of technical analysis to make informed trading decisions based on price patterns and indicators.',
    content: 'Technical analysis is an essential skill for active traders. Learn to identify support and resistance levels, understand candlestick patterns, and use popular indicators like RSI, MACD, and moving averages to time your trades effectively.',
    category: 'trading',
    coverImage: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
    author: { name: 'David Kim', _id: 'author4' },
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 156,
    views: 1876,
    comments: []
  },
  {
    _id: '5',
    title: 'Global Market Outlook: Economic Indicators to Watch',
    excerpt: 'Key economic indicators that influence market movements and investment strategies in today\'s interconnected world.',
    content: 'Understanding macroeconomic indicators is crucial for making informed investment decisions. This article breaks down GDP growth, inflation rates, employment data, and central bank policies that drive market trends.',
    category: 'market-analysis',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    author: { name: 'James Wright', _id: 'author5' },
    publishedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 203,
    views: 2567,
    comments: []
  }
];

export default function DynamicBlogPage() {
  const [view, setView] = useState('home');
  const [posts, setPosts] = useState(mockPosts);
  const [selectedPost, setSelectedPost] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [currentUser] = useState({ uid: 'user1', displayName: 'John Doe', email: 'john@example.com' });

  const categories = ['all', 'finance', 'investment', 'trading', 'cryptocurrency', 'personal-finance', 'market-analysis'];

  const getThisWeekPosts = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return posts.filter(post => new Date(post.publishedAt) >= oneWeekAgo);
  };

  const getArchivedPosts = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return posts.filter(post => new Date(post.publishedAt) < oneWeekAgo);
  };

  const getFilteredPosts = (postList) => {
    return postList.filter(post => {
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  const handleReadPost = (post) => {
    setSelectedPost(post);
    setView('post');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedPost(null);
  };

  const handleLikePost = (postId) => {
    setPosts(posts.map(post => {
      if (post._id === postId) {
        const isLiked = likedPosts.has(postId);
        return { ...post, likes: isLiked ? post.likes - 1 : post.likes + 1 };
      }
      return post;
    }));

    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    if (selectedPost?._id === postId) {
      setSelectedPost(prev => ({
        ...prev,
        likes: likedPosts.has(postId) ? prev.likes - 1 : prev.likes + 1
      }));
    }
  };

  const handleShare = async (post) => {
    const shareUrl = `${window.location.origin}/blog/${post._id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return formatDate(dateString);
  };

  const BlogCard = ({ post, featured = false }) => (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: featured ? '0 10px 40px rgba(102, 126, 234, 0.15)' : '0 4px 20px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: featured ? '2px solid #667eea' : 'none'
    }}
    onClick={() => handleReadPost(post)}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-8px)';
      e.currentTarget.style.boxShadow = featured ? '0 15px 50px rgba(102, 126, 234, 0.25)' : '0 8px 30px rgba(0,0,0,0.12)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = featured ? '0 10px 40px rgba(102, 126, 234, 0.15)' : '0 4px 20px rgba(0,0,0,0.08)';
    }}>
      {featured && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <TrendingUp size={16} /> Featured This Week
        </div>
      )}
      <div style={{
        height: '240px',
        background: `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.3)), url(${post.coverImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '1rem',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'rgba(255,255,255,0.95)',
          padding: '0.5rem 1rem',
          borderRadius: '20px',
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#667eea',
          textTransform: 'capitalize',
          backdropFilter: 'blur(10px)'
        }}>
          {post.category?.replace('-', ' ')}
        </div>
      </div>
      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Calendar size={14} />
            {formatDate(post.publishedAt)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={14} />
            5 min read
          </div>
        </div>
        <h3 style={{ fontSize: '1.3rem', margin: '0 0 1rem 0', color: '#1a1a1a', lineHeight: '1.4', fontWeight: '700' }}>
          {post.title}
        </h3>
        <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '1rem', flex: 1, fontSize: '0.95rem' }}>
          {post.excerpt}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              {post.author.name.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                {post.author.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>
                {post.views.toLocaleString()} views
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', color: '#666', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ThumbsUp size={16} />
              {post.likes}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MessageCircle size={16} />
              {post.comments?.length || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'post' && selectedPost) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #e9ecef', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={handleBackToHome} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem',
              color: '#667eea',
              fontWeight: '600'
            }}>
              <ArrowLeft size={20} /> Back to Blog
            </button>
            <button onClick={() => handleShare(selectedPost)} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: '600'
            }}>
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
          <article style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{
              height: '400px',
              background: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.4)), url(${selectedPost.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '3rem'
            }}>
              <div>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.95)',
                  color: '#667eea',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  textTransform: 'capitalize'
                }}>
                  {selectedPost.category?.replace('-', ' ')}
                </div>
                <h1 style={{ fontSize: '2.5rem', margin: '0', color: 'white', lineHeight: '1.2', fontWeight: '700', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                  {selectedPost.title}
                </h1>
              </div>
            </div>
            
            <div style={{ padding: '3rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '2px solid #f0f0f0' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.5rem'
                }}>
                  {selectedPost.author.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1a1a1a' }}>
                    {selectedPost.author.name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    {formatDate(selectedPost.publishedAt)} · 5 min read · {selectedPost.views.toLocaleString()} views
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#333', marginBottom: '2rem' }}>
                {selectedPost.content}
              </div>

              <div style={{ display: 'flex', gap: '1rem', paddingTop: '2rem', borderTop: '2px solid #f0f0f0' }}>
                <button
                  onClick={() => handleLikePost(selectedPost._id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: likedPosts.has(selectedPost._id) ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                    color: likedPosts.has(selectedPost._id) ? 'white' : '#666',
                    border: likedPosts.has(selectedPost._id) ? 'none' : '2px solid #e0e0e0',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.3s'
                  }}
                >
                  <ThumbsUp size={18} fill={likedPosts.has(selectedPost._id) ? 'white' : 'none'} />
                  {selectedPost.likes} Likes
                </button>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    color: '#666',
                    border: '2px solid #e0e0e0',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  <MessageCircle size={18} />
                  {selectedPost.comments?.length || 0} Comments
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)', paddingBottom: '4rem' }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '5rem 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url(https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.1
        }} />
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', fontWeight: '800', textAlign: 'center' }}>
            Financial Insights & Knowledge Hub
          </h1>
          <p style={{ fontSize: '1.3rem', opacity: 0.95, maxWidth: '700px', margin: '0 auto 2.5rem', textAlign: 'center', fontWeight: '300' }}>
            Stay informed with the latest trends, strategies, and expert analysis
          </p>
          
          <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', color: '#999' }} size={22} />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '1.25rem 1.5rem 1.25rem 3.5rem',
                border: 'none',
                borderRadius: '50px',
                fontSize: '1rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '3rem 2rem 2rem' }}>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '3rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '0.75rem 1.75rem',
                border: 'none',
                borderRadius: '25px',
                background: selectedCategory === category ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                color: selectedCategory === category ? 'white' : '#666',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s',
                boxShadow: selectedCategory === category ? '0 4px 15px rgba(102, 126, 234, 0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
                textTransform: 'capitalize',
                fontSize: '0.95rem'
              }}
            >
              {category.replace('-', ' ')}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: '3rem',
          borderBottom: '2px solid #e9ecef'
        }}>
          <button
            onClick={() => setView('home')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '1.15rem',
              color: view === 'home' ? '#667eea' : '#999',
              borderBottom: view === 'home' ? '3px solid #667eea' : 'none',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.3s'
            }}
          >
            <TrendingUp size={22} /> This Week
          </button>
          <button
            onClick={() => setView('archives')}
            style={{
              padding: '1rem 2rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '1.15rem',
              color: view === 'archives' ? '#667eea' : '#999',
              borderBottom: view === 'archives' ? '3px solid #667eea' : 'none',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.3s'
            }}
          >
            <Archive size={22} /> Archives
          </button>
        </div>

        {view === 'home' && (
          <>
            <div style={{ marginBottom: '4rem' }}>
              <h2 style={{
                fontSize: '2.5rem',
                marginBottom: '2rem',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontWeight: '700'
              }}>
                <TrendingUp size={32} color="#667eea" />
                What's New This Week
              </h2>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                gap: '2rem'
              }}>
                {getFilteredPosts(getThisWeekPosts()).map(post => (
                  <BlogCard key={post._id} post={post} featured={true} />
                ))}
              </div>
            </div>

            {getArchivedPosts().length > 0 && (
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '2rem'
                }}>
                  <h2 style={{
                    fontSize: '2.5rem',
                    color: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    fontWeight: '700'
                  }}>
                    <Archive size={32} color="#999" />
                    From The Archives
                  </h2>
                  <button
                    onClick={() => setView('archives')}
                    style={{
                      padding: '0.75rem 1.75rem',
                      background: 'white',
                      border: '2px solid #667eea',
                      color: '#667eea',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.3s',
                      fontSize: '0.95rem'
                    }}
                  >
                    View All Archives →
                  </button>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
                  gap: '2rem'
                }}>
                  {getFilteredPosts(getArchivedPosts()).slice(0, 3).map(post => (
                    <BlogCard key={post._id} post={post} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {view === 'archives' && (
          <div>
            <h2 style={{
              fontSize: '2.5rem',
              marginBottom: '2rem',
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontWeight: '700'
            }}>
              <Archive size={32} color="#999" />
              Blog Archives
            </h2>
            
            <div style={{
              background: 'white',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem',
              fontSize: '0.95rem',
              color: '#666',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              Showing {getFilteredPosts(getArchivedPosts()).length} archived article{getFilteredPosts(getArchivedPosts()).length !== 1 ? 's' : ''}
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '2rem'
            }}>
              {getFilteredPosts(getArchivedPosts()).map(post => (
                <BlogCard key={post._id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}