import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_FORM } from "../formShape";
import ResumeForm from "./ResumeForm";

/**
 * ResumeForm is controlled by App, so the tests wrap it in the same kind of
 * state holder App provides. Testing it with a frozen prop would not exercise
 * the update path, which is the part worth testing.
 */
function renderForm({ onSubmit = vi.fn(), onBack = vi.fn() } = {}) {
  let latest = EMPTY_FORM;

  function Harness() {
    const [formData, setFormData] = useState(EMPTY_FORM);
    latest = formData;
    return (
      <ResumeForm
        formData={formData}
        onChange={setFormData}
        onSubmit={onSubmit}
        onBack={onBack}
      />
    );
  }

  render(<Harness />);
  const user = userEvent.setup();

  /** Walk the wizard to a named step, filling the required fields on the way. */
  async function goTo(stepId) {
    const required = {
      name: "Ananya Iyer",
      email: "ananya.iyer@example.in",
      phone: "+91 98450 12345",
    };
    await user.type(screen.getByLabelText(/full name/i), required.name);
    await user.type(screen.getByLabelText(/email address/i), required.email);
    await user.type(screen.getByLabelText(/phone number/i), required.phone);

    const order = ["personal", "education", "skills", "projects", "experience", "certifications"];
    for (let i = 0; i < order.indexOf(stepId); i++) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
  }

  /** Advance to the last step and submit. */
  async function generate() {
    while (screen.queryByRole("button", { name: /next/i })) {
      await user.click(screen.getByRole("button", { name: /next/i }));
    }
    await user.click(screen.getByRole("button", { name: /generate resume/i }));
  }

  return { user, onSubmit, onBack, goTo, generate, current: () => latest };
}

describe("personal details", () => {
  it("records what is typed into each field", async () => {
    const { user, current } = renderForm();

    await user.type(screen.getByLabelText(/full name/i), "Ananya Iyer");
    await user.type(screen.getByLabelText(/email address/i), "ananya.iyer@example.in");

    expect(current().personal.name).toBe("Ananya Iyer");
    expect(current().personal.email).toBe("ananya.iyer@example.in");
  });
});

describe("skills", () => {
  it("stores comma-separated input as an array", async () => {
    const { user, goTo, current } = renderForm();

    await goTo("skills");
    await user.type(screen.getByLabelText(/skills/i), "React, Node.js");

    expect(current().skills).toEqual(["React", "Node.js"]);
  });
});

describe("dynamic sections", () => {
  it.each([
    ["Add project", "projects"],
    ["Add experience", "experience"],
    ["Add certification", "certifications"],
    ["Add education", "education"],
  ])("%s appends an entry to %s", async (label, section) => {
    const { user, goTo, current } = renderForm();

    await goTo(section);
    await user.click(screen.getByRole("button", { name: new RegExp(label, "i") }));

    expect(current()[section]).toHaveLength(1);
  });

  it("removes the entry that was clicked, not the last one", async () => {
    const { user, goTo, current } = renderForm();

    await goTo("projects");
    await user.click(screen.getByRole("button", { name: /add project/i }));
    await user.click(screen.getByRole("button", { name: /add project/i }));

    const entries = document.querySelectorAll(".entry");
    await user.type(
      within(entries[0]).getByLabelText(/project name/i),
      "Keep me"
    );
    await user.type(
      within(entries[1]).getByLabelText(/project name/i),
      "Delete me"
    );

    await user.click(within(entries[1]).getByRole("button", { name: "Remove" }));

    expect(current().projects).toHaveLength(1);
    expect(current().projects[0].name).toBe("Keep me");
  });

  it("keeps entries independent when one is edited", async () => {
    const { user, goTo, current } = renderForm();

    await goTo("projects");
    await user.click(screen.getByRole("button", { name: /add project/i }));
    await user.click(screen.getByRole("button", { name: /add project/i }));

    const entries = document.querySelectorAll(".entry");
    await user.type(within(entries[0]).getByLabelText(/project name/i), "First");

    expect(current().projects[1].name).toBe("");
  });

  it("stores experience highlights one per line", async () => {
    const { user, goTo, current } = renderForm();

    await goTo("experience");
    await user.click(screen.getByRole("button", { name: /add experience/i }));
    await user.type(
      screen.getByLabelText(/highlights/i),
      "Rebuilt the payments dashboard{enter}Cut page load to under a second"
    );

    expect(current().experience[0].highlights).toEqual([
      "Rebuilt the payments dashboard",
      "Cut page load to under a second",
    ]);
  });
});

describe("stepping through the wizard", () => {
  it("starts on step 1 at 0% and does not show Generate yet", () => {
    renderForm();

    expect(screen.getByTestId("wizard-step")).toHaveTextContent("Step 1 / 6 — Personal");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.queryByRole("button", { name: /generate resume/i })).toBeNull();
  });

  it("will not advance past Personal while a required field is empty", async () => {
    // Spec TC06, now enforced per step rather than only at the end.
    const { user } = renderForm();

    await user.type(screen.getByLabelText(/email address/i), "ananya.iyer@example.in");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByTestId("wizard-step")).toHaveTextContent("Step 1 / 6");
  });

  it("advances once the required fields are filled", async () => {
    const { user, goTo } = renderForm();

    await goTo("personal");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByTestId("wizard-step")).toHaveTextContent("Step 2 / 6 — Education");
  });

  it("reaches 83% on the last step, where Next becomes Generate", async () => {
    const { user, goTo } = renderForm();

    await goTo("certifications");

    expect(screen.getByTestId("wizard-step")).toHaveTextContent("Step 6 / 6 — Certifications");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "83");
    expect(screen.getByRole("button", { name: /generate resume/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("goes back a step, keeping what was entered", async () => {
    const { user, goTo } = renderForm();

    await goTo("skills");
    await user.type(screen.getByLabelText(/skills/i), "React");
    await user.click(screen.getByRole("button", { name: /previous/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText(/skills/i)).toHaveValue("React");
  });

  it("leaves the form entirely from step 1", async () => {
    const { user, onBack } = renderForm();

    await user.click(screen.getByRole("button", { name: /back to home/i }));

    expect(onBack).toHaveBeenCalled();
  });

  it("cannot jump ahead to a step not yet reached", async () => {
    renderForm();

    // Skipping forward would bypass the required fields on Personal.
    expect(screen.getByRole("button", { name: "6" })).toBeDisabled();
  });
});

describe("submitting", () => {
  it("hands the completed form to onSubmit", async () => {
    const { onSubmit, goTo, generate } = renderForm();

    await goTo("personal");
    await generate();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].personal.name).toBe("Ananya Iyer");
  });
});
