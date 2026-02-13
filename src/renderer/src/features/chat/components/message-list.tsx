import React, { useRef, useLayoutEffect } from "react"
import { MessageBubble } from "./message-bubble"
import { ThinkingIndicator } from "./thinking-indicator"
import { EmptyState } from "./empty-state"
import { ScrollToBottomButton } from "./scroll-to-bottom-button"
import { useAutoScroll } from "../hooks/use-auto-scroll"
import type { ChatMessage, ChatPhase } from "../types"

interface MessageListProps {
  messages: ChatMessage[]
  phase: ChatPhase
  streamingMessageId: string | null
  streamingContent: string
  onSendScrollRef?: React.MutableRefObject<(() => void) | null>
}

export function MessageList({
  messages,
  phase,
  streamingMessageId,
  streamingContent,
  onSendScrollRef,
}: MessageListProps) {
  const { containerRef, scrollToBottom, requestScrollToNewMessage } =
    useAutoScroll(messages.length)

  const spacerRef = useRef<HTMLDivElement>(null)

  // Expose requestScrollToNewMessage to parent synchronously at render time
  if (onSendScrollRef) {
    onSendScrollRef.current = requestScrollToNewMessage
  }

  const isEmpty = messages.length === 0 && phase === "IDLE"
  const showThinking = phase === "WAITING"

  // Dynamically size spacer so last user message stays pinned at viewport top.
  // Runs on every content change (new messages, streaming chunks, phase transitions).
  // Directly mutates the spacer DOM node to avoid React re-renders on each stream chunk.
  useLayoutEffect(() => {
    const el = containerRef.current
    const spacer = spacerRef.current
    if (!el || !spacer) return

    const userMessages = el.querySelectorAll<HTMLElement>(
      '[data-message-role="user"]',
    )
    const lastUserMessage = userMessages[userMessages.length - 1]
    if (!lastUserMessage) {
      spacer.style.height = "0px"
      return
    }

    const containerRect = el.getBoundingClientRect()
    const messageRect = lastUserMessage.getBoundingClientRect()
    const messageTop = messageRect.top - containerRect.top + el.scrollTop

    const currentSpacerH = spacer.offsetHeight
    const realContentHeight = el.scrollHeight - currentSpacerH
    const needed = messageTop + el.clientHeight - realContentHeight

    spacer.style.height = `${Math.max(0, needed)}px`
  }, [messages, streamingContent, phase, containerRef])

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        className={`h-full overflow-y-auto scrollbar-none py-4 ${isEmpty ? "flex flex-col" : "space-y-4"}`}
      >
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {messages.map((message) => {
              const isActiveStream = message.id === streamingMessageId
              return (
                <div key={message.id} data-message-role={message.role}>
                  <MessageBubble
                    message={message}
                    streamingContent={isActiveStream ? streamingContent : undefined}
                    isStreaming={isActiveStream && phase === "STREAMING"}
                  />
                </div>
              )
            })}
            {showThinking && <ThinkingIndicator />}
            {/* Spacer — dynamically sized to keep the last user message pinned at viewport top */}
            <div
              ref={spacerRef}
              data-scroll-spacer
              className="shrink-0 pointer-events-none"
            />
          </>
        )}
      </div>
      {!isEmpty && (
        <ScrollToBottomButton
          containerRef={containerRef}
          onScrollToBottom={scrollToBottom}
        />
      )}
    </div>
  )
}
