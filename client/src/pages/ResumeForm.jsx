/**
 * Slice 1: a placeholder that proves the form data object reaches this page and
 * goes back out again. The six real sections and their dynamic add/remove
 * controls are slice 2.
 */
export default function ResumeForm({ formData, onSubmit, onBack }) {
  return (
    <main>
      <h1>Your details</h1>
      <p>The six form sections land in slice 2. The shared data shape is already here:</p>

      <pre>{JSON.stringify(formData, null, 2)}</pre>

      <button type="button" onClick={onBack}>
        Back
      </button>
      <button type="button" onClick={() => onSubmit(formData)}>
        Generate
      </button>
    </main>
  );
}
