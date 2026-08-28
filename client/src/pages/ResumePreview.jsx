/**
 * Slice 1: proves the same data and the chosen template arrive here. The Gemini
 * call that fills this page is slice 3; the real templates are slice 5.
 */
export default function ResumePreview({
  formData,
  selectedTemplate,
  onSelectTemplate,
  onEdit,
  onViewPortfolio,
}) {
  return (
    <main>
      <h1>Resume preview</h1>
      <p>
        Template: <strong>{selectedTemplate}</strong>
      </p>

      <button type="button" onClick={() => onSelectTemplate("classic")}>
        Classic
      </button>
      <button type="button" onClick={() => onSelectTemplate("modern")}>
        Modern
      </button>

      <pre>{JSON.stringify(formData, null, 2)}</pre>

      <button type="button" onClick={onEdit}>
        Back to form
      </button>
      <button type="button" onClick={onViewPortfolio}>
        View portfolio
      </button>
    </main>
  );
}
