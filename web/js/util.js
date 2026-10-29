// DOM and date helpers.
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayISO = () => isoOf(new Date());
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return isoOf(d); };
const fmtDate = s => parseISO(s).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
const fmtDayYear = s => parseISO(s).toLocaleDateString(undefined, {day:'numeric', month:'short', year:'numeric'});
const fmtDateYear = s => parseISO(s).toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short', year:'numeric'});
const daysUntil = s => Math.round((parseISO(s) - parseISO(todayISO())) / 864e5);
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function toast(msg){
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
}
