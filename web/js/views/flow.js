/* ---------- "How it works": step-through pictures (data in content/flows.js) ---------- */
// Each Next adds one step to the picture and says what happens in it. After the last step the steps can be
// put back in order (the same order game as the diagrams). Per-visit state only, like the other games.
const flowUi = {at:{}, order:{}, open:null};   // step shown, put-in-order game state, open domain flow

// One small drawn icon per kind of thing, so a service is known by its job at a glance (own drawings, not AWS artwork).
const FLOW_ICONS = {
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  onprem:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h6"/>',
  compute:'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  storage:'<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/>',
  db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  net:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  sec:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  money:'<circle cx="12" cy="12" r="9"/><path d="M15 9a3 2.5 0 0 0-3-1.5c-1.7 0-3 .9-3 2s1.3 1.7 3 2 3 .9 3 2-1.3 2-3 2a3 2.5 0 0 1-3-1.5M12 6v12"/>',
  watch:'<path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z"/><circle cx="12" cy="12" r="3"/>',
  ai:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  place:'<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  doc:'<path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h7M9 16h7"/>',
  code:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5v.01"/>'
};
const flowIcon = k => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${FLOW_ICONS[k] || FLOW_ICONS.doc}</svg>`;

function flowAt(key){ return Math.min(flowUi.at[key] || 0, FLOWS[key].rows.length - 1); }

function flowNode(node){
  const inner = `${flowIcon(node.k)}<span><b>${node.t}</b>${node.n ? `<small>${node.n}</small>` : ''}</span>`;
  // In a domain overview each part opens its lesson.
  return node.lesson ? `<button class="fnode link-node" data-act="openLesson" data-id="${node.lesson}">${inner}<span class="chev">›</span></button>`
                     : `<div class="fnode">${inner}</div>`;
}

function flowHTML(key){
  const f = FLOWS[key];
  if (flowUi.order[key]) return flowOrderHTML(key);
  const at = flowAt(key), last = at === f.rows.length - 1;
  const rows = f.rows.slice(0, at + 1).map((r, i) => `${i ? `<div class="flow-arrow" aria-hidden="true"><span>↓</span>${r.via ? `<small>${r.via}</small>` : ''}</div>` : ''}
    <div class="flow-row ${i === at ? 'cur' : 'past'}" style="--n:${r.nodes.length}">${r.nodes.map(flowNode).join('')}</div>`).join('');
  return `<div class="flow" data-flow="${key}"><b class="flow-t">${f.title}</b>
    <div class="flow-say" id="say-${key}"><small>Step ${at + 1} of ${f.rows.length}</small>${markNumbers(f.rows[at].say)}</div>
    <div class="flow-pic" role="${f.rows.some(r => r.nodes.some(n => n.lesson)) ? 'group' : 'img'}" aria-label="${esc(flowText(f, at))}">${rows}</div>
    <div class="btns flow-btns">
      ${at ? `<button class="btn ghost small" data-act="flowBack" data-id="${key}">‹ Previous step</button>` : ''}
      ${last && flowHasOrder(key) ? `<button class="btn small" data-act="flowOrder" data-id="${key}">Put the steps in order</button>
               <button class="link" data-act="flowRestart" data-id="${key}">Watch again</button>`
             : last ? `<button class="btn small" data-act="flowRestart" data-id="${key}">Watch again</button>`
             : `<button class="btn small" data-act="flowNext" data-id="${key}">Next step ›</button>`}
    </div></div>`;
}

// What the picture shows so far, in words: each part with its note, and what links the steps.
function flowText(f, at){
  return f.rows.slice(0, at + 1).map((r, i) => (i && r.via ? r.via + ': ' : '') + r.nodes.map(n => n.t + (n.n ? ` (${n.n})` : '')).join(' and ')).join(', then ');
}
// The flow's steps, shuffled, to tap back into order. Steps with the same rank may swap. Reuses the diagram
// order game's checks and answer list. Never starts in the right order.
function flowGame(key){
  const steps = FLOWS[key].rows.map((r, i) => ({text:r.name, rank:r.rank != null ? r.rank : i}));
  const items = shuffled(steps, 'flow' + key);
  if (items.every((it, i) => it.rank === steps[i].rank)) items.push(items.shift());
  return {kind:'order', items, ranks:steps.map(s => s.rank), steps, left:[]};
}
// A game only when there is an order to find (at least three different places).
function flowHasOrder(key){ return new Set(FLOWS[key].rows.map((r, i) => r.rank != null ? r.rank : i)).size >= 3; }
function flowOrderHTML(key){
  const g = flowGame(key), st = flowUi.order[key], n = g.items.length, finished = st.seq.length === n;
  let right = 0;
  let h = `<p class="muted lead">Tap the steps in the order they happen.</p><ol class="game order">` + g.items.map((it, ii) => {
    const at = st.seq.indexOf(ii), placed = at >= 0, ok = placed && g.ranks[at] === it.rank; if (ok) right++;
    return `<li class="${placed ? (ok ? 'ok' : 'no') : ''}"><button class="chipbtn wide ${placed ? 'picked' : ''}" data-act="flowPick" data-id="${key}" data-i="${ii}" ${placed ? 'disabled' : ''}>
      <span class="ord">${placed ? at + 1 : '?'}</span>${it.text}${placed ? (ok ? ' ✓' : ` ✗ <small>goes at ${goesAt(g, st, ii)}</small>`) : ''}</button></li>`;
  }).join('') + '</ol>';
  if (finished) h += orderAnswer(g) + `<div class="game-score ${right === n ? 'all' : ''}" data-k="flow:${key}:${st.run}"><b>${right} of ${n} right.</b>
    ${right === n ? 'All correct.' : 'Look at the ✗ ones, then watch it again.'}</div>`;
  else h += `<p class="muted small">${st.seq.length} of ${n} placed.</p>`;
  return h + `<div class="btns flow-btns"><button class="btn ghost" data-act="flowRestart" data-id="${key}">Watch the steps again</button>
    ${finished ? `<button class="link" data-act="flowOrder" data-id="${key}">Try again</button>` : ''}</div>`;
}

// The Learn list: one "How this section fits together" picture per exam domain, one open at a time.
function domainFlowHTML(d){
  const open = flowUi.open === d;
  return `<div class="card dflow ${open ? 'open' : ''}" style="${domainVars(d)}"><button class="row" data-act="domainFlow" data-id="${d}" aria-expanded="${open}">
    <span class="n d-${d}">${flowIcon('watch')}</span><span class="t"><b>How this section fits together</b><small>A step-by-step picture of its ${LESSONS.filter(l => l.d === d).length} lessons</small></span>
    <span class="chev">›</span></button>${open ? `<div class="body">${flowHTML(d)}</div>` : ''}</div>`;
}
