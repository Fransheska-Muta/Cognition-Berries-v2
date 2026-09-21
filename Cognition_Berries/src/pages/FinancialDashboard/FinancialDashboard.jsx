import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../config/api";
import "./FinancialDashboard.css";
import Navbar from "../../components/Navbar/Navbar";
import { useAuth } from "../../Context/AuthContext";

function FinancialDashboard() {
    const navigate = useNavigate();

    const [showGoals, setShowGoals] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    // Personalised learning from onboarding quiz
    const [onboardingData, setOnboardingData] = useState(null);
    const [learningPath, setLearningPath] = useState([]);
    // Courses and progress
    const [courses, setCourses] = useState([]);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [allProgress, setAllProgress] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [courseError, setCourseError] = useState("");
    // Dashboard stats
    const [stats, setStats] = useState({
        totalCourses: 0,
        completedCourses: 0,
        totalStudyTime: 0,
        averageScore: 0
    });

const { currentUser } = useAuth();

const [user, setUser] = useState(null);

useEffect(() => {
  try {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  } catch (error) {
    console.error("Could not load user:", error);
  }
}, []);

const userName =
  currentUser?.displayName ||
  user?.name ||
  currentUser?.email?.split("@")[0] ||
  user?.email?.split("@")[0] ||
  "Student";

  
  
    const [studyStreak, setStudyStreak] = useState(0);
    useEffect(() => {
        // Get the answers saved after the onboarding quiz
        const savedOnboarding = localStorage.getItem( "cognitionBerriesOnboarding")
        if (savedOnboarding) {
            try {
                setOnboardingData(JSON.parse(savedOnboarding));
            } catch (error) {
                console.error( "Could not load onboarding information:", error)
            }
        }
        // Get the personalized learning path created by the quiz
        const savedLearningPath = localStorage.getItem("cognitionBerriesLearningPath")
        if (savedLearningPath) {
            try {
                const parsedPath = JSON.parse(savedLearningPath);

                if (Array.isArray(parsedPath)) {
                    setLearningPath(parsedPath);
                }
            } catch (error) {
                console.error( "Could not load personalized learning path:", error)
            }
        }
    }, []);

    useEffect(() => {
        async function fetchDashboardData() {
            setLoadingCourses(true);
            setCourseError("");

            try {
                const coursesResponse = await apiRequest("/courses", {
                    method: "GET"
                })
                const coursesData = await coursesResponse.json()
                if (!coursesResponse.ok) {
                    throw new Error( coursesData?.message ||"Failed to fetch courses")
                }
                // console.log("📚 Courses:", coursesData);
                const fetchedCourses = Array.isArray(coursesData) ? coursesData : coursesData.courses || []
                setCourses(fetchedCourses);
                const dashResponse = await apiRequest("/dashboard/user",{
                        method: "GET"
                    }
                )
                const dashData = await dashResponse.json();
                if (!dashResponse.ok) {
                    throw new Error(dashData?.message ||"Failed to fetch dashboard data")
                }
                console.log("📊 Dashboard data:", dashData);
                setEnrolledCourses(dashData.enrolledCourses || [])
                setAllProgress(dashData.allProgress || [])
                setStudyStreak(dashData.studyStreak || 0)

                const progressStats = dashData.progress || {};
                setStats({
                    totalCourses:progressStats.totalCourses || 0,
                    completedCourses:progressStats.completedCourses || 0,
                    totalStudyTime:progressStats.totalStudyTime || 0,
                    averageScore:progressStats.averageScore || 0
                })

            } catch (error) {
                console.error("Dashboard/course fetch error:",error)
                setCourseError(error.message)
            } finally {
                setLoadingCourses(false)
            }
        }
        fetchDashboardData();
    }, []);
    const getValue = (...possibleValues) => {
        for (const value of possibleValues) {
            if ( value !== undefined && value !== null && value !== "") {
                return value
            }
        }
        return null
    }
    const formatValue = (value) => {
        if (Array.isArray(value)) {
            return value.join(", ");
        }

        if ( typeof value === "object" && value !== null ) {
            return Object.values(value).join(", ")
        }
        return value
    };
    const knowledgeLevel = getValue(onboardingData?.knowledgeLevel,onboardingData?.financialKnowledge,onboardingData?.knowledge,onboardingData?.financialKnowledgeLevel) || "Intermediate";
    const learningGoals = getValue(onboardingData?.goals,onboardingData?.learningGoals,onboardingData?.financialGoals) || [];
    const interests = getValue(onboardingData?.interests,onboardingData?.financialInterests) || [];
    const biggestLearningGoal = getValue(onboardingData?.biggestLearningGoal,onboardingData?.mainLearningGoal,onboardingData?.primaryGoal);
    const getKnowledgeBars = (level) => {
    const levelText = String(level).toLowerCase()
        if (levelText.includes("beginner") ||levelText.includes("basic")) {
            return 3
        }
        if (levelText.includes("advanced") ||levelText.includes("expert")) {
            return 8
        }
        return 5
    }
    const activeKnowledgeBars = getKnowledgeBars(knowledgeLevel);
    const getCourseId = (course) => {
        return ( course?.courseId || course?.course_id || course?._id || course?.id
        )
    }

    const getCourseTitle = (course) => {
        return ( course?.courseName || course?.title || course?.name ||"Untitled Course"
        )
    }

    // const getCourseInstructor = (course) => {
    //     return (
    //         course?.instructor ||
    //         course?.author ||
    //         course?.createdBy ||
    //         "Cognition Berries"
    //     );
    // };

    // const getCourseDescription = (course) => {
    //     return (
    //         course?.description ||
    //         course?.courseDescription ||
    //         ""
    //     );
    // };

    // const getCourseImage = (course) => {
    //     return (
    //         course?.image ||
    //         course?.imageUrl ||
    //         course?.thumbnail ||
    //         course?.thumbnailUrl
    //     );
    // };
    const getCourseProgress = (courseId) => {
        if (!courseId) {
            return 0;
        }

        const progress = allProgress.find(
            (item) =>
                String(
                    item.courseId ||
                    item.course_id ||
                    item._id
                ) === String(courseId)
        );

        return progress?.percentComplete || 0;
    };

const handleContinueCourse = async (course) => {
    try {
        const courseId =
            course?.course_id ||
            course?.id ||
            course?._id;

        if (!courseId) {
            console.error("❌ No course ID found:", course);
            return;
        }

        console.log("📚 Starting course:", courseId);

        // Check enrollment
        const enrollmentResponse = await apiRequest(
            `/enroll/${courseId}`,
            {
                method: "GET"
            }
        );

        const enrollmentData = await enrollmentResponse.json();

        console.log("👤 Enrollment:", enrollmentData);

        // Enroll if necessary
        if (!enrollmentData.isEnrolled) {
            const enrollResponse = await apiRequest(
                `/enroll/${courseId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );

            const enrollData = await enrollResponse.json();

            if (!enrollResponse.ok) {
                throw new Error(
                    enrollData?.error ||
                    enrollData?.message ||
                    "Could not enroll in course"
                );
            }

            console.log("✅ Automatically enrolled:", enrollData);
        }

        // Go to the learning page
        navigate(
            `/course/${encodeURIComponent(
                String(courseId)
            )}/learn`
        );

    } catch (error) {
        console.error(
            "❌ Failed to start course:",
            error
        );
    }
};

    const getPersonalizedCourses = () => {
        if (
            !Array.isArray(courses) ||
            courses.length === 0
        ) {
            return [];
        }

        if (
            !Array.isArray(learningPath) ||
            learningPath.length === 0
        ) {
            return [];
        }

        const matchedCourses = [];

        learningPath.forEach((lesson) => {
            if (!lesson) {
                return;
            }

            const lessonName = String(
                typeof lesson === "object"
                    ? lesson.title ||
                          lesson.courseName ||
                          lesson.name ||
                          ""
                    : lesson
            )
                .toLowerCase()
                .trim();

            if (!lessonName) {
                return;
            }
            let matchedCourse = courses.find(
                (course) =>
                    getCourseTitle(course)
                        .toLowerCase()
                        .trim() === lessonName
            );

            if (!matchedCourse) {
                matchedCourse = courses.find((course) => {
                    const courseTitle =
                        getCourseTitle(course)
                            .toLowerCase()
                            .trim();

                    return (
                        courseTitle.includes(lessonName) ||
                        lessonName.includes(courseTitle)
                    );
                });
            }

            /*
             * Avoid adding the same course twice.
             */
            if (
                matchedCourse &&
                !matchedCourses.some(
                    (course) =>
                        String(
                            getCourseId(course)
                        ) ===
                        String(
                            getCourseId(matchedCourse)
                        )
                )
            ) {
                matchedCourses.push(matchedCourse);
            }
        });

        return matchedCourses;
    };

    const personalizedCourses =
        getPersonalizedCourses();

    const recommendedCourses =
        personalizedCourses.length > 0
            ? personalizedCourses
            : courses.slice(0, 3);

    const displayGoals = Array.isArray(learningGoals)
        ? learningGoals
        : [learningGoals];

    const displayInterests = Array.isArray(interests)
        ? interests
        : [interests];

    return (
        <div className="dashboard">

            <Navbar />

            <div className="dashboard-card">
                <div className="welcome-section">

                    <div>

                        <h1> Welcome back,{" "} {userName}! </h1>

                        <p>
                            Keep up the great work!
                        </p>

                    </div>

                    <button
                        className="edit-button"
                        onClick={() =>
                            setShowGoals(!showGoals)
                        }
                    >
                        Edit Goals
                    </button>

                </div>
                {showGoals && (
                    <div className="goals-message">

                        <strong>
                            Your Learning Goals
                        </strong>

                        {displayGoals.length > 0 &&
                        displayGoals[0] ? (
                            <p>
                                {displayGoals
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        ) : (
                            <p>
                                Keep learning and reach
                                your next milestone!
                            </p>
                        )}

                        {biggestLearningGoal && (
                            <p>
                                <strong>
                                    Main goal:
                                </strong>{" "}
                                {formatValue(
                                    biggestLearningGoal
                                )}
                            </p>
                        )}

                        <button
                            onClick={() =>
                                setShowGoals(false)
                            }
                        >
                            Close
                        </button>

                    </div>
                )}
                <div className="stats-grid">

                    {/* Courses Completed */}

                    <div className="stat-card">

                        <p>
                            Courses Completed
                        </p>

                        <div className="stat-bottom">

                            <div>

                                <h2>
                                    {stats.completedCourses}
                                </h2>

                                <span>
                                    /{stats.totalCourses}
                                </span>

                            </div>

                            <div className="stat-icon blue">
                                📚
                            </div>

                        </div>

                    </div>


                    {/* Current Course */}

                    <div className="stat-card">

                        <p>
                            Current Course
                        </p>

                        <h3>
                            {enrolledCourses.length > 0
                                ? getCourseTitle(
                                      enrolledCourses[0]
                                  )
                                : personalizedCourses.length >
                                  0
                                ? getCourseTitle(
                                      personalizedCourses[0]
                                  )
                                : "No course yet"}
                        </h3>

                        <div className="stat-icon purple">
                            📖
                        </div>

                    </div>


                    {/* Course Progress */}

                    <div className="stat-card">

                        <p>
                            Course Progress
                        </p>

                        <h2>
                            {enrolledCourses.length > 0
                                ? Math.round(
                                      getCourseProgress(
                                          getCourseId(
                                              enrolledCourses[0]
                                          )
                                      )
                                  )
                                : 0}
                            %
                        </h2>

                        <div className="progress-bar">

                            <div
                                className="progress"
                                style={{
                                    width: `${
                                        enrolledCourses.length >
                                        0
                                            ? getCourseProgress(
                                                  getCourseId(
                                                      enrolledCourses[0]
                                                  )
                                              )
                                            : 0
                                    }%`
                                }}
                            ></div>

                        </div>

                    </div>


                    {/* Learning Streak */}

                    <div className="stat-card">

                        <p>
                            Learning Streak
                        </p>

                        <div className="stat-bottom">

                            <div>

                                <h2>
                                    {studyStreak}
                                </h2>

                                <span>
                                    days
                                </span>

                            </div>

                            <div className="stat-icon orange">
                                🔥
                            </div>

                        </div>

                    </div>


                    {/* Quiz Score */}

                    <div className="stat-card">

                        <p>
                            Quiz Score (Avg)
                        </p>

                        <div className="stat-bottom">

                            <h2>
                                {stats.averageScore}%
                            </h2>

                            <div className="stat-icon teal">
                                ✓
                            </div>

                        </div>

                    </div>


                    {/* Knowledge Level */}

                    <div className="stat-card">

                        <p>
                            Knowledge Level
                        </p>

                        <h3>
                            {formatValue(
                                knowledgeLevel
                            )}
                        </h3>

                        <div className="level-bars">

                            {Array.from({
                                length: 8
                            }).map((_, index) => (

                                <span
                                    key={index}
                                    className={
                                        index <
                                        activeKnowledgeBars
                                            ? "active"
                                            : ""
                                    }
                                ></span>

                            ))}

                        </div>

                    </div>


                    {/* Learning Goals */}

                    <div className="stat-card">

                        <p>
                            Learning Goals
                        </p>

                        <div className="stat-bottom">

                            <div>

                                <h2>

                                    {Array.isArray(
                                        learningGoals
                                    )
                                        ? learningGoals.length
                                        : 0}

                                    <span>
                                        {" "}
                                        selected
                                    </span>

                                </h2>

                                <small>
                                    from onboarding quiz
                                </small>

                            </div>

                            <div className="stat-icon red">
                                🎯
                            </div>

                        </div>

                    </div>


                    {/* XP Points */}

                    <div className="stat-card">

                        <p>
                            XP Points
                        </p>

                        <div className="stat-bottom">

                            <h2>
                                1,450
                            </h2>

                            <div className="stat-icon yellow">
                                ⭐
                            </div>

                        </div>

                    </div>

                </div>

                {learningPath.length > 0 && (

                    <div
                        className="personalized-learning-card"
                        style={{
                            border:
                                "1px solid #e3e0e8",
                            borderRadius: "10px",
                            padding: "20px",
                            marginBottom: "18px",
                            background: "white",
                            boxShadow:
                                "0 2px 8px rgba(40, 30, 60, 0.03)"
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                                alignItems: "center",
                                marginBottom: "18px"
                            }}
                        >

                            <div>

                                <h3
                                    style={{
                                        margin:
                                            "0 0 6px",
                                        fontSize: "15px",
                                        color: "#222"
                                    }}
                                >
                                    Your Personalized
                                    Learning Path
                                </h3>

                                <p
                                    style={{
                                        margin: 0,
                                        color: "#777",
                                        fontSize: "12px",
                                        lineHeight: "1.5"
                                    }}
                                >
                                    Recommended for you
                                    based on your
                                    onboarding quiz
                                    answers.
                                </p>

                            </div>

                            <span
                                style={{
                                    background:
                                        "#eee4ff",
                                    color:
                                        "#7045c5",
                                    padding:
                                        "6px 10px",
                                    borderRadius:
                                        "20px",
                                    fontSize: "10px",
                                    fontWeight:
                                        "600"
                                }}
                            >
                                Personalized
                            </span>

                        </div>


                        {/* Learning Path Items */}

                        <div>

                            {learningPath.map(
                                (lesson, index) => (

                                    <div
                                        key={index}
                                        style={{
                                            display:
                                                "flex",
                                            alignItems:
                                                "center",
                                            gap: "12px",
                                            padding:
                                                "12px 0",
                                            borderBottom:
                                                index <
                                                learningPath.length -
                                                    1
                                                    ? "1px solid #eeeeee"
                                                    : "none"
                                        }}
                                    >

                                        <div
                                            style={{
                                                width:
                                                    "32px",
                                                height:
                                                    "32px",
                                                minWidth:
                                                    "32px",
                                                borderRadius:
                                                    "50%",
                                                background:
                                                    index ===
                                                    0
                                                        ? "#7045c5"
                                                        : "#eee4ff",
                                                color:
                                                    index ===
                                                    0
                                                        ? "white"
                                                        : "#7045c5",
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "center",
                                                alignItems:
                                                    "center",
                                                fontSize:
                                                    "12px",
                                                fontWeight:
                                                    "bold"
                                            }}
                                        >
                                            {index + 1}
                                        </div>


                                        <div
                                            style={{
                                                flex: 1
                                            }}
                                        >

                                            <h4
                                                style={{
                                                    margin:
                                                        "0 0 4px",
                                                    color:
                                                        "#252039",
                                                    fontSize:
                                                        "13px"
                                                }}
                                            >
                                                {typeof lesson ===
                                                "object"
                                                    ? lesson.title ||
                                                      lesson.courseName ||
                                                      lesson.name
                                                    : lesson}
                                            </h4>

                                            <p
                                                style={{
                                                    margin: 0,
                                                    color:
                                                        "#777",
                                                    fontSize:
                                                        "10px"
                                                }}
                                            >
                                                {index === 0
                                                    ? "Start here to build a strong financial foundation."
                                                    : "Continue building your financial knowledge."}
                                            </p>

                                        </div>


                                        <div
                                            style={{
                                                fontSize:
                                                    "9px",
                                                color:
                                                    index ===
                                                    0
                                                        ? "#7045c5"
                                                        : "#999",
                                                fontWeight:
                                                    index ===
                                                    0
                                                        ? "600"
                                                        : "normal",
                                                whiteSpace:
                                                    "nowrap"
                                            }}
                                        >
                                            {index === 0
                                                ? "Next lesson"
                                                : "Upcoming"}
                                        </div>

                                    </div>

                                )
                            )}

                        </div>

                    </div>

                )}

                {onboardingData && (

                    <div
                        className="onboarding-summary"
                        style={{
                            border:
                                "1px solid #e3e0e8",
                            borderRadius: "10px",
                            padding: "18px",
                            marginBottom: "18px",
                            background: "#faf9fd"
                        }}
                    >

                        <h3
                            style={{
                                margin:
                                    "0 0 15px",
                                fontSize: "13px",
                                color: "#222"
                            }}
                        >
                            Your Learning Profile
                        </h3>


                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(3, 1fr)",
                                gap: "12px"
                            }}
                        >

                            <div>

                                <small
                                    style={{
                                        color:
                                            "#999",
                                        fontSize:
                                            "10px"
                                    }}
                                >
                                    Financial Knowledge
                                </small>

                                <p
                                    style={{
                                        margin:
                                            "5px 0 0",
                                        fontSize:
                                            "12px",
                                        color:
                                            "#252039"
                                    }}
                                >
                                    {formatValue(
                                        knowledgeLevel
                                    )}
                                </p>

                            </div>


                            <div>

                                <small
                                    style={{
                                        color:
                                            "#999",
                                        fontSize:
                                            "10px"
                                    }}
                                >
                                    Your Goals
                                </small>

                                <p
                                    style={{
                                        margin:
                                            "5px 0 0",
                                        fontSize:
                                            "12px",
                                        color:
                                            "#252039"
                                    }}
                                >
                                    {displayGoals
                                        .filter(Boolean)
                                        .join(", ") ||
                                        "Not specified"}
                                </p>

                            </div>


                            <div>

                                <small
                                    style={{
                                        color:
                                            "#999",
                                        fontSize:
                                            "10px"
                                    }}
                                >
                                    Your Interests
                                </small>

                                <p
                                    style={{
                                        margin:
                                            "5px 0 0",
                                        fontSize:
                                            "12px",
                                        color:
                                            "#252039"
                                    }}
                                >
                                    {displayInterests
                                        .filter(Boolean)
                                        .join(", ") ||
                                        "Not specified"}
                                </p>

                            </div>

                        </div>

                    </div>

                )}
                <div className="bottom-section">


          <div className="recommended-card">
  <div className="recommended-header">
    <h3>Recommended Next Course</h3>
  </div>

  <div className="recommended-content">
    {loadingCourses ? (
      <p>Loading recommended courses...</p>
    ) : courseError ? (
      <p>{courseError}</p>
    ) : recommendedCourses.length === 0 ? (
      <p>No recommended courses available yet.</p>
    ) : (
      recommendedCourses.map((course) => {
        const courseId =
          course.courseId ||
          course.course_id ||
          course._id ||
          course.id;

        const courseTitle =
          course.title ||
          course.name ||
          "Untitled Course";

        const progress = getCourseProgress(courseId);

        return (
          <div className="recommended-course" key={courseId || courseTitle}>
            <div className="course-info">
              <h4>{courseTitle}</h4>

              {course.description && (
                <p>{course.description}</p>
              )}

              <div className="course-progress">
                <div className="progress-bar">
                  <div
                    className="progress"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <span>{progress}% complete</span>
              </div>
            </div>

            <button
              className="course-button"
              onClick={() => handleContinueCourse(course)}
            >
              {progress > 0 ? "Continue" : "Start"}
            </button>
          </div>
        );
      })
    )}
  </div>
</div>

                    <div className="activity-card">

                        <div className="activity-header">

                            <h3>
                                Recent Activity
                            </h3>

                            <button
                                onClick={() =>
                                    setShowActivity(
                                        !showActivity
                                    )
                                }
                            >
                                {showActivity
                                    ? "Hide"
                                    : "View All"}
                            </button>

                        </div>


                        <div className="activity-list">

                            <div className="activity-item">

                                <div className="activity-icon green">
                                    ✓
                                </div>

                                <div className="activity-content">

                                    <strong>
                                        Completed lesson
                                    </strong>

                                    <span>
                                        Budgeting Basics
                                    </span>

                                </div>

                                <small>
                                    2 hours ago
                                </small>

                            </div>


                            <div className="activity-item">

                                <div className="activity-icon blue">
                                    ✓
                                </div>

                                <div className="activity-content">

                                    <strong>
                                        Quiz completed
                                    </strong>

                                    <span>
                                        Saving Quiz
                                    </span>

                                </div>

                                <small>
                                    Yesterday
                                </small>

                            </div>


                            <div className="activity-item">

                                <div className="activity-icon yellow">
                                    ⭐
                                </div>

                                <div className="activity-content">

                                    <strong>
                                        Earned achievement
                                    </strong>

                                    <span>
                                        7 Day Streak
                                    </span>

                                </div>

                                <small>
                                    2 days ago
                                </small>

                            </div>


                            {showActivity && (

                                <div className="extra-activity">

                                    <div className="activity-item">

                                        <div className="activity-icon purple">
                                            📖
                                        </div>

                                        <div className="activity-content">

                                            <strong>
                                                Started a course
                                            </strong>

                                            <span>
                                                {personalizedCourses.length >
                                                0
                                                    ? getCourseTitle(
                                                          personalizedCourses[0]
                                                      )
                                                    : "Introduction to Investing"}
                                            </span>

                                        </div>

                                        <small>
                                            3 days ago
                                        </small>

                                    </div>

                                </div>

                            )}

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default FinancialDashboard
