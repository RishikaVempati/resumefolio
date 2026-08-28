/**
 * The shape every page agrees on.
 *
 * This lives in its own module rather than in App.jsx because the pages need it
 * and App.jsx imports the pages — defining it there creates an import cycle, and
 * the shapes come back undefined at module-init time. App.jsx re-exports these
 * so `import { EMPTY_FORM } from "./App"` still works, as the spec describes.
 */

export const EMPTY_EDUCATION = {
  institution: "",
  degree: "",
  field: "",
  dates: "",
  grade: "",
};

export const EMPTY_PROJECT = { name: "", description: "", tech: "", link: "" };

export const EMPTY_EXPERIENCE = {
  role: "",
  company: "",
  dates: "",
  highlights: [],
};

export const EMPTY_CERTIFICATION = { name: "", issuer: "", date: "" };

export const EMPTY_FORM = {
  personal: {
    name: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    links: "",
  },
  education: [],
  skills: [],
  // The dynamic sections. Entries are added and removed in ResumeForm.
  projects: [],
  experience: [],
  certifications: [],
};
