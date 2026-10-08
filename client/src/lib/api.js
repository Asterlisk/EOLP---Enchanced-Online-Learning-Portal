// Small fetch wrapper that attaches the stored JWT to every request and
// clears the session + redirects to login on a 401, so individual pages
// don't need to repeat that logic.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      // Let the browser set its own multipart boundary for FormData —
      // forcing application/json here would break file uploads.
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
    return null;
  }

  return response;
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/";
}
