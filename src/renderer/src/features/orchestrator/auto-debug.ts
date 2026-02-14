/**
 * Builds an auto-debug message to send back to Claude when compilation fails.
 */
export function buildAutoDebugMessage(
  error: string,
  attempt: number,
  maxAttempts: number,
): string {
  return [
    `The code failed to compile (attempt ${attempt}/${maxAttempts}):`,
    "",
    "```",
    error.trim(),
    "```",
    "",
    "Please fix the code. Output ONLY the corrected code in a single ```arduino code block.",
  ].join("\n")
}
