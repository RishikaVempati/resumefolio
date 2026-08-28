import { Type } from "@google/genai";

const stringList = (description) => ({
  type: Type.ARRAY,
  items: { type: Type.STRING },
  description,
});

/**
 * What Gemini is asked to return. One call feeds both previews: `summary`,
 * `careerObjective`, `keyCompetencies` and the categorised skill lists are the
 * resume; `about` and `achievements` are the portfolio; experience and projects
 * are shared. Asking twice would double the latency and the quota.
 *
 * The skill categories are a *sorting* of what the candidate typed, not new
 * information. The system instruction is explicit that an unclassifiable skill
 * goes in technicalSkills rather than being dropped or invented elsewhere.
 */
export const GENERATED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Two or three sentences for the top of the resume.",
    },
    careerObjective: {
      type: Type.STRING,
      description:
        "Two sentences on the kind of role sought, grounded in what the candidate already does.",
    },
    about: {
      type: Type.STRING,
      description:
        "A warmer first-person paragraph for the portfolio's About Me section.",
    },
    keyCompetencies: stringList(
      "Short capability labels drawn only from the supplied skills and experience."
    ),
    technicalSkills: stringList("Languages, frameworks and libraries they listed."),
    languages: stringList("Spoken languages only, and only if the candidate listed them."),
    tools: stringList("Tools and platforms they listed, such as Git, AWS, Figma."),
    softSkills: stringList("Interpersonal strengths they listed."),
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          dates: { type: Type.STRING },
          bullets: stringList("Rewritten highlights, one achievement each."),
        },
        required: ["role", "company", "dates", "bullets"],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          tech: { type: Type.STRING },
        },
        required: ["name", "description", "tech"],
      },
    },
    achievements: stringList(
      "Standout accomplishments for the portfolio, drawn from what was supplied."
    ),
  },
  required: [
    "summary",
    "careerObjective",
    "about",
    "keyCompetencies",
    "technicalSkills",
    "languages",
    "tools",
    "softSkills",
    "experience",
    "projects",
    "achievements",
  ],
};

const REQUIRED_TEXT = ["summary", "careerObjective", "about"];

const REQUIRED_LISTS = [
  "keyCompetencies",
  "technicalSkills",
  "languages",
  "tools",
  "softSkills",
  "experience",
  "projects",
  "achievements",
];

/**
 * The shape is validated here rather than trusted from the SDK. A schema-
 * constrained response has already been observed coming back with fields the
 * schema did not declare, so "the model was told to" is not evidence.
 */
export function validateGenerated(value) {
  if (!value || typeof value !== "object") {
    return "Gemini returned no JSON object.";
  }
  for (const field of REQUIRED_TEXT) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      return `Gemini returned no ${field}.`;
    }
  }
  for (const field of REQUIRED_LISTS) {
    if (!Array.isArray(value[field])) {
      return `Gemini returned ${field} as ${typeof value[field]}, expected an array.`;
    }
  }
  return null;
}
