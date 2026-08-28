/**
 * The same generated content as a portfolio page: the four sections the spec
 * names — About Me, Skills, Projects, Achievements — laid out to be shared with
 * an employer rather than printed.
 *
 * It reads the object the resume reads, so moving between the two never costs
 * another Gemini call.
 */
export default function PortfolioPreview({ formData, generated, onBack }) {
  const { personal } = formData;

  if (!generated) {
    return (
      <main>
        <div className="toolbar">
          <button type="button" onClick={onBack}>
            &larr; Back to resume
          </button>
        </div>
        <p className="status">Nothing generated yet.</p>
      </main>
    );
  }

  const links = [
    personal.linkedin && { label: "LinkedIn", href: personal.linkedin },
    personal.github && { label: "GitHub", href: personal.github },
  ].filter(Boolean);

  return (
    <main className="wide">
      <div className="toolbar">
        <button type="button" onClick={onBack}>
          &larr; Back to resume
        </button>
      </div>

      <article className="portfolio">
        <header className="portfolio__hero">
          <p className="portfolio__available">Available for new opportunities</p>
          <h1>
            Hi, I&rsquo;m <em>{personal.name}</em>
          </h1>
          <p className="portfolio__tagline">{generated.summary}</p>

          {(personal.email || links.length > 0) && (
            <p className="portfolio__links">
              {personal.email && <span>{personal.email}</span>}
              {links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </p>
          )}
        </header>

        <section className="portfolio__section">
          <h2>About Me</h2>
          <p className="portfolio__about">{generated.about}</p>
        </section>

        {generated.skills.length > 0 && (
          <section className="portfolio__section">
            <h2>Skills</h2>
            <ul className="chips">
              {generated.skills.map((skill, index) => (
                <li key={index}>{skill}</li>
              ))}
            </ul>
          </section>
        )}

        {generated.projects.length > 0 && (
          <section className="portfolio__section">
            <h2>Projects</h2>
            <div className="cards">
              {generated.projects.map((project, index) => (
                <div className="card" key={index}>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                  {project.tech && <p className="card__tech">{project.tech}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {generated.achievements.length > 0 && (
          <section className="portfolio__section">
            <h2>Achievements</h2>
            <ul className="achievements">
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
