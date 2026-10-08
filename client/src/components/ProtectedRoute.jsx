import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
    const [status, setStatus] = useState(() =>
    localStorage.getItem("token")
    ? "checking"
    : "unauthenticated"
);

useEffect(() => {
    const token = localStorage.getItem("token");

    // No token means the initial state is already unauthenticated.
    if (!token) return;

    async function verifyToken() {
    try {
        const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"}/auth/me`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
        );

        if (!response.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setStatus("unauthenticated");
        return;
        }

        const data = await response.json();

        localStorage.setItem("user", JSON.stringify(data.user));
        setStatus("authenticated");
    } catch (error) {
        console.error("Authentication check failed:", error);
        setStatus("error");
    }
    }

    verifyToken();
}, []);

if (status === "checking") {
    return <p>Verifying your session...</p>;
}

if (status === "unauthenticated") {
    return <Navigate to="/" replace />;
}

if (status === "error") {
    return <p>Unable to verify your session. Please try again.</p>;
}

if (allowedRoles?.length) {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch { user = null; }
    if (!allowedRoles.includes(user?.role)) {
        const destination = user?.role === "PROFESSOR" ? "/professor" : user?.role === "ADMIN" ? "/admin" : user?.role === "STUDENT" ? "/dashboard" : "/";
        return <Navigate to={destination} replace />;
    }
}

return <Outlet />;
}
