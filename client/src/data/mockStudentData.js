// Mock data for the EOLP student dashboard.
// Shape matches what the real API is expected to eventually return, so
// swapping this for live fetches later should mean minimal UI changes.

export const mockSummary = {
  enrolledCourses: 6,
  pendingAssignments: 3,
  upcomingAssessments: 6,
  overallProgress: 53, // average course completion, rounded
  totalXP: 2140,
};

export const mockContinueLearning = [
  {
    id: "c1",
    title: "Data Structures & Algorithms",
    instructor: "Instructor profile pending",
    progress: 72,
    lastAccessed: "2 hours ago",
  },
  {
    id: "c2",
    title: "Web Application Development",
    instructor: "Instructor profile pending",
    progress: 45,
    lastAccessed: "Yesterday",
  },
  {
    id: "c3",
    title: "Discrete Mathematics",
    instructor: "Instructor profile pending",
    progress: 90,
    lastAccessed: "3 days ago",
  },
];

export const mockUpcomingActivities = [
  {
    id: "a1",
    title: "Linked List Implementation",
    course: "Data Structures & Algorithms",
    type: "Assignment",
    due: "Oct 4, 11:59 PM",
    status: "Not Started",
  },
  {
    id: "a2",
    title: "Quiz 1: Logic and Sets",
    course: "Discrete Mathematics",
    type: "Exam",
    due: "Oct 6, 9:00 AM",
    status: "In Progress",
  },
  {
    id: "a3",
    title: "React Components Lab",
    course: "Web Application Development",
    type: "Virtual Class",
    due: "Oct 3, 2:00 PM",
    status: "Upcoming",
  },
  {
    id: "a4",
    title: "Quiz 1: Relational Design",
    course: "Database Systems",
    type: "Quiz",
    due: "Oct 7, 11:59 PM",
    status: "Not Started",
  },
];

export const mockAnnouncements = [
  {
    id: "n1",
    title: "Midterm exam coverage posted",
    course: "Discrete Mathematics",
    instructor: "Instructor profile pending",
    date: "Oct 1, 2026",
    preview:
      "The midterm will cover chapters 1 through 5, including proofs and set theory.",
  },
  {
    id: "n2",
    title: "Lab schedule moved to Friday",
    course: "Web Application Development",
    instructor: "Instructor profile pending",
    date: "Sep 29, 2026",
    preview:
      "This week's lab session has been moved from Wednesday to Friday, same time.",
  },
  {
    id: "n3",
    title: "Bonus points for early submission",
    course: "Data Structures & Algorithms",
    instructor: "Instructor profile pending",
    date: "Sep 27, 2026",
    preview:
      "Submit the linked list assignment 24 hours early for 5 bonus points.",
  },
];

export const mockLearningProgress = {
  completedLessons: 18,
  totalLessons: 38,
  completedModules: 2,
  totalModules: 17,
  courseCompletion: 53,
  recentActivity: [
    { id: "r1", label: "Completed: Sorting Algorithms", time: "Today" },
    { id: "r2", label: "Submitted: CSS Flexbox Lab", time: "Yesterday" },
    { id: "r3", label: "Watched: Relational Algebra", time: "2 days ago" },
  ],
};

export const mockGamification = {
  xp: 2140,
  level: 7,
  xpToNextLevel: 2500,
  badges: [
    { id: "b1", label: "Early Bird", icon: "Sunrise" },
    { id: "b2", label: "Streak x7", icon: "Flame" },
    { id: "b3", label: "Top Submitter", icon: "Trophy" },
  ],
};

export const mockNotifications = [
  { id: "ntf1", message: "Grade released for Quiz 2", read: false },
  { id: "ntf2", message: "New material in Database Systems", read: false },
  { id: "ntf3", message: "Assignment due in 2 days", read: true },
];

// ---- Phase 2 data ----

export const mockAssignments = [
  {
    id: "asg1",
    title: "Linked List Implementation",
    course: "Data Structures & Algorithms",
    courseId: "c1",
    instructions:
      "Implement a singly linked list in C with insert, delete, and search operations. Submit your .c file and a short write-up.",
    due: "Oct 4, 2026, 11:59 PM",
    status: "Not Started",
    submittedAt: null,
    grade: null,
    feedback: null,
  },
  {
    id: "asg2",
    title: "Responsive Course Dashboard",
    course: "Web Application Development",
    courseId: "c2",
    instructions: "Build an accessible, responsive dashboard with a course summary, progress indicator, and upcoming activity list.",
    due: "Sep 30, 2026, 11:59 PM",
    status: "Returned",
    submittedAt: "Sep 29, 2026, 8:14 PM",
    grade: "92/100",
    feedback: "Clean layout. Watch your spacing units — mix of px and rem.",
  },
  {
    id: "asg3",
    title: "Relational Schema and SQL Queries",
    course: "Database Systems",
    courseId: "c4",
    instructions: "Map an entity-relationship model to relational tables, write representative SQL queries, and explain how the schema satisfies 3NF.",
    due: "Oct 2, 2026, 11:59 PM",
    status: "Submitted",
    submittedAt: "Oct 1, 2026, 6:40 PM",
    grade: null,
    feedback: null,
  },
  {
    id: "asg4",
    title: "Logic and Set Proof Portfolio",
    course: "Discrete Mathematics",
    courseId: "c3",
    instructions: "Write formal proofs for propositional equivalences and set identities, identifying the rule used at each step.",
    due: "Sep 25, 2026, 11:59 PM",
    status: "Late",
    submittedAt: "Sep 26, 2026, 2:10 AM",
    grade: "78/100",
    feedback: "Correct but submitted late; a deduction was applied.",
  },
  {
    id: "asg5",
    title: "Usability Evaluation Report",
    course: "Human-Computer Interaction",
    courseId: "c5",
    instructions: "Evaluate a digital task flow with a documented usability method. Report findings with evidence and prioritize design improvements.",
    due: "Oct 10, 2026, 11:59 PM",
    status: "Not Started",
    submittedAt: null,
    grade: null,
    feedback: null,
  },
  {
    id: "asg6",
    title: "Subnetting and Network Troubleshooting Lab",
    course: "Computer Networks",
    courseId: "c6",
    instructions: "Plan subnets from a supplied IPv4 block and document a troubleshooting sequence for a DNS connectivity issue.",
    due: "Oct 12, 2026, 11:59 PM",
    status: "Not Started",
    submittedAt: null,
    grade: null,
    feedback: null,
  },
];

export const mockQuizzes = [
  {
    id: "q1",
    title: "Quiz 1: Logic and Sets",
    course: "Discrete Mathematics",
    courseId: "c3",
    type: "Quiz",
    schedule: "Oct 6, 2026, 9:00 AM",
    durationMinutes: 20,
    status: "Upcoming",
    resultsReleased: false,
    score: null,
    questions: [
      {
        id: "qq1",
        prompt: "Which of the following is a tautology?",
        options: ["P ∧ ¬P", "P ∨ ¬P", "P ∧ Q", "¬P ∨ ¬Q"],
      },
      {
        id: "qq2",
        prompt: "What is |A ∪ B| if |A|=5, |B|=7, |A∩B|=2?",
        options: ["10", "12", "14", "9"],
      },
    ],
  },
  {
    id: "q2",
    title: "Quiz 1: Relational Design",
    course: "Database Systems",
    courseId: "c4",
    type: "Quiz",
    schedule: "Oct 7, 2026, 11:59 PM",
    durationMinutes: 20,
    status: "Not Started",
    resultsReleased: false,
    score: null,
    questions: [
      {
        id: "qq3",
        prompt: "A table in 2NF but not 3NF has:",
        options: [
          "Partial dependency",
          "Transitive dependency",
          "No primary key",
          "Multivalued dependency",
        ],
      },
    ],
  },
  {
    id: "q3",
    title: "Quiz 1: Algorithm Analysis",
    course: "Data Structures & Algorithms",
    courseId: "c1",
    type: "Quiz",
    schedule: "Oct 10, 2026, 11:59 PM",
    durationMinutes: 20,
    status: "Not Started",
    resultsReleased: false,
    score: null,
    questions: [
      { id: "qq4", prompt: "What is the time complexity of binary search on a sorted array?", options: ["O(log n)", "O(n)", "O(n log n)", "O(1)"] },
      { id: "qq5", prompt: "Which data structure follows last-in, first-out order?", options: ["Stack", "Queue", "Binary tree", "Hash table"] },
    ],
  },
  {
    id: "q4",
    title: "Quiz 1: Web Foundations",
    course: "Web Application Development",
    courseId: "c2",
    type: "Quiz",
    schedule: "Oct 8, 2026, 11:59 PM",
    durationMinutes: 20,
    status: "Not Started",
    resultsReleased: false,
    score: null,
    questions: [{ id: "qq6", prompt: "Which HTTP method is conventionally used to retrieve a resource?", options: ["GET", "POST", "PATCH", "DELETE"] }],
  },
  {
    id: "q5",
    title: "Quiz 1: User-Centred Design",
    course: "Human-Computer Interaction",
    courseId: "c5",
    type: "Quiz",
    schedule: "Oct 9, 2026, 11:59 PM",
    durationMinutes: 20,
    status: "Not Started",
    resultsReleased: false,
    score: null,
    questions: [{ id: "qq7", prompt: "What is the main purpose of a usability test?", options: ["Observe representative users completing tasks", "Measure server throughput", "Prove a design has no defects", "Replace accessibility review"] }],
  },
  {
    id: "q6",
    title: "Quiz 1: Network Fundamentals",
    course: "Computer Networks",
    courseId: "c6",
    type: "Quiz",
    schedule: "Oct 11, 2026, 11:59 PM",
    durationMinutes: 20,
    status: "Not Started",
    resultsReleased: false,
    score: null,
    questions: [{ id: "qq8", prompt: "Which transport protocol provides ordered, reliable delivery?", options: ["TCP", "UDP", "ARP", "ICMP"] }],
  },
];

export const mockVirtualClasses = [
  {
    id: "vc1",
    title: "React Components Lab",
    course: "Web Application Development",
    instructor: "Instructor profile pending",
    date: "Oct 3, 2026",
    time: "2:00 PM – 3:30 PM",
    status: "Upcoming",
    link: "https://meet.example.com/eolp-webdev",
    notes: "Bring your in-progress project; we'll do live code review.",
  },
  {
    id: "vc2",
    title: "Office Hours: Midterm Review",
    course: "Discrete Mathematics",
    instructor: "Instructor profile pending",
    date: "Oct 2, 2026",
    time: "4:00 PM – 5:00 PM",
    status: "Ongoing",
    link: "https://meet.example.com/eolp-math",
    notes: "Open Q&A for the upcoming midterm.",
  },
  {
    id: "vc3",
    title: "Sorting Algorithms Walkthrough",
    course: "Data Structures & Algorithms",
    instructor: "Instructor profile pending",
    date: "Sep 28, 2026",
    time: "1:00 PM – 2:00 PM",
    status: "Completed",
    link: "https://meet.example.com/eolp-dsa",
    notes: "Recording available on request.",
  },
];

export const mockGrades = [
  {
    courseId: "c1",
    course: "Data Structures & Algorithms",
    items: [
      { id: "g1", title: "Quiz 1: Algorithm Analysis", type: "Quiz", score: "9/10", status: "Released" },
      { id: "g2", title: "Linked List Implementation", type: "Assignment", score: "—", status: "Pending" },
    ],
  },
  {
    courseId: "c2",
    course: "Web Application Development",
    items: [
      { id: "g3", title: "CSS Flexbox Lab", type: "Assignment", score: "92/100", status: "Released" },
    ],
  },
  {
    courseId: "c3",
    course: "Discrete Mathematics",
    items: [
      { id: "g4", title: "Logic and Set Proof Portfolio", type: "Assignment", score: "78/100", status: "Released" },
      { id: "g5", title: "Midterm Exam", type: "Exam", score: "—", status: "Pending" },
    ],
  },
];

export const mockFeedback = [
  {
    id: "fb1",
    course: "Web Application Development",
    activity: "CSS Flexbox Lab",
    instructor: "Instructor profile pending",
    comment: "Clean layout. Watch your spacing units — mix of px and rem.",
    date: "Sep 30, 2026",
    unread: false,
  },
  {
    id: "fb2",
    course: "Discrete Mathematics",
    activity: "Set Theory Proofs",
    instructor: "Instructor profile pending",
    comment: "Correct but submitted late; a deduction was applied.",
    date: "Sep 27, 2026",
    unread: true,
  },
];

export const mockMaterials = [
  {
    id: "mat1",
    course: "Data Structures & Algorithms",
    module: "Trees & Graphs",
    title: "Graph Traversal Slides",
    type: "Presentation",
    addedDate: "Sep 29, 2026",
  },
  {
    id: "mat2",
    course: "Web Application Development",
    module: "Frontend Fundamentals",
    title: "React Components Cheat Sheet",
    type: "PDF",
    addedDate: "Oct 1, 2026",
  },
  {
    id: "mat3",
    course: "Discrete Mathematics",
    module: "Set Theory & Logic",
    title: "Propositional Logic Lecture",
    type: "Video",
    addedDate: "Sep 20, 2026",
  },
  {
    id: "mat4",
    course: "Database Systems",
    module: "Relational Model",
    title: "Normalization Examples",
    type: "Document",
    addedDate: "Sep 26, 2026",
  },
];

export const mockFullAnnouncements = [
  ...mockAnnouncements,
  {
    id: "n4",
    title: "New reading material uploaded",
    course: "Database Systems",
    instructor: "Instructor profile pending",
    date: "Sep 26, 2026",
    preview: "Check the materials library for the normalization examples doc.",
  },
];

export const mockAchievementsDetail = {
  ...mockGamification,
  milestones: [
    { id: "ms1", label: "Complete 5 courses", progress: 4, total: 5 },
    { id: "ms2", label: "Submit 20 assignments on time", progress: 16, total: 20 },
    { id: "ms3", label: "Maintain a 7-day streak", progress: 7, total: 7 },
  ],
  allBadges: [
    { id: "b1", label: "Early Bird", icon: "Sunrise", earned: true },
    { id: "b2", label: "Streak x7", icon: "Flame", earned: true },
    { id: "b3", label: "Top Submitter", icon: "Trophy", earned: true },
    { id: "b4", label: "Perfect Quiz", icon: "Star", earned: false },
    { id: "b5", label: "Night Owl", icon: "Moon", earned: false },
  ],
};

export const mockWeeklyActivity = [
  { day: "Mon", minutes: 40 },
  { day: "Tue", minutes: 65 },
  { day: "Wed", minutes: 30 },
  { day: "Thu", minutes: 80 },
  { day: "Fri", minutes: 50 },
  { day: "Sat", minutes: 20 },
  { day: "Sun", minutes: 10 },
];

export const mockProfile = {
  studentId: "2023-00482",
  program: "BS Information Technology",
  yearLevel: "3rd Year",
  email: "student@bestlink.edu.ph",
};
