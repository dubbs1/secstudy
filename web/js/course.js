// Lookups over the content, answer recording, spaced repetition and weak-spot statistics.
// A lesson's quiz: its own questions. Bank questions (m:1) are for Practice and the mock exam.
const qsFor = lid => QUESTIONS.filter(q => q.l === lid && !q.m);
const multi = q => Array.isArray(q.a);
// A "Choose two" answer is right only when exactly the right options are picked.
const isRight = (q, pick) => multi(q) ? Array.isArray(pick) && pick.length === q.a.length && q.a.every(i => pick.includes(i)) : pick === q.a;
const LETTERS = 'ABCDEFG';   // up to seven: a lookalike drill can offer seven services
const lessonNo = lid => LESSONS.findIndex(l => l.id === lid) + 1;
const nextLesson = () => LESSONS.find(l => !S.done[l.id]);

// pick: an option index, or a sorted list of them for "Choose two". sure: false when the answer was a guess.
function record(qid, pick, sure){
  const q = QUESTIONS.find(x => x.id === qid);
  const r = S.ans[qid] || {n:0, wrong:0};
  if (!r.n) r.f = isRight(q, pick);   // first try: what the readiness check counts
  r.n++; r.pick = pick; r.ok = isRight(q, pick); if (!r.ok) r.wrong++; r.at = Date.now(); r.sure = sure == null ? null : !!sure;
  S.ans[qid] = r;
  schedule(qid, r.ok && sure !== false);
}
// "How sure were you?" after an answer: a right guess comes back tomorrow, like a miss, without counting as one.
// Changing your mind back to Sure puts the schedule back as it was.
const sureUndo = {};   // this visit: the schedule before Guessed, by question
function setSure(qid, sure){
  const r = S.ans[qid]; if (!r) return;
  if (r.ok && !sure && r.sure !== false) {
    const was = S.srs[qid]; sureUndo[qid] = was ? {...was} : null;
    S.srs[qid] = {box:0, due:capDue(GAPS[0])}; if (was && was.sw) S.srs[qid].sw = true;
  } else if (r.ok && sure && r.sure === false && qid in sureUndo) {
    if (sureUndo[qid]) S.srs[qid] = sureUndo[qid]; delete sureUndo[qid];
  }
  r.sure = sure;
}

/* ---------- smart review (spaced repetition) ---------- */
// A miss comes back tomorrow; each right answer on a due question waits longer: 1, 3, 7, 14 days.
const GAPS = [1, 3, 7, 14];
const REVIEW_MAX = 10;   // one sitting ≈ 10 minutes
// Fitted to the exam date: a gap is at most a quarter of the days left, and nothing is due after the day before
// the exam. From five days out, every question ever missed comes back once more (the final sweep).
const SWEEP_DAYS = 5;
function capDue(gap){
  const t = todayISO(), left = daysUntil(EXAM.date);
  if (left <= 1) return addDays(t, gap);
  const due = addDays(t, Math.max(1, Math.min(gap, Math.floor(left / 4))));
  const eve = addDays(EXAM.date, -1);
  return due > eve ? eve : due;
}
const inSweep = () => { const left = daysUntil(EXAM.date); return left > 0 && left <= SWEEP_DAYS; };
function schedule(qid, ok){
  const t = todayISO(), c = S.srs[qid], sw = (c && c.sw) || inSweep();
  const put = (box, gap) => { S.srs[qid] = {box, due:capDue(gap)}; if (sw) S.srs[qid].sw = true; };
  if (!ok) return put(0, GAPS[0]);
  if (!c) return put(2, GAPS[2]);   // right first time
  if (c.due > t) { if (sw && !c.sw) c.sw = true; return; }   // answered again before it was due: no extra credit
  const box = Math.min(c.box + 1, GAPS.length - 1);
  put(box, GAPS[box]);
}
const swept = q => !inSweep() || !S.ans[q.id] || !S.ans[q.id].wrong || (S.srs[q.id] && S.srs[q.id].sw);
const dueNow = () => QUESTIONS.filter(q => (S.srs[q.id] && S.srs[q.id].due <= todayISO()) || !swept(q))
  .sort((a, b) => (S.srs[a.id] ? S.srs[a.id].due : '').localeCompare(S.srs[b.id] ? S.srs[b.id].due : ''));
function nextDue(){
  const later = Object.values(S.srs).map(x => x.due).filter(d => d > todayISO()).sort();
  return later.length ? {date:later[0], n:later.filter(d => d === later[0]).length} : null;
}

/* ---------- weak spots ---------- */
function domainStats(d){
  const qs = QUESTIONS.filter(q => LESSONS.find(l => l.id === q.l).d === d);
  const seen = qs.filter(q => S.ans[q.id]);
  return {total:qs.length, seen:seen.length, right:seen.filter(q => S.ans[q.id].ok).length,
          misses:seen.reduce((n, q) => n + (S.ans[q.id].wrong || 0), 0)};
}
function weakLessons(){
  return LESSONS.map(l => {
    const qs = QUESTIONS.filter(q => q.l === l.id);
    return {l, now:qs.filter(q => S.ans[q.id] && !S.ans[q.id].ok).length, misses:qs.reduce((n, q) => n + ((S.ans[q.id] || {}).wrong || 0), 0)};
  }).filter(x => x.misses).sort((a, b) => b.now - a.now || b.misses - a.misses).slice(0, 3);
}

/* ---------- readiness ---------- */
// A plain verdict, not a score: first tries only (a repeat measures memory of that question), each domain pulled
// towards 60 % until it has answers, then weighted like the exam. Weak areas rank by weight times the gap to 80 %.
// Right on the first try. Answers from before 1.3.0 have no record of it: right with no misses counts.
const firstTry = r => typeof r.f === 'boolean' ? r.f : r.wrong === 0 && r.ok;
const READY = {prior:0.6, k:4, minAll:20, minDomain:4, aim:0.8};
function readiness(){
  const dom = {};
  for (const d in DOMAINS) {
    const qs = QUESTIONS.filter(q => LESSONS.find(l => l.id === q.l).d === d && S.ans[q.id] && S.ans[q.id].n);
    const n = qs.length, k = qs.filter(q => firstTry(S.ans[q.id])).length;
    dom[d] = {n, k, p:(k + READY.prior * READY.k) / (n + READY.k)};
  }
  const all = Object.values(dom).reduce((a, x) => a + x.n, 0);
  const score = Object.entries(dom).reduce((a, [d, x]) => a + x.p * DOMAINS[d].w / 100, 0);
  const next = Object.entries(dom).map(([d, x]) => ({d, gap:DOMAINS[d].w * (READY.aim - x.p)})).sort((a, b) => b.gap - a.gap)[0];
  const thin = Object.entries(dom).filter(([, x]) => x.n < READY.minDomain).map(([d]) => d);
  let verdict, cls;
  if (all < READY.minAll || thin.length) { verdict = 'Not enough answers yet'; cls = 'none'; }
  else if (score >= READY.aim && Object.values(dom).every(x => x.p >= 0.7)) { verdict = 'Likely ready'; cls = 'ok'; }
  else if (score >= 0.7) { verdict = 'Borderline'; cls = 'warn'; }
  else { verdict = 'Not yet'; cls = 'bad'; }
  return {dom, all, score, verdict, cls, thin, next:next.gap > 0 ? next.d : null,
    need:Math.max(READY.minAll - all, 0), last:lastMock()};
}

/* ---------- study days ---------- */
// Any answer, tick or finished lesson marks today as a study day. Counted per week, never as a streak that breaks.
function studied(){ S.days[todayISO()] = true; }
const weekStart = () => { const d = parseISO(todayISO()); return addDays(todayISO(), -((d.getDay() + 6) % 7)); };   // Monday
function weekDays(){ const m = weekStart(); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(m, i)); }
const daysThisWeek = () => weekDays().filter(d => S.days[d]).length;
// Back after three or more days away (and nothing yet today): Today says welcome back, never what was missed.
function awayDays(){
  if (S.days[todayISO()]) return 0;
  const last = Object.keys(S.days).filter(d => d < todayISO()).sort().pop();
  return last ? -daysUntil(last) : 0;
}

/* ---------- look up ---------- */
const plain = html => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
// Where the typed text starts a word: "nat" finds "NAT gateway", not "designated".
const wordStart = q => new RegExp('(^|[^a-z0-9])(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i');
// Up to 8 places where the words appear: lesson key points first, then labs, then questions.
function lookup(q){
  q = q.trim();
  if (q.length < 2) return [];
  const re = wordStart(q), hits = [], has = t => re.test(t);
  for (const g of GLOSSARY) if (has(g.t)) hits.push({type:'term', id:g.l, title:g.t, text:g.s, vs:g.vs || ''});   // services first, by name
  for (const l of LESSONS) for (const p of l.pts.map(plain)) if (has(p)) hits.push({type:'lesson', act:'goLesson', id:l.id, title:l.t, text:p});
  for (const x of LABS) for (const s of x.steps.map(plain)) if (has(s)) hits.push({type:'lab', act:'goLab', id:x.id, title:x.t, text:s});
  for (const x of QUESTIONS) { const t = plain(x.q); if (has(t) || has(plain(x.x))) hits.push({type:'question', act:'goQuestion', id:x.id, title:LESSONS.find(l => l.id === x.l).t, text:has(t) ? t : plain(x.x)}); }
  return hits.slice(0, 8);
}
