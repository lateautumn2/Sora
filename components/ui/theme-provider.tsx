"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme | null;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function storedTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      const saved = storedTheme();
      const current = saved ?? systemTheme();
      applyTheme(current);
      setTheme(current);
    };

    syncTheme();

    // 首次主题同步完成后再启用颜色过渡，避免刷新时把 light → dark 的初始化过程展示出来。
    const readyFrame = window.requestAnimationFrame(() => {
      document.documentElement.dataset.themeReady = "true";
    });
    const handleSystemThemeChange = () => syncTheme();
    media.addEventListener("change", handleSystemThemeChange);
    return () => {
      window.cancelAnimationFrame(readyFrame);
      media.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next = (theme ?? document.documentElement.dataset.theme) === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 隐私模式禁用 localStorage 时仍允许当前页面切换主题。
    }
    const updateTheme = () => {
      applyTheme(next);
      setTheme(next);
    };
    if (document.startViewTransition) {
      const root = document.documentElement;
      root.dataset.themeTransitioning = "true";
      const transition = document.startViewTransition(updateTheme);
      const clearTransitionState = () => {
        delete root.dataset.themeTransitioning;
      };
      transition.finished.then(clearTransitionState, clearTransitionState);
    } else {
      updateTheme();
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeToggle must be used within ThemeProvider");

  const { theme, toggleTheme } = context;
  const isDark = theme === "dark";
  const label = theme === null ? "切换主题" : isDark ? "切换到浅色模式" : "切换到暗色模式";
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    document.documentElement.style.setProperty(
      "--theme-toggle-x",
      `${bounds.left + bounds.width / 2}px`,
    );
    document.documentElement.style.setProperty(
      "--theme-toggle-y",
      `${bounds.top + bounds.height / 2}px`,
    );
    toggleTheme();
  }

  return (
    <button
      aria-label={label}
      className="theme-toggle"
      onClick={handleClick}
      title={label}
      type="button"
    >
      {isDark ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
    </button>
  );
}
