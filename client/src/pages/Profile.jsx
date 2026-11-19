
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiRequest, { serverUrl } from '../utils/api';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [previewPic, setPreviewPic] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      try {
        const userData = await apiRequest('/auth/me', 'GET', null, true);
        if (!active) return;
        setUser(userData);
        setBio(userData.bio || '');
        setSkills(userData.skills ? userData.skills.join(', ') : '');
        setPreviewPic(userData.profilePicture || '');
        if (userData.role === 'student') {
          try {
            const dashboard = await apiRequest('/users/dashboard/student', 'GET', null, true);
            if (active) setDashboardData(dashboard);
          } catch (dashboardError) {
            console.error('Could not load course progress for profile', dashboardError);
          }
        }
      } catch (err) {
        if (active) navigate('/login', { replace: true, state: { from: '/profile' } });
      } finally {
        if (active) setIsLoading(false);
      }
    };
    fetchUser();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => () => {
    if (previewPic.startsWith('blob:')) URL.revokeObjectURL(previewPic);
  }, [previewPic]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };


  const handleEdit = () => setEditMode(true);
  const handleCancel = () => {
    setEditMode(false);
    setBio(user.bio || "");
    setSkills(user.skills ? user.skills.join(", ") : "");
    setPreviewPic(user.profilePicture || "");
    setProfilePicture(null);
    setProfileError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileMessage('');
    setProfileError('');
    try {
      await apiRequest('/users/profile', 'PUT', { bio, skills }, true);

      if (profilePicture) {
        const formData = new FormData();
        formData.append('profilePicture', profilePicture);
        await apiRequest('/users/profile-picture', 'POST', formData, true);
      }

      const userData = await apiRequest('/auth/me', 'GET', null, true);
      setUser(userData);
      setBio(userData.bio || "");
      setSkills(userData.skills ? userData.skills.join(", ") : "");
      setPreviewPic(userData.profilePicture || "");
      setProfilePicture(null);
      setEditMode(false);
      setProfileMessage('Your profile has been updated.');
    } catch (err) {
      setProfileError(err.message || 'Could not update your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !user) {
    return <main className="profile-container"><div className="profile-loading" role="status">Loading your profile…</div></main>;
  }

  const enrolledCourses = dashboardData?.enrolledCourses || user.enrolledCourses || [];
  const stats = dashboardData?.stats || {};
  const initials = (user.name || user.email || 'Learner').split(/[\s@]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('');

  return (
    <main className="profile-container">
      <header className="profile-hero">
        <div className="profile-identity">
          <div className="profile-avatar">
            {previewPic ? <img src={serverUrl(previewPic)} alt={`${user.name}'s profile`} /> : <span>{initials}</span>}
          </div>
          <div>
            <p className="profile-eyebrow">Your account</p>
            <h1>Welcome back, {user.name?.split(' ')[0] || 'Learner'}</h1>
            <p className="profile-hero-email">{user.email} <span>{user.role}</span></p>
          </div>
        </div>
        <div className="profile-hero-actions">
          {user.role === 'student' && <Link className="profile-button profile-button-light" to="/dashboard/student">Learning dashboard</Link>}
          <button className="profile-button profile-button-quiet" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {profileMessage && <div className="profile-notice profile-notice-success" role="status">{profileMessage}</div>}
      {profileError && <div className="profile-notice profile-notice-error" role="alert">{profileError}</div>}

      {user.role === 'student' && (
        <section className="profile-stats" aria-label="Learning summary">
          <article><span>Enrolled courses</span><strong>{stats.totalCourses ?? enrolledCourses.length}</strong></article>
          <article><span>In progress</span><strong>{stats.inProgressCourses ?? 0}</strong></article>
          <article><span>Completed</span><strong>{stats.completedCourses ?? 0}</strong></article>
          <article><span>Certificates</span><strong>{dashboardData?.certificates ?? stats.completedCourses ?? 0}</strong></article>
        </section>
      )}

      <div className="profile-content-grid">
        <section className="profile-panel profile-course-panel">
          <div className="profile-section-heading">
            <div><p className="profile-eyebrow">Keep building</p><h2>My courses</h2></div>
            <Link to="/courses" className="profile-text-link">Browse courses <span aria-hidden="true">→</span></Link>
          </div>

          {enrolledCourses.length > 0 ? (
            <div className="profile-course-list">
              {enrolledCourses.map(course => {
                const percentage = Math.max(0, Math.min(100, Number(course.progress?.percentage) || 0));
                return (
                  <article className="profile-course-card" key={course._id}>
                    <div className="profile-course-main">
                      <div>
                        <p className="profile-course-meta">{course.category || 'Course'}{course.instructor?.name ? ` · ${course.instructor.name}` : ''}</p>
                        <h3><Link to={`/courses/${course._id}/content`}>{course.title || 'Untitled course'}</Link></h3>
                      </div>
                      <Link className="profile-course-open" to={`/courses/${course._id}/content`} aria-label={`Continue ${course.title || 'course'}`}>→</Link>
                    </div>
                    {course.progress && (
                      <div className="profile-course-progress">
                        <div className="profile-progress-label"><span>Course progress</span><strong>{percentage}%</strong></div>
                        <div className="profile-progress-track"><span style={{ width: `${percentage}%` }} /></div>
                        <small>{course.progress.completedModules || 0} of {course.progress.totalModules || 0} modules completed</small>
                      </div>
                    )}
                    <div className="profile-course-actions">
                      <Link className="profile-button profile-button-primary" to={`/courses/${course._id}/content`}>Continue learning</Link>
                      <Link className="profile-button profile-button-outline" to={`/courses/${course._id}`}>Course details</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="profile-empty-state">
              <span className="profile-empty-icon" aria-hidden="true">✦</span>
              <h3>Your next course starts here</h3>
              <p>Browse the catalog, enroll in a course, and it will appear here with a direct link to your lessons.</p>
              <Link className="profile-button profile-button-primary" to="/courses">Explore courses</Link>
            </div>
          )}
        </section>

        <aside className="profile-panel profile-details-panel">
          <div className="profile-section-heading">
            <div><p className="profile-eyebrow">Personal details</p><h2>Profile</h2></div>
            {!editMode && <button className="profile-text-link profile-edit-trigger" type="button" onClick={() => { setProfileMessage(''); setProfileError(''); handleEdit(); }}>Edit</button>}
          </div>
          {editMode ? (
            <form className="profile-edit-form" onSubmit={handleSave}>
              <label htmlFor="profile-bio">Bio</label>
              <textarea id="profile-bio" value={bio} onChange={event => setBio(event.target.value)} rows={4} maxLength={500} placeholder="Add a short introduction" />
              <label htmlFor="profile-skills">Skills</label>
              <input id="profile-skills" type="text" value={skills} onChange={event => setSkills(event.target.value)} placeholder="Design, JavaScript, project management" />
              <label htmlFor="profile-picture">Profile picture</label>
              <input id="profile-picture" type="file" accept="image/*" onChange={event => {
                const file = event.target.files?.[0];
                if (file) {
                  setProfilePicture(file);
                  setPreviewPic(URL.createObjectURL(file));
                }
              }} />
              <div className="profile-course-actions">
                <button className="profile-button profile-button-primary" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</button>
                <button className="profile-button profile-button-outline" type="button" onClick={handleCancel} disabled={isSaving}>Cancel</button>
              </div>
            </form>
          ) : (
            <div className="profile-details-content">
              <div><span>Email</span><strong>{user.email}</strong></div>
              <div><span>About</span><p>{user.bio || 'Add a short bio to introduce yourself.'}</p></div>
              <div>
                <span>Skills</span>
                {user.skills?.length ? <div className="profile-skill-list">{user.skills.map(skill => <span key={skill}>{skill}</span>)}</div> : <p>Add skills that describe what you’re learning or working on.</p>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Profile;
