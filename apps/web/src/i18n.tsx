import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'es' | 'en';
const KEY = 'botmef.lang';

const dict = {
  es: {
    title: 'Iniciar sesión',
    subtitle: 'Accede a tu cuenta de botmef',
    tenant: 'ID de organización',
    email: 'Correo electrónico',
    password: 'Contraseña',
    submit: 'Entrar',
    submitting: 'Entrando…',
    invalid: 'Credenciales inválidas',
    error: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    ok: 'Sesión iniciada',
    language: 'Idioma',
    themeLight: 'Tema claro',
    themeDark: 'Tema oscuro',
  },
  en: {
    title: 'Sign in',
    subtitle: 'Access your botmef account',
    tenant: 'Organization ID',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    invalid: 'Invalid credentials',
    error: 'Could not sign in. Please try again.',
    ok: 'Signed in',
    language: 'Language',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
  },
} as const;

export type Key = keyof (typeof dict)['es'];

// Default ES explícito: no se lee Accept-Language ni navigator.language.
function initial(): Lang {
  const saved = localStorage.getItem(KEY);
  return saved === 'en' || saved === 'es' ? saved : 'es';
}

const Ctx = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: Key) => string;
}>(null as never);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>(initial);
  const setLang = (l: Lang) => {
    localStorage.setItem(KEY, l);
    set(l);
  };
  document.documentElement.lang = lang;
  return (
    <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>
      {children}
    </Ctx.Provider>
  );
}

export const useI18n = () => useContext(Ctx);
