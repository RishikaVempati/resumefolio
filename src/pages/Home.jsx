import { TEMPLATES } from "../templates";

/**
 * Slice 1: the landing page's job in the state machine — pick a template, or just
 * start. Navbar, hero, features and footer are filled in with slice 5's design work.
 */
export default function Home({ selectedTemplate, onStart, onSelectTemplate }) {
  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Powered by Google Gemini</p>
        <h1>
          Turn what you know about yourself into a <em>resume</em>
        </h1>
        <p className="lede">
          Fill in one form. Gemini writes the content from your own details — no
          invented employers, no invented numbers. Preview it as a resume or as a
          portfolio you can share.
        </p>
        <button type="button" className="primary" onClick={onStart}>
          Get Started
        </button>
      </section>

      <h2 className="section-title">Templates</h2>
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
    </main>
  );
}
