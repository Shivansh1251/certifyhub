import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiRequest, { serverUrl } from '../utils/api';
import useAuth from '../hooks/useAuth';
import QuizTaker from '../components/QuizTaker';
import QuizResults from '../components/QuizResults';
import FlashcardGame from '../components/FlashcardGame';
import './CourseContent.css';

const getVideoEmbedUrl = (source) => {
  if (!source) return null;
  try {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const videoId = url.searchParams.get('v');
      const pathMatch = url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);
      const id = videoId || pathMatch?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === 'youtube-nocookie.com' && url.pathname.startsWith('/embed/')) return url.toString();
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const videoId = url.pathname.split('/').filter(Boolean)[0];
      const id = host === 'player.vimeo.com' ? url.pathname.split('/').filter(Boolean)[1] : videoId;
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch (error) {
    return null;
  }
  return null;
};

const CourseContent = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [completed, setCompleted] = useState([]);
  const [modules, setModules] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [certificateStatus, setCertificateStatus] = useState(null);
  const [completionInfo, setCompletionInfo] = useState(null);
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewer, setViewer] = useState({ open: false, lesson: null });
  const [personalNotes, setPersonalNotes] = useState({});
  const [lessonNote, setLessonNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteMessage, setNoteMessage] = useState('');
  const [quizViewer, setQuizViewer] = useState({ open: false, quiz: null, attempts: [] });
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizResult, setQuizResult] = useState(null);
  const [assignmentViewer, setAssignmentViewer] = useState({ open: false, assignment: null, submissions: [] });
  const [quizCreator, setQuizCreator] = useState({ open: false, moduleId: null });
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    timeLimit: 30,
    passingScore: 60,
    attemptLimit: 1,
    shuffleQuestions: false,
    questions: [
      { 
        text: '', 
        options: { optionA: '', optionB: '', optionC: '', optionD: '' }, 
        correctAnswer: 'A', 
        points: 1,
        explanation: '',
      }
    ],
  });
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [assignmentSubmission, setAssignmentSubmission] = useState("");
  const [assignmentFile, setAssignmentFile] = useState(null);

  useEffect(() => {
    if (user && user._id) {
      fetchContent();
    }
  }, [user, id]);

  const fetchContent = async () => {
    try {
      setErrorMsg("");
      const data = await apiRequest(`/courses/${id}/content`, 'GET', null, true);
      setModules(data.modules || []);
      setCompleted(data.completedModules || []);
      setCourse(data.course || null);
      setPersonalNotes(data.personalNotes || {});
      setProgressPercent(Number(data.progress) || 0);
      if (user?.role === 'student') {
        try {
          const completion = await apiRequest(`/courses/${id}/check-completion`, 'POST', null, true);
          setCompletionInfo(completion);
          setCertificateStatus(completion.certificateGenerated ? completion.certificate : null);
          if (completion.certificateIssuedNow) {
            setStatusMsg('Course complete — your certificate is ready.');
          }
        } catch (completionError) {
          console.error('Could not check certificate eligibility', completionError);
        }
      }
    } catch (err) {
      setErrorMsg('Failed to load course content: ' + err.message);
      console.error('Failed to load course content', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openLesson = (lesson) => {
    setLessonNote(personalNotes[lesson._id] || '');
    setNoteMessage('');
    setViewer({ open: true, lesson });
  };

  const handleSaveLessonNote = async () => {
    if (!viewer.lesson) return;
    try {
      setNoteSaving(true);
      const result = await apiRequest(`/courses/${id}/lessons/${viewer.lesson._id}/notes`, 'PUT', { note: lessonNote }, true);
      setPersonalNotes(previous => ({ ...previous, [viewer.lesson._id]: result.note }));
      setStatusMsg(result.message || 'Note saved.');
      setNoteMessage(result.message || 'Note saved.');
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Could not save your note: ' + err.message);
      setNoteMessage('Could not save your note: ' + err.message);
    } finally {
      setNoteSaving(false);
    }
  };


  const handleCheck = async (moduleId, checked) => {
    try {
      setStatusMsg(checked ? "Marking as complete..." : "Marking as incomplete...");
      setErrorMsg("");
      let resp;
      if (checked) {
        resp = await apiRequest(`/courses/${id}/modules/${moduleId}/complete`, 'POST', null, true);
      } else {
        resp = await apiRequest(`/courses/${id}/modules/${moduleId}/incomplete`, 'POST', null, true);
      }
      setStatusMsg(resp && resp.message ? resp.message : "Progress updated.");
      console.log("Progress API response:", resp);
      // Always refetch content to get latest progress
      await fetchContent();
    } catch (err) {
      setErrorMsg('Failed to update progress: ' + err.message);
      setStatusMsg("");
      console.error('Failed to update progress', err);
    }
  };

  const handleTakeQuiz = async (quizId) => {
    setErrorMsg('');
    setQuizResult(null);
    setActiveQuizId(quizId);
  };

  const handleQuizComplete = async (result) => {
    setActiveQuizId(null);
    setQuizResult(result);
    setStatusMsg(`Quiz submitted · ${result.percentage}%${result.isPassed ? ' · passed' : ''}`);
    await fetchContent();
  };

  const handleViewQuizAttempts = async (quiz) => {
    try {
      const data = await apiRequest(`/quizzes/${quiz._id}/attempts`, 'GET', null, true);
      setQuizViewer({ open: true, quiz, attempts: data.attempts || [] });
    } catch (err) {
      setErrorMsg('Could not load quiz attempts: ' + err.message);
    }
  };

  const handleSubmitAssignment = async () => {
    try {
      setErrorMsg("");
      const submission = new FormData();
      if (assignmentFile) submission.append('file', assignmentFile);
      if (assignmentSubmission.trim()) submission.append('submission', assignmentSubmission.trim());
      await apiRequest(`/assignments/${assignmentViewer.assignment._id}/submit`, 'POST', submission, true);
      alert("Assignment submitted successfully!");
      closeAssignmentViewer();
      await fetchContent();
    } catch (err) {
      setErrorMsg('Failed to submit assignment: ' + err.message);
      console.error('Failed to submit assignment', err);
    }
  };

  const openAssignment = (assignment) => {
    setAssignmentSubmission('');
    setAssignmentFile(null);
    setAssignmentViewer({ open: true, assignment, submission: assignment.userSubmission, submissions: [] });
  };

  const closeAssignmentViewer = () => {
    setAssignmentViewer({ open: false, assignment: null, submissions: [] });
    setAssignmentSubmission('');
    setAssignmentFile(null);
  };

  const handleViewSubmissions = async (assignment) => {
    try {
      setErrorMsg("");
      const data = await apiRequest(`/assignments/${assignment._id}/submissions`, 'GET', null, true);
      setAssignmentFile(null);
      setAssignmentSubmission('');
      setAssignmentViewer({ open: true, assignment, submissions: data.submissions || [] });
    } catch (err) {
      setErrorMsg('Failed to load submissions: ' + err.message);
      console.error('Failed to load submissions', err);
    }
  };

  const handleGradeSubmission = async (studentId, grade) => {
    try {
      await apiRequest(`/assignments/${assignmentViewer.assignment._id}/grade/${studentId}`, 'PUT', { grade }, true);
      setStatusMsg("Submission graded successfully!");
      // Refresh submissions
      if (assignmentViewer.assignment) {
        await handleViewSubmissions(assignmentViewer.assignment);
      }
    } catch (err) {
      setErrorMsg('Failed to grade submission: ' + err.message);
      console.error('Failed to grade submission', err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await apiRequest(`/assignments/${assignmentId}`, 'DELETE', null, true);
      setStatusMsg("Assignment deleted successfully!");
      await fetchContent();
    } catch (err) {
      setErrorMsg('Failed to delete assignment: ' + err.message);
      console.error('Failed to delete assignment', err);
    }
  };

  const handleCreateQuiz = (moduleId) => {
    setQuizCreator({ open: true, moduleId });
    setNewQuiz({
      title: '',
      description: '',
      questions: [
        { 
          text: '', 
          options: { optionA: '', optionB: '', optionC: '', optionD: '' }, 
          correctAnswer: 'A', 
          points: 1,
          explanation: '',
        }
      ],
      timeLimit: 30,
      passingScore: 60,
      attemptLimit: 1,
      shuffleQuestions: false,
    });
  };

  const handleAddQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { 
        text: '', 
        options: { optionA: '', optionB: '', optionC: '', optionD: '' }, 
        correctAnswer: 'A', 
        points: 1,
        explanation: '',
      }]
    }));
  };

  const handleRemoveQuestion = (index) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleQuestionChange = (index, field, value) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleOptionChange = (questionIndex, optionKey, value) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) =>
        i === questionIndex
          ? { ...q, options: { ...q.options, [optionKey]: value } }
          : q
      )
    }));
  };

  const handleSaveQuiz = async () => {
    try {
      setErrorMsg("");

      // Validate quiz data
      if (!newQuiz.title.trim() || !newQuiz.description.trim()) {
        setErrorMsg("Quiz title and description are required");
        return;
      }

      if (newQuiz.questions.some(q => !q.text.trim() || Object.values(q.options).some(opt => !opt.trim()))) {
        setErrorMsg("All questions and options must be filled");
        return;
      }
      if (newQuiz.questions.length > 100 || newQuiz.questions.some(question => !Number.isFinite(Number(question.points)) || Number(question.points) <= 0)) {
        setErrorMsg("Use 1 to 100 questions, with at least 1 point per question");
        return;
      }
      if (newQuiz.passingScore === '' || !Number.isFinite(Number(newQuiz.passingScore)) || Number(newQuiz.passingScore) < 0 || Number(newQuiz.passingScore) > 100) {
        setErrorMsg("Passing score must be between 0 and 100");
        return;
      }
      if (newQuiz.attemptLimit === '' || !Number.isInteger(Number(newQuiz.attemptLimit)) || Number(newQuiz.attemptLimit) < 1 || Number(newQuiz.attemptLimit) > 10) {
        setErrorMsg("Attempt limit must be between 1 and 10");
        return;
      }
      if (newQuiz.timeLimit !== '' && (!Number.isInteger(Number(newQuiz.timeLimit)) || Number(newQuiz.timeLimit) < 1 || Number(newQuiz.timeLimit) > 180)) {
        setErrorMsg("Time limit must be between 1 and 180 minutes, or left blank");
        return;
      }

      await apiRequest('/quizzes', 'POST', {
        title: newQuiz.title,
        description: newQuiz.description,
        questions: newQuiz.questions,
        courseId: id,
        moduleId: quizCreator.moduleId,
        timeLimit: newQuiz.timeLimit === '' ? null : Number(newQuiz.timeLimit),
        passingScore: Number(newQuiz.passingScore),
        attemptLimit: Number(newQuiz.attemptLimit),
        shuffleQuestions: newQuiz.shuffleQuestions,
      }, true);

      setStatusMsg("Quiz created successfully!");
      setQuizCreator({ open: false, moduleId: null });
      await fetchContent();
    } catch (err) {
      setErrorMsg('Failed to create quiz: ' + err.message);
      console.error('Failed to create quiz', err);
    }
  };

  const isInstructor = Boolean(user && course && (user.role === 'admin' || user._id === course.instructor?._id));

  if (isLoading) return <div className="course-content-page"><p className="muted-row">Loading your course…</p></div>;

  return (
  <div className="course-content-page">
      <header className="course-content-header">
        <div>
          <p className="eyebrow">Your learning space</p>
          <h2>{course ? course.title : 'Course Content'}</h2>
          <p className="course-content-subtitle">Work through each module, review the lesson resources, and track your progress as you go.</p>
        </div>
        <div className="course-progress-summary"><strong>{Math.round(progressPercent)}%</strong><span>course progress</span></div>
      </header>
      {statusMsg && <div className="course-message success" role="status">{statusMsg}</div>}
      {errorMsg && <div className="course-message error" role="alert">{errorMsg}</div>}
      <div className="progress-bar">
        <div className="progress" style={{ width: `${progressPercent}%` }} />
      </div>
      {certificateStatus && (
        <section className="course-certificate-notice" role="status">
          <div><span aria-hidden="true">🏆</span><div><h3>Certificate earned</h3><p>Your certificate for {course?.title || 'this course'} is ready.</p></div></div>
          <Link to="/certificates" className="btn btn-primary">View certificate</Link>
        </section>
      )}
      {completionInfo?.completed && !certificateStatus && (
        <section className="course-certificate-pending" role="status">
          <div><h3>Course complete · 100%</h3><p>{completionInfo.certificateReason || 'Your certificate could not be issued yet. Check again in a moment.'}</p></div>
          <button type="button" className="btn btn-secondary" onClick={fetchContent}>Check again</button>
        </section>
      )}
      {modules.length === 0 && <div className="empty-course-state"><h3>Course content is being prepared</h3><p>Your instructor has not added any modules yet.</p></div>}
      <ul className="modules-list">
        {modules.map((mod) => (
          <li key={mod._id} className="module-item">
            <div className="module-heading">
              <div><span className="module-kicker">Module</span><h3>{mod.title}</h3></div>
              {!isInstructor && <label className="completion-toggle">
              <input
                type="checkbox"
                checked={completed.includes(mod._id)}
                onChange={e => handleCheck(mod._id, e.target.checked)}
              />
              Complete
              </label>}
            </div>
            <div className="module-section">
            <h4>Lessons <span>{mod.lessons?.length || 0}</span></h4>
            <ul className="lesson-list">
              {mod.lessons && mod.lessons.length > 0 ? mod.lessons.map(lesson => (
                <li key={lesson._id} className="lesson-row">
                  <div><strong>{lesson.title}</strong><small>{lesson.contentType}{lesson.duration ? ` · ${lesson.duration} min` : ''}{lesson.summary ? ` · ${lesson.summary}` : ''}</small></div>
                  {lesson.contentType === 'text' && (
                    <button className="secondary-button" onClick={() => openLesson(lesson)}>Open lesson</button>
                  )}
                  {lesson.contentType !== 'text' && (lesson.contentUrl || lesson.content) && <button className="secondary-button" onClick={() => openLesson(lesson)}>Open lesson</button>}
                </li>
              )) : <li className="muted-row">No lessons have been added yet.</li>}
            </ul>
            </div>
            {/* Assignments */}
            {mod.assignments && mod.assignments.length > 0 && (
              <div className="module-section">
                <h4>Assignments <span>{mod.assignments.length}</span></h4>
                <ul className="activity-list">
                  {mod.assignments.map(assignment => (
                    <li key={assignment._id} className="activity-card">
                      <div><strong>{assignment.title}</strong><p>{assignment.description}</p><small>Due {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'Any time'}</small></div>
                      {user && course && course.instructor && (user._id === course.instructor._id || user.role === 'admin') ? (
                        <>
                          <button className="secondary-button" onClick={() => handleViewSubmissions(assignment)}>View submissions</button>
                          <button className="danger-button" onClick={() => handleDeleteAssignment(assignment._id)}>Delete</button>
                        </>
                      ) : (
                        <button className="secondary-button" onClick={() => openAssignment(assignment)}>{assignment.userSubmission ? "View submission" : "Submit assignment"}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Quizzes */}
            {mod.quizzes && mod.quizzes.length > 0 && (
              <div className="module-section">
                <h4>Quizzes <span>{mod.quizzes.length}</span></h4>
                <ul className="activity-list">
                  {mod.quizzes.map(quiz => (
                    <li key={quiz._id} className="activity-card">
                      <div><strong>{quiz.title}</strong><p>{quiz.description}</p><small>
                        {quiz.questions?.length || 0} questions · {quiz.marks || 0} points · Pass mark {quiz.passingScore ?? 60}%
                        {quiz.timeLimit ? ` · ${quiz.timeLimit} min` : ''}
                        {!isInstructor ? ` · ${quiz.attemptsRemaining} attempts left` : ''}
                      </small>
                      {quiz.score !== null && quiz.score !== undefined && (
                        <p className="quiz-score"><strong>Best score:</strong> {quiz.score}%</p>
                      )}
                      </div>
                      {isInstructor ? <button className="secondary-button" onClick={() => handleViewQuizAttempts(quiz)}>View attempts</button> : (
                        <button className="primary-button" disabled={!quiz.attemptsRemaining} onClick={() => handleTakeQuiz(quiz._id)}>{quiz.attemptsRemaining ? 'Start quiz' : 'No attempts left'}</button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Add Quiz Button for Instructors - Always show for debugging */}
            {isInstructor && <div className="module-toolbar"><button className="primary-button" onClick={() => handleCreateQuiz(mod._id)}>+ Create quiz</button></div>}
          </li>
        ))}
      </ul>
      {/* Modal Viewer */}
      {viewer.open && (
        <div className="dialog-backdrop" onClick={() => setViewer({ open: false, lesson: null })}>
          <div className="lesson-dialog" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setViewer({ open: false, lesson: null })} aria-label="Close lesson">×</button>
            <div className="lesson-dialog-content">
              <p className="eyebrow">Lesson</p>
              <h3>{viewer.lesson?.title}</h3>
              {viewer.lesson?.summary && <p className="lesson-summary">{viewer.lesson.summary}</p>}
              {viewer.lesson?.duration > 0 && <span className="lesson-duration">About {viewer.lesson.duration} minutes</span>}
              {viewer.lesson?.objectives?.length > 0 && (
                <div className="lesson-info-block">
                  <strong>Learning objectives</strong>
                  <ul>{viewer.lesson.objectives.map((objective, index) => <li key={index}>{objective}</li>)}</ul>
                </div>
              )}
              {(viewer.lesson?.imageUrl || (viewer.lesson?.contentType === 'image' && viewer.lesson?.contentUrl)) && (
                <figure className="lesson-feature-image">
                  <img
                    src={viewer.lesson.imageUrl?.startsWith('/lesson-illustrations/') ? viewer.lesson.imageUrl : serverUrl(viewer.lesson.imageUrl || viewer.lesson.contentUrl)}
                    alt={viewer.lesson.imageAlt || `${viewer.lesson.title} lesson illustration`}
                    loading="lazy"
                  />
                  {(viewer.lesson.imageCaption || viewer.lesson.summary) && <figcaption>{viewer.lesson.imageCaption || viewer.lesson.summary}</figcaption>}
                </figure>
              )}
              {viewer.lesson?.contentType === 'text' && viewer.lesson.content?.trim() && (
                <section className="lesson-introduction">
                  <h4>Introduction</h4>
                  <p>{viewer.lesson.content}</p>
                </section>
              )}
              {viewer.lesson?.contentSections?.length > 0 && (
                <div className="lesson-chapter-sections">
                  {viewer.lesson.contentSections.map((section, index) => (
                    <section className={`lesson-chapter-section lesson-chapter-section--${section.type || 'theory'}`} key={section._id || `${section.heading}-${index}`}>
                      <span className="lesson-section-label">{{
                        theory: 'Theory',
                        worked_example: 'Worked example',
                        key_terms: 'Key terms',
                        common_mistakes: 'Watch out for',
                        takeaways: 'Chapter recap',
                      }[section.type] || 'Lesson section'}</span>
                      <h4>{section.heading}</h4>
                      <p>{section.body}</p>
                    </section>
                  ))}
                </div>
              )}
              {viewer.lesson?.contentType === 'text' && !viewer.lesson.content?.trim() && !viewer.lesson.contentSections?.length && (
                <div className="lesson-text-content"><em>No lesson text has been added yet.</em></div>
              )}
              {viewer.lesson?.selfChecks?.length > 0 && (
                <section className="lesson-self-checks">
                  <p className="lesson-section-label">Pause and practice</p>
                  <h4>Check your understanding</h4>
                  <p className="self-check-intro">Try to answer each question before revealing the explanation.</p>
                  <ol>{viewer.lesson.selfChecks.map((check, index) => (
                    <li key={check._id || `${check.question}-${index}`}>
                      <strong>{check.question}</strong>
                      <details><summary>Reveal answer</summary><p>{check.answer}</p></details>
                    </li>
                  ))}</ol>
                </section>
              )}
              {viewer.lesson?.games?.length > 0 && (
                <section className="lesson-games">
                  <p className="lesson-section-label">Learn by playing</p>
                  <h4>Practice games</h4>
                  {viewer.lesson.games.map((game, index) => (
                    <FlashcardGame key={game._id || `${game.title}-${index}`} game={game} />
                  ))}
                </section>
              )}
              {viewer.lesson?.notes && <div className="lesson-info-block"><h4>Course notes</h4><p>{viewer.lesson.notes}</p></div>}
              {viewer.lesson?.teachingTips && <div className="lesson-info-block"><h4>Instructor tips</h4><p>{viewer.lesson.teachingTips}</p></div>}
              {viewer.lesson?.resources?.length > 0 && (
                <div className="lesson-info-block">
                  <h4>Reading links and sample files</h4>
                  <ul>{viewer.lesson.resources.map((resource, index) => <li key={index}><a href={serverUrl(resource)} target="_blank" rel="noopener noreferrer">{resource}</a></li>)}</ul>
                </div>
              )}
              {viewer.lesson?.contentType === 'pdf' && viewer.lesson?.contentUrl && (
                <a className="lesson-resource-link" href={serverUrl(viewer.lesson.contentUrl)} target="_blank" rel="noopener noreferrer">Open PDF in a new tab</a>
              )}
              {viewer.lesson?.contentType === 'slide' && viewer.lesson?.contentUrl && (
                <iframe className="lesson-embed" src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(serverUrl(viewer.lesson.contentUrl))}`} title="Presentation viewer" />
              )}
              {viewer.lesson?.contentType === 'doc' && viewer.lesson?.contentUrl && (
                <iframe className="lesson-embed" src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(serverUrl(viewer.lesson.contentUrl))}`} title="Document viewer" />
              )}
              {viewer.lesson?.contentType === 'dataset' && viewer.lesson?.contentUrl && (
                <a className="lesson-resource-link" href={serverUrl(viewer.lesson.contentUrl)} download>Download sample dataset or project file</a>
              )}
              {viewer.lesson?.contentType === 'pages' && viewer.lesson?.contentUrl && (
                <iframe className="lesson-embed" src={serverUrl(viewer.lesson.contentUrl)} title="Lesson viewer" />
              )}
              {viewer.lesson?.contentType === 'video' && viewer.lesson?.contentUrl && (
                getVideoEmbedUrl(viewer.lesson.contentUrl)
                  ? <iframe className="lesson-video" src={getVideoEmbedUrl(viewer.lesson.contentUrl)} title={`${viewer.lesson.title} video`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                  : <video className="lesson-video" src={serverUrl(viewer.lesson.contentUrl)} controls playsInline preload="metadata" />
              )}
              <section className="personal-notes">
                <div><h4>My private notes</h4><p>Only you can see these notes. They stay attached to this lesson.</p></div>
                <textarea value={lessonNote} onChange={event => { setLessonNote(event.target.value); setNoteMessage(''); }} maxLength={10000} rows={5} placeholder="Capture key ideas, questions, or reminders…" />
                <div className="notes-footer"><span>{lessonNote.length}/10,000</span><button className="primary-button" onClick={handleSaveLessonNote} disabled={noteSaving}>{noteSaving ? 'Saving…' : 'Save notes'}</button></div>
                {noteMessage && <p className={`note-feedback ${noteMessage.startsWith('Could not') ? 'error' : 'success'}`} role="status">{noteMessage}</p>}
              </section>
            </div>
          </div>
        </div>
      )}
      {activeQuizId && <div className="dialog-backdrop" onClick={() => setActiveQuizId(null)}><div onClick={event => event.stopPropagation()}><QuizTaker quizId={activeQuizId} onComplete={handleQuizComplete} onCancel={() => setActiveQuizId(null)} /></div></div>}
      {quizResult && <div className="dialog-backdrop" onClick={() => setQuizResult(null)}><div onClick={event => event.stopPropagation()}><QuizResults results={quizResult} quizTitle={quizResult.quizTitle} onClose={() => setQuizResult(null)} onRetakeQuiz={() => { setQuizResult(null); setActiveQuizId(quizResult.quizId); }} /></div></div>}
      {quizViewer.open && (
        <div className="dialog-backdrop" onClick={() => setQuizViewer({ open: false, quiz: null, attempts: [] })}>
          <div className="attempts-dialog" onClick={event => event.stopPropagation()}>
            <button className="dialog-close" onClick={() => setQuizViewer({ open: false, quiz: null, attempts: [] })} aria-label="Close attempts">×</button>
            <p className="eyebrow">Instructor view</p>
            <h3>{quizViewer.quiz?.title} · Attempts</h3>
            {quizViewer.attempts.length === 0 ? <p className="muted-row">No submissions yet.</p> : (
              <div className="attempts-list">{quizViewer.attempts.map((attempt, index) => (
                <article className="attempt-card" key={attempt._id || index}>
                  <header><strong>{attempt.student?.name || 'Student'}</strong><span>{attempt.score}%</span></header>
                  <small>{attempt.student?.email || ''}{attempt.attemptedAt ? ` · ${new Date(attempt.attemptedAt).toLocaleString()}` : ''}{attempt.isAutoSubmit ? ' · Auto-submitted' : ''}</small>
                  {attempt.answers?.length > 0 && <details><summary>Review answers</summary><ol>{attempt.answers.map((answer, answerIndex) => <li key={`${answer.questionIndex}-${answerIndex}`}><strong>{answer.questionText}</strong><p>Selected: {answer.selectedAnswerText || 'No answer'}{answer.isCorrect ? ' · Correct' : ` · Correct answer: ${answer.correctAnswerText}`}</p>{answer.explanation && <small>{answer.explanation}</small>}</li>)}</ol></details>}
                </article>
              ))}</div>
            )}
          </div>
        </div>
      )}
      {/* Assignment Viewer */}
      {assignmentViewer.open && (
        <div className="dialog-backdrop" onClick={closeAssignmentViewer}>
          <div className="dialog-panel assignment-dialog" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={closeAssignmentViewer} aria-label="Close assignment">×</button>
            <h3>{assignmentViewer.assignment?.title}</h3>
            <p>{assignmentViewer.assignment?.description}</p>
            {assignmentViewer.assignment?.questions?.length > 0 && (
              <section className="assignment-brief">
                <h4>Project tasks</h4>
                <ol>{assignmentViewer.assignment.questions.map((question, index) => <li key={index}>{question.question}</li>)}</ol>
              </section>
            )}
            {assignmentViewer.assignment?.rubric?.length > 0 && (
              <section className="assignment-rubric">
                <h4>Grading rubric</h4>
                <ul>{assignmentViewer.assignment.rubric.map((criterion, index) => (
                  <li key={`${criterion.criterion}-${index}`}>
                    <div><strong>{criterion.criterion}</strong>{criterion.description && <p>{criterion.description}</p>}</div>
                    <span>{criterion.points} pts</span>
                  </li>
                ))}</ul>
              </section>
            )}
            {assignmentViewer.submissions && assignmentViewer.submissions.length > 0 ? (
              <div>
                <h4>Submissions</h4>
                <ul>
                  {assignmentViewer.submissions.map(sub => (
                    <li key={sub._id} style={{ marginBottom: 8 }}>
                      <p><strong>Student:</strong> {sub.student.name} ({sub.student.email})</p>
                      <p><strong>Submission:</strong> {sub.submission?.startsWith('/uploads/') ? <a href={serverUrl(sub.submission)} target="_blank" rel="noopener noreferrer">Open submitted file</a> : sub.submission}</p>
                      <p><strong>Grade:</strong> {sub.grade !== undefined ? sub.grade : 'Assignment to be graded'}</p>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Enter grade"
                        onChange={e => sub.tempGrade = e.target.value}
                        style={{ width: 100, marginRight: 8 }}
                      />
                      <button onClick={() => handleGradeSubmission(sub.student._id, sub.tempGrade)}>Submit Grade</button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : assignmentViewer.submission ? (
              <div>
                <h4>Your Submission</h4>
                <p>{assignmentViewer.submission.submission?.startsWith('/uploads/') ? <a href={serverUrl(assignmentViewer.submission.submission)} target="_blank" rel="noopener noreferrer">Open submitted file</a> : assignmentViewer.submission.submission}</p>
                <p><strong>Grade:</strong> {assignmentViewer.submission.grade !== undefined ? assignmentViewer.submission.grade : 'Assignment to be graded'}</p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); handleSubmitAssignment(); }}>
                <textarea
                  value={assignmentSubmission}
                  onChange={e => setAssignmentSubmission(e.target.value)}
                  placeholder="Describe your work or add a written response"
                  rows={10}
                  style={{ width: '100%' }}
                  required={!assignmentFile}
                />
                <label className="assignment-file-field">Project file <span>PDF, Word, text, or image · max 10 MB</span>
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" onChange={event => setAssignmentFile(event.target.files?.[0] || null)} />
                </label>
                {assignmentFile && <p className="assignment-file-name">Selected: {assignmentFile.name}</p>}
                <button type="submit" disabled={!assignmentSubmission.trim() && !assignmentFile}>Submit assignment</button>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Quiz Creator Modal */}
      {quizCreator.open && (
        <div className="dialog-backdrop" onClick={() => setQuizCreator({ open: false, moduleId: null })}>
          <div className="dialog-panel quiz-creator-dialog" onClick={e => e.stopPropagation()}>
            <button className="dialog-close" onClick={() => setQuizCreator({ open: false, moduleId: null })} aria-label="Close quiz creator">×</button>
            <h3>Create New Quiz</h3>

            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Quiz Title"
                value={newQuiz.title}
                onChange={e => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                required
              />
              <textarea
                placeholder="Quiz Description"
                value={newQuiz.description}
                onChange={e => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                style={{ width: '100%', padding: '8px', marginBottom: '8px', minHeight: '80px' }}
                required
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label>Time Limit (minutes):</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={newQuiz.timeLimit}
                  onChange={e => setNewQuiz(prev => ({ ...prev, timeLimit: e.target.value === '' ? '' : Number(e.target.value) }))}
                  style={{ width: '80px', padding: '4px' }}
                />
              </div>
              <div className="quiz-settings-grid">
                <label>Passing score (%)<input type="number" min="0" max="100" value={newQuiz.passingScore} onChange={e => setNewQuiz(prev => ({ ...prev, passingScore: e.target.value === '' ? '' : Number(e.target.value) }))} /></label>
                <label>Attempts per learner<input type="number" min="1" max="10" value={newQuiz.attemptLimit} onChange={e => setNewQuiz(prev => ({ ...prev, attemptLimit: e.target.value === '' ? '' : Number(e.target.value) }))} /></label>
                <label className="checkbox-setting"><input type="checkbox" checked={newQuiz.shuffleQuestions} onChange={e => setNewQuiz(prev => ({ ...prev, shuffleQuestions: e.target.checked }))} /> Shuffle questions for each attempt</label>
              </div>
            </div>

            <h4>Questions</h4>
            {newQuiz.questions.map((question, qIndex) => (
              <div key={qIndex} style={{ marginBottom: 20, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong>Question {qIndex + 1}</strong>
                  {newQuiz.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIndex)}
                      style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Question text"
                  value={question.text}
                  onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)}
                  style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
                  required
                />

                <div style={{ marginBottom: 8 }}>
                  <label>Options:</label>
                  {Object.entries(question.options).map(([key, value], optIndex) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        value={key}
                        checked={question.correctAnswer === key}
                        onChange={() => handleQuestionChange(qIndex, 'correctAnswer', key)}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${key.toUpperCase()}`}
                        value={value}
                        onChange={e => handleOptionChange(qIndex, key, e.target.value)}
                        style={{ marginLeft: 8, flex: 1, padding: '4px' }}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label>Points:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={question.points}
                    onChange={e => handleQuestionChange(qIndex, 'points', parseInt(e.target.value))}
                    style={{ width: '60px', padding: '4px' }}
                  />
                </div>
                <textarea className="explanation-input" placeholder="Answer explanation shown after submission (optional)" value={question.explanation || ''} onChange={e => handleQuestionChange(qIndex, 'explanation', e.target.value)} rows={2} />
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddQuestion}
              style={{ backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', marginBottom: '16px' }}
            >
              + Add Question
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSaveQuiz}
                style={{ backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px' }}
              >
                Create Quiz
              </button>
              <button
                onClick={() => setQuizCreator({ open: false, moduleId: null })}
                style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseContent;
