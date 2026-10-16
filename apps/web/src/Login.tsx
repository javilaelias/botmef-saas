import { useState, type FormEvent } from 'react';
import { useI18n } from './i18n';
import { useTheme } from './theme';

const input =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 ' +
  'focus:outline-2 focus:outline-emerald-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

type Msg = { ok: boolean; text: 'ok' | 'invalid' | 'error' };

export function Login() {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantId: f.get('tenantId'),
          email: f.get('email'),
          password: f.get('password'),
        }),
      });
      if (res.ok) {
        const { accessToken } = await res.json();
        sessionStorage.setItem('botmef.token', accessToken);
        setMsg({ ok: true, text: 'ok' });
      } else {
        setMsg({ ok: false, text: res.status === 401 ? 'invalid' : 'error' });
      }
    } catch {
      setMsg({ ok: false, text: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex justify-end gap-2 p-4">
        <select
          aria-label={t('language')}
          value={lang}
          onChange={(e) => setLang(e.target.value as 'es' | 'en')}
          className={input + ' !w-auto'}
        >
          <option value="es">ES</option>
          <option value="en">EN</option>
        </select>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? t('themeLight') : t('themeDark')}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-600"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
      <form
        onSubmit={submit}
        className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow dark:bg-slate-800"
      >
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t('subtitle')}
        </p>
        <label className="flex flex-col gap-1 text-sm">
          {t('tenant')}
          <input name="tenantId" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('email')}
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('password')}
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={input}
          />
        </label>
        <button
          disabled={busy}
          className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {busy ? t('submitting') : t('submit')}
        </button>
        {msg && (
          <p
            role="status"
            className={
              msg.ok
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            }
          >
            {t(msg.text)}
          </p>
        )}
      </form>
    </main>
  );
}
