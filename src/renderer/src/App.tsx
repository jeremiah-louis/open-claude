import React, { useState, useEffect } from "react";
import { ApiKeyOnboardingPage } from "./features/onboarding/api-key-onboarding-page";
import { SelectDirectoryPage } from "./features/onboarding/select-directory-page";
import { ChatPage } from "./features/chat";
import { Toaster } from "sonner";

// Set to true to show the chat demo page
const SHOW_DEMO = true;

type OnboardingStep = "loading" | "api-key" | "select-directory" | "done";

const App = () => {
  const [step, setStep] = useState<OnboardingStep>("loading");

  useEffect(() => {
    window.claude.hasStoredApiKey().then((result) => {
      if (result.success && result.data) {
        setStep("select-directory");
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
          onComplete={() => setStep("select-directory")}
        />
      )}

      {step === "select-directory" && (
        <SelectDirectoryPage
          onComplete={(dir) => {
            console.log("Selected directory:", dir);
            setStep("done");
          }}
        />
      )}

      {step === "done" && (
        <div className="h-dvh flex flex-col bg-background text-foreground">
          <div
            className="shrink-0 h-10"
            style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
          />
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-2xl font-semibold">You're all set!</h1>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
