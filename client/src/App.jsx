import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

export default function App() {
  const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpRequired, setOtpRequired] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");

      if (!username || !password) {
        setError("Please enter both username and password.");
        return;
      }

      setLoading(true);
      try {
      const res = await fetch(`${API_BASE}/auth/${otpRequired ? "verify-otp" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpRequired ? { username, code: otp } : { username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid username or password.");
      }

      if (data.requiresOtp) {
        setOtpRequired(true);
        setError("");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate(data.user.role === "PROFESSOR" ? "/professor" : data.user.role === "ADMIN" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
    };


  return (
    <main className="app-container">
      <section className="app-blue-container">
        <img src="/bestlink-icon.png" alt="BestLink Logo" />
        <h1>Welcome To EOLP</h1>
        <h2>Your Learning Journey Starts Here</h2>
      </section>

      <section className="app-login-container">
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="login-form-title">Log in</h2>
          {otpRequired && <p className="login-otp-hint">Enter the six-digit code sent to your account email.</p>}

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          {!otpRequired && <label className="login-field">
            <span>Username</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              placeholder="Enter your Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>}

          {!otpRequired && <label className="login-field">
            <span>Password</span>
            <div className="login-password-wrap">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>}

          {otpRequired && <label className="login-field">
            <span>One-time code</span>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} required />
          </label>}

          {!otpRequired && <div className="login-row">
            <Link to="/forgot-password" className="login-link">
              Forgot password?
            </Link>
          </div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing in…" : otpRequired ? "Verify code" : "Continue"}
          </button>
          {otpRequired && <button type="button" className="login-link login-back" onClick={() => { setOtpRequired(false); setOtp(""); setError(""); }}>Back to login</button>}

        </form>

        <footer>&copy; BestLink College of the Philippines</footer>
      </section>

    </main>
  );
}
