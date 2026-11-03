/* ---------- Today: one next step, this week, progress, look up ---------- */
let lookupQ = '';   // the look-up box text, kept while the page redraws

function renderToday(){
  if (S.review) return reviewCard();
  // Study days are counted per week, never as a streak that can break. After days away: welcome back, no tally.
  const away = awayDays(), n = daysThisWeek();
  let h = away >= 3 ? '<p class="hello">Welcome back. One small step is enough today.</p>'
    : n ? `<p class="hello week-count"><span class="wkdots" aria-hidden="true">${weekDays().map(d => `<i class="${S.days[d] ? 'on' : ''} ${d === todayISO() ? 'today' : ''}"></i>`).join('')}</span>
      <span>Studied <b>${n} day${n > 1 ? 's' : ''}</b> this week</span></p>` : '';
  // Home: the one next step, at most two small extras, and how far along you are. Everything else is in More.
  h += nextUpCard() + planLine() + alsoToday() + progressCard();
  return h;
}
// Up to two small extras, each one tap: review that is due (when it is not already the next step), a drill on
// the weakest domain, a full mock in the final week.
function alsoToday(){
  const n = nextUp(), due = dueNow().length, R = readiness(), last = lastMock(), out = [];
  if (due && n.act !== 'rvStart') out.push(['rvStart', '', `Review ${Math.min(due, REVIEW_MAX)} question${due > 1 ? 's' : ''}`, 'about 5 min · questions due again']);
  if (R.all >= 10) out.push(['goDrill', '', 'A quick drill: lookalike services', `10 questions · 5 min${R.next ? ` · your weakest area: ${DOMAINS[R.next].short}` : ''}`]);
  if (daysUntil(EXAM.date) <= 7 && (!last || Date.now() - last.at > 3 * 864e5) && n.act !== 'goMock') out.unshift(['goMock', '', 'A full mock exam', `${EXAM.questions} questions · ${examMins()} min`]);
  if (!out.length) return '';
  return `<div class="card"><div class="body"><h3>Also today, if you have time</h3><ul class="hits">${out.slice(0, 2).map(([act, id, t, m]) =>
    `<li><button class="row-link" data-act="${act}"${id ? ` data-id="${id}"` : ''}><span><b>${t}</b></span><small>${m}</small></button></li>`).join('')}</ul></div></div>`;
}
// Three numbers, each a door: lessons (to Learn), readiness (to Practice), the exam (to its plan in More).
function progressCard(){
  const done = LESSONS.filter(l => S.done[l.id]).length, R = readiness(), left = daysUntil(EXAM.date);
  return `<div class="card"><div class="body"><h3>Your progress</h3><div class="prog">
    <button class="prog-t" data-act="goLearn"><b>${done}/${LESSONS.length}</b><small>lessons done</small><span class="bar"><i style="width:${Math.round(done / LESSONS.length * 100)}%"></i></span></button>
    <button class="prog-t" data-act="goReady"><b class="ready-${R.cls}">${R.cls === 'none' ? '—' : R.verdict}</b><small>${R.cls === 'none' ? 'readiness: needs a few more answers' : 'exam readiness'}</small></button>
    <button class="prog-t" data-act="goPlan"><b>${left > 0 ? left : 0}</b><small>days to the exam · plan</small></button>
  </div></div></div>`;
}

// Exactly one suggestion: review that is due, else the lesson in progress or the next one.
function nextUp(){
  const due = dueNow().length;
  if (due) { const n = Math.min(due, REVIEW_MAX); return {act:'rvStart', label:`Start review`, title:`Review ${n} question${n > 1 ? 's' : ''}`, meta:`about ${n} min · questions you missed or that are due again`}; }
  // The lesson you last worked in (not one you only looked at), else the next one in order.
  const cur = LESSONS.find(l => l.id === S.current && !S.done[l.id] && S.stage[l.id]);
  const l = cur || nextLesson();
  const minsLeft = cur ? Math.max(3, Math.round(15 * (STAGES.length - 1 - S.stage[l.id]) / (STAGES.length - 1))) : 15;
  if (l) return {act:cur ? 'openLesson' : 'play', id:l.id, d:l.d, label:cur ? 'Continue' : 'Start lesson',
    title:`Lesson ${lessonNo(l.id)}: ${l.t}`, meta:cur ? `about ${minsLeft} min left · you are on ${STAGES[S.stage[l.id]]}` : `about 15 min · due ${fmtDate(l.due)}`};
  // All lessons done: a full mock every few days, practice in between.
  const last = lastMock();
  if (!last || Date.now() - last.at > 3 * 864e5) return {act:'goMock', label:'Start a mock', title:'Take a full mock exam', meta:`${EXAM.questions} questions · ${examMins()} min · all lessons done`};
  return {act:'goPractice', label:'Practise', title:'Practise the questions not right yet', meta:'all lessons done'};
}
function nextUpCard(){
  const n = nextUp();
  return `<div class="card nextup ${n.d ? 'coloured' : ''}"${n.d ? ` style="${domainVars(n.d)}"` : ''}><div class="body"><small class="task-tag">${n.d ? chip(n.d) : ''}Next up</small>
    <b class="nextup-t">${n.title}</b><small class="muted">${n.meta}</small>
    <div class="btns"><button class="btn big" data-act="${n.act}"${n.id ? ` data-id="${n.id}"` : ''} id="nextUpBtn">${n.label}</button></div></div></div>`;
}

// An if-then plan: when and where you will study. Writing it down makes starting easier.
function planLine(){
  return `<div class="plan-line"><label for="plan">I will study when</label>
    <input class="field" id="plan" maxlength="120" autocomplete="off" value="${esc(S.plan)}" placeholder="e.g. after dinner, at my desk, phone in another room"></div>`;
}

/* ---------- Exam plan: what to do before the day, with dates, and the final week ---------- */
// Dates count back from the exam. Ticks are saved. Wording sticks to what AWS and Pearson VUE state; times that only
// third-party sites give (how long an accommodation takes) are said as "allow several weeks".
const AWS_BEFORE = 'https://aws.amazon.com/certification/policies/before-testing/';
const EXAM_CHECKS = [
  {id:'acc', by:-28, s:'Ask for accommodations if you need them', t:'Need extra time, breaks or a separate room (for example for ADHD)? Request accommodations before you book. They are decided case by case, so allow several weeks.', link:AWS_BEFORE},
  {id:'esl', by:-28, s:'Add ESL +30 if English is not your first language', t:'English not your first language? Add the extra time (ESL +30) in your AWS Certification account before you book. Turn on extra time in Settings to practise with it.', link:AWS_BEFORE},
  {id:'book', by:-21, s:'Book the exam', t:'Book the exam. If breaks matter, choose a test centre: the online exam allows no breaks.'},
  {id:'free', by:-10, s:'Try the official practice questions', t:'Try the free official practice question set on AWS Skill Builder: the closest wording to the real exam.', link:'https://skillbuilder.aws/', linkText:'AWS Skill Builder'},
  {id:'id', by:-4, s:'Check your ID name matches', t:'Check that the first and last name on your ID match your AWS Certification account exactly. A fix takes about two business days.'},
  {id:'sys', by:-2, s:'Online? Run the system test', t:'Taking it online? Run the OnVUE system test on the same computer, network and room.'},
  {id:'resch', by:-1, s:'Last day to reschedule', t:'Last day to reschedule or cancel: at least 24 hours before your slot.'},
  {id:'day', by:0, s:'Exam day: check in early', t:'Exam day: check in 30 minutes early with your ID. Online, you will photograph your ID and show the room.'}
];
const FINAL_WEEK = [
  [-7, 'Full mock exam', 'goMock'], [-6, 'One 15 min drill on your weakest domain'], [-5, 'One 15 min drill, then review what is due'],
  [-4, 'One 15 min drill on lookalike services'], [-3, 'Second full mock exam', 'goMock'], [-2, 'System test and ID check. No new topics'],
  [-1, '15 to 20 min of light review, then stop'], [0, 'Exam day']
];
function examPlanCard(){
  const open = S.open === 'plan', next = EXAM_CHECKS.find(c => !S.check[c.id]), date = by => addDays(EXAM.date, by);
  let h = `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="togglePlan" aria-expanded="${open}">
    <span class="n">✓</span><span class="t"><b>Exam plan</b><small>${next ? `Next: ${next.s} · by ${fmtDate(date(next.by))}` : 'All done. Rest well before the day.'}</small></span><span class="chev">›</span></button>`;
  if (!open) return h + '</div>';
  h += `<div class="body"><h3 style="margin-top:4px">Before the day</h3><ul class="checklist">${EXAM_CHECKS.map(c => {
    const late = !S.check[c.id] && date(c.by) < todayISO();
    return `<li><label class="check ${S.check[c.id] ? 'on' : ''}"><input type="checkbox" data-act="chk" data-v="${c.id}" ${S.check[c.id] ? 'checked' : ''}>
      <span><small class="task-tag ${late ? 'late' : ''}">by ${fmtDate(date(c.by))}</small>${c.t}</span></label>
      ${c.link ? `<p class="small">${extLink(c.link, c.linkText || 'AWS exam policies')}</p>` : ''}</li>`; }).join('')}</ul>
    <h3>The final week</h3><ol class="final-week">${FINAL_WEEK.map(([by, t, act]) => `<li class="${date(by) === todayISO() ? 'today' : ''}"><small>${fmtDate(date(by))}</small>
      <span>${t}${act && date(by) === todayISO() ? ` <button class="btn small" data-act="${act}">Start</button>` : ''}</span></li>`).join('')}</ol>
    <h3>Elsewhere</h3><p class="small">${extLink('https://aws.amazon.com/training/digital/aws-cloud-quest/', 'AWS Cloud Quest')}: a free game with guided labs.
      ${extLink('https://www.focusmate.com/', 'Focusmate')}: study alongside a real person on video, if that helps you start.</p></div>`;
  return h + '</div>';
}

/* ---------- Settings ---------- */
function prefsCard(){
  const open = S.open === 'prefs', P = S.prefs;
  let h = `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="togglePrefs" aria-expanded="${open}">
    <span class="n">⚙</span><span class="t"><b>Settings</b><small>Theme, text size, motion, read aloud, exam time</small></span><span class="chev">›</span></button>`;
  if (!open) return h + '</div>';
  const seg = (k, label, opts) => `<div class="pref"><span id="pl-${k}">${label}</span><div class="seg small" role="group" aria-labelledby="pl-${k}">${opts.map(([v, t]) =>
    `<button data-act="pref" data-v="${k}" data-i="${v}" aria-pressed="${String(P[k]) === v || (P[k] === true && v === '1') || (P[k] === false && v === '0')}">${t}</button>`).join('')}</div></div>`;
  h += `<div class="body">
    <div class="pref"><span id="pl-theme">Theme</span><div class="seg small" role="group" aria-labelledby="pl-theme">${THEMES.map(t =>
      `<button data-act="themeSet" data-v="${t}" aria-pressed="${S.theme === t}">${THEME_LABEL[t]}</button>`).join('')}</div></div>
    ${seg('text', 'Text size', [['m', 'Normal'], ['l', 'Large'], ['xl', 'Larger']])}
    ${seg('motion', 'Motion', [['system', 'Like my device'], ['reduce', 'Less motion']])}
    ${seg('calm', 'Week count and progress bars', [['0', 'Show'], ['1', 'Hide']])}
    ${'speechSynthesis' in window ? seg('speak', 'Read-aloud buttons', [['1', 'On'], ['0', 'Off']]) : ''}
    ${seg('extra', 'Mock exam time', [['0', `${EXAM.minutes} min`], ['1', `${EXAM.extraMinutes} min extra`]])}
    <p class="muted small">The extra time matches the ESL +${EXAM.extraMinutes} option, or approved extra time.</p></div>`;
  return h + '</div>';
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
  return `<ul class="hits">${hits.map(r => r.type === 'term' ? `<li class="term"><b>${markHTML(r.title, q.trim())}</b> ${esc(r.text)}${r.vs ? `<small class="muted">${esc(r.vs)}</small>` : ''}
      <button class="link" data-act="goLesson" data-id="${r.id}">Lesson ${lessonNo(r.id)}: ${esc(LESSONS.find(l => l.id === r.id).t)}</button></li>`
    : `<li><button class="row-link" data-act="${r.act}" data-id="${r.id}">
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
