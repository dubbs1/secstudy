/* ---------- header ---------- */
const THEME_LABEL = {system:'System', light:'Light', dark:'Dark'};
// Small drawn icons: the symbol characters for these are missing from many fonts.
const svg = d => `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">${d}</svg>`;
const THEME_ICON = {
  system:svg('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor"/>'),
  light:svg('<circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  dark:svg('<path d="M13.5 10A6 6 0 1 1 6 2.5a4.8 4.8 0 0 0 7.5 7.5z" fill="currentColor"/>')
};
function renderTop(){
  const done = LESSONS.filter(l => S.done[l.id]).length;
  const right = QUESTIONS.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
  const labsDone = LABS.filter(l => (S.labs[l.id] || []).filter(Boolean).length === l.steps.length).length;
  const left = daysUntil(EXAM.date);
  const examTxt = left > 1 ? `${left} days to go` : left === 1 ? 'tomorrow' : left === 0 ? 'today' : 'done';
  const pct = Math.round((done / LESSONS.length * 0.6 + right / QUESTIONS.length * 0.3 + labsDone / LABS.length * 0.1) * 100);
  const t = timerLeft();
  $('#top').innerHTML = `
    <div class="top-row"><div><h1 tabindex="-1">AWS Cloud Practitioner</h1>
    <div class="sub">${EXAM.code} · <span class="nw">exam ${fmtDayYear(EXAM.date)}</span> · <span class="nw">${examTxt}</span></div></div>
    <button class="theme" data-act="theme" aria-label="Theme: ${THEME_LABEL[S.theme]}. Change theme">${THEME_ICON[S.theme]}${THEME_LABEL[S.theme]}</button></div>
    <div class="bar" title="${pct}% overall"><i style="width:${pct}%"></i></div>
    <div class="stats">
      <span class="stat">Lessons <b>${done}/${LESSONS.length}</b></span>
      <span class="stat">Questions right <b>${right}/${QUESTIONS.length}</b></span>
      <span class="stat">Labs <b>${labsDone}/${LABS.length}</b></span>
      ${dueNow().length ? `<span class="stat timer">Review due <b style="color:inherit">${dueNow().length}</b></span>` : ''}
      ${S.timer.end || S.timer.left != null ? `<span class="stat timer" id="miniClock">⏱ ${mmss(t)}</span>` : ''}
    </div>`;
}
