/**
 * Slice 1: proves the portfolio view reads the same object the resume does —
 * the spec's "both previews from the same form data". Sections are filled in
 * with slice 5.
 */
export default function PortfolioPreview({ formData, onBack }) {
  return (
    <main>
      <h1>Portfolio preview</h1>
      <p>About Me, Skills, Projects and Achievements are built in slice 5.</p>

      <pre>{JSON.stringify(formData, null, 2)}</pre>

      <button type="button" onClick={onBack}>
        Back to resume
      </button>
    </main>
  );
}
