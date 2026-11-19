import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiRequest, { API_BASE, serverUrl } from '../utils/api';
import './EditCourse.css';

const EditCourse = () => {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [courseDraft, setCourseDraft] = useState({ title: '', description: '', category: '', price: 0, prerequisites: '', learningOutcomes: '', estimatedDurationHours: '' });
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState('');
  const [modules, setModules] = useState([]);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [progress, setProgress] = useState([]);
  const [progressModules, setProgressModules] = useState([]);
  const [lessonInputs, setLessonInputs] = useState({}); // { [moduleId]: { title, contentType, content, file } }
  const [chapterEdits, setChapterEdits] = useState({});
  const [assignmentInputs, setAssignmentInputs] = useState({}); // { [moduleId]: { title, description, dueDate, questions } }


  useEffect(() => {
    fetchCourse();
    fetchProgress();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const data = await apiRequest(`/courses/${id}`, 'GET', null, true);
      setCourse(data);
      setModules(data.modules || []);
      setCourseDraft({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        price: data.price ?? 0,
        prerequisites: (data.prerequisites || []).join('\n'),
        learningOutcomes: (data.learningOutcomes || []).join('\n'),
        estimatedDurationHours: data.estimatedDurationHours ?? '',
      });
    } catch (err) {
      console.error('Failed to load course', err);
    }
  };

  const handleCourseDraftChange = (field, value) => {
    setCourseDraft(previous => ({ ...previous, [field]: value }));
    setOverviewMessage('');
  };

  const handleSaveOverview = async (event) => {
    event.preventDefault();
    setOverviewSaving(true);
    setOverviewMessage('');
    try {
      const updatedCourse = await apiRequest(`/courses/${id}`, 'PUT', {
        ...courseDraft,
        price: Number(courseDraft.price),
        prerequisites: courseDraft.prerequisites.split('\n').map(item => item.trim()).filter(Boolean),
        learningOutcomes: courseDraft.learningOutcomes.split('\n').map(item => item.trim()).filter(Boolean),
        estimatedDurationHours: courseDraft.estimatedDurationHours === '' ? null : Number(courseDraft.estimatedDurationHours),
      }, true);
      setCourse(previous => ({ ...previous, ...updatedCourse }));
      setOverviewMessage('Course overview saved.');
    } catch (error) {
      setOverviewMessage(error.message || 'Could not save the course overview.');
    } finally {
      setOverviewSaving(false);
    }
  };


  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    try {
      const res = await apiRequest(`/courses/${id}/modules`, 'POST', { title: newModuleTitle }, true);
      setModules(res.modules || []);
      setNewModuleTitle('');
    } catch (err) {
      alert('Failed to add module.');
      console.error(err);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module?')) return;
    try {
      const res = await apiRequest(`/courses/${id}/modules/${moduleId}`, 'DELETE', null, true);
      setModules(res.modules || []);
    } catch (err) {
      alert('Failed to delete module.');
      console.error(err);
    }
  };


  const handleUpload = async (moduleId, e) => {
    const formData = new FormData();
    const ppt = e.target.ppt.files[0];
    const pdf = e.target.pdf.files[0];
    if (ppt) formData.append('ppt', ppt);
    if (pdf) formData.append('pdf', pdf);
    try {
      await fetch(`${API_BASE}/courses/${id}/modules/${moduleId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      fetchCourse();
    } catch (err) {
      alert('Failed to upload files.');
      console.error(err);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await apiRequest(`/courses/${id}/progress`, 'GET', null, true);
      setProgress(res.students || []);
      setProgressModules(res.modules || []);
    } catch (err) {
      setProgress([]);
      setProgressModules([]);
    }
  };

  if (!course) return <p>Loading...</p>;

  const handleLessonInput = (moduleId, field, value) => {
    setLessonInputs(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [field]: value }
    }));
  };

  const handleDraftListItem = (moduleId, field, index, patch) => {
    const currentItems = lessonInputs[moduleId]?.[field] || [];
    handleLessonInput(moduleId, field, currentItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const removeDraftListItem = (moduleId, field, index) => {
    const currentItems = lessonInputs[moduleId]?.[field] || [];
    handleLessonInput(moduleId, field, currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  const beginChapterEdit = (lesson) => {
    setChapterEdits(previous => ({
      ...previous,
      [lesson._id]: {
        contentSections: (lesson.contentSections || []).map(section => ({ type: section.type || 'theory', heading: section.heading || '', body: section.body || '' })),
        selfChecks: (lesson.selfChecks || []).map(check => ({ question: check.question || '', answer: check.answer || '' })),
        games: (lesson.games || []).map(game => ({ title: game.title || '', instructions: game.instructions || '', cards: (game.cards || []).map(card => ({ front: card.front || '', back: card.back || '' })) })),
        imageUrl: lesson.imageUrl || '',
        imageAlt: lesson.imageAlt || '',
        imageCaption: lesson.imageCaption || '',
      },
    }));
  };

  const handleChapterListItem = (lessonId, field, index, patch) => {
    setChapterEdits(previous => {
      const items = previous[lessonId]?.[field] || [];
      return { ...previous, [lessonId]: { ...previous[lessonId], [field]: items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) } };
    });
  };

  const handleChapterField = (lessonId, field, value) => {
    setChapterEdits(previous => ({ ...previous, [lessonId]: { ...previous[lessonId], [field]: value } }));
  };

  const removeChapterListItem = (lessonId, field, index) => {
    setChapterEdits(previous => ({
      ...previous,
      [lessonId]: { ...previous[lessonId], [field]: previous[lessonId][field].filter((_, itemIndex) => itemIndex !== index) },
    }));
  };

  const handleChapterGameCard = (lessonId, gameIndex, cardIndex, patch) => {
    setChapterEdits(previous => ({
      ...previous,
      [lessonId]: {
        ...previous[lessonId],
        games: previous[lessonId].games.map((game, index) => index !== gameIndex ? game : ({
          ...game,
          cards: game.cards.map((card, cardPosition) => cardPosition === cardIndex ? { ...card, ...patch } : card),
        })),
      },
    }));
  };

  const handleDraftGameCard = (moduleId, gameIndex, cardIndex, patch) => {
    const games = lessonInputs[moduleId]?.games || [];
    handleLessonInput(moduleId, 'games', games.map((game, index) => index !== gameIndex ? game : ({
      ...game,
      cards: game.cards.map((card, cardPosition) => cardPosition === cardIndex ? { ...card, ...patch } : card),
    })));
  };

  const handleSaveChapter = async (moduleId, lessonId) => {
    const draft = chapterEdits[lessonId] || { contentSections: [], selfChecks: [], games: [] };
    if (draft.contentSections.some(section => !section.heading.trim() || !section.body.trim())) {
      return alert('Every chapter section needs a heading and teaching text.');
    }
    if (draft.selfChecks.some(check => !check.question.trim() || !check.answer.trim())) {
      return alert('Every self-check needs a question and an answer.');
    }
    if (draft.games.some(game => !game.title.trim() || game.cards.length < 2 || game.cards.some(card => !card.front.trim() || !card.back.trim()))) {
      return alert('Each flashcard game needs a title and at least two complete cards.');
    }
    try {
      await apiRequest(`/courses/${id}/modules/${moduleId}/lessons/${lessonId}`, 'PUT', draft, true);
      setChapterEdits(previous => {
        const next = { ...previous };
        delete next[lessonId];
        return next;
      });
      await fetchCourse();
    } catch (error) {
      alert(error.message || 'Could not save the lesson chapter.');
    }
  };


  const handleAddLesson = async (moduleId) => {
    const input = lessonInputs[moduleId] || {};
    if (!input.title || !input.contentType) return alert('Lesson title and type required');
    let body = {
      title: input.title,
      contentType: input.contentType,
      content: input.content,
      summary: input.summary,
      notes: input.notes,
      teachingTips: input.teachingTips,
      contentSections: input.contentSections || [],
      selfChecks: input.selfChecks || [],
      games: input.games || [],
      imageUrl: input.imageUrl || '',
      imageAlt: input.imageAlt || '',
      imageCaption: input.imageCaption || '',
      objectives: input.objectives,
      resources: input.resources,
      contentUrl: input.contentUrl,
      duration: input.duration,
    };
    if (body.contentSections.some(section => !section.heading.trim() || !section.body.trim())) return alert('Every chapter section needs a heading and teaching text.');
    if (body.selfChecks.some(check => !check.question.trim() || !check.answer.trim())) return alert('Every self-check needs a question and an answer.');
    if (body.games.some(game => !game.title.trim() || game.cards.length < 2 || game.cards.some(card => !card.front.trim() || !card.back.trim()))) return alert('Each flashcard game needs a title and at least two complete cards.');
    if (['video', 'pdf', 'slide', 'doc', 'dataset', 'image'].includes(input.contentType) && !input.file && !input.contentUrl?.trim()) return alert('Add a resource link or choose a file to upload.');
    // For file types, first create lesson, then upload file if present
    let lessonId = null;
    try {
      const res = await apiRequest(`/courses/${id}/modules/${moduleId}/lessons`, 'POST', body, true);
      lessonId = res.lesson?._id || (res.lessons && res.lessons.length ? res.lessons[res.lessons.length - 1]._id : null);
      // If file upload needed
      if (lessonId && input.file && (input.contentType !== 'text')) {
        const formData = new FormData();
        formData.append('file', input.file);
        try {
          await apiRequest(`/courses/${id}/modules/${moduleId}/lessons/${lessonId}/upload`, 'POST', formData, true);
        } catch (uploadErr) {
          try {
            await apiRequest(`/courses/${id}/modules/${moduleId}/lessons/${lessonId}`, 'DELETE', null, true);
          } catch (cleanupErr) {
            console.error('Could not remove the lesson after upload failed:', cleanupErr);
          }
          alert('The lesson file could not be uploaded. Check the file type and size, then try again. ' + uploadErr.message);
          console.error('Upload error:', uploadErr);
          await fetchCourse();
          return;
        }
      }
      fetchCourse();
      setLessonInputs(prev => ({ ...prev, [moduleId]: {} }));
    } catch (err) {
      alert('Failed to add lesson.');
      console.error(err);
    }
  };

  const handleDeleteLesson = async (moduleId, lessonId) => {
    if (!window.confirm('Delete this lesson?')) return;
    try {
      await apiRequest(`/courses/${id}/modules/${moduleId}/lessons/${lessonId}`, 'DELETE', null, true);
      fetchCourse();
    } catch (err) {
      alert('Failed to delete lesson.');
      console.error(err);
    }
  };

  const handleAssignmentInput = (moduleId, field, value) => {
    setAssignmentInputs(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [field]: value }
    }));
  };

  const handleAddAssignment = async (moduleId) => {
    const input = assignmentInputs[moduleId] || {};
    if (!input.title?.trim() || !input.description?.trim() || !input.dueDate) return alert('Assignment title, project brief, and due date are required.');
    const rubric = String(input.rubricText || '').split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const [criterion, points, ...descriptionParts] = line.split('|');
      return { criterion: criterion?.trim() || '', points: Number(points), description: descriptionParts.join('|').trim() };
    });
    if (rubric.some(item => !item.criterion || !Number.isFinite(item.points) || item.points < 0 || item.points > 100)) {
      return alert('Enter each rubric row as: Criterion | points | what good work includes. Points must be from 0 to 100.');
    }
    if (rubric.length > 0 && Math.round(rubric.reduce((total, item) => total + item.points, 0) * 100) / 100 !== 100) {
      return alert('Rubric criteria must add up to 100 points.');
    }
    const passingGrade = input.passingGrade === '' || input.passingGrade === undefined ? undefined : Number(input.passingGrade);
    if (passingGrade !== undefined && (!Number.isFinite(passingGrade) || passingGrade < 0 || passingGrade > 100)) {
      return alert('Passing grade must be between 0 and 100.');
    }
    try {
      await apiRequest(`/assignments`, 'POST', {
        title: input.title.trim(),
        description: input.description.trim(),
        dueDate: input.dueDate,
        questions: input.questions || [],
        rubric,
        passingGrade,
        courseId: id,
        moduleId,
      }, true);
      fetchCourse();
      setAssignmentInputs(prev => ({ ...prev, [moduleId]: {} }));
    } catch (err) {
      alert('Failed to add assignment.');
      console.error(err);
    }
  };

  return (
    <main className="edit-course-page">
      <header className="edit-course-header"><p className="eyebrow">Instructor workspace</p><h2>Edit Course: {course.title}</h2><p>Set learner expectations, organize lessons and sample resources, and add assessments with transparent grading criteria.</p></header>
      <form className="course-overview-editor" onSubmit={handleSaveOverview}>
        <div className="course-overview-editor__heading">
          <div><p className="eyebrow">Course setup</p><h3>Overview and learning plan</h3></div>
          <p>These details help learners decide whether this course is right for them.</p>
        </div>
        <div className="course-overview-editor__grid">
          <label>Course title
            <input required maxLength={120} value={courseDraft.title} onChange={event => handleCourseDraftChange('title', event.target.value)} />
          </label>
          <label>Category
            <select required value={courseDraft.category} onChange={event => handleCourseDraftChange('category', event.target.value)}>
              {['Development', 'Design', 'Marketing', 'Business', 'Data Science', 'Programming', 'Finance'].map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="course-overview-editor__wide">Course description
            <textarea required rows={4} maxLength={3000} value={courseDraft.description} onChange={event => handleCourseDraftChange('description', event.target.value)} />
          </label>
          <label>Price (INR)
            <input type="number" min="0" step="1" required value={courseDraft.price} onChange={event => handleCourseDraftChange('price', event.target.value)} />
          </label>
          <label>Estimated study time (hours)
            <input type="number" min="0" step="0.5" value={courseDraft.estimatedDurationHours} onChange={event => handleCourseDraftChange('estimatedDurationHours', event.target.value)} />
          </label>
          <label>Prerequisites <small>One per line</small>
            <textarea rows={3} value={courseDraft.prerequisites} onChange={event => handleCourseDraftChange('prerequisites', event.target.value)} placeholder="What learners should know before starting" />
          </label>
          <label>Learning outcomes <small>One per line</small>
            <textarea rows={3} value={courseDraft.learningOutcomes} onChange={event => handleCourseDraftChange('learningOutcomes', event.target.value)} placeholder="What learners will be able to do" />
          </label>
        </div>
        <div className="course-overview-editor__footer">
          {overviewMessage && <p role="status" className={overviewMessage.includes('saved') ? 'success' : 'error'}>{overviewMessage}</p>}
          <button type="submit" className="btn btn-primary" disabled={overviewSaving}>{overviewSaving ? 'Saving…' : 'Save overview'}</button>
        </div>
      </form>
      <h3 className="edit-section-title">Modules</h3>
      <ul>
        {modules.map(mod => (
          <li key={mod._id} className="edit-module">
            <div style={{ fontWeight: 600 }}>{mod.title}
              <button onClick={() => handleDeleteModule(mod._id)} style={{ marginLeft: 12 }}>Delete</button>
            </div>
            {/* Lessons List */}
            <ul style={{ marginTop: 8 }}>
              {mod.lessons && mod.lessons.length > 0 ? mod.lessons.map(lesson => (
                <li key={lesson._id} className="edit-lesson-row">
                  <div className="edit-lesson-row__top">
                    <div><strong>{lesson.title}</strong><span>{lesson.contentType}{lesson.summary ? ` · ${lesson.summary}` : ''}</span>
                      {lesson.contentUrl && <a href={serverUrl(lesson.contentUrl)} target="_blank" rel="noopener noreferrer">View material</a>}
                    </div>
                    <div className="edit-lesson-row__actions">
                      <button type="button" onClick={() => beginChapterEdit(lesson)}>{lesson.contentSections?.length ? 'Edit chapter' : 'Add chapter sections'}</button>
                      <button type="button" className="edit-delete-button" onClick={() => handleDeleteLesson(mod._id, lesson._id)}>Delete</button>
                    </div>
                  </div>
                  {chapterEdits[lesson._id] && (
                    <div className="chapter-editor">
                      <h4>Chapter sections</h4>
                      <div className="chapter-editor__image-fields">
                        <label>Lesson image URL<input type="url" placeholder="https://… or /lesson-illustrations/example.svg" value={chapterEdits[lesson._id].imageUrl} onChange={event => handleChapterField(lesson._id, 'imageUrl', event.target.value)} /></label>
                        <label>Image description<input maxLength={300} placeholder="Describe the important information in the image" value={chapterEdits[lesson._id].imageAlt} onChange={event => handleChapterField(lesson._id, 'imageAlt', event.target.value)} /></label>
                        <label>Image caption<input maxLength={500} placeholder="Optional caption shown below the image" value={chapterEdits[lesson._id].imageCaption} onChange={event => handleChapterField(lesson._id, 'imageCaption', event.target.value)} /></label>
                      </div>
                      {chapterEdits[lesson._id].contentSections.map((section, sectionIndex) => (
                        <div className="chapter-editor__item" key={section._id || `section-${sectionIndex}`}>
                          <div className="chapter-editor__item-heading">
                            <select aria-label="Section style" value={section.type} onChange={event => handleChapterListItem(lesson._id, 'contentSections', sectionIndex, { type: event.target.value })}>
                              <option value="theory">Theory</option><option value="worked_example">Worked example</option><option value="key_terms">Key terms</option><option value="common_mistakes">Common mistakes</option><option value="takeaways">Chapter recap</option>
                            </select>
                            <button type="button" className="edit-delete-button" onClick={() => removeChapterListItem(lesson._id, 'contentSections', sectionIndex)}>Remove section</button>
                          </div>
                          <input aria-label="Section heading" maxLength={120} placeholder="Section heading" value={section.heading} onChange={event => handleChapterListItem(lesson._id, 'contentSections', sectionIndex, { heading: event.target.value })} />
                          <textarea aria-label="Section teaching text" maxLength={12000} rows={8} placeholder="Explain the concept, connect it to the lesson, and use paragraphs or numbered steps where useful." value={section.body} onChange={event => handleChapterListItem(lesson._id, 'contentSections', sectionIndex, { body: event.target.value })} />
                        </div>
                      ))}
                      <button type="button" className="chapter-add-button" onClick={() => setChapterEdits(previous => ({ ...previous, [lesson._id]: { ...previous[lesson._id], contentSections: [...previous[lesson._id].contentSections, { type: 'theory', heading: '', body: '' }] } }))}>+ Add section</button>
                      <h4>Self-check questions</h4>
                      {chapterEdits[lesson._id].selfChecks.map((check, checkIndex) => (
                        <div className="chapter-editor__item" key={check._id || `check-${checkIndex}`}>
                          <div className="chapter-editor__item-heading"><strong>Question {checkIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => removeChapterListItem(lesson._id, 'selfChecks', checkIndex)}>Remove question</button></div>
                          <input aria-label="Self-check question" maxLength={500} placeholder="Question" value={check.question} onChange={event => handleChapterListItem(lesson._id, 'selfChecks', checkIndex, { question: event.target.value })} />
                          <textarea aria-label="Self-check answer" maxLength={1500} rows={3} placeholder="Answer and short explanation" value={check.answer} onChange={event => handleChapterListItem(lesson._id, 'selfChecks', checkIndex, { answer: event.target.value })} />
                        </div>
                      ))}
                      <button type="button" className="chapter-add-button" onClick={() => setChapterEdits(previous => ({ ...previous, [lesson._id]: { ...previous[lesson._id], selfChecks: [...previous[lesson._id].selfChecks, { question: '', answer: '' }] } }))}>+ Add self-check</button>
                      <h4>Flashcard games</h4>
                      {chapterEdits[lesson._id].games.map((game, gameIndex) => (
                        <div className="chapter-editor__game" key={game._id || `game-${gameIndex}`}>
                          <div className="chapter-editor__item-heading"><strong>Game {gameIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => removeChapterListItem(lesson._id, 'games', gameIndex)}>Remove game</button></div>
                          <input maxLength={100} placeholder="Game title" value={game.title} onChange={event => handleChapterListItem(lesson._id, 'games', gameIndex, { title: event.target.value })} />
                          <input maxLength={400} placeholder="Instructions" value={game.instructions} onChange={event => handleChapterListItem(lesson._id, 'games', gameIndex, { instructions: event.target.value })} />
                          {game.cards.map((card, cardIndex) => (
                            <div className="chapter-editor__game-card" key={card._id || `card-${cardIndex}`}>
                              <div className="chapter-editor__item-heading"><strong>Flashcard {cardIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => handleChapterListItem(lesson._id, 'games', gameIndex, { cards: game.cards.filter((_, index) => index !== cardIndex) })}>Remove card</button></div>
                              <input maxLength={300} placeholder="Front — term or prompt" value={card.front} onChange={event => handleChapterGameCard(lesson._id, gameIndex, cardIndex, { front: event.target.value })} />
                              <textarea maxLength={2000} rows={3} placeholder="Back — answer or explanation" value={card.back} onChange={event => handleChapterGameCard(lesson._id, gameIndex, cardIndex, { back: event.target.value })} />
                            </div>
                          ))}
                          <button type="button" className="chapter-add-button" onClick={() => handleChapterListItem(lesson._id, 'games', gameIndex, { cards: [...game.cards, { front: '', back: '' }] })}>+ Add card</button>
                        </div>
                      ))}
                      <button type="button" className="chapter-add-button" onClick={() => setChapterEdits(previous => ({ ...previous, [lesson._id]: { ...previous[lesson._id], games: [...previous[lesson._id].games, { type: 'flashcards', title: '', instructions: '', cards: [{ front: '', back: '' }, { front: '', back: '' }] }] } }))}>+ Add flashcard game</button>
                      <div className="chapter-editor__footer">
                        <button type="button" className="chapter-add-button" onClick={() => handleSaveChapter(mod._id, lesson._id)}>Save chapter</button>
                        <button type="button" className="edit-delete-button" onClick={() => setChapterEdits(previous => { const next = { ...previous }; delete next[lesson._id]; return next; })}>Cancel</button>
                      </div>
                    </div>
                  )}
                </li>
              )) : <li style={{ color: '#888' }}>No lessons yet.</li>}
            </ul>
            {/* Add Lesson Form */}
            <div className="lesson-editor">
              <h4>Add a lesson</h4>
              <input type="text" placeholder="Lesson title" value={(lessonInputs[mod._id]?.title) || ''} onChange={e => handleLessonInput(mod._id, 'title', e.target.value)} style={{ marginRight: 8 }} />
              <select value={lessonInputs[mod._id]?.contentType || ''} onChange={e => handleLessonInput(mod._id, 'contentType', e.target.value)} style={{ marginRight: 8 }}>
                <option value="">Type</option>
                <option value="text">Text</option>
                <option value="pdf">PDF</option>
                <option value="slide">Slides</option>
                <option value="doc">Document</option>
                <option value="video">Video</option>
                <option value="dataset">Dataset / sample file</option>
                <option value="image">Image</option>
              </select>
              {lessonInputs[mod._id]?.contentType === 'text' && (
                <textarea placeholder="Lesson teaching text" value={lessonInputs[mod._id]?.content || ''} onChange={e => handleLessonInput(mod._id, 'content', e.target.value)} />
              )}
              <div className="chapter-editor chapter-editor--new">
                <h4>Structured theory sections</h4>
                {(lessonInputs[mod._id]?.contentSections || []).map((section, sectionIndex) => (
                  <div className="chapter-editor__item" key={`new-section-${sectionIndex}`}>
                    <div className="chapter-editor__item-heading">
                      <select aria-label="Section style" value={section.type} onChange={event => handleDraftListItem(mod._id, 'contentSections', sectionIndex, { type: event.target.value })}>
                        <option value="theory">Theory</option><option value="worked_example">Worked example</option><option value="key_terms">Key terms</option><option value="common_mistakes">Common mistakes</option><option value="takeaways">Chapter recap</option>
                      </select>
                      <button type="button" className="edit-delete-button" onClick={() => removeDraftListItem(mod._id, 'contentSections', sectionIndex)}>Remove section</button>
                    </div>
                    <input aria-label="Section heading" maxLength={120} placeholder="Section heading" value={section.heading} onChange={event => handleDraftListItem(mod._id, 'contentSections', sectionIndex, { heading: event.target.value })} />
                    <textarea aria-label="Section teaching text" maxLength={12000} rows={8} placeholder="Teach the concept in a few clear paragraphs." value={section.body} onChange={event => handleDraftListItem(mod._id, 'contentSections', sectionIndex, { body: event.target.value })} />
                  </div>
                ))}
                <button type="button" className="chapter-add-button" onClick={() => handleLessonInput(mod._id, 'contentSections', [...(lessonInputs[mod._id]?.contentSections || []), { type: 'theory', heading: '', body: '' }])}>+ Add section</button>
                <h4>Self-check questions</h4>
                {(lessonInputs[mod._id]?.selfChecks || []).map((check, checkIndex) => (
                  <div className="chapter-editor__item" key={`new-check-${checkIndex}`}>
                    <div className="chapter-editor__item-heading"><strong>Question {checkIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => removeDraftListItem(mod._id, 'selfChecks', checkIndex)}>Remove question</button></div>
                    <input aria-label="Self-check question" maxLength={500} placeholder="Question" value={check.question} onChange={event => handleDraftListItem(mod._id, 'selfChecks', checkIndex, { question: event.target.value })} />
                    <textarea aria-label="Self-check answer" maxLength={1500} rows={3} placeholder="Answer and short explanation" value={check.answer} onChange={event => handleDraftListItem(mod._id, 'selfChecks', checkIndex, { answer: event.target.value })} />
                  </div>
                ))}
                <button type="button" className="chapter-add-button" onClick={() => handleLessonInput(mod._id, 'selfChecks', [...(lessonInputs[mod._id]?.selfChecks || []), { question: '', answer: '' }])}>+ Add self-check</button>
                <h4>Flashcard games</h4>
                {(lessonInputs[mod._id]?.games || []).map((game, gameIndex) => (
                  <div className="chapter-editor__game" key={`new-game-${gameIndex}`}>
                    <div className="chapter-editor__item-heading"><strong>Game {gameIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => removeDraftListItem(mod._id, 'games', gameIndex)}>Remove game</button></div>
                    <input maxLength={100} placeholder="Game title" value={game.title} onChange={event => handleDraftListItem(mod._id, 'games', gameIndex, { title: event.target.value })} />
                    <input maxLength={400} placeholder="Instructions" value={game.instructions} onChange={event => handleDraftListItem(mod._id, 'games', gameIndex, { instructions: event.target.value })} />
                    {game.cards.map((card, cardIndex) => (
                      <div className="chapter-editor__game-card" key={`new-card-${cardIndex}`}>
                        <div className="chapter-editor__item-heading"><strong>Flashcard {cardIndex + 1}</strong><button type="button" className="edit-delete-button" onClick={() => handleDraftListItem(mod._id, 'games', gameIndex, { cards: game.cards.filter((_, index) => index !== cardIndex) })}>Remove card</button></div>
                        <input maxLength={300} placeholder="Front — term or prompt" value={card.front} onChange={event => handleDraftGameCard(mod._id, gameIndex, cardIndex, { front: event.target.value })} />
                        <textarea maxLength={2000} rows={3} placeholder="Back — answer or explanation" value={card.back} onChange={event => handleDraftGameCard(mod._id, gameIndex, cardIndex, { back: event.target.value })} />
                      </div>
                    ))}
                    <button type="button" className="chapter-add-button" onClick={() => handleDraftListItem(mod._id, 'games', gameIndex, { cards: [...game.cards, { front: '', back: '' }] })}>+ Add card</button>
                  </div>
                ))}
                <button type="button" className="chapter-add-button" onClick={() => handleLessonInput(mod._id, 'games', [...(lessonInputs[mod._id]?.games || []), { type: 'flashcards', title: '', instructions: '', cards: [{ front: '', back: '' }, { front: '', back: '' }] }])}>+ Add flashcard game</button>
              </div>
              <label className="lesson-image-fields">Lesson image URL<input type="url" placeholder="https://… or /lesson-illustrations/example.svg" value={lessonInputs[mod._id]?.imageUrl || ''} onChange={event => handleLessonInput(mod._id, 'imageUrl', event.target.value)} /></label>
              <label className="lesson-image-fields">Image description<input maxLength={300} placeholder="Describe the important information in the image" value={lessonInputs[mod._id]?.imageAlt || ''} onChange={event => handleLessonInput(mod._id, 'imageAlt', event.target.value)} /></label>
              <label className="lesson-image-fields">Image caption<input maxLength={500} placeholder="Optional caption shown below the image" value={lessonInputs[mod._id]?.imageCaption || ''} onChange={event => handleLessonInput(mod._id, 'imageCaption', event.target.value)} /></label>
              <input type="text" placeholder="Short summary" value={lessonInputs[mod._id]?.summary || ''} onChange={e => handleLessonInput(mod._id, 'summary', e.target.value)} />
              <textarea placeholder="Notes for students" value={lessonInputs[mod._id]?.notes || ''} onChange={e => handleLessonInput(mod._id, 'notes', e.target.value)} />
              <textarea placeholder="Teaching tips (optional)" value={lessonInputs[mod._id]?.teachingTips || ''} onChange={e => handleLessonInput(mod._id, 'teachingTips', e.target.value)} />
              <input type="number" min="1" max="1440" placeholder="Duration (minutes)" value={lessonInputs[mod._id]?.duration || ''} onChange={e => handleLessonInput(mod._id, 'duration', e.target.value)} />
              <input type="text" placeholder="Objectives, one per line" value={lessonInputs[mod._id]?.objectives || ''} onChange={e => handleLessonInput(mod._id, 'objectives', e.target.value)} />
              <textarea placeholder="Reading links, sample files, or datasets — one URL per line" value={lessonInputs[mod._id]?.resources || ''} onChange={e => handleLessonInput(mod._id, 'resources', e.target.value)} />
              {['video', 'dataset', 'image'].includes(lessonInputs[mod._id]?.contentType) && <input type="url" placeholder={lessonInputs[mod._id]?.contentType === 'video' ? 'Video URL (YouTube, Vimeo, or direct link)' : lessonInputs[mod._id]?.contentType === 'dataset' ? 'Sample dataset URL (CSV, Excel, JSON, notebook, or archive)' : 'Image URL (or upload an image below)'} value={lessonInputs[mod._id]?.contentUrl || ''} onChange={e => handleLessonInput(mod._id, 'contentUrl', e.target.value)} />}
              {['pdf', 'slide', 'doc', 'video', 'dataset', 'image'].includes(lessonInputs[mod._id]?.contentType) && (
                <input type="file" accept={lessonInputs[mod._id]?.contentType === 'pdf' ? '.pdf,application/pdf' : lessonInputs[mod._id]?.contentType === 'slide' ? '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation' : lessonInputs[mod._id]?.contentType === 'doc' ? '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document' : lessonInputs[mod._id]?.contentType === 'dataset' ? '.csv,.xls,.xlsx,.json,.zip,.txt,.ipynb' : lessonInputs[mod._id]?.contentType === 'image' ? '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' : '.mp4,.m4v,.webm,.mov,video/*'} onChange={e => handleLessonInput(mod._id, 'file', e.target.files[0])} style={{ marginRight: 8 }} />
              )}
              <button onClick={() => handleAddLesson(mod._id)}>Add Lesson</button>
            </div>
            {/* Assignments */}
            <h4>Assignments</h4>
            <ul>
              {mod.assignments && mod.assignments.map(assignment => (
                <li key={assignment._id}>
                  <strong>{assignment.title}</strong> - Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </li>
              ))}
              {(!mod.assignments || mod.assignments.length === 0) && <li>No assignments yet.</li>}
            </ul>
            <div className="edit-activity-form">
              <input type="text" placeholder="Assignment title" value={assignmentInputs[mod._id]?.title || ''} onChange={e => handleAssignmentInput(mod._id, 'title', e.target.value)} />
              <input type="text" placeholder="Description" value={assignmentInputs[mod._id]?.description || ''} onChange={e => handleAssignmentInput(mod._id, 'description', e.target.value)} />
              <input type="date" value={assignmentInputs[mod._id]?.dueDate || ''} onChange={e => handleAssignmentInput(mod._id, 'dueDate', e.target.value)} />
              <textarea placeholder="Project tasks or questions — one per line" value={assignmentInputs[mod._id]?.questions?.map(q => q.question).join('\n') || ''} onChange={e => handleAssignmentInput(mod._id, 'questions', e.target.value.split('\n').filter(q => q.trim()).map(q => ({ question: q, type: 'text' })))} />
              <textarea placeholder="Grading rubric — Criterion | points | guidance. Criteria must total 100." value={assignmentInputs[mod._id]?.rubricText || ''} onChange={e => handleAssignmentInput(mod._id, 'rubricText', e.target.value)} />
              <input type="number" min="0" max="100" placeholder="Passing grade (%) — default 40" value={assignmentInputs[mod._id]?.passingGrade ?? ''} onChange={e => handleAssignmentInput(mod._id, 'passingGrade', e.target.value)} />
              <button onClick={() => handleAddAssignment(mod._id)}>Add Assignment</button>
            </div>
            {/* Quizzes */}
            <h4>Quizzes</h4>
            <ul>
              {mod.quizzes && mod.quizzes.length > 0 ? mod.quizzes.map(quiz => (
                <li key={quiz._id}>
                  <strong>{quiz.title}</strong>
                </li>
              )) : <li>No quizzes yet.</li>}
            </ul>
            <p>Build timed multiple-choice quizzes with scoring and attempt settings from the <a href={`/courses/${id}/content`}>course learning page</a>.</p>
          </li>
        ))}
      </ul>
      <div className="new-module-form"><input type="text" value={newModuleTitle} onChange={e => setNewModuleTitle(e.target.value)} placeholder="New module title" />
      <button onClick={handleAddModule}>Add Module</button>
      </div>

      <h3 style={{ marginTop: 32 }}>Enrolled Students Progress</h3>
      {progress.length === 0 ? <p>No students enrolled yet.</p> : (
        <table style={{ width: '100%', marginTop: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Name</th>
              <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Email</th>
              {progressModules.map(m => (
                <th key={m._id} style={{ borderBottom: '1px solid #ccc' }}>{m.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {progress.map(stu => (
              <tr key={stu._id}>
                <td>{stu.name}</td>
                <td>{stu.email}</td>
                {progressModules.map(m => (
                  <td key={m._id} style={{ textAlign: 'center' }}>{stu.completedModules.includes(m._id) ? '✅' : ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
};

export default EditCourse;
