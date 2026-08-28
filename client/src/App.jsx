import { useState } from "react";
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
  const [selectedTemplate, setSelectedTemplate] = useState("classic");

  // Where the user was heading when something interrupted them. Slice 4 uses this
  // to send them on after the auth modal closes.
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

  function handleSubmitForm(completed) {
    setFormData(completed);
    setPage("preview");
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
        selectedTemplate={selectedTemplate}
        onSelectTemplate={setSelectedTemplate}
        onEdit={() => setPage("form")}
        onViewPortfolio={() => setPage("portfolio")}
      />
    ),
    portfolio: (
      <PortfolioPreview
        formData={formData}
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
