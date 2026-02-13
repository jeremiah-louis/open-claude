import { useState, useCallback, useEffect } from "react"
import { cn } from "@/utils"
import { Copy, Check, X } from "lucide-react"
import { useCodeTheme } from "@/utils/hooks/use-code-theme"
import { highlightCode } from "@/utils/shiki-theme-loader"
import type { CodeBlock } from "../utils/extract-code-block"

interface CanvasPanelProps {
  codeBlock: CodeBlock
  isStreaming: boolean
  onClose: () => void
}

export function CanvasPanel({ codeBlock, isStreaming, onClose }: CanvasPanelProps) {
  const [copied, setCopied] = useState(false)
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null)
  const codeTheme = useCodeTheme()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeBlock.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [codeBlock.code])

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false

    const highlight = async () => {
      try {
        const html = await highlightCode(
          codeBlock.code,
          codeBlock.language,
          codeTheme,
        )
        if (!cancelled) {
          setHighlightedHtml(html)
        }
      } catch {
        // Fall back to plain text
      }
    }

    highlight()
    return () => { cancelled = true }
  }, [codeBlock.code, codeBlock.language, codeTheme])

  const escapedCode = codeBlock.code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {codeBlock.language}
          </span>
          {isStreaming && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Streaming...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title={copied ? "Copied!" : "Copy code"}
          >
            <div className="relative w-3.5 h-3.5">
              <Copy
                className={cn(
                  "absolute inset-0 w-3.5 h-3.5 text-muted-foreground transition-[opacity,transform] duration-200",
                  copied ? "opacity-0 scale-50" : "opacity-100 scale-100",
                )}
              />
              <Check
                className={cn(
                  "absolute inset-0 w-3.5 h-3.5 text-muted-foreground transition-[opacity,transform] duration-200",
                  copied ? "opacity-100 scale-100" : "opacity-0 scale-50",
                )}
              />
            </div>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Close canvas"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto">
        <pre
          className={cn(
            "m-0 bg-transparent text-foreground text-sm",
            "px-4 py-3",
            "whitespace-pre",
            "**:whitespace-pre **:bg-transparent",
            "[&_pre]:m-0 [&_code]:m-0",
            "[&_pre]:p-0 [&_code]:p-0",
          )}
          style={{
            fontFamily:
              "SFMono-Regular, Menlo, Consolas, 'PT Mono', 'Liberation Mono', Courier, monospace",
            lineHeight: 1.5,
            tabSize: 2,
          }}
        >
          <code
            dangerouslySetInnerHTML={{
              __html: highlightedHtml ?? escapedCode,
            }}
          />
        </pre>
      </div>
    </div>
  )
}
