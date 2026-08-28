import { useState } from "react";
import Home from "./pages/Home";
import PortfolioPreview from "./pages/PortfolioPreview";
import ResumeForm from "./pages/ResumeForm";
import ResumePreview from "./pages/ResumePreview";

/**
 * The shape every page agrees on. Exported so ResumeForm, ResumePreview and
 * PortfolioPreview all read the same fields rather than each inventing their own.
 * Changing a name here changes it everywhere, which is the point.
 */
export const EMPTY_FORM = {
  personal: {
    name: "",
    email: "",
    phone: "",
    location: "",
    title: "",
    links: "",
  },
  education: [],
  skills: [],
  // The three dynamic sections. Entries are added and removed in ResumeForm.
  projects: [],
  experience: [],
  certifications: [],
};

export const EMPTY_EDUCATION = {
  institution: "",
  degree: "",
  field: "",
  dates: "",
  grade: "",
};
export const EMPTY_PROJECT = { name: "", description: "", tech: "", link: "" };
export const EMPTY_EXPERIENCE = {
  role: "",
  company: "",
  dates: "",
  highlights: [],
};
export const EMPTY_CERTIFICATION = { name: "", issuer: "", date: "" };

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
