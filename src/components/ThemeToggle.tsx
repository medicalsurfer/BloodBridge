"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "bb-theme";

const THEME_EVENT = "bb-theme-change";

/**
 * Applies a theme by stamping data-theme on <html>, which is what the dark
 * palette in globals.css keys off. "system" follows the operating system.
 */
export function applyTheme(theme: Theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  document.documentElement.dataset.theme = resolved;
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function storedTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Blocked storage just means the choice lasts for this page only.
  }

  /*
    The cookie is what actually themes the next page load: the server reads it
    and renders data-theme on <html>, so the attribute is part of the markup
    React hydrates rather than something a script adds afterwards (which
    hydration strips). Visitors who have chosen nothing fall back to the
    prefers-color-scheme arm in globals.css.
  */
  document.cookie =
    theme === "system"
      ? `${THEME_STORAGE_KEY}=; path=/; max-age=0; samesite=lax`
      : `${THEME_STORAGE_KEY}=${theme}; path=/; max-age=31536000; samesite=lax`;

  applyTheme(theme);
}

/*
  The live theme is read from the page rather than mirrored into React state.
  When the visitor has chosen one, the server rendered data-theme on <html>;
  with no choice the stylesheet follows the system, so that is what the toggle
  reports too.
*/
function isDarkNow() {
  const chosen = document.documentElement.dataset.theme;

  if (chosen === "dark") return true;
  if (chosen === "light") return false;

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (storedTheme() === "system") applyTheme("system");
    onChange();
  };

  window.addEventListener(THEME_EVENT, onChange);
  media.addEventListener("change", onSystemChange);

  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    media.removeEventListener("change", onSystemChange);
  };
}

export function useIsDark() {
  return useSyncExternalStore(subscribe, isDarkNow, () => false);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const isDark = useIsDark();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
      aria-label={label}
      aria-pressed={isDark}
      className={className}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
    </svg>
  );
}
