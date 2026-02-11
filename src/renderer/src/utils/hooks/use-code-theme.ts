import { useTheme } from "../../hooks/use-theme"

/**
 * Hook to get the current code theme based on UI theme.
 * Returns the appropriate Shiki bundled theme ID for light or dark mode.
 */
export function useCodeTheme(): string {
  const { theme } = useTheme()
  return theme === "light" ? "github-light" : "github-dark"
}
