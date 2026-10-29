/* ---------- Learn: the lesson list, or one lesson as a short walk ---------- */
const STAGES = ['Read', 'See', 'Try', 'Check', 'Done'];
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
    for (const l of ls) {
      const s = lessonStatus(l), done = !!S.done[l.id];
      h += `<div class="card"><button class="row" data-act="openLesson" data-id="${l.id}">
        <span class="n ${done ? 'done' : ''}">${done ? '✓' : lessonNo(l.id)}</span>
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
    aria-current="${k === st ? 'step' : 'false'}"><i></i>${name}</button>`).join('');
  const timerOff = !S.timer.end;
  let h = `<div class="card lesson" id="lessonTop"><div class="body">
    <div class="lesson-bar"><button class="link" data-act="closeLesson">‹ All lessons</button>
      ${timerOff ? `<button class="btn ghost small" data-act="lessonTimer">Start 15 min timer</button>` : ''}</div>
    <small class="muted">${chip(l.d)}Lesson ${lessonNo(l.id)} of ${LESSONS.length} · due ${fmtDate(l.due)}</small>
    <h2 class="lesson-t">${l.t}</h2>
    <nav class="stages" aria-label="Lesson steps">${strip}</nav>
    <div class="stage-body">${stageHTML(l, st, qs)}</div>`;
  if (st < STAGES.length - 1) {
    h += `<div class="btns stage-nav">${st ? `<button class="btn ghost" data-act="stagePrev" data-id="${l.id}">Back</button>` : ''}
      <button class="btn" data-act="stageNext" data-id="${l.id}">Next: ${STAGES[st + 1]}</button></div>`;
  }
  return h + '</div></div>';
}

function stageHTML(l, st, qs){
  if (st === 0) return `${taskHTML(l, 0)}<ul class="pts">${l.pts.map(p => `<li>${p}</li>`).join('')}</ul>`;
  if (st === 1) return `<p class="muted lead">Look at the picture for a minute, then say what it shows in your own words.</p>${visualHTML(VISUALS[l.id])}`;
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
  const right = qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length, done = !!S.done[l.id];
  const labs = LABS.filter(x => x.lessons.includes(l.id));
  return `<div class="finish"><div class="big-check ${done ? 'on' : ''}" aria-hidden="true">✓</div>
    <b>${done ? 'Lesson done' : 'Last step: mark it done'}</b>
    <p class="muted">Quiz: ${right} of ${qs.length} right${right < qs.length ? '. Misses come back in your review tomorrow.' : '.'}</p></div>
    <div class="btns">
      <button class="btn ${done ? 'ghost' : ''}" data-act="done" data-id="${l.id}">${done ? 'Mark not done' : 'Mark done, next lesson'}</button>
      <button class="btn ghost" data-act="breakTimer">5 min break</button>
      ${labs.length ? `<button class="btn ghost" data-act="goLab" data-id="${labs[0].id}">Try the lab</button>` : ''}
    </div>`;
}
