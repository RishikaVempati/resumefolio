import { TEMPLATES } from "../templates";

/**
 * The generated resume, in the chosen template.
 *
 * Both templates render the same sections from the same data — they differ in
 * layout and type, not content. Modern puts contact details and the short lists
 * in a sidebar; Classic runs everything down one centred column.
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
  const contact = [personal.email, personal.phone, personal.address].filter(Boolean);
  const links = [personal.linkedin, personal.github].filter(Boolean);

  return (
    <main className="wide">
      <div className="toolbar">
        <button type="button" onClick={onEdit}>
          Edit details
        </button>

        <span className="template-switch">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              aria-pressed={selectedTemplate === template.id}
            >
              {template.name}
            </button>
          ))}
        </span>

        <button type="button" onClick={onViewPortfolio} disabled={!generated}>
          View portfolio &rarr;
        </button>
      </div>

      {isGenerating && (
        <p className="status" role="status">
          Writing your resume&hellip;
        </p>
      )}

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
          <header className="resume__header">
            <h1>{personal.name}</h1>
            {contact.length > 0 && <p className="resume__contact">{contact.join(" · ")}</p>}
            {links.length > 0 && <p className="resume__contact">{links.join(" · ")}</p>}
          </header>

          <div className="resume__body">
            <div className="resume__main">
              <section>
                <h2>Professional Summary</h2>
                <p>{generated.summary}</p>
              </section>

              {generated.experience.length > 0 && (
                <section>
                  <h2>Experience</h2>
                  {generated.experience.map((entry, index) => (
                    <div className="record" key={index}>
                      <div className="record__head">
                        <h3>{entry.role}</h3>
                        {entry.dates && <span className="record__dates">{entry.dates}</span>}
                      </div>
                      {entry.company && <p className="record__org">{entry.company}</p>}
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
                    <div className="record" key={index}>
                      <div className="record__head">
                        <h3>{project.name}</h3>
                      </div>
                      <p>{project.description}</p>
                      {project.tech && <p className="record__org">{project.tech}</p>}
                    </div>
                  ))}
                </section>
              )}
            </div>

            <aside className="resume__aside">
              {generated.skills.length > 0 && (
                <section>
                  <h2>Skills</h2>
                  <ul className="plain">
                    {generated.skills.map((skill, index) => (
                      <li key={index}>{skill}</li>
                    ))}
                  </ul>
                </section>
              )}

              {formData.education.length > 0 && (
                <section>
                  <h2>Education</h2>
                  {formData.education.map((entry, index) => (
                    <div className="record" key={index}>
                      <h3>{[entry.degree, entry.field].filter(Boolean).join(", ")}</h3>
                      <p className="record__org">
                        {[entry.institution, entry.dates, entry.grade]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {formData.certifications.length > 0 && (
                <section>
                  <h2>Certifications</h2>
                  {formData.certifications.map((entry, index) => (
                    <div className="record" key={index}>
                      <h3>{entry.name}</h3>
                      <p className="record__org">
                        {[entry.issuer, entry.date].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ))}
                </section>
              )}
            </aside>
          </div>
        </article>
      )}
    </main>
  );
}
