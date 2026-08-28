import { useState } from "react";
import {
  EMPTY_CERTIFICATION,
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  EMPTY_PROJECT,
} from "../formShape";
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

// Labels and required flags follow the spec's ResumeForm screenshot.
const PERSONAL_FIELDS = [
  { name: "name", label: "Full Name", required: true, placeholder: "Ananya Iyer" },
  { name: "email", label: "Email Address", type: "email", required: true, placeholder: "ananya@example.in" },
  { name: "phone", label: "Phone Number", required: true, placeholder: "+91 9876543210" },
  { name: "address", label: "Address", placeholder: "City, State, Country" },
  { name: "linkedin", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/username" },
  { name: "github", label: "GitHub URL", placeholder: "https://github.com/username" },
];

/**
 * Six steps, in the order the spec's screenshot shows them. Each is either the
 * fixed personal block, the single skills field, or a list of repeatable entries.
 */
export const STEPS = [
  { id: "personal", label: "Personal", title: "Personal Info", kind: "personal" },
  {
    id: "education",
    label: "Education",
    title: "Education",
    kind: "list",
    empty: EMPTY_EDUCATION,
    addLabel: "Add education",
    fields: [
      { name: "institution", label: "Institution", placeholder: "PES University" },
      { name: "degree", label: "Degree", placeholder: "B.Tech" },
      { name: "field", label: "Field of study", placeholder: "Computer Science" },
      { name: "dates", label: "Dates", placeholder: "2019 – 2023" },
      { name: "grade", label: "Grade", placeholder: "8.6 CGPA" },
    ],
  },
  { id: "skills", label: "Skills", title: "Skills", kind: "skills" },
  {
    id: "projects",
    label: "Projects",
    title: "Projects",
    kind: "list",
    empty: EMPTY_PROJECT,
    addLabel: "Add project",
    fields: [
      { name: "name", label: "Project name", placeholder: "Kirana Ledger" },
      { name: "description", label: "What it does", type: "textarea" },
      { name: "tech", label: "Tech used", placeholder: "React Native, SQLite" },
      { name: "link", label: "Link" },
    ],
  },
  {
    id: "experience",
    label: "Experience",
    title: "Experience",
    kind: "list",
    empty: EMPTY_EXPERIENCE,
    addLabel: "Add experience",
    fields: [
      { name: "role", label: "Role", placeholder: "Frontend Developer" },
      { name: "company", label: "Company", placeholder: "Zeta Systems" },
      { name: "dates", label: "Dates", placeholder: "2022 – present" },
      { name: "highlights", label: "Highlights (one per line)", type: "highlights" },
    ],
  },
  {
    id: "certifications",
    label: "Certifications",
    title: "Certifications",
    kind: "list",
    empty: EMPTY_CERTIFICATION,
    addLabel: "Add certification",
    fields: [
      { name: "name", label: "Certification", placeholder: "AWS Cloud Practitioner" },
      { name: "issuer", label: "Issuer", placeholder: "Amazon Web Services" },
      { name: "date", label: "Date", placeholder: "2024" },
    ],
  },
];

export default function ResumeForm({ formData, onChange, onSubmit, onBack }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // Functional updates throughout: several of these fire in quick succession
  // while typing, and reading formData directly would work from stale state.
  const update = (transform) => onChange((prev) => transform(prev));

  // The skills input keeps its own raw text. Deriving the value from
  // skills.join(", ") instead would strip the comma the moment it is typed.
  const [skillsText, setSkillsText] = useState(formData.skills.join(", "));

  function handleSkillsChange(text) {
    setSkillsText(text);
    update((form) => setSkills(form, parseSkills(text)));
  }

  /**
   * Next and Generate are both submits, so the browser validates the required
   * fields of the current step before either can happen. Doing it any other way
   * means reimplementing validation that the platform already does.
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (isLast) {
      onSubmit(normalizeForm(formData));
      return;
    }
    setStepIndex((index) => index + 1);
  }

  function handlePrevious() {
    if (stepIndex === 0) {
      onBack();
      return;
    }
    setStepIndex((index) => index - 1);
  }

  // Step 1 of 6 reads 0%, step 6 reads 83% — progress through, not including,
  // the current step, matching the spec's screenshots.
  const progress = Math.round((stepIndex / STEPS.length) * 100);

  return (
    <main>
      <div className="wizard-head">
        <p className="wizard-step" data-testid="wizard-step">
          Step <strong>{stepIndex + 1}</strong> / {STEPS.length} &mdash; {step.label}
        </p>
        <p className="wizard-percent">{progress}%</p>
      </div>

      <div
        className="progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form progress"
      >
        <span className="progress__bar" style={{ width: `${progress}%` }} />
      </div>

      <ol className="steps">
        {STEPS.map((candidate, index) => (
          <li
            key={candidate.id}
            className={
              index < stepIndex ? "done" : index === stepIndex ? "current" : ""
            }
          >
            <button
              type="button"
              className="steps__dot"
              // Only steps already completed are reachable by clicking, so the
              // required fields on an earlier step cannot be skipped.
              disabled={index > stepIndex}
              onClick={() => setStepIndex(index)}
              aria-current={index === stepIndex ? "step" : undefined}
            >
              {index < stepIndex ? "✓" : index + 1}
            </button>
            <span>{candidate.label}</span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit}>
        <fieldset>
          {/* A two-line <legend> breaks the fieldset's border cutout, so the
              visible heading is a normal block and the legend is kept for
              screen readers only. */}
          <legend className="visually-hidden">
            Step {stepIndex + 1} of {STEPS.length}: {step.title}
          </legend>

          <div className="step-heading">
            <p className="legend-step">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h2>{step.title}</h2>
          </div>

          {step.kind === "personal" && (
            <div className="grid-2">
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
            </div>
          )}

          {step.kind === "skills" && (
            <label>
              <span>Skills, comma separated</span>
              <input
                type="text"
                value={skillsText}
                placeholder="React, Node.js, PostgreSQL"
                onChange={(event) => handleSkillsChange(event.target.value)}
              />
            </label>
          )}

          {step.kind === "list" && (
            <>
              {formData[step.id].length === 0 && (
                <p className="empty">Nothing added yet. This step is optional.</p>
              )}

              {formData[step.id].map((entry, index) => (
                <div className="entry" key={index}>
                  <div className="entry__head">
                    <h3>
                      {step.title} {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => update((form) => removeEntry(form, step.id, index))}
                    >
                      Remove
                    </button>
                  </div>

                  {step.fields.map((field) => (
                    <label key={field.name}>
                      <span>{field.label}</span>
                      {field.type === "textarea" ? (
                        <textarea
                          rows={2}
                          value={entry[field.name]}
                          onChange={(event) =>
                            update((form) =>
                              setEntryField(form, step.id, index, field.name, event.target.value)
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
                                step.id,
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
                              setEntryField(form, step.id, index, field.name, event.target.value)
                            )
                          }
                        />
                      )}
                    </label>
                  ))}
                </div>
              ))}

              <button
                type="button"
                onClick={() => update((form) => addEntry(form, step.id, step.empty))}
              >
                + {step.addLabel}
              </button>
            </>
          )}
        </fieldset>

        <div className="actions">
          <button type="button" onClick={handlePrevious}>
            {stepIndex === 0 ? "Back to home" : "Previous"}
          </button>
          <button type="submit" className="primary">
            {isLast ? "Generate Resume" : "Next →"}
          </button>
        </div>
      </form>
    </main>
  );
}
