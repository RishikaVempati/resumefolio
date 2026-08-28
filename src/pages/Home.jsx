const TEMPLATES = [
  { id: "classic", name: "Classic", blurb: "Serif headings, generous margins." },
  { id: "modern", name: "Modern", blurb: "Sans-serif, accent rule, tight grid." },
];

/**
 * Slice 1: the landing page's job in the state machine — pick a template, or just
 * start. Navbar, hero, features and footer are filled in with slice 5's design work.
 */
export default function Home({ selectedTemplate, onStart, onSelectTemplate }) {
  return (
    <main>
      <h1>Turn what you know about yourself into a resume</h1>
      <p>
        Fill in a form. Gemini writes the content. Preview it as a resume or a
        portfolio.
      </p>

      <button type="button" onClick={onStart}>
        Get Started
      </button>

      <h2>Templates</h2>
      <ul className="templates">
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onSelectTemplate(template.id)}
              aria-pressed={selectedTemplate === template.id}
            >
              <strong>{template.name}</strong>
              <span>{template.blurb}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
