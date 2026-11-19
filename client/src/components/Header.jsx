import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import logo from '../assets/logo.png';
import './Header.css';

const navLinks = [
  { label: 'Courses', to: '/courses' },
  { label: 'Certificates', to: '/certificates' },
  { label: 'About', to: '/about' },
];

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const renderDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'student') {
      return (
        <NavLink to="/dashboard/student" onClick={closeMenu}>
          Student Hub
        </NavLink>
      );
    }
    if (user.role === 'instructor') {
      return (
        <NavLink to="/dashboard/instructor" onClick={closeMenu}>
          Instructor Hub
        </NavLink>
      );
    }
    if (user.role === 'admin') {
      return (
        <NavLink to="/dashboard/admin" onClick={closeMenu}>
          Admin Console
        </NavLink>
      );
    }
    return null;
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <img src={logo} alt="CertifyHub logo" />
          </span>
          <div className="brand-meta">
            <span className="brand-title">CertifyHub</span>
           
          </div>
        </Link>

        <button
          type="button"
          className="header-menu-toggle"
          aria-controls="primary-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>

        <nav id="primary-navigation" className={`primary-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary">
          {navLinks.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              onClick={closeMenu}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
          {renderDashboardLink()}
        </nav>

        <div className="header-utilities">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          {user ? (
            <div className="user-controls">
              <Link to="/profile" className="user-chip" onClick={closeMenu}>
                <span className="chip-label">Signed in</span>
                <strong>{user.name || user.email}</strong>
              </Link>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Start learning
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
