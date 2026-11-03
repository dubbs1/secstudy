/* ---------- Step by step: a lesson as a short run of screens, one idea and one thing to do on each ---------- */
// Teach, then ask: each key point gets its own screen, and a question comes only right after the point it is about
// (questions carry p, the point's index). Built from the lesson's own content: a hook, a guess (with "I don't know
// yet"), one screen per key point and its question, a hands-on widget (content/steps.js), then a matching game as
// review, How it works, What if, and a finish. Every question has a Hint that shows its key point; a wrong answer
// offers "Show me the idea again". Pick, then Check; the answer and why come up from the bottom. Continue moves on:
// nothing moves by itself. Hands-on screens unlock Continue once tried, and each can be skipped. Visit-only state.
const playerUi = {id:null, i:0, list:[], sel:null, checked:false, anim:false, m:null, w:null, hint:false, from:'learn'};

function playerScreens(l){
  const list = [{k:'hook'}], qs = qsFor(l.id);
  if (GUESS[l.id]) list.push({k:'guess'});
  l.pts.forEach((p, i) => {
    list.push({k:'point', i});
    qs.filter(q => (q.p != null ? q.p : l.pts.length - 1) === i).forEach(q => list.push({k:'q', q}));
  });
  if (STEPS[l.id]) list.push({k:'widget'});
  if (SCENES[l.id]) list.push({k:'match'});
  if (FLOWS[l.id]) list.push({k:'flow'});
  if (SIMS[l.id]) list.push({k:'sim'});
  const lab = LABS.find(x => x.lessons[0] === l.id && LAB_SIMS[x.id]);
  if (lab) list.push({k:'lab', lab:lab.id});
  list.push({k:'done'});
  return list;
}
// The key point a question is about, shown by Hint and by "Show me the idea again".
function plHintHTML(l, q){
  return `<div class="pl-hint" tabindex="-1"><small class="task-tag">The key idea</small>${markNumbers(l.pts[q.p != null ? q.p : l.pts.length - 1])}</div>`;
}
function playerOpen(id){
  const l = LESSONS.find(x => x.id === id);
  Object.assign(playerUi, {id, i:0, list:playerScreens(l), sel:null, checked:false, anim:true, m:null, w:null, hint:false, from:S.tab === 'today' ? 'today' : 'learn'});
  delete flowUi.order[id]; flowUi.at[id] = 0;
}
const plScreen = () => playerUi.list[playerUi.i];
const plLesson = () => LESSONS.find(x => x.id === playerUi.id);

// Whether Continue is open yet on a hands-on screen.
function plReady(){
  const s = plScreen(), id = playerUi.id;
  if (s.k === 'match') return playerUi.m && playerUi.m.done.length === plMatchItems().length;
  if (s.k === 'widget') return !!(playerUi.w && playerUi.w.done);
  if (s.k === 'flow') return flowAt(id) === FLOWS[id].rows.length - 1 || partDone(id, 1, 'how');
  if (s.k === 'sim') return simUi.lastKey === id || !!simUi.pick[id];
  return true;
}
const plMatchItems = () => SCENES[playerUi.id].items.slice(0, 4);

function playerView(){
  const l = plLesson(), s = plScreen(), n = playerUi.list.length, pct = Math.round(playerUi.i / (n - 1) * 100);
  const anim = playerUi.anim && !reduceMotion(); playerUi.anim = false;
  return `<div class="player" style="${domainVars(l.d)}">
    <div class="pl-top"><button class="pl-x" data-act="plClose" aria-label="Close the lesson">✕</button>
      <div class="pl-bar" role="progressbar" aria-label="Lesson progress" aria-valuenow="${playerUi.i + 1}" aria-valuemin="1" aria-valuemax="${n}"><i style="width:${pct}%"></i></div>
      <span class="pl-n">${playerUi.i + 1}/${n}</span></div>
    <div class="pl-screen ${anim ? 'in' : ''}" id="plScreen">${plBody(l, s)}</div>
    ${plFoot(s)}</div>`;
}

function plOptions(o, a, done){
  return `<div class="pl-opts">${o.map(([t, why], i) => {
    const cls = done ? (i === a ? 'right' : i === playerUi.sel ? 'wrong' : 'dim') : i === playerUi.sel ? 'picked' : '';
    return `<button class="opt ${cls}" data-act="plPick" data-i="${i}" ${done ? 'disabled' : ''} role="radio" aria-checked="${i === playerUi.sel}">
      <span class="k">${LETTERS[i]}</span><span>${t}${done && i === playerUi.sel && i !== a ? `<small class="why">${why}</small>` : ''}</span></button>`; }).join('')}</div>`;
}

function plBody(l, s){
  const sc = SCENES[l.id], st = STEPS[l.id];
  switch (s.k) {
    case 'hook': return `<div class="pl-hook"><div class="pl-emoji" aria-hidden="true">${sc ? sc.items.map(it => it.e).join(' ') : '☁️'}</div>
      <small class="task-tag">${chip(l.d)}Lesson ${lessonNo(l.id)}</small><h2 tabindex="-1">${l.t}</h2>
      <p class="pl-lead">${st ? st.hook : sc ? sc.title + ': everyday things that work like the cloud.' : ''}</p>
      <p class="muted small">About ${Math.max(6, playerUi.list.length)} minutes · ${playerUi.list.length} short screens · tap, try, then read why</p></div>`;
    case 'guess': { const g = GUESS[l.id];
      return `<small class="task-tag">Guess first</small><h2 tabindex="-1" class="pl-q">${g.q}</h2>
        <p class="muted small">Nobody is expected to know this yet. Go with your gut, or tap "I don't know yet" to see the answer. Either way you'll remember it better.</p>
        ${plOptions(g.o, g.a, playerUi.checked)}`; }
    case 'q': return `<small class="task-tag">Quick check</small><h2 tabindex="-1" class="pl-q">${s.q.q}</h2>
      ${playerUi.hint ? plHintHTML(l, s.q) : ''}${plOptions(s.q.o, s.q.a, playerUi.checked)}
      ${playerUi.checked || playerUi.hint ? '' : '<p class="center small"><button class="link" data-act="plHint">Hint: show the key idea</button></p>'}`;
    case 'point': { const p = l.pts[s.i], n = l.pts.length;
      return `<small class="task-tag">Key idea ${s.i + 1} of ${n}</small><p class="pl-point" tabindex="-1">${markNumbers(p)}</p>
      <div class="pl-tools">${speakBtn(p)}</div>`; }
    case 'match': {
      const items = plMatchItems(), M = playerUi.m || (playerUi.m = {l:null, r:null, done:[], miss:null});
      const right = shuffled(items.map((it, i) => i), 'match' + l.id);
      const hint = playerUi.hint && M.l != null ? items[M.l] : null;
      return `<small class="task-tag">Link them up</small><h2 tabindex="-1" class="pl-q">${sc.title}: which AWS idea from this lesson is each one?</h2>
        <p class="muted small">You've just met every one of these ideas. Tap a picture, then the AWS idea it works like. ${M.l != null ? '' : 'Pick a picture to get a hint.'}</p>
        ${hint ? `<p class="pl-hint" tabindex="-1">${hint.e} <b>Clue:</b> ${hint.n}</p>` : M.l != null ? '<p class="center small"><button class="link" data-act="plHint">Hint for this picture</button></p>' : ''}
        <div class="pl-match"><div>${items.map((it, i) => `<button class="pl-card ${M.done.includes(i) ? 'ok' : M.l === i ? 'picked' : ''}" data-act="plMatch" data-v="l" data-i="${i}" ${M.done.includes(i) ? 'disabled' : ''} aria-pressed="${M.l === i}">
          <span class="pl-e" aria-hidden="true">${it.e}</span><span>${it.t}</span></button>`).join('')}</div>
          <div>${right.map(i => `<button class="pl-card aws ${M.done.includes(i) ? 'ok' : M.miss === i ? 'miss' : M.r === i ? 'picked' : ''}" data-act="plMatch" data-v="r" data-i="${i}" ${M.done.includes(i) ? 'disabled' : ''} aria-pressed="${M.r === i}">${items[i].aws}</button>`).join('')}</div></div>
        ${M.done.length ? `<p class="pl-note">${items[M.done[M.done.length - 1]].e} ${items[M.done[M.done.length - 1]].n}</p>` : ''}`;
    }
    case 'widget': return plWidget(st.widget);
    case 'flow': return `<small class="task-tag">How it works</small>${flowHTML(l.id)}`;
    case 'sim': return `<small class="task-tag">What if</small><p class="muted small">Switch parts on and off and watch what still works.</p>${simHTML(l.id)}`;
    case 'lab': { const lab = LABS.find(x => x.id === s.lab);
      return `<small class="task-tag">Try it hands-on · optional</small><h2 tabindex="-1" class="pl-q">${lab.t}</h2>
        <p class="pl-lead">Do it yourself in a practice console laid out like the real AWS one, right here in the app.</p>
        <p class="muted small">About ${lab.min} minutes · ${LAB_SIMS[lab.id].steps.length} steps · a coach guides each step · nothing is created in AWS and nothing costs anything.</p>
        <div class="btns"><button class="btn" data-act="labPlay" data-id="${lab.id}">${S.sims[lab.id] ? 'Do the lab again' : 'Start the lab'}</button></div>
        ${S.sims[lab.id] ? '<p class="pl-note">✓ You have done this lab.</p>' : ''}`; }
    case 'done': {
      const qs = qsFor(l.id), right = qs.filter(q => S.ans[q.id] && S.ans[q.id].ok).length;
      const terms = [...new Set(l.pts.join(' ').match(/<b>[^<]+<\/b>/g) || [])].slice(0, 5);
      return `<div class="pl-done"><div class="big-check on" aria-hidden="true">✓</div><h2 tabindex="-1">Lesson ${lessonNo(l.id)} done</h2>
        <p class="muted">${right} of ${qs.length} quick checks right${right < qs.length ? '. Misses come back in review tomorrow.' : '.'}</p>
        ${terms.length ? `<div class="pl-terms"><small class="task-tag">You can now explain</small><div class="chips">${terms.map(t => { t = t.replace(/<\/?b>/g, ''); return `<span class="chipbtn">${t[0].toUpperCase() + t.slice(1)}</span>`; }).join('')}</div></div>` : ''}</div>`;
    }
  }
  return '';
}

/* hands-on widgets */
function plWidget(w){
  const W = playerUi.w || (playerUi.w = {v:9, seen:{}, done:false, sorted:{}, cur:null});
  if (w.kind === 'demand') return `<small class="task-tag">Try it</small><h2 tabindex="-1" class="pl-q">${w.ask}</h2>
    <label class="pl-range"><span>Time of day</span><input type="range" id="plDemand" min="0" max="23" step="1" value="${W.v}" data-act="plDemand"></label>
    <div id="plDemandOut">${plDemandOut(w)}</div>`;
  // sort
  const left = w.items.map((it, i) => i).filter(i => W.sorted[i] == null), cur = W.cur != null && W.sorted[W.cur] == null ? W.cur : left[0];
  return `<small class="task-tag">Try it</small><h2 tabindex="-1" class="pl-q">${w.ask}</h2>
    ${cur != null ? `<div class="pl-sortcard"><b>${w.items[cur].t}</b><div class="btns"><button class="btn" data-act="plSort" data-i="${cur}" data-v="aws">AWS</button><button class="btn" data-act="plSort" data-i="${cur}" data-v="you">You</button></div></div>`
      : `<p class="pl-note">${w.then}</p>`}
    <div class="pl-bins">${['aws', 'you'].map(b => `<div class="pl-bin"><b>${b === 'aws' ? 'AWS: security OF the cloud' : 'You: security IN the cloud'}</b><ul>${w.items.map((it, i) => W.sorted[i] === b
      ? `<li class="${it.who === b ? 'ok' : 'no'}">${it.who === b ? '✓' : '✗'} ${it.t}${it.who === b ? '' : `<small>${it.why}</small>`}</li>` : '').join('')}</ul></div>`).join('')}</div>`;
}
function plDemandOut(w){
  const W = playerUi.w, h = W.v, need = w.need[h], own = w.fixed;
  const box = (n, cls) => [...Array(n)].map(() => `<i class="${cls}"></i>`).join('');
  const away = Math.max(0, need - own), idle = Math.max(0, own - need);
  return `<div class="pl-clock">${String(h).padStart(2, '0')}:00 · ${need} server${need > 1 ? 's' : ''} needed</div>
    <div class="pl-row"><b>Your own data center</b><small>${own} servers, bought up front</small>
      <div class="pl-srv">${box(Math.min(need, own), 'busy')}${box(idle, 'idle')}${box(away, 'away')}</div>
      <small class="${away ? 'bad' : idle ? 'warn' : 'good'}">${away ? `${away} server${away > 1 ? 's' : ''} short: visitors turned away` : idle ? `${idle} idle, still paid for` : 'just right, this hour'}</small></div>
    <div class="pl-row"><b>The cloud</b><small>adds and removes servers as needed</small>
      <div class="pl-srv">${box(need, 'busy')}</div><small class="good">${need} running, 0 idle, nobody turned away</small></div>
    ${W.done ? `<p class="pl-note">${w.then}</p>` : ''}`;
}

// The footer: Check for questions, then the answer sheet; Continue (and Skip) for everything else.
function plFoot(s){
  const last = playerUi.i === playerUi.list.length - 1;
  if (s.k === 'q' || s.k === 'guess') {
    if (!playerUi.checked) return `<div class="pl-foot"><button class="btn big" data-act="plCheck" id="plNext" ${playerUi.sel == null ? 'disabled' : ''}>Check</button>
      ${s.k === 'guess' ? '<button class="link" data-act="plDunno">I don\'t know yet: show me</button>' : ''}</div>`;
    const q = s.k === 'q' ? s.q : GUESS[playerUi.id], ok = playerUi.sel === q.a, none = playerUi.sel == null;
    const head = ok ? (s.k === 'guess' ? 'Good guess!' : 'Right!')
      : none ? `Here's the answer: ${LETTERS[q.a]}: ${plain(q.o[q.a][0])}.`
      : s.k === 'guess' ? `Good try. It's ${LETTERS[q.a]}: ${plain(q.o[q.a][0])}.` : `Not quite. It's ${LETTERS[q.a]}: ${plain(q.o[q.a][0])}.`;
    return `<div class="pl-foot sheet ${ok ? 'ok' : none ? 'info' : 'no'}" role="status"><div class="pl-fb" tabindex="-1"><b>${head}</b> ${q.x}</div>
      ${s.k === 'q' && !ok && !playerUi.hint ? '<button class="link" data-act="plHint">Show me the idea again</button>' : ''}
      <button class="btn big" data-act="plNext" id="plNext">Continue</button></div>`;
  }
  if (last) return `<div class="pl-foot"><button class="btn big" data-act="plFinish" id="plNext">${playerUi.from === 'today' ? (S.done[playerUi.id] ? 'Back to Home' : 'Mark done and go back') : S.done[playerUi.id] ? 'Back to the map' : 'Mark done and go to the map'}</button></div>`;
  const ready = plReady(), gated = ['match', 'widget', 'flow', 'sim'].includes(s.k);
  return `<div class="pl-foot"><button class="btn big" data-act="plNext" id="plNext" ${ready ? '' : 'disabled'}>${s.k === 'hook' ? 'Start' : 'Continue'}</button>
    ${gated && !ready ? '<button class="link" data-act="plNext" data-v="skip">Skip this one</button>' : ''}</div>`;
}

/* The lesson map on Learn: one path, a stop per lesson, in exam-domain colours */
function lessonMap(){
  const cur = nextLesson();
  let h = cur ? '' : `<div class="note">All ${LESSONS.length} lessons done. Use Practice for the questions you haven't got right yet, and a full mock exam.</div>`;
  h += `<div class="map-intro"><b>Your path</b><span class="muted small">Tap a lesson to play it step by step. "Overview" opens the full lesson to revise.</span></div>`;
  for (const [d, D] of Object.entries(DOMAINS)) {
    const ls = LESSONS.filter(l => l.d === d);
    h += `<section class="map-sec" style="${domainVars(d)}"><h2 class="group-h">${chip(d)}${D.name}<small>${D.w} % of the exam · ${ls.filter(l => S.done[l.id]).length}/${ls.length} done</small></h2>
      ${FLOWS[d] ? domainFlowHTML(d) : ''}<ol class="map">`;
    let x = 0;
    ls.forEach(l => {
      const k = LESSONS.indexOf(l), done = !!S.done[l.id], here = l === cur, late = !done && daysUntil(l.due) < 0;
      h += `<li class="map-stop ${done ? 'done' : ''} ${here ? 'here' : ''}" style="--x:${[0, 1, 2, 1][x++ % 4]}">
        <button class="map-node" data-act="play" data-id="${l.id}" aria-label="Lesson ${k + 1}: ${esc(l.t)}${done ? ', done' : here ? ', up next' : ''}">${done ? '✓' : k + 1}</button>
        <span class="map-t"><b>${l.t}</b><small class="${late ? 'late' : ''}">${done ? 'done' : (S.stage[l.id] ? `In progress: ${STAGES[S.stage[l.id]]} · ` : '') + (late ? 'was due ' : 'due ') + fmtDate(l.due)}</small>${here ? '<span class="pill pill-next">Up next</span>' : ''}<button class="link small" data-act="openLesson" data-id="${l.id}">Overview</button></span></li>`;
      // A lab comes right after its main lesson (the first it lists).
      LABS.filter(lab => lab.lessons[0] === l.id).forEach(lab => {
        const st = S.labs[lab.id] || [], all = !!S.sims[lab.id] || st.filter(Boolean).length === lab.steps.length;
        h += `<li class="map-stop lab ${all ? 'done' : ''}" style="--x:${[0, 1, 2, 1][x++ % 4]}">
          <button class="map-node lab" data-act="labPlay" data-id="${lab.id}" aria-label="Lab: ${esc(lab.t)}${all ? ', done' : ''}">${all ? '✓' : '⚗'}</button>
          <span class="map-t"><small class="task-tag">Hands-on lab · optional</small><b>${lab.t}</b><small>about ${lab.min} min · right here in the app</small></span></li>`;
      });
    });
    h += '</ol></section>';
  }
  return h;
}

/* ---------- A lab, played like a lesson: the practice console full screen, with a coach ---------- */
// Opened from a lab stop on the path, or from a lesson's "Try it hands-on" screen. Closing returns there.
// The real AWS console cannot be shown inside the app (AWS blocks that, and it needs your login), so its
// steps are an optional extra at the end.
let labPlay = null;   // the lab on screen (not saved)
function labPlayView(){
  const lab = LABS.find(x => x.id === labPlay), sim = LAB_SIMS[lab.id], st = labState(lab.id), n = sim.steps.length;
  const done = st.step >= n, pct = Math.round(Math.min(st.step, n) / n * 100);
  return `<div class="player lab-play">
    <div class="pl-top"><button class="pl-x" data-act="labClose" aria-label="Close the lab">✕</button>
      <div class="pl-bar" role="progressbar" aria-label="Lab progress" aria-valuenow="${Math.min(st.step, n)}" aria-valuemin="0" aria-valuemax="${n}"><i style="width:${pct}%"></i></div>
      <span class="pl-n">${Math.min(st.step + 1, n)}/${n}</span></div>
    <div class="pl-screen">${done ? `<div class="pl-done"><div class="big-check on" aria-hidden="true">✓</div><h2 tabindex="-1">Lab done: ${lab.t}</h2>
        <p class="muted">You know the screens, the buttons and the traps. Nothing was created in AWS.</p>
        <div class="btns" style="justify-content:center"><button class="btn" data-act="labClose">Back</button><button class="btn ghost" data-act="labRestart" data-id="${lab.id}">Do it again</button></div>
        <p class="small muted" style="margin-top:18px">Optional: try it for real in your own AWS account (Free plan). <button class="link" data-act="labReal" data-id="${lab.id}">See the real console steps</button></p></div>`
      : `<small class="task-tag">Hands-on lab · practice console</small><h2 tabindex="-1" class="pl-q">${lab.t}</h2>${labSimHTML(lab)}`}</div></div>`;
}
