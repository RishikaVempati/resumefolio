export const SYSTEM_INSTRUCTION = `You write resume content for a candidate from the details they supplied.

Rules, in order of importance:

1. Never invent a fact. No employer, degree, date, metric, tool or achievement that is
   not in the input. If the input is thin, write less — do not pad it.
2. Rewrite what you are given into strong, specific resume language. Lead each bullet
   with a verb. Keep any number the candidate supplied; never add one.
3. Keep the candidate's own words for names, companies, institutions and technologies.
   Do not translate, expand or "correct" them.
4. summary: two or three sentences, third person, no pronouns, for the top of a resume.
5. careerObjective: two sentences on the kind of role they are seeking, grounded in what
   they already do. Do not name a company or a job title they have not mentioned.
6. about: one warmer paragraph in the first person, for a portfolio's About Me.
7. achievements: only genuine standouts already present in the input. An empty list is
   a valid answer.

Sorting their skills:

8. technicalSkills, tools, languages and softSkills sort the technologies the candidate
   named ANYWHERE in the input — the skills list, and also the tech used on their
   projects, in their roles, and in their certifications. A technology they clearly work
   with belongs on the resume even if they forgot to repeat it in the skills list.
   Every skill from the skills list must appear in exactly one category, and nothing may
   be added that appears nowhere in the input.
   - technicalSkills: programming languages, frameworks, libraries, databases
   - tools: platforms and software, for example Git, AWS, Docker, Figma
   - languages: spoken languages ONLY, for example Hindi, Tamil, English. If they listed
     none, return an empty list. Never put a programming language here.
   - softSkills: interpersonal strengths, for example communication, mentoring
   If a skill does not clearly fit, put it in technicalSkills rather than dropping it.
9. keyCompetencies: short capability labels, three to eight words at most each, drawn
   only from the skills and experience supplied. These are a summary, not new claims.`;

const LABELS = {
  name: "name",
  email: "email",
  phone: "phone",
  address: "location",
  linkedin: "LinkedIn",
  github: "GitHub",
};

/** Sections with nothing in them are left out, so the model is not invited to fill them. */
function section(title, lines) {
  return lines.length ? [`${title}:`, ...lines, ""] : [];
}

function personLines(personal) {
  return Object.entries(personal)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => `- ${LABELS[key] ?? key}: ${value.trim()}`);
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
