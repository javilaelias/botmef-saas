import { createRoot } from 'react-dom/client';
import './index.css';
import { I18nProvider } from './i18n';
import { Login } from './Login';
import { initTheme } from './theme';

initTheme();
createRoot(document.getElementById('root')!).render(
  <I18nProvider>
    <Login />
  </I18nProvider>,
);
