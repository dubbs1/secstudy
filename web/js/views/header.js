/* ---------- header ---------- */
const THEME_LABEL = {system:'System', light:'Light', dark:'Dark'};
function renderTop(){
  const done = LESSONS.filter(l => S.done[l.id]).length;
  const right = QUESTIONS.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
  const labsDone = LABS.filter(l => (S.labs[l.id] || []).filter(Boolean).length === l.steps.length).length;
  const left = daysUntil(EXAM.date);
  const examTxt = left > 1 ? `${left} days to go` : left === 1 ? 'tomorrow' : left === 0 ? 'today' : 'done';
  const pct = Math.round((done / LESSONS.length * 0.6 + right / QUESTIONS.length * 0.3 + labsDone / LABS.length * 0.1) * 100);
  const t = timerLeft();
  $('#top').innerHTML = `
    <div class="top-row"><div><h1>AWS Cloud Practitioner</h1>
    <div class="sub">${EXAM.code} · exam ${fmtDateYear(EXAM.date)} · ${examTxt}</div></div>
    <button class="theme" data-act="theme" aria-label="Theme: ${THEME_LABEL[S.theme]}. Change theme">Theme: ${THEME_LABEL[S.theme]}</button></div>
    <div class="bar" title="${pct}% overall"><i style="width:${pct}%"></i></div>
    <div class="stats">
      <span class="stat">Lessons <b>${done}/${LESSONS.length}</b></span>
      <span class="stat">Questions right <b>${right}/${QUESTIONS.length}</b></span>
      <span class="stat">Labs <b>${labsDone}/${LABS.length}</b></span>
      ${dueNow().length ? `<span class="stat timer">Review due <b style="color:inherit">${dueNow().length}</b></span>` : ''}
      ${S.timer.end || S.timer.left != null ? `<span class="stat timer" id="miniClock">⏱ ${mmss(t)}</span>` : ''}
    </div>`;
}
