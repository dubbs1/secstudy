// Shared view parts and per-visit view state (not saved).
const chip = d => `<span class="chip d-${d}">${DOMAINS[d].short}</span>`;
const live = {};   // answers picked this visit, not yet moved on from
let lqi = {};      // which question each lesson quiz is showing
let pCur = null;   // practice: current question id

/* ---------- question ---------- */
// ctx: where the question is shown: 'l' lesson quiz, 'p' practice, 'r' review.
// "Choose two" questions: tap to select, then Check. After an answer, "How sure were you?" (a right guess stays in review).
const liveKey = (ctx, qid) => ctx === 'l' ? qid : ctx + ':' + qid;
function qHTML(q, pick, ctx){
  const answered = pick != null, many = multi(q), sel = live['sel:' + ctx + ':' + q.id] || [];
  const right = i => many ? q.a.includes(i) : i === q.a, picked = i => many ? Array.isArray(pick) && pick.includes(i) : i === pick;
  let h = `<div class="qt-row"><p class="qt">${q.q}</p>${speakBtn(q.q)}</div>${many && !answered ? `<p class="muted small choose">Choose ${q.a.length}. ${sel.length} chosen.</p>` : ''}<div${many ? ' role="group" aria-label="Answers"' : ''}>`;
  q.o.forEach(([text, why], i) => {
    let cls = 'opt';
    if (answered) cls += right(i) ? ' right' : picked(i) ? ' wrong' : ' dim';
    else if (many && sel.includes(i)) cls += ' picked';
    const whyHtml = answered && picked(i) && !right(i) ? `<small class="why">${why}</small>` : '';
    h += `<button class="${cls}" data-act="${many ? 'pickM' : 'pick'}" data-ctx="${ctx}" data-q="${q.id}" data-i="${i}" ${answered ? 'disabled' : ''}${many && !answered ? ` role="checkbox" aria-checked="${sel.includes(i)}"` : ''}><span class="k">${LETTERS[i]}</span><span>${text}${whyHtml}</span></button>`;
  });
  h += '</div>';
  if (many && !answered) h += `<div class="btns"><button class="btn" data-act="pickCheck" data-ctx="${ctx}" data-q="${q.id}" ${sel.length === q.a.length ? '' : 'disabled'}>Check</button></div>`;
  if (answered) {
    const ok = isRight(q, pick), r = S.ans[q.id];
    h += `<div class="fb ${ok ? 'ok' : 'no'}" tabindex="-1"><b>${ok ? 'Right.' : 'The answer is ' + (many ? q.a.map(i => LETTERS[i]).join(' and ') : LETTERS[q.a]) + '.'}</b> ${q.x}</div>`;
    if (r && r.n) h += `<div class="sure" role="group" aria-label="How sure were you?"><span class="muted small">How sure were you?</span>
      <button class="chipbtn" data-act="sure" data-q="${q.id}" data-v="1" aria-pressed="${r.sure === true}">Sure</button>
      <button class="chipbtn" data-act="sure" data-q="${q.id}" data-v="0" aria-pressed="${r.sure === false}">Guessed</button></div>`;
  }
  return h;
}

/* ---------- read aloud ---------- */
// The browser's own voice (works offline where a voice is installed). Off in Settings, or where there is none.
const SPEAK_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>';
const canSpeak = () => S.prefs.speak && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
function speakBtn(html){
  return canSpeak() ? `<button class="speak" data-act="speak" data-v="${esc(plain(html))}" aria-label="Read aloud" title="Read aloud">${SPEAK_ICON}</button>` : '';
}
function speak(text){
  const sy = window.speechSynthesis;
  if (sy.speaking) { sy.cancel(); return; }   // a second tap stops it
  const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95;
  sy.speak(u);
}

/* ---------- links to other sites ---------- */
// In the Windows app a link cannot open the browser, so a tap copies it instead (see app.js).
const extLink = (url, text) => `<a class="link ext" href="${url}" target="_blank" rel="noopener noreferrer" data-ext>${text} ↗</a>`;
const inDesktopApp = () => '__TAURI_INTERNALS__' in window;
