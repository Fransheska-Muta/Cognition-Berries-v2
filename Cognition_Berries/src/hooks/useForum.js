// src/hooks/useForum.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiRequest, publicApiRequest, handleAuthError } from '../config/api';

/**
 * Custom hook for forum data management
 * Handles posts, replies, caching, optimistic updates, and error handling
 */
export const useForum = () => {
  const [posts, setPosts] = useState([]);
  const [replies, setReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Cache management
  const cacheRef = useRef({
    posts: null,
    replies: null,
    lastFetch: null
  });
  
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Fetch current user profile
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await apiRequest('/me');
      const user = await response.json();
      setCurrentUser(user);
      return user;
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      if (err.message.includes('401')) {
        handleAuthError();
      }
      return null;
    }
  }, []);

  // Fetch all posts with optional filters
  const fetchPosts = useCallback(async ({ page = 1, q = '', category = '', sort = 'newest' } = {}) => {
    const now = Date.now();
    
    // Return cached data if fresh and no filters
    if (!q && !category && cacheRef.current.posts && 
        cacheRef.current.lastFetch && 
        now - cacheRef.current.lastFetch < CACHE_DURATION) {
      setPosts(cacheRef.current.posts);
      return { data: cacheRef.current.posts, isLoading: false, error: null };
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await publicApiRequest('/forum-posts');
      let fetchedPosts = await response.json();

      // Client-side filtering
      if (q) {
        const query = q.toLowerCase();
        fetchedPosts = fetchedPosts.filter(post => 
          post.title?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query) ||
          post.tags?.some(tag => tag.toLowerCase().includes(query))
        );
      }

      if (category && category !== 'all') {
        fetchedPosts = fetchedPosts.filter(post => 
          post.category?.toLowerCase() === category.toLowerCase()
        );
      }

      // Client-side sorting
      switch (sort) {
        case 'oldest':
          fetchedPosts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'most-replied':
          // Will calculate reply counts after fetching replies
          break;
        case 'newest':
        default:
          fetchedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      // Cache the unfiltered results
      if (!q && !category) {
        cacheRef.current.posts = fetchedPosts;
        cacheRef.current.lastFetch = now;
      }

      setPosts(fetchedPosts);
      setIsLoading(false);
      return { data: fetchedPosts, isLoading: false, error: null };
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError(err.message);
      setIsLoading(false);
      return { data: [], isLoading: false, error: err.message };
    }
  }, []);

  // Fetch single post with replies
  const fetchPost = useCallback(async (postId) => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch post and replies in parallel
      const [postsResponse, repliesResponse] = await Promise.all([
        publicApiRequest('/forum-posts'),
        publicApiRequest('/forum-replies')
      ]);

      const allPosts = await postsResponse.json();
      const allReplies = await repliesResponse.json();

      const post = allPosts.find(p => 
        p._id === postId || 
        p.post_id === postId ||
        (p._id && p._id.toString() === postId)
      );

      if (!post) {
        throw new Error('Post not found');
      }

      // Filter replies for this post
      const postReplies = allReplies.filter(r => 
        r.postId === postId || 
        r.postId === post._id ||
        (r.postId && r.postId.toString() === postId)
      );

      setIsLoading(false);
      return { post, replies: postReplies };
    } catch (err) {
      console.error('Failed to fetch post:', err);
      setError(err.message);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Fetch all replies and cache them
  const fetchReplies = useCallback(async () => {
    try {
      const response = await publicApiRequest('/forum-replies');
      const fetchedReplies = await response.json();
      setReplies(fetchedReplies);
      cacheRef.current.replies = fetchedReplies;
      return fetchedReplies;
    } catch (err) {
      console.error('Failed to fetch replies:', err);
      return [];
    }
  }, []);

  // Create a new post with optimistic update
  const createPost = useCallback(async (postData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticPost = {
      _id: tempId,
      ...postData,
      uid: currentUser?.uid || 'temp-uid',
      userEmail: currentUser?.email || 'temp@email.com',
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Optimistic update
    setPosts(prev => [optimisticPost, ...prev]);

    try {
      const response = await apiRequest('/forum-posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });

      const createdPost = await response.json();

      // Replace optimistic post with real one
      setPosts(prev => prev.map(p => 
        p._id === tempId ? { ...createdPost, isOptimistic: false } : p
      ));

      // Invalidate cache
      cacheRef.current.posts = null;
      cacheRef.current.lastFetch = null;

      return createdPost;
    } catch (err) {
      console.error('Failed to create post:', err);
      
      // Rollback optimistic update
      setPosts(prev => prev.filter(p => p._id !== tempId));
      
      if (err.message.includes('401')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [currentUser]);

  // Update a post with optimistic update
  const updatePost = useCallback(async (postId, updates) => {
    const previousPosts = [...posts];

    // Optimistic update
    setPosts(prev => prev.map(p => 
      (p._id === postId || p.post_id === postId) 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ));

    try {
      const response = await apiRequest(`/forum-posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      const updatedPost = await response.json();

      setPosts(prev => prev.map(p => 
        (p._id === postId || p.post_id === postId) ? updatedPost : p
      ));

      // Invalidate cache
      cacheRef.current.posts = null;

      return updatedPost;
    } catch (err) {
      console.error('Failed to update post:', err);
      
      // Rollback
      setPosts(previousPosts);
      
      if (err.message.includes('401') || err.message.includes('403')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [posts]);

  // Delete a post with optimistic update
  const deletePost = useCallback(async (postId) => {
    const previousPosts = [...posts];

    // Optimistic update
    setPosts(prev => prev.filter(p => 
      p._id !== postId && p.post_id !== postId
    ));

    try {
      await apiRequest(`/forum-posts/${postId}`, {
        method: 'DELETE'
      });

      // Invalidate cache
      cacheRef.current.posts = null;

      return true;
    } catch (err) {
      console.error('Failed to delete post:', err);
      
      // Rollback
      setPosts(previousPosts);
      
      if (err.message.includes('401') || err.message.includes('403')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [posts]);

  // Create a reply with optimistic update
  const createReply = useCallback(async (replyData) => {
    const tempId = `temp-${Date.now()}`;
    const optimisticReply = {
      _id: tempId,
      ...replyData,
      uid: currentUser?.uid || 'temp-uid',
      userEmail: currentUser?.email || 'temp@email.com',
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Optimistic update
    setReplies(prev => [...prev, optimisticReply]);

    try {
      const response = await apiRequest('/forum-replies', {
        method: 'POST',
        body: JSON.stringify(replyData)
      });

      const createdReply = await response.json();

      // Replace optimistic reply with real one
      setReplies(prev => prev.map(r => 
        r._id === tempId ? { ...createdReply, isOptimistic: false } : r
      ));

      // Invalidate cache
      cacheRef.current.replies = null;

      return createdReply;
    } catch (err) {
      console.error('Failed to create reply:', err);
      
      // Rollback
      setReplies(prev => prev.filter(r => r._id !== tempId));
      
      if (err.message.includes('401')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [currentUser]);

  // Update a reply
  const updateReply = useCallback(async (replyId, updates) => {
    const previousReplies = [...replies];

    // Optimistic update
    setReplies(prev => prev.map(r => 
      (r._id === replyId || r.reply_id === replyId)
        ? { ...r, ...updates, updatedAt: new Date().toISOString() }
        : r
    ));

    try {
      const response = await apiRequest(`/forum-replies/${replyId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      const updatedReply = await response.json();

      setReplies(prev => prev.map(r => 
        (r._id === replyId || r.reply_id === replyId) ? updatedReply : r
      ));

      cacheRef.current.replies = null;

      return updatedReply;
    } catch (err) {
      console.error('Failed to update reply:', err);
      
      // Rollback
      setReplies(previousReplies);
      
      if (err.message.includes('401') || err.message.includes('403')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [replies]);

  // Delete a reply
  const deleteReply = useCallback(async (replyId) => {
    const previousReplies = [...replies];

    // Optimistic update
    setReplies(prev => prev.filter(r => 
      r._id !== replyId && r.reply_id !== replyId
    ));

    try {
      await apiRequest(`/forum-replies/${replyId}`, {
        method: 'DELETE'
      });

      cacheRef.current.replies = null;

      return true;
    } catch (err) {
      console.error('Failed to delete reply:', err);
      
      // Rollback
      setReplies(previousReplies);
      
      if (err.message.includes('401') || err.message.includes('403')) {
        handleAuthError();
      }
      
      throw err;
    }
  }, [replies]);

  // Refresh data
  const refresh = useCallback(async () => {
    cacheRef.current.posts = null;
    cacheRef.current.replies = null;
    cacheRef.current.lastFetch = null;
    await fetchPosts();
    await fetchReplies();
  }, [fetchPosts, fetchReplies]);

  // Initialize: fetch user and data
  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
    fetchReplies();
  }, [fetchCurrentUser, fetchPosts, fetchReplies]);

  return {
    posts,
    replies,
    isLoading,
    error,
    currentUser,
    fetchPosts,
    fetchPost,
    fetchReplies,
    createPost,
    updatePost,
    deletePost,
    createReply,
    updateReply,
    deleteReply,
    refresh
  };
};

export default useForum;