import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiRequest from '../utils/api';
import './CreateCourse.css';

const CreateCourse = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [prerequisites, setPrerequisites] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const createdCourse = await apiRequest(
        '/courses',
        'POST',
        {
          title: title.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          prerequisites: prerequisites.split('\n').map(item => item.trim()).filter(Boolean),
          learningOutcomes: learningOutcomes.split('\n').map(item => item.trim()).filter(Boolean),
          estimatedDurationHours: estimatedDurationHours === '' ? null : Number(estimatedDurationHours),
          modules: [],
        },
        true
      );
      navigate(createdCourse?._id ? `/courses/${createdCourse._id}/edit` : '/dashboard/instructor');
    } catch (err) {
      setError(err.message || 'Course could not be created. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="create-course-page">
      <header className="create-course-heading">
        <p className="eyebrow">Instructor workspace</p>
        <h1>Create a course</h1>
        <p>Set learner expectations now, then add lessons, sample resources, quizzes, and graded projects to your course.</p>
      </header>
      <form id="create-course-form" onSubmit={handleSubmit}>
        {error && <div className="create-course-error" role="alert">{error}</div>}
        <div className="create-course-field">
          <label htmlFor="title">Course title</label>
          <input
            type="text"
            id="title"
            required
            maxLength={120}
            placeholder="e.g. Modern Web Development"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="create-course-field">
          <label htmlFor="description">Course description</label>
          <textarea
            id="description"
            required
            maxLength={3000}
            rows={6}
            placeholder="What will learners be able to do after completing this course?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="create-course-field">
          <label htmlFor="prerequisites">Prerequisites <span>(optional)</span></label>
          <textarea
            id="prerequisites"
            rows={3}
            placeholder="One prerequisite per line, e.g. Basic JavaScript"
            value={prerequisites}
            onChange={(e) => setPrerequisites(e.target.value)}
          />
          <small>Tell learners what they should know or prepare before starting.</small>
        </div>
        <div className="create-course-field">
          <label htmlFor="learning-outcomes">Learning outcomes <span>(optional)</span></label>
          <textarea
            id="learning-outcomes"
            rows={4}
            placeholder="One outcome per line, e.g. Design and query a normalized database"
            value={learningOutcomes}
            onChange={(e) => setLearningOutcomes(e.target.value)}
          />
          <small>Describe what learners will be able to do by the end of the course.</small>
        </div>
        <div className="create-course-form-row">
          <div className="create-course-field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              <option value="Development">Development</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Business">Business</option>
              <option value="Data Science">Data Science</option>
              <option value="Programming">Programming</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
          <div className="create-course-field">
            <label htmlFor="price">Price (INR)</label>
            <input
              type="number"
              id="price"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
            <small>Set the price to 0 to offer this course for free.</small>
          </div>
          <div className="create-course-field">
            <label htmlFor="estimated-duration">Estimated study time (hours)</label>
            <input
              type="number"
              id="estimated-duration"
              min="0"
              step="0.5"
              placeholder="e.g. 12"
              value={estimatedDurationHours}
              onChange={(e) => setEstimatedDurationHours(e.target.value)}
            />
            <small>Include lesson time, practice, and project work.</small>
          </div>
        </div>
        <div className="create-course-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard/instructor')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving || !title.trim() || !description.trim()}>
            {isSaving ? 'Creating course…' : 'Create course'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
