import { useState } from "react";
import { generateResume } from "./api";
import { getCurrentUser, setCurrentUser as persistUser, signOut } from "./auth";
import AuthModal from "./components/AuthModal";
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
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [pendingPage, setPendingPage] = useState(null);

  /**
   * The single entry point into the flow. With no signed-in user this remembers
   * where they were heading and opens the modal instead of navigating; the
   * destination is honoured in handleAuthSuccess.
   */
  function handleStartFlow(destination = "form") {
    if (!currentUser) {
      setPendingPage(destination);
      setAuthMode("signup");
      setIsAuthOpen(true);
      return;
    }
    setPage(destination);
  }

  function handleSelectTemplate(template) {
    setSelectedTemplate(template);
    handleStartFlow("form");
  }

  /**
   * Pre-fill what we know about the user, then send them where they were going.
   * Their own typing wins: only blank fields are filled, so signing in midway
   * through the form cannot overwrite it.
   */
  function handleAuthSuccess(user) {
    setCurrentUser(user);
    persistUser(user);
    setIsAuthOpen(false);

    setFormData((prev) => ({
      ...prev,
      personal: {
        ...prev.personal,
        name: prev.personal.name || user.name,
        email: prev.personal.email || user.email,
      },
    }));

    setPage(pendingPage ?? "form");
    setPendingPage(null);
  }

  function handleSignOut() {
    signOut();
    setCurrentUser(null);
    setPage("home");
  }

  function openLogin() {
    setAuthMode("login");
    setIsAuthOpen(true);
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
        <span className="header-actions">
          {currentUser ? (
            <>
              <span className="signed-in">{currentUser.name}</span>
              <button type="button" className="link" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <button type="button" className="link" onClick={openLogin}>
              Login
            </button>
          )}
        </span>
      </header>

      {pages[page]}

      {isAuthOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}
