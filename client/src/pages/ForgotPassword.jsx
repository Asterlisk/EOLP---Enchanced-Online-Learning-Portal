import { Link } from "react-router-dom";
import "../App.css";
import "./ForgotPassword.css";

export default function ForgotPassword() {
  return (
    <main className="app-container">
      <section className="app-blue-container">
        <img src="/src/assets/icon.png" alt="" />
        <h1>Account Recovery</h1>
        <h2>We’ll help you get back to learning</h2>
      </section>

      <section className="app-login-container">
        <div className="recovery-content">
          <h2 className="login-form-title">Forgot your password?</h2>
          <p>Ask an EOLP administrator to issue a temporary password for your account.</p>
          <p>For security, this project does not send reset links by email. Your account does not have an email address on file.</p>
          <div className="recovery-admin-note">
            <strong>Locked out of the administrator account?</strong>
            <p>On the computer running EOLP, open the project’s <code>server</code> folder and run:</p>
            <code className="recovery-command">npm run admin:reset-password -- &lt;admin-username&gt;</code>
            <p>The command prints a new temporary password once. Save it privately before closing the terminal.</p>
          </div>
          <Link to="/" className="recovery-back-link">Back to log in</Link>
        </div>
        <footer>&copy; BestLink College of the Philippines</footer>
      </section>
    </main>
  );
}
