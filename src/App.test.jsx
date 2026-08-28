import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { register, signOut } from "./auth";

// The auth flow must not depend on Gemini being reachable.
vi.mock("./api", () => ({
  getHealth: vi.fn().mockResolvedValue({ status: "ok" }),
  generateResume: vi.fn().mockResolvedValue({
    summary: "Generated summary.",
    careerObjective: "Generated objective.",
    about: "Generated about.",
    keyCompetencies: ["Payments interfaces"],
    technicalSkills: ["React", "TypeScript"],
    languages: ["Hindi"],
    tools: ["Git"],
    softSkills: ["Mentoring"],
    experience: [
      {
        role: "Frontend Developer",
        company: "Zeta Systems",
        dates: "2022 - present",
        bullets: ["Rebuilt the payments dashboard"],
      },
    ],
    projects: [
      { name: "Kirana Ledger", description: "Billing for shops", tech: "React Native" },
    ],
    achievements: ["Cut page load to under a second"],
  }),
}));

const ANANYA = {
  name: "Ananya Iyer",
  email: "ananya.iyer@example.in",
  password: "kirana123",
};

beforeEach(() => {
  localStorage.clear();
  // The api mock is module-level, so call counts would otherwise accumulate
  // across tests and "called once" assertions would be meaningless.
  vi.clearAllMocks();
});

const currentPage = () =>
  screen.getByRole("heading", { level: 1 }).textContent;

/**
 * The form is a six-step wizard, so reaching Generate means filling the
 * required fields on step 1 and clicking through the rest.
 */
async function fillAndGenerate(user) {
  await user.type(screen.getByLabelText(/phone number/i), "+91 98450 12345");
  while (screen.queryByRole("button", { name: /next/i })) {
    await user.click(screen.getByRole("button", { name: /next/i }));
  }
  await user.click(screen.getByRole("button", { name: /generate resume/i }));
}

/** The wizard's first step is the form page; assert on its step indicator. */
const onFormPage = () => screen.queryByTestId("wizard-step") !== null;

describe("gating the flow behind authentication", () => {
  it('opens the modal in signup mode when "Get Started" is clicked signed out', async () => {
    // Spec TC03.
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate my resume/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("tab", { name: "Sign Up" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    // Still on home — the gate held.
    expect(currentPage()).toMatch(/turn what you know/i);
  });

  it("does not open the modal when a user is already signed in", async () => {
    register(ANANYA);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate my resume/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onFormPage()).toBe(true);
  });

  it("pre-fills the form for a user who signed in on a previous visit", async () => {
    // They never pass through handleAuthSuccess, so the seed has to happen at
    // mount too — otherwise a returning user sees an empty form.
    register(ANANYA);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate my resume/i }));

    expect(screen.getByLabelText(/full name/i)).toHaveValue("Ananya Iyer");
    expect(screen.getByLabelText(/email address/i)).toHaveValue(ANANYA.email);
  });

  it("sends the user to the page they were heading for, pre-filled", async () => {
    // Spec TC02.
    register(ANANYA);
    signOut();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate my resume/i }));

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("tab", { name: "Login" }));
    await user.type(within(dialog).getByLabelText(/email address/i), ANANYA.email);
    await user.type(within(dialog).getByLabelText(/password/i), ANANYA.password);
    await user.click(within(dialog).getByRole("button", { name: "Log In" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onFormPage()).toBe(true);
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Ananya Iyer");
    expect(screen.getByLabelText(/email address/i)).toHaveValue(ANANYA.email);
  });

  it("remembers a template chosen before signing in", async () => {
    // Spec TC04, now with the gate in place: the choice must survive the modal.
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /classic/i }));

    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/full name/i), ANANYA.name);
    await user.type(within(dialog).getByLabelText(/email address/i), ANANYA.email);
    await user.type(within(dialog).getByLabelText(/password/i), ANANYA.password);
    await user.click(within(dialog).getByRole("button", { name: "Create Account" }));

    await fillAndGenerate(user);

    // The preview marks the active template with aria-pressed.
    const classic = await screen.findByRole("button", {
      name: "Classic",
      pressed: true,
    });
    expect(classic).toBeInTheDocument();
  });
});

describe("signing up", () => {
  it("shows the reason when signup is rejected and stays open", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /generate my resume/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/full name/i), ANANYA.name);
    await user.type(within(dialog).getByLabelText(/email address/i), ANANYA.email);
    await user.type(within(dialog).getByLabelText(/password/i), "short");
    await user.click(within(dialog).getByRole("button", { name: "Create Account" }));

    expect(within(dialog).getByRole("alert")).toHaveTextContent(/at least 6/i);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not overwrite details the user already typed", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Sign up first so the form is reachable, then edit the name.
    await user.click(screen.getByRole("button", { name: /generate my resume/i }));
    let dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/full name/i), ANANYA.name);
    await user.type(within(dialog).getByLabelText(/email address/i), ANANYA.email);
    await user.type(within(dialog).getByLabelText(/password/i), ANANYA.password);
    await user.click(within(dialog).getByRole("button", { name: "Create Account" }));

    const nameField = screen.getByLabelText(/full name/i);
    await user.clear(nameField);
    await user.type(nameField, "A. Iyer");

    expect(nameField).toHaveValue("A. Iyer");
  });
});

describe("templates and the portfolio", () => {
  async function generate(user) {
    await user.click(screen.getByRole("button", { name: /generate my resume/i }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText(/full name/i), ANANYA.name);
    await user.type(within(dialog).getByLabelText(/email address/i), ANANYA.email);
    await user.type(within(dialog).getByLabelText(/password/i), ANANYA.password);
    await user.click(within(dialog).getByRole("button", { name: "Create Account" }));

    await fillAndGenerate(user);
  }

  it("switches template without generating again", async () => {
    // The spec requires switching templates "without losing their generated
    // content" — so it must not cost a second Gemini call either.
    const { generateResume } = await import("./api");
    const user = userEvent.setup();
    render(<App />);

    await generate(user);
    expect(await screen.findByText("Generated summary.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Classic", pressed: false }));

    expect(generateResume).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Generated summary.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Classic" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("renders the portfolio from the same data, then returns intact", async () => {
    // Spec TC07.
    const { generateResume } = await import("./api");
    const user = userEvent.setup();
    render(<App />);

    await generate(user);
    await screen.findByText("Generated summary.");

    await user.click(screen.getByRole("button", { name: /view portfolio/i }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ananya Iyer");
    expect(screen.getByText("Generated about.")).toBeInTheDocument();
    for (const section of ["About Me", "Skills", "Projects", "Achievements"]) {
      expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    }

    await user.click(screen.getByRole("button", { name: /back to resume/i }));

    expect(screen.getByText("Generated summary.")).toBeInTheDocument();
    expect(generateResume).toHaveBeenCalledTimes(1);
  });
});

describe("session persistence", () => {
  it("stays signed in across a remount", async () => {
    register(ANANYA);
    const { unmount } = render(<App />);
    unmount();

    render(<App />);

    expect(screen.getByText("Ananya Iyer")).toBeInTheDocument();
  });

  it("signing out returns to home and clears the name", async () => {
    register(ANANYA);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(screen.queryByText("Ananya Iyer")).toBeNull();
    expect(currentPage()).toMatch(/turn what you know/i);
  });
});
