/* ---------- Today: one next step, this week, progress, look up ---------- */
let lookupQ = '';   // the look-up box text, kept while the page redraws

function renderToday(){
  if (S.review) return reviewCard();
  const streak = streakDays();   // the days to the exam are already in the header
  let h = streak ? `<p class="hello"><span class="streak">${streak}-day streak</span>. Keep it going today.</p>` : '';
  h += nextUpCard() + weekCard() + domainCard() + lookupCard() + factsCard();
  return h;
}

// Exactly one suggestion: review that is due, else the lesson in progress or the next one.
function nextUp(){
  const due = dueNow().length;
  if (due) { const n = Math.min(due, REVIEW_MAX); return {act:'rvStart', label:`Start review`, title:`Review ${n} question${n > 1 ? 's' : ''}`, meta:`about ${n} min · questions you missed or that are due again`}; }
  // The lesson you last worked in (not one you only looked at), else the next one in order.
  const cur = LESSONS.find(l => l.id === S.current && !S.done[l.id] && S.stage[l.id]);
  const l = cur || nextLesson();
  const minsLeft = cur ? Math.max(3, Math.round(15 * (STAGES.length - 1 - S.stage[l.id]) / (STAGES.length - 1))) : 15;
  if (l) return {act:'openLesson', id:l.id, d:l.d, label:cur ? 'Continue' : 'Start lesson',
    title:`Lesson ${lessonNo(l.id)}: ${l.t}`, meta:cur ? `about ${minsLeft} min left · you are on ${STAGES[S.stage[l.id]]}` : `about 15 min · due ${fmtDate(l.due)}`};
  return {act:'goPractice', label:'Practise', title:'Practise the questions not right yet', meta:'all lessons done'};
}
function nextUpCard(){
  const n = nextUp();
  return `<div class="card nextup ${n.d ? 'coloured' : ''}"${n.d ? ` style="${domainVars(n.d)}"` : ''}><div class="body"><small class="task-tag">${n.d ? chip(n.d) : ''}Next up</small>
    <b class="nextup-t">${n.title}</b><small class="muted">${n.meta}</small>
    <div class="btns"><button class="btn big" data-act="${n.act}"${n.id ? ` data-id="${n.id}"` : ''} id="nextUpBtn">${n.label}</button></div></div></div>`;
}

function weekCard(){
  const today = todayISO(), end = addDays(today, 6);
  const late = LESSONS.filter(l => l.due < today && !S.done[l.id]);
  const ls = LESSONS.filter(l => l.due >= today && l.due <= end);
  if (!ls.length && !late.length) return '';
  // Late lessons fold into one line with one button, so the list never turns into a wall of red.
  const behind = late.length ? `<li class="behind"><button class="row-link" data-act="openLesson" data-id="${late[0].id}">
      <span class="tick" aria-hidden="true">!</span><span><b>${late.length} lesson${late.length > 1 ? 's' : ''} behind</b>
      <small>Catch up: start with ${esc(late[0].t)}</small></span></button></li>` : '';
  return `<div class="card"><div class="body"><h3>This week</h3><ul class="week">${behind}${ls.map(l => {
    const done = !!S.done[l.id];
    return `<li class="${done ? 'done' : ''}"><button class="row-link" data-act="openLesson" data-id="${l.id}">
      <span class="tick" aria-hidden="true">${done ? '✓' : ''}</span><span><b>${l.t}</b>
      <small>${done ? 'done' : 'due ' + fmtDate(l.due)}</small></span></button></li>`;
  }).join('')}</ul></div></div>`;
}

function domainCard(){
  return `<div class="card"><div class="body"><h3>Progress by exam domain</h3>${Object.entries(DOMAINS).map(([d, D]) => {
    const ls = LESSONS.filter(l => l.d === d), n = ls.filter(l => S.done[l.id]).length;
    return `<div class="dom"><div class="wk-top"><span>${chip(d)}${D.w} % of the exam</span><span class="muted">${n}/${ls.length} lessons</span></div>
      <div class="bar"><i style="width:${Math.round(n / ls.length * 100)}%;background:var(--${d})"></i></div></div>`;
  }).join('')}</div></div>`;
}

function lookupCard(){
  return `<div class="card"><div class="body"><h3><label for="lookup">Look something up</label></h3>
    <input class="field" id="lookup" type="search" autocomplete="off" placeholder="e.g. Macie, NAT gateway, Spot" value="${esc(lookupQ)}">
    <div id="lookupResults">${lookupHTML(lookupQ)}</div></div></div>`;
}
function lookupHTML(q){
  const hits = lookup(q);
  if (q.trim().length < 2) return '';
  if (!hits.length) return `<p class="muted small">Nothing found for "${esc(q.trim())}".</p>`;
  const where = {lesson:'Lesson', lab:'Lab', question:'Question'};
  return `<ul class="hits">${hits.map(r => `<li><button class="row-link" data-act="${r.act}" data-id="${r.id}">
    <small>${where[r.type]}: ${esc(r.title)}</small><span>${markHTML(r.text, q.trim())}</span></button></li>`).join('')}</ul>`;
}
// About 140 characters around the match, with the match highlighted. Every piece is escaped,
// so content can never inject markup here.
function markHTML(text, q){
  const m = wordStart(q).exec(text);
  if (!m) return esc(text);
  const i = m.index + m[1].length, from = Math.max(0, i - 60), to = Math.min(text.length, i + q.length + 80);
  return (from ? '…' : '') + esc(text.slice(from, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>'
    + esc(text.slice(i + q.length, to)) + (to < text.length ? '…' : '');
}

function factsCard(){
  const open = S.open === 'facts';
  let h = `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="toggleFacts" aria-expanded="${open}">
      <span class="n">i</span><span class="t"><b>Exam facts</b><small>${EXAM.code} · ${EXAM.questions} questions · ${EXAM.minutes} min · pass ${EXAM.pass}</small></span><span class="chev">›</span></button>`;
  if (open) h += `<div class="body"><table class="facts">
      <tr><td>Exam</td><td>${EXAM.code}</td></tr><tr><td>Date</td><td>${fmtDateYear(EXAM.date)}</td></tr>
      <tr><td>Questions</td><td>${EXAM.questions} (${EXAM.scored} scored, ${EXAM.questions - EXAM.scored} unscored)</td></tr><tr><td>Time</td><td>${EXAM.minutes} minutes</td></tr>
      <tr><td>Pass mark</td><td>${EXAM.pass} / ${EXAM.scale}</td></tr><tr><td>Cost</td><td>${EXAM.cost}</td></tr><tr><td>Retake</td><td>after ${EXAM.retakeDays} days</td></tr></table>
      <h3>Domain weights</h3><table class="facts">${Object.entries(DOMAINS).map(([k, d]) => `<tr><td>${chip(k)}${d.name}</td><td>${d.w}%</td></tr>`).join('')}</table>
      <p class="muted small">Lessons follow these weights: ${Object.entries(DOMAINS).map(([k, d]) => `${LESSONS.filter(l => l.d === k).length} ${d.short.toLowerCase()}`).join(', ')}.</p></div>`;
  return h + '</div>';
}

function reviewCard(){
  const R = S.review;
  if (R.i >= R.ids.length) {
    const more = dueNow().length;
    return `<div class="card open review"><div class="body">
      <div class="finish"><div class="big-check on" aria-hidden="true">✓</div><b>Review done: ${R.right} of ${R.ids.length} right</b>
      <p class="muted">Misses come back tomorrow. Right answers wait longer each time.</p></div>
      <div class="btns">${more ? `<button class="btn" data-act="rvStart">${Math.min(more, REVIEW_MAX)} more</button>` : ''}
      <button class="btn ${more ? 'ghost' : ''}" data-act="rvClose">Done</button></div></div></div>`;
  }
  const q = QUESTIONS.find(x => x.id === R.ids[R.i]), l = LESSONS.find(x => x.id === q.l);
  const a = S.ans[q.id], pick = live['r:' + q.id] != null ? live['r:' + q.id] : (a && a.at >= R.started ? a.pick : null);
  return `<div class="card open review"><div class="body">
    <div class="qhead"><span>${chip(l.d)}Review ${R.i + 1} of ${R.ids.length}</span><button class="link" data-act="rvClose">Stop</button></div>
    ${qHTML(q, pick, 'r')}
    ${pick != null ? `<div class="btns"><button class="btn" data-act="rvNext">${R.i + 1 < R.ids.length ? 'Next' : 'Finish'}</button></div>` : ''}
    </div></div>`;
}
