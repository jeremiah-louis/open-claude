import { memo, useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "../hooks/use-theme"
import { Copy, Check, Download, AlertTriangle, RotateCcw } from "lucide-react"
import { cn } from "../utils"

// Lazy load mermaid to avoid bundle size impact
let mermaidPromise: Promise<typeof import("mermaid")> | null = null
const getMermaid = () => {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid")
  }
  return mermaidPromise
}

// Clean up mermaid error SVGs that get added to the DOM
const cleanupMermaidErrors = () => {
  const errorSvgs = document.querySelectorAll('svg[id^="mermaid-"]')
  errorSvgs.forEach((svg) => {
    if (svg.parentElement === document.body) {
      svg.remove()
    }
  })
  const containers = document.querySelectorAll('div[id^="dmermaid-"], div[id^="d"]')
  containers.forEach((div) => {
    if (div.parentElement === document.body && div.querySelector("svg")) {
      div.remove()
    }
  })
}

interface MermaidBlockProps {
  code: string
  size?: "sm" | "md" | "lg"
  isStreaming?: boolean
}

type RenderState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; svg: string }
  | { status: "error"; message: string }
  | { status: "parsing" }

const getMermaidConfig = (isDark: boolean): Record<string, unknown> => ({
  startOnLoad: false,
  theme: isDark ? "dark" : "default",
  themeVariables: isDark
    ? {
        primaryColor: "#3b82f6",
        primaryTextColor: "#f4f4f5",
        primaryBorderColor: "#52525b",
        lineColor: "#71717a",
        secondaryColor: "#27272a",
        tertiaryColor: "#18181b",
        background: "#18181b",
        mainBkg: "#27272a",
        nodeBorder: "#52525b",
        clusterBkg: "#27272a",
        defaultLinkColor: "#71717a",
        titleColor: "#f4f4f5",
        edgeLabelBackground: "#27272a",
      }
    : {
        primaryColor: "#3b82f6",
        primaryTextColor: "#18181b",
        primaryBorderColor: "#d4d4d8",
        lineColor: "#71717a",
        secondaryColor: "#f4f4f5",
        tertiaryColor: "#fafafa",
        background: "#ffffff",
        mainBkg: "#fafafa",
        nodeBorder: "#d4d4d8",
        clusterBkg: "#f4f4f5",
        defaultLinkColor: "#71717a",
        titleColor: "#18181b",
        edgeLabelBackground: "#fafafa",
      },
  securityLevel: "loose" as const,
  fontFamily: "inherit",
})

const RENDER_DEBOUNCE_MS = 600

// Global cache for rendered mermaid diagrams
const mermaidCache = new Map<string, string>()
const finishedStreamingBlocks = new Set<string>()

const StreamingPlaceholder = memo(function StreamingPlaceholder() {
  return (
    <div className="relative mt-2 mb-4 rounded-[10px] bg-muted/50 overflow-hidden">
      <div className="p-4 min-h-[60px] flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Creating diagram...</span>
      </div>
    </div>
  )
})

const MermaidBlockInner = memo(function MermaidBlockInner({
  code,
}: {
  code: string
}) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [renderState, setRenderState] = useState<RenderState>(() => {
    const cacheKey = `${code}-${isDark ? "dark" : "light"}`
    const cached = mermaidCache.get(cacheKey)
    if (cached) {
      return { status: "success", svg: cached }
    }
    return { status: "idle" }
  })
  const [copied, setCopied] = useState(false)
  const renderIdRef = useRef(0)
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedCodeRef = useRef<string>("")
  const lastRenderedThemeRef = useRef<boolean | null>(null)

  const doRender = useCallback(async () => {
    renderIdRef.current += 1
    const currentRenderId = renderIdRef.current

    setRenderState({ status: "loading" })

    try {
      const mermaidModule = await getMermaid()
      const mermaid = mermaidModule.default

      if (currentRenderId !== renderIdRef.current) return

      mermaid.initialize(getMermaidConfig(isDark))

      const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const { svg } = await mermaid.render(id, code)

      if (currentRenderId !== renderIdRef.current) return

      const cacheKey = `${code}-${isDark ? "dark" : "light"}`
      mermaidCache.set(cacheKey, svg)

      setRenderState({ status: "success", svg })
      lastRenderedCodeRef.current = code
      lastRenderedThemeRef.current = isDark

      cleanupMermaidErrors()
    } catch (error) {
      if (currentRenderId !== renderIdRef.current) return

      const message =
        error instanceof Error ? error.message : "Failed to render diagram"

      cleanupMermaidErrors()

      setRenderState({ status: "error", message })
    }
  }, [code, isDark])

  const renderDiagram = useCallback(() => {
    if (code.trim().length < 10) {
      setRenderState({ status: "idle" })
      return
    }

    const hasUnclosed = (str: string, open: string, close: string) => {
      const opens = (str.match(new RegExp(`\\${open}`, "g")) || []).length
      const closes = (str.match(new RegExp(`\\${close}`, "g")) || []).length
      return opens > closes
    }

    const looksIncomplete =
      hasUnclosed(code, "[", "]") ||
      hasUnclosed(code, "{", "}") ||
      hasUnclosed(code, "(", ")") ||
      (code.match(/"/g) || []).length % 2 !== 0

    if (looksIncomplete) {
      setRenderState({ status: "parsing" })
      return
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    setRenderState({ status: "parsing" })

    debounceTimeoutRef.current = setTimeout(() => {
      doRender()
    }, RENDER_DEBOUNCE_MS)
  }, [code, doRender])

  useEffect(() => {
    const cacheKey = `${code}-${isDark ? "dark" : "light"}`
    const cached = mermaidCache.get(cacheKey)
    if (cached) {
      setRenderState({ status: "success", svg: cached })
      lastRenderedCodeRef.current = code
      lastRenderedThemeRef.current = isDark
      return
    }

    if (code === lastRenderedCodeRef.current && isDark === lastRenderedThemeRef.current) {
      return
    }
    renderDiagram()
  }, [code, isDark, renderDiagram])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      cleanupMermaidErrors()
    }
  }, [])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  const handleDownload = useCallback(async () => {
    if (renderState.status !== "success") return
    const blob = new Blob([renderState.svg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "diagram.svg"
    a.click()
    URL.revokeObjectURL(url)
  }, [renderState])

  return (
    <div className="relative mt-2 mb-4 rounded-[10px] bg-muted/50 overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-[6px] right-[6px] flex gap-1 z-2">
        <button
          onClick={handleCopy}
          tabIndex={-1}
          className="p-1"
          title={copied ? "Copied!" : "Copy code"}
        >
          <div className="relative w-3.5 h-3.5">
            <Copy
              className={cn(
                "absolute inset-0 w-3 h-3 text-muted-foreground transition-[opacity,transform] duration-200 ease-out hover:text-foreground",
                copied ? "opacity-0 scale-50" : "opacity-100 scale-100",
              )}
            />
            <Check
              className={cn(
                "absolute inset-0 w-3 h-3 text-muted-foreground transition-[opacity,transform] duration-200 ease-out",
                copied ? "opacity-100 scale-100" : "opacity-0 scale-50",
              )}
            />
          </div>
        </button>
        {renderState.status === "success" && (
          <button
            onClick={handleDownload}
            tabIndex={-1}
            className="p-1"
            title="Download SVG"
          >
            <Download className="w-3 h-3 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 min-h-[60px] flex items-center justify-center">
        {renderState.status === "idle" && (
          <div className="text-muted-foreground text-sm">Waiting for diagram...</div>
        )}

        {(renderState.status === "loading" || renderState.status === "parsing") && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Creating diagram...</span>
          </div>
        )}

        {renderState.status === "success" && (
          <div
            className={cn(
              "mermaid-diagram w-full overflow-x-auto",
              "[&_svg]:max-w-full [&_svg]:h-auto [&_svg]:mx-auto",
            )}
            dangerouslySetInnerHTML={{ __html: renderState.svg }}
          />
        )}

        {renderState.status === "error" && (
          <div className="w-full">
            <div className="flex items-start gap-2 text-destructive text-sm mb-3">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="wrap-break-words">{renderState.message}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={renderDiagram}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-muted hover:bg-accent transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            </div>
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Show diagram code
              </summary>
              <pre className="mt-2 p-2 rounded bg-muted text-xs overflow-x-auto whitespace-pre-wrap wrap-break-words font-mono">
                {code}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  )
})

function looksComplete(code: string): boolean {
  if (code.trim().length < 20) return false

  const count = (str: string, char: string) => (str.match(new RegExp(`\\${char}`, "g")) || []).length
  if (count(code, "[") > count(code, "]")) return false
  if (count(code, "{") > count(code, "}")) return false
  if (count(code, "(") > count(code, ")")) return false

  const trimmed = code.trim()
  if (trimmed.endsWith("--") || trimmed.endsWith("->") || trimmed.endsWith("->>")) return false
  if (trimmed.endsWith(":")) return false

  return true
}

function getBlockId(code: string): string {
  const firstLine = code.split("\n")[0] || ""
  return firstLine.slice(0, 50)
}

export function MermaidBlock({ code, isStreaming = false }: MermaidBlockProps) {
  const blockId = getBlockId(code)
  const codeComplete = looksComplete(code)

  useEffect(() => {
    if (!isStreaming && codeComplete) {
      finishedStreamingBlocks.add(blockId)
    }
  }, [isStreaming, blockId, codeComplete])

  const hasFinishedBefore = finishedStreamingBlocks.has(blockId)

  if (isStreaming && !hasFinishedBefore && !codeComplete) {
    return <StreamingPlaceholder />
  }

  return <MermaidBlockInner code={code} />
}

MermaidBlock.displayName = "MermaidBlock"
