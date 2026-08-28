import { beforeEach, describe, expect, it } from "vitest";
import {
  getCurrentUser,
  getRegisteredUsers,
  login,
  register,
  signOut,
} from "./auth";

const ANANYA = {
  name: "Ananya Iyer",
  email: "ananya.iyer@example.in",
  password: "kirana123",
};

beforeEach(() => {
  localStorage.clear();
});

describe("register", () => {
  it("creates an account and signs the user in", () => {
    const { user, error } = register(ANANYA);

    expect(error).toBeUndefined();
    expect(user.name).toBe("Ananya Iyer");
    expect(getRegisteredUsers()).toHaveLength(1);
    expect(getCurrentUser().email).toBe(ANANYA.email);
  });

  it.each([
    [{ ...ANANYA, name: "  " }, /enter your name/i],
    [{ ...ANANYA, email: "" }, /email/i],
    [{ ...ANANYA, password: "" }, /choose a password/i],
    [{ ...ANANYA, password: "short" }, /at least 6/i],
  ])("rejects %j", (input, expected) => {
    expect(register(input).error).toMatch(expected);
  });

  it("refuses a duplicate email regardless of case or spacing", () => {
    register(ANANYA);

    const { error } = register({ ...ANANYA, email: "  ANANYA.Iyer@Example.IN " });

    expect(error).toMatch(/already registered/i);
    expect(getRegisteredUsers()).toHaveLength(1);
  });

  it("keeps existing accounts when a second one is added", () => {
    register(ANANYA);
    register({ name: "Rohan Mehta", email: "rohan@example.in", password: "ledger123" });

    expect(getRegisteredUsers().map((u) => u.name)).toEqual([
      "Ananya Iyer",
      "Rohan Mehta",
    ]);
  });
});

describe("login", () => {
  beforeEach(() => {
    register(ANANYA);
    signOut();
  });

  it("signs in with the right password", () => {
    const { user, error } = login({ email: ANANYA.email, password: ANANYA.password });

    expect(error).toBeUndefined();
    expect(user.name).toBe("Ananya Iyer");
    expect(getCurrentUser().email).toBe(ANANYA.email);
  });

  it("matches the email case-insensitively", () => {
    expect(
      login({ email: "ANANYA.IYER@EXAMPLE.IN", password: ANANYA.password }).error
    ).toBeUndefined();
  });

  it("rejects a wrong password without signing anyone in", () => {
    const { error } = login({ email: ANANYA.email, password: "wrong" });

    expect(error).toMatch(/do not match/i);
    expect(getCurrentUser()).toBeNull();
  });

  it("gives the same message for an unknown email as for a wrong password", () => {
    // Different messages would let anyone enumerate which emails are registered.
    const unknown = login({ email: "nobody@example.in", password: "whatever" });
    const wrongPassword = login({ email: ANANYA.email, password: "wrong" });

    expect(unknown.error).toBe(wrongPassword.error);
  });
});

describe("signOut", () => {
  it("clears the current user but keeps the account", () => {
    register(ANANYA);

    signOut();

    expect(getCurrentUser()).toBeNull();
    expect(getRegisteredUsers()).toHaveLength(1);
  });
});

describe("when localStorage is unavailable", () => {
  it("reports no users rather than throwing", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("denied");
      },
    });

    try {
      // Private browsing throws on access. The app must still render.
      expect(getRegisteredUsers()).toEqual([]);
      expect(getCurrentUser()).toBeNull();
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });
});
