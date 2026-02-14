import React, { useRef, useState, useEffect } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ResizableSidebar } from "@/components/ui/resizable-sidebar"
import { cn } from "@/utils"
import { Eye, Code } from "lucide-react"
import { useIsMobile } from "@/hooks/use-is-mobile"
import { MessageList } from "./message-list"
import { ChatInput } from "./chat-input"
import { useChat } from "../use-chat"
import { useStreamRouter } from "../hooks/use-stream-router"
import { routeStream } from "../utils/stream-router"
import { CodeEditor } from "../../simulation/components/code-editor"
import { CircuitCanvas } from "../../simulation/components/circuit-canvas"
import { SerialMonitor } from "../../simulation/components/serial-monitor"
import { PipelineStatusBar } from "../../simulation/components/pipeline-status-bar"
import { useSimulation } from "../../simulation/hooks/use-simulation"
import { useOrchestrator } from "../../orchestrator/use-orchestrator"
import { ARDUINO_SYSTEM_PROMPT, DEFAULT_LED_DIAGRAM } from "../../simulation/constants"
import type { ChatPhase } from "../types"

type RightTab = "code" | "preview"

export function ChatPage() {
  const {
    state,
    sendMessage,
    setInput,
    cancelStreaming,
    dismissError,
    isLoading,
    canSend,
    canSendProgrammatic,
    canCancel,
  } = useChat({ systemPrompt: ARDUINO_SYSTEM_PROMPT })

  const onSendScrollRef = useRef<(() => void) | null>(null)

  const handleSubmit = () => {
    if (!canSend) return
    sendMessage(state.inputValue)
    onSendScrollRef.current?.()
  }

  // Stream router: parse streaming content into chat/code/diagram
  const routedResult = useStreamRouter(state.streamingContent)

  // ── Persisted code & diagram ──
  // The stream router only has data while streamingContent is non-empty.
  // On STREAM_COMPLETE the reducer clears streamingContent, so the router
  // returns empty. We persist the last routed code/diagram in state so the
  // editor, canvas, and orchestrator still have them after the stream ends.
  const [persistedCode, setPersistedCode] = useState("")
  const [persistedCodeLang, setPersistedCodeLang] = useState("")
  const [persistedDiagram, setPersistedDiagram] = useState("")
  const [persistedCodeComplete, setPersistedCodeComplete] = useState(false)

  // Update persisted values whenever the router produces content
  useEffect(() => {
    if (routedResult.code) {
      setPersistedCode(routedResult.code)
      setPersistedCodeLang(routedResult.codeLanguage)
      setPersistedCodeComplete(routedResult.codeComplete)
    }
    if (routedResult.diagramJson) {
      setPersistedDiagram(routedResult.diagramJson)
    }
  }, [routedResult.code, routedResult.codeLanguage, routedResult.codeComplete, routedResult.diagramJson])

  // Clear persisted values when user sends a NEW message (fresh conversation turn)
  useEffect(() => {
    if (state.phase === "WAITING") {
      setPersistedCode("")
      setPersistedCodeLang("")
      setPersistedDiagram("")
      setPersistedCodeComplete(false)
      setUserCode("")
    }
  }, [state.phase])

  // Simulation
  const simulation = useSimulation()

  // Track previous chat phase for orchestrator
  const [prevPhase, setPrevPhase] = useState<ChatPhase | null>(null)
  const phaseRef = useRef(state.phase)
  useEffect(() => {
    if (phaseRef.current !== state.phase) {
      setPrevPhase(phaseRef.current)
      phaseRef.current = state.phase
    }
  }, [state.phase])

  // Orchestrator: zero-click compile-and-run pipeline
  const { pipelinePhase, debugAttempt } = useOrchestrator({
    chatPhase: state.phase,
    previousChatPhase: prevPhase,
    code: persistedCode,
    diagramJson: persistedDiagram,
    codeComplete: persistedCodeComplete,
    simulationPhase: simulation.state.phase,
    compileAndRun: async (code, diagram) => {
      const diagramToUse = diagram || DEFAULT_LED_DIAGRAM
      return simulation.compileAndRun(code, diagramToUse)
    },
    sendMessage,
    canSend: canSendProgrammatic,
  })

  // Track user code edits (user typed into the editor after streaming)
  const [userCode, setUserCode] = useState("")

  // Determine what code to show (priority: live stream > persisted > user edit > simulation)
  const displayCode = routedResult.code || persistedCode || userCode || simulation.state.code

  // Determine what diagram to show
  const displayDiagram = routedResult.diagramJson || persistedDiagram || simulation.state.diagramJson || ""

  // Tabbed panel
  const [activeTab, setActiveTab] = useState<RightTab>("code")
  const [panelWidth, setPanelWidth] = useState(500)
  const isMobile = useIsMobile()

  // Auto-switch tabs based on what's streaming
  useEffect(() => {
    if (routedResult.activeSegment === "code") {
      setActiveTab("code")
    }
    if (routedResult.activeSegment === "diagram") {
      setActiveTab("preview")
    }
  }, [routedResult.activeSegment])

  // Auto-switch to preview when simulation starts running
  useEffect(() => {
    if (simulation.state.phase === "RUNNING") {
      setActiveTab("preview")
    }
  }, [simulation.state.phase])

  // Panel is open when there's code or diagram content
  const panelOpen = !!(displayCode || displayDiagram)

  // Manual simulation controls
  const handleStop = () => simulation.stop()
  const handleRun = () => {
    const codeToRun = userCode || persistedCode || simulation.state.code
    const diagramToUse = persistedDiagram || simulation.state.diagramJson || DEFAULT_LED_DIAGRAM
    if (codeToRun) {
      simulation.compileAndRun(codeToRun, diagramToUse)
    }
  }

  // Streaming state for code editor
  const isCodeStreaming =
    state.phase === "STREAMING" && routedResult.activeSegment === "code"

  return (
    <TooltipProvider>
      <div className="h-dvh flex flex-col bg-background text-foreground">
        {/* Title bar drag region */}
        <div
          className="shrink-0 h-10"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        {/* Horizontal split: chat + tabbed panel */}
        <div className="flex-1 flex flex-row min-h-0">
          {/* Chat column */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              className={cn(
                "flex-1 flex flex-col w-full px-4 pb-4 min-h-0",
                !(panelOpen && !isMobile) && "max-w-2xl mx-auto",
              )}
            >
              <MessageList
                messages={state.messages.map((msg) =>
                  msg.role === "assistant" && msg.status === "complete"
                    ? { ...msg, content: routeStream(msg.content).chatText }
                    : msg,
                )}
                phase={state.phase}
                streamingMessageId={state.streamingMessageId}
                streamingContent={
                  state.phase === "STREAMING" ? routedResult.chatText : state.streamingContent
                }
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

              {/* Pipeline status bar */}
              <PipelineStatusBar phase={pipelinePhase} debugAttempt={debugAttempt} />

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

          {/* Desktop: resizable sidebar with tabs */}
          {!isMobile && (
            <ResizableSidebar
              isOpen={panelOpen}
              onClose={() => {}}
              width={panelWidth}
              onWidthChange={setPanelWidth}
              side="right"
              minWidth={300}
              maxWidth={typeof window !== "undefined" ? window.innerWidth * 0.7 : 900}
              showResizeTooltip
              className="border-l border-border"
            >
              <TabbedPanel
                activeTab={activeTab}
                onTabChange={setActiveTab}
                code={displayCode}
                isCodeStreaming={isCodeStreaming}
                onCodeChange={setUserCode}
                diagramJson={displayDiagram}
                simulationPhase={simulation.state.phase}
                serialOutput={simulation.state.serialOutput}
                serialWrite={simulation.serialWrite}
                registerElementRef={simulation.registerElementRef}
                onStop={handleStop}
                onRun={handleRun}
              />
            </ResizableSidebar>
          )}
        </div>

        {/* Mobile: show tab buttons at bottom when panel content exists */}
        {isMobile && panelOpen && (
          <div className="border-t border-border">
            <TabbedPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              code={displayCode}
              isCodeStreaming={isCodeStreaming}
              onCodeChange={setUserCode}
              diagramJson={displayDiagram}
              simulationPhase={simulation.state.phase}
              serialOutput={simulation.state.serialOutput}
              serialWrite={simulation.serialWrite}
              registerElementRef={simulation.registerElementRef}
              onStop={handleStop}
              onRun={handleRun}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

// -- Tabbed Panel Component --

interface TabbedPanelProps {
  activeTab: RightTab
  onTabChange: (tab: RightTab) => void
  code: string
  isCodeStreaming: boolean
  onCodeChange: (code: string) => void
  diagramJson: string
  simulationPhase: import("../../simulation/types").SimulationPhase
  serialOutput: string
  serialWrite: (data: string) => void
  registerElementRef: (id: string, el: HTMLElement | null) => void
  onStop: () => void
  onRun: () => void
}

function TabbedPanel({
  activeTab,
  onTabChange,
  code,
  isCodeStreaming,
  onCodeChange,
  diagramJson,
  simulationPhase,
  serialOutput,
  serialWrite,
  registerElementRef,
  onStop,
  onRun,
}: TabbedPanelProps) {
  const isRunning = simulationPhase === "RUNNING" || simulationPhase === "COMPILING" || simulationPhase === "LOADING"
  const canRun = simulationPhase === "STOPPED" || simulationPhase === "IDLE" || simulationPhase === "COMPILE_ERROR"

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center border-b border-border bg-muted/30">
        <div className="flex items-center ml-2 my-1.5 rounded-lg bg-muted p-0.5">
          <button
            onClick={() => onTabChange("preview")}
            className={cn(
              "flex items-center justify-center w-8 h-7 rounded-md transition-colors",
              activeTab === "preview"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTabChange("code")}
            className={cn(
              "flex items-center justify-center w-8 h-7 rounded-md transition-colors",
              activeTab === "code"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        {/* Simulation controls */}
        <div className="ml-auto flex items-center gap-1 pr-2">
          {isRunning && (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-destructive-foreground bg-destructive/90 hover:bg-destructive transition-colors active:scale-95"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <rect width="10" height="10" rx="1" />
              </svg>
              Stop
            </button>
          )}
          {canRun && (
            <button
              onClick={onRun}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md text-primary-foreground bg-primary/90 hover:bg-primary transition-colors active:scale-95"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <polygon points="0,0 10,5 0,10" />
              </svg>
              Run
            </button>
          )}
        </div>
      </div>

      {/* Tab content — both panels stay mounted to avoid destroy/recreate cycles */}
      <div className="flex-1 min-h-0 relative">
        <div className={cn("absolute inset-0", activeTab !== "code" && "invisible pointer-events-none")}>
          <CodeEditor
            code={code}
            isStreaming={isCodeStreaming}
            onCodeChange={onCodeChange}
          />
        </div>
        <div className={cn("absolute inset-0 flex flex-col", activeTab !== "preview" && "invisible pointer-events-none")}>
          <div className="flex-1 min-h-0 overflow-hidden">
            <CircuitCanvas
              diagramJson={diagramJson}
              simulationPhase={simulationPhase}
              registerElementRef={registerElementRef}
            />
          </div>
          <SerialMonitor
            output={serialOutput}
            onSend={serialWrite}
            isRunning={simulationPhase === "RUNNING"}
          />
        </div>
      </div>
    </div>
  )
}

