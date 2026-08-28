import { Type } from "@google/genai";

/**
 * What Gemini is asked to return. One call feeds both previews: `summary` and
 * `experience` are the resume, `about` and `achievements` are the portfolio, and
 * the rest is shared. Asking twice would double the latency and the quota.
 */
export const GENERATED_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Two or three sentences for the top of the resume.",
    },
    about: {
      type: Type.STRING,
      description:
        "A warmer first-person paragraph for the portfolio's About Me section.",
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          dates: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Rewritten highlights, one achievement each.",
          },
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
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    achievements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Standout accomplishments for the portfolio, drawn from what was supplied.",
    },
  },
  required: [
    "summary",
    "about",
    "experience",
    "projects",
    "skills",
    "achievements",
  ],
};

/**
 * The shape is validated here rather than trusted from the SDK. A schema-
 * constrained response has already been observed coming back with fields the
 * schema did not declare, so "the model was told to" is not evidence.
 */
export function validateGenerated(value) {
  if (!value || typeof value !== "object") {
    return "Gemini returned no JSON object.";
  }
  for (const field of ["summary", "about"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      return `Gemini returned no ${field}.`;
    }
  }
  for (const field of ["experience", "projects", "skills", "achievements"]) {
    if (!Array.isArray(value[field])) {
      return `Gemini returned ${field} as ${typeof value[field]}, expected an array.`;
    }
  }
  return null;
}
