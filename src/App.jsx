import { useState } from "react";
import { generateResume } from "./api";
import { EMPTY_FORM } from "./formShape";
import Home from "./pages/Home";
import PortfolioPreview from "./pages/PortfolioPreview";
import ResumeForm from "./pages/ResumeForm";
import ResumePreview from "./pages/ResumePreview";

// Re-exported so pages can import the shape from App, as the spec describes,
// without creating a cycle back into this module.
export {
  EMPTY_CERTIFICATION,
  EMPTY_EDUCATION,
  EMPTY_EXPERIENCE,
  EMPTY_FORM,
  EMPTY_PROJECT,
} from "./formShape";

export default function App() {
  const [page, setPage] = useState("home");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");

  // Authentication state. Named as the spec's App.jsx snippet names them.
  // currentUser is read lazily so LocalStorage is not re-read on every render.
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [pendingPage, setPendingPage] = useState(null);

  /**
   * The single entry point into the flow. Slice 4 puts the auth gate here: when
   * there is no signed-in user this stores the destination in pendingPage and
   * opens AuthModal instead of navigating.
   */
  function handleStartFlow(destination = "form") {
    setPendingPage(destination);
    setPage(destination);
  }

  function handleSelectTemplate(template) {
    setSelectedTemplate(template);
    handleStartFlow("form");
  }

  // Generated content is held here, not in ResumePreview, so switching template
  // or moving to the portfolio never discards it — the spec is explicit that
  // those actions must not lose what was generated.
  const [generated, setGenerated] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  async function handleSubmitForm(completed) {
    setFormData(completed);
    setPage("preview");
    setIsGenerating(true);
    setGenerateError(null);

    try {
      setGenerated(await generateResume(completed));
    } catch (error) {
      setGenerateError(error.message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleRetry() {
    handleSubmitForm(formData);
  }

  const pages = {
    home: (
      <Home
        selectedTemplate={selectedTemplate}
        onStart={() => handleStartFlow("form")}
        onSelectTemplate={handleSelectTemplate}
      />
    ),
    form: (
      <ResumeForm
        formData={formData}
        onChange={setFormData}
        onSubmit={handleSubmitForm}
        onBack={() => setPage("home")}
      />
    ),
    preview: (
      <ResumePreview
        formData={formData}
        generated={generated}
        isGenerating={isGenerating}
        error={generateError}
        onRetry={handleRetry}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
        onEdit={() => setPage("form")}
        onViewPortfolio={() => setPage("portfolio")}
      />
    ),
    portfolio: (
      <PortfolioPreview
        formData={formData}
        generated={generated}
        onBack={() => setPage("preview")}
      />
    ),
  };

  return (
    <>
      <header>
        <strong>Auto Resume + Portfolio Builder</strong>
        <span data-testid="page-indicator">page: {page}</span>
      </header>
      {pages[page]}
    </>
  );
}
