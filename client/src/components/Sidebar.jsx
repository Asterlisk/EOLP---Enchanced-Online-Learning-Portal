import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  PencilLine,
  Video,
  GraduationCap,
  TrendingUp,
  Award,
  Megaphone,
  Bell,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { getStoredUser, logout } from "../lib/api";
import "./Sidebar.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/dashboard/courses", label: "My Courses", icon: BookOpen },
  { to: "/dashboard/lessons", label: "Lessons & Materials", icon: FileText },
  { to: "/dashboard/assignments", label: "Assignments", icon: ClipboardList },
  { to: "/dashboard/quizzes", label: "Quizzes & Exams", icon: PencilLine },
  { to: "/dashboard/virtual-classes", label: "Virtual Classes", icon: Video },
  { to: "/dashboard/grades", label: "Grades & Feedback", icon: GraduationCap },
  { to: "/dashboard/progress", label: "Learning Progress", icon: TrendingUp },
  { to: "/dashboard/achievements", label: "Achievements", icon: Award },
  { to: "/dashboard/announcements", label: "Announcements", icon: Megaphone },
  { to: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const user = getStoredUser();

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}

      <aside className={`sidebar ${open ? "sidebar--open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="sidebar-logo" aria-label="EOLP logo">
              <img src="/src/assets/icon.png" alt="" />
            </div>
            <span className="sidebar-app-name">BestLink EOLP</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <Link to="/dashboard/profile" className="sidebar-profile" onClick={onClose}>
          <div className="sidebar-avatar" aria-hidden="true">
            {(user?.username?.[0] || "?").toUpperCase()}
          </div>
          <div className="sidebar-profile-text">
            <p className="sidebar-profile-name">{user?.username || "Student"}</p>
            <p className="sidebar-profile-role">{user?.role || "Student"}</p>
          </div>
        </Link>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogOut size={18} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}
