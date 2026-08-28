/**
 * LocalStorage-backed accounts.
 *
 * This is not real authentication and is not meant to be. There is no server, no
 * session, and no password hashing — every account lives in the visitor's own
 * browser, where they can read and edit it freely. The spec asks for exactly
 * this ("LocalStorage-based session management"), and for a capstone it is the
 * right scope. It would be indefensible for real users, which the README says
 * plainly rather than leaving someone to discover it.
 *
 * Storage keys match the spec's screenshot: `registered_users` and `user`.
 */

const USERS_KEY = "registered_users";
const CURRENT_USER_KEY = "user";

/** LocalStorage throws in private mode and when disabled; never take the app down for it. */
function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A signup that cannot be persisted still works for this session.
  }
}

export function getRegisteredUsers() {
  const users = read(USERS_KEY, []);
  return Array.isArray(users) ? users : [];
}

export function getCurrentUser() {
  return read(CURRENT_USER_KEY, null);
}

export function setCurrentUser(user) {
  write(CURRENT_USER_KEY, user);
}

export function signOut() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {
    // Nothing to do; the caller clears its own state either way.
  }
}

const normalizeEmail = (email) => email.trim().toLowerCase();

export function findUser(email) {
  const wanted = normalizeEmail(email ?? "");
  return getRegisteredUsers().find((user) => normalizeEmail(user.email) === wanted) ?? null;
}

/**
 * Create an account. Returns { user } or { error } rather than throwing, because
 * every caller here is a form that wants to show a message.
 */
export function register({ name, email, password }) {
  const trimmedName = name?.trim() ?? "";
  const trimmedEmail = email?.trim() ?? "";

  if (!trimmedName) return { error: "Enter your name." };
  if (!trimmedEmail) return { error: "Enter your email address." };
  if (!password) return { error: "Choose a password." };
  if (password.length < 6) {
    return { error: "Use at least 6 characters for your password." };
  }
  if (findUser(trimmedEmail)) {
    return { error: "That email is already registered. Log in instead." };
  }

  const user = { name: trimmedName, email: trimmedEmail, password };
  write(USERS_KEY, [...getRegisteredUsers(), user]);
  setCurrentUser(user);
  return { user };
}

export function login({ email, password }) {
  const existing = findUser(email);

  // One message for both cases, so this cannot be used to discover which emails
  // are registered. The habit is worth keeping even where the store is public.
  if (!existing || existing.password !== password) {
    return { error: "Those details do not match an account." };
  }

  setCurrentUser(existing);
  return { user: existing };
}
