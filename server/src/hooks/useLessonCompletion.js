// src/hooks/useLessonCompletion.js
import { useState, useCallback } from 'react';
import { apiRequest } from '../config/api';

export function useLessonCompletion(courseId, onComplete) {
  const [completing, setCompleting] = useState(false);

  const completeLesson = useCallback(async (lessonId, quizScore) => {
    if (!courseId || !lessonId) return;

    try {
      setCompleting(true);
      const response = await apiRequest('/progress/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          lessonId,
          quizScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to complete lesson');
      }

      const data = await response.json();
      
      if (onComplete) {
        onComplete(data);
      }

      return data;
    } catch (err) {
      console.error('Error completing lesson:', err);
      throw err;
    } finally {
      setCompleting(false);
    }
  }, [courseId, onComplete]);

  return {
    completeLesson,
    completing
  };
}