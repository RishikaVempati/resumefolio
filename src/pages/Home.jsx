import { TEMPLATES } from "../templates";

const FEATURES = [
  {
    icon: "✍️",
    title: "Written from your details",
    body: "Gemini rewrites what you type into resume language. It never invents an employer, a date or a number you did not give it.",
  },
  {
    icon: "🎯",
    title: "Two views, one form",
    body: "A resume for applications and a portfolio page to share — both from the same answers, generated in a single pass.",
  },
  {
    icon: "🎨",
    title: "Templates you can switch",
    body: "Change the design after generating. Your content stays exactly where it is, no second wait.",
  },
  {
    icon: "⚡",
    title: "Done in about a minute",
    body: "Six short steps, then the writing happens in seconds. No account setup beyond an email and a password.",
  },
];

/**
 * The landing page: navbar lives in App so it persists, everything else is here.
 * The hero visual is CSS rather than an image, so it stays sharp and costs nothing
 * to load.
 */
export default function Home({ selectedTemplate, onStart, onSelectTemplate }) {
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">
            <span className="dot" aria-hidden="true" />
            Powered by Google Gemini
          </p>
          <h1>
            Turn what you know about yourself into a{" "}
            <em>resume that reads well</em>
          </h1>
          <p className="lede">
            Answer six short steps. Gemini writes the content from your own
            details — no invented employers, no invented numbers. Preview it as a
            resume, or as a portfolio you can send to anyone.
          </p>
          <div className="hero__actions">
            <button type="button" className="primary" onClick={onStart}>
              Generate my resume →
            </button>
            <a className="ghost" href="#templates">
              See the templates
            </a>
          </div>
        </div>

        {/* A suggestion of the output, not a real preview — hence aria-hidden. */}
        <div className="hero__art" aria-hidden="true">
          <div className="mock">
            <div className="mock__head">
              <span className="mock__name" />
              <span className="mock__rule" />
            </div>
            <div className="mock__body">
              <div className="mock__side">
                <span className="mock__label" />
                <span className="mock__line" />
                <span className="mock__line" />
                <span className="mock__line short" />
                <span className="mock__label" />
                <span className="mock__line" />
                <span className="mock__line short" />
              </div>
              <div className="mock__main">
                <span className="mock__label" />
                <span className="mock__line" />
                <span className="mock__line" />
                <span className="mock__line short" />
                <span className="mock__label" />
                <span className="mock__chips">
                  <i /> <i /> <i />
                </span>
                <span className="mock__line" />
                <span className="mock__line short" />
              </div>
            </div>
          </div>
          <div className="hero__badge">
            <strong>AI written</strong>
            <span>from your own answers</span>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <h2 className="section-title">Why it is different</h2>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article className="feature" key={feature.title}>
              <span className="feature__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="templates">
        <h2 className="section-title">Pick a template</h2>
        <ul className="templates">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => onSelectTemplate(template.id)}
                aria-pressed={selectedTemplate === template.id}
              >
                <span className={`swatch swatch--${template.id}`} aria-hidden="true">
                  <span className="swatch__rule" />
                  <span className="swatch__line" />
                  <span className="swatch__line swatch__line--short" />
                </span>
                <strong>{template.name}</strong>
                <span className="blurb">{template.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="templates__note">
          You can switch templates after generating, without losing your content.
        </p>
      </section>

      <footer className="site-footer">
        <p>
          <strong>Auto Resume + Portfolio Builder</strong> — a capstone project.
          Content is generated by Google Gemini from what you enter.
        </p>
        <p className="site-footer__meta">
          Your details stay in your own browser. No resumes are stored on a server.
        </p>
      </footer>
    </main>
  );
}
