import * as shiki from "shiki"

/**
 * Shared Shiki highlighter instance
 */
let highlighterPromise: Promise<shiki.Highlighter> | null = null

// LRU Cache for highlight results
const HIGHLIGHT_CACHE_MAX_SIZE = 500

class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    this.cache.delete(key)
    this.cache.set(key, value)
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
  }
}

const highlightCache = new LRUCache<string, string>(HIGHLIGHT_CACHE_MAX_SIZE)

const SUPPORTED_LANGUAGES: shiki.BundledLanguage[] = [
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "html",
  "css",
  "json",
  "python",
  "go",
  "rust",
  "bash",
  "markdown",
]

const DEFAULT_THEMES: shiki.BundledTheme[] = [
  "github-dark",
  "github-light",
]

/**
 * Get or create the Shiki highlighter instance
 */
export async function getHighlighter(): Promise<shiki.Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = shiki.createHighlighter({
      themes: DEFAULT_THEMES,
      langs: SUPPORTED_LANGUAGES,
    })
  }
  return highlighterPromise
}

/**
 * Highlight code with a specific theme.
 * Results are cached to prevent re-highlighting.
 */
export async function highlightCode(
  code: string,
  language: string,
  themeId: string,
): Promise<string> {
  const cacheKey = `${themeId}:${language}:${code}`
  const cached = highlightCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const highlighter = await getHighlighter()

  // Resolve theme - fall back to github-dark/light if not a bundled theme
  const loadedThemes = highlighter.getLoadedThemes()
  const theme = loadedThemes.includes(themeId as any)
    ? themeId
    : themeId.includes("light")
      ? "github-light"
      : "github-dark"

  const loadedLangs = highlighter.getLoadedLanguages()
  const lang = loadedLangs.includes(language as shiki.BundledLanguage)
    ? (language as shiki.BundledLanguage)
    : "plaintext"

  const html = highlighter.codeToHtml(code, {
    lang,
    theme: theme as shiki.BundledTheme,
  })

  // Extract just the code content from shiki's output (remove wrapper)
  const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)
  const result = match?.[1] ?? code

  highlightCache.set(cacheKey, result)

  return result
}
