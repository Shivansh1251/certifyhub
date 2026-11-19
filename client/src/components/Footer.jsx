import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const linkGroups = [
  {
    title: 'Learn',
    links: [
      { label: 'Courses', to: '/courses' },
      { label: 'Certificates', to: '/certificates' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Student dashboard', to: '/dashboard/student' },
      { label: 'Instructor hub', to: '/dashboard/instructor' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
    ],
  },
];

const Footer = () => (
  <footer className="site-footer">
    <div className="footer-grid">
      <div className="footer-brand">
        <h3>CertifyHub</h3>
        <p>Learn practical skills through instructor-led courses, quizzes, assignments, and certificates.</p>
      </div>

      {linkGroups.map((group) => (
        <div className="footer-links" key={group.title}>
          <h4>{group.title}</h4>
          <ul>
            {group.links.map((link) => (
              <li key={link.label}>
                <Link to={link.to}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}

    </div>

    <div className="footer-bottom">
      <p>© {new Date().getFullYear()} CertifyHub. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer;
