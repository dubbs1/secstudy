// Loaded in <head>, before the page draws: applies a saved Light or Dark choice so the page never
// flashes the other theme while the rest of the scripts load. app.js keeps it in sync afterwards.
try {
  const t = JSON.parse(localStorage.getItem('awsCourse1') || '{}').theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) { /* no saved choice, or storage blocked: follow the system */ }
