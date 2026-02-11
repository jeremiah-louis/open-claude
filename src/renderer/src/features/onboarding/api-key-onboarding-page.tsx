"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { IconSpinner, KeyFilledIcon } from "@/components/ui/icons"

export type CustomClaudeConfig = {
  model: string
  token: string
  baseUrl: string
}

// Check if the key looks like a valid Anthropic API key
const isValidApiKey = (key: string) => {
  const trimmed = key.trim()
  return trimmed.startsWith("sk-ant-") && trimmed.length > 20
}

interface ApiKeyOnboardingPageProps {
  onBack?: () => void
  onComplete?: (config: CustomClaudeConfig) => void
}

export function ApiKeyOnboardingPage({
  onBack,
  onComplete,
}: ApiKeyOnboardingPageProps) {
  // Default values - only Anthropic API supported
  const defaultModel = "claude-sonnet-4-20250514"
  const defaultBaseUrl = "https://api.anthropic.com"

  const [apiKey, setApiKey] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBack = () => {
    onBack?.()
  }

  // Submit API key
  const submitApiKey = (key: string) => {
    if (!isValidApiKey(key)) return

    setIsSubmitting(true)

    const config: CustomClaudeConfig = {
      model: defaultModel,
      token: key.trim(),
      baseUrl: defaultBaseUrl,
    }

    // Mock submission - replace with actual API call later
    setTimeout(() => {
      onComplete?.(config)
      setIsSubmitting(false)
    }, 1000)
  }

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setApiKey(value)

    // Auto-submit if valid API key is pasted
    if (isValidApiKey(value)) {
      setTimeout(() => submitApiKey(value), 100)
    }
  }

  const handleApiKeyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && apiKey.trim()) {
      submitApiKey(apiKey)
    }
  }

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background select-none">
      {/* Draggable title bar area */}
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Back button - fixed in top left corner below traffic lights */}
      <button
        onClick={handleBack}
        className="fixed top-12 left-4 flex items-center justify-center h-8 w-8 rounded-full hover:bg-foreground/5 transition-colors hover:cursor-pointer"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div className="w-full max-w-[440px] space-y-8 px-4">
        {/* Header with icon */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 p-2 mx-auto w-max rounded-full border border-border">
            <div className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center">
              <KeyFilledIcon className="w-5 h-5 text-background" />
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-semibold tracking-tight">
              Enter API Key
            </h1>
            <p className="text-sm text-muted-foreground">
              Get your API key from{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              value={apiKey}
              onChange={handleApiKeyChange}
              onKeyDown={handleApiKeyKeyDown}
              placeholder="sk-ant-..."
              className="font-mono text-center pr-10"
              autoFocus
              disabled={isSubmitting}
            />
            {isSubmitting && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <IconSpinner className="h-4 w-4" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Your API key starts with sk-ant-
          </p>
        </div>
      </div>
    </div>
  )
}
