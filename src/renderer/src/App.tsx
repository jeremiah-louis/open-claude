import { useState, useEffect } from "react";
import { ApiKeyOnboardingPage } from "./features/onboarding/api-key-onboarding-page";
import { ChatPage } from "./features/chat";
import { SettingsPage } from "./features/settings/settings-page";
import { Toaster } from "sonner";

// Set to true to skip onboarding and show the chat page directly
const SHOW_DEMO = false;

type OnboardingStep = "loading" | "api-key" | "done";
type CurrentPage = "chat" | "settings";

const App = () => {
  const [step, setStep] = useState<OnboardingStep>("loading");
  const [currentPage, setCurrentPage] = useState<CurrentPage>("chat");

  useEffect(() => {
    window.claude.hasStoredApiKey().then((result) => {
      if (result.success && result.data) {
        setStep("done");
      } else {
        setStep("api-key");
      }
    });
  }, []);

  if (SHOW_DEMO) {
    return <ChatPage />;
  }

  if (step === "loading") {
    return <div className="h-dvh bg-background" />;
  }

  return (
    <>
      <Toaster richColors />
      {step === "api-key" && (
        <ApiKeyOnboardingPage
          onComplete={() => setStep("done")}
        />
      )}

      {step === "done" && currentPage === "chat" && (
        <ChatPage onNavigateToSettings={() => setCurrentPage("settings")} />
      )}
      {step === "done" && currentPage === "settings" && (
        <SettingsPage onNavigateToChat={() => setCurrentPage("chat")} />
      )}
    </>
  );
};

export default App;
