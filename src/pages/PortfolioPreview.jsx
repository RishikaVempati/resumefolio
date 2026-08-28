/**
 * Slice 3: renders the generated content in portfolio form. The spec's four
 * sections — About Me, Skills, Projects, Achievements — read from the same
 * generated object the resume does, so moving between the two never regenerates.
 */
export default function PortfolioPreview({ formData, generated, onBack }) {
  const { personal } = formData;

  if (!generated) {
    return (
      <main>
        <button type="button" onClick={onBack}>
          Back to resume
        </button>
        <p className="status">Nothing generated yet.</p>
      </main>
    );
  }

  return (
    <main>
      <div className="toolbar">
        <button type="button" onClick={onBack}>
          Back to resume
        </button>
      </div>

      <article className="portfolio">
        <header>
          <h1>Hi, I&rsquo;m {personal.name}</h1>
        </header>

        <section>
          <h2>About Me</h2>
          <p>{generated.about}</p>
        </section>

        {generated.skills.length > 0 && (
          <section>
            <h2>Skills</h2>
            <ul className="chips">
              {generated.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
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

        {generated.achievements.length > 0 && (
          <section>
            <h2>Achievements</h2>
            <ul>
              {generated.achievements.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </main>
  );
}
