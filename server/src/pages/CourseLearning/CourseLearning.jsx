import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import { useProgress } from "../../hooks/useProgress";
import { useLessonCompletion } from "../../hooks/useLessonCompletion";
import Navbar from "../../components/Navbar/Navbar";
import ProgressBar from "../../components/Progress/ProgressBar";
import LessonList from "../../components/Progress/LessonList";
import VideoPlayer from "../../components/Progress/VideoPlayer";
import QuizRenderer from "../../components/Progress/QuizRenderer";
import "./CourseLearning.css";

function CourseLearning() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await apiRequest('/me');
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  // Progress tracking hook
  const { 
    progress, 
    loading: progressLoading,
    updateProgress,
    refetch: refetchProgress
  } = useProgress(courseId, user?.uid);

  // Lesson completion hook
  const { completeLesson, completing } = useLessonCompletion(courseId, (data) => {
    alert(`✓ Lesson completed! ${data.percentComplete}% course complete`);
    refetchProgress();
  });

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await apiRequest(`/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch course");
        }
        
        const courseData = await response.json();
        setCourse(courseData);
      } catch (error) {
        console.error("Error loading course:", error);
        alert("Failed to load course. Please try again.");
        navigate("/courses");
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, navigate]);

  // Set current lesson based on progress
  useEffect(() => {
    if (course && progress) {
      const allLessons = getAllLessons();
      
      // If there's a last opened lesson, start there
      if (progress.lastOpenedLesson) {
        const lessonIndex = allLessons.findIndex(
          l => l.id === progress.lastOpenedLesson
        );
        if (lessonIndex !== -1) {
          setCurrentLessonIndex(lessonIndex);
          setCurrentLesson(allLessons[lessonIndex]);
          return;
        }
      }

      // Otherwise, find first incomplete lesson
      const firstIncomplete = allLessons.findIndex(
        l => !progress.completedLessons.includes(l.id)
      );

      if (firstIncomplete !== -1) {
        setCurrentLessonIndex(firstIncomplete);
        setCurrentLesson(allLessons[firstIncomplete]);
      } else if (allLessons.length > 0) {
        // All complete, start at beginning
        setCurrentLessonIndex(0);
        setCurrentLesson(allLessons[0]);
      }
    }
  }, [course, progress]);

  // Load notes for current lesson
  useEffect(() => {
    if (currentLesson) {
      const savedNotes = localStorage.getItem(
        `course_${courseId}_lesson_${currentLesson.id}_notes`
      );
      setNotes(savedNotes || "");

      // Update last opened lesson
      if (progress && currentLesson.id !== progress.lastOpenedLesson) {
        updateProgress({ lastOpenedLesson: currentLesson.id });
      }
    }
  }, [currentLesson, courseId, progress, updateProgress]);

  const getAllLessons = () => {
    if (!course || !course.modules) return [];
    
    return course.modules.flatMap(module => 
      (module.lessons || []).map(lesson => ({
        ...lesson,
        moduleTitle: module.title,
        moduleId: module.id
      }))
    );
  };

  const allLessons = getAllLessons();

  const goToLesson = (lesson) => {
    const index = allLessons.findIndex(l => l.id === lesson.id);
    if (index !== -1) {
      setCurrentLessonIndex(index);
      setCurrentLesson(lesson);
    }
  };

  const goToNextLesson = () => {
    if (currentLessonIndex < allLessons.length - 1) {
      const nextIndex = currentLessonIndex + 1;
      setCurrentLessonIndex(nextIndex);
      setCurrentLesson(allLessons[nextIndex]);
    } else {
      alert("🎉 Congratulations! You've completed all lessons in this course.");
    }
  };

  const goToPreviousLesson = () => {
    if (currentLessonIndex > 0) {
      const prevIndex = currentLessonIndex - 1;
      setCurrentLessonIndex(prevIndex);
      setCurrentLesson(allLessons[prevIndex]);
    }
  };

  const handleMarkComplete = async () => {
    if (!currentLesson) return;

    try {
      await completeLesson(currentLesson.id);
    } catch (err) {
      alert("Failed to mark lesson complete. Please try again.");
    }
  };

  const handleVideoComplete = async () => {
    if (!currentLesson) return;

    // Auto-complete lesson when video reaches 90%
    if (!progress?.completedLessons?.includes(currentLesson.id)) {
      try {
        await completeLesson(currentLesson.id);
      } catch (err) {
        console.error('Error auto-completing lesson:', err);
      }
    }
  };

  const handleQuizComplete = async (data) => {
    refetchProgress();
    
    if (data.percentComplete === 100) {
      alert("🎊 Course completed! Congratulations!");
    }
  };

  const saveNotes = () => {
    if (currentLesson) {
      localStorage.setItem(
        `course_${courseId}_lesson_${currentLesson.id}_notes`,
        notes
      );
      alert("💾 Notes saved successfully!");
    }
  };

  const isLessonCompleted = (lessonId) => {
    return progress?.completedLessons?.includes(lessonId) || false;
  };

  if (loading || progressLoading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading course...</p>
        </div>
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <h2>Course not found</h2>
          <button onClick={() => navigate("/courses")} className="btn-primary">
            Back to Courses
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="learning-container">
        {/* Sidebar with Lesson List */}
        <aside className="course-sidebar">
          <div className="course-header">
            <button 
              className="back-btn"
              onClick={() => navigate(`/course/${courseId}`)}
            >
              ← Back to Course
            </button>
            <h2>{course.title}</h2>
            
            {progress && (
              <div className="progress-overview">
                <ProgressBar 
                  percent={progress.percentComplete} 
                  showText={true}
                  height="10px"
                />
              </div>
            )}
          </div>

          <LessonList
            modules={course.modules || []}
            completedLessons={progress?.completedLessons || []}
            currentLesson={currentLesson}
            onLessonClick={goToLesson}
          />
        </aside>

        {/* Main Content */}
        <main className="learning-content">
          {currentLesson && (
            <>
              <div className="lesson-header">
                <div className="lesson-breadcrumb">
                  <span>{currentLesson.moduleTitle}</span>
                  <span className="separator"> / </span>
                  <span>{currentLesson.title}</span>
                </div>
                
                <div className="lesson-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    📝 {showNotes ? "Hide Notes" : "Show Notes"}
                  </button>
                  {!isLessonCompleted(currentLesson.id) && (
                    <button 
                      className="btn-primary"
                      onClick={handleMarkComplete}
                      disabled={completing}
                    >
                      {completing ? "Marking..." : "Mark Complete"}
                    </button>
                  )}
                  {isLessonCompleted(currentLesson.id) && (
                    <span className="completed-badge">✓ Completed</span>
                  )}
                </div>
              </div>

              <div className="lesson-content">
                {currentLesson.type === "video" && (
                  <div className="video-section">
                    <VideoPlayer
                      videoUrl={currentLesson.videoUrl || "https://www.w3schools.com/html/mov_bbb.mp4"}
                      courseId={courseId}
                      lessonId={currentLesson.id}
                      savedPosition={progress?.videoPositions?.[currentLesson.id] || 0}
                      onComplete={handleVideoComplete}
                    />
                    
                    <div className="lesson-description">
                      <h3>{currentLesson.title}</h3>
                      <p>{currentLesson.description}</p>
                    </div>

                    {currentLesson.resources && (
                      <div className="lesson-resources">
                        <h4>📚 Downloadable Resources</h4>
                        <ul>
                          {currentLesson.resources.map((resource, index) => (
                            <li key={index}>
                              <a 
                                href="#" 
                                onClick={(e) => { 
                                  e.preventDefault(); 
                                  alert(`Download: ${resource}`); 
                                }}
                              >
                                📄 {resource}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {currentLesson.type === "quiz" && (
                  <div className="quiz-section">
                    <div className="quiz-header">
                      <h3>📝 {currentLesson.title}</h3>
                      <p>Answer all questions to complete this lesson. You need 70% to pass.</p>
                    </div>
                    
                    <QuizRenderer
                      questions={currentLesson.questions || []}
                      courseId={courseId}
                      lessonId={currentLesson.id}
                      onComplete={handleQuizComplete}
                    />
                  </div>
                )}

                {currentLesson.type === "document" && (
                  <div className="document-section">
                    <div className="document-header">
                      <h3>📄 {currentLesson.title}</h3>
                      <p>{currentLesson.description}</p>
                    </div>
                    <div className="document-content">
                      <p>{currentLesson.content || "Document content will be displayed here."}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="lesson-navigation">
                <button 
                  className="btn-secondary"
                  onClick={goToPreviousLesson}
                  disabled={currentLessonIndex === 0}
                >
                  ← Previous Lesson
                </button>
                
                <span className="lesson-counter">
                  Lesson {currentLessonIndex + 1} of {allLessons.length}
                </span>
                
                <button 
                  className="btn-secondary"
                  onClick={goToNextLesson}
                  disabled={currentLessonIndex === allLessons.length - 1}
                >
                  Next Lesson →
                </button>
              </div>
            </>
          )}
        </main>

        {/* Notes Panel */}
        {showNotes && (
          <div className="notes-panel">
            <div className="notes-header">
              <h3>📝 Lesson Notes</h3>
              <button 
                className="close-notes"
                onClick={() => setShowNotes(false)}
              >
                ✕
              </button>
            </div>
            <textarea
              className="notes-textarea"
              placeholder="Take notes about this lesson..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button className="btn-primary save-notes" onClick={saveNotes}>
              💾 Save Notes
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CourseLearning;