// src/hooks/useProgress.js
import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../config/api';

export function useProgress(courseId, userId) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgress = useCallback(async () => {
    if (!courseId || !userId) return;

    try {
      setLoading(true);
      const response = await apiRequest(`/progress/${userId}/${courseId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      setProgress(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, userId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const updateProgress = async (updates) => {
    try {
      const response = await apiRequest('/progress/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          ...updates
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json();
      setProgress(data.progress);
      return data;
    } catch (err) {
      console.error('Error updating progress:', err);
      throw err;
    }
  };

  const resetProgress = async () => {
    try {
      const response = await apiRequest('/progress/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });

      if (!response.ok) {
        throw new Error('Failed to reset progress');
      }

      const data = await response.json();
      setProgress(data.progress);
      return data;
    } catch (err) {
      console.error('Error resetting progress:', err);
      throw err;
    }
  };

  return {
    progress,
    loading,
    error,
    updateProgress,
    resetProgress,
    refetch: fetchProgress
  };
}
