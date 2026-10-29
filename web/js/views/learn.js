function reviewCard(){
  const R = S.review, due = dueNow();
  if (!R) {
    if (!Object.keys(S.srs).length) return '';
    if (!due.length) {
      const nx = nextDue();
      return `<div class="card"><div class="row" style="cursor:default"><span class="n done">✓</span><span class="t"><b>Review: nothing due</b>
        <small>${nx ? `Next: ${nx.n} question${nx.n > 1 ? 's' : ''} on ${fmtDate(nx.date)}` : 'Nothing scheduled'}</small></span></div></div>`;
    }
    const n = Math.min(due.length, REVIEW_MAX);
    return `<div class="card open review"><div class="body" style="padding-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><b>Today's review</b><div class="muted" style="font-size:13.5px">${due.length} question${due.length > 1 ? 's' : ''} due · about ${n} min</div></div>
        <button class="btn" data-act="rvStart">Start ${n}</button></div></div></div>`;
  }
  if (R.i >= R.ids.length) {
    const more = dueNow().length;
    return `<div class="card open review"><div class="body" style="padding-top:14px">
      <b>Review done: ${R.right}/${R.ids.length} right</b>
      <p class="muted" style="font-size:13.5px;margin:4px 0 0">Misses come back tomorrow. Right answers wait longer each time.</p>
      <div class="btns">${more ? `<button class="btn" data-act="rvStart">${Math.min(more, REVIEW_MAX)} more</button>` : ''}
      <button class="btn ${more ? 'ghost' : ''}" data-act="rvClose">Back to lessons</button></div></div></div>`;
  }
  const q = QUESTIONS.find(x => x.id === R.ids[R.i]), l = LESSONS.find(x => x.id === q.l);
  const pick = live['r:' + q.id] != null ? live['r:' + q.id] : null;
  return `<div class="card open review"><div class="body" style="padding-top:14px">
    <div class="qhead"><span>${chip(l.d)}Review ${R.i + 1} of ${R.ids.length}</span><button class="link" data-act="rvClose">Stop</button></div>
    ${qHTML(q, pick, 'r')}
    ${pick != null ? `<div class="btns"><button class="btn" data-act="rvNext">${R.i + 1 < R.ids.length ? 'Next' : 'Finish'}</button></div>` : ''}
    </div></div>`;
}

/* ---------- Learn ---------- */
function renderLearn(){
  const nl = nextLesson();
  if (S.openLesson === null && S.open !== 'facts' && nl) S.openLesson = nl.id;
  let h = reviewCard();
  // exam facts (collapsed by default)
  const fOpen = S.open === 'facts';
  h += `<div class="card ${fOpen ? 'open' : ''}"><button class="row" data-act="toggleFacts" aria-expanded="${fOpen}">
      <span class="n">i</span><span class="t"><b>Exam facts</b><small>${EXAM.code} · ${EXAM.questions} questions · ${EXAM.minutes} min · pass ${EXAM.pass}</small></span><span class="chev">›</span></button>`;
  if (fOpen) h += `<div class="body"><table class="facts">
      <tr><td>Exam</td><td>${EXAM.code}</td></tr><tr><td>Date</td><td>${fmtDateYear(EXAM.date)}</td></tr>
      <tr><td>Questions</td><td>${EXAM.questions} (${EXAM.scored} scored, ${EXAM.questions - EXAM.scored} unscored)</td></tr><tr><td>Time</td><td>${EXAM.minutes} minutes</td></tr>
      <tr><td>Pass mark</td><td>${EXAM.pass} / ${EXAM.scale}</td></tr><tr><td>Cost</td><td>${EXAM.cost}</td></tr><tr><td>Retake</td><td>after ${EXAM.retakeDays} days</td></tr></table>
      <h3>Domain weights</h3><table class="facts">${Object.entries(DOMAINS).map(([k, d]) => `<tr><td>${chip(k)}${d.name}</td><td>${d.w}%</td></tr>`).join('')}</table>
      <p class="muted" style="font-size:13.5px">Lessons follow these weights: ${Object.entries(DOMAINS).map(([k, d]) => `${LESSONS.filter(l => l.d === k).length} ${d.short.toLowerCase()}`).join(', ')}.</p></div>`;
  h += '</div>';
  if (!nl) h += `<div class="note">All ${LESSONS.length} lessons done. Use Practice for the questions you haven't got right yet.</div>`;
  LESSONS.forEach((l, idx) => {
    const open = S.openLesson === l.id && !fOpen && !S.review;
    const done = !!S.done[l.id];
    const qs = qsFor(l.id), qRight = qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
    const late = !done && daysUntil(l.due) < 0;
    h += `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="openLesson" data-id="${l.id}" aria-expanded="${open}">
      <span class="n ${done ? 'done' : ''}">${done ? '✓' : idx + 1}</span>
      <span class="t"><b>${l.t}</b><small>${chip(l.d)}<span class="${late ? 'late' : ''}">due ${fmtDate(l.due)}</span> · quiz ${qRight}/${qs.length}${l === nl && !open ? ' · <b style="display:inline;color:var(--brand-text)">up next</b>' : ''}</small></span>
      <span class="chev">›</span></button>`;
    if (open) h += lessonBody(l, qs);
    h += '</div>';
  });
  return h;
}
function lessonBody(l, qs){
  const st = S.steps[l.id] || [];
  let h = `<div class="body"><div class="muted" style="font-size:13.5px">${DOMAINS[l.d].name} · about 15 min</div><h3>Do this</h3>`;
  l.steps.forEach((s, i) => {
    const on = !!st[i]; const m = s.match(/^(.*) \((\d+ min)\)$/);
    h += `<label class="check ${on ? 'on' : ''}"><input type="checkbox" data-act="step" data-id="${l.id}" data-i="${i}" ${on ? 'checked' : ''}><span>${m ? m[1] : s} ${m ? `<em>${m[2]}</em>` : ''}</span></label>`;
  });
  h += `<h3>Key points</h3><ul class="pts">${l.pts.map(p => `<li>${p}</li>`).join('')}</ul>`;
  // the lesson's own quiz, one question at a time
  if (lqi[l.id] == null) { const f = qs.findIndex(q => !S.ans[q.id]); lqi[l.id] = f < 0 ? 0 : f; }
  const i = lqi[l.id], q = qs[i];
  const pick = live[q.id] != null ? live[q.id] : (S.ans[q.id] ? S.ans[q.id].pick : null);
  const dots = qs.map((x, k) => { const r = S.ans[x.id]; return `<i class="${r ? (r.ok ? 'ok' : 'no') : ''} ${k === i ? 'cur' : ''}"></i>`; }).join('');
  h += `<h3>Check yourself</h3><div class="qhead"><span>Question ${i + 1} of ${qs.length}</span><span class="dots">${dots}</span></div>${qHTML(q, pick, 'l')}`;
  h += '<div class="btns">';
  if (pick != null && i < qs.length - 1) h += `<button class="btn" data-act="lqNext" data-id="${l.id}">Next question</button>`;
  if (pick != null && S.ans[q.id] && !S.ans[q.id].ok) h += `<button class="btn ghost" data-act="lqRetry" data-q="${q.id}">Try again</button>`;
  const allAnswered = qs.every(x => S.ans[x.id]);
  if (allAnswered || S.done[l.id]) h += `<button class="btn ${S.done[l.id] ? 'ghost' : ''}" data-act="done" data-id="${l.id}">${S.done[l.id] ? 'Mark not done' : 'Lesson done → next'}</button>`;
  h += '</div></div>';
  return h;
}
