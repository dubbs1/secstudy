/* ---------- Mock exam: the real format, timed, results only at the end ---------- */
// The real count and time (more with extra time), drawn by exam weight, unseen questions first. Flag what you are
// unsure of, review the list, submit. At zero the clock says "Time is up" and waits for a tap: nothing moves by itself.
// One domain on its own is a mini mock: 12 questions, the same pace. Answers count like any other answer afterwards.
const MOCK_FULL = {cc:16, sec:19, tech:22, bill:8};   // the full exam's question count, in its domain weights
const MOCK_MINI = 12;
const MOCK_KEEP = 10;   // past results kept
let mockShow = null;    // the past result on screen (not saved)
let mockConfirm = false, mockOpen = null, mockTick = null;

const examMins = () => EXAM.minutes + (S.prefs.extra ? EXAM.extraMinutes : 0);
const mockLeft = () => S.mock ? Math.max(0, S.mock.start + S.mock.mins * 60000 - Date.now()) : 0;
const mockName = kind => kind === 'full' ? 'Full mock exam' : `${DOMAINS[kind].name} mini mock`;
function lastMock(){
  const full = Object.values(S.mocks).filter(m => m.kind === 'full').sort((a, b) => b.at - a.at);
  return full[0] || null;
}
// Unseen questions first, then the ones answered longest ago; shuffled within each, then mixed across domains.
function mockDraw(d, n){
  const pool = QUESTIONS.filter(q => LESSONS.find(l => l.id === q.l).d === d)
    .map(q => ({q, k:S.ans[q.id] ? S.ans[q.id].at || 1 : 0, r:Math.random()}))
    .sort((a, b) => a.k - b.k || a.r - b.r);
  return pool.slice(0, n).map(x => x.q.id);
}
function shuffle(a){ for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mockStart(kind){
  const plan = kind === 'full' ? MOCK_FULL : {[kind]:MOCK_MINI};
  const ids = shuffle(Object.entries(plan).flatMap(([d, n]) => mockDraw(d, n)));
  const per = examMins() / EXAM.questions;   // minutes per question, as on the real exam
  S.mock = {ids, picks:{}, flags:{}, start:Date.now(), mins:kind === 'full' ? examMins() : Math.round(ids.length * per), kind, i:0, list:false, over:false};
  mockConfirm = false; mockShow = null; mockOpen = null;
}
function mockFinish(){
  const M = S.mock, dom = {};
  let right = 0, sureWrong = 0;
  for (const id of M.ids) {
    const q = QUESTIONS.find(x => x.id === id), d = LESSONS.find(l => l.id === q.l).d, p = M.picks[id];
    const ok = p != null && isRight(q, p);
    if (p != null) record(id, p, !M.flags[id]);
    else schedule(id, false);   // a blank comes back in review like a miss
    (dom[d] = dom[d] || [0, 0])[1]++;
    if (ok) { dom[d][0]++; right++; } else if (p != null && !M.flags[id]) sureWrong++;
  }
  const at = Date.now();
  S.mocks['m' + at] = {at, kind:M.kind, n:M.ids.length, right, used:Math.min(M.mins, Math.round((at - M.start) / 60000)), mins:M.mins,
    dom, sureWrong, ids:M.ids, picks:M.picks, flags:M.flags};
  Object.keys(S.mocks).sort((a, b) => S.mocks[b].at - S.mocks[a].at).slice(MOCK_KEEP).forEach(k => delete S.mocks[k]);
  S.mock = null; mockShow = 'm' + at; mockConfirm = false; mockOpen = null;
  studied();
}

// Where you should be by now, said calmly: on track, or a little behind.
function mockPace(){
  const M = S.mock, n = M.ids.length, done = Object.keys(M.picks).length;
  const used = (Date.now() - M.start) / (M.mins * 60000), expect = Math.floor(used * n);
  return done >= expect - 2 ? 'on track' : 'a little behind: about ' + Math.round(M.mins * 60 / n) + ' s a question';
}
function startMockTick(){
  clearInterval(mockTick);
  if (!S.mock || S.mock.over || S.tab !== 'practice') return;
  mockTick = setInterval(() => {
    if (!S.mock) { clearInterval(mockTick); return; }
    const ms = mockLeft(), c = $('#mockClock'), p = $('#mockPace');
    if (c) c.textContent = mmss(ms) + ' left';
    if (p) p.textContent = mockPace();
    if (ms <= 0) { clearInterval(mockTick); S.mock.over = true; save(); focusTo = '[data-act=mSubmit]'; render(); announce('Time is up. Your answers are saved.'); }
  }, 1000);
}

function mockView(){
  const M = S.mock;
  if (M.over || mockLeft() <= 0) {
    M.over = true;
    return `<div class="card open mock"><div class="body"><div class="finish"><div class="big-check" aria-hidden="true">⏱</div>
      <b>Time is up</b><p class="muted">Your answers are saved: ${Object.keys(M.picks).length} of ${M.ids.length} answered.</p></div>
      <div class="btns"><button class="btn" data-act="mSubmit" data-v="1">See results</button></div></div></div>`;
  }
  const head = `<div class="mock-head"><span><b>${mockName(M.kind)}</b><small id="mockPace">${mockPace()}</small></span>
    <span class="mock-clock" id="mockClock" aria-live="off">${mmss(mockLeft())} left</span></div>`;
  if (M.list) {
    const blank = M.ids.filter(id => M.picks[id] == null).length, flagged = M.ids.filter(id => M.flags[id]).length;
    return `<div class="card open mock"><div class="body">${head}
      <h3 tabindex="-1">Review your answers</h3><p class="muted small">${M.ids.length - blank} answered · ${flagged} flagged · ${blank} blank. Tap a number to go back to it.</p>
      <div class="mock-grid">${M.ids.map((id, k) => `<button class="${M.picks[id] != null ? 'done' : 'blank'} ${M.flags[id] ? 'flag' : ''}" data-act="mGo" data-i="${k}"
        aria-label="Question ${k + 1}: ${M.picks[id] != null ? 'answered' : 'blank'}${M.flags[id] ? ', flagged' : ''}">${k + 1}</button>`).join('')}</div>
      <p class="mock-key small muted"><span class="done">1</span> answered <span class="flag">1</span> flagged <span class="blank">1</span> blank</p>
      ${mockConfirm && blank ? `<div class="note warn" tabindex="-1" id="mockWarn"><b>${blank} question${blank > 1 ? 's are' : ' is'} blank.</b> A blank is always wrong; a guess might be right, and wrong answers cost nothing extra.
        <div class="btns"><button class="btn" data-act="mGo" data-i="${M.ids.findIndex(id => M.picks[id] == null)}">Go to the first blank</button><button class="btn ghost" data-act="mSubmit" data-v="1">Submit anyway</button></div></div>`
      : `<div class="btns"><button class="btn" data-act="mSubmit">Submit</button><button class="btn ghost" data-act="mGo" data-i="${M.i}">Back to question ${M.i + 1}</button></div>`}
      <p class="center small"><button class="link" data-act="mQuit">Stop this mock (nothing is saved)</button></p></div></div>`;
  }
  const q = QUESTIONS.find(x => x.id === M.ids[M.i]), p = M.picks[q.id], many = multi(q);
  const on = i => many ? Array.isArray(p) && p.includes(i) : p === i;
  return `<div class="card open mock"><div class="body">${head}
    <div class="qhead"><span>Question ${M.i + 1} of ${M.ids.length}</span>${speakBtn(q.q)}</div>
    <p class="qt" tabindex="-1">${q.q}</p>${many ? `<p class="muted small choose">Choose ${q.a.length}. ${Array.isArray(p) ? p.length : 0} chosen.</p>` : ''}
    <div role="${many ? 'group' : 'radiogroup'}" aria-label="Answers">${q.o.map(([t], i) => `<button class="opt ${on(i) ? 'picked' : ''}" data-act="mPick" data-i="${i}"
      role="${many ? 'checkbox' : 'radio'}" aria-checked="${on(i)}"><span class="k">${LETTERS[i]}</span><span>${t}</span></button>`).join('')}</div>
    <div class="mock-nav">
      <button class="btn ghost" data-act="mGo" data-i="${M.i - 1}" ${M.i ? '' : 'disabled'}>‹ Back</button>
      <button class="btn ghost flagbtn" data-act="mFlag" aria-pressed="${!!M.flags[q.id]}">${M.flags[q.id] ? '⚑ Flagged' : '⚐ Flag: not sure'}</button>
      ${M.i < M.ids.length - 1 ? `<button class="btn" data-act="mGo" data-i="${M.i + 1}">Next ›</button>` : `<button class="btn" data-act="mList">Review ›</button>`}</div>
    <p class="center small"><button class="link" data-act="mList">See all questions and submit</button></p></div></div>`;
}

// One question from a finished mock: what you picked, the right answer, and why.
function mockItem(q, p){
  const many = multi(q), picked = i => many ? Array.isArray(p) && p.includes(i) : p === i, right = i => many ? q.a.includes(i) : i === q.a;
  return `<div class="mock-item"><p class="qt">${q.q}</p>${q.o.map(([t, why], i) => `<div class="opt ${right(i) ? 'right' : picked(i) ? 'wrong' : 'dim'}"><span class="k">${LETTERS[i]}</span>
    <span>${t}${picked(i) && !right(i) ? `<small class="why">${why}</small>` : ''}</span></div>`).join('')}
    <div class="fb ${isRight(q, p) ? 'ok' : 'no'}"><b>${p == null ? 'Left blank.' : isRight(q, p) ? 'Right.' : ''} The answer is ${many ? q.a.map(i => LETTERS[i]).join(' and ') : LETTERS[q.a]}.</b> ${q.x}</div></div>`;
}
function mockResult(key){
  const R = S.mocks[key]; if (!R) { mockShow = null; return ''; }
  const pct = Math.round(R.right / R.n * 100);
  const qs = R.ids.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  const groups = [
    ['Sure, but wrong', 'Fix these first: a confident mistake corrected now tends to stay corrected.', qs.filter(q => R.picks[q.id] != null && !R.flags[q.id] && !isRight(q, R.picks[q.id]))],
    ['Other misses and blanks', '', qs.filter(q => !isRight(q, R.picks[q.id]) && !(R.picks[q.id] != null && !R.flags[q.id]))],
    ['Right, but flagged', 'Lucky or nearly sure: these come back in review too.', qs.filter(q => R.flags[q.id] && isRight(q, R.picks[q.id]))]
  ];
  return `<div class="card open mock"><div class="body">
    <div class="finish"><div class="big-check ${pct >= 80 ? 'on' : ''}" aria-hidden="true">${pct >= 80 ? '✓' : pct + '%'}</div>
    <b tabindex="-1">${mockName(R.kind)}: ${R.right} of ${R.n} right (${pct} %)</b>
    <p class="muted">${fmtDate(isoOf(new Date(R.at)))} · ${R.used} of ${R.mins} min. The real exam passes at ${EXAM.pass} of ${EXAM.scale}. Aim for 80 % here; it is a guide, not a promise.</p></div>
    <h3>By domain</h3>${Object.entries(R.dom).map(([d, [r, n]]) => { const p = Math.round(r / n * 100), met = p >= 70;
      return `<div class="wk"><div class="wk-top"><span>${chip(d)}${r}/${n} right</span><span class="pill ${met ? 'pill-done' : 'pill-late'}">${met ? 'Meets' : 'Needs work'}</span></div>
      <div class="bar" style="margin:4px 0 0"><i style="width:${Math.max(p, 3)}%;background:${p >= 80 ? 'var(--ok)' : met ? 'var(--warn)' : 'var(--bad)'}"></i></div></div>`; }).join('')}
    <p class="muted small">Everything you missed, left blank or flagged is in your review queue.</p>
    ${groups.filter(g => g[2].length).map(([t, say, list]) => `<h3>${t} (${list.length})</h3>${say ? `<p class="muted small">${say}</p>` : ''}
      <ul class="hits">${list.map(q => `<li><button class="row-link" data-act="mOpen" data-q="${q.id}" aria-expanded="${mockOpen === q.id}">
        <small>${chip(LESSONS.find(l => l.id === q.l).d)}Lesson ${lessonNo(q.l)}</small><span>${plain(q.q)}</span></button>
        ${mockOpen === q.id ? mockItem(q, R.picks[q.id]) : ''}</li>`).join('')}</ul>`).join('')}
    <div class="btns"><button class="btn" data-act="mClose">Done</button></div></div></div>`;
}

function mockCard(){
  const past = Object.entries(S.mocks).sort((a, b) => b[1].at - a[1].at).slice(0, 3);
  return `<div class="card"><div class="body"><h3>Mock exam</h3>
    <p class="muted small">Like the real one: ${EXAM.questions} questions, ${examMins()} minutes, some "Choose two". Flag what you're not sure of. Results only at the end.${S.prefs.extra ? ' Extra time is on (Settings, on Today).' : ''}</p>
    <div class="btns"><button class="btn" data-act="mStart" data-v="full">Start a full mock</button></div>
    <p class="muted small" style="margin:10px 0 4px">Or one domain, ${MOCK_MINI} questions:</p>
    <div class="chips">${Object.entries(DOMAINS).map(([d, D]) => `<button class="chipbtn" data-act="mStart" data-v="${d}">${D.short}</button>`).join('')}</div>
    ${past.length ? `<h3>Past results</h3><ul class="hits">${past.map(([k, m]) => `<li><button class="row-link" data-act="mShow" data-v="${esc(k)}">
      <small>${fmtDate(isoOf(new Date(m.at)))}</small><span>${mockName(m.kind)}: ${Math.round(m.right / m.n * 100)} % (${m.right}/${m.n})</span></button></li>`).join('')}</ul>` : ''}
    </div></div>`;
}
