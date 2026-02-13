export interface CodeBlock {
  language: string
  code: string
}

/**
 * Extract the first fenced code block from markdown content.
 * Handles both complete (```lang...```) and incomplete/streaming (```lang...) blocks.
 */
export function extractCodeBlock(content: string): CodeBlock | null {
  // Match opening fence with optional language
  const openFenceMatch = content.match(/```(\w+)?\s*\n/)
  if (!openFenceMatch) return null

  const language = openFenceMatch[1] ?? "plaintext"
  const startIndex = openFenceMatch.index! + openFenceMatch[0].length

  // Look for closing fence
  const closingIndex = content.indexOf("\n```", startIndex)

  const code =
    closingIndex !== -1
      ? content.slice(startIndex, closingIndex)
      : content.slice(startIndex) // streaming — no closing fence yet

  // Don't return empty or whitespace-only blocks
  if (!code.trim()) return null

  return { language, code }
}
