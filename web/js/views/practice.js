// Readiness: a plain verdict from first tries, weighted like the exam, and the one domain to work on next.
function weakCard(){
  const open = S.open === 'weak', R = readiness();
  const sum = R.cls === 'none' ? `Answer about ${Math.max(R.need, 1)} more to see it` : `${R.verdict}${R.next ? ` · do ${DOMAINS[R.next].short} next` : ''}`;
  let h = `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="toggleWeak" aria-expanded="${open}">
    <span class="n ready-${R.cls}">!</span><span class="t"><b>Readiness and weak spots</b><small>${sum}</small></span><span class="chev">›</span></button>`;
  if (!open) return h + '</div>';
  h += `<div class="body"><p class="ready ready-${R.cls}"><b>${R.verdict}</b> ${R.cls === 'none'
      ? `Answer at least ${READY.minAll} questions, with ${READY.minDomain} or more in every domain${R.thin.length ? ` (still short: ${R.thin.map(d => DOMAINS[d].short).join(', ')})` : ''}.`
      : `About ${Math.round(R.score * 100)} % on first tries, weighted like the exam.`}</p>
    ${R.next && R.cls !== 'none' ? `<div class="wk-row"><span><b>Do next: ${DOMAINS[R.next].name}</b><br><small class="muted">${DOMAINS[R.next].w} % of the exam, and the biggest gap to 80 %</small></span>
      <button class="btn ghost" data-act="pFilter" data-v="${R.next}">Practise</button></div>` : ''}
    ${R.last ? `<p class="muted small">Last full mock: ${Math.round(R.last.right / R.last.n * 100)} % on ${fmtDate(isoOf(new Date(R.last.at)))}.</p>` : ''}
    <p class="muted small">A guide, not a promise: the real exam is scored differently, and a strong domain can make up for a weak one.</p>
    <h3>By exam domain</h3>`;
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
// Practice home: how ready you are, then four big tiles. Each tile opens one thing.
let pSub = '';   // the screen open in Practice: '', 'mock', 'drills' or 'bank' (not saved)
function practiceHome(){
  const due = dueNow().length;
  const tile = (act, v, icon, t, m, off) => `<button class="tile-btn" data-act="${act}"${v ? ` data-v="${v}"` : ''} ${off ? 'disabled' : ''}>
    <span class="tile-i" aria-hidden="true">${icon}</span><b>${t}</b><small>${m}</small></button>`;
  return weakCard() + `<div class="tiles">
    ${tile('rvStart', '', '↻', 'Review', due ? `${Math.min(due, REVIEW_MAX)} due now` : 'All caught up', !due)}
    ${tile('pSub', 'mock', '⏱', 'Mock exam', `${EXAM.questions} questions, like the real one`)}
    ${tile('pSub', 'drills', '⚡', 'Drills', 'Lookalikes and key words')}
    ${tile('pSub', 'bank', '☰', 'All questions', `${QUESTIONS.length}, by domain or lesson`)}</div>`;
}
function practiceSet(){
  return QUESTIONS.filter(q => {
    if (S.pFilter in DOMAINS && LESSONS.find(l => l.id === q.l).d !== S.pFilter) return false;
    if (S.pFilter.startsWith('l') && q.l !== S.pFilter) return false;
    if (S.pMode === 'todo' && S.ans[q.id] && S.ans[q.id].ok && q.id !== pCur) return false;
    return true;
  });
}
function renderPractice(){
  if (S.mock) return mockView();
  if (mockShow) return mockResult(mockShow) || renderPractice();
  if (drillUi) return drillView();
  if (S.review) return reviewCard();
  const back = '<p class="sub-back"><button class="link" data-act="pSub" data-v="">‹ Practice</button></p>';
  if (pSub === 'mock') return back + mockCard();
  if (pSub === 'drills') return back + drillCard();
  if (pSub !== 'bank') return practiceHome();
  const lf = LESSONS.find(l => l.id === S.pFilter);
  let h = back + `<h2 class="group-h">All questions<small>${QUESTIONS.length} questions</small></h2><div class="seg small" role="group">${[['all', 'All']].concat(Object.entries(DOMAINS).map(([k, d]) => [k, d.short])).map(([k, n]) =>
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
