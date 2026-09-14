import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FinancialDashboard.css";
import Navbar from "../../components/Navbar/Navbar";

function FinancialDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showGoals, setShowGoals] = useState(false);
    const [showActivity, setShowActivity] = useState(false);

// personalisede learning from the onboarding quiz
    const [onboardingData, setOnboardingData] = useState(null);
    const [learningPath, setLearningPath] = useState([]);

    useEffect(() => {
        // Get the answers saved after the onboarding quiz
        const savedOnboarding = localStorage.getItem(
            "cognitionBerriesOnboarding"
        );

        if (savedOnboarding) {
            try {
                setOnboardingData(JSON.parse(savedOnboarding));
            } catch (error) {
                console.error(
                    "Could not load onboarding information:",
                    error
                );
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
                console.error("Could not load personalized learning path:",error)
            }
        }
    }, []);

// helper functions
    const getValue = (...possibleValues) => {
        for (const value of possibleValues) {
            if (value !== undefined &&value !== null &&value !== "") {
                return value
            }
        }
        return null
    }

    const formatValue = (value) => {
        if (Array.isArray(value)) {
            return value.join(", ");
        }

        if (typeof value === "object" && value !== null) {
            return Object.values(value).join(", ");
        }

        return value;
    };

    // Try to find the knowledge answer regardless of the exact
    // property name used in the onboarding component.
    const knowledgeLevel =
        getValue(
            onboardingData?.knowledgeLevel,
            onboardingData?.financialKnowledge,
            onboardingData?.knowledge,
            onboardingData?.financialKnowledgeLevel
        ) || "Intermediate";

    const learningGoals =
        getValue(
            onboardingData?.goals,
            onboardingData?.learningGoals,
            onboardingData?.financialGoals
        ) || [];

    const interests =
        getValue(
            onboardingData?.interests,
            onboardingData?.financialInterests
        ) || [];

    const biggestLearningGoal =
        getValue(
            onboardingData?.biggestLearningGoal,
            onboardingData?.mainLearningGoal,
            onboardingData?.primaryGoal
        );

// knowledge level display
    const getKnowledgeBars = (level) => {
        const levelText = String(level).toLowerCase();

        if (
            levelText.includes("beginner") ||
            levelText.includes("basic")
        ) {
            return 3;
        }

        if (
            levelText.includes("advanced") ||
            levelText.includes("expert")
        ) {
            return 8;
        }

        return 5;
    };

    const activeKnowledgeBars = getKnowledgeBars(knowledgeLevel);

// suggested learning path
    const recommendedCourse =
        learningPath.length > 0
            ? learningPath[0]
            : "Introduction to Investing";

    const handleStartCourse = () => {
        /*
         * The onboarding learning path currently contains lesson names,
         * rather than course IDs.
         *
         * For now, take the learner to the Courses page.
         * Once the learning-path items are connected to real course IDs,
         * this can navigate directly to the selected course.
         */
        navigate("/courses");
    };

// used to display goals
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
                        <h1>
                            Welcome back, Thabo!
                        </h1>

                        <p>
                            Keep up the great work!
                        </p>
                    </div>

                    <button
                        className="edit-button"
                        onClick={() => setShowGoals(!showGoals)}
                    >
                        Edit Goals
                    </button>

                </div>

{/* goals message */}
                {showGoals && (
                    <div className="goals-message">

                        <strong>Your Learning Goals</strong>

                        {displayGoals.length > 0 &&
                        displayGoals[0] ? (
                            <p>
                                {displayGoals
                                    .filter(Boolean)
                                    .join(", ")}
                            </p>
                        ) : (
                            <p>
                                Keep learning and reach your next
                                milestone!
                            </p>
                        )}

                        {biggestLearningGoal && (
                            <p>
                                <strong>Main goal:</strong>{" "}
                                {formatValue(biggestLearningGoal)}
                            </p>
                        )}

                        <button
                            onClick={() => setShowGoals(false)}
                        >
                            Close
                        </button>

                    </div>
                )}

{/* stats for the dashboard */}
                <div className="stats-grid">

                    {/* Courses Completed */}
                    <div className="stat-card">

                        <p>Courses Completed</p>

                        <div className="stat-bottom">

                            <div>
                                <h2>12</h2>
                                <span>/24</span>
                            </div>

                            <div className="stat-icon blue">
                                📚
                            </div>

                        </div>

                    </div>


                    {/* Current Course */}
                    <div className="stat-card">

                        <p>Current Course</p>

                        <h3>
                            Saving
                        </h3>

                        <div className="stat-icon purple">
                            📖
                        </div>

                    </div>


                    {/* Course Progress */}
                    <div className="stat-card">

                        <p>Course Progress</p>

                        <h2>65%</h2>

                        <div className="progress-bar">
                            <div
                                className="progress"
                                style={{
                                    width: "65%"
                                }}
                            ></div>
                        </div>

                    </div>


                    {/* Learning Streak */}
                    <div className="stat-card">

                        <p>Learning Streak</p>

                        <div className="stat-bottom">

                            <div>
                                <h2>14</h2>
                                <span>days</span>
                            </div>

                            <div className="stat-icon orange">
                                🔥
                            </div>

                        </div>

                    </div>


                    {/* Quiz Score */}
                    <div className="stat-card">

                        <p>Quiz Score (Avg)</p>

                        <div className="stat-bottom">

                            <h2>82%</h2>

                            <div className="stat-icon teal">
                                ✓
                            </div>

                        </div>

                    </div>

{/* knowledge level */}
                    <div className="stat-card">

                        <p>
                            Knowledge Level
                        </p>

                        <h3>
                            {formatValue(knowledgeLevel)}
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

{/* learning goals */}
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


{/* personailized learning path */}
                {learningPath.length > 0 && (

                    <div
                        className="personalized-learning-card"
                        style={{
                            border: "1px solid #e3e0e8",
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
                                        margin: "0 0 6px",
                                        fontSize: "15px",
                                        color: "#222"
                                    }}
                                >
                                    Your Personalized Learning Path
                                </h3>

                                <p
                                    style={{
                                        margin: 0,
                                        color: "#777",
                                        fontSize: "12px",
                                        lineHeight: "1.5"
                                    }}
                                >
                                    Recommended for you based on
                                    your onboarding quiz answers.
                                </p>

                            </div>

                            <span
                                style={{
                                    background: "#eee4ff",
                                    color: "#7045c5",
                                    padding: "6px 10px",
                                    borderRadius: "20px",
                                    fontSize: "10px",
                                    fontWeight: "600"
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
                                            display: "flex",
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

                                        {/* Number */}

                                        <div
                                            style={{
                                                width: "32px",
                                                height: "32px",
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


                                        {/* Lesson */}

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
                                                {lesson}
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


                                        {/* Status */}

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
                            border: "1px solid #e3e0e8",
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

                            {/* Knowledge */}

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


                            {/* Goals */}

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


                            {/* Interests */}

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

                        <h3>
                            Recommended Next Course
                        </h3>

                        <div className="recommended-content">

                            <div className="course-image">
                                📈
                            </div>

                            <div className="course-info">

                                <h2>
                                    {recommendedCourse}
                                </h2>

                                <p>
                                    This course has been selected
                                    based on your personalized
                                    learning path.
                                </p>

                                <small>
                                    Estimated time: 30 min
                                </small>

                                <button
                                    className="course-button"
                                    onClick={
                                        handleStartCourse
                                    }
                                >
                                    Start Course →
                                </button>

                            </div>

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
                                                Introduction to Investing
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
