import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./CourseDetail.css";

function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    if (!token) return null;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  useEffect(() => {
    fetchCourseDetails();
    checkEnrollmentStatus();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const BaseAPI = import.meta.env.VITE_BASE_API;
      const response = await fetch(`http://${BaseAPI}:3000/courses/${courseId}`);
      
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        console.error("Failed to fetch course details");
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;

    try {
      const BaseAPI = import.meta.env.VITE_BASE_API;
      const response = await fetch(`http://${BaseAPI}:3000/user/enrollments`, {
        headers
      });
      
      if (response.ok) {
        const enrollments = await response.json();
        const enrollment = enrollments.find(e => e.courseId === courseId);
        if (enrollment) {
          setIsEnrolled(true);
          setUserProgress(enrollment.progress);
        }
      }
    } catch (error) {
      console.error("Error checking enrollment status:", error);
    }
  };

  const handleEnroll = async () => {
    const headers = getAuthHeaders();
    if (!headers) {
      alert("Please login to enroll in courses");
      navigate("/login");
      return;
    }

    try {
      const BaseAPI = import.meta.env.VITE_BASE_API;
      const response = await fetch(`http://${BaseAPI}:3000/user/enroll`, {
        method: "POST",
        headers,
        body: JSON.stringify({ courseId })
      });

      if (response.ok) {
        setIsEnrolled(true);
        setUserProgress({ completedLessons: [], progressPercentage: 0 });
        alert("Successfully enrolled in course!");
      } else {
        const error = await response.json();
        alert(`Failed to enroll: ${error.message}`);
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Failed to enroll in course");
    }
  };

  const startCourse = () => {
    navigate(`/course/${courseId}/learn`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading course details...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!course) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <h2>Course not found</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button onClick={() => navigate("/courses")} className="btn-primary">
            Back to Courses
          </button>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="course-detail-container">
        {/* Hero Section */}
        <section className="course-hero">
          <div className="course-hero-content">
            <div className="course-info">
              <div className="course-breadcrumb">
                <span onClick={() => navigate("/courses")} className="breadcrumb-link">
                  Courses
                </span>
                <span className="breadcrumb-separator"> / </span>
                <span>{course.category}</span>
                <span className="breadcrumb-separator"> / </span>
                <span>{course.title}</span>
              </div>
              
              <h1 className="course-title">{course.title}</h1>
              <p className="course-subtitle">{course.description}</p>
              
              <div className="course-stats">
                <div className="stat">
                  <span className="stat-icon">⭐</span>
                  <span>{course.rating || "4.5"} ({course.reviews || 120} reviews)</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">👨‍🎓</span>
                  <span>{course.students || 1000} students</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">📚</span>
                  <span>{course.lessons || 20} lessons</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">🕒</span>
                  <span>{course.duration || "8"} hours</span>
                </div>
                <div className="stat">
                  <span className="stat-icon">📊</span>
                  <span className="level-badge">{course.level || "Beginner"}</span>
                </div>
              </div>

              {isEnrolled && userProgress && (
                <div className="progress-section">
                  <h3>Your Progress</h3>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${userProgress.progressPercentage || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {userProgress.progressPercentage || 0}% Complete
                  </span>
                </div>
              )}
            </div>
            
            <div className="course-card">
              <img 
                src={course.image || "https://via.placeholder.com/400x250"} 
                alt={course.title}
                className="course-image"
              />
              <div className="course-card-content">
                <div className="price-section">
                  {course.price === 0 ? (
                    <span className="price free">Free</span>
                  ) : (
                    <span className="price">${course.price}</span>
                  )}
                </div>
                
                {isEnrolled ? (
                  <button className="btn-primary btn-large" onClick={startCourse}>
                    Continue Learning
                  </button>
                ) : (
                  <button className="btn-primary btn-large" onClick={handleEnroll}>
                    Enroll Now
                  </button>
                )}
                
                <div className="course-includes">
                  <h4>This course includes:</h4>
                  <ul>
                    <li>📺 {course.lessons || 20} video lessons</li>
                    <li>📄 Downloadable resources</li>
                    <li>🏆 Certificate of completion</li>
                    <li>♾️ Lifetime access</li>
                    <li>📱 Access on mobile and desktop</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Tabs */}
        <section className="course-content">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button 
              className={`tab ${activeTab === "curriculum" ? "active" : ""}`}
              onClick={() => setActiveTab("curriculum")}
            >
              Curriculum
            </button>
            <button 
              className={`tab ${activeTab === "instructor" ? "active" : ""}`}
              onClick={() => setActiveTab("instructor")}
            >
              Instructor
            </button>
            <button 
              className={`tab ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "overview" && (
              <div className="overview-content">
                <h3>What you'll learn</h3>
                <div className="learning-objectives">
                  <ul>
                    <li>✓ Understand fundamental financial concepts</li>
                    <li>✓ Learn investment strategies and risk management</li>
                    <li>✓ Master budgeting and financial planning</li>
                    <li>✓ Develop skills in portfolio management</li>
                    <li>✓ Apply knowledge through practical exercises</li>
                  </ul>
                </div>
                
                <h3>Course Description</h3>
                <p className="course-description">
                  {course.longDescription || 
                    "This comprehensive financial literacy course is designed to provide you with essential knowledge and practical skills needed to make informed financial decisions. Whether you're just starting your financial journey or looking to enhance your existing knowledge, this course covers everything from basic budgeting to advanced investment strategies."
                  }
                </p>
                
                <h3>Prerequisites</h3>
                <p>
                  {course.prerequisites || "No prior knowledge required. This course is designed for beginners but also valuable for those looking to refresh their financial knowledge."}
                </p>
              </div>
            )}

            {activeTab === "curriculum" && (
              <div className="curriculum-content">
                <h3>Course Curriculum</h3>
                <div className="curriculum-modules">
                  {/* Sample curriculum - in real app, this would come from the course data */}
                  <div className="module">
                    <h4>Module 1: Financial Foundations</h4>
                    <div className="lessons">
                      <div className="lesson">
                        <span className="lesson-icon">▶️</span>
                        <span className="lesson-title">Introduction to Financial Literacy</span>
                        <span className="lesson-duration">15 min</span>
                      </div>
                      <div className="lesson">
                        <span className="lesson-icon">▶️</span>
                        <span className="lesson-title">Setting Financial Goals</span>
                        <span className="lesson-duration">20 min</span>
                      </div>
                      <div className="lesson">
                        <span className="lesson-icon">📝</span>
                        <span className="lesson-title">Quiz: Financial Basics</span>
                        <span className="lesson-duration">10 min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="module">
                    <h4>Module 2: Budgeting and Saving</h4>
                    <div className="lessons">
                      <div className="lesson">
                        <span className="lesson-icon">▶️</span>
                        <span className="lesson-title">Creating a Budget</span>
                        <span className="lesson-duration">25 min</span>
                      </div>
                      <div className="lesson">
                        <span className="lesson-icon">▶️</span>
                        <span className="lesson-title">Emergency Funds</span>
                        <span className="lesson-duration">18 min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "instructor" && (
              <div className="instructor-content">
                <div className="instructor-profile">
                  <img 
                    src="https://via.placeholder.com/100x100" 
                    alt="Instructor" 
                    className="instructor-avatar"
                  />
                  <div className="instructor-info">
                    <h3>{course.instructor || "John Smith"}</h3>
                    <p className="instructor-title">Financial Education Expert</p>
                    <div className="instructor-stats">
                      <div className="stat">
                        <strong>4.8</strong> Instructor Rating
                      </div>
                      <div className="stat">
                        <strong>1,234</strong> Reviews
                      </div>
                      <div className="stat">
                        <strong>15,000</strong> Students
                      </div>
                      <div className="stat">
                        <strong>12</strong> Courses
                      </div>
                    </div>
                  </div>
                </div>
                <div className="instructor-bio">
                  <p>
                    John is a certified financial planner with over 15 years of experience in financial education. 
                    He has helped thousands of students improve their financial literacy and achieve their financial goals.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="reviews-content">
                <div className="reviews-summary">
                  <div className="rating-overview">
                    <div className="avg-rating">
                      <span className="rating-number">{course.rating || "4.5"}</span>
                      <div className="stars">⭐⭐⭐⭐⭐</div>
                      <span className="review-count">({course.reviews || 120} reviews)</span>
                    </div>
                  </div>
                </div>
                
                <div className="reviews-list">
                  {/* Sample reviews */}
                  <div className="review">
                    <div className="review-header">
                      <strong>Sarah J.</strong>
                      <div className="review-rating">⭐⭐⭐⭐⭐</div>
                    </div>
                    <p>Excellent course! Really helped me understand the basics of investing and budgeting.</p>
                  </div>
                  
                  <div className="review">
                    <div className="review-header">
                      <strong>Mike T.</strong>
                      <div className="review-rating">⭐⭐⭐⭐⭐</div>
                    </div>
                    <p>Great content and easy to follow. The instructor explains concepts very clearly.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}

export default CourseDetail;