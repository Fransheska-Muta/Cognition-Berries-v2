import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Star, 
  Users, 
  BookOpen, 
  Clock, 
  BarChart3, 
  Download, 
  Award, 
  Infinity, 
  Smartphone,
  Play,
  FileText,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Target,
  Shield
} from "lucide-react";
import { apiRequest } from "../../config/api";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./CourseDetail.css";

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userProgress, setUserProgress] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [enrolling, setEnrolling] = useState(false);

  // Memoize computed values
  const { 
    formattedDuration,
    completionRate,
    difficultyColor
  } = useMemo(() => ({
    formattedDuration: course?.duration ? `${Math.floor(course.duration / 60)}h ${course.duration % 60}m` : "N/A",
    completionRate: course?.completionRate || 0,
    difficultyColor: {
      Beginner: "bg-green-100 text-green-800",
      Intermediate: "bg-yellow-100 text-yellow-800",
      Advanced: "bg-red-100 text-red-800"
    }[course?.level || "Beginner"]
  }), [course]);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("📚 Fetching course details for:", courseId);
      
      const courseResponse = await apiRequest(`/courses/${courseId}`);
      
      if (!courseResponse.ok) {
        throw new Error(`Failed to fetch course: ${courseResponse.status}`);
      }
      
      const courseData = await courseResponse.json();
      console.log("✅ Course data received:", courseData);

      let displayImage = null;
      
      if (courseData.imageData && courseData.imageData.data) {
        displayImage = courseData.imageData.data;
        console.log("Using imageData.data for course image");
      } else if (courseData.image) {
        if (courseData.image.match(/^[0-9a-fA-F]{24}$/)) {
          const baseUrl = import.meta.env.VITE_BASE_API || 'localhost:3000';
          displayImage = `http://${baseUrl}/api/images/${courseData.image}`;
          console.log("Image is ObjectId, using API endpoint");
        } else if (courseData.image.startsWith('data:image/')) {
          displayImage = courseData.image;
          console.log("Image is base64 data URL");
        } else if (courseData.image.startsWith('http') || courseData.image.startsWith('/')) {
          displayImage = courseData.image;
          console.log("Image is URL/path");
        }
      }

      setCourse({
        ...courseData,
        displayImage
      });

      try {
        const enrollmentResponse = await apiRequest('/user/enrollments');
        if (enrollmentResponse.ok) {
          const enrollmentsData = await enrollmentResponse.json();
          const enrollment = enrollmentsData.find(e => e.courseId === courseId);
          if (enrollment) {
            setIsEnrolled(true);
            setUserProgress(enrollment.progress);
          }
        }
      } catch (err) {
        console.warn("Could not check enrollment status:", err);
      }
      
    } catch (err) {
      console.error("❌ Error loading course data:", err);
      setError(err.message || "Failed to load course details");
    } finally {
      setLoading(false);
    }
  };

  const getImageSrc = () => {
    if (!course) return "https://via.placeholder.com/400x250?text=Course";
    
    if (course.displayImage) {
      return course.displayImage;
    }
    
    return "https://via.placeholder.com/400x250?text=Finance+Course";
  };

  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      const response = await apiRequest(`/enroll/${courseId}`, {
        method: "POST"
      });

      if (!response.ok) throw new Error("Enrollment failed");

      setIsEnrolled(true);
      alert("Successfully enrolled in the course!");
    } catch (err) {
      console.error("Enrollment error:", err);
      setError("Failed to enroll in the course. Please try again.");
    } finally {
      setEnrolling(false);
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

  if (error) {
    return (
      <>
        <Navbar />
        <div className="error-container">
          <h2>Error Loading Course</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/courses")} className="btn-primary">
            Back to Courses
          </button>
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
                <ChevronRight size={16} className="breadcrumb-separator" />
                <span>{course.category || "General"}</span>
                <ChevronRight size={16} className="breadcrumb-separator" />
                <span>{course.title}</span>
              </div>
              
              <h1 className="course-title">{course.title}</h1>
              <p className="course-subtitle">{course.description}</p>
              
              <div className="course-stats">
                <div className="stat">
                  <Star size={18} className="stat-icon" />
                  <span>{course.ratingValue || course.rating || "4.5"} ({course.ratingsCount || course.reviews || 120} reviews)</span>
                </div>
                <div className="stat">
                  <Users size={18} className="stat-icon" />
                  <span>{course.students || 1000} students</span>
                </div>
                <div className="stat">
                  <BookOpen size={18} className="stat-icon" />
                  <span>{course.lectures || 20} lessons</span>
                </div>
                <div className="stat">
                  <Clock size={18} className="stat-icon" />
                  <span>{course.totalHours || formattedDuration}</span>
                </div>
                <div className="stat">
                  <BarChart3 size={18} className="stat-icon" />
                  <span className="level-badge">{course.level || "All Levels"}</span>
                </div>
              </div>

              {isEnrolled && userProgress && (
                <div className="progress-section">
                  <div className="progress-header">
                    <h3>Your Progress</h3>
                    <span className="progress-percentage">{userProgress.progressPercentage || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${userProgress.progressPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="course-card">
              <div className="course-image-wrapper">
                <img 
                  src={getImageSrc()} 
                  alt={course.title}
                  className="course-image"
                  onError={(e) => {
                    console.error("Failed to load course image");
                    e.target.src = "https://via.placeholder.com/400x250?text=Finance+Course";
                  }}
                />
              </div>
              <div className="course-card-content">
                <div className="price-section">
                  {course.price === 0 || course.price === "0" ? (
                    <span className="price free">Free</span>
                  ) : (
                    <div className="price-wrapper">
                      <span className="price">{course.price}</span>
                      {course.originalPrice && (
                        <span className="original-price">{course.originalPrice}</span>
                      )}
                    </div>
                  )}
                </div>
                
                {isEnrolled ? (
                  <button className="btn-primary btn-large" onClick={startCourse}>
                    <Play size={20} />
                    Continue Learning
                  </button>
                ) : (
                  <button 
                    className="btn-primary btn-large" 
                    onClick={handleEnroll}
                    disabled={enrolling}
                  >
                    {enrolling ? "Enrolling..." : "Enroll Now"}
                  </button>
                )}
                
                <div className="course-includes">
                  <h4>This course includes:</h4>
                  <ul>
                    <li>
                      <Play size={16} className="include-icon" />
                      <span>{course.lectures || 20} video lessons</span>
                    </li>
                    <li>
                      <Download size={16} className="include-icon" />
                      <span>Downloadable resources</span>
                    </li>
                    <li>
                      <Award size={16} className="include-icon" />
                      <span>Certificate of completion</span>
                    </li>
                    <li>
                      <Infinity size={16} className="include-icon" />
                      <span>Lifetime access</span>
                    </li>
                    <li>
                      <Smartphone size={16} className="include-icon" />
                      <span>Access on mobile and desktop</span>
                    </li>
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
              <Target size={18} />
              Overview
            </button>
            <button 
              className={`tab ${activeTab === "curriculum" ? "active" : ""}`}
              onClick={() => setActiveTab("curriculum")}
            >
              <BookOpen size={18} />
              Curriculum
            </button>
            <button 
              className={`tab ${activeTab === "instructor" ? "active" : ""}`}
              onClick={() => setActiveTab("instructor")}
            >
              <Users size={18} />
              Instructor
            </button>
            <button 
              className={`tab ${activeTab === "reviews" ? "active" : ""}`}
              onClick={() => setActiveTab("reviews")}
            >
              <Star size={18} />
              Reviews
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "overview" && (
              <div className="overview-content">
                <div className="content-section">
                  <h3>What you'll learn</h3>
                  <div className="learning-objectives">
                    <div className="objective-item">
                      <CheckCircle2 size={20} className="check-icon" />
                      <span>Understand fundamental financial concepts</span>
                    </div>
                    <div className="objective-item">
                      <CheckCircle2 size={20} className="check-icon" />
                      <span>Learn investment strategies and risk management</span>
                    </div>
                    <div className="objective-item">
                      <CheckCircle2 size={20} className="check-icon" />
                      <span>Master budgeting and financial planning</span>
                    </div>
                    <div className="objective-item">
                      <CheckCircle2 size={20} className="check-icon" />
                      <span>Develop skills in portfolio management</span>
                    </div>
                    <div className="objective-item">
                      <CheckCircle2 size={20} className="check-icon" />
                      <span>Apply knowledge through practical exercises</span>
                    </div>
                  </div>
                </div>
                
                <div className="content-section">
                  <h3>Course Description</h3>
                  <p className="course-description">
                    {course.longDescription || course.description ||
                      "This comprehensive financial literacy course is designed to provide you with essential knowledge and practical skills needed to make informed financial decisions. Whether you're just starting your financial journey or looking to enhance your existing knowledge, this course covers everything from basic budgeting to advanced investment strategies."
                    }
                  </p>
                </div>
                
                <div className="content-section">
                  <h3>Prerequisites</h3>
                  <p>
                    {course.prerequisites || "No prior knowledge required. This course is designed for beginners but also valuable for those looking to refresh their financial knowledge."}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "curriculum" && (
              <div className="curriculum-content">
                <div className="curriculum-header">
                  <h3>Course Curriculum</h3>
                  <p className="curriculum-subtitle">Structured learning path to master financial literacy</p>
                </div>
                <div className="curriculum-modules">
                  <div className="module">
                    <div className="module-header">
                      <h4>Module 1: Financial Foundations</h4>
                      <span className="module-duration">45 min</span>
                    </div>
                    <div className="lessons">
                      <div className="lesson">
                        <Play size={16} className="lesson-icon" />
                        <span className="lesson-title">Introduction to Financial Literacy</span>
                        <span className="lesson-duration">15 min</span>
                      </div>
                      <div className="lesson">
                        <Play size={16} className="lesson-icon" />
                        <span className="lesson-title">Setting Financial Goals</span>
                        <span className="lesson-duration">20 min</span>
                      </div>
                      <div className="lesson">
                        <FileText size={16} className="lesson-icon" />
                        <span className="lesson-title">Quiz: Financial Basics</span>
                        <span className="lesson-duration">10 min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="module">
                    <div className="module-header">
                      <h4>Module 2: Budgeting and Saving</h4>
                      <span className="module-duration">43 min</span>
                    </div>
                    <div className="lessons">
                      <div className="lesson">
                        <Play size={16} className="lesson-icon" />
                        <span className="lesson-title">Creating a Budget</span>
                        <span className="lesson-duration">25 min</span>
                      </div>
                      <div className="lesson">
                        <Play size={16} className="lesson-icon" />
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
                    <h3>{course.instructor || "Finance Expert"}</h3>
                    <p className="instructor-title">Financial Education Specialist</p>
                    <div className="instructor-stats">
                      <div className="stat-item">
                        <Star size={18} className="stat-icon" />
                        <div>
                          <strong>4.8</strong>
                          <span>Instructor Rating</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <Award size={18} className="stat-icon" />
                        <div>
                          <strong>1,234</strong>
                          <span>Reviews</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <Users size={18} className="stat-icon" />
                        <div>
                          <strong>15,000</strong>
                          <span>Students</span>
                        </div>
                      </div>
                      <div className="stat-item">
                        <BookOpen size={18} className="stat-icon" />
                        <div>
                          <strong>12</strong>
                          <span>Courses</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="instructor-bio">
                  <h4>About the Instructor</h4>
                  <p>
                    {course.instructorBio || 
                      "An experienced financial educator with over 15 years in the industry, dedicated to helping students achieve financial literacy and independence."
                    }
                  </p>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="reviews-content">
                <div className="reviews-summary">
                  <div className="rating-overview">
                    <div className="avg-rating">
                      <span className="rating-number">{course.ratingValue || course.rating || "4.5"}</span>
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={20} fill="currentColor" />
                        ))}
                      </div>
                      <span className="review-count">Based on {course.ratingsCount || course.reviews || 120} reviews</span>
                    </div>
                  </div>
                </div>
                
                <div className="reviews-list">
                  <div className="review">
                    <div className="review-header">
                      <div className="reviewer-info">
                        <strong>Sarah J.</strong>
                        <span className="review-date">2 weeks ago</span>
                      </div>
                      <div className="review-rating">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p>Excellent course! Really helped me understand the basics of investing and budgeting.</p>
                  </div>
                  
                  <div className="review">
                    <div className="review-header">
                      <div className="reviewer-info">
                        <strong>Mike T.</strong>
                        <span className="review-date">1 month ago</span>
                      </div>
                      <div className="review-rating">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={16} fill="currentColor" />
                        ))}
                      </div>
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