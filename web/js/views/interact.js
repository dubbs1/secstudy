/* ---------- hands-on practice: flip cards and diagram games ---------- */
// Built from content that already exists (key points and VISUALS), so nothing new needs fact-checking.
// State lives only for this visit: practising never changes saved progress beyond today's study day.
const ui = {mode:{}, cards:{}, game:{}};

// Same order every time for a lesson (no reshuffle on each redraw), different between lessons.
function seeded(str){ let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function shuffled(list, key){ const r = seeded(key), a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Numbers worth remembering (15 minutes, 90 %, 12 hours) in their own colour. Only text between tags is
// touched, never tag names, attributes, code or entities; digits inside names (S3, eu-central-1) are left alone.
function markNumbers(html){
  let inCode = false;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) { if (/^<code/i.test(part)) inCode = true; if (/^<\/code/i.test(part)) inCode = false; return part; }
    if (inCode) return part;
    // "Route 53" is a name, not a number; a full stop after a number stays outside the highlight.
    return part.replace(/(?<![\w\-.&#;/])(?<!Route )(\d+(?:[.,]\d+)*(?:\s?(?:%|ms|milliseconds?|seconds?|minutes?|min|hours?|h|days?|years?|nines|months?))?)(?![\w\-])/g, '<span class="num">$1</span>');
  }).join('');
}

/* flip cards: terms from the key points ("<b>Term</b>: meaning"), then from tile and scale diagrams */
function flashCards(l){
  const seen = new Set(), out = [];
  const add = (term, back) => { const k = term.toLowerCase(); if (!seen.has(k) && back) { seen.add(k); out.push([term, back]); } };
  for (const p of l.pts) for (const m of p.matchAll(/<b>([^<]{2,40})<\/b>\s*(?:\([^)]*\))?\s*:\s*([^<]*?)(?=\s*<b>|$)/g)) add(m[1], plain(m[2]).replace(/[.,;]\s*$/, '').trim());
  const v = VISUALS[l.id];
  if (v && v.kind === 'tiles') v.tiles.forEach(t => add(t.title, `${t.text} (${t.tag})`));
  if (v && v.kind === 'scale') v.steps.forEach(s => add(s.name, s.note));
  return out.slice(0, 10);
}
function cardsHTML(l){
  const all = flashCards(l), st = ui.cards[l.id] || (ui.cards[l.id] = {order:all.map((c, i) => i), pos:0, flipped:false, got:0, again:0});
  if (st.pos >= st.order.length) {
    return `<div class="deck-done"><b>All ${all.length} cards seen: ${st.got} got it, ${st.again} to go again.</b>
      <div class="btns"><button class="btn" data-act="cardsRestart" data-id="${l.id}">Go through them again</button></div></div>`;
  }
  const [front, back] = all[st.order[st.pos]];
  return `<div class="deck"><div class="deck-count">Card ${st.pos + 1} of ${st.order.length} · ${st.got} got it</div>
    <button class="flipcard ${st.flipped ? 'flipped' : ''}" data-act="flip" data-id="${l.id}" aria-pressed="${st.flipped}">
      <small>${st.flipped ? esc(front) + ' means' : 'Say what it means, then flip'}</small>
      <span>${st.flipped ? esc(back) : esc(front)}</span></button>
    ${st.flipped ? `<div class="btns deck-btns"><button class="btn good" data-act="cardGot" data-id="${l.id}">✓ Got it</button>
      <button class="btn ghost" data-act="cardAgain" data-id="${l.id}">↻ Again later</button></div>`
                 : `<p class="muted small center">Tap the card to flip it.</p>`}</div>`;
}

/* diagram games, one per diagram kind */
function gameQuestions(l){
  const v = VISUALS[l.id], key = l.id;
  if (v.kind === 'compare') return {kind:'pick', prompt:'Which side does each one belong to?',
    qs:shuffled(v.cols.flatMap((c, ci) => c.items.map(it => ({text:it, answer:ci}))), key),
    options:v.cols.map(c => c.title)};
  if (v.kind === 'tiles') {
    const titles = v.tiles.map(t => t.title);
    return {kind:'pick', prompt:'Which one fits each clue?', qs:shuffled(v.tiles, key).map((t, i) => {
      const others = shuffled(titles.filter(x => x !== t.title), key + i).slice(0, 2);
      const opts = shuffled([t.title, ...others], key + 'o' + i);
      return {text:t.tag, sub:t.text, opts, answer:opts.indexOf(t.title)};
    })};
  }
  if (v.kind === 'nested') {
    const qs = [];
    const kids = v.box.children || [];
    const counts = {}; kids.forEach(k => (k.items || []).forEach(it => counts[it] = (counts[it] || 0) + 1));
    kids.forEach((k, ki) => (k.items || []).filter(it => counts[it] === 1).forEach(it => qs.push({text:`Where does "${it}" go?`, opts:kids.map(x => x.title), answer:ki})));
    (v.side || []).forEach(sd => { const opts = v.side.map(x => x.title); qs.push({text:sd.note, opts, answer:opts.indexOf(sd.title)}); });
    return {kind:'pick', prompt:'Place each one.', qs:shuffled(qs, key)};
  }
  if (v.kind === 'scale') return {kind:'order', prompt:`Tap them in order, from "${v.from}" to "${v.to}".`, items:shuffled(v.steps.map((s, i) => ({text:s.name, answer:i})), key)};
  return {kind:'who', prompt:'Tap each box to say who manages that layer, then check.'};
}
function gameState(l){ return ui.game[l.id] || (ui.game[l.id] = {picks:{}, cur:0, seq:[], cells:{}, checked:false}); }
function gameHTML(l){
  const v = VISUALS[l.id], g = gameQuestions(l), st = gameState(l);
  let h = `<p class="muted lead">${g.prompt}</p>`, right = 0, total = 0, finished = false;
  if (g.kind === 'pick') {
    // One question at a time: dots show the results so far, Next moves on after the feedback.
    total = g.qs.length;
    g.qs.forEach((q, qi) => { if (st.picks[qi] === q.answer) right++; });
    finished = st.cur >= total;
    const dots = g.qs.map((q, qi) => { const p = st.picks[qi]; return `<i class="${p == null ? '' : p === q.answer ? 'ok' : 'no'} ${qi === st.cur ? 'cur' : ''}"></i>`; }).join('');
    h += `<div class="qhead"><span>${finished ? 'Done' : `${st.cur + 1} of ${total}`}</span><span class="dots">${dots}</span></div>`;
    if (!finished) {
      const q = g.qs[st.cur], opts = q.opts || g.options, pick = st.picks[st.cur];
      h += `<ol class="game"><li class="${pick == null ? '' : pick === q.answer ? 'ok' : 'no'}"><b>${q.text}</b>${q.sub ? `<small>${q.sub}</small>` : ''}
        <div class="opts-row">${opts.map((o, oi) => `<button class="chipbtn ${pick === oi ? (oi === q.answer ? 'right' : 'wrong') : pick != null && oi === q.answer ? 'right' : ''}"
          data-act="gPick" data-id="${l.id}" data-i="${st.cur}" data-v="${oi}" ${pick != null ? 'disabled' : ''}>${pick != null && oi === q.answer ? '✓ ' : pick === oi ? '✗ ' : ''}${o}</button>`).join('')}</div>
        ${pick != null ? `<p class="game-fb">${pick === q.answer ? '<b>✓ Right.</b>' : `<b>✗ Not quite.</b> It is ${opts[q.answer]}.`}</p>` : ''}</li></ol>`;
      if (pick != null) h += `<div class="btns"><button class="btn" data-act="gNext" data-id="${l.id}">${st.cur + 1 < total ? 'Next' : 'See your score'}</button></div>`;
    }
  } else if (g.kind === 'order') {
    const n = g.items.length; finished = st.seq.length === n; total = n;
    h += '<ol class="game order">' + g.items.map((it, ii) => {
      const at = st.seq.indexOf(ii), ok = finished && at === it.answer; if (ok) right++;
      return `<li class="${finished ? (ok ? 'ok' : 'no') : ''}"><button class="chipbtn wide ${at >= 0 ? 'picked' : ''}" data-act="gOrder" data-id="${l.id}" data-i="${ii}" ${at >= 0 ? 'disabled' : ''}>
        <span class="ord">${at >= 0 ? at + 1 : '?'}</span>${it.text}${finished ? (ok ? ' ✓' : ` ✗ <small>should be ${it.answer + 1}</small>`) : ''}</button></li>`;
    }).join('') + '</ol>';
  } else {
    total = v.rows.length * v.cols.length;
    const head = `<div class="who-h"></div>` + v.cols.map(c => `<div class="who-h">${c.title}${c.ex ? `<small>${c.ex}</small>` : ''}</div>`).join('');
    const rows = v.rows.map((r, ri) => `<div class="who-r">${r}</div>` + v.cols.map((c, ci) => {
      const k = ri + '_' + ci, val = st.cells[k], truth = ri < c.you ? 'you' : 'them';
      if (st.checked && val === truth) right++;
      const cls = val === 'you' ? 'mine' : val === 'them' ? 'theirs' : 'blank';
      const mark = st.checked ? (val === truth ? ' ✓' : ' ✗') : '';
      return `<button class="who-c ${cls} ${st.checked ? (val === truth ? 'ok' : 'no') : ''}" data-act="gCell" data-id="${l.id}" data-v="${k}" ${st.checked ? 'disabled' : ''}
        aria-label="${r}, ${c.title}: ${val || 'not set'}">${val === 'you' ? 'You' : val === 'them' ? 'Them' : '?'}${mark}</button>`;
    }).join('')).join('');
    h += `<div class="who" style="--cols:${v.cols.length}">${head}${rows}</div>`;
    finished = st.checked;
    if (!st.checked) h += `<div class="btns"><button class="btn" data-act="gCheck" data-id="${l.id}">Check</button></div>`;
  }
  if (finished) h += `<div class="game-score ${right === total ? 'all' : ''}"><b>${right} of ${total} right.</b> ${right === total ? 'All correct.' : 'Look at the ✗ ones, then try again.'}
    <button class="link" data-act="gameReset" data-id="${l.id}">Try again</button></div>`;
  else if (g.kind === 'order') h += `<p class="muted small">${st.seq.length} of ${total} placed. <button class="link" data-act="gameReset" data-id="${l.id}">Start over</button></p>`;
  return h;
}

// A Look / Test yourself (or Points / Flip cards) switch above a stage.
function modeSwitch(l, stage, options){
  const cur = ui.mode[l.id + ':' + stage] || options[0][0];
  return `<div class="seg small mode" role="group" aria-label="Show">${options.map(([v, label]) =>
    `<button data-act="mode" data-id="${l.id}" data-i="${stage}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`).join('')}</div>`;
}
function modeOf(l, stage, dflt){ return ui.mode[l.id + ':' + stage] || dflt; }
