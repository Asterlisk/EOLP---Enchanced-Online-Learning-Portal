import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import App from './App.jsx'
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";


import Dashboard from "./pages/Dashboard.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetails from "./pages/CourseDetails.jsx";
import Lessons from "./pages/Lessons.jsx";
import Assignments from "./pages/Assignments.jsx";
import AssignmentDetails from "./pages/AssignmentDetails.jsx";
import Quizzes from "./pages/Quizzes.jsx";
import QuizAttempt from "./pages/QuizAttempt.jsx";
import VirtualClasses from "./pages/VirtualClasses.jsx";
import Grades from "./pages/Grades.jsx";
import LearningProgress from "./pages/LearningProgress.jsx";
import Achievements from "./pages/Achievements.jsx";
import Announcements from "./pages/Announcements.jsx";
import Notifications from "./pages/Notifications.jsx";
import Profile from "./pages/Profile.jsx";
import Settings from "./pages/Settings.jsx";
import ProfessorDashboard from "./pages/ProfessorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminCourses from "./pages/AdminCourses.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute allowedRoles={["PROFESSOR"]} />}>
          <Route path="/professor" element={<ProfessorDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["STUDENT"]} />}>
                <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />

                    <Route path="courses" element={<Courses />} />
                    <Route path="courses/:courseId" element={<CourseDetails />} />

                    <Route path="lessons" element={<Lessons />} />

                    <Route path="assignments" element={<Assignments />} />
                    <Route path="assignments/:assignmentId" element={<AssignmentDetails />} />

                    <Route path="quizzes" element={<Quizzes />} />
                    <Route path="quizzes/:quizId" element={<QuizAttempt />} />

                    <Route path="virtual-classes" element={<VirtualClasses />} />
                    <Route path="grades" element={<Grades />} />
                    <Route path="progress" element={<LearningProgress />} />
                    <Route path="achievements" element={<Achievements />} />
                    <Route path="announcements" element={<Announcements />} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
          </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
