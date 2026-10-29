function weakCard(){
  const open = S.open === 'weak';
  const worst = Object.keys(DOMAINS).map(d => ({d, s:domainStats(d)})).filter(x => x.s.seen)
    .sort((a, b) => a.s.right / a.s.seen - b.s.right / b.s.seen)[0];
  let h = `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="toggleWeak" aria-expanded="${open}">
    <span class="n">!</span><span class="t"><b>Weak spots</b><small>${worst ? `Lowest: ${DOMAINS[worst.d].name}` : 'Answer some questions to see them'}</small></span><span class="chev">›</span></button>`;
  if (!open) return h + '</div>';
  h += '<div class="body"><h3 style="margin-top:4px">By exam domain</h3>';
  for (const [d, D] of Object.entries(DOMAINS)) {
    const s = domainStats(d), pct = s.seen ? Math.round(s.right / s.seen * 100) : 0;
    const col = !s.seen ? 'var(--line)' : pct >= 80 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : 'var(--bad)';
    h += `<div class="wk"><div class="wk-top"><span>${chip(d)}${D.w}% of exam</span>
      <span class="muted">${s.seen ? `${s.right}/${s.seen} right${s.misses ? ` · ${s.misses} miss${s.misses > 1 ? 'es' : ''}` : ''}` : 'not started'}${s.seen < s.total ? ` · ${s.total - s.seen} new` : ''}</span></div>
      <div class="bar" style="margin:4px 0 0"><i style="width:${s.seen ? Math.max(pct, 3) : 0}%;background:${col}"></i></div></div>`;
  }
  h += `<p class="muted" style="font-size:13px;margin:8px 0 0">Aim for green (80 %+). The real pass mark is ${Math.round(EXAM.pass / EXAM.scale * 100)} %.</p>`;
  const wl = weakLessons();
  if (wl.length) {
    h += '<h3>Lessons to redo</h3>';
    wl.forEach(({l, now, misses}) => {
      h += `<div class="wk-row"><span><b>${lessonNo(l.id)}. ${l.t}</b><br><small class="muted">${now ? `${now} still wrong · ` : ''}${misses} miss${misses > 1 ? 'es' : ''} in total</small></span>
        <button class="btn ghost" data-act="pLesson" data-id="${l.id}">Practise</button></div>`;
    });
  }
  return h + '</div></div>';
}

/* ---------- Practice ---------- */
function practiceSet(){
  return QUESTIONS.filter(q => {
    if (S.pFilter in DOMAINS && LESSONS.find(l => l.id === q.l).d !== S.pFilter) return false;
    if (S.pFilter.startsWith('l') && q.l !== S.pFilter) return false;
    if (S.pMode === 'todo' && S.ans[q.id] && S.ans[q.id].ok && q.id !== pCur) return false;
    return true;
  });
}
function renderPractice(){
  const lf = LESSONS.find(l => l.id === S.pFilter);
  let h = weakCard() + `<div class="seg small" role="group">${[['all', 'All']].concat(Object.entries(DOMAINS).map(([k, d]) => [k, d.short])).map(([k, n]) =>
    `<button data-act="pFilter" data-v="${k}" aria-pressed="${S.pFilter === k}">${n}</button>`).join('')}
    ${lf ? `<button data-act="pFilter" data-v="all" aria-pressed="true" title="Show all lessons">Lesson ${lessonNo(lf.id)} ✕</button>` : ''}</div>
    <div class="seg small" role="group">
      <button data-act="pMode" data-v="todo" aria-pressed="${S.pMode === 'todo'}">Not right yet</button>
      <button data-act="pMode" data-v="all" aria-pressed="${S.pMode === 'all'}">All questions</button></div>`;
  const set = practiceSet();
  if (!set.length) return h + `<div class="card"><div class="body" style="padding-top:16px">Every question in this set is right. Switch to <b>All questions</b> to go round again.</div></div>`;
  if (!pCur || !set.find(q => q.id === pCur)) pCur = set[0].id;
  const q = set.find(x => x.id === pCur), pos = set.indexOf(q);
  const l = LESSONS.find(x => x.id === q.l);
  const pick = live['p:' + q.id] != null ? live['p:' + q.id] : null;
  h += `<div class="card coloured-top" style="${domainVars(l.d)}"><div class="body" style="padding-top:14px">
    <div class="qhead"><span>${chip(l.d)}Lesson ${lessonNo(l.id)} · ${pos + 1} of ${set.length}</span>
    <span>${S.ans[q.id] ? (S.ans[q.id].ok ? 'last time: right' : 'last time: wrong') : 'new'}</span></div>
    ${qHTML(q, pick, 'p')}
    <div class="btns"><button class="btn ${pick == null ? 'ghost' : ''}" data-act="pNext">${pick == null ? 'Skip' : 'Next'}</button></div>
    </div></div>`;
  return h;
}
