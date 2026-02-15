import { useReducer, useCallback, useRef, useEffect, useState } from "react"
import { chatReducer, initialChatState } from "./chat-reducer"
import { streamMessage } from "./services/claude"
import type { ChatMessage as ServiceChatMessage } from "./services/claude"
import type { AppErrorModel } from "@shared/errors"
import type { ChatMessage } from "./types"

const RENDER_SETTLE_MS = 100

interface UseChatOptions {
  systemPrompt?: string
}

export function useChat(options: UseChatOptions = {}) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState)

  // Keep a ref to the latest state so stable callbacks can read current messages
  const stateRef = useRef(state)
  stateRef.current = state

  // Ref to the stream cleanup function returned by streamMessage
  const cleanupRef = useRef<(() => void) | null>(null)
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Conversation persistence
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null)
  const conversationIdRef = useRef<number | null>(null)
  conversationIdRef.current = currentConversationId

  const [isLoadingConversation, setIsLoadingConversation] = useState(false)

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

    // Persist user message to DB
    const persistUserMessage = async () => {
      let convId = conversationIdRef.current
      if (!convId) {
        const conv = await window.db.createConversation()
        convId = conv.id
        conversationIdRef.current = convId
        setCurrentConversationId(convId)
      }
      await window.db.addMessage(convId, "user", trimmed)
    }
    persistUserMessage().catch(console.error)

    // Track whether we've transitioned to STREAMING yet
    let hasStartedStreaming = false

    const cleanup = streamMessage(history, { system: options.systemPrompt }, {
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

        // Capture streaming content BEFORE STREAM_COMPLETE clears it.
        // stateRef still has the pre-dispatch state at this point.
        const finalContent = stateRef.current.streamingContent
        dispatch({ type: "STREAM_COMPLETE" })

        // Persist assistant message to DB
        const convId = conversationIdRef.current
        if (convId && finalContent) {
          window.db.addMessage(convId, "assistant", finalContent).catch(console.error)
        }

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
  }, [options.systemPrompt])

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

  const startNewChat = useCallback(() => {
    reset()
    setCurrentConversationId(null)
    conversationIdRef.current = null
  }, [reset])

  const loadConversation = useCallback(async (id: number) => {
    setIsLoadingConversation(true)
    try {
      cancelStreaming()
      const dbMessages = await window.db.getMessages(id)
      const chatMessages: ChatMessage[] = dbMessages.map((m) => ({
        id: crypto.randomUUID(),
        role: m.role as "user" | "assistant",
        content: m.content,
        status: "complete" as const,
        createdAt: new Date(m.createdAt).getTime(),
      }))
      dispatch({ type: "LOAD_CONVERSATION", payload: chatMessages })
      setCurrentConversationId(id)
      conversationIdRef.current = id
    } finally {
      setIsLoadingConversation(false)
    }
  }, [cancelStreaming])

  const updateTitle = useCallback(async (title: string) => {
    const convId = conversationIdRef.current
    if (convId) {
      await window.db.updateConversationTitle(convId, title)
    }
  }, [])

  return {
    state,
    sendMessage,
    setInput,
    cancelStreaming,
    dismissError,
    reset,
    startNewChat,
    loadConversation,
    updateTitle,
    currentConversationId,
    isLoadingConversation,
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
    canSendProgrammatic:
      state.phase === "IDLE" || state.phase === "READY" || state.phase === "COMPOSING",
    canCancel: state.phase === "STREAMING" || state.phase === "WAITING",
  }
}
