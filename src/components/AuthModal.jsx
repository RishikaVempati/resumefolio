import { useEffect, useRef, useState } from "react";
import { login, register } from "../auth";

/**
 * Sign-up and login in one modal, as the spec describes. `mode` comes from the
 * caller so "Get Started" can open it in signup and a Login button in login.
 */
export default function AuthModal({ mode = "signup", onClose, onSuccess }) {
  const [authMode, setAuthMode] = useState(mode);
  const [fields, setFields] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);
  const firstFieldRef = useRef(null);

  const isSignup = authMode === "signup";

  // Focus the first field on open, so the modal is usable from the keyboard.
  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [authMode]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function setField(name, value) {
    setFields((prev) => ({ ...prev, [name]: value }));
    setError(null);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const result = isSignup ? register(fields) : login(fields);

    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess(result.user);
  }

  return (
    <div
      className="modal-backdrop"
      // Clicking the backdrop closes; clicking inside must not.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        ref={dialogRef}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h2>
        <p className="modal-subtitle">
          {isSignup
            ? "Join us to build professional resumes and portfolios in seconds."
            : "Log in to pick up where you left off."}
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={isSignup}
            onClick={() => setAuthMode("signup")}
          >
            Sign Up
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isSignup}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <label>
              <span>Full Name</span>
              <input
                ref={firstFieldRef}
                type="text"
                value={fields.name}
                placeholder="Ananya Iyer"
                onChange={(event) => setField("name", event.target.value)}
              />
            </label>
          )}

          <label>
            <span>Email Address</span>
            <input
              ref={isSignup ? undefined : firstFieldRef}
              type="email"
              value={fields.email}
              placeholder="you@example.in"
              onChange={(event) => setField("email", event.target.value)}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={fields.password}
              onChange={(event) => setField("password", event.target.value)}
            />
          </label>

          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}

          <button type="submit" className="primary">
            {isSignup ? "Create Account" : "Log In"}
          </button>
        </form>

        <p className="modal-footer">
          {isSignup ? "Already have an account? " : "New here? "}
          <button
            type="button"
            className="link"
            onClick={() => setAuthMode(isSignup ? "login" : "signup")}
          >
            {isSignup ? "Log In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
