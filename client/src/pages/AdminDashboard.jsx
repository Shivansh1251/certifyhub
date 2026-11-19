import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiRequest, { serverUrl } from '../utils/api';
import useAuth from '../hooks/useAuth';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userQueryKey, setUserQueryKey] = useState(0);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const [adminCourses, setAdminCourses] = useState([]);
  const [adminCoursePage, setAdminCoursePage] = useState(1);
  const [adminCourseTotal, setAdminCourseTotal] = useState(0);
  const [adminCourseTotalPages, setAdminCourseTotalPages] = useState(1);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [userFilters, setUserFilters] = useState({
    page: 1,
    limit: 10,
    role: '',
    search: ''
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardData();
    } else if (user || !localStorage.getItem('token')) {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'courses') fetchCourses();
  }, [user, activeTab, userFilters.page, userFilters.limit, userFilters.role, userFilters.search, userQueryKey, adminCoursePage]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/users/dashboard/admin', 'GET', null, true);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({
        page: userFilters.page.toString(),
        limit: userFilters.limit.toString(),
        ...(userFilters.role && { role: userFilters.role }),
        ...(userFilters.search && { search: userFilters.search })
      });
      
      const data = await apiRequest(`/users?${params}`, 'GET', null, true);
      setUsers(data.users || []);
      setTotalUserPages(Math.max(1, Number(data.totalPages) || 1));
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError('');
    try {
      const data = await apiRequest(`/courses?sort=latest&page=${adminCoursePage}&limit=10`, 'GET', null, true, true);
      const courseList = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.courses)
            ? data.courses
            : [];
      setAdminCourses(courseList);
      setAdminCourseTotal(Number(data?.meta?.total ?? data?.total ?? courseList.length) || 0);
      setAdminCourseTotalPages(Math.max(1, Number(data?.meta?.totalPages ?? data?.totalPages) || 1));
    } catch (err) {
      setAdminCourses([]);
      setAdminCourseTotal(0);
      setAdminCourseTotalPages(1);
      setCoursesError(err.message || 'Could not load the course catalog.');
    } finally {
      setCoursesLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await apiRequest(`/users/${userId}/role`, 'PUT', { role: newRole }, true);
      fetchUsers(); // Refresh the user list
      alert(`User role updated to ${newRole}`);
    } catch (err) {
      alert('Failed to update user role');
      console.error('Error updating user role:', err);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiRequest(`/users/${userId}`, 'DELETE', null, true);
      fetchUsers(); // Refresh the user list
      alert('User deleted successfully');
    } catch (err) {
      alert('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleUserSearch = (e) => {
    e.preventDefault();
    setUserFilters((current) => ({ ...current, search: userSearch.trim(), page: 1 }));
    setUserQueryKey((current) => current + 1);
  };

  const topCourses = dashboardData?.topCourses || [];
  const maxCourseEnrollments = Math.max(1, ...topCourses.map((course) => Number(course.enrolledCount) || 0));

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="error-message">
        <h2>Access Denied</h2>
        <p>You don't have permission to access the admin dashboard.</p>
        <Link to="/" className="btn-primary">Go to Home</Link>
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

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Admin Dashboard</h1>
          <p className="welcome-subtitle">Manage your learning platform</p>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button type="button" aria-pressed={activeTab === 'overview'}
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Overview
        </button>
        <button type="button" aria-pressed={activeTab === 'users'}
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button type="button" aria-pressed={activeTab === 'courses'}
          className={`tab ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          📚 Courses
        </button>
        <button type="button" aria-pressed={activeTab === 'reports'}
          className={`tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📈 Reports
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && dashboardData && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card users-stat">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <div className="stat-number">{dashboardData.stats.totalUsers}</div>
                  <div className="stat-label">Total Users</div>
                  <div className="stat-breakdown">
                    <span>Students: {dashboardData.stats.totalStudents}</span>
                    <span>Instructors: {dashboardData.stats.totalInstructors}</span>
                  </div>
                </div>
              </div>

              <div className="stat-card courses-stat">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <div className="stat-number">{dashboardData.stats.totalCourses}</div>
                  <div className="stat-label">Total Courses</div>
                </div>
              </div>

              <div className="stat-card certificates-stat">
                <div className="stat-icon">🏆</div>
                <div className="stat-content">
                  <div className="stat-number">{dashboardData.stats.totalCertificates}</div>
                  <div className="stat-label">Certificates Issued</div>
                </div>
              </div>
            </div>

            <div className="recent-activity">
              <div className="activity-section">
                <h3>Recent Users</h3>
                <div className="recent-list">
                  {dashboardData.recentUsers.map(user => (
                    <div key={user._id} className="recent-item">
                      <div className="item-info">
                        <h4>{user.name}</h4>
                        <p>{user.email}</p>
                        <span className={`role-badge ${user.role}`}>{user.role}</span>
                      </div>
                      <div className="item-date">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="activity-section">
                <h3>Recent Courses</h3>
                <div className="recent-list">
                  {dashboardData.recentCourses.map(course => (
                    <div key={course._id} className="recent-item">
                      <div className="item-info">
                        <h4><Link to={`/courses/${course._id}`}>{course.title}</Link></h4>
                        <p>by {course.instructor?.name || 'Unknown instructor'}</p>
                      </div>
                      <div className="item-date">
                        {new Date(course.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="top-courses">
              <h3>Top Performing Courses</h3>
              <div className="courses-table">
                <table>
                  <thead>
                    <tr>
                      <th>Course</th>
                      <th>Instructor</th>
                      <th>Enrollments</th>
                      <th>Rating</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topCourses.map(course => (
                      <tr key={course._id}>
                        <td><Link to={`/courses/${course._id}`}>{course.title}</Link></td>
                        <td>{course.instructor}</td>
                        <td>{course.enrolledCount}</td>
                        <td>{course.averageRating || 0}/5</td>
                        <td>INR {(course.price * course.enrolledCount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>User Management</h2>
            </div>

            <div className="filters-section">
              <form onSubmit={handleUserSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-input"
                />
                <select
                  value={userFilters.role}
                  onChange={(e) => setUserFilters((current) => ({...current, role: e.target.value, page: 1}))}
                  className="form-select"
                >
                  <option value="">All Roles</option>
                  <option value="student">Students</option>
                  <option value="instructor">Instructors</option>
                  <option value="admin">Admins</option>
                </select>
                <button type="submit" className="btn-primary">Search</button>
              </form>
            </div>

            {usersLoading ? <div className="admin-table-state" role="status">Loading users…</div> : null}
            <div className="users-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Courses</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!usersLoading && users.length === 0 && (
                    <tr><td colSpan="6" className="admin-empty-cell">No users match your search.</td></tr>
                  )}
                  {users.map(user => (
                    <tr key={user._id}>
                      <td>
                        <div className="user-info">
                          {user.profilePicture && (
                            <img 
                              src={serverUrl(user.profilePicture)}
                              alt="Profile"
                              className="user-avatar"
                            />
                          )}
                          <span>{user.name}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>{user.enrolledCourses?.length || 0}</td>
                      <td>
                        <div className="action-buttons">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user._id, e.target.value)}
                            className="role-select"
                          >
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="btn-danger btn-small"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                disabled={userFilters.page <= 1 || usersLoading}
                onClick={() => setUserFilters((current) => ({...current, page: current.page - 1}))}
                className="btn-secondary"
              >
                Previous
              </button>
              <span>Page {userFilters.page} of {totalUserPages}</span>
              <button
                disabled={userFilters.page >= totalUserPages || usersLoading}
                onClick={() => setUserFilters((current) => ({...current, page: current.page + 1}))}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div className="courses-section">
            <div className="section-header admin-panel-heading">
              <div>
                <h2>Course catalog</h2>
                <p>Review current courses, instructors, and enrollment activity.</p>
              </div>
              <button type="button" className="btn-secondary" onClick={fetchCourses} disabled={coursesLoading}>
                {coursesLoading ? 'Refreshing…' : 'Refresh courses'}
              </button>
            </div>
            {coursesError && <div className="admin-inline-error" role="alert">{coursesError}</div>}
            {coursesLoading && adminCourses.length === 0 ? (
              <div className="admin-table-state" role="status">Loading courses…</div>
            ) : adminCourses.length === 0 ? (
              <div className="admin-table-state">No courses are available yet.</div>
            ) : (
              <div className="courses-table admin-courses-table">
                <table>
                  <thead>
                    <tr><th>Course</th><th>Instructor</th><th>Category</th><th>Students</th><th>Rating</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {adminCourses.map((course) => (
                      <tr key={course._id}>
                        <td><Link to={`/courses/${course._id}`} className="admin-course-title">{course.title}</Link></td>
                        <td>{course.instructor?.name || 'Unknown instructor'}</td>
                        <td>{course.category || 'General'}</td>
                        <td>{course.enrollmentCount ?? course.enrolledStudents?.length ?? 0}</td>
                        <td>{Number(course.averageRating || 0).toFixed(1)} / 5</td>
                        <td><Link to={`/courses/${course._id}`} className="btn-secondary btn-small">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {adminCourseTotalPages > 1 && (
              <div className="pagination" aria-label="Course catalog pages">
                <button type="button" className="btn-secondary" disabled={adminCoursePage <= 1 || coursesLoading} onClick={() => setAdminCoursePage((current) => current - 1)}>Previous</button>
                <span>Page {adminCoursePage} of {adminCourseTotalPages} · {adminCourseTotal} courses</span>
                <button type="button" className="btn-secondary" disabled={adminCoursePage >= adminCourseTotalPages || coursesLoading} onClick={() => setAdminCoursePage((current) => current + 1)}>Next</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="reports-section">
            <div className="section-header">
              <h2>Analytics & Reports</h2>
            </div>
            <div className="report-summary-grid">
              <article><span>Students</span><strong>{dashboardData?.stats?.totalStudents ?? 0}</strong></article>
              <article><span>Instructors</span><strong>{dashboardData?.stats?.totalInstructors ?? 0}</strong></article>
              <article><span>Courses</span><strong>{dashboardData?.stats?.totalCourses ?? 0}</strong></article>
              <article><span>Certificates issued</span><strong>{dashboardData?.stats?.totalCertificates ?? 0}</strong></article>
            </div>
            <section className="report-course-performance">
              <h3>Top courses by enrollment</h3>
              {topCourses.length === 0 ? (
                <p className="admin-table-state">Course performance data is not available yet.</p>
              ) : topCourses.map((course) => {
                const enrollments = Number(course.enrolledCount) || 0;
                return (
                  <div className="report-course-row" key={course._id}>
                    <div className="report-course-label">
                      <Link to={`/courses/${course._id}`}>{course.title}</Link>
                      <span>{enrollments} {enrollments === 1 ? 'student' : 'students'} · {Number(course.averageRating || 0).toFixed(1)} ★</span>
                    </div>
                    <div className="report-course-track" aria-label={`${enrollments} enrollments`}>
                      <span style={{ width: `${Math.round((enrollments / maxCourseEnrollments) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
