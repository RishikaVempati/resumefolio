export const SYSTEM_INSTRUCTION = `You write resume content for a candidate from the details they supplied.

Rules, in order of importance:

1. Never invent a fact. No employer, degree, date, metric, tool or achievement that is
   not in the input. If the input is thin, write less — do not pad it.
2. Rewrite what you are given into strong, specific resume language. Lead each bullet
   with a verb. Keep any number the candidate supplied; never add one.
3. Keep the candidate's own words for names, companies, institutions and technologies.
   Do not translate, expand or "correct" them.
4. summary: two or three sentences, third person, no pronouns, for the top of a resume.
5. about: one warmer paragraph in the first person, for a portfolio's About Me.
6. achievements: only genuine standouts already present in the input. An empty list is
   a valid answer.`;

/** Sections with nothing in them are left out, so the model is not invited to fill them. */
function section(title, lines) {
  return lines.length ? [`${title}:`, ...lines, ""] : [];
}

function personLines(personal) {
  return Object.entries(personal)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => `- ${key}: ${value.trim()}`);
}

/**
 * Turn the form object into the prompt. Kept separate from the route so it can be
 * tested without a network call, and so the prompt is readable in one place.
 */
export function buildPrompt(form) {
  const parts = [
    ...section("Candidate", personLines(form.personal ?? {})),
    ...section(
      "Skills they listed",
      (form.skills ?? []).map((skill) => `- ${skill}`)
    ),
    ...section(
      "Education",
      (form.education ?? []).map((entry) =>
        `- ${[entry.degree, entry.field, entry.institution, entry.dates, entry.grade]
          .filter((value) => value?.trim())
          .join(", ")}`
      )
    ),
    ...section(
      "Experience",
      (form.experience ?? []).flatMap((entry) => [
        `- ${[entry.role, entry.company, entry.dates]
          .filter((value) => value?.trim())
          .join(", ")}`,
        ...(entry.highlights ?? []).map((line) => `    * ${line}`),
      ])
    ),
    ...section(
      "Projects",
      (form.projects ?? []).map((entry) =>
        `- ${[entry.name, entry.description, entry.tech, entry.link]
          .filter((value) => value?.trim())
          .join(" — ")}`
      )
    ),
    ...section(
      "Certifications",
      (form.certifications ?? []).map((entry) =>
        `- ${[entry.name, entry.issuer, entry.date]
          .filter((value) => value?.trim())
          .join(", ")}`
      )
    ),
  ];

  return parts.join("\n").trim();
}

/**
 * Validation before the call, not after. A request that cannot produce a resume
 * should fail immediately rather than spend quota finding that out.
 */
export function validateForm(form) {
  if (!form || typeof form !== "object") {
    return "Request body must be a form object.";
  }
  const name = form.personal?.name?.trim();
  if (!name) {
    return "A name is required to generate a resume.";
  }

  const hasSubstance =
    (form.experience ?? []).length > 0 ||
    (form.projects ?? []).length > 0 ||
    (form.education ?? []).length > 0 ||
    (form.skills ?? []).length > 0;

  if (!hasSubstance) {
    return "Add at least one skill, project, role or qualification — there is nothing to write from yet.";
  }
  return null;
}
