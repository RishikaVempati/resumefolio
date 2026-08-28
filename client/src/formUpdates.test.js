import { describe, expect, it } from "vitest";
import { EMPTY_FORM, EMPTY_PROJECT } from "./formShape";
import {
  addEntry,
  normalizeForm,
  parseSkills,
  removeEntry,
  setEntryField,
  setPersonalField,
  setSkills,
  splitLines,
} from "./formUpdates";

describe("setPersonalField", () => {
  it("sets one field and leaves the others alone", () => {
    const form = setPersonalField(EMPTY_FORM, "name", "Grace Hopper");

    expect(form.personal.name).toBe("Grace Hopper");
    expect(form.personal.email).toBe("");
  });

  it("does not mutate the form it was given", () => {
    setPersonalField(EMPTY_FORM, "name", "Grace Hopper");

    // React compares by identity — a mutation here would not re-render.
    expect(EMPTY_FORM.personal.name).toBe("");
  });
});

describe("addEntry", () => {
  it("appends a copy of the empty entry", () => {
    const form = addEntry(EMPTY_FORM, "projects", EMPTY_PROJECT);

    expect(form.projects).toHaveLength(1);
    expect(form.projects[0]).toEqual(EMPTY_PROJECT);
  });

  it("gives each added entry its own object", () => {
    let form = addEntry(EMPTY_FORM, "projects", EMPTY_PROJECT);
    form = addEntry(form, "projects", EMPTY_PROJECT);
    form = setEntryField(form, "projects", 0, "name", "First");

    // A shared reference would make editing one entry edit both.
    expect(form.projects[1].name).toBe("");
  });
});

describe("removeEntry", () => {
  it("removes the entry at the given index and keeps the rest in order", () => {
    let form = EMPTY_FORM;
    for (const name of ["A", "B", "C"]) {
      form = addEntry(form, "projects", EMPTY_PROJECT);
      form = setEntryField(form, "projects", form.projects.length - 1, "name", name);
    }

    form = removeEntry(form, "projects", 1);

    expect(form.projects.map((p) => p.name)).toEqual(["A", "C"]);
  });
});

describe("setEntryField", () => {
  it("edits only the targeted entry", () => {
    let form = addEntry(EMPTY_FORM, "projects", EMPTY_PROJECT);
    form = addEntry(form, "projects", EMPTY_PROJECT);

    form = setEntryField(form, "projects", 1, "name", "Second");

    expect(form.projects[0].name).toBe("");
    expect(form.projects[1].name).toBe("Second");
  });
});

describe("parseSkills", () => {
  it.each([
    ["React, Node.js", ["React", "Node.js"]],
    ["  React ,  Node.js  ", ["React", "Node.js"]],
    ["React,,Node.js", ["React", "Node.js"]],
    ["React,", ["React"]],
    ["", []],
    ["   ", []],
  ])("parses %j", (input, expected) => {
    expect(parseSkills(input)).toEqual(expected);
  });
});

describe("splitLines", () => {
  it("splits without trimming, so a space can be typed", () => {
    // Trimming here would delete the space as soon as it was entered.
    expect(splitLines("Led the ")).toEqual(["Led the "]);
    expect(splitLines("a\n\nb")).toEqual(["a", "", "b"]);
  });
});

describe("normalizeForm", () => {
  it("trims and drops blank highlights and skills at submit", () => {
    const form = {
      ...EMPTY_FORM,
      skills: ["React ", "", "  Node.js"],
      experience: [
        { role: "", company: "", dates: "", highlights: ["Led it ", "", "  Shipped"] },
      ],
    };

    const normalized = normalizeForm(form);

    expect(normalized.skills).toEqual(["React", "Node.js"]);
    expect(normalized.experience[0].highlights).toEqual(["Led it", "Shipped"]);
  });
});

describe("setSkills", () => {
  it("replaces the skills array", () => {
    expect(setSkills(EMPTY_FORM, ["React"]).skills).toEqual(["React"]);
  });
});
