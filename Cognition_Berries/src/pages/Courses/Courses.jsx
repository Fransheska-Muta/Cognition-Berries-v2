import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, publicApiRequest } from "../../config/api";
import { useAuth } from "../../Context/AuthContext";
import Navbar from "../../components/Navbar/Navbar";
import TiltedCard from "../../components/TiltedCard/TiltedCard";
import Footer from "../../components/Footer/Footer";
import "./Course.css";

function Courses() {
  const { currentUser, loading: authLoading } = useAuth ? useAuth() : { currentUser: null, loading: false };
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLevel, setSelectedLevel] = useState("All Levels");
  const [error, setError] = useState("");

	useEffect(() => {
	  const fetchCourses = async () => {
	    setLoading(true);
	    try {
	      console.log("📚 Fetching courses...");
	      let response;

	      // If we have an authenticated user, try the authenticated endpoint first.
	      if (currentUser) {
	        try {
	          response = await apiRequest("/courses", { method: "GET" });
	        } catch (err) {
	          console.warn("🔁 Authenticated fetch failed, falling back to public:", err.message || err);
	          // fallback to public endpoint (publicApiRequest will retry with auth if available)
	          response = await publicApiRequest("/courses", { method: "GET" });
	        }
	      } else {
	        // no user — use public endpoint
	        response = await publicApiRequest("/courses", { method: "GET" });
	      }

	      const data = await response.json();
	      console.log("✅ Courses fetched:", Array.isArray(data) ? data.length : 0);
	      setCourses(Array.isArray(data) ? data : []);
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
	}, [currentUser]); // run on mount and when auth state changes


  // Filter logic
  const filteredCourses = courses.filter((course) => {
    if (searchTerm && !course.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedCategory !== "All Categories" && course.category !== selectedCategory) {
      return false;
    }
    if (selectedLevel !== "All Levels" && course.level !== selectedLevel) {
      return false;
    }
    if (selectedPrice === "free") return course.price === 0;
    if (selectedPrice === "paid") return course.price > 0;
    if (selectedPrice === "subscription") return course.priceType === "subscription";
    return true;
  });

  // Sorting logic
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (filters === "popular") {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (filters === "newest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    if (filters === "low-high") {
      return (a.price || 0) - (b.price || 0);
    }
    if (filters === "high-low") {
      return (b.price || 0) - (a.price || 0);
    }
    return 0;
  });

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <>
      <Navbar />
      <div className="part1">
        <h1>Our Courses</h1>
        <p>
          Explore our diverse range of courses designed to enhance your financial
          literacy and investing skills.
        </p>
      </div>
      <div className="part2">
        <h2>
          Explore Our Comprehensive Range of Financial Literacy Courses Tailored
          for You
        </h2>
        <div className="part2-1">
          <div>
            <img src="/Learning.jpg" alt="" className="crs-img" />
            <h3>Choose Your Learning Path: Beginner or Intermediate Courses Available</h3>
            <p>Our courses are designed to empower you with essential financial skills.</p>
            <Link to="/courses-enroll" className="enroll-btn">Enroll</Link>
          </div>
          <div>
            <img src="/Learning.jpg" alt="" className="crs-img" />
            <h3>Engaging Content and Interactive Learning Experience Await You</h3>
            <p>Dive into our engaging modules that make learning fun and effective.</p>
            <Link to="/courses-enroll">Enroll</Link>
          </div>
          <div>
            <img src="/Learning.jpg" alt="" className="crs-img" />
            <h3>Track Your Progress and Achieve Your Financial Goals with Us</h3>
            <p>Stay motivated as you monitor your learning journey and accomplishments.</p>
            <Link to="/courses-enroll">Enroll </Link>
          </div>
        </div>
      </div>

      <section className="course-display">
        <div>
          <div>
            <h1>Courses</h1>
            <p>Explore our engaging financial literacy courses today!</p>
          </div>
          <select
            name="filter"
            id="filter-drp-dwm"
            value={filters}
            onChange={(e) => setFilters(e.target.value)}
          >
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="low-high">Price: Lowest to Highest</option>
            <option value="high-low">Price: Highest to Lowest</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "2rem" }}>
          <aside style={{ minWidth: "300px" }}>
            <input
              type="text"
              placeholder="Search Courses"
              id="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <h2>Filter</h2>
            <hr />
            <select
              name="Categories"
              id="Categories"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              <option value="Fundamentals">Fundamentals</option>
              <option value="Technical Analysis">Technical Analysis</option>
              <option value="Value Investing">Value Investing</option>
              <option value="Portfolio Management">Portfolio Management</option>
            </select>
            <hr />
            <select
              name="Experience-Levels"
              id="Experience-Levels"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="All Levels">All Levels</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            <hr />
            <div className="dropdown-radio">
              <label htmlFor="price-dropdown">Price</label>
              <div className="dropdown">
                <button
                  type="button"
                  className="dropdown-toggle"
                  onClick={() => setShowPriceDropdown((prev) => !prev)}
                >
                  Select Price
                </button>
                {showPriceDropdown && (
                  <div className="dropdown-menu">
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="free"
                        checked={selectedPrice === "free"}
                        onChange={() => setSelectedPrice("free")}
                      />
                      Free
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="paid"
                        checked={selectedPrice === "paid"}
                        onChange={() => setSelectedPrice("paid")}
                      />
                      Paid
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="price"
                        value="subscription"
                        checked={selectedPrice === "subscription"}
                        onChange={() => setSelectedPrice("subscription")}
                      />
                      Subscription
                    </label>
                  </div>
                )}
              </div>
            </div>
          </aside>
          <div style={{ flex: 1 }}>
            {loading ? (
              <p>Loading courses...</p>
            ) : error ? (
              <p>{error}</p>
            ) : sortedCourses.length > 0 ? (
              sortedCourses.map((course, i) => (
                <TiltedCard
                  key={course._id || i}
                  imageSrc={course.image || "https://via.placeholder.com/400x250"}
                  altText={course.title}
                  captionText={course.title}
                  containerHeight="340px"
                  containerWidth="100%"
                  imageHeight="220px"
                  imageWidth="100%"
                  rotateAmplitude={10}
                  scaleOnHover={1.05}
                  showMobileWarning={false}
                  showTooltip={false}
                  displayOverlayContent={true}
                  overlayContent={
                    <div className="course-overlay">
                      <Link to={`/course/${course._id}`} className="course-link">View course</Link>
                      <div className="course-level">{course.level || "Beginner"}</div>
                      <h3>{course.title}</h3>
                      <p>{course.description}</p>
                      <div className="course-meta">
                        <span>⭐ {course.rating || "4.5"} ({course.reviews || 120})</span>
                        <span>📚 {course.lessons || 20} lessons</span>
                        <span>👨‍🎓 {course.students || 1000} students</span>
                      </div>
                      <p className="price">R{course.price}</p>
                    </div>
                  }
                />
              ))
            ) : (
              <p>No courses available.</p>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default Courses;