import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiRequest from '../utils/api';
import useAuth from '../hooks/useAuth';
import './Home.css';

const highlightStats = [
  { value: 'Learn', label: 'at your own pace' },
  { value: 'Practice', label: 'with real course work' },
  { value: 'Earn', label: 'course certificates' },
];

const curatedCategories = ['Development', 'Data Science', 'Design', 'Marketing', 'Business','Programming'];

const featuredTracks = [
  {
    title: 'Full-Stack Cloud Engineer',
    duration: '12 weeks • Intermediate',
    outcome: 'Build and deploy production-ready apps',
  },
  {
    title: 'Product Design Accelerator',
    duration: '10 weeks • Beginner friendly',
    outcome: 'Ship polished case studies for your portfolio',
  },
  {
    title: 'AI for Business Operations',
    duration: '6 weeks • Advanced',
    outcome: 'Automate reporting & customer workflows',
  },
];

const learningPillars = [
  {
    title: 'Guided learning',
    description: 'Live mentor sessions and graded projects keep you accountable every week.',
  },
  {
    title: 'Career proof',
    description: 'Earn university-backed certificates with verified assessments and artifacts.',
  },
  {
    title: 'Flexible pacing',
    description: 'Self-paced videos plus calendar-based reminders to stay on track.',
  },
];

const Home = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;
    setLoading(true);
    setError('');
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('keyword', searchTerm.trim());
        if (category) params.append('category', category);
        if (sortBy) params.append('sort', sortBy);

        const queryString = params.toString();
        const data = await apiRequest(queryString ? `/courses?${queryString}` : '/courses', 'GET');
        const courseList = Array.isArray(data)
          ? data
          : Array.isArray(data?.courses)
            ? data.courses
            : Array.isArray(data?.data)
              ? data.data
              : [];

        if (isCurrentRequest) setCourses(courseList);
      } catch (requestError) {
        if (isCurrentRequest) {
          setCourses([]);
          setError(requestError?.message || 'We could not load courses. Please try again.');
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }, 250);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeout);
    };
  }, [searchTerm, category, sortBy, refreshKey]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('');
    setSortBy('');
  };

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Trusted by ambitious learners worldwide</p>
          <h1>Move your career forward with industry-grade certificates.</h1>
          <p className="lead">
            Build competitive skills, unlock promotions, or pivot into roles that value proof of hands-on mastery.
            Learn alongside mentors, submit projects, and earn credentials recruiters trust.
          </p>

          <div className="hero__actions">
            <Link to="/courses" className="btn btn-primary">
              Explore catalog
            </Link>
            <Link to="/about" className="btn btn-secondary">
              How it works
            </Link>
          </div>

          <div className="hero__stats">
            {highlightStats.map((stat) => (
              <div className="stat" key={stat.label}>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
            <div className="stat stat--courses">
              <span className="stat-value">{courses.length}</span>
              <span className="stat-label">Available courses</span>
            </div>
          </div>
        </div>

        <div className="hero__panel surface">
          <div className="panel-header">
            <p className="eyebrow">Find your next skill</p>
            <h3>Search the entire catalog</h3>
          </div>

          <div className="input-control">
            <label htmlFor="search" className="form-label">
              Keyword
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="e.g. React, Product Analytics, AI Ops..."
              className="form-input"
            />
          </div>

          <div className="panel-chips">
            <span>Popular focus areas</span>
            <div className="chip-group" role="group" aria-label="Popular focus areas">
              {curatedCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip ${category === item ? 'chip-primary' : ''}`}
                  onClick={() => setCategory(item === category ? '' : item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-selects">
            <label className="form-label" htmlFor="hero-category">
              Category
              <select
                id="hero-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-select"
              >
                <option value="">All</option>
                {curatedCategories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-label" htmlFor="hero-sort">
              Sort by
              <select
                id="hero-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select"
              >
                <option value="">Recommended</option>
                <option value="latest">Latest</option>
                <option value="popular">Popular</option>
                <option value="rating">Highest rated</option>
                <option value="price_low">Price • Low to High</option>
                <option value="price_high">Price • High to Low</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="trusted-strip surface-muted">
        <p>Everything you need to keep moving forward</p>
        <div className="trusted-strip__logos">
          <span>Instructor-led courses</span>
          <span>Quizzes & assignments</span>
          <span>Course certificates</span>
        </div>
      </section>

      <section className="tracks">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Career-ready pathways</p>
            <h2>Guided programs to accelerate outcomes</h2>
          </div>
          <Link to="/courses" className="link-forward">
            See all tracks →
          </Link>
        </div>
        <div className="tracks-grid">
          {featuredTracks.map((track) => {
            const matchingCourse = courses.find(course => course.title?.toLowerCase() === track.title.toLowerCase());
            const syllabusPath = matchingCourse
              ? `/courses/${matchingCourse._id}`
              : `/courses?keyword=${encodeURIComponent(track.title)}`;

            return (
              <article className="track-card surface" key={track.title}>
                <span className="badge badge-accent">Career Track</span>
                <h3>{track.title}</h3>
                <p className="track-duration">{track.duration}</p>
                <p className="track-outcome">{track.outcome}</p>
                <Link to={syllabusPath} className="btn btn-secondary">
                  View syllabus
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="learning-promise">
        {learningPillars.map((pillar) => (
          <div className="learning-card" key={pillar.title}>
            <h3>{pillar.title}</h3>
            <p>{pillar.description}</p>
          </div>
        ))}
      </section>

      <section className="courses-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Top picks for you</p>
            <h2>Featured courses</h2>
          </div>
          <div className="course-count-wrap">
            <p className="course-count" aria-live="polite">
              {loading ? 'Updating courses…' : `Showing ${Math.min(courses.length, 3)} of ${courses.length} courses`}
            </p>
            {(searchTerm || category || sortBy) && (
              <button className="btn btn-ghost clear-filters" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <Link to="/courses" className="link-forward">Browse all courses →</Link>
          </div>
        </div>

        {loading ? (
          <div className="course-loading surface-muted" role="status">
            <span className="loading-dot" aria-hidden="true" />
            <span>Finding courses for you…</span>
          </div>
        ) : error ? (
          <div className="no-courses surface-muted" role="alert">
            <h3>We couldn’t load the course catalog</h3>
            <p>{error}</p>
            <button className="btn btn-secondary" type="button" onClick={() => setRefreshKey((current) => current + 1)}>
              Try again
            </button>
          </div>
        ) : courses.length === 0 ? (
          <div className="no-courses surface-muted">
            <h3>{searchTerm || category || sortBy ? 'No courses match those filters' : 'No courses available yet'}</h3>
            <p>{searchTerm || category || sortBy ? 'Try a different keyword or clear your filters.' : 'Check back soon for new courses.'}</p>
            {(searchTerm || category || sortBy) && (
              <button className="btn btn-secondary" type="button" onClick={clearFilters}>Clear filters</button>
            )}
          </div>
        ) : (
          <div className="courses-list">
            {courses.slice(0, 3).map((course) => {
              const isEnrolled = Boolean(user?.enrolledCourses?.some((enrollment) => {
                const enrolledCourse = enrollment?.course || enrollment;
                return String(enrolledCourse?._id || enrolledCourse) === String(course._id);
              }));
              const isFree = Number(course.price) === 0;
              const loginReturnTo = isFree ? `/courses/${course._id}` : `/checkout?courseId=${course._id}`;
              return (
              <article key={course._id} className="course-card surface">
                <div className="course-card__header">
                  <div>
                    <span className="badge">{course.category || 'General'}</span>
                    <h3>{course.title}</h3>
                  </div>
                  <span className="course-price">{isFree ? 'Free' : `INR ${Number(course.price).toLocaleString('en-IN')}`}</span>
                </div>
                <p className="course-description">{course.description}</p>
                <div className="course-meta">
                  <div>
                    <span className="meta-label">Instructor</span>
                    <strong>{course.instructor?.name || 'Unknown'}</strong>
                  </div>
                  {course.averageRating > 0 && (
                    <div className="course-rating">
                      <span className="meta-label">Rating</span>
                      <strong>{course.averageRating.toFixed(1)}</strong>
                    </div>
                  )}
                </div>
                <div className="course-card__actions">
                  <Link to={`/courses/${course._id}`} className="btn btn-soft">
                    View details
                  </Link>
                  {isEnrolled ? (
                    <Link to={`/courses/${course._id}/content`} className="btn btn-primary">
                      Go to course
                    </Link>
                  ) : !user ? (
                    <Link to="/login" state={{ from: loginReturnTo }} className="btn btn-primary">
                      Login to enroll
                    </Link>
                  ) : user.role !== 'student' ? null : isFree ? (
                    <Link to={`/courses/${course._id}`} className="btn btn-primary">
                      Enroll for free
                    </Link>
                  ) : (
                    <Link to={`/checkout?courseId=${course._id}`} className="btn btn-primary">
                      Enroll now
                    </Link>
                  )}
                </div>
              </article>
            );})}
          </div>
        )}
      </section>

      <section className="callout surface">
        <div>
          <p className="eyebrow">For instructors</p>
          <h3>Share your expertise with a global cohort.</h3>
          <p>
            Launch modular lessons, track cohort progress, and award certificates with zero setup fees. Our curriculum
            team helps convert your experience into immersive learning moments.
          </p>
        </div>
        <Link to="/create-course" className="btn btn-primary">
          Create a course
        </Link>
      </section>
    </div>
  );
};

export default Home;
