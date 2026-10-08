import { useEffect, useState } from "react";
import { Menu, Search, Bell, ChevronDown, LogOut, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch, getStoredUser, logout } from "../lib/api";
import "./Topbar.css";

export default function Topbar({ title, onMenuClick }) {
  const user = getStoredUser();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch("/notifications/unread-count")
      .then(async (response) => {
        if (!response?.ok) return;
        const payload = await response.json().catch(() => ({}));
        if (active) setUnreadCount(payload.unreadCount || 0);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [location.pathname]);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-menu-btn"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <h1 className="topbar-title">{title}</h1>
      </div>

      <div className="topbar-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search courses and materials…"
          aria-label="Search courses and materials"
        />
      </div>

      <div className="topbar-right">
        <Link to="/dashboard/notifications" className="topbar-icon-btn" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}>
          <Bell size={19} />
          {unreadCount > 0 && <span className="topbar-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </Link>

        <div className="topbar-profile">
          <button
            type="button"
            className="topbar-profile-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <span className="topbar-avatar">
              {(user?.username?.[0] || "?").toUpperCase()}
            </span>
            <span className="topbar-username">{user?.username || "Student"}</span>
            <ChevronDown size={16} />
          </button>

          {menuOpen && (
            <div className="topbar-dropdown" role="menu">
              <a href="/dashboard/settings" role="menuitem">
                <Settings size={16} /> Account settings
              </a>
              <button type="button" onClick={logout} role="menuitem">
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
