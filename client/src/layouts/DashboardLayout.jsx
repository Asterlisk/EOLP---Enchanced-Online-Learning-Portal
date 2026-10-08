import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./DashboardLayout.css";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/dashboard/courses": "My Courses",
  "/dashboard/lessons": "Lessons & Materials",
  "/dashboard/assignments": "Assignments",
  "/dashboard/quizzes": "Quizzes & Exams",
  "/dashboard/virtual-classes": "Virtual Classes",
  "/dashboard/grades": "Grades & Feedback",
  "/dashboard/progress": "Learning Progress",
  "/dashboard/achievements": "Achievements",
  "/dashboard/announcements": "Announcements",
  "/dashboard/notifications": "Notifications",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

// Detail pages (e.g. /dashboard/courses/c1) fall back to their section title
const SECTION_PREFIX_TITLES = {
  "/dashboard/courses/": "Course Details",
  "/dashboard/assignments/": "Assignment Details",
  "/dashboard/quizzes/": "Assessment",
};

function resolveTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const prefix = Object.keys(SECTION_PREFIX_TITLES).find((p) => pathname.startsWith(p));
  return prefix ? SECTION_PREFIX_TITLES[prefix] : "Dashboard";
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = resolveTitle(pathname);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="dashboard-main">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
