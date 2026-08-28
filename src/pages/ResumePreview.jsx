/**
 * Slice 3: renders what Gemini wrote. The template is applied as a class for now;
 * the two designs themselves are slice 5.
 */
export default function ResumePreview({
  formData,
  generated,
  isGenerating,
  error,
  onRetry,
  selectedTemplate,
  onSelectTemplate,
  onEdit,
  onViewPortfolio,
}) {
  const { personal } = formData;

  return (
    <main>
      <div className="toolbar">
        <button type="button" onClick={onEdit}>
          Back to form
        </button>
        <button
          type="button"
          onClick={() => onSelectTemplate("classic")}
          aria-pressed={selectedTemplate === "classic"}
        >
          Classic
        </button>
        <button
          type="button"
          onClick={() => onSelectTemplate("modern")}
          aria-pressed={selectedTemplate === "modern"}
        >
          Modern
        </button>
        <button type="button" onClick={onViewPortfolio} disabled={!generated}>
          View portfolio
        </button>
      </div>

      {isGenerating && <p className="status">Writing your resume…</p>}

      {error && (
        <div role="alert" className="error">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}

      {generated && (
        <article className={`resume resume--${selectedTemplate}`}>
          <header>
            <h1>{personal.name}</h1>
            <p className="contact">
              {[personal.email, personal.phone, personal.address, personal.linkedin, personal.github]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>

          <section>
            <h2>Summary</h2>
            <p>{generated.summary}</p>
          </section>

          {generated.experience.length > 0 && (
            <section>
              <h2>Experience</h2>
              {generated.experience.map((entry, index) => (
                <div className="entry" key={index}>
                  <h3>
                    {entry.role}
                    {entry.company && <span> · {entry.company}</span>}
                  </h3>
                  {entry.dates && <p className="dates">{entry.dates}</p>}
                  <ul>
                    {entry.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {generated.projects.length > 0 && (
            <section>
              <h2>Projects</h2>
              {generated.projects.map((project, index) => (
                <div className="entry" key={index}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  {project.tech && <p className="dates">{project.tech}</p>}
                </div>
              ))}
            </section>
          )}

          {formData.education.length > 0 && (
            <section>
              <h2>Education</h2>
              {formData.education.map((entry, index) => (
                <div className="entry" key={index}>
                  <h3>
                    {[entry.degree, entry.field].filter(Boolean).join(", ")}
                  </h3>
                  <p className="dates">
                    {[entry.institution, entry.dates, entry.grade]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </section>
          )}

          {generated.skills.length > 0 && (
            <section>
              <h2>Skills</h2>
              <p>{generated.skills.join(" · ")}</p>
            </section>
          )}

          {formData.certifications.length > 0 && (
            <section>
              <h2>Certifications</h2>
              <ul>
                {formData.certifications.map((entry, index) => (
                  <li key={index}>
                    {[entry.name, entry.issuer, entry.date]
                      .filter(Boolean)
                      .join(" · ")}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      )}
    </main>
  );
}
