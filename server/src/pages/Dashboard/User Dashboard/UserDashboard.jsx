import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../../config/api";
import { Play, Pause, Square, Search, Bell, Settings, HelpCircle, LogOut, BarChart3, Users, TrendingUp, BookOpen, Clock, Award, Target } from 'lucide-react';
import ProgressBar from "../../../components/Progress/ProgressBar";
import Navbar from "../../../components/Navbar/Navbar";
import "./UserDashboard.css";

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isTimeTrackerRunning, setIsTimeTrackerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [allProgress, setAllProgress] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [studyStreak, setStudyStreak] = useState(0);
  const [weeklyGoals, setWeeklyGoals] = useState({});
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalStudyTime: 0,
    averageScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setError("");

      try {
        // Fetch dashboard data - this now returns only enrolled courses
        const dashResponse = await apiRequest('/dashboard/user', { method: 'GET' });
        const dashData = await dashResponse.json();

        if (!dashResponse.ok) {
          throw new Error(dashData?.message || 'Failed to fetch dashboard data');
        }

        console.log("📊 Dashboard data:", dashData);
        
        setUser(dashData.user || { email: dashData.email });
        setEnrolledCourses(dashData.enrolledCourses || []);
        setRecentActivity(dashData.recentActivity || []);
        setAchievements(dashData.achievements || []);
        setStudyStreak(dashData.studyStreak || 0);
        setWeeklyGoals(dashData.weeklyGoals || {
          studyHours: { current: 0, target: 15 },
          coursesComplete: { current: 0, target: 2 },
          quizzesPassed: { current: 0, target: 8 }
        });

        // Use progress data from dashboard response
        setAllProgress(dashData.allProgress || []);

        // Calculate stats from the dashboard progress data
        const progressStats = dashData.progress || {};
        setStats({
          totalCourses: progressStats.totalCourses || 0,
          completedCourses: progressStats.completedCourses || 0,
          totalStudyTime: progressStats.totalStudyTime || 0,
          averageScore: progressStats.averageScore || 0
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Timer logic
  useEffect(() => {
    let interval;
    if (isTimeTrackerRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1000);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimeTrackerRunning]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCourseProgress = (courseId) => {
    const progress = allProgress.find(p => p.courseId === courseId);
    return progress?.percentComplete || 0;
  };

  const handleContinueCourse = (course) => {
    const courseId = course.courseId || course.course_id || course._id;
    if (courseId) {
      // Navigate to the course learning page
      console.log("🚀 Navigating to course:", courseId);
      navigate(`/learn/${courseId}`);
    } else {
      console.error("No valid course ID found:", course);
      alert("Unable to open course. Please try again.");
    }
  };

  const getCourseDisplayInfo = (course) => {
    return {
      id: course.courseId || course.course_id || course._id,
      title: course.courseName || course.title || 'Untitled Course',
      instructor: course.instructor || course.author || 'Cognition Berries',
      description: course.description || '',
      image: course.image || course.imageUrl,
      progress: getCourseProgress(course.courseId || course.course_id || course._id)
    };
  };

  // Rest of your component remains the same...
  // Only the handleContinueCourse function was updated

  return (
    <div className="udb-root">
      <Navbar/>
      {/* Sidebar */}
      <div className="udb-sidebar">
        <div className="udb-sidebar-header">
          <div className="udb-sidebar-logo-row">
            <div className="udb-sidebar-logo"><BookOpen className="udb-sidebar-logo-icon" /></div>
            <span className="udb-sidebar-title">LearnHub</span>
          </div>
        </div>

        <nav className="udb-sidebar-nav">
          <div className="udb-sidebar-section">Learning</div>

          <a href="#" className="udb-sidebar-link udb-sidebar-link-active">
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </a>

          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/courses'); }} className="udb-sidebar-link">
            <BookOpen size={20} />
            <span>My Courses</span>
          </a>

          <a href="#" className="udb-sidebar-link">
            <Target size={20} />
            <span>Assignments</span>
          </a>

          <a href="#" className="udb-sidebar-link">
            <Award size={20} />
            <span>Achievements</span>
          </a>

          <a href="#" className="udb-sidebar-link">
            <Users size={20} />
            <span>Study Groups</span>
          </a>
        </nav>

        <div className="udb-sidebar-footer">
          <div className="udb-sidebar-section">Account</div>

          <a href="#" className="udb-sidebar-link">
            <Settings size={20} />
            <span>Settings</span>
          </a>

          <a href="#" className="udb-sidebar-link">
            <HelpCircle size={20} />
            <span>Help Center</span>
          </a>

          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/logout'); }} className="udb-sidebar-link">
            <LogOut size={20} />
            <span>Logout</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="udb-main">
        {/* Header */}
        <header className="udb-header">
          <div className="udb-header-row">
            <div>
              <h1 className="udb-header-title">
                Welcome back, {user?.name || user?.email?.split('@')[0] || 'Student'}!
              </h1>
              <p className="udb-header-sub">Continue your learning journey</p>
            </div>

            <div className="udb-header-actions">
              <div className="udb-header-search-wrap">
                <Search className="udb-header-search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search courses..."
                  className="udb-header-search"
                />
              </div>

              <button className="udb-header-bell">
                <Bell size={20} />
                <span className="udb-header-bell-badge">3</span>
              </button>

              <div className="udb-header-user-row">
                <div className="udb-header-user-avatar">
                  {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="udb-header-user-name">{user?.name || user?.email?.split('@')[0] || 'User'}</div>
                  <div className="udb-header-user-role">Student</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="udb-content">
          {/* Progress Overview Cards */}
          <div className="udb-cards-row">
            <div className="udb-card">
              <div className="udb-card-row">
                <h3 className="udb-card-title">Courses Enrolled</h3>
                <BookOpen size={20} className="udb-card-icon-green" />
              </div>
              <div className="udb-card-main">{stats.totalCourses}</div>
              <div className="udb-card-sub udb-card-sub-green">
                <TrendingUp size={14} className="udb-card-sub-icon" />
                {stats.totalCourses - stats.completedCourses} in progress
              </div>
            </div>

            <div className="udb-card">
              <div className="udb-card-row">
                <h3 className="udb-card-title">Completed Courses</h3>
                <Award size={20} className="udb-card-icon-blue" />
              </div>
              <div className="udb-card-main">{stats.completedCourses}</div>
              <div className="udb-card-sub udb-card-sub-blue">
                <TrendingUp size={14} className="udb-card-sub-icon" />
                {stats.totalCourses > 0 ? Math.round((stats.completedCourses / stats.totalCourses) * 100) : 0}% completion rate
              </div>
            </div>

            <div className="udb-card">
              <div className="udb-card-row">
                <h3 className="udb-card-title">Average Score</h3>
                <Target size={20} className="udb-card-icon-purple" />
              </div>
              <div className="udb-card-main">{stats.averageScore}%</div>
              <div className="udb-card-sub udb-card-sub-purple">
                <TrendingUp size={14} className="udb-card-sub-icon" />
                Across all quizzes
              </div>
            </div>

            <div className="udb-card udb-card-green">
              <div className="udb-card-row">
                <h3 className="udb-card-title udb-card-title-green">Study Streak</h3>
                <Award size={20} className="udb-card-icon-green-light" />
              </div>
              <div className="udb-card-main">{studyStreak} days</div>
              <div className="udb-card-sub udb-card-sub-green-light">
                <TrendingUp size={14} className="udb-card-sub-icon" />
                Keep it up!
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="udb-main-grid">
            {/* Learning Progress - Only Enrolled Courses */}
            <div className="udb-main-grid-progress">
              <div className="udb-section-header">
                <h3 className="udb-section-title">Your Course Progress</h3>
                <span className="udb-section-subtitle">
                  {enrolledCourses.length} enrolled course{enrolledCourses.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {enrolledCourses.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📚</div>
                  <p className="empty-state-text">No courses enrolled yet</p>
                  <p className="empty-state-subtext">Start your learning journey by enrolling in courses</p>
                  <button 
                    className="udb-btn udb-btn-green"
                    onClick={() => navigate('/courses')}
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <div className="udb-progress-list">
                  {enrolledCourses.map((course, index) => {
                    const courseInfo = getCourseDisplayInfo(course);
                    const progress = courseInfo.progress;
                    
                    return (
                      <div key={index} className="udb-progress-item">
                        <div className="udb-progress-icon">
                          {courseInfo.image ? (
                            <img 
                              src={courseInfo.image} 
                              alt={courseInfo.title}
                              className="udb-course-image"
                            />
                          ) : (
                            "📚"
                          )}
                        </div>
                        <div className="udb-progress-info">
                          <h4 className="udb-progress-title">{courseInfo.title}</h4>
                          <p className="udb-progress-author">{courseInfo.instructor}</p>
                          <div className="udb-progress-bar-container">
                            <ProgressBar 
                              percent={progress} 
                              showText={true}
                              height="8px"
                            />
                            <div className="udb-progress-stats">
                              <span className="udb-progress-percent">{progress}% complete</span>
                              {course.enrollmentDate && (
                                <span className="udb-enrollment-date">
                                  Enrolled {new Date(course.enrollmentDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          className={`udb-btn ${
                            progress === 0 ? 'udb-btn-green' : 
                            progress === 100 ? 'udb-btn-blue' : 'udb-btn-outline-green'
                          }`}
                          onClick={() => handleContinueCourse(course)}
                        >
                          {progress === 0 ? 'Start' : progress === 100 ? 'Review' : 'Continue'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rest of your dashboard UI remains the same... */}
            {/* Study Timer & Goals */}
            <div className="udb-main-grid-side">
              {/* Study Timer */}
              <div className="udb-timer-box">
                <h3 className="udb-section-title">Study Timer</h3>
                <div className="udb-timer-center">
                  <div className="udb-timer-time">{formatTime(timeElapsed)}</div>
                  <div className="udb-timer-btn-row">
                    <button
                      onClick={() => setIsTimeTrackerRunning(!isTimeTrackerRunning)}
                      className="udb-btn udb-btn-timer"
                    >
                      {isTimeTrackerRunning ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <button
                      onClick={() => {
                        setIsTimeTrackerRunning(false);
                        setTimeElapsed(0);
                      }}
                      className="udb-btn udb-btn-timer-stop"
                    >
                      <Square size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekly Goals */}
              <div className="udb-goals-box">
                <h3 className="udb-section-title">Weekly Goals</h3>
                <div className="udb-goals-list">
                  {Object.entries(weeklyGoals).map(([goal, data]) => {
                    const percentage = Math.round((data.current / data.target) * 100);
                    return (
                      <div key={goal} className="udb-goal-item">
                        <div className="udb-goal-row">
                          <span className="udb-goal-label">
                            {goal.replace(/([A-Z])/g, ' $1')
                                 .replace(/^./, str => str.toUpperCase())
                                 .replace('Study Hours', 'Study Hours')
                                 .replace('Courses Complete', 'Courses Completed')
                                 .replace('Quizzes Passed', 'Quizzes Passed')}
                          </span>
                          <span className="udb-goal-value">
                            {data.current}/{data.target}
                          </span>
                        </div>
                        <div className="udb-goal-bar-bg">
                          <div
                            className={`udb-goal-bar ${
                              percentage >= 100 ? 'udb-goal-bar-green' :
                              percentage >= 70 ? 'udb-goal-bar-yellow' : 'udb-goal-bar-red'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="udb-main-grid-activity">
              <h3 className="udb-section-title">Recent Activity</h3>
              {recentActivity.length === 0 ? (
                <div className="empty-state-small">
                  <p>No recent activity</p>
                </div>
              ) : (
                <div className="udb-activity-list">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="udb-activity-item">
                      <div className="udb-activity-icon">{activity.icon || '📌'}</div>
                      <div className="udb-activity-info">
                        <p className="udb-activity-title">{activity.title}</p>
                        <p className="udb-activity-time">
                          {new Date(activity.time).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements */}
            <div className="udb-main-grid-achievements">
              <h3 className="udb-section-title">Achievements</h3>
              <div className="udb-achievements-list">
                {achievements.map((achievement, index) => (
                  <div 
                    key={index} 
                    className={`udb-achievement-item ${
                      achievement.earned ? 'udb-achievement-earned' : 'udb-achievement-not-earned'
                    }`}
                  >
                    <div className={`udb-achievement-icon ${
                      achievement.earned ? '' : 'udb-achievement-grayscale'
                    }`}>
                      {achievement.icon}
                    </div>
                    <div className="udb-achievement-info">
                      <div className={`udb-achievement-name ${
                        achievement.earned ? 'udb-achievement-name-earned' : 'udb-achievement-name-not-earned'
                      }`}>
                        {achievement.name}
                      </div>
                      <div className="udb-achievement-description">
                        {achievement.description}
                      </div>
                      <div className={`udb-achievement-status ${
                        achievement.earned ? 'udb-achievement-status-earned' : 'udb-achievement-status-not-earned'
                      }`}>
                        {achievement.earned ? 'Earned' : 'Not earned yet'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;