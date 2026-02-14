import { useReducer, useCallback, useRef, useEffect } from "react"
import { chatReducer, initialChatState } from "./chat-reducer"
import { streamMessage } from "./services/claude"
import type { ChatMessage as ServiceChatMessage } from "./services/claude"
import type { AppErrorModel } from "@shared/errors"

const RENDER_SETTLE_MS = 100

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)

  // Keep a ref to the latest state so stable callbacks can read current messages
  const stateRef = useRef(state)
  stateRef.current = state

  // Ref to the stream cleanup function returned by streamMessage
  const cleanupRef = useRef<(() => void) | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      if (renderTimerRef.current) clearTimeout(renderTimerRef.current)
    }
  }, [])

  const cancelStreaming = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current)
      renderTimerRef.current = null
    }
    dispatch({ type: "CANCEL_STREAMING" })
  }, [])

  const sendMessage = useCallback((content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    // Reject sends while a stream is active — only the stop button should cancel
    const currentPhase = stateRef.current.phase
    if (
      currentPhase === "SENDING" ||
      currentPhase === "WAITING" ||
      currentPhase === "STREAMING" ||
      currentPhase === "RENDERING"
    ) return

    // Cancel any in-progress stream before starting a new one
    cleanupRef.current?.()
    cleanupRef.current = null
    if (renderTimerRef.current) clearTimeout(renderTimerRef.current)

    const userMessageId = crypto.randomUUID()
    const assistantMessageId = crypto.randomUUID()

    // Finalize any in-progress streaming before submitting new message
    dispatch({ type: "STREAM_COMPLETE" })
    dispatch({ type: "RENDER_COMPLETE" })

    // Build conversation history from current completed messages + new user message
    const history: ServiceChatMessage[] = [
      ...stateRef.current.messages
        .filter((m) => m.status === "complete")
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: trimmed },
    ]

    // IDLE/READY → VALIDATING
    dispatch({
      type: "SUBMIT_MESSAGE",
      payload: { id: userMessageId, content: trimmed, createdAt: Date.now() },
    })

    // VALIDATING → SENDING
    dispatch({ type: "MESSAGE_SENT" })

    // SENDING → WAITING (adds assistant placeholder, shows "Thinking...")
    dispatch({ type: "START_WAITING", payload: { messageId: assistantMessageId } })

    // Track whether we've transitioned to STREAMING yet
    let hasStartedStreaming = false

    const cleanup = streamMessage(history, {}, {
      onChunk: (chunk) => {
        const event = chunk as {
          type: string
          delta?: { type: string; text?: string }
        }

        if (
          event.type === "content_block_delta" &&
          event.delta?.type === "text_delta" &&
          event.delta.text
        ) {
          // Transition WAITING → STREAMING on first text chunk
          if (!hasStartedStreaming) {
            dispatch({ type: "START_STREAMING" })
            hasStartedStreaming = true
          }
          dispatch({ type: "STREAM_TOKEN", payload: event.delta.text })
        }
      },

      onEnd: () => {
        // Handle edge case where stream ends without any text chunks
        if (!hasStartedStreaming) {
          dispatch({ type: "START_STREAMING" })
        }
        dispatch({ type: "STREAM_COMPLETE" })
        renderTimerRef.current = setTimeout(() => {
          dispatch({ type: "RENDER_COMPLETE" })
        }, RENDER_SETTLE_MS)
        // Remove IPC listeners so they don't stack on the next message
        cleanupRef.current?.()
        cleanupRef.current = null
      },

      onError: (error) => {
        const errorModel = error as AppErrorModel
        const message = errorModel?.message ?? "An unexpected error occurred."
        dispatch({ type: "ERROR", payload: message })
        // Remove IPC listeners so they don't stack on the next message
        cleanupRef.current?.()
        cleanupRef.current = null
      },
    })

    cleanupRef.current = cleanup
  }, [])

  const setInput = useCallback((value: string) => {
    dispatch({ type: "SET_INPUT", payload: value })
  }, [])

  const dismissError = useCallback(() => {
    dispatch({ type: "DISMISS_ERROR" })
  }, [])

  const reset = useCallback(() => {
    cancelStreaming()
    dispatch({ type: "RESET" })
  }, [cancelStreaming])

  return {
    state,
    sendMessage,
    setInput,
    cancelStreaming,
    dismissError,
    reset,
    // Derived convenience values
    isStreaming: state.phase === "STREAMING",
    isWaiting: state.phase === "WAITING",
    isLoading:
      state.phase === "SENDING" ||
      state.phase === "WAITING" ||
      state.phase === "STREAMING" ||
      state.phase === "RENDERING",
    canSend:
      (state.phase === "IDLE" || state.phase === "READY" || state.phase === "COMPOSING") &&
      state.inputValue.trim().length > 0,
    canCancel: state.phase === "STREAMING" || state.phase === "WAITING",
  }
}
