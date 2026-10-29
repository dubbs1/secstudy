// Render loop, events, startup.

/* ---------- render ---------- */
let reveal = null;     // selector of a card row to bring into view after the next render
let announceNext = false;   // read the answer feedback to screen readers after the next render
let focusTo = null;    // selector to focus after the next render, when an action names one
let lastScore = '', tapSaid = '';   // which game's final score has been read out (lesson and run)
let lessonFrom = null; // the tab a lesson was opened from, so Back can return there
let labFromLesson = false;   // the lab was opened from a lesson: Back returns to the lesson

// A selector that finds "the same control" again after the page is rebuilt.
function controlKey(el){
  if (!el || el === document.body || !el.closest('#top, #main, #focusPanel')) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  const keys = ['act', 'id', 'i', 'q', 'v', 'ctx'].filter(k => el.dataset[k] != null);
  return keys.length ? keys.map(k => `[data-${k}="${CSS.escape(el.dataset[k])}"]`).join('') : null;
}
function render(){
  const active = document.activeElement;
  const key = controlKey(active), answered = key && active.dataset.act === 'pick';
  applyTheme();
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  renderTop();
  const views = {today:renderToday, learn:renderLearn, practice:renderPractice, labs:renderLabs};
  $('#main').innerHTML = (views[S.tab] || renderToday)();
  renderTimerButton();
  startTick();
  // Keyboard users keep their place: the feedback after answering, else the same control, else (when it
  // went away, e.g. "Next question") the card just opened or the first answer on screen.
  const row = reveal && document.querySelector(reveal); reveal = null;
  const named = focusTo && document.querySelector(focusTo); focusTo = null;
  if (named) named.focus({preventScroll:true});
  else if (key) {
    const same = document.querySelector(answered ? '#main .fb' : key);
    // Fallbacks the user can see: Enter must never act on something below the screen.
    const visible = sel => { const el = $(sel); return el && onScreen(el) ? el : null; };
    const target = same && !same.disabled ? same
      : row || visible('#main .opt:not(:disabled)') || visible('#main .card.open .btn') || $('#main');
    target.focus({preventScroll:true});
  }
  if (announceNext) { announceNext = false; const fb = $('#main .fb'); if (fb) announce(fb.innerText); }
  const score = $('#main .game-score');
  // The last tap's feedback and the score are read together, so the score never cuts the feedback off.
  if (score && score.dataset.k !== lastScore) { lastScore = score.dataset.k; announce((tapSaid ? tapSaid + ' ' : '') + score.querySelector('b').textContent); }
  tapSaid = '';
  if (row) keepInView(row);
}
// Scroll only when the row is off screen, so opening a card never makes the page jump needlessly.
function onScreen(el){ const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
function keepInView(el){
  const r = el.getBoundingClientRect();
  if (r.top < 0 || r.top > innerHeight - 80) el.closest('.card').scrollIntoView({block:'start'});
}
function announce(msg){
  const a = $('#announce'); a.textContent = '';
  setTimeout(() => { a.textContent = msg; }, 50);   // a changed text is read; the same text twice is not
}
function applyTheme(){
  if (S.theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = S.theme;
}

/* ---------- the phone's Back button ---------- */
// One spare history entry sits on top of the page (the URL never changes). Back lands on the entry below it;
// the app then closes what is on screen and puts the spare entry back. Only from Today with nothing open
// does Back go on and leave. Close buttons never touch history, so double taps and tab switches are harmless.
try { history.scrollRestoration = 'manual'; } catch(e) {}
let backArmed = false;
function armBack(){   // on the first tap or key press: browsers skip entries added before any interaction
  if (backArmed) return;
  backArmed = true;
  try {
    if (!(history.state && history.state.secstudy === 'top')) {
      history.replaceState({secstudy:'base'}, '');
      history.pushState({secstudy:'top'}, '');
    }
  } catch(e) {}
}
window.addEventListener('pointerdown', armBack, {once:true, capture:true});
window.addEventListener('keydown', armBack, {once:true, capture:true});
// Closes one thing on the screen you are looking at. False when there is nothing left to close.
function backOneStep(){
  if (focusOpen) { focusOpen = false; focusTo = '#timerBtn'; }
  else if (S.tab === 'learn' && S.openLesson) {
    reveal = `[data-act=openLesson][data-id="${S.openLesson}"]`; S.openLesson = null;
    if (lessonFrom && lessonFrom !== 'learn') { S.tab = lessonFrom; reveal = null; }   // opened from a lab or Today: go back there
    lessonFrom = null;
  }
  else if (S.tab === 'labs' && labFromLesson && S.openLesson) { S.tab = 'learn'; reveal = '#lessonTop'; }
  else if (S.tab === 'today' && S.review) { S.review = null; reveal = '#nextUpBtn'; }
  else if (S.tab === 'learn' && flowUi.open) { reveal = `[data-act=domainFlow][data-id="${flowUi.open}"]`; flowUi.open = null; }
  else if (S.open) { S.open = null; }   // an expanded card (exam facts, weak spots, Free plan) folds first
  else if (S.tab !== 'today') { S.tab = 'today'; window.scrollTo(0, 0); }
  else return false;
  return true;
}
window.addEventListener('popstate', e => {
  if (!(e.state && e.state.secstudy === 'base')) return;   // not our entry
  if (backOneStep()) {
    save(); render();
    try { history.pushState({secstudy:'top'}, ''); } catch(err) {}
  } else {
    try { history.back(); } catch(err) {}   // nothing open: leave the app
  }
});

/* ---------- events ---------- */
// A tap outside the timer panel closes it (the tap still does what it was for).
document.addEventListener('pointerdown', e => {
  if (focusOpen && !e.target.closest('#focusPanel, #timerBtn')) { focusOpen = false; renderTimerButton(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && focusOpen) { focusOpen = false; renderTimerButton(); $('#timerBtn').focus(); }
});

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('#nav button');
  if (tabBtn) {
    labFromLesson = false;
    if (S.tab === 'learn' && tabBtn.dataset.tab === 'learn') { S.openLesson = null; lessonFrom = null; }   // Learn again: back to the list
    S.tab = tabBtn.dataset.tab; save(); render(); window.scrollTo(0, 0); return;
  }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
  const {act, id} = b.dataset;
  switch (act) {
    case 'toggleFacts': S.open = S.open === 'facts' ? null : 'facts'; if (S.open) reveal = '[data-act=toggleFacts]'; break;
    case 'toggleFree':  S.open = S.open === 'free' ? null : 'free'; if (S.open) reveal = '[data-act=toggleFree]'; break;
    case 'toggleWeak':  S.open = S.open === 'weak' ? null : 'weak'; if (S.open) reveal = '[data-act=toggleWeak]'; break;
    case 'goLesson':    S.stage[id] = 0;   // from Look up: start at Read, where the key point is
    // falls through
    case 'openLesson':
      if (!S.openLesson) lessonFrom = S.tab;   // where Back returns to
      S.tab = 'learn'; S.open = null; S.openLesson = id;
      reveal = '#lessonTop'; focusTo = '[data-act=stage][aria-current=step]'; break;
    case 'closeLesson': reveal = `[data-act=openLesson][data-id="${S.openLesson}"]`; S.openLesson = null; lessonFrom = null; break;
    // Moving through a lesson makes it the one Next up continues; only opening it does not.
    case 'stage':       S.current = id; S.stage[id] = +b.dataset.i; reveal = '#lessonTop'; focusTo = '[data-act=stage][aria-current=step]'; break;
    case 'stageNext':   S.current = id; S.stage[id] = Math.min((S.stage[id] || 0) + 1, STAGES.length - 1); reveal = '#lessonTop'; focusTo = '[data-act=stage][aria-current=step]'; break;
    case 'stagePrev':   S.current = id; S.stage[id] = Math.max((S.stage[id] || 0) - 1, 0); reveal = '#lessonTop'; focusTo = '[data-act=stage][aria-current=step]'; break;
    case 'reveal': {
      const sc = SCENARIOS[id][+b.dataset.i];
      revealed[id + ':' + b.dataset.i] = true; focusTo = `#ans-${id}-${b.dataset.i}`; announce(sc.answer + ' ' + sc.why);
      render(); return;   // nothing to save
    }
    case 'goLab':       labFromLesson = S.tab === 'learn' && !!S.openLesson; S.tab = 'labs'; S.open = null; S.openLab = id; reveal = `[data-act=openLab][data-id="${id}"]`; break;
    case 'goQuestion':  S.tab = 'practice'; S.pFilter = 'all'; S.pMode = 'all'; pCur = id; delete live['p:' + id]; window.scrollTo(0, 0); break;
    case 'goPractice':  S.tab = 'practice'; window.scrollTo(0, 0); break;
    case 'lessonTimer': case 'breakTimer': {
      const len = act === 'breakTimer' ? 5 : 15;
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
      S.timer = {...S.timer, len, end:Date.now() + len * 60000, left:null};
      toast(len === 5 ? '5 min break started. The timer is at the top right.' : '15 min timer started. It is at the top right.');
      break;
    }
    case 'openLab':     S.open = null; S.openLab = S.openLab === id ? null : id;
      if (S.openLab) reveal = `[data-act=openLab][data-id="${id}"]`; break;
    case 'pick': {
      const i = +b.dataset.i, qid = b.dataset.q, ctx = b.dataset.ctx;
      record(qid, i);
      if (ctx === 'l') { live[qid] = i; S.current = QUESTIONS.find(q => q.id === qid).l; } else live[ctx + ':' + qid] = i;
      if (ctx === 'r' && i === QUESTIONS.find(q => q.id === qid).a) S.review.right++;
      const lid = QUESTIONS.find(q => q.id === qid).l, qs = qsFor(lid);
      if (ctx === 'l' && qs.every(q => S.ans[q.id])) { const st = S.steps[lid] || []; st[LESSONS.find(l => l.id === lid).steps.length - 1] = true; S.steps[lid] = st; }
      announceNext = true; studied();
      break;
    }
    case 'lqNext': lqi[id]++; break;
    case 'lqRetry': delete live[b.dataset.q]; S.ans[b.dataset.q].pick = null; break;
    case 'done': {
      // Stay on Done: the tick, then the choice of next lesson, a break or the lab.
      S.done[id] = true; S.current = null; studied();
      announce(`Lesson done. ${LESSONS.filter(l => !S.done[l.id]).length} to go.`);
      focusTo = '.finish ~ .btns .btn'; break;
    }
    case 'pFilter': S.pFilter = b.dataset.v; pCur = null; break;
    case 'pMode':   S.pMode = b.dataset.v; pCur = null; break;
    case 'pNext': {
      const cur = pCur; delete live['p:' + cur];
      const set = practiceSet(), idx = QUESTIONS.findIndex(q => q.id === cur);
      const after = set.find(q => QUESTIONS.indexOf(q) > idx && q.id !== cur) || set.find(q => q.id !== cur);
      pCur = after ? after.id : null;
      break;
    }
    case 'undone':  S.done[id] = false; S.stage[id] = 0; S.current = id; reveal = '#lessonTop'; focusTo = '[data-act=stage][aria-current=step]'; break;
    case 'rvStart':
      S.review = {ids:dueNow().slice(0, REVIEW_MAX).map(q => q.id), i:0, right:0, started:Date.now()}; S.open = null;
      S.review.ids.forEach(q => delete live['r:' + q]); window.scrollTo(0, 0); break;
    case 'rvNext':  S.review.i++; break;
    case 'rvClose': S.review = null; reveal = '#nextUpBtn'; break;
    case 'pLesson': S.pFilter = id; S.pMode = 'all'; S.open = null; pCur = null; break;
    case 'labReset': S.labs[id] = []; break;
    case 'tLen': S.timer = {...S.timer, len:+b.dataset.v, end:null, left:null}; break;
    case 'tGo': {
      try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
      const T = S.timer;
      if (T.end) { T.left = Math.max(0, T.end - Date.now()); T.end = null; }
      else { T.end = Date.now() + (T.left != null ? T.left : T.len * 60000); T.left = null; }
      break;
    }
    case 'tReset': S.timer.end = null; S.timer.left = null; break;
    // practice: flip cards and diagram games (visit-only state; only today's study day is saved)
    case 'mode': ui.mode[id + ':' + b.dataset.i] = b.dataset.v; break;
    case 'flip': { const c = ui.cards[id]; c.flipped = !c.flipped; studied(); break; }
    case 'cardGot': case 'cardAgain': {
      const c = ui.cards[id];
      const card = c.order[c.pos], first = !c.again.includes(card);
      if (act === 'cardGot') { if (first) c.got++; } else { if (first) c.again.push(card); c.order.push(card); }
      c.pos++; c.flipped = false; focusTo = '.flipcard, .deck-done .btn'; break;
    }
    case 'cardsRestart': delete ui.cards[id]; focusTo = '.flipcard'; break;
    case 'gPick': {
      const g = gameQuestions(LESSONS.find(l => l.id === id)), q = g.qs[+b.dataset.i], v = +b.dataset.v;
      gameState({id}).picks[b.dataset.i] = v; studied();
      announce(v === q.answer ? 'Right.' : `Not quite. It is ${(q.opts || g.options)[q.answer]}.`);
      focusTo = '[data-act=gNext]'; break;
    }
    case 'gNext': { gameState({id}).cur++; focusTo = '.game .chipbtn:not(:disabled), .game-score .link'; break; }
    case 'gOrder': {
      const g = gameQuestions(LESSONS.find(l => l.id === id)), st = gameState({id}), it = g.items[+b.dataset.i];
      st.seq.push(+b.dataset.i); studied();
      announce(tapSaid = g.ranks[st.seq.length - 1] === it.rank ? `${it.text}: right.` : `${it.text}: not there. It goes at ${goesAt(g, st, +b.dataset.i)}.`);
      focusTo = '.game .chipbtn:not(:disabled), .game-score .link'; break;
    }
    // How it works: step through a flow, then put its steps in order
    case 'flowNext': case 'flowBack': {
      const f = FLOWS[id], at = Math.max(0, Math.min(f.rows.length - 1, flowAt(id) + (act === 'flowNext' ? 1 : -1)));
      flowUi.at[id] = at; studied();
      announce(`Step ${at + 1} of ${f.rows.length}. ${plain(f.rows[at].say)}`);
      focusTo = `[data-flow="${id}"] [data-act=${act}], [data-flow="${id}"] [data-act=flowOrder], [data-flow="${id}"] [data-act=flowNext]`; break;
    }
    case 'flowRestart': delete flowUi.order[id]; flowUi.at[id] = 0; focusTo = `[data-flow="${id}"] [data-act=flowNext]`; break;
    case 'flowOrder': flowUi.order[id] = {seq:[], run:++gameRuns}; focusTo = '.game .chipbtn'; break;
    case 'flowPick': {
      const g = flowGame(id), st = flowUi.order[id], it = g.items[+b.dataset.i];
      st.seq.push(+b.dataset.i); studied();
      tapSaid = g.ranks[st.seq.length - 1] === it.rank ? `${it.text}: right.` : `${it.text}: not there. It goes at ${goesAt(g, st, +b.dataset.i)}.`;
      if (st.seq.length < g.items.length) announce(tapSaid);   // the last tap is read out with the score
      focusTo = '.game .chipbtn:not(:disabled), .game-score + .flow-btns .btn'; break;
    }
    // What if: switch a part, or pick an option, and say what changed
    case 'simToggle': case 'simPick': {
      const before = SIMS[id].goals.map(g => simGoal(id, g));
      if (act === 'simToggle') { const on = simOn(id); on[b.dataset.v] = !on[b.dataset.v]; simUi.last = b.dataset.v; }
      else simUi.pick[id] = b.dataset.v;
      studied(); announce(simSay(id, before));
      focusTo = `[data-sim="${id}"] [data-v="${b.dataset.v}"]`; break;
    }
    case 'simWhy': { const i = +b.dataset.i; simUi.open[id] = simUi.open[id] === i ? null : i; focusTo = `[data-sim="${id}"] [data-act=simWhy][data-i="${i}"]`; break; }
    case 'domainFlow': flowUi.open = flowUi.open === id ? null : id; if (flowUi.open) { reveal = `[data-act=domainFlow][data-id="${id}"]`; studied(); } break;
    case 'gCol': {
      const c = VISUALS[id].cols[+b.dataset.i], v = +b.dataset.v;
      gameState({id}).cols[b.dataset.i] = v; studied();
      announce(tapSaid = v === c.you ? `${c.title}: right.` : `${c.title}: not quite. You manage the top ${c.you}.`);
      focusTo = '.who button.who-c, .game-score .link'; break;
    }
    case 'gameReset': delete ui.game[id]; focusTo = '.game .chipbtn, button.who-c'; break;
    case 'focusToggle': focusOpen = !focusOpen; focusTo = focusOpen ? '#focusPanel [data-act=tGo]' : '#timerBtn'; render(); return;
    case 'focusClose':  focusOpen = false; focusTo = '#timerBtn'; render(); return;
    case 'theme': S.theme = THEMES[(THEMES.indexOf(S.theme) + 1) % THEMES.length]; break;
    case 'export': exportProgress(); return;
    case 'import': $('#importFile').click(); return;
    case 'importYes': finishImport(true); lessonFrom = null; labFromLesson = false; render(); window.scrollTo(0, 0); $('#top h1').focus({preventScroll:true}); return;
    case 'importNo': finishImport(false); return;
    case 'install': if (installPrompt) { installPrompt.prompt(); installPrompt = null; $('#installWrap').hidden = true; } return;
    default: return;
  }
  save(); render();
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'step') {
    const st = S.steps[t.dataset.id] || []; st[+t.dataset.i] = t.checked; S.steps[t.dataset.id] = st;
    S.current = t.dataset.id; studied(); save(); render();
  } else if (t.dataset.act === 'labStep') {
    const st = S.labs[t.dataset.id] || []; st[+t.dataset.i] = t.checked; S.labs[t.dataset.id] = st;
    studied(); save(); render();
    if (st.filter(Boolean).length === LABS.find(l => l.id === t.dataset.id).steps.length) toast('Lab complete');
  } else if (t.id === 'importFile' && t.files[0]) {
    readImport(t.files[0]); t.value = '';
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'task') { S.timer.task = e.target.value; save(); }
  // Look up redraws only its results, so the box keeps focus and the cursor stays put.
  if (e.target.id === 'lookup') { lookupQ = e.target.value; $('#lookupResults').innerHTML = lookupHTML(lookupQ); }
});
window.addEventListener('visibilitychange', () => { if (!document.hidden && S.timer.end && timerLeft() <= 0) finishTimer(); });

/* ---------- installable app (only when served over https, or localhost for tests) ---------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#installWrap').hidden = false; });
window.addEventListener('appinstalled', () => { $('#installWrap').hidden = true; });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

/* ---------- start ---------- */
S = load();
$('#ver').textContent = 'Version ' + APP_VERSION;
render();
