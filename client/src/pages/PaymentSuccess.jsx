import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import './PaymentSuccess.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('courseId');
  return (
    <main className="payment-success-page">
      <section className="payment-success-card">
        <div className="payment-success-mark" aria-hidden="true">✓</div>
        <p className="eyebrow">Enrollment confirmed</p>
        <h1>You're ready to learn.</h1>
        <p>Your payment is confirmed and the course is now in your learning space.</p>
        <div className="payment-success-actions">
          {courseId && <Link className="btn btn-primary" to={`/courses/${courseId}/content`}>Start learning</Link>}
          <Link className="btn btn-secondary" to="/profile">View my profile</Link>
          {!courseId && <Link className="btn btn-secondary" to="/dashboard/student">Go to my courses</Link>}
        </div>
      </section>
    </main>
  );
};

export default PaymentSuccess;
