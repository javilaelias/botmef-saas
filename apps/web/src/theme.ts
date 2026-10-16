import { useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'botmef.theme';

// Default = prefers-color-scheme; la elección guardada del usuario prevalece.
function resolve(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

const apply = (t: Theme) =>
  document.documentElement.classList.toggle('dark', t === 'dark');

// Se llama antes del primer render para evitar el parpadeo de tema.
export const initTheme = () => apply(resolve());

export function useTheme() {
  const [theme, set] = useState<Theme>(resolve);
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
    set(next);
  };
  return { theme, toggle };
}
