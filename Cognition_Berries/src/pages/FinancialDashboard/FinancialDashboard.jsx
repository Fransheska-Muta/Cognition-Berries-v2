import { useState } from "react";
import "./FinancialDashboard.css";

function FinancialDashboard() {

    const [showGoals, setShowGoals] = useState(false);
    const [showActivity, setShowActivity] = useState(false);

    return (
        <div className="dashboard">

            <div className="dashboard-card">

                <div className="welcome-section">

                    <div>
                        <h1>Welcome back, Thabo! </h1>
                        <p>Keep up the great work!</p>
                    </div>

                    <button
                        className="edit-button"
                        onClick={() => setShowGoals(!showGoals)}
                    >
                        Edit Goals
                    </button>

                </div>

                {showGoals && (
                    <div className="goals-message">
                        <strong>Goals</strong>
                        <p>Keep learning and reach your next milestone! </p>

                        <button onClick={() => setShowGoals(false)}>
                            Close
                        </button>
                    </div>
                )}

                <div className="stats-grid">

                    <div className="stat-card">

                        <p>Courses Completed</p>

                        <div className="stat-bottom">

                            <div>
                                <h2>12</h2>
                                <span>/24</span>
                            </div>

                            <div className="stat-icon blue">
                                
                            </div>

                        </div>

                    </div>

                    <div className="stat-card">

                        <p>Current Course</p>

                        <h3>Saving</h3>

                        <div className="stat-icon purple">
                        
                        </div>

                    </div>

                    <div className="stat-card">

                        <p>Course Progress</p>

                        <h2>65%</h2>

                        <div className="progress-bar">
                            <div className="progress"></div>
                        </div>

                    </div>

                    <div className="stat-card">

                        <p>Learning Streak</p>

                        <div className="stat-bottom">

                            <div>
                                <h2>14</h2>
                                <span>days</span>
                            </div>

                            <div className="stat-icon orange">
                                
                            </div>

                        </div>

                    </div>
                    <div className="stat-card">

                        <p>Quiz Score (Avg)</p>

                        <div className="stat-bottom">

                            <h2>82%</h2>

                            <div className="stat-icon teal">
                                
                            </div>

                        </div>

                    </div>


                    <div className="stat-card">

                        <p>Knowledge Level</p>

                        <h3>Intermediate</h3>

                        <div className="level-bars">

                            <span className="active"></span>
                            <span className="active"></span>
                            <span className="active"></span>
                            <span className="active"></span>
                            <span className="active"></span>
                            <span></span>
                            <span></span>
                            <span></span>

                        </div>

                    </div>


                    <div className="stat-card">

                        <p>Learning Goals</p>

                        <div className="stat-bottom">

                            <div>
                                <h2>2 <span>/3</span></h2>
                                <small>goals completed</small>
                            </div>

                            <div className="stat-icon red">
                                
                            </div>

                        </div>

                    </div>

                    <div className="stat-card">

                        <p>XP Points</p>

                        <div className="stat-bottom">

                            <h2>1,450</h2>

                            <div className="stat-icon yellow">
                                
                            </div>

                        </div>

                    </div>

                </div>


                <div className="bottom-section">

                    <div className="recommended-card">

                        <h3>Recommended Next Course</h3>

                        <div className="recommended-content">

                            <div className="course-image">
                                
                            </div>

                            <div className="course-info">

                                <h2>Introduction to Investing</h2>

                                <p>
                                    Ready to grow your money?
                                    Start your investing journey.
                                </p>

                                <small>
                                    Estimated time: 30 min
                                </small>

                                <button
                                    className="course-button"
                                    onClick={() =>
                                        alert("Course started! ")
                                    }
                                >
                                    Start Course →
                                </button>

                            </div>

                        </div>

                    </div>



                    <div className="activity-card">

                        <div className="activity-header">

                            <h3>Recent Activity</h3>

                            <button
                                onClick={() =>
                                    setShowActivity(!showActivity)
                                }
                            >
                                {showActivity ? "Hide" : "View All"}
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

export default FinancialDashboard;