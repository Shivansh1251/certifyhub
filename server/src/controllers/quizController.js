const QuizGenerator = require("../utils/quizGenerator");
const Course = require("../models/Course");
const Quiz = require("../models/Quiz");
const User = require("../models/User");
const { sendSuccess, sendError, sendNotFound, sendForbidden, sendConflict, sendValidationError } = require("../utils/apiResponse");
const { issueCertificateIfEligible } = require("./certificateController");

// @desc    Create a new quiz for a module
// @route   POST /api/quizzes
// @access  Private (Instructor only)
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, questions, courseId, moduleId, timeLimit, passingScore = 60, attemptLimit = 1, shuffleQuestions = false } = req.body;

    if (!title?.trim() || !description?.trim() || !Array.isArray(questions) || questions.length === 0 || questions.length > 100) {
      return sendValidationError(res, ["Provide a title, description, and between 1 and 100 questions"], "Invalid quiz");
    }

    // Verify instructor owns the course
    const course = await Course.findById(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendForbidden(res, "Not authorized to create quiz for this course");
    }

    const module = course.modules.id(moduleId);
    if (!module) return sendNotFound(res, "Module not found");
    if (!Number.isFinite(Number(passingScore)) || Number(passingScore) < 0 || Number(passingScore) > 100) {
      return sendValidationError(res, ["Passing score must be between 0 and 100"], "Invalid quiz settings");
    }
    if (!Number.isInteger(Number(attemptLimit)) || Number(attemptLimit) < 1 || Number(attemptLimit) > 10) {
      return sendValidationError(res, ["Attempt limit must be between 1 and 10"], "Invalid quiz settings");
    }

    let validQuestions;
    try {
      validQuestions = questions.map((question, index) => {
        const options = question.options || {};
        const option = (letter) => options[`option${letter}`] || options[letter];
        if (!question.text?.trim() || !['A', 'B', 'C', 'D'].every(letter => typeof option(letter) === 'string' && option(letter).trim()) || !['A', 'B', 'C', 'D'].includes(question.correctAnswer)) {
          throw new Error(`Question ${index + 1} must include text, four options, and a correct answer.`);
        }
        const points = Number(question.points ?? 1);
        if (!Number.isFinite(points) || points < 0 || points > 100) {
          throw new Error(`Question ${index + 1} has an invalid point value.`);
        }
        return {
          text: question.text.trim(),
          options: { optionA: option('A').trim(), optionB: option('B').trim(), optionC: option('C').trim(), optionD: option('D').trim() },
          correctAnswer: question.correctAnswer,
          explanation: String(question.explanation || '').trim(),
          points,
        };
      });
    } catch (questionError) {
      return sendValidationError(res, [questionError.message], "Invalid quiz questions");
    }

    const quiz = new Quiz({
      title: title.trim(),
      description: description.trim(),
      questions: validQuestions,
      course: courseId,
      module: moduleId,
      timeLimit: Number(timeLimit) > 0 ? Number(timeLimit) : null,
      passingScore: Number(passingScore),
      attemptLimit: Number(attemptLimit),
      shuffleQuestions: Boolean(shuffleQuestions),
    });

    const savedQuiz = await quiz.save();

    // Add to course module
    module.quizzes.push(savedQuiz._id);
    await course.save();

    return sendSuccess(res, savedQuiz, "Quiz created successfully", 201);
  } catch (err) {
    return sendError(res, "Server error", 500, err.message);
  }
};

// @route   GET /api/quizzes/:courseId
// @access  Private
exports.getQuizzes = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return sendNotFound(res, "Course not found");
    const isInstructor = course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin';
    const isEnrolled = course.enrolledStudents.some(student => student.toString() === req.user._id.toString());
    if (!isInstructor && !isEnrolled) return sendForbidden(res, "Not enrolled in this course");

    const quizzes = await Quiz.find({ course: req.params.courseId });
    if (isInstructor) {
      await Quiz.populate(quizzes, { path: 'attempts.student', select: 'name email' });
      return res.json(quizzes);
    }

    return res.json(quizzes.map(quiz => {
      const ownAttempts = quiz.attempts.filter(attempt => attempt.student.toString() === req.user._id.toString());
      return {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        timeLimit: quiz.timeLimit,
        passingScore: quiz.passingScore,
        attemptLimit: quiz.attemptLimit,
        attemptsRemaining: Math.max(0, quiz.attemptLimit - ownAttempts.length),
      };
    }));
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @route   GET /api/quizzes/single/:id
// @access  Private
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return sendNotFound(res, "Quiz not found");

    const course = await Course.findById(quiz.course);
    if (!course) return sendNotFound(res, "Course not found");
    const isInstructor = course.instructor.toString() === req.user._id.toString() || req.user.role === 'admin';
    const isEnrolled = course.enrolledStudents.some(student => student.toString() === req.user._id.toString());
    if (!isInstructor && !isEnrolled) return sendForbidden(res, "Not enrolled in this course");

    // For students, hide correct answers
    const quizData = quiz.toObject();
    const ownAttempts = quiz.attempts.filter(attempt => attempt.student.toString() === req.user._id.toString());
    quizData.attemptCount = ownAttempts.length;
    quizData.attemptsRemaining = Math.max(0, (quiz.attemptLimit || 1) - ownAttempts.length);
    if (req.user.role === "student") {
      delete quizData.attempts;
      quizData.questions = quiz.questions.map((q, index) => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        points: q.points,
        questionIndex: index,
        // correctAnswer is hidden for students
      }));
      if (quiz.shuffleQuestions) {
        for (let index = quizData.questions.length - 1; index > 0; index--) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [quizData.questions[index], quizData.questions[swapIndex]] = [quizData.questions[swapIndex], quizData.questions[index]];
        }
      }
    } else {
      // For instructors, include correct answers
      quizData.questions = quiz.questions.map((q, index) => ({
        _id: q._id,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        points: q.points,
        questionIndex: index
      }));
    }

    return sendSuccess(res, quizData, "Quiz retrieved successfully");
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Submit quiz answers
// @route   POST /api/quizzes/:id/submit
// @access  Private (Student)
exports.submitQuiz = async (req, res) => {
  try {
    const { answers, timeTaken = null, isAutoSubmit = false } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return sendNotFound(res, "Quiz not found");
    if (req.user.role !== 'student') return sendForbidden(res, "Only enrolled students can submit this quiz");

    const course = await Course.findById(quiz.course);
    if (!course) return sendNotFound(res, "Course not found");
    if (!course.enrolledStudents.some(student => student.toString() === req.user._id.toString())) {
      return sendForbidden(res, "Not enrolled in this course");
    }

    const existingAttempts = quiz.attempts.filter(attempt => attempt.student.toString() === req.user._id.toString());
    const attemptLimit = quiz.attemptLimit || 1;
    if (existingAttempts.length >= attemptLimit) {
      return sendConflict(res, `You have used all ${attemptLimit} attempt${attemptLimit === 1 ? '' : 's'} for this quiz.`);
    }

    if (!Array.isArray(answers)) {
      return sendValidationError(res, ["Answers are required"], "Invalid submission");
    }

    const answerMap = new Map();
    for (const answer of answers) {
      if (!answer || !Number.isInteger(answer.questionIndex) || answer.questionIndex < 0 || answer.questionIndex >= quiz.questions.length || !['A', 'B', 'C', 'D'].includes(answer.selectedAnswer) || answerMap.has(answer.questionIndex)) {
        return sendValidationError(res, ["Answers must contain unique valid question indexes and options"], "Invalid submission");
      }
      answerMap.set(answer.questionIndex, answer.selectedAnswer);
    }

    let correct = 0;
    const questionResults = [];
    const totalPossiblePoints = quiz.questions.reduce((total, question) => total + (question.points ?? 1), 0);
    let earnedPoints = 0;

    quiz.questions.forEach((question, questionIndex) => {
      const selectedAnswer = answerMap.get(questionIndex) || null;
      const isCorrect = question.correctAnswer === selectedAnswer;
      const possiblePoints = question.points ?? 1;
      const pointsEarned = isCorrect ? possiblePoints : 0;
      if (isCorrect) correct++;
      earnedPoints += pointsEarned;
      questionResults.push({
        questionIndex,
        questionText: question.text,
        selectedAnswer,
        selectedAnswerText: selectedAnswer ? question.options[`option${selectedAnswer}`] : null,
        correctAnswer: question.correctAnswer,
        correctAnswerText: question.options[`option${question.correctAnswer}`],
        explanation: question.explanation || '',
        isCorrect,
        points: pointsEarned,
        possiblePoints,
      });
    });

    const totalQuestions = quiz.questions.length;
    const score = totalPossiblePoints > 0 ? (earnedPoints / totalPossiblePoints) * 100 : 0;
    const roundedScore = Math.round(score * 100) / 100;
    const now = new Date();

    quiz.attempts.push({
      student: req.user._id,
      answers: Array.from(answerMap, ([questionIndex, selectedAnswer]) => ({ questionIndex, selectedAnswer })),
      score: roundedScore,
      timeTaken: Number.isFinite(Number(timeTaken)) && Number(timeTaken) >= 0 ? Number(timeTaken) : null,
      isAutoSubmit: Boolean(isAutoSubmit),
      attemptedAt: now,
    });
    await quiz.save();

    const user = await User.findById(req.user._id);
    if (!user.progress) user.progress = new Map();
    const courseKey = quiz.course.toString();
    const courseProgress = user.progress.get(courseKey) || { completedModules: [], completedLessons: [], grades: {}, scores: {}, notes: {} };
    const scores = courseProgress.scores instanceof Map ? courseProgress.scores : new Map(Object.entries(courseProgress.scores || {}));
    const previousBestScore = scores.get(quiz._id.toString());
    scores.set(quiz._id.toString(), Math.max(Number(previousBestScore) || 0, roundedScore));
    courseProgress.scores = scores;
    user.progress.set(courseKey, courseProgress);
    user.markModified('progress');
    await user.save();

    const certificateResult = await issueCertificateIfEligible(user._id, quiz.course);

    const gradingResult = {
      score: roundedScore,
      earnedPoints,
      totalPoints: totalPossiblePoints,
      percentage: roundedScore,
      questionsCorrect: correct,
      totalQuestions,
      questionResults,
      submittedAt: now.toISOString(),
      timeTaken: Number.isFinite(Number(timeTaken)) && Number(timeTaken) >= 0 ? Number(timeTaken) : null,
      isAutoSubmit: Boolean(isAutoSubmit),
      passingScore: quiz.passingScore ?? 60,
      isPassed: roundedScore >= (quiz.passingScore ?? 60),
      attemptNumber: existingAttempts.length + 1,
      attemptsRemaining: Math.max(0, attemptLimit - existingAttempts.length - 1),
      certificateGenerated: certificateResult.certificateGenerated,
      certificateIssuedNow: Boolean(certificateResult.issuedNow),
      status: 'submitted',
    };
    return sendSuccess(res, gradingResult, "Quiz submitted and graded successfully");
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Delete a quiz
// @route   DELETE /api/quizzes/:id
// @access  Private (Instructor)
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    // Verify instructor
    const course = await Course.findById(quiz.course);
    if (course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Remove from course module
    const module = course.modules.id(quiz.module);
    if (module) {
      module.quizzes = module.quizzes.filter(q => q.toString() !== quiz._id.toString());
      await course.save();
    }

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: "Quiz deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get attempts and per-question feedback for a quiz
// @route   GET /api/quizzes/:id/attempts
// @access  Private (course instructor or admin)
exports.getQuizAttempts = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('attempts.student', 'name email');
    if (!quiz) return sendNotFound(res, 'Quiz not found');
    const course = await Course.findById(quiz.course);
    if (!course) return sendNotFound(res, 'Course not found');
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendForbidden(res, 'Only the course instructor can view quiz attempts.');
    }

    const attempts = quiz.attempts.map(attempt => ({
      _id: attempt._id,
      student: attempt.student,
      score: attempt.score,
      attemptedAt: attempt.attemptedAt,
      timeTaken: attempt.timeTaken,
      isAutoSubmit: attempt.isAutoSubmit,
      answers: attempt.answers.map(answer => {
        const question = quiz.questions[answer.questionIndex];
        return {
          questionIndex: answer.questionIndex,
          questionText: question?.text || '',
          selectedAnswer: answer.selectedAnswer,
          selectedAnswerText: question?.options?.[`option${answer.selectedAnswer}`] || '',
          correctAnswer: question?.correctAnswer || '',
          correctAnswerText: question?.options?.[`option${question.correctAnswer}`] || '',
          explanation: question?.explanation || '',
          isCorrect: question?.correctAnswer === answer.selectedAnswer,
        };
      }),
    }));
    return sendSuccess(res, { quizId: quiz._id, attempts }, 'Quiz attempts retrieved successfully');
  } catch (err) {
    return sendError(res, 'Failed to load quiz attempts', 500, err.message);
  }
};
// @route   POST /api/quizzes/generate
// @access  Private (Instructor only)
exports.generateQuiz = async (req, res) => {
  try {
    const { title, description, topic, content, courseId, moduleId, difficulty = 3, numQuestions = 5 } = req.body;

    // Validate required fields
    if (!title || !description || !topic || !content || !courseId || !moduleId) {
      return sendValidationError(res, ["title", "description", "topic", "content", "courseId", "moduleId"], "Missing required fields");
    }

    // Verify instructor owns the course
    const course = await Course.findById(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return sendForbidden(res, "Not authorized to create quiz for this course");
    }

    const module = course.modules.id(moduleId);
    if (!module) return sendNotFound(res, "Module not found");
    const questionCount = Number(numQuestions);
    const difficultyLevel = Number(difficulty);
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100 || !Number.isInteger(difficultyLevel) || difficultyLevel < 1 || difficultyLevel > 5) {
      return sendValidationError(res, ["Question count must be 1-100 and difficulty must be 1-5"], "Invalid quiz settings");
    }

    // Generate quiz questions using AI
    const quizData = await QuizGenerator.generateQuiz(title, description, topic, content, difficultyLevel, questionCount);
    const questions = quizData.questions.map(question => ({
      ...question,
      options: {
        optionA: question.options.optionA || question.options.A,
        optionB: question.options.optionB || question.options.B,
        optionC: question.options.optionC || question.options.C,
        optionD: question.options.optionD || question.options.D,
      },
    }));

    // Create the quiz in database
    const quiz = new Quiz({
      ...quizData,
      questions,
      course: courseId,
      module: moduleId,
    });

    const savedQuiz = await quiz.save();

    module.quizzes.push(savedQuiz._id);
    await course.save();

    return sendSuccess(res, {
      ...savedQuiz.toObject(),
      aiGenerated: true,
      generationInfo: {
        topic,
        difficulty: difficultyLevel,
        numQuestions: questionCount,
        generatedAt: new Date()
      }
    }, "Quiz generated successfully using AI", 201);
  } catch (err) {
    console.error('Error generating quiz:', err);
    return sendError(res, "Failed to generate quiz", 500, err.message);
  }
};
