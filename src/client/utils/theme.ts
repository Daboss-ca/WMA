export type Theme = 'light' | 'dark';
import { isAuthenticated } from '../state/sessionManager.js';

const THEME_KEY = 'wma_theme_preference';

/**
 * Gets the current active theme from localStorage or system preference.
 */
export function getInitialTheme(): Theme {
  if (!isAuthenticated()) return 'light';

  const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
  if (savedTheme) {
    return savedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Applies the specified theme to the document root element.
 */
export function applyTheme(theme: Theme): void {
  if (!isAuthenticated()) theme = 'light';

  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

/**
 * Toggles between light and dark themes.
 */
export function toggleTheme(): Theme {
  const currentTheme = (document.documentElement.getAttribute('data-theme') as Theme) || 'light';
  const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  return newTheme;
}

/**
 * Initializes the theme settings on initial page load.
 */
export function initTheme(): void {
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);
}