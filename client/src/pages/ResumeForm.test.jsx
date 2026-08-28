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
  return { user: userEvent.setup(), onSubmit, onBack, current: () => latest };
}

describe("personal details", () => {
  it("records what is typed into each field", async () => {
    const { user, current } = renderForm();

    await user.type(screen.getByLabelText(/full name/i), "Grace Hopper");
    await user.type(screen.getByLabelText(/^email/i), "grace@navy.mil");

    expect(current().personal.name).toBe("Grace Hopper");
    expect(current().personal.email).toBe("grace@navy.mil");
  });
});

describe("skills", () => {
  it("stores comma-separated input as an array", async () => {
    const { user, current } = renderForm();

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
    const { user, current } = renderForm();

    await user.click(screen.getByRole("button", { name: label }));

    expect(current()[section]).toHaveLength(1);
  });

  it("removes the entry that was clicked, not the last one", async () => {
    const { user, current } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add project" }));
    await user.click(screen.getByRole("button", { name: "Add project" }));

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
    const { user, current } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add project" }));
    await user.click(screen.getByRole("button", { name: "Add project" }));

    const entries = document.querySelectorAll(".entry");
    await user.type(within(entries[0]).getByLabelText(/project name/i), "First");

    expect(current().projects[1].name).toBe("");
  });

  it("stores experience highlights one per line", async () => {
    const { user, current } = renderForm();

    await user.click(screen.getByRole("button", { name: "Add experience" }));
    await user.type(
      screen.getByLabelText(/highlights/i),
      "Invented the compiler{enter}Standardised COBOL"
    );

    expect(current().experience[0].highlights).toEqual([
      "Invented the compiler",
      "Standardised COBOL",
    ]);
  });
});

describe("submitting", () => {
  it("hands the completed form to onSubmit", async () => {
    const { user, onSubmit } = renderForm();

    await user.type(screen.getByLabelText(/full name/i), "Grace Hopper");
    await user.type(screen.getByLabelText(/^email/i), "grace@navy.mil");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].personal.name).toBe("Grace Hopper");
  });

  it("does not submit while a required field is empty", async () => {
    const { user, onSubmit } = renderForm();

    // Name is left blank. This is spec test case TC06.
    await user.type(screen.getByLabelText(/^email/i), "grace@navy.mil");
    await user.click(screen.getByRole("button", { name: "Generate" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
