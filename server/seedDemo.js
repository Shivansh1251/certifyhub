const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./src/models/User");
const Course = require("./src/models/Course");
const Quiz = require("./src/models/Quiz");
const demoLessonChapters = require("./demoLessonChapters");
const mergeDemoModules = require("./demoLessonMerge");

const demoUsers = {
  instructor: {
    name: "DBMS Instructor",
    email: "instructor@certifyhub.demo",
    password: "Instructor123!",
    role: "instructor",
    bio: "Database educator and software engineer.",
    skills: ["SQL", "Database Design", "MongoDB"],
  },
  student: {
    name: "Demo Student",
    email: "student@certifyhub.demo",
    password: "Student123!",
    role: "student",
    bio: "Learning databases and backend development.",
    skills: ["JavaScript", "SQL"],
  },
};

const courseTemplates = [
  {
    title: "DBMS Fundamentals - Free Starter Course",
    description:
      "Learn relational databases, ER diagrams, normalization, keys, and introductory SQL through practical examples.",
    category: "Programming",
    price: 0,
    prerequisites: ["No prior database experience required", "Basic computer literacy"],
    learningOutcomes: ["Explain how a DBMS organizes data", "Design normalized relational tables", "Write useful SQL queries", "Use constraints and transactions to protect data"],
    estimatedDurationHours: 8,
    modules: [
      {
        title: "Database Foundations",
        lessons: [
          { title: "What is a DBMS?", contentType: "text", content: "A DBMS stores, organizes, secures, and retrieves structured data." },
          { title: "Tables, rows, and keys", contentType: "text", content: "Explore primary keys, foreign keys, and relationships." },
        ],
      },
      {
        title: "Relational Modeling and Normalization",
        lessons: [
          { title: "Entities and relationships", contentType: "text", content: "Translate a real-world problem into entities, attributes, and relationships." },
          { title: "Normalize a small database", contentType: "text", content: "Use 1NF, 2NF, and 3NF to reduce duplication and update anomalies." },
        ],
      },
      {
        title: "SQL Essentials",
        lessons: [
          { title: "SELECT and filtering", contentType: "text", content: "Write SELECT, WHERE, ORDER BY, and LIMIT queries." },
          { title: "JOINs and aggregation", contentType: "text", content: "Combine tables and summarize data with JOIN, GROUP BY, and COUNT." },
        ],
      },
      {
        title: "Data Integrity and Database Design",
        lessons: [
          { title: "Constraints and safe updates", contentType: "text", content: "Use NOT NULL, UNIQUE, CHECK, and foreign-key constraints to protect data." },
          { title: "Choosing the right data types", contentType: "text", content: "Select clear, storage-efficient types for common application data." },
        ],
      },
      {
        title: "Transactions and Capstone Review",
        lessons: [
          { title: "Transaction basics", contentType: "text", content: "Group related SQL changes into transactions and understand commit and rollback." },
          { title: "Design a library database", contentType: "text", content: "Bring the course together by modeling a small library and writing queries for it." },
        ],
      },
    ],
  },
  {
    title: "DBMS Mastery - SQL, Design & Performance",
    description:
      "A complete paid DBMS path covering normalization, transactions, indexing, query optimization, and production database design.",
    category: "Programming",
    price: 1499,
    prerequisites: ["Basic SQL SELECT and JOIN queries", "Comfort with tables and relational keys"],
    learningOutcomes: ["Model production-ready relational schemas", "Use advanced SQL and transactions", "Choose indexes using query plans", "Plan database recovery and reliability"],
    estimatedDurationHours: 24,
    modules: [
      {
        title: "Relational Design",
        lessons: [
          { title: "ER modeling", contentType: "text", content: "Design entities, relationships, and constraints for real systems." },
          { title: "Normalization workshop", contentType: "text", content: "Apply 1NF, 2NF, 3NF, and BCNF to remove data anomalies." },
        ],
      },
      {
        title: "Transactions and Performance",
        lessons: [
          { title: "ACID and isolation", contentType: "text", content: "Understand atomicity, consistency, isolation, and durability." },
          { title: "Indexes and query plans", contentType: "text", content: "Choose indexes and read query plans to improve performance." },
        ],
      },
      {
        title: "Advanced SQL and Data Modeling",
        lessons: [
          { title: "Window functions and CTEs", contentType: "text", content: "Use common table expressions and window functions to express analytical queries." },
          { title: "Schema evolution", contentType: "text", content: "Plan safe schema changes and migrations as an application grows." },
        ],
      },
      {
        title: "Concurrency and Recovery",
        lessons: [
          { title: "Locks and concurrent workloads", contentType: "text", content: "See how locking and isolation levels affect concurrent transactions." },
          { title: "Backups and recovery planning", contentType: "text", content: "Compare backup strategies and practice a recovery checklist." },
        ],
      },
      {
        title: "Production Database Capstone",
        lessons: [
          { title: "Model a production workload", contentType: "text", content: "Choose a schema and constraints for a realistic order-processing service." },
          { title: "Review performance and reliability", contentType: "text", content: "Use query plans, indexes, transactions, and backups to refine the capstone design." },
        ],
      },
    ],
  },
  {
    title: "Full-Stack Cloud Engineer",
    description:
      "Build and deploy production-ready applications with modern frontend, backend, containers, and cloud deployment practices.",
    category: "Development",
    price: 999,
    prerequisites: ["Basic JavaScript and HTML/CSS", "A computer that can run Node.js"],
    learningOutcomes: ["Build a structured React frontend", "Create authenticated REST APIs", "Persist and validate application data", "Deploy and monitor a cloud application"],
    estimatedDurationHours: 30,
    modules: [
      {
        title: "Full-Stack Foundations",
        lessons: [
          { title: "Frontend architecture", contentType: "text", content: "Organize React components, routes, state, and reusable UI patterns." },
          { title: "Building REST APIs", contentType: "text", content: "Design Express endpoints with validation, authentication, and clear responses." },
        ],
      },
      {
        title: "Deploying to the Cloud",
        lessons: [
          { title: "Containers and environments", contentType: "text", content: "Package applications with Docker and configure environment-specific settings." },
          { title: "Production deployment checklist", contentType: "text", content: "Prepare logs, health checks, security headers, and database connections for release." },
        ],
      },
      {
        title: "Product Planning and Application Architecture",
        lessons: [
          { title: "Plan a full-stack feature", contentType: "text", content: "Break a product requirement into user flows, UI states, and API needs." },
          { title: "Choose a simple application architecture", contentType: "text", content: "Map the frontend, backend, database, and external services before coding." },
        ],
      },
      {
        title: "Data, Security, and Testing",
        lessons: [
          { title: "Persist data safely", contentType: "text", content: "Model application data and validate input at the API boundary." },
          { title: "Test the critical user journey", contentType: "text", content: "Plan checks for authentication, API errors, and end-to-end user flows." },
        ],
      },
      {
        title: "Release and Operate a Cloud Application",
        lessons: [
          { title: "CI/CD and release readiness", contentType: "text", content: "Automate repeatable build and deployment steps with a release checklist." },
          { title: "Monitor and improve after launch", contentType: "text", content: "Use logs, metrics, and health checks to respond to production issues." },
        ],
      },
    ],
    quizDefinitions: [{
      title: "Cloud Engineering Checkpoint",
      description: "Test your knowledge of APIs, containers, and production deployment.",
      questions: [
        { text: "What is the main purpose of an API?", options: { optionA: "Connect software systems", optionB: "Design images", optionC: "Replace a database", optionD: "Format a hard drive" }, correctAnswer: "A", points: 2 },
        { text: "What does a container package?", options: { optionA: "Only source code", optionB: "Application and its dependencies", optionC: "Only database rows", optionD: "A browser tab" }, correctAnswer: "B", points: 2 },
        { text: "A health endpoint is useful for checking what?", options: { optionA: "Application availability", optionB: "CSS colors", optionC: "User passwords", optionD: "Image size" }, correctAnswer: "A", points: 2 },
      ],
    }],
  },
  {
    title: "Product Design Accelerator",
    description:
      "Learn user research, wireframing, visual systems, and portfolio storytelling to ship polished product case studies.",
    category: "Design",
    price: 0,
    prerequisites: ["No design software experience required", "Curiosity about how people use digital products"],
    learningOutcomes: ["Plan user research", "Map clear product flows", "Build accessible UI systems", "Present an evidence-based design case study"],
    estimatedDurationHours: 18,
    modules: [
      {
        title: "Research and Product Thinking",
        lessons: [
          { title: "Interviewing users", contentType: "text", content: "Ask focused questions and turn observations into clear user needs." },
          { title: "Mapping the user journey", contentType: "text", content: "Visualize pain points, moments of truth, and opportunities for improvement." },
        ],
      },
      {
        title: "From Wireframe to Case Study",
        lessons: [
          { title: "Wireframes and prototypes", contentType: "text", content: "Move from rough sketches to testable product flows." },
          { title: "Presenting design decisions", contentType: "text", content: "Explain constraints, iterations, and outcomes in a strong portfolio story." },
        ],
      },
      {
        title: "Information Architecture and User Flows",
        lessons: [
          { title: "Organize content and navigation", contentType: "text", content: "Group information around user goals and make important paths easy to find." },
          { title: "Map key product journeys", contentType: "text", content: "Show steps, decisions, and edge cases in a clear end-to-end user flow." },
        ],
      },
      {
        title: "Visual Systems and Accessible UI",
        lessons: [
          { title: "Build a reusable visual system", contentType: "text", content: "Define type, color, spacing, and reusable interface components." },
          { title: "Design for accessibility", contentType: "text", content: "Check contrast, focus order, labels, and readable interaction states." },
        ],
      },
      {
        title: "Prototype, Test, and Tell the Story",
        lessons: [
          { title: "Run a usability test", contentType: "text", content: "Give participants realistic tasks and record where they struggle." },
          { title: "Turn iteration into a case study", contentType: "text", content: "Present the problem, research, tradeoffs, iterations, and outcomes in a portfolio story." },
        ],
      },
    ],
    quizDefinitions: [{
      title: "Product Design Foundations",
      description: "Review the core principles of user research and prototyping.",
      questions: [
        { text: "What should user interviews focus on?", options: { optionA: "User behavior and needs", optionB: "Only personal opinions", optionC: "Brand colors", optionD: "Developer salaries" }, correctAnswer: "A", points: 2 },
        { text: "A prototype is mainly used to do what?", options: { optionA: "Test a product idea", optionB: "Deploy a database", optionC: "Write backend logs", optionD: "Compress images" }, correctAnswer: "A", points: 2 },
      ],
    }],
  },
  {
    title: "AI for Business Operations",
    description:
      "Use practical AI workflows to automate reporting, customer operations, document processing, and everyday business decisions.",
    category: "Business",
    price: 799,
    prerequisites: ["Familiarity with a business process you want to improve", "No coding experience required"],
    learningOutcomes: ["Identify suitable AI automation workflows", "Build prompts and structured handoffs", "Keep human review in sensitive workflows", "Measure quality and business impact"],
    estimatedDurationHours: 12,
    modules: [
      {
        title: "AI Workflow Fundamentals",
        lessons: [
          { title: "Finding automation opportunities", contentType: "text", content: "Identify repeatable tasks where AI can safely save time." },
          { title: "Prompting for reliable output", contentType: "text", content: "Give models context, constraints, examples, and clear output formats." },
        ],
      },
      {
        title: "Responsible Business Automation",
        lessons: [
          { title: "Human review and quality checks", contentType: "text", content: "Keep people in the loop for important or sensitive decisions." },
          { title: "Measuring workflow impact", contentType: "text", content: "Track time saved, accuracy, adoption, and business outcomes." },
        ],
      },
      {
        title: "Workflow Discovery and Process Mapping",
        lessons: [
          { title: "Map a repeatable business process", contentType: "text", content: "Document inputs, handoffs, exceptions, and decision points before automating." },
          { title: "Prioritize safe automation candidates", contentType: "text", content: "Compare task volume, time cost, error impact, and human review needs." },
        ],
      },
      {
        title: "Documents, Data, and AI Tools",
        lessons: [
          { title: "Extract information from documents", contentType: "text", content: "Design a workflow that turns incoming documents into structured data for review." },
          { title: "Connect tools with reliable handoffs", contentType: "text", content: "Pass structured outputs between systems and handle missing or malformed data." },
        ],
      },
      {
        title: "Build and Evaluate an Operations Workflow",
        lessons: [
          { title: "Prototype a customer operations workflow", contentType: "text", content: "Combine classification, drafting, and a human approval step in a small workflow." },
          { title: "Evaluate quality and business impact", contentType: "text", content: "Measure output accuracy, review effort, time saved, and failure cases." },
        ],
      },
    ],
    quizDefinitions: [{
      title: "AI Operations Readiness Quiz",
      description: "Check your understanding of practical and responsible AI automation.",
      questions: [
        { text: "A good automation candidate is usually what?", options: { optionA: "A repeatable, well-defined task", optionB: "An undefined crisis", optionC: "A private password", optionD: "A random decision" }, correctAnswer: "A", points: 2 },
        { text: "Why are human review steps important?", options: { optionA: "To catch errors and manage risk", optionB: "To remove all automation", optionC: "To slow every workflow", optionD: "To hide metrics" }, correctAnswer: "A", points: 2 },
      ],
    }],
  },
];

// Keep the original starter text as migration metadata so existing demo records
// are upgraded only when their lesson still matches the untouched seed content.
for (const template of courseTemplates) {
  for (const module of template.modules || []) {
    for (const lesson of module.lessons || []) {
      const chapter = demoLessonChapters.get(lesson.title);
      if (!chapter) continue;
      lesson._starterContent = lesson.content;
      Object.assign(lesson, chapter);
    }
  }
}

async function upsertDemoUser(details) {
  let user = await User.findOne({ email: details.email });
  if (!user) {
    user = new User(details);
  } else {
    Object.assign(user, details);
  }
  user.password = details.password;
  await user.save();
  return user;
}

async function seedDemo() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/certifyhub");
  const instructor = await upsertDemoUser(demoUsers.instructor);
  const student = await upsertDemoUser(demoUsers.student);

  const courses = [];
  for (const template of courseTemplates) {
    let course = await Course.findOne({ title: template.title, instructor: instructor._id });
    if (!course) {
      course = new Course({ ...template, instructor: instructor._id });
    } else {
      course.description = template.description;
      course.category = template.category;
      course.price = template.price;
      course.prerequisites = template.prerequisites;
      course.learningOutcomes = template.learningOutcomes;
      course.estimatedDurationHours = template.estimatedDurationHours;
      mergeDemoModules(course.modules, template.modules);
    }
    await course.save();
    const quizDefinitions = template.quizDefinitions || (template.price === 0
      ? [{
          title: "DBMS Foundations Checkpoint",
          description: "Test your understanding of tables, keys, and relational database concepts.",
          questions: [
            { text: "Which key uniquely identifies a row?", options: { optionA: "Foreign key", optionB: "Primary key", optionC: "Composite view", optionD: "Index page" }, correctAnswer: "B", points: 2 },
            { text: "What does SQL primarily allow you to do?", options: { optionA: "Query and manage data", optionB: "Design logos", optionC: "Compile operating systems", optionD: "Edit videos" }, correctAnswer: "A", points: 2 },
            { text: "Which relationship connects one record to many records?", options: { optionA: "One-to-one", optionB: "Many-to-many", optionC: "One-to-many", optionD: "None" }, correctAnswer: "C", points: 2 },
          ],
        }]
      : [{
          title: "Database Design & Performance Assessment",
          description: "Check your understanding of normalization, transactions, and indexes.",
          questions: [
            { text: "The main goal of normalization is to reduce what?", options: { optionA: "Data redundancy", optionB: "Security", optionC: "Availability", optionD: "Backups" }, correctAnswer: "A", points: 3 },
            { text: "Which ACID property means a transaction is all-or-nothing?", options: { optionA: "Consistency", optionB: "Isolation", optionC: "Atomicity", optionD: "Durability" }, correctAnswer: "C", points: 3 },
            { text: "An index is primarily used to improve what?", options: { optionA: "Query lookup speed", optionB: "Password strength", optionC: "Screen resolution", optionD: "File compression" }, correctAnswer: "A", points: 3 },
          ],
        }]);
    const module = course.modules[0];
    for (const quizDefinition of quizDefinitions) {
      const quiz = await Quiz.findOneAndUpdate(
        { title: quizDefinition.title, course: course._id },
        { ...quizDefinition, course: course._id, module: module._id, timeLimit: 10 },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (!module.quizzes.some((quizId) => quizId.toString() === quiz._id.toString())) {
        module.quizzes.push(quiz._id);
      }
    }
    await course.save();
    courses.push(course);
  }

  console.log("Demo data ready.");
  console.log("Instructor: instructor@certifyhub.demo / Instructor123!");
  console.log("Student: student@certifyhub.demo / Student123!");
  console.log(`Courses created or updated: ${courses.length}`);
  console.log(`Student enrollments: ${student.enrolledCourses.length}`);
  await mongoose.disconnect();
}

seedDemo().catch(async (error) => {
  console.error("Demo seed failed:", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
