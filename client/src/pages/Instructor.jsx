import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import './Instructor.css';

const Instructor = () => {
  const { user } = useAuth();
  const canTeach = user?.role === 'instructor' || user?.role === 'admin';

  return (
    <main className="instructor-landing">
      <section className="instructor-landing-hero">
        <p className="eyebrow">Teach on CertifyHub</p>
        <h1>Turn what you know into learning that moves people forward.</h1>
        <p>Build structured courses, teach with lessons and assessments, and see how learners progress from one place.</p>
        <div className="instructor-landing-actions">
          {canTeach ? (
            <>
              <Link className="btn btn-primary" to={user.role === 'admin' ? '/dashboard/admin' : '/dashboard/instructor'}>Open dashboard</Link>
              <Link className="btn btn-secondary" to="/create-course">Create a course</Link>
            </>
          ) : user ? (
            <Link className="btn btn-primary" to="/courses">Explore courses</Link>
          ) : (
            <>
              <Link className="btn btn-primary" to="/login" state={{ from: '/instructor' }}>Sign in</Link>
              <Link className="btn btn-secondary" to="/register">Create an account</Link>
            </>
          )}
        </div>
      </section>

      <section className="instructor-landing-grid" aria-label="Teaching tools">
        <article><span aria-hidden="true">01</span><h2>Build a course</h2><p>Organize modules and lessons, then add notes, resources, and video links for learners.</p></article>
        <article><span aria-hidden="true">02</span><h2>Teach with practice</h2><p>Use quizzes and assignments to help learners apply each new skill as they go.</p></article>
        <article><span aria-hidden="true">03</span><h2>Track progress</h2><p>Review enrollment, course activity, ratings, and student work from your instructor dashboard.</p></article>
      </section>
    </main>
  );
};

export default Instructor;
