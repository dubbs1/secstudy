/* ---------- Learn: the lesson list, or one lesson as a short walk ---------- */
const STAGES = ['Read', 'See', 'Try', 'Check', 'Done'];
// One small icon per stage, so a stage is known by shape and colour as well as by name.
const stageIcon = d => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const STAGE_ICONS = [
  stageIcon('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/>'),
  stageIcon('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  stageIcon('<path d="M9 11V5a2 2 0 0 1 4 0v6M13 10V4a2 2 0 0 1 4 0v7M9 11a2 2 0 0 0-4 0v2a8 8 0 0 0 8 8h1a7 7 0 0 0 7-7v-3a2 2 0 0 0-4 0"/>'),
  stageIcon('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
  stageIcon('<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>')
];
// Inline style that gives a block its exam domain's colours.
const domainVars = d => `--dc:var(--${d});--dcbg:var(--${d}-bg)`;
const revealed = {};   // scenario answers shown this visit, by "lessonId:index"

function renderLearn(){
  const l = LESSONS.find(x => x.id === S.openLesson);
  return l ? lessonView(l) : lessonList();
}

function lessonStatus(l){
  if (S.done[l.id]) return {cls:'done', text:'Done'};
  const st = S.stage[l.id];
  if (st) return {cls:'going', text:'In progress: ' + STAGES[st]};
  if (daysUntil(l.due) < 0) return {cls:'late', text:'Late'};
  if (l === nextLesson()) return {cls:'next', text:'Up next'};
  return null;
}

function lessonList(){
  let h = '';
  if (!nextLesson()) h += `<div class="note">All ${LESSONS.length} lessons done. Use Practice for the questions you haven't got right yet.</div>`;
  for (const [d, D] of Object.entries(DOMAINS)) {
    const ls = LESSONS.filter(l => l.d === d), n = ls.filter(l => S.done[l.id]).length;
    h += `<section class="group"><h2 class="group-h">${chip(d)}${D.name}<small>${D.w} % of the exam · ${n}/${ls.length} done</small></h2>`;
    if (FLOWS[d]) h += domainFlowHTML(d);
    for (const l of ls) {
      const s = lessonStatus(l), done = !!S.done[l.id];
      h += `<div class="card"><button class="row" data-act="openLesson" data-id="${l.id}">
        <span class="n ${done ? 'done' : 'd-' + l.d}">${done ? '✓' : lessonNo(l.id)}</span>
        <span class="t"><b>${l.t}</b><small>${s ? `<span class="pill pill-${s.cls}">${s.text}</span> ` : ''}due ${fmtDate(l.due)} · about 15 min</small></span>
        <span class="chev">›</span></button></div>`;
    }
    h += '</section>';
  }
  return h;
}

// A "Do this" task as a tick box; text like "Read ... (5 min)" shows the minutes apart.
function taskHTML(l, i){
  const s = l.steps[i]; if (!s) return '';
  const on = !!(S.steps[l.id] || [])[i], m = s.match(/^(.*) \((\d+ min)\)$/);
  return `<label class="check task ${on ? 'on' : ''}"><input type="checkbox" data-act="step" data-id="${l.id}" data-i="${i}" ${on ? 'checked' : ''}>
    <span><small class="task-tag">Your task</small>${m ? m[1] : s} ${m ? `<em>${m[2]}</em>` : ''}</span></label>`;
}

function lessonView(l){
  const st = S.stage[l.id] || 0, qs = qsFor(l.id);
  const strip = STAGES.map((name, k) => `<button class="stage ${k === st ? 'cur' : ''} ${k < st ? 'past' : ''}" data-act="stage" data-id="${l.id}" data-i="${k}"
    aria-current="${k === st ? 'step' : 'false'}"><i></i><span class="stage-l">${STAGE_ICONS[k]}${name}</span></button>`).join('');
  const timerOff = !S.timer.end;
  let h = `<div class="card lesson" id="lessonTop" style="${domainVars(l.d)}"><div class="lesson-band">
    <div class="lesson-bar"><button class="link" data-act="closeLesson">‹ All lessons</button>
      ${timerOff ? `<button class="btn ghost small" data-act="lessonTimer">Start 15 min timer</button>` : ''}</div>
    <small class="band-meta">${DOMAINS[l.d].name} · ${DOMAINS[l.d].w} % of the exam · Lesson ${lessonNo(l.id)} of ${LESSONS.length} · due ${fmtDate(l.due)}</small>
    <h2 class="lesson-t">${l.t}</h2></div><div class="body">
    <nav class="stages" aria-label="Lesson steps">${strip}</nav>
    <div class="stage-body">${stageHTML(l, st, qs)}</div>`;
  if (st < STAGES.length - 1) {
    h += `<div class="btns stage-nav">${st ? `<button class="btn ghost" data-act="stagePrev" data-id="${l.id}">Back</button>` : ''}
      <button class="btn" data-act="stageNext" data-id="${l.id}">Next: ${STAGES[st + 1]}</button></div>`;
  }
  return h + '</div></div>';
}

function stageHTML(l, st, qs){
  if (st === 0) {
    const cards = modeOf(l, 0, 'points') === 'cards';
    return `${taskHTML(l, 0)}${modeSwitch(l, 0, [['points', 'Key points'], ['cards', 'Flip cards']])}` + (cards ? cardsHTML(l)
      : `<p class="colour-key"><b>Terms to know</b> in this lesson's colour · <span class="num">numbers</span> the exam likes to ask about</p>
         <ul class="pts">${l.pts.map(p => `<li>${markNumbers(p)}</li>`).join('')}</ul>`);
  }
  if (st === 1) {
    // How it works (a picture that builds up step by step), the lesson's diagram, and its game.
    const mode = modeOf(l, 1, 'how');
    return modeSwitch(l, 1, [['how', 'How it works'], ['look', 'Picture'], ['test', 'Test yourself']])
      + (mode === 'test' ? gameHTML(l) : mode === 'how' ? flowHTML(l.id)
      : `<p class="muted lead">Look at the picture for a minute, then say what it shows in your own words. Then tap Test yourself.</p>${markNumbers(visualHTML(VISUALS[l.id]))}`);
  }
  if (st === 2) return tryHTML(l);
  if (st === 3) return `${taskHTML(l, 2)}${quizHTML(l, qs)}`;
  return doneHTML(l, qs);
}

function tryHTML(l){
  let h = '<p class="muted lead">Read the situation. Decide your answer before you open it.</p>';
  (SCENARIOS[l.id] || []).forEach((s, i) => {
    const open = revealed[l.id + ':' + i];
    h += `<div class="scenario"><small class="task-tag">Situation</small><p>${s.situation}</p>
      ${open ? `<div class="answer" id="ans-${l.id}-${i}" tabindex="-1"><b>${s.answer}</b> ${s.why}</div>`
             : `<button class="btn ghost small" data-act="reveal" data-id="${l.id}" data-i="${i}">Show answer</button>`}</div>`;
  });
  h += taskHTML(l, 1);
  const labs = LABS.filter(x => x.lessons.includes(l.id));
  if (labs.length) h += `<div class="handson"><small class="task-tag">Hands-on in the AWS console</small>${labs.map(x =>
    `<button class="row-link" data-act="goLab" data-id="${x.id}"><b>${x.t}</b><small>about ${x.min} min · ${x.cost}</small></button>`).join('')}</div>`;
  return h;
}

// The lesson's own quiz, one question at a time.
function quizHTML(l, qs){
  if (lqi[l.id] == null) { const f = qs.findIndex(q => !S.ans[q.id]); lqi[l.id] = f < 0 ? 0 : f; }
  const i = lqi[l.id], q = qs[i];
  const pick = live[q.id] != null ? live[q.id] : (S.ans[q.id] ? S.ans[q.id].pick : null);
  const dots = qs.map((x, k) => { const r = S.ans[x.id]; return `<i class="${r ? (r.ok ? 'ok' : 'no') : ''} ${k === i ? 'cur' : ''}"></i>`; }).join('');
  let h = `<div class="qhead"><span>Question ${i + 1} of ${qs.length}</span><span class="dots">${dots}</span></div>${qHTML(q, pick, 'l')}<div class="btns">`;
  if (pick != null && i < qs.length - 1) h += `<button class="btn" data-act="lqNext" data-id="${l.id}">Next question</button>`;
  if (pick != null && S.ans[q.id] && !S.ans[q.id].ok) h += `<button class="btn ghost" data-act="lqRetry" data-q="${q.id}">Try again</button>`;
  return h + '</div>';
}

function doneHTML(l, qs){
  const answered = qs.filter(q => S.ans[q.id]).length, right = qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
  const done = !!S.done[l.id], labs = LABS.filter(x => x.lessons.includes(l.id)), next = nextLesson();
  const quiz = !answered ? 'You haven\'t answered the quiz yet.'
    : `Quiz: ${right} of ${qs.length} right${right < answered ? '. Misses come back in your review tomorrow.' : answered < qs.length ? `, ${qs.length - answered} not answered yet.` : '.'}`;
  // Not done: one main action. Done: a pause with the tick, then a choice; "Mark not done" is a small link.
  return `<div class="finish"><div class="big-check ${done ? 'on' : ''}" aria-hidden="true">✓</div>
    <b>${done ? `Lesson done. ${LESSONS.filter(x => !S.done[x.id]).length} to go.` : 'Last step: mark it done'}</b>
    <p class="muted">${quiz}${answered < qs.length ? ` <button class="link" data-act="stage" data-id="${l.id}" data-i="3">Go to the quiz</button>` : ''}</p></div>
    <div class="btns">
      ${done ? (next ? `<button class="btn" data-act="openLesson" data-id="${next.id}">Next lesson</button>` : `<button class="btn" data-act="goPractice">Practise</button>`)
             : `<button class="btn" data-act="done" data-id="${l.id}">Mark done</button>`}
      <button class="btn ghost" data-act="breakTimer">5 min break</button>
      ${labs.length ? `<button class="btn ghost" data-act="goLab" data-id="${labs[0].id}">Try the lab</button>` : ''}
    </div>
    ${done ? `<p class="center small"><button class="link" data-act="undone" data-id="${l.id}">Mark not done</button></p>` : ''}`;
}
