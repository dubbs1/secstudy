// Saved progress: localStorage key awsCourse1. load() is the only way data gets in.
const KEY = 'awsCourse1';
const DEFAULTS = {done:{}, steps:{}, ans:{}, labs:{}, srs:{}, review:null, tab:'learn', openLesson:null, openLab:null, open:null, pFilter:'all', pMode:'todo', timer:{len:15, end:null, left:null, task:''}};
let S;   // loaded just before the first render, once the helpers below exist

function load(){
  let raw = null, s = null;
  try { raw = localStorage.getItem(KEY); s = raw ? JSON.parse(raw) : null; } catch(e) {}
  if (raw && (!isObj(s) || s.v !== 2)) {
    // First run of this version on older data: keep an untouched copy before changing anything.
    try { if (!localStorage.getItem(KEY + '_backup')) localStorage.setItem(KEY + '_backup', raw); } catch(e) {}
  }
  if (!isObj(s)) s = {};
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
    s.review = fine && Number.isInteger(R.i) && R.i >= 0 && R.i <= R.ids.length ? {ids:R.ids, i:R.i, right:Math.max(0, Math.floor(+R.right) || 0)} : null;
  }
  if (typeof s.pFilter !== 'string') s.pFilter = 'all';
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
function importProgress(file){
  const r = new FileReader();
  r.onload = () => {
    let data; try { data = JSON.parse(r.result); } catch(e) { toast('That file isn\'t a progress backup'); return; }
    if (!isObj(data)) { toast('That file isn\'t a progress backup'); return; }
    if (!confirm('Replace the progress in this browser with the one from the file?')) return;
    try { localStorage.setItem(KEY + '_beforeImport', JSON.stringify(S)); localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
    S = load(); save(); render(); toast('Progress imported');
  };
  r.readAsText(file);
}
