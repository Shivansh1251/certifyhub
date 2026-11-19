const mongoose = require("mongoose");

const lessonSectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["theory", "worked_example", "key_terms", "common_mistakes", "takeaways"],
    default: "theory",
  },
  heading: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 12000 },
});

const selfCheckSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 500 },
  answer: { type: String, required: true, trim: true, maxlength: 1500 },
});

const flashcardSchema = new mongoose.Schema({
  front: { type: String, required: true, trim: true, maxlength: 300 },
  back: { type: String, required: true, trim: true, maxlength: 2000 },
});

const lessonGameSchema = new mongoose.Schema({
  type: { type: String, enum: ["flashcards"], default: "flashcards" },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  instructions: { type: String, trim: true, maxlength: 400, default: "" },
  cards: { type: [flashcardSchema], default: [] },
});

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  contentType: {
    type: String,
    enum: ["video", "pdf", "doc", "slide", "dataset", "image", "text"],
    default: "text",
  },
  content: { type: String }, // For text lessons
  contentSections: { type: [lessonSectionSchema], default: [] },
  selfChecks: { type: [selfCheckSchema], default: [] },
  games: { type: [lessonGameSchema], default: [] },
  imageUrl: { type: String, default: "", maxlength: 2048 },
  imageAlt: { type: String, default: "", maxlength: 300 },
  imageCaption: { type: String, default: "", maxlength: 500 },
  summary: { type: String, default: "" },
  notes: { type: String, default: "" },
  teachingTips: { type: String, default: "" },
  objectives: { type: [String], default: [] },
  resources: { type: [String], default: [] },
  contentUrl: { type: String }, // URL or file path
  duration: { type: Number }, // in minutes
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  lessons: [lessonSchema],
  assignments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
    },
  ],
  quizzes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
    },
  ],
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
    },
    description: {
      type: String,
      required: [true, "Course description is required"],
    },
    prerequisites: {
      type: [String],
      default: [],
    },
    learningOutcomes: {
      type: [String],
      default: [],
    },
    estimatedDurationHours: {
      type: Number,
      min: 0,
      default: null,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0, // 0 = free
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    modules: [moduleSchema],
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    enrolledStudents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
    },
    isCompletedByInstructor: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    passingThreshold: {
      type: Number,
      default: 40, // Minimum grade required for course completion
      min: 0,
      max: 100
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
