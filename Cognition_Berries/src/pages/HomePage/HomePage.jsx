import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { apiRequest } from '../../config/api';

import './HomePage.css';

const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Use apiRequest for public endpoint
        const res = await apiRequest('/courses', { method: 'GET' });
        const data = await res.json();
        setCourses(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses");
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <div>
      <Navbar />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-left">
          <h1>Master Stock<br />Investing with<br />Confidence</h1>
          <p>
            Learn to invest smartly with beginner-friendly lessons, interactive challenges,
            and insights from real financial experts.
          </p>
          <div className="hero-buttons">
            <Link to='/courses' className="btn-explore">Explore Courses</Link>
            <Link to='/about' className="btn-learn">Learn More</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="image-placeholder"></div> {/* Added image tag */}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="sec2">
        <h1>Why Choose Cognition Berries?</h1>
        <p>
          Our platform is designed to make financial education accessible, engaging, and effective for everyone.
        </p>
        <div className="reasons">
          <div className="reason-blk">
            <p>💡</p> {/* Used an emoji for the icon placeholder */}
            <h3>Expert-Backed Content</h3>
            <p>All our resources are created by financial experts with years of experience in the stock market.</p>
          </div>
          <div className="reason-blk">
            <p>🕹️</p> {/* Used an emoji for the icon placeholder */}
            <h3>Interactive Learning</h3>
            <p>Engage with quizzes, simulations, and gamified experiences that make learning enjoyable.</p>
          </div>
          <div className="reason-blk">
            <p>👨‍🏫</p> {/* Used an emoji for the icon placeholder */}
            <h3>Personalized Coaching</h3>
            <p>Get one-on-one guidance from financial coaches who understand your goals.</p>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="sec3">
        <div className="sec3-1">
          <h1>Featured Courses</h1>
          <Link to="/courses">See All Courses</Link>
        </div>
        <div className="sec3-2">
          {loading ? (
            <div className="courses-loading">Loading courses…</div>
          ) : error ? (
            <div className="courses-error">{error}</div>
          ) : courses.length === 0 ? (
            <div className="courses-empty">No courses available.</div>
          ) : (
            <div className="courses-list">
              {courses.slice(0, 3).map((course) => (
                <div className="course" key={course._id}>
                  <img
                    src={course.image && course.image.trim() !== "" ? course.image : "/Learnin2.jpg"}
                    alt={course.title || "Course"}
                  />
                  {/* New wrapper div for better card padding control */}
                  <div className="course-content"> 
                    <h3>{course.title}</h3>
                    <p>{course.description || "No description available."}</p>
                    <div className="prce-btn">
                      <p>R{course.price}</p>
                      <Link to={`/course/${course._id}`} className="view-course-btn">View Course</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;