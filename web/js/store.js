// Saved progress: localStorage key awsCourse1. load() is the only way data gets in.
const KEY = 'awsCourse1';
const THEMES = ['system', 'light', 'dark'];
const TABS = ['today', 'learn', 'practice', 'labs'];   // a Timer tab saved by an older version opens Today
const DEFAULTS = {done:{}, steps:{}, ans:{}, labs:{}, srs:{}, stage:{}, days:{}, current:null, review:null, tab:'today', openLesson:null, openLab:null, open:null, pFilter:'all', pMode:'todo', theme:'system', timer:{len:15, end:null, left:null, task:''}};
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
    r.ok = r.ok === true; r.pick = [0, 1, 2, 3].includes(r.pick) ? r.pick : null;
  }
  for (const qid in s.srs) {
    const e = s.srs[qid];
    if (!known(qid) || !isObj(e) || !/^\d{4}-\d\d-\d\d$/.test(e.due) || isNaN(parseISO(e.due))) { delete s.srs[qid]; continue; }
    e.box = Math.min(GAPS.length - 1, Math.max(0, Math.floor(+e.box) || 0));
  }
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
