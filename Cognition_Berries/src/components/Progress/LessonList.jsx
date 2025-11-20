import React, { useState, useEffect } from 'react';
import './LessonList.css';

const LessonList = ({ 
  lessons, 
  completedLessons = [], 
  currentLessonId, 
  onLessonSelect, 
  onMarkComplete,
  userProgress 
}) => {
  const [localCompleted, setLocalCompleted] = useState(new Set(completedLessons));

  useEffect(() => {
    setLocalCompleted(new Set(completedLessons));
  }, [completedLessons]);

  const handleLessonClick = (lesson) => {
    onLessonSelect(lesson);
  };

  const handleMarkComplete = (lessonId, e) => {
    e.stopPropagation();
    const newCompleted = new Set(localCompleted);
    
    if (newCompleted.has(lessonId)) {
      newCompleted.delete(lessonId);
    } else {
      newCompleted.add(lessonId);
    }
    
    setLocalCompleted(newCompleted);
    onMarkComplete(lessonId, newCompleted.has(lessonId));
  };

  const getLessonStatus = (lessonId) => {
    const isCompleted = localCompleted.has(lessonId);
    const isCurrent = currentLessonId === lessonId;
    
    return {
      isCompleted,
      isCurrent,
      status: isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
    };
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="lesson-list">
      <div className="lesson-list-header">
        <h3>Course Lessons</h3>
        <div className="progress-stats">
          {completedLessons.length} of {lessons.length} completed
        </div>
      </div>
      
      <div className="lessons-container">
        {lessons.map((lesson, index) => {
          const status = getLessonStatus(lesson.lessonId);
          const timeSpent = userProgress?.timeSpent?.[lesson.lessonId] || 0;
          
          return (
            <div
              key={lesson.lessonId}
              className={`lesson-item ${status.status}`}
              onClick={() => handleLessonClick(lesson)}
            >
              <div className="lesson-number">
                {index + 1}
              </div>
              
              <div className="lesson-content">
                <div className="lesson-title">
                  {lesson.title}
                </div>
                
                <div className="lesson-meta">
                  <span className="lesson-type">{lesson.type}</span>
                  {timeSpent > 0 && (
                    <span className="time-spent">
                      {formatDuration(timeSpent)} watched
                    </span>
                  )}
                </div>
              </div>
              
              <div className="lesson-actions">
                <button
                  className={`complete-btn ${status.isCompleted ? 'completed' : ''}`}
                  onClick={(e) => handleMarkComplete(lesson.lessonId, e)}
                  title={status.isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {status.isCompleted ? '✓' : '○'}
                </button>
                
                {status.isCurrent && (
                  <span className="continue-label">Continue</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LessonList;