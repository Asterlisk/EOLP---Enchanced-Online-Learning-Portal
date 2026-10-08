const bcrypt = require("bcrypt");
const prisma = require("../db");
const courseCatalog = require("../../client/src/data/courseCatalog.json");

// Demonstration catalog for the student experience. Course topics and outlines
// are realistic starter content; replace the seeded instructor/account with
// institution-approved records before using this as a live academic catalog.
const STUDENT_USERNAME = process.env.SEED_STUDENT_USERNAME || "teststudent01";
const INSTRUCTOR_PASSWORD = process.env.SEED_INSTRUCTOR_PASSWORD;
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD;

const courses = [
  {
    code: "CS301",
    title: "Data Structures & Algorithms",
    description: "Analyze algorithm efficiency and implement data structures for organizing, searching, and processing information.",
    assignment: {
      title: "Linked List Implementation",
      instructions: "Implement a singly linked list with insert, delete, search, and traversal operations. Include input validation, a short complexity analysis, and tests for empty and single-element lists.",
    },
    quiz: {
      title: "Quiz 1: Algorithm Analysis",
      durationMinutes: 20,
      questions: [
        { prompt: "What is the time complexity of binary search on a sorted array?", answer: "O(log n)", distractors: ["O(n)", "O(n log n)", "O(1)"] },
        { prompt: "Which data structure follows last-in, first-out order?", answer: "Stack", distractors: ["Queue", "Binary tree", "Hash table"] },
      ],
    },
  },
  {
    code: "IT214",
    title: "Web Application Development",
    description: "Build accessible, data-driven web applications, from responsive interfaces through API integration and deployment.",
    assignment: {
      title: "Responsive Course Dashboard",
      instructions: "Create a responsive dashboard page using semantic HTML and CSS. Include a course summary, progress indicator, and upcoming activity list. Verify keyboard navigation and small-screen layout.",
    },
    quiz: {
      title: "Quiz 1: Web Foundations",
      durationMinutes: 20,
      questions: [
        { prompt: "Which HTML element is intended for a page's main, unique content?", answer: "main", distractors: ["aside", "footer", "nav"] },
        { prompt: "Which HTTP method is conventionally used to retrieve a resource?", answer: "GET", distractors: ["POST", "PATCH", "DELETE"] },
      ],
    },
  },
  {
    code: "MATH210",
    title: "Discrete Mathematics",
    description: "Develop the logic, proof, counting, and graph theory foundations used throughout computing.",
    assignment: {
      title: "Logic and Set Proof Portfolio",
      instructions: "Write formal proofs for two propositional equivalences and two set identities. State the rule used at each step and include a short explanation of one proof by contradiction.",
    },
    quiz: {
      title: "Quiz 1: Logic and Sets",
      durationMinutes: 20,
      questions: [
        { prompt: "Which expression is a tautology?", answer: "P ∨ ¬P", distractors: ["P ∧ ¬P", "P ∧ Q", "¬P ∧ ¬Q"] },
        { prompt: "If |A|=5, |B|=7, and |A ∩ B|=2, what is |A ∪ B|?", answer: "10", distractors: ["12", "14", "9"] },
      ],
    },
  },
  {
    code: "IT230",
    title: "Database Systems",
    description: "Model information, design relational schemas, write SQL queries, and apply normalization and transaction concepts.",
    assignment: {
      title: "Relational Schema and SQL Queries",
      instructions: "Convert a supplied entity-relationship model into relational tables. Identify primary and foreign keys, write five representative SQL queries, and explain how the schema satisfies 3NF.",
    },
    quiz: {
      title: "Quiz 1: Relational Design",
      durationMinutes: 20,
      questions: [
        { prompt: "A relation in 2NF but not 3NF may contain which dependency?", answer: "Transitive dependency", distractors: ["Partial dependency", "No candidate key", "A multivalued dependency only"] },
        { prompt: "Which SQL clause filters grouped results?", answer: "HAVING", distractors: ["WHERE", "ORDER BY", "FROM"] },
      ],
    },
  },
  {
    code: "IT220",
    title: "Human-Computer Interaction",
    description: "Apply user research, interaction design, accessibility, and usability evaluation to digital experiences.",
    assignment: {
      title: "Usability Evaluation Report",
      instructions: "Evaluate a small website task flow with at least three participants or a documented heuristic review. Describe the method, identify usability issues with evidence, and propose prioritized design changes.",
    },
    quiz: {
      title: "Quiz 1: User-Centred Design",
      durationMinutes: 20,
      questions: [
        { prompt: "What is the main purpose of a usability test?", answer: "Observe representative users completing tasks", distractors: ["Measure server throughput", "Prove the design has no defects", "Replace accessibility review"] },
        { prompt: "Which measure directly captures task effectiveness?", answer: "Task completion rate", distractors: ["Colour contrast ratio", "Page file size", "Number of menu items"] },
      ],
    },
  },
  {
    code: "IT240",
    title: "Computer Networks",
    description: "Study network architecture and protocols, addressing, routing, transport, and practical troubleshooting.",
    assignment: {
      title: "Subnetting and Network Troubleshooting Lab",
      instructions: "Plan IPv4 subnets for a small organization from a supplied address block. Document network and broadcast addresses, host ranges, and a troubleshooting sequence for a DNS connectivity issue.",
    },
    quiz: {
      title: "Quiz 1: Network Fundamentals",
      durationMinutes: 20,
      questions: [
        { prompt: "Which transport protocol provides ordered, reliable delivery?", answer: "TCP", distractors: ["UDP", "ARP", "ICMP"] },
        { prompt: "Which service translates domain names into IP addresses?", answer: "DNS", distractors: ["DHCP", "SSH", "NTP"] },
      ],
    },
  },
];

async function ensureAssignment(course, definition) {
  const existing = await prisma.assignment.findFirst({
    where: { courseId: course.id, title: definition.title },
  });
  if (existing) return existing;
  return prisma.assignment.create({
    data: {
      courseId: course.id,
      title: definition.title,
      instructions: definition.instructions,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

async function ensureCurriculum(course, outline, student) {
  for (const [moduleIndex, moduleDefinition] of outline.modules.entries()) {
    const courseModule = await prisma.courseModule.upsert({
      where: { courseId_title: { courseId: course.id, title: moduleDefinition.title } },
      update: { orderIndex: moduleIndex },
      create: {
        courseId: course.id,
        title: moduleDefinition.title,
        orderIndex: moduleIndex,
      },
    });

    for (const [lessonIndex, lessonDefinition] of moduleDefinition.lessons.entries()) {
      const lesson = await prisma.lesson.upsert({
        where: {
          moduleId_title: { moduleId: courseModule.id, title: lessonDefinition.title },
        },
        update: { type: lessonDefinition.type, orderIndex: lessonIndex },
        create: {
          moduleId: courseModule.id,
          title: lessonDefinition.title,
          type: lessonDefinition.type,
          orderIndex: lessonIndex,
        },
      });

      if (lessonDefinition.completed) {
        await prisma.lessonProgress.upsert({
          where: { studentId_lessonId: { studentId: student.id, lessonId: lesson.id } },
          update: {},
          create: { studentId: student.id, lessonId: lesson.id },
        });
      }
    }
  }
}

async function ensureQuiz(course, definition) {
  const existing = await prisma.quiz.findFirst({
    where: { courseId: course.id, title: definition.title },
  });
  if (existing) return existing;
  return prisma.quiz.create({
    data: {
      courseId: course.id,
      title: definition.title,
      type: "QUIZ",
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      durationMinutes: definition.durationMinutes,
      resultsReleased: false,
      questions: {
        create: definition.questions.map(({ prompt, answer, distractors }) => ({
          prompt,
          options: {
            create: [answer, ...distractors].map((text) => ({
              text,
              isCorrect: text === answer,
            })),
          },
        })),
      },
    },
  });
}

async function main() {
  if (!INSTRUCTOR_PASSWORD) throw new Error("Set SEED_INSTRUCTOR_PASSWORD before running the demo seed.");

  const instructor = await prisma.user.upsert({
    where: { username: "prof.santos" },
    update: {},
    create: {
      username: "prof.santos",
      passwordHash: await bcrypt.hash(INSTRUCTOR_PASSWORD, 10),
      role: "PROFESSOR",
    },
  });

  let student = await prisma.user.findUnique({
    where: { username: STUDENT_USERNAME },
  });
  if (!student) {
    if (!STUDENT_PASSWORD) throw new Error("Set SEED_STUDENT_PASSWORD before creating the demo student.");
    student = await prisma.user.create({
      data: {
        username: STUDENT_USERNAME,
        passwordHash: await bcrypt.hash(STUDENT_PASSWORD, 10),
        role: "STUDENT",
      },
    });
    console.log(`Student created: ${student.username}. Password configured from environment.`);
  } else {
    console.log(`Using existing student: ${student.username}`);
  }

  for (const definition of courses) {
    const outline = courseCatalog.find((item) => item.code === definition.code);
    if (!outline) throw new Error(`Missing curriculum outline for ${definition.code}`);

    const course = await prisma.course.upsert({
      where: { code: definition.code },
      update: {
        title: definition.title,
        description: definition.description,
        schedule: outline.schedule,
        instructorId: instructor.id,
      },
      create: {
        code: definition.code,
        title: definition.title,
        description: definition.description,
        schedule: outline.schedule,
        instructorId: instructor.id,
      },
    });
    await prisma.enrollment.upsert({
      where: {
        studentId_courseId: { studentId: student.id, courseId: course.id },
      },
      update: {},
      create: { studentId: student.id, courseId: course.id },
    });
    await ensureCurriculum(course, outline, student);
    const assignment = await ensureAssignment(course, definition.assignment);
    const quiz = await ensureQuiz(course, definition.quiz);
    console.log(`Ready: ${course.code} — ${course.title}; ${outline.modules.length} modules; assignment ${assignment.title}; quiz ${quiz.title}`);
  }

  console.log(`\nSeed complete: ${courses.length} courses enrolled for ${student.username}.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
