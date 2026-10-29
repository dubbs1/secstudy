// Render loop, events, startup.
/* ---------- render + events ---------- */
function render(){
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  renderTop();
  const views = {learn:renderLearn, practice:renderPractice, labs:renderLabs, timer:renderTimer};
  $('#main').innerHTML = (views[S.tab] || renderLearn)();
  startTick();
}
function scrollToOpen(){
  const el = document.querySelector('.card.open'); if (el) el.scrollIntoView({block:'nearest', behavior:'smooth'});
}

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('#nav button');
  if (tabBtn) { S.tab = tabBtn.dataset.tab; save(); render(); window.scrollTo(0, 0); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
  const {act, id} = b.dataset;
  switch (act) {
    case 'toggleFacts': S.open = S.open === 'facts' ? null : 'facts'; S.openLesson = S.open ? '' : null; break;
    case 'toggleFree':  S.open = S.open === 'free' ? null : 'free'; break;
    case 'openLesson':  S.open = null; S.openLesson = S.openLesson === id ? '' : id; break;
    case 'openLab':     S.open = null; S.openLab = S.openLab === id ? null : id; break;
    case 'pick': {
      const i = +b.dataset.i, qid = b.dataset.q, ctx = b.dataset.ctx;
      record(qid, i);
      if (ctx === 'l') live[qid] = i; else live[ctx + ':' + qid] = i;
      if (ctx === 'r' && i === QUESTIONS.find(q => q.id === qid).a) S.review.right++;
      const lid = QUESTIONS.find(q => q.id === qid).l, qs = qsFor(lid);
      if (ctx === 'l' && qs.every(q => S.ans[q.id])) { const st = S.steps[lid] || []; st[LESSONS.find(l => l.id === lid).steps.length - 1] = true; S.steps[lid] = st; }
      break;
    }
    case 'lqNext': lqi[id]++; break;
    case 'lqRetry': delete live[b.dataset.q]; S.ans[b.dataset.q].pick = null; break;
    case 'done': {
      S.done[id] = !S.done[id];
      if (S.done[id]) { const n = nextLesson(); S.openLesson = n ? n.id : ''; toast('Lesson done'); setTimeout(scrollToOpen, 50); }
      break;
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
    case 'rvStart': S.review = {ids:dueNow().slice(0, REVIEW_MAX).map(q => q.id), i:0, right:0}; S.open = null;
      S.review.ids.forEach(q => delete live['r:' + q]); window.scrollTo(0, 0); break;
    case 'rvNext':  S.review.i++; break;
    case 'rvClose': S.review = null; S.openLesson = null; break;
    case 'toggleWeak': S.open = S.open === 'weak' ? null : 'weak'; break;
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
    case 'export': exportProgress(); return;
    case 'import': $('#importFile').click(); return;
    case 'install': if (installPrompt) { installPrompt.prompt(); installPrompt = null; $('#installWrap').hidden = true; } return;
    default: return;
  }
  save(); render();
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'step') {
    const st = S.steps[t.dataset.id] || []; st[+t.dataset.i] = t.checked; S.steps[t.dataset.id] = st;
    save(); render();
  } else if (t.dataset.act === 'labStep') {
    const st = S.labs[t.dataset.id] || []; st[+t.dataset.i] = t.checked; S.labs[t.dataset.id] = st;
    save(); render();
    if (st.filter(Boolean).length === LABS.find(l => l.id === t.dataset.id).steps.length) toast('Lab complete');
  } else if (t.id === 'importFile' && t.files[0]) {
    importProgress(t.files[0]); t.value = '';
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'task') { S.timer.task = e.target.value; save(); }
});

window.addEventListener('visibilitychange', () => { if (!document.hidden && S.timer.end && timerLeft() <= 0) finishTimer(); });
/* ---------- installable app (only when served over https, or localhost for tests) ---------- */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#installWrap').hidden = false; });
window.addEventListener('appinstalled', () => { $('#installWrap').hidden = true; });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

S = load();
render();
