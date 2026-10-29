/* ---------- Timer ---------- */
let tick = null, audio = null;
function timerLeft(){
  const T = S.timer;
  if (T.end) return Math.max(0, T.end - Date.now());
  if (T.left != null) return T.left;
  return T.len * 60000;
}
function mmss(ms){ const s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
function suggestTask(){
  const l = nextLesson(); if (!l) return 'Practice: questions not right yet';
  const st = S.steps[l.id] || []; const i = l.steps.findIndex((s, k) => !st[k]);
  return `Lesson ${lessonNo(l.id)}: ` + (i < 0 ? 'finish the quiz' : l.steps[i].replace(/ \(\d+ min\)$/, ''));
}
function renderTimer(){
  const T = S.timer, ms = timerLeft(), running = !!T.end, pct = 100 - ms / (T.len * 600);
  return `<div class="card"><div class="body" style="padding-top:16px">
    <div class="seg small" role="tablist">
      <button data-act="tLen" data-v="15" aria-selected="${T.len === 15}">15 min focus</button>
      <button data-act="tLen" data-v="5" aria-selected="${T.len === 5}">5 min</button></div>
    <div class="clock" id="clock" aria-live="off">${mmss(ms)}</div>
    <div class="ring"><i id="ring" style="width:${pct}%"></i></div>
    <label class="muted" style="font-size:13px" for="task">Working on</label>
    <input class="field" id="task" maxlength="120" value="${esc(T.task || '')}" placeholder="${esc(suggestTask())}">
    <div class="btns" style="justify-content:center">
      <button class="btn" data-act="tGo" style="min-width:120px">${running ? 'Pause' : (T.left != null ? 'Resume' : 'Start')}</button>
      <button class="btn ghost" data-act="tReset">Reset</button></div>
        </div></div>`;
}
function startTick(){
  clearInterval(tick);
  if (!S.timer.end) return;
  tick = setInterval(() => {
    const ms = timerLeft();
    const c = $('#clock'); if (c) c.textContent = mmss(ms);
    const r = $('#ring'); if (r) r.style.width = (100 - ms / (S.timer.len * 600)) + '%';
    const m = $('#miniClock'); if (m) m.textContent = '⏱ ' + mmss(ms);
    if (ms <= 0) finishTimer();
  }, 250);
}
function finishTimer(){
  clearInterval(tick);
  S.timer.end = null; S.timer.left = null; save();
  beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  toast("Time's up");
  render();
}
function beep(){
  try {
    const ctx = audio || new (window.AudioContext || window.webkitAudioContext)(); audio = ctx;
    [0, 0.35, 0.7].forEach(t => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
    });
  } catch(e) {}
}
