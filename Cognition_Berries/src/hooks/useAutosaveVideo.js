// src/hooks/useAutosaveVideo.js
import { useEffect, useRef, useCallback } from 'react';
import { apiRequest } from '../config/api';

export function useAutosaveVideo(courseId, lessonId, videoRef) {
  const autosaveInterval = useRef(null);
  const lastSavedPosition = useRef(0);

  const savePosition = useCallback(async (position, duration) => {
    if (!courseId || !lessonId || !videoRef.current) return;

    // Only save if position changed significantly (> 5 seconds)
    if (Math.abs(position - lastSavedPosition.current) < 5) return;

    try {
      await apiRequest('/progress/autosave-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          position: Math.floor(position),
          duration: Math.floor(duration)
        })
      });

      lastSavedPosition.current = position;
    } catch (err) {
      console.error('Error autosaving video position:', err);
    }
  }, [courseId, lessonId, videoRef]);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Start autosave interval
    autosaveInterval.current = setInterval(() => {
      if (!video.paused && !video.ended) {
        savePosition(video.currentTime, video.duration);
      }
    }, 15000); // Save every 15 seconds

    // Save on pause
    const handlePause = () => {
      savePosition(video.currentTime, video.duration);
    };

    // Save before leaving page
    const handleBeforeUnload = () => {
      savePosition(video.currentTime, video.duration);
    };

    video.addEventListener('pause', handlePause);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (autosaveInterval.current) {
        clearInterval(autosaveInterval.current);
      }
      video.removeEventListener('pause', handlePause);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Final save on unmount
      if (!video.ended) {
        savePosition(video.currentTime, video.duration);
      }
    };
  }, [videoRef, savePosition]);

  return { savePosition };
}
