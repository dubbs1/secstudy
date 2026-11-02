/* ---------- Drills: lookalike services side by side, and exam key words (data in content/drills.js) ---------- */
// Lookalikes mix easily confused services in one set, which is when mixing helps most. Key words train reading
// the constraint ("LEAST operational overhead") before the options. Ten at a time; state is for this visit only.
const DRILL_N = 10;
let drillUi = null;   // {kind:'look'|'key', set:[{g, q}], i, picks:[], right}

function drillStart(kind, group){
  let set;
  if (kind === 'key') set = shuffle(KEYWORDS.map(q => ({q}))).slice(0, DRILL_N);
  else {
    const groups = group ? LOOKALIKES.filter(g => g.id === group) : LOOKALIKES;
    // Round-robin over shuffled groups, so neighbours come from different groups (mixed practice).
    const lists = shuffle(groups.map(g => shuffle(g.qs.map(q => ({g:g.id, q})))));
    const want = group ? lists[0].length : DRILL_N;
    set = [];
    for (let k = 0; set.length < want && lists.some(l => l.length); k++) { const l = lists[k % lists.length]; if (l.length) set.push(l.shift()); }
  }
  drillUi = {kind, group:group || null, set, i:0, picks:[], right:0};
}
// The options a drill question offers: the group's services, or the key-word question's own four.
function drillOpts(x){ return drillUi.kind === 'key' ? x.q.o.map(o => o[0]) : LOOKALIKES.find(g => g.id === x.g).items.map(it => it.n); }
function drillAnswer(x){ return drillUi.kind === 'key' ? x.q.a : drillOpts(x).indexOf(x.q.a); }

function drillView(){
  const D = drillUi, title = D.kind === 'key' ? 'Key words' : D.group ? LOOKALIKES.find(g => g.id === D.group).t : 'Lookalikes: mixed';
  if (D.i >= D.set.length) {
    return `<div class="card open"><div class="body"><div class="finish"><div class="big-check on" aria-hidden="true">✓</div>
      <b>${title}: ${D.right} of ${D.set.length} right</b><p class="muted">${D.kind === 'key' ? 'Find the key words first, then rule out every option that breaks them.' : 'Say the one-line difference out loud for any you missed.'}</p></div>
      <div class="btns"><button class="btn" data-act="dStart" data-v="${D.kind}"${D.group ? ` data-id="${D.group}"` : ''}>Another ${D.set.length}</button><button class="btn ghost" data-act="dClose">Done</button></div></div></div>`;
  }
  const x = D.set[D.i], opts = drillOpts(x), a = drillAnswer(x), p = D.picks[D.i], answered = p != null;
  const g = D.kind === 'look' ? LOOKALIKES.find(y => y.id === x.g) : null;
  let h = `<div class="card open drill"><div class="body"><div class="qhead"><span>${title} · ${D.i + 1} of ${D.set.length}</span><button class="link" data-act="dClose">Stop</button></div>
    ${g && !D.group ? `<small class="task-tag">${g.t}</small>` : ''}${g && g.note ? `<p class="muted small">${g.note}</p>` : ''}<p class="qt">${x.q.q}</p><div>`;
  opts.forEach((t, i) => {
    const cls = 'opt' + (answered ? (i === a ? ' right' : i === p ? ' wrong' : ' dim') : '');
    const why = answered && i === p && i !== a && D.kind === 'key' ? `<small class="why">${x.q.o[i][1]}</small>` : '';
    h += `<button class="${cls}" data-act="dPick" data-i="${i}" ${answered ? 'disabled' : ''}><span class="k">${LETTERS[i]}</span><span>${t}${why}</span></button>`;
  });
  h += '</div>';
  if (answered) {
    h += `<div class="fb ${p === a ? 'ok' : 'no'}" tabindex="-1"><b>${p === a ? 'Right.' : 'Not quite: ' + opts[a] + '.'}</b> ${x.q.x}</div>`;
    if (g) h += `<div class="tell"><small class="task-tag">How to tell them apart</small><ul>${g.items.map(it => `<li><b>${it.n}</b>: ${it.cue}</li>`).join('')}</ul></div>`;
    h += `<div class="btns"><button class="btn" data-act="dNext">${D.i + 1 < D.set.length ? 'Next' : 'Finish'}</button></div>`;
  }
  return h + '</div></div>';
}
function drillCard(){
  return `<div class="card"><div class="body"><h3>Drills</h3>
    <p class="muted small">Ten quick questions. Lookalikes mixes services the exam likes to swap; Key words trains reading the question's constraint first.</p>
    <div class="btns"><button class="btn" data-act="dStart" data-v="look">Lookalikes: mixed</button><button class="btn ghost" data-act="dStart" data-v="key">Key words</button></div>
    <p class="muted small" style="margin:10px 0 4px">Or one group:</p>
    <div class="chips">${LOOKALIKES.map(g => `<button class="chipbtn" data-act="dStart" data-v="look" data-id="${g.id}">${g.t}</button>`).join('')}</div></div></div>`;
}
