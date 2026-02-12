import { createContext, useContext, useState, useEffect } from "react";

type ThemeMode = "light" | "dark" | "auto";
type Theme = "light" | "dark";

function getAutoTheme(): Theme {
  const hour = new Date().getHours();
  return (hour >= 6 && hour < 18) ? "light" : "dark";
}

const ThemeContext = createContext<{
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}>({ theme: "dark", themeMode: "dark", setThemeMode: () => {}, toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ruangluka-theme-mode") as ThemeMode) || "dark";
    }
    return "dark";
  });

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const savedMode = (localStorage.getItem("ruangluka-theme-mode") as ThemeMode) || "dark";
      if (savedMode === "auto") return getAutoTheme();
      return savedMode as Theme;
    }
    return "dark";
  });

  useEffect(() => {
    if (themeMode === "auto") {
      setTheme(getAutoTheme());
      const interval = setInterval(() => {
        setTheme(getAutoTheme());
      }, 60000);
      return () => clearInterval(interval);
    } else {
      setTheme(themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("ruangluka-theme-mode", mode);
  };

  const toggleTheme = () => {
    const modes: ThemeMode[] = ["light", "dark", "auto"];
    const currentIdx = modes.indexOf(themeMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    setThemeMode(nextMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
