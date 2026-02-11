import { createContext, useContext } from "react";

type Theme = "light" | "dark";

export const ThemeContext = createContext<{ theme: Theme }>({ theme: "light" });

export function useTheme() {
  return useContext(ThemeContext);
}
