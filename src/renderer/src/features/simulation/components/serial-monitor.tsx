import { useRef, useEffect, useState, useCallback } from "react"

interface SerialMonitorProps {
  output: string
  onSend: (data: string) => void
  isRunning: boolean
}

export function SerialMonitor({ output, onSend, isRunning }: SerialMonitorProps) {
  const outputRef = useRef<HTMLPreElement>(null)
  const [input, setInput] = useState("")

  // Auto-scroll to bottom
  useEffect(() => {
    const el = outputRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [output])

  const handleSend = useCallback(() => {
    if (!input.trim() || !isRunning) return
    onSend(input + "\r\n")
    setInput("")
  }, [input, isRunning, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  return (
    <div className="flex flex-col shrink-0 border-t border-border">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Serial Monitor</span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>

      <pre
        ref={outputRef}
        className="flex-1 overflow-auto p-2 text-xs font-mono text-foreground/80 whitespace-pre-wrap min-h-[80px] max-h-[200px]"
      >
        {output || <span className="text-muted-foreground">Serial output will appear here...</span>}
      </pre>

      {/* <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? "Type and press Enter..." : "Not running"}
          disabled={!isRunning}
          className="flex-1 text-xs px-2 py-1 bg-background border border-border rounded font-mono disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!isRunning || !input.trim()}
          className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          Send
        </button>
      </div> */}
    </div>
  )
}
