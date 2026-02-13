const TOOL_CALL_KEYWORDS = [
  "code",
  "function",
  "typescript",
  "javascript",
  "react",
  "hook",
  "python",
  "script",
  "file",
  "edit",
  "component",
  "class",
]

const CANVAS_LANGUAGES = new Set([
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "python",
  "go",
  "rust",
  "html",
  "css",
  "json",
])

/** Check if a user message contains tool-call keywords. */
export function isToolCallMessage(content: string): boolean {
  const lower = content.toLowerCase()
  return TOOL_CALL_KEYWORDS.some((kw) => lower.includes(kw))
}

/** Check if a language is eligible for canvas display. */
export function isCanvasLanguage(lang: string): boolean {
  return CANVAS_LANGUAGES.has(lang.toLowerCase())
}
