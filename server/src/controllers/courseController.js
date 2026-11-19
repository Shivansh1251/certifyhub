const Course = require("../models/Course");
const Review = require("../models/Review");
const { sendSuccess, sendSuccessList, sendError, sendNotFound, sendForbidden, sendConflict, sendValidationError } = require("../utils/apiResponse");
const { issueCertificateIfEligible } = require("./certificateController");

const normalizeStringList = (value) => {
  const values = Array.isArray(value) ? value : String(value || '').split('\n');
  return values.map(item => String(item).trim()).filter(Boolean).slice(0, 50);
};
const allowedSectionTypes = new Set(['theory', 'worked_example', 'key_terms', 'common_mistakes', 'takeaways']);
const normalizeContentSections = (value) => {
  if (!Array.isArray(value) || value.length > 30) return null;
  const sections = value.map(section => ({
    type: allowedSectionTypes.has(section?.type) ? section.type : 'theory',
    heading: String(section?.heading || '').trim(),
    body: String(section?.body || '').trim(),
  }));
  return sections.some(section => !section.heading || !section.body || section.heading.length > 120 || section.body.length > 12000)
    ? null
    : sections;
};
const normalizeSelfChecks = (value) => {
  if (!Array.isArray(value) || value.length > 20) return null;
  const checks = value.map(check => ({
    question: String(check?.question || '').trim(),
    answer: String(check?.answer || '').trim(),
  }));
  return checks.some(check => !check.question || !check.answer || check.question.length > 500 || check.answer.length > 1500)
    ? null
    : checks;
};
const normalizeGames = (value) => {
  if (!Array.isArray(value) || value.length > 8) return null;
  const games = value.map(game => ({
    type: 'flashcards',
    title: String(game?.title || '').trim(),
    instructions: String(game?.instructions || '').trim(),
    cards: Array.isArray(game?.cards) ? game.cards.map(card => ({
      front: String(card?.front || '').trim(),
      back: String(card?.back || '').trim(),
    })) : [],
  }));
  return games.some(game => !game.title || game.title.length > 100 || game.instructions.length > 400
    || game.cards.length < 2 || game.cards.length > 30
    || game.cards.some(card => !card.front || !card.back || card.front.length > 300 || card.back.length > 2000))
    ? null
    : games;
};
const normalizeImageUrl = (value) => {
  const url = String(value || '').trim();
  if (!url) return '';
  if (url.length > 2048 || url.startsWith('//')) return null;
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? url : null;
  } catch (error) {
    return null;
  }
};

// ---------------- CONTROLLERS ----------------

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Instructor only)
exports.createCourse = async (req, res) => {
  try {
    const { title, description, category, price, modules, prerequisites, learningOutcomes } = req.body;
    const estimatedDurationHours = req.body.estimatedDurationHours === '' || req.body.estimatedDurationHours === null
      || req.body.estimatedDurationHours === undefined
      ? null
      : Number(req.body.estimatedDurationHours);

    if (!title?.trim() || !description?.trim() || !category?.trim()) {
      return sendValidationError(res, ["Title, description, and category are required"], "Course details are incomplete");
    }
    if (!Number.isFinite(Number(price ?? 0)) || Number(price ?? 0) < 0) {
      return sendValidationError(res, ["Price must be a non-negative number"], "Invalid course price");
    }
    if (estimatedDurationHours !== null && (!Number.isFinite(estimatedDurationHours) || estimatedDurationHours < 0)) {
      return sendValidationError(res, ["Estimated study hours must be a non-negative number"], "Invalid estimated duration");
    }

    const course = new Course({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      price: Number(price ?? 0),
      modules: Array.isArray(modules) ? modules : [],
      prerequisites: normalizeStringList(prerequisites),
      learningOutcomes: normalizeStringList(learningOutcomes),
      estimatedDurationHours,
      instructor: req.user._id,
    });

    const savedCourse = await course.save();
    return sendSuccess(res, savedCourse, 'Course created successfully', 201);
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @desc    Update course overview and learning expectations
// @route   PUT /api/courses/:id
// @access  Private (Course instructor or admin)
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return sendNotFound(res, "Course not found");
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendForbidden(res, "Not authorized to update this course");
    }

    const { title, description, category, price, prerequisites, learningOutcomes, estimatedDurationHours } = req.body;
    const nextPrice = price === undefined ? course.price : Number(price);
    const nextDuration = estimatedDurationHours === undefined
      ? (course.estimatedDurationHours ?? null)
      : estimatedDurationHours === '' || estimatedDurationHours === null
        ? null
        : Number(estimatedDurationHours);
    if (title !== undefined && !String(title).trim()) return sendValidationError(res, ["Course title cannot be empty"], "Invalid course title");
    if (description !== undefined && !String(description).trim()) return sendValidationError(res, ["Course description cannot be empty"], "Invalid course description");
    if (category !== undefined && !String(category).trim()) return sendValidationError(res, ["Course category cannot be empty"], "Invalid course category");
    if (!Number.isFinite(nextPrice) || nextPrice < 0) return sendValidationError(res, ["Price must be a non-negative number"], "Invalid course price");
    if (nextDuration !== null && (!Number.isFinite(nextDuration) || nextDuration < 0)) {
      return sendValidationError(res, ["Estimated study hours must be a non-negative number"], "Invalid estimated duration");
    }

    if (title !== undefined) course.title = String(title).trim();
    if (description !== undefined) course.description = String(description).trim();
    if (category !== undefined) course.category = String(category).trim();
    course.price = nextPrice;
    if (prerequisites !== undefined) course.prerequisites = normalizeStringList(prerequisites);
    if (learningOutcomes !== undefined) course.learningOutcomes = normalizeStringList(learningOutcomes);
    if (estimatedDurationHours !== undefined) course.estimatedDurationHours = nextDuration;

    await course.save();
    return sendSuccess(res, course, "Course overview updated successfully");
  } catch (err) {
    return sendError(res, "Could not update course overview", 500, err.message);
  }
};
// @desc    Get all courses (with search & filter)
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res) => {
  try {
    const { 
      keyword, 
      category, 
      free, 
      sort, 
      instructor, 
      difficulty, 
      minRating,
      page = 1, 
      limit = 12 
    } = req.query;

    let query = {};

    // Search by title, description, or instructor name
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } }
      ];
    }

    // Filter by category
    if (category && category !== 'all') {
      query.category = { $regex: category, $options: "i" };
    }

    // Filter by price (free or paid)
    if (free === "true") {
      query.price = 0;
    } else if (free === "false") {
      query.price = { $gt: 0 };
    }

    // Filter by minimum rating
    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    let courses = Course.find(query)
      .populate("instructor", "name email")
      .populate("reviews");

    // Filter by instructor name if provided
    if (instructor) {
      // First get instructors matching the name
      const User = require("../models/User");
      const instructors = await User.find({
        name: { $regex: instructor, $options: "i" },
        role: "instructor"
      }).select("_id");
      
      if (instructors.length > 0) {
        query.instructor = { $in: instructors.map(i => i._id) };
        courses = Course.find(query).populate("instructor", "name email").populate("reviews");
      } else {
        // No instructors found, return empty result
        return res.json({ courses: [], totalPages: 0, currentPage: page, total: 0 });
      }
    }

    // Sorting
    if (sort === "latest") {
      courses = courses.sort({ createdAt: -1 });
    } else if (sort === "popular") {
      courses = courses.sort({ enrolledStudents: -1 });
    } else if (sort === "rating") {
      courses = courses.sort({ averageRating: -1 });
    } else if (sort === "price_low") {
      courses = courses.sort({ price: 1 });
    } else if (sort === "price_high") {
      courses = courses.sort({ price: -1 });
    } else {
      courses = courses.sort({ createdAt: -1 }); // default to latest
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    courses = courses.skip(startIndex).limit(parseInt(limit));

    const result = await courses;
    const total = await Course.countDocuments(query);

    // Add enrollment count and difficulty level to each course
    const enhancedCourses = result.map(course => ({
      ...course.toObject(),
      enrollmentCount: course.enrolledStudents.length,
      difficulty: course.difficulty || getDifficultyFromModules(course.modules)
    }));

    return sendSuccessList(res, enhancedCourses, {
      page: parseInt(page),
      pageSize: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: parseInt(page) < Math.ceil(total / limit),
      hasPrevPage: parseInt(page) > 1
    }, 'Courses retrieved successfully');
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// Helper function to determine difficulty based on course content
const getDifficultyFromModules = (modules) => {
  if (!modules || modules.length === 0) return 'Beginner';
  
  const totalLessons = modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0);
  const totalAssignments = modules.reduce((sum, module) => sum + (module.assignments?.length || 0), 0);
  const totalQuizzes = modules.reduce((sum, module) => sum + (module.quizzes?.length || 0), 0);
  
  const totalContent = totalLessons + totalAssignments + totalQuizzes;
  
  if (totalContent <= 10) return 'Beginner';
  if (totalContent <= 25) return 'Intermediate';
  return 'Advanced';
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("instructor", "name email")
      .populate({
        path: "reviews",
        populate: { path: "user", select: "name email" },
      })
      .populate({
        path: "enrolledStudents",
        select: "name email _id",
      })
      .populate('modules.assignments')
      .populate({ path: 'modules.quizzes', select: 'title description timeLimit passingScore attemptLimit' });

    if (!course) return sendNotFound(res, "Course not found");

    return sendSuccess(res, course, "Course retrieved successfully");
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @desc    Enroll in a course
// @route   POST /api/courses/:id/enroll
// @access  Private (Student)
exports.enrollCourse = async (req, res) => {
  console.log('Enroll attempt: req.user =', req.user);
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      console.error('Enroll error: Course not found', req.params.id);
      return sendNotFound(res, "Course not found");
    }

    // Prevent instructors from enrolling in their own courses
    if (course.instructor.toString() === req.user._id.toString()) {
      console.warn('Enroll warning: Instructor cannot enroll in own course', req.user._id, course._id);
      return sendForbidden(res, "Instructors cannot enroll in their own courses");
    }

    if (course.price > 0) {
      return sendForbidden(res, "Paid courses require payment before enrollment");
    }

    if (course.enrolledStudents.includes(req.user._id)) {
      console.warn('Enroll warning: Already enrolled', req.user._id, course._id);
      return sendConflict(res, "Already enrolled");
    }

    // Add student to course
    course.enrolledStudents.push(req.user._id);
    await course.save();

    // Add course to user's enrolledCourses
    const User = require("../models/User");
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('Enroll error: User not found', req.user._id);
      return sendNotFound(res, "User not found");
    }
    if (!user.enrolledCourses.includes(course._id)) {
      user.enrolledCourses.push(course._id);
      await user.save();
    }

    return sendSuccess(res, course, "Enrolled successfully");
  } catch (err) {
    console.error('Enroll 500 error:', err);
    res.status(500).json({ message: "Server error", error: err.message, stack: err.stack });
  }
};

// @desc    Add review to course
// @route   POST /api/courses/:id/reviews
// @access  Private (Student)
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ message: "Course not found" });

    // Only allow review if user is enrolled (safe)
    if (!Array.isArray(course.enrolledStudents) ||
        !course.enrolledStudents.map(id => id && id.toString()).includes(req.user._id.toString())) {
      return res.status(403).json({ message: "You must be enrolled in this course to write a review." });
    }

    const alreadyReviewed = await Review.findOne({
      course: course._id,
      user: req.user._id,
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: "Course already reviewed" });
    }

    const review = new Review({
      course: course._id,
      user: req.user._id,
      rating,
      comment,
    });

    await review.save();

    course.reviews.push(review._id);

    // Recalculate average rating
    const reviews = await Review.find({ course: course._id });
    course.averageRating =
      reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;

    await course.save();

    return sendSuccess(res, review, "Review added successfully", 201);
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @desc    Rate a course (1-5 stars)
// @route   POST /api/courses/:id/rate
// @access  Private (Student)
exports.rateCourse = async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    // Validate rating (1-5 only)
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return sendValidationError(res, ["Rating must be an integer between 1 and 5"], "Invalid rating");
    }
    
    const course = await Course.findById(req.params.id);
    if (!course) return sendNotFound(res, "Course not found");

    // Only allow rating if user is enrolled
    if (!Array.isArray(course.enrolledStudents) ||
        !course.enrolledStudents.map(id => id && id.toString()).includes(req.user._id.toString())) {
      return sendForbidden(res, "You must be enrolled in this course to rate it.");
    }

    // Check if user has already rated this course
    const existingReview = await Review.findOne({
      course: course._id,
      user: req.user._id,
    });

    if (existingReview) {
      // Update existing rating
      existingReview.rating = rating;
      if (review && review.trim()) {
        existingReview.comment = review.trim();
      }
      existingReview.updatedAt = new Date();
      await existingReview.save();
      
      // Recalculate average rating
      const reviews = await Review.find({ course: course._id });
      course.averageRating = reviews.length > 0 
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length 
        : 0;
      
      await course.save();
      
      return sendSuccess(res, {
        rating: existingReview.rating,
        comment: existingReview.comment,
        averageRating: Math.round(course.averageRating * 10) / 10,
        totalRatings: reviews.length,
        updated: true
      }, "Rating updated successfully");
    } else {
      // Create new rating
      const newReview = new Review({
        course: course._id,
        user: req.user._id,
        rating,
        comment: review && review.trim() ? review.trim() : '',
      });

      await newReview.save();
      course.reviews.push(newReview._id);

      // Recalculate average rating
      const reviews = await Review.find({ course: course._id });
      course.averageRating = reviews.length > 0 
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length 
        : 0;

      await course.save();

      return sendSuccess(res, {
        rating: newReview.rating,
        comment: newReview.comment,
        averageRating: Math.round(course.averageRating * 10) / 10,
        totalRatings: reviews.length,
        updated: false
      }, "Course rated successfully", 201);
    }
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @desc    Get ratings for a course
// @route   GET /api/courses/:id/ratings
// @access  Public
exports.getCourseRatings = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'latest' } = req.query;
    
    const course = await Course.findById(req.params.id);
    if (!course) return sendNotFound(res, "Course not found");

    let sortCriteria = { createdAt: -1 }; // default: latest first
    if (sortBy === 'rating_high') sortCriteria = { rating: -1, createdAt: -1 };
    if (sortBy === 'rating_low') sortCriteria = { rating: 1, createdAt: -1 };
    if (sortBy === 'oldest') sortCriteria = { createdAt: 1 };

    const skip = (page - 1) * limit;
    
    const reviews = await Review.find({ course: course._id })
      .populate('user', 'name email')
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalReviews = await Review.countDocuments({ course: course._id });
    const totalPages = Math.ceil(totalReviews / limit);

    // Calculate rating distribution
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      ratingDistribution[i] = await Review.countDocuments({ course: course._id, rating: i });
    }

    return sendSuccessList(res, reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      user: {
        _id: review.user._id,
        name: review.user.name
      },
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString()
    })), {
      page: parseInt(page),
      pageSize: parseInt(limit),
      total: totalReviews,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      averageRating: Math.round(course.averageRating * 10) / 10,
      ratingDistribution
    }, "Course ratings retrieved successfully");

  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @desc    Get course content and user progress
// @route   GET /api/courses/:id/content
// @access  Private (enrolled students)
exports.getCourseContent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name')
      .populate('modules.lessons')
      .populate('modules.assignments')
      .populate('modules.quizzes');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    // Only allow if enrolled or instructor
    const instructorId = course.instructor?._id || course.instructor;
    const isEnrolled = course.enrolledStudents.some(id => id && id.toString() === req.user._id.toString());
    if (!isEnrolled && instructorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    // Progress: get from user.progress (Map)
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user.progress) {
      user.progress = new Map();
    }
    let progress = user.progress.get(course._id.toString()) || { completedModules: [], completedLessons: [], grades: {}, scores: {}, notes: {} };
    if (!user.progress.has(course._id.toString())) {
      user.progress.set(course._id.toString(), progress);
      await user.save();
    }
    const completedModules = progress.completedModules || [];
    const completedLessons = progress.completedLessons || [];
    const completedModuleIds = new Set(completedModules.map(moduleId => moduleId.toString()));
    const lessonsFromCompletedModules = (course.modules || [])
      .filter(module => completedModuleIds.has(module._id.toString()))
      .flatMap(module => (module.lessons || []).map(lesson => lesson._id.toString()));
    const normalizedCompletedLessons = Array.from(new Set([...completedLessons.map(lessonId => lessonId.toString()), ...lessonsFromCompletedModules]));
    if (normalizedCompletedLessons.length !== completedLessons.length) {
      progress.completedLessons = normalizedCompletedLessons;
      user.progress.set(course._id.toString(), progress);
      user.markModified('progress');
      await user.save();
    }
    const scores = progress.scores || {};
    const readProgressValue = (values, key) => values instanceof Map ? values.get(key) : values?.[key];

    // Map modules to include all lessons, assignments, and quizzes
    const modules = (course.modules || []).map(mod => ({
      _id: mod._id,
      title: mod.title,
      lessons: (mod.lessons || []).map(lesson => ({
        _id: lesson._id,
        title: lesson.title,
        contentType: lesson.contentType,
        content: lesson.content,
        contentSections: lesson.contentSections || [],
        selfChecks: lesson.selfChecks || [],
        games: lesson.games || [],
        imageUrl: lesson.imageUrl || '',
        imageAlt: lesson.imageAlt || '',
        imageCaption: lesson.imageCaption || '',
        summary: lesson.summary,
        notes: lesson.notes,
        teachingTips: lesson.teachingTips,
        objectives: lesson.objectives,
        resources: lesson.resources,
        contentUrl: lesson.contentUrl,
        duration: lesson.duration,
      })),
      assignments: (mod.assignments || []).map(assignment => ({
        _id: assignment._id,
        title: assignment.title,
        description: assignment.description,
        dueDate: assignment.dueDate,
      questions: assignment.questions || [],
      rubric: assignment.rubric || [],
      passingGrade: assignment.passingGrade ?? course.passingThreshold ?? 40,
        userSubmission: (() => {
          const studentSubmissions = (assignment.submissions || []).filter(sub => sub.student.toString() === req.user._id.toString());
          const passingGrade = assignment.passingGrade ?? course.passingThreshold ?? 40;
          const passingSubmission = studentSubmissions
            .filter(sub => sub.status === 'graded' && sub.grade !== null && sub.grade !== undefined && sub.grade >= passingGrade)
            .reduce((best, sub) => !best || sub.grade > best.grade ? sub : best, null);
          return passingSubmission || studentSubmissions[studentSubmissions.length - 1] || null;
        })(),
        completed: (assignment.submissions || []).some(sub =>
          sub.student.toString() === req.user._id.toString() &&
          sub.status === 'graded' &&
          sub.grade !== null &&
          sub.grade !== undefined &&
          sub.grade >= (assignment.passingGrade ?? course.passingThreshold ?? 40)
        ),
      })),
      quizzes: (mod.quizzes || []).map(quiz => {
        const studentAttempts = (quiz.attempts || []).filter(attempt => attempt.student.toString() === req.user._id.toString());
        const storedScore = Number(readProgressValue(scores, quiz._id.toString()));
        const bestAttemptScore = studentAttempts.length
          ? studentAttempts.reduce((best, attempt) => Math.max(best, Number(attempt.score) || 0), 0)
          : -1;
        const bestScore = Math.max(Number.isFinite(storedScore) ? storedScore : -1, bestAttemptScore);
        const passingScore = quiz.passingScore ?? course.passingThreshold ?? 40;
        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          marks: quiz.questions.reduce((total, question) => total + (question.points || 1), 0),
          score: bestScore >= 0 ? bestScore : null,
          completed: bestScore >= passingScore,
          attemptCount: studentAttempts.length,
          attemptsRemaining: Math.max(0, (quiz.attemptLimit || 1) - studentAttempts.length),
          attemptLimit: quiz.attemptLimit || 1,
          passingScore,
          timeLimit: quiz.timeLimit,
          questions: quiz.questions.map(question => ({
            _id: question._id,
            text: question.text,
            options: question.options,
            points: question.points,
          })),
        };
      })
    }));

    const completedModuleSet = new Set(completedModules.map(moduleId => moduleId.toString()));
    const completedLessonSet = new Set(normalizedCompletedLessons);
    let progressTotal = 0;
    let progressDone = 0;
    modules.forEach(module => {
      progressTotal++;
      if (completedModuleSet.has(module._id.toString())) progressDone++;
      module.lessons.forEach(lesson => {
        progressTotal++;
        if (completedLessonSet.has(lesson._id.toString())) progressDone++;
      });
      module.assignments.forEach(assignment => {
        progressTotal++;
        if (assignment.completed) progressDone++;
      });
      module.quizzes.forEach(quiz => {
        progressTotal++;
        if (quiz.completed) progressDone++;
      });
    });
    const progressPercentage = progressTotal ? Math.floor((progressDone / progressTotal) * 100) : 0;

    res.json({
      course: {
        _id: course._id,
        title: course.title,
        instructor: { _id: instructorId, name: course.instructor?.name || '' },
        passingThreshold: course.passingThreshold,
        prerequisites: course.prerequisites || [],
        learningOutcomes: course.learningOutcomes || [],
        estimatedDurationHours: course.estimatedDurationHours ?? null,
      },
      modules,
      completedModules,
      completedLessons: normalizedCompletedLessons,
      progress: progressPercentage,
      personalNotes: progress.notes instanceof Map ? Object.fromEntries(progress.notes) : (progress.notes || {}),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Save or clear a learner's private note for a lesson
// @route   PUT /api/courses/:id/lessons/:lessonId/notes
// @access  Private (enrolled student or course instructor)
exports.saveLessonNote = async (req, res) => {
  try {
    const { id, lessonId } = req.params;
    const { note } = req.body;
    if (typeof note !== 'string' || note.length > 10000) {
      return res.status(400).json({ message: 'Notes must be text and no longer than 10,000 characters.' });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const instructorId = course.instructor.toString();
    const isInstructor = instructorId === req.user._id.toString();
    const isEnrolled = course.enrolledStudents.some(student => student.toString() === req.user._id.toString());
    const isAdmin = req.user.role === 'admin';
    if (!isInstructor && !isEnrolled && !isAdmin) {
      return res.status(403).json({ message: 'Enroll in this course to save lesson notes.' });
    }
    const lessonExists = course.modules.some(module => module.lessons.id(lessonId));
    if (!lessonExists) return res.status(404).json({ message: 'Lesson not found' });

    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const courseKey = course._id.toString();
    const progress = user.progress.get(courseKey) || { completedModules: [], completedLessons: [], grades: {}, scores: {}, notes: {} };
    const notes = progress.notes instanceof Map ? progress.notes : new Map(Object.entries(progress.notes || {}));
    const trimmedNote = note.trim();
    if (trimmedNote) notes.set(lessonId, trimmedNote);
    else notes.delete(lessonId);
    progress.notes = notes;
    user.progress.set(courseKey, progress);
    user.markModified('progress');
    await user.save();

    return res.json({ lessonId, note: trimmedNote, message: trimmedNote ? 'Note saved.' : 'Note cleared.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save lesson note', error: err.message });
  }
};

// @desc    Mark module as completed for user
// @route   POST /api/courses/:id/modules/:moduleId/complete
// @access  Private (enrolled students)
exports.completeModule = async (req, res) => {
  try {
    console.log('completeModule: called', req.params);
    const { id, moduleId } = req.params;
    let course;
    try {
      course = await Course.findById(id);
      console.log('completeModule: course found', course ? course._id : null);
    } catch (e) {
      console.error('completeModule: error finding course', e);
      return res.status(500).json({ message: 'Error finding course', error: e.message });
    }
    if (!course) {
      console.error('completeModule: Course not found', id);
      return res.status(404).json({ message: 'Course not found' });
    }
    const module = course.modules.id(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    let enrolled = false;
    try {
      enrolled = course.enrolledStudents.map(s => s && s.toString()).includes(req.user._id.toString());
      console.log('completeModule: enrolled check', enrolled);
    } catch (e) {
      console.error('completeModule: error checking enrollment', e);
      return res.status(500).json({ message: 'Error checking enrollment', error: e.message });
    }
    if (!enrolled) {
      console.error('completeModule: Not enrolled', req.user._id, id);
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    let user;
    try {
      const User = require('../models/User');
      user = await User.findById(req.user._id);
      console.log('completeModule: user found', user ? user._id : null);
    } catch (e) {
      console.error('completeModule: error finding user', e);
      return res.status(500).json({ message: 'Error finding user', error: e.message });
    }
    if (!user) {
      console.error('completeModule: User not found', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    // Ensure user.progress is a Map
    if (!user.progress) {
      user.progress = new Map();
      console.log('completeModule: initialized user.progress as new Map()');
    }
    let courseProgress;
    try {
      courseProgress = user.progress.get(id);
      console.log('completeModule: got courseProgress', courseProgress);
    } catch (e) {
      console.error('completeModule: error getting courseProgress', e);
      return res.status(500).json({ message: 'Error getting courseProgress', error: e.message });
    }
    if (!courseProgress) {
      courseProgress = { completedModules: [], completedLessons: [], grades: {}, scores: {} };
      console.log('completeModule: initialized courseProgress');
    }
    if (!courseProgress.completedModules.includes(moduleId)) {
      courseProgress.completedModules.push(moduleId);
      if (!Array.isArray(courseProgress.completedLessons)) courseProgress.completedLessons = [];
      module.lessons.forEach(lesson => {
        const lessonId = lesson._id.toString();
        if (!courseProgress.completedLessons.includes(lessonId)) courseProgress.completedLessons.push(lessonId);
      });
      user.progress.set(id, courseProgress);
      try {
        await user.save();
        console.log('completeModule: user progress saved');
      } catch (saveErr) {
        console.error('completeModule: Error saving user progress', saveErr);
        return res.status(500).json({ message: 'Server error (save user)', error: saveErr.message });
      }
    }
    const certificateResult = await issueCertificateIfEligible(user._id, id);
    res.json({
      message: 'Module marked as completed',
      completedModules: courseProgress.completedModules,
      certificateGenerated: certificateResult.certificateGenerated,
      certificateIssuedNow: Boolean(certificateResult.issuedNow),
    });
  } catch (err) {
    console.error('completeModule: unknown error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Mark module as incomplete for user
// @route   POST /api/courses/:id/modules/:moduleId/incomplete
// @access  Private (enrolled students)
exports.incompleteModule = async (req, res) => {
  try {
    const { id, moduleId } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      console.error('incompleteModule: Course not found', id);
      return res.status(404).json({ message: 'Course not found' });
    }
    if (!course.enrolledStudents.map(s => s && s.toString()).includes(req.user._id.toString())) {
      console.error('incompleteModule: Not enrolled', req.user._id, id);
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }
    const module = course.modules.id(moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user) {
      console.error('incompleteModule: User not found', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }
    // Ensure user.progress is a Map
    if (!user.progress) {
      user.progress = new Map();
    }
    let courseProgress = user.progress.get(id);
    if (!courseProgress) {
      courseProgress = { completedModules: [], completedLessons: [], grades: {}, scores: {} };
    }
    if (courseProgress.completedModules.includes(moduleId)) {
      courseProgress.completedModules = courseProgress.completedModules.filter(mid => mid !== moduleId);
      const moduleLessonIds = new Set(module.lessons.map(lesson => lesson._id.toString()));
      courseProgress.completedLessons = (courseProgress.completedLessons || []).filter(lessonId => !moduleLessonIds.has(lessonId));
      user.progress.set(id, courseProgress);
      try {
        await user.save();
      } catch (saveErr) {
        console.error('incompleteModule: Error saving user progress', saveErr);
        return res.status(500).json({ message: 'Server error (save user)', error: saveErr.message });
      }
    }
    res.json({ message: 'Module marked as incomplete', completedModules: courseProgress.completedModules });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Add a module to a course (Instructor only)
// @route   POST /api/courses/:id/modules
// @access  Private
exports.addModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: 'Module title required' });
    course.modules.push({ title, lessons: [] });
    await course.save();
    res.status(201).json({ message: 'Module added', modules: course.modules });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Delete a module from a course (Instructor only)
// @route   DELETE /api/courses/:id/modules/:moduleId
// @access  Private
exports.deleteModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    course.modules = course.modules.filter(m => m._id.toString() !== req.params.moduleId);
    await course.save();
    res.json({ message: 'Module deleted', modules: course.modules });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Upload PPT/PDF to a module (Instructor only)
// @route   POST /api/courses/:id/modules/:moduleId/upload
// @access  Private
exports.uploadModuleFiles = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const module = course.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    // Add or update lesson for ppt
    if (req.files && req.files.ppt && req.files.ppt[0]) {
      let pptLesson = module.lessons.find(l => l.contentType === 'slide');
      if (!pptLesson) {
        pptLesson = { title: 'PPT', contentType: 'slide', contentUrl: `/uploads/${req.files.ppt[0].filename}` };
        module.lessons.push(pptLesson);
      } else {
        pptLesson.contentUrl = `/uploads/${req.files.ppt[0].filename}`;
      }
    }
    // Add or update lesson for pdf
    if (req.files && req.files.pdf && req.files.pdf[0]) {
      let pdfLesson = module.lessons.find(l => l.contentType === 'pdf');
      if (!pdfLesson) {
        pdfLesson = { title: 'PDF', contentType: 'pdf', contentUrl: `/uploads/${req.files.pdf[0].filename}` };
        module.lessons.push(pdfLesson);
      } else {
        pdfLesson.contentUrl = `/uploads/${req.files.pdf[0].filename}`;
      }
    }
    await course.save();
    res.json({ message: 'Files uploaded', module });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Get enrolled students and their progress for a course (Instructor only)
// @route   GET /api/courses/:id/progress
// @access  Private
exports.getCourseProgress = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('enrolledStudents', 'name email progress');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const students = (course.enrolledStudents || []).map(student => {
      const progress = student.progress && student.progress.get(course._id.toString());
      const completedModules = progress ? progress.completedModules || [] : [];
      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        completedModules,
      };
    });
    res.json({ students, modules: course.modules.map(m => ({ _id: m._id, title: m.title })) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Add a lesson to a module (Instructor only)
// @route   POST /api/courses/:id/modules/:moduleId/lessons
// @access  Private
exports.addLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const module = course.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    const { title, contentType, content, contentSections, selfChecks, games, imageUrl, imageAlt, imageCaption, summary, notes, teachingTips, objectives, resources, contentUrl, duration } = req.body;
    if (!title?.trim() || !contentType) return res.status(400).json({ message: 'Lesson title and type required' });
    if (!['text', 'video', 'pdf', 'doc', 'slide', 'dataset', 'image'].includes(contentType)) {
      return sendValidationError(res, ['Choose a supported lesson type'], 'Invalid lesson type');
    }
    const normalizedSections = contentSections === undefined ? [] : normalizeContentSections(contentSections);
    if (!normalizedSections) return sendValidationError(res, ['Every section needs a heading and body, with up to 30 sections allowed'], 'Invalid lesson sections');
    const normalizedChecks = selfChecks === undefined ? [] : normalizeSelfChecks(selfChecks);
    if (!normalizedChecks) return sendValidationError(res, ['Every self-check needs a question and answer, with up to 20 checks allowed'], 'Invalid lesson self-checks');
    const normalizedGames = games === undefined ? [] : normalizeGames(games);
    if (!normalizedGames) return sendValidationError(res, ['Each flashcard game needs a title and 2–30 complete cards'], 'Invalid lesson games');
    const normalizedImageUrl = normalizeImageUrl(imageUrl);
    if (normalizedImageUrl === null) return sendValidationError(res, ['Use an http(s) image URL or a local path beginning with /'], 'Invalid lesson image');
    const normalizedContentUrl = contentType === 'image' ? normalizeImageUrl(contentUrl) : contentUrl;
    if (contentType === 'image' && normalizedContentUrl === null) return sendValidationError(res, ['Use an http(s) image URL for image lessons'], 'Invalid lesson image');
    const parseList = (value) => Array.isArray(value)
      ? value.filter(item => typeof item === 'string' && item.trim())
      : String(value || '').split('\n').map(item => item.trim()).filter(Boolean);
    let lesson = {
      title: title.trim(),
      contentType,
      contentSections: normalizedSections,
      selfChecks: normalizedChecks,
      games: normalizedGames,
      imageUrl: normalizedImageUrl,
      imageAlt: String(imageAlt || '').trim().slice(0, 300),
      imageCaption: String(imageCaption || '').trim().slice(0, 500),
      summary: summary || '',
      notes: notes || '',
      teachingTips: teachingTips || '',
      objectives: parseList(objectives),
      resources: parseList(resources),
      duration: Number.isFinite(Number(duration)) && Number(duration) > 0 ? Number(duration) : undefined,
    };
    if (contentType === 'text') lesson.content = content;
    if (['pdf', 'slide', 'doc', 'video', 'dataset', 'image'].includes(contentType)) lesson.contentUrl = normalizedContentUrl;
    module.lessons.push(lesson);
    const addedLesson = module.lessons[module.lessons.length - 1];
    await course.save();
    res.status(201).json({ message: 'Lesson added', lesson: addedLesson, lessons: module.lessons });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Update a lesson and its structured chapter content
// @route   PUT /api/courses/:id/modules/:moduleId/lessons/:lessonId
// @access  Private (Course instructor or admin)
exports.updateLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return sendNotFound(res, 'Course not found');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendForbidden(res, 'Not authorized to update this lesson');
    }
    const module = course.modules.id(req.params.moduleId);
    if (!module) return sendNotFound(res, 'Module not found');
    const lesson = module.lessons.id(req.params.lessonId);
    if (!lesson) return sendNotFound(res, 'Lesson not found');

    const { title, content, contentSections, selfChecks, games, imageUrl, imageAlt, imageCaption, summary, notes, teachingTips, objectives, resources, duration, contentUrl } = req.body;
    if (title !== undefined && !String(title).trim()) return sendValidationError(res, ['Lesson title cannot be empty'], 'Invalid lesson title');
    if (contentSections !== undefined) {
      const sections = normalizeContentSections(contentSections);
      if (!sections) return sendValidationError(res, ['Every section needs a heading and body, with up to 30 sections allowed'], 'Invalid lesson sections');
      lesson.contentSections = sections;
    }
    if (selfChecks !== undefined) {
      const checks = normalizeSelfChecks(selfChecks);
      if (!checks) return sendValidationError(res, ['Every self-check needs a question and answer, with up to 20 checks allowed'], 'Invalid lesson self-checks');
      lesson.selfChecks = checks;
    }
    if (games !== undefined) {
      const normalizedGames = normalizeGames(games);
      if (!normalizedGames) return sendValidationError(res, ['Each flashcard game needs a title and 2–30 complete cards'], 'Invalid lesson games');
      lesson.games = normalizedGames;
    }
    if (title !== undefined) lesson.title = String(title).trim();
    if (content !== undefined) lesson.content = String(content);
    if (summary !== undefined) lesson.summary = String(summary);
    if (notes !== undefined) lesson.notes = String(notes);
    if (teachingTips !== undefined) lesson.teachingTips = String(teachingTips);
    if (objectives !== undefined) lesson.objectives = normalizeStringList(objectives);
    if (resources !== undefined) lesson.resources = normalizeStringList(resources);
    if (contentUrl !== undefined) lesson.contentUrl = String(contentUrl);
    if (imageUrl !== undefined) {
      const normalizedImageUrl = normalizeImageUrl(imageUrl);
      if (normalizedImageUrl === null) return sendValidationError(res, ['Use an http(s) image URL or a local path beginning with /'], 'Invalid lesson image');
      lesson.imageUrl = normalizedImageUrl;
    }
    if (imageAlt !== undefined) lesson.imageAlt = String(imageAlt).trim().slice(0, 300);
    if (imageCaption !== undefined) lesson.imageCaption = String(imageCaption).trim().slice(0, 500);
    if (duration !== undefined) lesson.duration = Number.isFinite(Number(duration)) && Number(duration) > 0 ? Number(duration) : undefined;

    await course.save();
    return sendSuccess(res, lesson, 'Lesson chapter updated successfully');
  } catch (err) {
    return sendError(res, 'Could not update lesson chapter', 500, err.message);
  }
};

// @desc    Delete a lesson from a module (Instructor only)
// @route   DELETE /api/courses/:id/modules/:moduleId/lessons/:lessonId
// @access  Private
exports.deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const module = course.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    module.lessons = module.lessons.filter(l => l._id.toString() !== req.params.lessonId);
    await course.save();
    res.json({ message: 'Lesson deleted', lessons: module.lessons });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Upload a file for a lesson (Instructor only)
// @route   POST /api/courses/:id/modules/:moduleId/lessons/:lessonId/upload
// @access  Private
exports.uploadLessonFile = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const module = course.modules.id(req.params.moduleId);
    if (!module) return res.status(404).json({ message: 'Module not found' });
    const lesson = module.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    if (req.file) {
      if (lesson.contentType === 'image' && !['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
        return sendValidationError(res, ['Lesson image uploads must be JPG, PNG, or WebP files'], 'Invalid lesson image');
      }
      lesson.contentUrl = `/uploads/${req.file.filename}`;
      await course.save();
      return res.json({ message: 'File uploaded', lesson });
    }
    res.status(400).json({ message: 'No file uploaded' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @desc    Check course completion and generate certificate if eligible
// @route   POST /api/courses/:id/check-completion
// @access  Private (Student)
exports.checkCourseCompletion = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('modules.assignments')
      .populate('modules.quizzes');

    if (!course) return sendNotFound(res, "Course not found");

    // Verify student is enrolled
    if (!course.enrolledStudents.some(studentId => studentId.toString() === req.user._id.toString())) {
      return sendForbidden(res, "You are not enrolled in this course");
    }

    // Get user's progress
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user || !user.progress) {
      return res.status(200).json({
        completed: false,
        progress: 0,
        message: "No progress data found"
      });
    }

    const courseProgress = user.progress.get(course._id.toString());
    if (!courseProgress) {
      return res.status(200).json({
        completed: false,
        progress: 0,
        message: "No progress data found for this course"
      });
    }

    // Calculate completion percentage
    let totalItems = 0;
    let completedItems = 0;

    const readProgressValue = (values, key) => values instanceof Map ? values.get(key) : values?.[key];

    // Check modules completion
    course.modules.forEach(module => {
      if (courseProgress.completedModules && courseProgress.completedModules.includes(module._id.toString())) {
        completedItems++;
      }
      totalItems++;

      // Check lessons completion (if lessons exist)
      if (module.lessons && module.lessons.length > 0) {
        module.lessons.forEach(lesson => {
          totalItems++;
          if (courseProgress.completedLessons && courseProgress.completedLessons.includes(lesson._id.toString())) {
            completedItems++;
          }
        });
      }

      // Check assignments completion
      if (module.assignments && module.assignments.length > 0) {
        module.assignments.filter(Boolean).forEach(assignment => {
          totalItems++;
          const passingGrade = assignment.passingGrade ?? course.passingThreshold ?? 40;
          const submission = (assignment.submissions || [])
            .filter(item => item.student.toString() === req.user._id.toString() && item.status === 'graded' && item.grade !== null && item.grade !== undefined && item.grade >= passingGrade)
            .reduce((best, item) => !best || item.grade > best.grade ? item : best, null);
          if (submission) {
            completedItems++;
          }
        });
      }

      // Check quizzes completion
      if (module.quizzes && module.quizzes.length > 0) {
        module.quizzes.filter(Boolean).forEach(quiz => {
          totalItems++;
          const recordedScore = Number(readProgressValue(courseProgress.scores, quiz._id.toString()));
          const studentAttempts = (quiz.attempts || []).filter(attempt => attempt.student.toString() === req.user._id.toString());
          const bestAttemptScore = studentAttempts.length
            ? studentAttempts.reduce((best, attempt) => Math.max(best, Number(attempt.score) || 0), 0)
            : -1;
          const bestScore = Math.max(Number.isFinite(recordedScore) ? recordedScore : -1, bestAttemptScore);
          if (bestScore >= (quiz.passingScore ?? course.passingThreshold ?? 40)) {
            completedItems++;
          }
        });
      }
    });

    const progressPercentage = totalItems > 0 ? Math.floor((completedItems / totalItems) * 100) : 0;

    // Check if course is completed
    const isCompleted = totalItems > 0 && completedItems === totalItems;
    const certificateResult = isCompleted
      ? await issueCertificateIfEligible(user._id, course._id)
      : null;
    const certificateGenerated = Boolean(certificateResult?.certificateGenerated);
    return res.status(200).json({
      completed: isCompleted,
      progress: progressPercentage,
      certificateGenerated,
      certificateIssuedNow: Boolean(certificateResult?.issuedNow),
      certificate: certificateGenerated ? certificateResult.certificate : null,
      certificateReason: certificateResult?.reason || null,
      message: isCompleted
        ? (certificateGenerated ? "Course completed and certificate issued." : certificateResult?.reason || "Course completed. Certificate issuance is being retried.")
        : `${Math.round(progressPercentage)}% complete`
    });

  } catch (err) {
    console.error('Course completion check error:', err);
    return sendError(res, "Server error", 500, err.message);
  }
};
