// Saved progress: localStorage key awsCourse1. load() is the only way data gets in.
const KEY = 'awsCourse1';
const THEMES = ['system', 'light', 'dark'];
const TABS = ['today', 'learn', 'practice', 'labs', 'more'];   // a Timer tab saved by an older version opens Today
const PREFS = {text:'m', motion:'system', calm:false, speak:true, extra:false};
const DEFAULTS = {done:{}, steps:{}, ans:{}, labs:{}, srs:{}, stage:{}, days:{}, current:null, review:null, tab:'today', openLesson:null, openLab:null, open:null, pFilter:'all', pMode:'todo', theme:'system', timer:{len:15, end:null, left:null, task:''},
  mock:null, mocks:{}, check:{}, guess:{}, plan:'', prefs:{...PREFS}, sims:{}};
let S;   // loaded just before the first render, once the helpers below exist

function load(){
  let raw = null, s = null;
  try { raw = localStorage.getItem(KEY); s = raw ? JSON.parse(raw) : null; } catch(e) {}
  if (raw && (!isObj(s) || s.v !== 2)) {
    // First run of this version on older data: keep an untouched copy before changing anything.
    try { if (!localStorage.getItem(KEY + '_backup')) localStorage.setItem(KEY + '_backup', raw); } catch(e) {}
  }
  if (!isObj(s)) s = {};
  const firstOfThisVersion = raw && !('days' in s);   // saved by an older version, before Today existed
  for (const k in DEFAULTS) {
    const want = DEFAULTS[k];
    const ok = s[k] !== undefined && (isObj(want) ? isObj(s[k]) : typeof s[k] === typeof want || want === null);
    if (!ok) {
      if (s[k] !== undefined) s['old_' + k] = s[k];   // never throw older fields away
      s[k] = isObj(want) ? JSON.parse(JSON.stringify(want)) : want;
    }
  }
  if (!isObj(s.timer) || typeof s.timer.len !== 'number') s.timer = {...DEFAULTS.timer};
  // An imported or hand-edited file can carry anything: make every field the page reads the right type.
  const known = qid => QUESTIONS.some(q => q.id === qid);
  for (const qid in s.ans) {
    const r = s.ans[qid];
    if (!isObj(r)) { (s.old_ans = isObj(s.old_ans) ? s.old_ans : {})[qid] = r; delete s.ans[qid]; continue; }   // set aside, never dropped
    r.n = Math.max(0, Math.floor(+r.n) || 0); r.wrong = Math.max(0, Math.floor(+r.wrong) || 0);
    r.ok = r.ok === true; r.pick = validPick(r.pick);
    if ('f' in r && typeof r.f !== 'boolean') delete r.f;   // first try right (older answers have none: see firstTry)
    if ('sure' in r && r.sure !== true && r.sure !== false) r.sure = null;
  }
  for (const qid in s.srs) {
    const e = s.srs[qid];
    if (!known(qid) || !isObj(e) || !/^\d{4}-\d\d-\d\d$/.test(e.due) || isNaN(parseISO(e.due))) { delete s.srs[qid]; continue; }
    e.box = Math.min(GAPS.length - 1, Math.max(0, Math.floor(+e.box) || 0));
    if (e.sw !== true) delete e.sw;
  }
  // 1.3.0: mock exams, the exam checklist, guess-first answers, the study plan line, settings
  for (const k in s.prefs) if (!(k in PREFS)) delete s.prefs[k];
  for (const k in PREFS) if (typeof s.prefs[k] !== typeof PREFS[k]) s.prefs[k] = PREFS[k];
  if (!['m', 'l', 'xl'].includes(s.prefs.text)) s.prefs.text = 'm';
  if (!['system', 'reduce'].includes(s.prefs.motion)) s.prefs.motion = 'system';
  if (typeof s.plan !== 'string') s.plan = ''; else s.plan = s.plan.slice(0, 120);
  for (const k in s.check) if (s.check[k] !== true) delete s.check[k];
  for (const k in s.sims) if (s.sims[k] !== true || !LABS.some(l => l.id === k)) delete s.sims[k];   // practice labs finished
  for (const k in s.guess) if (!LESSONS.some(l => l.id === k) || !(s.guess[k] === -1 || Number.isInteger(validPick(s.guess[k])))) delete s.guess[k];   // -1: skipped
  for (const k in s.mocks) { const m = cleanResult(s.mocks[k], known); if (m && /^m\d+$/.test(k)) s.mocks[k] = m; else delete s.mocks[k]; }
  s.mock = cleanMock(s.mock, known);
  if (s.review !== null) {
    const R = s.review;
    const fine = isObj(R) && Array.isArray(R.ids);
    if (fine) R.ids = R.ids.filter(known);
    s.review = fine && Number.isInteger(R.i) && R.i >= 0 && R.i <= R.ids.length
      ? {ids:R.ids, i:R.i, right:Math.max(0, Math.floor(+R.right) || 0), started:+R.started || Date.now()} : null;   // a review from 1.0.0 starts now
  }
  if (typeof s.pFilter !== 'string') s.pFilter = 'all';
  if (!THEMES.includes(s.theme)) s.theme = 'system';
  if (!TABS.includes(s.tab)) s.tab = 'today';
  if (!LESSONS.some(l => l.id === s.current)) s.current = null;
  if (firstOfThisVersion) {
    s.tab = 'today';   // show the new Today screen once after updating
    // the streak starts from the days you already studied
    for (const r of Object.values(s.ans)) { const d = new Date(r.at); if (r.at && !isNaN(d)) s.days[isoOf(d)] = true; }
  }
  for (const k in s.stage) { const n = s.stage[k]; if (!Number.isInteger(n) || n < 0 || n >= STAGES.length) delete s.stage[k]; }
  for (const k in s.days) if (!/^\d{4}-\d\d-\d\d$/.test(k) || s.days[k] !== true) delete s.days[k];
  // Answers given before smart review existed: misses are due now, right answers a week after they were given.
  for (const qid in s.ans) {
    const r = s.ans[qid];
    if (s.srs[qid] || !known(qid)) continue;
    const at = new Date(r.at);
    s.srs[qid] = r.ok ? {box:2, due:addDays(r.at && !isNaN(at) ? isoOf(at) : todayISO(), 7)} : {box:0, due:todayISO()};
  }
  s.v = 2;
  return s;
}
// An option index (0 to 4), or a sorted list of distinct ones for "Choose two". Anything else is no answer.
function validPick(p){
  const one = i => Number.isInteger(i) && i >= 0 && i <= 4;
  if (one(p)) return p;
  if (Array.isArray(p) && p.length && p.length <= 5 && p.every(one) && new Set(p).size === p.length) return [...p].sort((a, b) => a - b);
  return null;
}
const mockKind = k => k === 'full' || (typeof k === 'string' && k in DOMAINS);
// A past mock result: every field the results screen reads, of the right type, or the result is dropped.
function cleanResult(m, known){
  const int = v => Number.isInteger(v) && v >= 0;
  if (!isObj(m) || !Number.isFinite(m.at) || !mockKind(m.kind) || !int(m.n) || !m.n || !int(m.right) || m.right > m.n
    || !Array.isArray(m.ids) || !m.ids.every(known) || !isObj(m.dom) || !int(m.used) || !int(m.mins) || !int(m.sureWrong || 0)) return null;
  for (const d in m.dom) { const v = m.dom[d]; if (!(d in DOMAINS) || !Array.isArray(v) || v.length !== 2 || !int(v[0]) || !int(v[1]) || !v[1]) return null; }
  const picks = {}, flags = {};
  if (isObj(m.picks)) for (const k in m.picks) if (m.ids.includes(k) && validPick(m.picks[k]) !== null) picks[k] = validPick(m.picks[k]);
  if (isObj(m.flags)) for (const k in m.flags) if (m.ids.includes(k) && m.flags[k] === true) flags[k] = true;
  return {at:m.at, kind:m.kind, n:m.n, right:m.right, used:m.used, mins:m.mins, dom:m.dom, sureWrong:m.sureWrong || 0, ids:m.ids, picks, flags};
}
// A mock exam in progress: kept across reloads, dropped if it no longer makes sense.
function cleanMock(m, known){
  if (!isObj(m) || !Array.isArray(m.ids) || !m.ids.length || !m.ids.every(known) || !Number.isFinite(m.start) || !(m.mins > 0) || !mockKind(m.kind)) return null;
  const picks = isObj(m.picks) ? m.picks : {}, flags = isObj(m.flags) ? m.flags : {};
  for (const k in picks) if (!m.ids.includes(k) || validPick(picks[k]) === null) delete picks[k]; else picks[k] = validPick(picks[k]);
  for (const k in flags) if (!m.ids.includes(k) || flags[k] !== true) delete flags[k];
  return {ids:m.ids, picks, flags, start:m.start, mins:m.mins, kind:m.kind,
    i:Number.isInteger(m.i) && m.i >= 0 && m.i < m.ids.length ? m.i : 0, list:m.list === true, over:m.over === true};
}
function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) { toast('Could not save. Storage is blocked or full.'); }
}

function exportProgress(){
  const blob = new Blob([JSON.stringify(S, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `aws-study-progress-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
// Import asks in the page, not with confirm(): browser dialogs are unreliable in the Windows app.
let pendingImport = null;   // {data, name} while the Replace / Cancel bar is showing
function readImport(file){
  const r = new FileReader();
  r.onload = () => {
    let data; try { data = JSON.parse(r.result); } catch(e) { data = null; }
    if (!isObj(data)) { toast('That file isn\'t a progress backup'); return; }
    pendingImport = {data, name:file.name};
    showImportBar();
  };
  r.readAsText(file);
}
function showImportBar(){
  const bar = $('#importBar');
  bar.hidden = !pendingImport;
  if (!pendingImport) return;
  $('#importName').textContent = pendingImport.name;
  bar.scrollIntoView({block:'nearest'});
  $('[data-act=importYes]').focus({preventScroll:true});
}
function finishImport(replace){
  if (replace && pendingImport) {
    try {
      localStorage.setItem(KEY + '_beforeImport', JSON.stringify(S));
      localStorage.setItem(KEY, JSON.stringify(pendingImport.data));
    } catch(e) {
      toast('Could not import: storage is blocked or full. Nothing was changed.');
      pendingImport = null; showImportBar(); return;
    }
    S = load(); save();
    toast('Progress imported');
  }
  pendingImport = null;
  showImportBar();
}
