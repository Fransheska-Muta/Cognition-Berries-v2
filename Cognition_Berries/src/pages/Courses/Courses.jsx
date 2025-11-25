import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, publicApiRequest } from "../../config/api";
import { useAuth } from "../../Context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import "./Course.css";

function Courses() {
  const { currentUser, loading: authLoading } = useAuth ? useAuth() : { currentUser: null, loading: false };
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Category");
  const [viewMode, setViewMode] = useState("grid");
  const [enrollingIds, setEnrollingIds] = useState([]);

  const categories = [
    "All Category",
    "Corporate Finance",
    "Personal Finance",
    "Investment Analysis",
    "Financial Modeling",
    "Accounting",
    "Trading & Markets"
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        console.log("📚 Fetching courses...");
        let response;

        if (currentUser) {
          response = await apiRequest("/courses", { method: "GET" });
        } else {
          response = await publicApiRequest("/courses", { method: "GET" });
        }

        const data = await response.json();
        console.log("✅ Raw courses data received:", data.length, "courses");

        // DIAGNOSTIC: Log detailed image info for each course
        console.group("🔍 Course Image Diagnostic");
        data.forEach((course, index) => {
          console.log(`Course ${index + 1}: ${course.title}`);
          console.log("  - image field:", course.image);
          console.log("  - displayImage field:", course.displayImage);
          console.log("  - imageData present:", !!course.imageData);
          console.log("  - imageData.data present:", !!(course.imageData && course.imageData.data));
          if (course.imageData && course.imageData.data) {
            console.log("  - imageData.data length:", course.imageData.data.length);
            console.log("  - imageData.data preview:", course.imageData.data.substring(0, 50) + "...");
          }
          console.log("---");
        });
        console.groupEnd();

        // Process courses with enhanced fallback logic
        const processedCourses = Array.isArray(data) ? data.map((course, index) => {
          let finalDisplayImage = null;

          // Priority 1: Use displayImage from server aggregation
          if (course.displayImage && course.displayImage.startsWith('data:image/')) {
            finalDisplayImage = course.displayImage;
            console.log(`✅ Course ${index + 1} (${course.title}): Using server displayImage`);
          }
          // Priority 2: Use imageData.data from aggregation
          else if (course.imageData && course.imageData.data) {
            if (course.imageData.data.startsWith('data:image/')) {
              finalDisplayImage = course.imageData.data;
              console.log(`✅ Course ${index + 1} (${course.title}): Using imageData.data`);
            } else {
              console.warn(`⚠️ Course ${index + 1} (${course.title}): imageData.data exists but doesn't start with 'data:image/'`);
            }
          }
          // Priority 3: Check if image field is a complete data URL
          else if (course.image && course.image.startsWith('data:image/')) {
            finalDisplayImage = course.image;
            console.log(`✅ Course ${index + 1} (${course.title}): Using direct image field as data URL`);
          }
          // Priority 4: Construct API endpoint if image is ObjectId
          else if (course.image && course.image.match(/^[0-9a-fA-F]{24}$/)) {
            finalDisplayImage = `/api/images/${course.image}`;
            console.log(`ℹ️ Course ${index + 1} (${course.title}): Using API endpoint (${finalDisplayImage})`);
          }
          // Priority 5: Use external URL if provided
          else if (course.image && (course.image.startsWith('http://') || course.image.startsWith('https://'))) {
            finalDisplayImage = course.image;
            console.log(`✅ Course ${index + 1} (${course.title}): Using external URL`);
          }
          else {
            console.warn(`❌ Course ${index + 1} (${course.title}): No valid image found`);
          }

          return {
            ...course,
            displayImage: finalDisplayImage
          };
        }) : [];

        console.log("📊 Processing complete. Courses with images:", 
          processedCourses.filter(c => c.displayImage).length, 
          "of", 
          processedCourses.length
        );

        setCourses(processedCourses);
        setError("");
      } catch (err) {
        console.error("❌ Error fetching courses:", err);
        setError("Failed to fetch courses: " + (err.message || "unknown"));
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [currentUser]);

  const handleEnroll = async (course) => {
    if (!currentUser) {
      window.location.href = '/signup';
      return;
    }

    if (enrollingIds.includes(course._id)) return;
    
    setEnrollingIds((s) => [...s, course._id]);
    try {
      const res = await apiRequest(`/enroll/${course._id}`, { method: 'POST' });
      const json = await res.json();
      console.log('Enroll response', json);
      alert(json.message || 'Enrolled successfully');
    } catch (err) {
      console.error('Enroll error', err);
      alert('Failed to enroll: ' + (err.message || 'unknown'));
    } finally {
      setEnrollingIds((s) => s.filter((id) => id !== course._id));
    }
  };

  const filteredCourses = courses.filter((course) => {
    if (selectedCategory === "All Category") return true;
    return course.category === selectedCategory;
  });

  // Helper function to get image source
  const getImageSrc = (course) => {
    const placeholderImage = "https://via.placeholder.com/400x250/667eea/ffffff?text=Finance+Course";
    
    if (!course.displayImage) {
      return placeholderImage;
    }

    // If it's a complete data URL (base64), return as-is
    if (course.displayImage.startsWith('data:image/')) {
      return course.displayImage;
    }

    // If it's a full external URL, return as-is
    if (course.displayImage.startsWith('http://') || course.displayImage.startsWith('https://')) {
      return course.displayImage;
    }

    // If it's an API path, construct the full URL
    if (course.displayImage.startsWith('/api/images/')) {
      // Note: This won't work directly in <img> tag since the API returns JSON
      // We need the base64 data to be in the displayImage field already
      console.warn(`⚠️ Course ${course.title}: API path detected, but base64 data not loaded. Using placeholder.`);
      return placeholderImage;
    }

    // Fallback
    return placeholderImage;
  };

  // Image error handler
  const handleImageError = (e, courseName) => {
    console.error(`❌ Failed to load image for ${courseName}`);
    e.target.src = "https://via.placeholder.com/400x250/667eea/ffffff?text=Finance+Course";
  };

  if (authLoading) {
    return <div className="loading-state">Loading authentication...</div>;
  }

  return (
    <>
      <Navbar />

      <div className="courses-header">
        {currentUser?.role === "admin" && (
          <button className="new-course-btn">
            <span>+</span>
            New Course
          </button>
        )}
      </div>

      <div className="category-tabs">
        <div className="category-tabs-inner">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="courses-main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>Loading courses...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="courses-grid">
              {filteredCourses.map((course) => (
                <Link to={`/course/${course._id}`} key={course._id} style={{ textDecoration: 'none' }}>
                  <div className="course-card">
                    <div style={{ position: 'relative' }}>
                      <img
                        src={getImageSrc(course)}
                        alt={course.title}
                        className="course-card-image"
                        onError={(e) => handleImageError(e, course.title)}
                        loading="lazy"
                      />
                      {course.badge && (
                        <div className="course-card-badge">{course.badge}</div>
                      )}
                    </div>
                    <div className="course-card-content">
                      <div className="course-card-header">
                        <h3 className="course-card-title">{course.title}</h3>
                        <p className="course-card-description">
                          {course.description || "Enhance your financial knowledge with this comprehensive course."}
                        </p>
                      </div>
                      <div className="course-card-footer">
                        <div className="course-card-meta">
                          <div className="course-card-date">
                            {course.createdAt ? new Date(course.createdAt).toLocaleDateString('en-GB', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric' 
                            }) : 'Date N/A'}
                          </div>
                          <div className="course-card-price">
                            R{course.price || '0'}
                          </div>
                        </div>
                        <div className={`course-card-status ${course.published ? 'published' : 'unpublished'}`}>
                          {course.published ? 'Published' : 'Unpublished'}
                        </div>
                      </div>
                      <div className="course-card-actions">
                        {(() => {
                          const canEnroll = course.enrollable || course.isFree || 
                                           course.price === 0 || course.price === '0' || course.price == null;
                          if (canEnroll) {
                            if (enrollingIds.includes(course._id)) {
                              return <button className="enroll-btn" disabled>Enrolling...</button>;
                            }
                            if (!currentUser) {
                              return <Link to="/signup" className="enroll-btn">Sign up to Enroll</Link>;
                            }
                            return (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleEnroll(course);
                                }} 
                                className="enroll-btn"
                              >
                                Enroll
                              </button>
                            );
                          }
                          return <Link to={`/course/${course._id}`} className="view-btn">View Details</Link>;
                        })()}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="courses-list">
              {filteredCourses.map((course) => (
                <Link to={`/course/${course._id}`} key={course._id} style={{ textDecoration: 'none' }}>
                  <div className="course-list-item">
                    <img
                      src={getImageSrc(course)}
                      alt={course.title}
                      className="course-list-image"
                      onError={(e) => handleImageError(e, course.title)}
                      loading="lazy"
                    />
                    <div className="course-list-content">
                      <h3 className="course-list-title">{course.title}</h3>
                      <p className="course-list-description">
                        {course.description || "Enhance your financial knowledge with this comprehensive course."}
                      </p>
                    </div>
                    <div className="course-list-meta">
                      <div className="course-card-date">
                        {course.createdAt ? new Date(course.createdAt).toLocaleDateString('en-GB', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        }) : 'Date N/A'}
                      </div>
                      <div className="course-card-price">R{course.price || '0'}</div>
                      <div className={`course-card-status ${course.published ? 'published' : 'unpublished'}`}>
                        {course.published ? 'Published' : 'Unpublished'}
                      </div>
                    </div>
                    <div className="course-list-actions">
                      {(() => {
                        const canEnroll = course.enrollable || course.isFree || 
                                         course.price === 0 || course.price === '0' || course.price == null;
                        if (canEnroll) {
                          if (enrollingIds.includes(course._id)) {
                            return <button className="enroll-btn" disabled>Enrolling...</button>;
                          }
                          if (!currentUser) {
                            return <Link to="/signup" className="enroll-btn">Sign up to Enroll</Link>;
                          }
                          return (
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                handleEnroll(course);
                              }} 
                              className="enroll-btn"
                            >
                              Enroll
                            </button>
                          );
                        }
                        return <Link to={`/course/${course._id}`} className="view-btn">View Details</Link>;
                      })()}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          <div className="empty-state">
            <h3>No courses found</h3>
            <p>Try selecting a different category or create a new course to get started.</p>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export default Courses;