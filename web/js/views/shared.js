// Shared view parts and per-visit view state (not saved).
const chip = d => `<span class="chip d-${d}">${DOMAINS[d].short}</span>`;
const live = {};   // answers picked this visit, not yet moved on from
let lqi = {};      // which question each lesson quiz is showing
let pCur = null;   // practice: current question id

/* ---------- question ---------- */
// ctx: where the question is shown: 'l' lesson quiz, 'p' practice, 'r' review
function qHTML(q, pick, ctx){
  const answered = pick != null;
  let h = `<p class="qt">${q.q}</p><div>`;
  q.o.forEach(([text, why], i) => {
    let cls = 'opt';
    if (answered) cls += i === q.a ? ' right' : i === pick ? ' wrong' : ' dim';
    const whyHtml = answered && i === pick && i !== q.a ? `<small class="why">${why}</small>` : '';
    h += `<button class="${cls}" data-act="pick" data-ctx="${ctx}" data-q="${q.id}" data-i="${i}" ${answered ? 'disabled' : ''}><span class="k">${'ABCD'[i]}</span><span>${text}${whyHtml}</span></button>`;
  });
  h += '</div>';
  if (answered) {
    const ok = pick === q.a;
    h += `<div class="fb ${ok ? 'ok' : 'no'}" tabindex="-1"><b>${ok ? 'Right.' : 'The answer is ' + 'ABCD'[q.a] + '.'}</b> ${q.x}</div>`;
  }
  return h;
}
