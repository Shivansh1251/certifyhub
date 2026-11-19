import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiRequest, { serverUrl } from '../utils/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/users/dashboard/student', 'GET', null, true);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    if (percentage >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={fetchDashboardData}>Try again</button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="error-message" role="alert">
        <p>No dashboard data available.</p>
        <button type="button" className="btn btn-secondary" onClick={fetchDashboardData}>Try again</button>
      </div>
    );
  }

  const enrolledCourses = Array.isArray(dashboardData.enrolledCourses) ? dashboardData.enrolledCourses : [];
  const recentAssignments = Array.isArray(dashboardData.recentAssignments) ? dashboardData.recentAssignments : [];
  const recentQuizzes = Array.isArray(dashboardData.recentQuizzes) ? dashboardData.recentQuizzes : [];
  const stats = dashboardData.stats || {};

  return (
    <div className="student-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
            <h1>Welcome back, {dashboardData.user?.name || 'Learner'}!</h1>
          <p className="welcome-subtitle">Continue your learning journey</p>
        </div>
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalCourses ?? enrolledCourses.length}</div>
            <div className="stat-label">Enrolled Courses</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.completedCourses ?? 0}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.inProgressCourses ?? 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <Link to="/certificates" className="dashboard-stat-link" aria-label={`${dashboardData.certificates || 0} certificates, view certificates`}>
              <div className="stat-number">{dashboardData.certificates || 0}</div>
              <div className="stat-label">Certificates</div>
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="main-content">
          {/* Enrolled Courses Section */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>My Courses</h2>
              <Link to="/courses" className="btn-secondary">Browse More</Link>
            </div>
            
            {enrolledCourses.length === 0 ? (
              <div className="empty-state">
                <h3>No courses enrolled yet</h3>
                <p>Start your learning journey by enrolling in a course</p>
                <Link to="/courses" className="btn-primary">Browse Courses</Link>
              </div>
            ) : (
              <div className="courses-grid">
                {enrolledCourses.map(course => {
                  const percentage = Math.max(0, Math.min(100, Number(course.progress?.percentage) || 0));
                  return <article key={course._id} className="course-card">
                    <div className="course-header">
                      <h3><Link to={`/courses/${course._id}/content`}>{course.title}</Link></h3>
                      <span className="instructor-name">by {course.instructor?.name || 'CertifyHub instructor'}</span>
                    </div>
                    
                    <div className="progress-section">
                      <div className="progress-info">
                        <span className="progress-text">
                          Progress: {percentage}%
                        </span>
                        <span className="modules-text">
                          {course.progress?.completedModules || 0}/{course.progress?.totalModules || 0} modules
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: getProgressColor(percentage)
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="course-stats">
                      <div className="stat">
                        <span className="stat-value">{course.progress?.assignmentSubmissions || 0}</span>
                        <span className="stat-label">/{course.progress?.totalAssignments || 0} Assignments</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{course.progress?.quizAttempts || 0}</span>
                        <span className="stat-label">/{course.progress?.totalQuizzes || 0} Quizzes</span>
                      </div>
                    </div>
                    
                    <div className="course-actions">
                      <Link 
                        to={`/courses/${course._id}/content`} 
                        className="btn-primary btn-small"
                      >
                        Continue Learning
                      </Link>
                      <Link 
                        to={`/courses/${course._id}`} 
                        className="btn-secondary btn-small"
                      >
                        Course Details
                      </Link>
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>

          {/* Upcoming Assignments */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Upcoming Assignments</h2>
            </div>
            
            {recentAssignments.length === 0 ? (
              <div className="empty-state-small">
                <p>No upcoming assignments</p>
              </div>
            ) : (
              <div className="assignments-list">
                {recentAssignments.map(assignment => (
                  <div key={assignment._id} className="assignment-item">
                    <div className="assignment-info">
                      <h4>{assignment.title}</h4>
                      <p className="course-name">{assignment.course?.title || 'Course'}</p>
                      <p className="due-date">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="assignment-actions">
                      <Link 
                        to={`/courses/${assignment.course?._id}/content`}
                        className="btn-primary btn-small"
                      >
                        Submit
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="sidebar">
          {/* Recent Quizzes */}
          <section className="sidebar-section">
            <h3>Recent Quizzes</h3>
            {recentQuizzes.length === 0 ? (
              <p>No recent quizzes</p>
            ) : (
              <div className="quiz-list">
                {recentQuizzes.slice(0, 5).map(quiz => (
                  <div key={quiz._id} className="quiz-item">
                    <h4>{quiz.title}</h4>
                    <p className="course-name">{quiz.course?.title || 'Course'}</p>
                    <Link 
                      to={`/courses/${quiz.course?._id}/content`}
                      className="btn-secondary btn-small"
                    >
                      Take Quiz
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Profile Summary */}
          <section className="sidebar-section">
            <h3>Profile</h3>
            <div className="profile-summary">
              {dashboardData.user?.profilePicture && (
                <img 
                  src={serverUrl(dashboardData.user.profilePicture)}
                  alt="Profile"
                  className="profile-image"
                />
              )}
              <div className="profile-info">
                <h4>{dashboardData.user?.name || 'Learner'}</h4>
                <p>{dashboardData.user?.email}</p>
                {dashboardData.user?.bio && <p className="bio">{dashboardData.user.bio}</p>}
              </div>
              <Link to="/profile" className="btn-secondary">Edit Profile</Link>
            </div>
          </section>

          {/* Skills */}
          {dashboardData.user?.skills && dashboardData.user.skills.length > 0 && (
            <section className="sidebar-section">
              <h3>Skills</h3>
              <div className="skills-tags">
                {dashboardData.user.skills.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
