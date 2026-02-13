import { useState, useCallback, useEffect, useRef } from "react"
import { extractCodeBlock, type CodeBlock } from "../utils/extract-code-block"
import { isToolCallMessage, isCanvasLanguage } from "../utils/detect-tool-call"

interface UseCanvasOptions {
  /** The latest user message content (to detect tool-call keywords). */
  lastUserMessage: string | null
  /** The streaming assistant content (to extract code blocks in real time). */
  streamingContent: string
  /** The ID of the currently streaming message, or null. */
  streamingMessageId: string | null
  /** Whether the assistant is currently streaming. */
  isStreaming: boolean
}

export function useCanvas({
  lastUserMessage,
  streamingContent,
  streamingMessageId,
  isStreaming,
}: UseCanvasOptions) {
  const [isCanvasOpen, setIsCanvasOpen] = useState(false)
  const [canvasWidth, setCanvasWidth] = useState(500)
  const [codeBlock, setCodeBlock] = useState<CodeBlock | null>(null)

  // Track which streamingMessageId already auto-opened the canvas
  // so closing won't re-trigger for the same message
  const autoOpenedForRef = useRef<string | null>(null)

  const openCanvas = useCallback(() => setIsCanvasOpen(true), [])
  const closeCanvas = useCallback(() => setIsCanvasOpen(false), [])

  const onCanvasWidthChange = useCallback(
    (w: number) => setCanvasWidth(w),
    [],
  )

  // Extract code block from streaming content in real time
  useEffect(() => {
    if (!streamingContent) return

    const block = extractCodeBlock(streamingContent)
    if (block) {
      setCodeBlock(block)
    }
  }, [streamingContent])

  // Auto-open canvas when tool-call detected AND code block found
  useEffect(() => {
    if (
      !isStreaming ||
      !codeBlock ||
      !lastUserMessage ||
      !streamingMessageId
    ) {
      return
    }

    // Don't re-trigger for the same message
    if (autoOpenedForRef.current === streamingMessageId) return

    if (isToolCallMessage(lastUserMessage) && isCanvasLanguage(codeBlock.language)) {
      autoOpenedForRef.current = streamingMessageId
      setIsCanvasOpen(true)
    }
  }, [isStreaming, codeBlock, lastUserMessage, streamingMessageId])

  // Reset auto-open tracker when streaming message changes
  useEffect(() => {
    if (!streamingMessageId) {
      autoOpenedForRef.current = null
    }
  }, [streamingMessageId])

  return {
    isCanvasOpen,
    openCanvas,
    closeCanvas,
    canvasWidth,
    onCanvasWidthChange,
    codeBlock,
    isStreaming,
  }
}
