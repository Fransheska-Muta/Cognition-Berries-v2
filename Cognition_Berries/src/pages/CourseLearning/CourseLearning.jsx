import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import "./CourseLearning.css";

function CourseLearning() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});

  // Sample course structure - in real app, this would come from API
  const sampleCourse = {
    id: courseId,
    title: "Financial Literacy Fundamentals",
    modules: [
      {
        id: 1,
        title: "Financial Foundations",
        lessons: [
          {
            id: 1,
            title: "Introduction to Financial Literacy",
            type: "video",
            duration: "15:30",
            videoUrl: "https://example.com/video5",
            description: "Understand the importance of emergency funds and how to build them effectively.",
            resources: ["Emergency Fund Calculator"]
          }
        ]
      }
    ]
  };

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return null;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  // Get all lessons flattened
  const getAllLessons = () => {
    if (!course) return [];
    return course.modules.flatMap(module => 
      module.lessons.map(lesson => ({
        ...lesson,
        moduleTitle: module.title,
        moduleId: module.id
      }))
    );
  };

  const allLessons = getAllLessons();
  const currentLessonData = allLessons[currentLesson];

  useEffect(() => {
    fetchCourseAndProgress();
  }, [courseId]);

  useEffect(() => {
    // Load saved notes for current lesson
    const savedNotes = localStorage.getItem(`course_${courseId}_lesson_${currentLessonData?.id}_notes`);
    setNotes(savedNotes || "");
  }, [currentLesson, courseId]);

  const fetchCourseAndProgress = async () => {
    try {
      // For demo purposes, using sample data
      setCourse(sampleCourse);
      
      // Fetch user progress
      const headers = getAuthHeaders();
      if (headers) {
        const BaseAPI = import.meta.env.VITE_BASE_API;
        try {
          const response = await fetch(`http://${BaseAPI}:3000/user/progress/${courseId}`, {
            headers
          });
          
          if (response.ok) {
            const progressData = await response.json();
            setUserProgress(progressData);
          }
        } catch (error) {
          console.error("Error fetching progress:", error);
        }
      }
    } catch (error) {
      console.error("Error loading course:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (lessonId, completed = true) => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const BaseAPI = import.meta.env.VITE_BASE_API;
      await fetch(`http://${BaseAPI}:3000/user/progress`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          courseId,
          lessonId,
          completed,
          watchTime: isVideoPlaying ? 100 : 0 // Percentage watched
        })
      });
      
      // Update local progress state
      setUserProgress(prev => ({
        ...prev,
        completedLessons: [...(prev?.completedLessons || []), lessonId],
        progressPercentage: Math.round(((prev?.completedLessons?.length || 0) + 1) / allLessons.length * 100)
      }));
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  const markLessonComplete = () => {
    if (currentLessonData) {
      updateProgress(currentLessonData.id);
    }
  };

  const goToNextLesson = () => {
    if (currentLesson < allLessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
      setShowQuiz(false);
      setQuizAnswers({});
    }
  };

  const goToPreviousLesson = () => {
    if (currentLesson > 0) {
      setCurrentLesson(currentLesson - 1);
      setShowQuiz(false);
      setQuizAnswers({});
    }
  };

  const saveNotes = () => {
    if (currentLessonData) {
      localStorage.setItem(`course_${courseId}_lesson_${currentLessonData.id}_notes`, notes);
      alert("Notes saved!");
    }
  };

  const handleQuizAnswer = (questionId, answerIndex) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const submitQuiz = () => {
    const questions = currentLessonData.questions;
    let correct = 0;
    
    questions.forEach(question => {
      if (quizAnswers[question.id] === question.correct) {
        correct++;
      }
    });
    
    const score = Math.round((correct / questions.length) * 100);
    alert(`Quiz completed! You scored ${score}% (${correct}/${questions.length})`);
    
    if (score >= 70) {
      markLessonComplete();
    }
  };

  const isLessonCompleted = (lessonId) => {
    return userProgress?.completedLessons?.includes(lessonId) || false;
  };

  if (loading) {
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
        {/* Sidebar */}
        <aside className="course-sidebar">
          <div className="course-header">
            <button 
              className="back-btn"
              onClick={() => navigate(`/course/${courseId}`)}
            >
              ← Back to Course
            </button>
            <h2>{course.title}</h2>
            
            {userProgress && (
              <div className="progress-overview">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${userProgress.progressPercentage || 0}%` }}
                  ></div>
                </div>
                <span>{userProgress.progressPercentage || 0}% Complete</span>
              </div>
            )}
          </div>

          <div className="curriculum-list">
            {course.modules.map((module, moduleIndex) => (
              <div key={module.id} className="module-section">
                <h3 className="module-title">{module.title}</h3>
                <div className="lessons-list">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const globalIndex = course.modules
                      .slice(0, moduleIndex)
                      .reduce((acc, mod) => acc + mod.lessons.length, 0) + lessonIndex;
                    
                    return (
                      <div
                        key={lesson.id}
                        className={`lesson-item ${
                          currentLesson === globalIndex ? "active" : ""
                        } ${isLessonCompleted(lesson.id) ? "completed" : ""}`}
                        onClick={() => setCurrentLesson(globalIndex)}
                      >
                        <div className="lesson-info">
                          <span className="lesson-type">
                            {lesson.type === "video" ? "▶️" : "📝"}
                          </span>
                          <span className="lesson-title">{lesson.title}</span>
                        </div>
                        <div className="lesson-meta">
                          {lesson.duration && (
                            <span className="duration">{lesson.duration}</span>
                          )}
                          {isLessonCompleted(lesson.id) && (
                            <span className="completed-check">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="learning-content">
          {currentLessonData && (
            <>
              <div className="lesson-header">
                <div className="lesson-breadcrumb">
                  <span>{currentLessonData.moduleTitle}</span>
                  <span className="separator"> / </span>
                  <span>{currentLessonData.title}</span>
                </div>
                
                <div className="lesson-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowNotes(!showNotes)}
                  >
                    📝 Notes
                  </button>
                  {!isLessonCompleted(currentLessonData.id) && (
                    <button 
                      className="btn-primary"
                      onClick={markLessonComplete}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>

              <div className="lesson-content">
                {currentLessonData.type === "video" && (
                  <div className="video-section">
                    <div className="video-player">
                      <div className="video-placeholder">
                        <div className="video-controls">
                          <button 
                            className="play-btn"
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                          >
                            {isVideoPlaying ? "⏸️" : "▶️"}
                          </button>
                          <span>Video Player Placeholder</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="lesson-description">
                      <h3>{currentLessonData.title}</h3>
                      <p>{currentLessonData.description}</p>
                    </div>

                    {currentLessonData.resources && (
                      <div className="lesson-resources">
                        <h4>Resources</h4>
                        <ul>
                          {currentLessonData.resources.map((resource, index) => (
                            <li key={index}>
                              <a href="#" download>📄 {resource}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {currentLessonData.type === "quiz" && (
                  <div className="quiz-section">
                    <h3>{currentLessonData.title}</h3>
                    <div className="quiz-questions">
                      {currentLessonData.questions.map((question, qIndex) => (
                        <div key={question.id} className="question">
                          <h4>Question {qIndex + 1}</h4>
                          <p>{question.question}</p>
                          <div className="options">
                            {question.options.map((option, optIndex) => (
                              <label key={optIndex} className="option">
                                <input
                                  type="radio"
                                  name={`question_${question.id}`}
                                  value={optIndex}
                                  onChange={() => handleQuizAnswer(question.id, optIndex)}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button className="btn-primary" onClick={submitQuiz}>
                      Submit Quiz
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="lesson-navigation">
                <button 
                  className="btn-secondary"
                  onClick={goToPreviousLesson}
                  disabled={currentLesson === 0}
                >
                  ← Previous
                </button>
                
                <span className="lesson-counter">
                  {currentLesson + 1} of {allLessons.length}
                </span>
                
                <button 
                  className="btn-secondary"
                  onClick={goToNextLesson}
                  disabled={currentLesson === allLessons.length - 1}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </main>

        {/* Notes Panel */}
        {showNotes && (
          <div className="notes-panel">
            <div className="notes-header">
              <h3>Lesson Notes</h3>
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
              Save Notes
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CourseLearning;