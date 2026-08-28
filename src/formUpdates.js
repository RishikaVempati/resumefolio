/**
 * Pure transforms over the EMPTY_FORM shape.
 *
 * These are kept out of ResumeForm so the state logic can be tested without
 * rendering anything, and so the component stays a description of the markup.
 * Every function returns a new object — nothing is mutated, because React
 * compares by identity.
 */

export function setPersonalField(form, field, value) {
  return { ...form, personal: { ...form.personal, [field]: value } };
}

export function setEntryField(form, section, index, field, value) {
  return {
    ...form,
    [section]: form[section].map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ),
  };
}

export function addEntry(form, section, emptyEntry) {
  // structuredClone, not a spread: EMPTY_EXPERIENCE holds a highlights array, and
  // a shallow copy would leave every experience entry sharing the same one.
  return { ...form, [section]: [...form[section], structuredClone(emptyEntry)] };
}

export function removeEntry(form, section, index) {
  return { ...form, [section]: form[section].filter((_, i) => i !== index) };
}

export function setSkills(form, skills) {
  return { ...form, skills };
}

/**
 * Skills arrive as one comma-separated field — faster to fill than a list of
 * inputs, and the resume needs them as an array. Empty fragments are dropped so
 * a trailing comma does not become an empty skill.
 */
export function parseSkills(text) {
  return text
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

/**
 * Experience highlights are one per line. This split is deliberately lossless —
 * no trim, no filter — because the textarea's value is highlights.join("\n").
 * Trimming here would delete a space the moment it was typed, making it
 * impossible to type one. Tidying happens once, in normalizeForm, at submit.
 */
export function splitLines(text) {
  return text.split("\n");
}

/**
 * Tidy up what the user typed, once, on submit. Blank highlights and stray
 * whitespace should not reach the prompt, but they must survive editing.
 */
export function normalizeForm(form) {
  return {
    ...form,
    skills: form.skills.map((skill) => skill.trim()).filter(Boolean),
    experience: form.experience.map((entry) => ({
      ...entry,
      highlights: entry.highlights.map((line) => line.trim()).filter(Boolean),
    })),
  };
}
