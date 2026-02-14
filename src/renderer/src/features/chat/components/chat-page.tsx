import React, { useRef, useMemo } from "react"
import { AnimatePresence, motion } from "motion/react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { cn } from "@/utils"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { CanvasPanel } from "./canvas-panel"
import { useChat } from "../use-chat"
import { useCanvas } from "../hooks/use-canvas"

export function ChatPage() {
  const {
    state,
    sendMessage,
    setInput,
    cancelStreaming,
    dismissError,
    isLoading,
    canSend,
    canCancel,
  } = useChat()

  const onSendScrollRef = useRef<(() => void) | null>(null)

  const handleSubmit = () => {
    if (!canSend) return
    sendMessage(state.inputValue)
    onSendScrollRef.current?.()
  }

  // Derive the last user message for tool-call detection
  const lastUserMessage = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      if (state.messages[i].role === "user") {
        return state.messages[i].content
      }
    }
    return null
  }, [state.messages])

  const {
    isCanvasOpen,
    closeCanvas,
    canvasWidth,
    onCanvasWidthChange,
    codeBlock,
    isStreaming: canvasIsStreaming,
  } = useCanvas({
    lastUserMessage,
    streamingContent: state.streamingContent,
    streamingMessageId: state.streamingMessageId,
    isStreaming:
      state.phase === "STREAMING" || state.phase === "WAITING",
  })

  const isMobile = useIsMobile()
  const canvasVisible = isCanvasOpen && codeBlock !== null

  return (
    <TooltipProvider>
      <div className="h-dvh flex flex-col bg-background text-foreground">
        {/* Title bar drag region */}
        <div
          className="shrink-0 h-10"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* Horizontal split: chat + canvas */}
        <div className="flex-1 flex flex-row min-h-0">
          {/* Chat column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              className={cn(
                "flex-1 flex flex-col w-full px-4 pb-4 min-h-0",
                !(canvasVisible && !isMobile) && "max-w-2xl mx-auto",
              )}
            >
              <MessageList
                messages={state.messages}
                phase={state.phase}
                streamingMessageId={state.streamingMessageId}
                streamingContent={state.streamingContent}
                onSendScrollRef={onSendScrollRef}
              />

              {/* Error banner */}
              {state.phase === "ERROR" && state.error && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-lg">
                  <span className="flex-1">{state.error}</span>
                  <button
                    onClick={dismissError}
                    className="shrink-0 text-xs font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              <ChatInput
                value={state.inputValue}
                onValueChange={setInput}
                onSubmit={handleSubmit}
                onCancel={cancelStreaming}
                isLoading={isLoading}
                canSend={canSend}
                canCancel={canCancel}
              />
            </div>
          </div>

          {/* Desktop: resizable sidebar */}
          {!isMobile && (
            <ResizableSidebar
              isOpen={canvasVisible}
              onClose={closeCanvas}
              width={canvasWidth}
              onWidthChange={onCanvasWidthChange}
              side="right"
              minWidth={300}
              maxWidth={typeof window !== "undefined" ? window.innerWidth * 0.7 : 900}
              showResizeTooltip
              className="border-l border-border"
            >
              {codeBlock && (
                <CanvasPanel
                  codeBlock={codeBlock}
                  isStreaming={canvasIsStreaming}
                  onClose={closeCanvas}
                />
              )}
            </ResizableSidebar>
          )}
        </div>

        {/* Mobile: full-screen overlay */}
        {isMobile && (
          <AnimatePresence>
            {canvasVisible && codeBlock && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-50 bg-background pt-10"
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
              >
                <CanvasPanel
                  codeBlock={codeBlock}
                  isStreaming={canvasIsStreaming}
                  onClose={closeCanvas}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </TooltipProvider>
  )
}
