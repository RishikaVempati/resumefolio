import {
  EMPTY_CERTIFICATION,
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  EMPTY_PROJECT,
} from "../formShape";
import { useState } from "react";
import {
  addEntry,
  normalizeForm,
  parseSkills,
  removeEntry,
  setEntryField,
  setPersonalField,
  setSkills,
  splitLines,
} from "../formUpdates";

const PERSONAL_FIELDS = [
  { name: "name", label: "Full name", required: true },
  { name: "title", label: "Professional title", placeholder: "Frontend Developer" },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone" },
  { name: "location", label: "Location" },
  { name: "links", label: "Links", placeholder: "github.com/you, linkedin.com/in/you" },
];

const SECTIONS = [
  {
    key: "education",
    legend: "Education",
    empty: EMPTY_EDUCATION,
    addLabel: "Add education",
    fields: [
      { name: "institution", label: "Institution" },
      { name: "degree", label: "Degree" },
      { name: "field", label: "Field of study" },
      { name: "dates", label: "Dates", placeholder: "2019 – 2023" },
      { name: "grade", label: "Grade" },
    ],
  },
  {
    key: "projects",
    legend: "Projects",
    empty: EMPTY_PROJECT,
    addLabel: "Add project",
    fields: [
      { name: "name", label: "Project name" },
      { name: "description", label: "What it does", type: "textarea" },
      { name: "tech", label: "Tech used" },
      { name: "link", label: "Link" },
    ],
  },
  {
    key: "experience",
    legend: "Experience",
    empty: EMPTY_EXPERIENCE,
    addLabel: "Add experience",
    fields: [
      { name: "role", label: "Role" },
      { name: "company", label: "Company" },
      { name: "dates", label: "Dates" },
      { name: "highlights", label: "Highlights (one per line)", type: "highlights" },
    ],
  },
  {
    key: "certifications",
    legend: "Certifications",
    empty: EMPTY_CERTIFICATION,
    addLabel: "Add certification",
    fields: [
      { name: "name", label: "Certification" },
      { name: "issuer", label: "Issuer" },
      { name: "date", label: "Date" },
    ],
  },
];

export default function ResumeForm({ formData, onChange, onSubmit, onBack }) {
  // Functional updates throughout: several of these fire in quick succession
  // while typing, and reading formData directly would work from stale state.
  const update = (transform) => onChange((prev) => transform(prev));

  // The skills input keeps its own raw text. Deriving the value from
  // skills.join(", ") instead would strip the comma the moment it is typed —
  // parseSkills drops the empty fragment after it — so the separator could
  // never be entered.
  const [skillsText, setSkillsText] = useState(formData.skills.join(", "));

  function handleSkillsChange(text) {
    setSkillsText(text);
    update((form) => setSkills(form, parseSkills(text)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(normalizeForm(formData));
  }

  return (
    <main>
      <h1>Your details</h1>
      <p>
        Everything here is what Gemini writes from. The more you give it, the less
        it has to guess.
      </p>

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Personal details</legend>
          {PERSONAL_FIELDS.map((field) => (
            <label key={field.name}>
              <span>
                {field.label}
                {field.required && <abbr title="required"> *</abbr>}
              </span>
              <input
                type={field.type ?? "text"}
                value={formData.personal[field.name]}
                placeholder={field.placeholder}
                required={field.required}
                onChange={(event) =>
                  update((form) =>
                    setPersonalField(form, field.name, event.target.value)
                  )
                }
              />
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Skills</legend>
          <label>
            <span>Skills, comma separated</span>
            <input
              type="text"
              value={skillsText}
              placeholder="React, Node.js, PostgreSQL"
              onChange={(event) => handleSkillsChange(event.target.value)}
            />
          </label>
        </fieldset>

        {SECTIONS.map((section) => (
          <fieldset key={section.key}>
            <legend>{section.legend}</legend>

            {formData[section.key].length === 0 && (
              <p className="empty">Nothing added yet.</p>
            )}

            {formData[section.key].map((entry, index) => (
              <div className="entry" key={index}>
                {section.fields.map((field) => (
                  <label key={field.name}>
                    <span>{field.label}</span>
                    {field.type === "textarea" ? (
                      <textarea
                        rows={2}
                        value={entry[field.name]}
                        onChange={(event) =>
                          update((form) =>
                            setEntryField(
                              form,
                              section.key,
                              index,
                              field.name,
                              event.target.value
                            )
                          )
                        }
                      />
                    ) : field.type === "highlights" ? (
                      <textarea
                        rows={3}
                        value={entry.highlights.join("\n")}
                        onChange={(event) =>
                          update((form) =>
                            setEntryField(
                              form,
                              section.key,
                              index,
                              "highlights",
                              splitLines(event.target.value)
                            )
                          )
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        value={entry[field.name]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          update((form) =>
                            setEntryField(
                              form,
                              section.key,
                              index,
                              field.name,
                              event.target.value
                            )
                          )
                        }
                      />
                    )}
                  </label>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    update((form) => removeEntry(form, section.key, index))
                  }
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => update((form) => addEntry(form, section.key, section.empty))}
            >
              {section.addLabel}
            </button>
          </fieldset>
        ))}

        <div className="actions">
          <button type="button" onClick={onBack}>
            Back
          </button>
          <button type="submit">Generate</button>
        </div>
      </form>
    </main>
  );
}
