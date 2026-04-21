import React, { useEffect, useState } from "react";
import { getPreferredTheme, ThemeMode, toggleTheme } from "../lib/theme";

const ThemeToggle: React.FC = () => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
      return "dark";
    }
    return getPreferredTheme();
  });

  useEffect(() => {
    const sync = () => {
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    };
    window.addEventListener("themechange", sync as EventListener);
    return () => window.removeEventListener("themechange", sync as EventListener);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setMode(toggleTheme())}
      className="fixed bottom-6 left-6 z-[70] h-12 w-12 rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 pointer-events-auto"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mode === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="material-icons-outlined text-[22px]">
        {mode === "dark" ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
};

export default ThemeToggle;
