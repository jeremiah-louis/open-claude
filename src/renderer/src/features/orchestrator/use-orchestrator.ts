import { useEffect, useRef, useCallback, useState } from "react"
import type { ChatPhase } from "../chat/types"
import { buildAutoDebugMessage } from "./auto-debug"

export type PipelinePhase =
  | "idle"
  | "compiling"
  | "running"
  | "auto-debugging"
  | "error"

const MAX_AUTO_DEBUG_ATTEMPTS = 3

interface UseOrchestratorOptions {
  chatPhase: ChatPhase
  previousChatPhase: ChatPhase | null
  /** Persisted code — survives STREAM_COMPLETE clearing */
  code: string
  /** Persisted diagram JSON — survives STREAM_COMPLETE clearing */
  diagramJson: string
  /** Whether the code fence has been closed (complete sketch) */
  codeComplete: boolean
  compileAndRun: (code: string, diagram: string) => Promise<{ success: boolean; error: string | null }>
  sendMessage: (content: string) => void
  canSend: boolean
}

export function useOrchestrator({
  chatPhase,
  previousChatPhase,
  code,
  diagramJson,
  codeComplete,
  compileAndRun,
  sendMessage,
  canSend,
}: UseOrchestratorOptions) {
  const [pipelinePhase, setPipelinePhase] = useState<PipelinePhase>("idle")
  const [debugAttempt, setDebugAttempt] = useState(0)
  const lastCompiledCodeRef = useRef<string>("")
  const isAutoDebugRef = useRef(false)
  const isCompilingRef = useRef(false)

  // Use refs for values read inside handleCompile to avoid dependency cycles.
  // The handleCompile callback must NOT depend on debugAttempt state, because
  // it also sets debugAttempt — creating an infinite effect loop.
  const debugAttemptRef = useRef(0)
  const canSendRef = useRef(canSend)
  canSendRef.current = canSend
  const sendMessageRef = useRef(sendMessage)
  sendMessageRef.current = sendMessage

  // Detect phase transitions that mean "stream just finished"
  // STREAMING → RENDERING → READY is the normal flow
  const wasStreaming =
    previousChatPhase === "STREAMING" || previousChatPhase === "RENDERING"
  const isNowReady = chatPhase === "READY"

  // Stable compile handler — only depends on code/diagram/codeComplete/compileAndRun
  const handleCompile = useCallback(async () => {
    if (isCompilingRef.current) return
    if (!code || !codeComplete) return

    // Don't recompile identical code unless we're auto-debugging
    if (code === lastCompiledCodeRef.current && !isAutoDebugRef.current) return

    isCompilingRef.current = true
    lastCompiledCodeRef.current = code
    setPipelinePhase("compiling")

    try {
      const result = await compileAndRun(code, diagramJson || "")

      if (result.success) {
        setPipelinePhase("running")
        debugAttemptRef.current = 0
        setDebugAttempt(0)
        isAutoDebugRef.current = false
      } else if (result.error) {
        const currentAttempt = debugAttemptRef.current + 1
        debugAttemptRef.current = currentAttempt
        setDebugAttempt(currentAttempt)

        if (currentAttempt <= MAX_AUTO_DEBUG_ATTEMPTS && canSendRef.current) {
          setPipelinePhase("auto-debugging")
          isAutoDebugRef.current = true

          const debugMsg = buildAutoDebugMessage(
            result.error,
            currentAttempt,
            MAX_AUTO_DEBUG_ATTEMPTS,
          )

          setTimeout(() => {
            sendMessageRef.current(debugMsg)
          }, 500)
        } else {
          setPipelinePhase("error")
          isAutoDebugRef.current = false
        }
      }
    } finally {
      isCompilingRef.current = false
    }
  }, [code, diagramJson, codeComplete, compileAndRun])

  // Trigger compile when streaming completes and we have complete code
  useEffect(() => {
    if (wasStreaming && isNowReady && codeComplete && code) {
      handleCompile()
    }
  }, [wasStreaming, isNowReady, codeComplete, code, handleCompile])

  // Reset pipeline when user sends a new message (not auto-debug).
  // Check both SENDING and WAITING because React 18 batching may skip
  // the SENDING phase entirely (dispatches are batched into one render).
  useEffect(() => {
    if ((chatPhase === "SENDING" || chatPhase === "WAITING") && !isAutoDebugRef.current) {
      setPipelinePhase("idle")
      debugAttemptRef.current = 0
      setDebugAttempt(0)
      lastCompiledCodeRef.current = ""
    }
  }, [chatPhase])

  return {
    pipelinePhase,
    debugAttempt,
  }
}
