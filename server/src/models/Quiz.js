const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  text: { // Changed from 'question' to 'text' for consistency
    type: String,
    required: true,
  },
  options: {
    optionA: { type: String, required: true },
    optionB: { type: String, required: true },
    optionC: { type: String, required: true },
    optionD: { type: String, required: true }
  },
  correctAnswer: {
    type: String, // 'A', 'B', 'C', or 'D'
    required: true,
    enum: ['A', 'B', 'C', 'D']
  },
  explanation: {
    type: String,
    default: "",
  },
  points: {
    type: Number,
    default: 1,
    min: 0
  }
});

const attemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  answers: [
    {
      questionIndex: { type: Number, required: true },
      selectedAnswer: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    },
  ],
  score: {
    type: Number, // Percentage or points
    required: true,
  },
  attemptedAt: {
    type: Date,
    default: Date.now,
  },
  timeTaken: { type: Number, min: 0, default: null },
  isAutoSubmit: { type: Boolean, default: false },
});

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    questions: [questionSchema],
    attempts: [attemptSchema],
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    timeLimit: {
      type: Number, // in minutes
      default: null,
    },
    passingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 60,
    },
    attemptLimit: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
