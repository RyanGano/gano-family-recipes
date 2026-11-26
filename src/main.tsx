import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Links opened from another browser (see VoiceHelp "Open in Chrome") carry the
// route as ?go=#/recipe/…; move it back into the hash.
const params = new URLSearchParams(window.location.search);
const goTo = params.get('go');
if (goTo?.startsWith('#/')) {
  window.history.replaceState(null, '', `${window.location.pathname}${goTo}`);
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
