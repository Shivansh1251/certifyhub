import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import apiRequest from '../utils/api';
import './Courses.css';

const categoryOptions = ['Development', 'Design', 'Marketing', 'Finance', 'Data Science', 'Business','Programming'];

const getEnrolledCourseId = (enrollment) => {
  const course = enrollment?.course || enrollment;
  const id = course?._id || course;
  return id ? String(id) : '';
};

const Courses = () => {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('keyword') || '');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const enrolledCourses = Array.isArray(user?.enrolledCourses) ? user.enrolledCourses : [];
  const enrolledCourseIds = new Set(enrolledCourses.map(getEnrolledCourseId).filter(Boolean));

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
        params.append('page', String(page));
        params.append('limit', String(pageSize));

        const data = await apiRequest(`/courses?${params.toString()}`, 'GET', null, false, true);
        const courseList = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : Array.isArray(data?.courses)
              ? data.courses
              : [];

        if (isCurrentRequest) {
          setCourses(courseList);
          setTotalCount(Number(data?.meta?.total ?? data?.total ?? courseList.length) || 0);
          setTotalPages(Math.max(1, Number(data?.meta?.totalPages ?? data?.totalPages) || 1));
        }
      } catch (requestError) {
        if (isCurrentRequest) {
          setCourses([]);
          setTotalCount(0);
          setTotalPages(1);
          setError(requestError?.message || 'We could not load the course catalog. Please try again.');
        }
      } finally {
        if (isCurrentRequest) setLoading(false);
      }
    }, 250);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeout);
    };
  }, [searchTerm, category, sortBy, page, pageSize, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('');
    setSortBy('');
    setPage(1);
  };

  return (
    <div className="courses-page">
      <section className="courses-hero surface">
        <div>
          <p className="eyebrow">Course catalog</p>
          <h1>Programs built with hiring partners & universities.</h1>
          <p>
            Browse certificates, specializations, and cohort programs backed by practical assessments and mentor
            feedback. Curated to meet in-demand skills across technology, business, design, and data.
          </p>
        </div>
        <div className="courses-hero__stats">
          <div>
            <span className="stat-value">{totalCount}</span>
            <span className="stat-label">Available courses</span>
          </div>
          <div>
            <span className="stat-value">Learn</span>
            <span className="stat-label">at your pace</span>
          </div>
          <div>
            <span className="stat-value">Earn</span>
            <span className="stat-label">a certificate</span>
          </div>
        </div>
      </section>

      <div className="courses-layout">
        <aside className="filter-panel surface">
          <div className="filter-header">
            <h2>Refine your search</h2>
            <button className="btn btn-secondary" type="button" onClick={handleRefresh} disabled={loading}>
              {loading ? 'Updating…' : 'Refresh results'}
            </button>
          </div>

          <div className="filter-group">
            <label className="form-label" htmlFor="course-search">
              Keyword
            </label>
            <input
              id="course-search"
              type="text"
              className="form-input"
              placeholder="e.g. cloud, product analytics..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

          <div className="filter-group">
            <label className="form-label" htmlFor="course-category">
              Category
            </label>
            <select
              id="course-category"
              className="form-select"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="chip-group">
              {categoryOptions.slice(0, 4).map((option) => (
                <button
                  type="button"
                  className={`chip ${category === option ? 'chip-primary' : ''}`}
                  key={option}
                  onClick={() => { setCategory(category === option ? '' : option); setPage(1); }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="form-label" htmlFor="course-sort">
              Sort by
            </label>
            <select
              id="course-sort"
              className="form-select"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            >
              <option value="">Recommended</option>
              <option value="latest">Latest</option>
              <option value="popular">Most popular</option>
              <option value="rating">Highest rated</option>
              <option value="price_low">Price • Low to High</option>
              <option value="price_high">Price • High to Low</option>
            </select>
          </div>
        </aside>

        <section className="courses-results">
          <div className="results-header">
            <div>
              <p className="eyebrow" aria-live="polite">
                {loading ? 'Updating course list…' : totalCount === 0 ? 'No matching programs' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalCount)} of ${totalCount} ${totalCount === 1 ? 'program' : 'programs'}`}
              </p>
              <h2>Programs that fit your goals</h2>
            </div>
            <div className="results-actions">
              {(searchTerm || category || sortBy) && (
                <button className="btn btn-ghost" type="button" onClick={clearFilters}>Clear filters</button>
              )}
              {enrolledCourses.length > 0 && (
                <Link to="/dashboard/student" className="btn btn-secondary">
                  Go to my learning
                </Link>
              )}
            </div>
          </div>

          {enrolledCourses.length > 0 && (
            <div className="enrolled-strip surface-muted">
              <h3>My enrolled courses</h3>
              <div className="enrolled-grid">
                {enrolledCourses.map((enrollment, index) => {
                  const course = enrollment?.course || enrollment;
                  const courseId = getEnrolledCourseId(enrollment);
                  if (!courseId || !course?.title) return null;
                  return (
                    <Link to={`/courses/${courseId}/content`} key={courseId || index} className="enrolled-card">
                      <span>{course.title}</span>
                      <span className="meta-label">Continue learning →</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {loading ? (
            <div className="course-loading surface-muted" role="status">
              <span className="loading-dot" aria-hidden="true" />
              <span>Loading courses…</span>
            </div>
          ) : error ? (
            <div className="no-courses surface-muted" role="alert">
              <h3>The course catalog is unavailable</h3>
              <p>{error}</p>
              <button className="btn btn-secondary" type="button" onClick={handleRefresh}>Try again</button>
            </div>
          ) : courses.length === 0 ? (
            <div className="no-courses surface-muted">
              <h3>{searchTerm || category || sortBy ? 'No courses match those filters' : 'No courses available yet'}</h3>
              <p>{searchTerm || category || sortBy ? 'Try another keyword or clear your filters.' : 'Check back soon for new courses.'}</p>
              {(searchTerm || category || sortBy) && (
                <button className="btn btn-secondary" type="button" onClick={clearFilters}>Clear filters</button>
              )}
            </div>
          ) : (
            <>
            <div className="courses-grid">
              {courses.map((course) => {
                const isEnrolled = enrolledCourseIds.has(String(course._id));
                const price = Number(course.price) || 0;
                const rating = Number(course.averageRating) || 0;
                return (
                  <article key={course._id} className={`course-card surface ${isEnrolled ? 'is-enrolled' : ''}`}>
                    <div className="course-card__top">
                      <span className="badge">{course.category || 'General'}</span>
                      <span className="course-price">{price === 0 ? 'Free' : `INR ${price.toLocaleString('en-IN')}`}</span>
                    </div>
                    <h3><Link to={`/courses/${course._id}`}>{course.title}</Link></h3>
                    <p>{course.description}</p>
                    <div className="course-card__meta">
                      <div>
                        <span className="meta-label">Instructor</span>
                        <strong>{course.instructor?.name || 'Unknown'}</strong>
                      </div>
                      {rating > 0 && (
                        <div>
                          <span className="meta-label">Rating</span>
                          <strong>{rating.toFixed(1)} ★</strong>
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
                        <Link
                          to="/login"
                          state={{ from: price === 0 ? `/courses/${course._id}` : `/checkout?courseId=${course._id}` }}
                          className="btn btn-primary"
                        >
                          Login to enroll
                        </Link>
                      ) : user.role !== 'student' ? null : price === 0 ? (
                        <Link to={`/courses/${course._id}`} className="btn btn-primary">
                          Enroll
                        </Link>
                      ) : (
                        <Link to={`/checkout?courseId=${course._id}`} className="btn btn-primary">
                          Pay & enroll
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {totalPages > 1 && (
              <nav className="courses-pagination" aria-label="Course catalog pages">
                <button className="btn btn-secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading}>
                  Previous
                </button>
                <span aria-live="polite">Page {page} of {totalPages}</span>
                <button className="btn btn-secondary" type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading}>
                  Next
                </button>
              </nav>
            )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Courses;
