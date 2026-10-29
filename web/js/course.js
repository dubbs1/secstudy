// Lookups over the content, answer recording, spaced repetition and weak-spot statistics.
const qsFor = lid => QUESTIONS.filter(q => q.l === lid);
const lessonNo = lid => LESSONS.findIndex(l => l.id === lid) + 1;
const nextLesson = () => LESSONS.find(l => !S.done[l.id]);

function record(qid, i){
  const q = QUESTIONS.find(x => x.id === qid);
  const r = S.ans[qid] || {n:0, wrong:0};
  r.n++; r.pick = i; r.ok = i === q.a; if (!r.ok) r.wrong++; r.at = Date.now();
  S.ans[qid] = r;
  schedule(qid, r.ok);
}

/* ---------- smart review (spaced repetition) ---------- */
// A miss comes back tomorrow; each right answer on a due question waits longer: 1, 3, 7, 14 days.
const GAPS = [1, 3, 7, 14];
const REVIEW_MAX = 10;   // one sitting ≈ 10 minutes
function schedule(qid, ok){
  const t = todayISO(), c = S.srs[qid];
  if (!ok) { S.srs[qid] = {box:0, due:addDays(t, GAPS[0])}; return; }
  if (!c) { S.srs[qid] = {box:2, due:addDays(t, GAPS[2])}; return; }   // right first time
  if (c.due > t) return;   // answered again before it was due: no extra credit
  const box = Math.min(c.box + 1, GAPS.length - 1);
  S.srs[qid] = {box, due:addDays(t, GAPS[box])};
}
const dueNow = () => QUESTIONS.filter(q => S.srs[q.id] && S.srs[q.id].due <= todayISO())
  .sort((a, b) => S.srs[a.id].due.localeCompare(S.srs[b.id].due));
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
    const qs = qsFor(l.id);
    return {l, now:qs.filter(q => S.ans[q.id] && !S.ans[q.id].ok).length, misses:qs.reduce((n, q) => n + ((S.ans[q.id] || {}).wrong || 0), 0)};
  }).filter(x => x.misses).sort((a, b) => b.now - a.now || b.misses - a.misses).slice(0, 3);
}
