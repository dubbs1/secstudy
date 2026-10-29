/* ---------- hands-on practice: flip cards and diagram games ---------- */
// Built from content that already exists (key points and VISUALS), so nothing new needs fact-checking.
// State lives only for this visit: practising never changes saved progress beyond today's study day.
const ui = {mode:{}, cards:{}, game:{}};

// Same order every time for a lesson (no reshuffle on each redraw), different between lessons.
function seeded(str){ let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
function shuffled(list, key){ const r = seeded(key), a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// Numbers worth remembering (15 minutes, 90 %, 24/7, 1 January 2027) highlighted. Only text between tags is
// touched, never tag names, attributes, code or entities; digits inside names (S3, eu-central-1, 5G) are left alone.
const NUM_UNITS = '%|ms|milliseconds?|seconds?|minutes?|min|hours?|h|days?|years?|nines|months?';
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
// "Route 53" is a name, not a number; a full stop after a number stays outside the highlight.
const NUM = new RegExp(`(?<![\\w\\-.&#;/$])(?<!Route )((?:\\d{1,2} )?(?:${MONTHS}) \\d{4}|24/7|\\d+(?:[.,]\\d+)*(?:[\\s-]?(?:${NUM_UNITS}))?)(?![\\w\\-/])`, 'g');
function markNumbers(html){
  let inCode = false;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part.startsWith('<')) { if (/^<code/i.test(part)) inCode = true; if (/^<\/code/i.test(part)) inCode = false; return part; }
    return inCode ? part : part.replace(NUM, '<span class="num">$1</span>');
  }).join('');
}

/* flip cards: every term the key points define, then the diagram's terms, then fill-the-gap cards for numbers */
// A term starts a definition when it is followed by ":" or "=" (with an optional "(note)" between), or stands
// alone with a "(short note)" as in "<b>Lex</b> (chatbots)". The back runs to the next such term, so bold words
// inside a definition (stateful, SCPs) stay on the card. Nothing is capped: every defined term gets a card.
const TERM = /<b>([^<]{2,60})<\/b>\s*(?:\(([^)]*)\))?\s*([:=])?/g;
const tidy = t => t.replace(/[\s,;→]+$/, '').replace(/\.$/, '').trim();
function flashCards(l){
  const cards = [], terms = [];
  const add = (front, back, kind) => cards.push({front, back, kind});
  for (const p of l.pts) {
    const ms = [...p.matchAll(TERM)].filter(m => m[3] || (m[2] && m[2].length >= 4));
    ms.forEach((m, i) => {
      const term = m[1].trim();
      if (terms.some(t => t.toLowerCase() === term.toLowerCase())) return;
      let back;
      if (m[3]) {
        let rest = p.slice(m.index + m[0].length, i + 1 < ms.length ? ms[i + 1].index : p.length);
        // Before a "<b>Lex</b> (chatbots)" style term, stop at the end of the sentence, not mid-list.
        if (i + 1 < ms.length && !ms[i + 1][3] && rest.includes('. ')) rest = rest.slice(0, rest.lastIndexOf('. ') + 1);
        back = tidy((m[2] ? `(${m[2]}) ` : '') + plain(rest));
      } else back = tidy(plain(m[2]));
      if (back) { terms.push(term); add(term, back, 'term'); }
    });
  }
  // Diagram terms only when the key points do not already have them ("Artifact" next to "AWS Artifact"):
  // all words of the shorter name appear in the longer one. Names under 3 letters ("S3") never match.
  const words = t => t.toLowerCase().split(/[\s/]+/).filter(w => w && w !== 'or');
  const known = name => terms.some(t => {
    const [short, long] = [words(t), words(name)].sort((x, y) => x.length - y.length);
    return short.join(' ').length >= 3 && short.every(w => long.includes(w));
  });
  const v = VISUALS[l.id], extra = v && v.kind === 'tiles' ? v.tiles.map(t => [t.title, `${t.text} (${t.tag})`])
    : v && v.kind === 'scale' ? v.steps.map(s => [s.name, s.note]) : [];
  extra.forEach(([term, back]) => { if (!known(term)) { terms.push(term); add(term, tidy(back), 'term'); } });
  // Fill the gap: the numbers on a card hidden, the card's term as the clue.
  cards.filter(c => c.kind === 'term').forEach(c => {
    const nums = c.back.match(NUM);
    if (nums) add(`${c.front}: ${c.back.replace(NUM, '____')}`, nums.join(' · '), 'gap');
  });
  return cards;
}
function cardsHTML(l){
  const all = flashCards(l), st = ui.cards[l.id] || (ui.cards[l.id] = {order:all.map((c, i) => i), pos:0, flipped:false, got:0, again:[]});
  if (st.pos >= st.order.length) {
    return `<div class="deck-done"><b>Deck done: all ${all.length} cards.</b>
      <p>${st.again.length ? `${st.got} right first time, ${st.again.length} needed a second go.` : 'All right first time.'}</p>
      <div class="btns"><button class="btn" data-act="cardsRestart" data-id="${l.id}">Go through them again</button></div></div>`;
  }
  const c = all[st.order[st.pos]], gap = c.kind === 'gap';
  const hint = st.flipped ? (gap ? 'The answer' : esc(c.front) + ' means') : gap ? 'Fill the gap, then flip' : 'Say what it means, then flip';
  return `<div class="deck"><div class="deck-count">Card ${st.pos + 1} of ${st.order.length} · ${st.got} right first time</div>
    <button class="flipcard ${st.flipped ? 'flipped' : ''} ${gap ? 'gap' : ''}" data-act="flip" data-id="${l.id}" aria-pressed="${st.flipped}">
      <small>${hint}</small>
      <span>${st.flipped ? markNumbers(esc(c.back)) : esc(c.front)}</span></button>
    ${st.flipped ? `<div class="btns deck-btns"><button class="btn good" data-act="cardGot" data-id="${l.id}">✓ Got it</button>
      <button class="btn ghost" data-act="cardAgain" data-id="${l.id}">↻ Again later</button></div>`
                 : `<p class="muted small center">Tap the card to flip it.</p>`}</div>`;
}

/* diagram games, one per diagram kind */
// Each wrong pick offers three choices at most: the answer and two others.
function threeOptions(answer, all, key){
  const opts = shuffled([answer, ...shuffled(all.filter(x => x !== answer), key).slice(0, 2)], key + 'o');
  return {opts, answer:opts.indexOf(answer)};
}
function gameQuestions(l){
  const v = VISUALS[l.id], key = l.id;
  if (v.kind === 'compare') return {kind:'pick', prompt:'Which side does each one belong to?',
    qs:shuffled(v.cols.flatMap((c, ci) => c.items.map(it => ({text:it, answer:ci}))), key),
    options:v.cols.map(c => c.title)};
  if (v.kind === 'tiles') {
    // When every tile has the same tag ("Pillar"), the tile's text is the clue.
    const titles = v.tiles.map(t => t.title), tagged = new Set(v.tiles.map(t => t.tag)).size === v.tiles.length;
    return {kind:'pick', prompt:'Which one fits each clue?', qs:shuffled(v.tiles, key).map((t, i) =>
      ({text:tagged ? t.tag : t.text, sub:tagged ? t.text : '', why:`${t.title}: ${t.text}`, ...threeOptions(t.title, titles, key + i)}))};
  }
  if (v.kind === 'nested') {
    // Places: the outer box, the inner boxes (one place per label) and the side boxes. Clues: their notes and items.
    const places = [], clues = [], where = {};
    const place = b => { const n = b.label || b.title; if (!places.includes(n)) places.push(n); return n; };
    const box = v.box, outer = place(box);
    if (box.note) clues.push({text:box.note, answer:outer});
    (box.children || []).forEach(k => {
      const n = place(k);
      if (k.note) clues.push({text:k.note, answer:n});
      (k.items || []).forEach(it => (where[it] = where[it] || new Set()).add(n));
    });
    Object.entries(where).forEach(([it, ns]) => { if (ns.size === 1) clues.push({text:`Where does "${it}" sit?`, answer:[...ns][0]}); });
    (v.side || []).forEach(sd => clues.push({text:sd.note, answer:place(sd)}));
    return {kind:'pick', prompt:'Which one is it?', qs:shuffled(clues, key).map((c, i) => ({text:c.text, ...threeOptions(c.answer, places, key + i)}))};
  }
  if (v.kind === 'scale') {
    // Steps with the same rank may go in either order; unranked steps are left out.
    const steps = v.steps.map((s, i) => ({text:s.name, rank:s.rank != null ? s.rank : i, out:s.unranked})).filter(s => !s.out);
    return {kind:'order', prompt:`Tap them in order, from "${v.from}" to "${v.to}".`, items:shuffled(steps, key),
      ranks:steps.map(s => s.rank).sort((a, b) => a - b), steps, left:v.steps.filter(s => s.unranked).map(s => s.name)};
  }
  return {kind:'who', prompt:'In each column, tap the lowest layer you manage yourself.'};
}
let gameRuns = 0;
function gameState(l){ return ui.game[l.id] || (ui.game[l.id] = {picks:{}, cur:0, seq:[], cols:{}, run:++gameRuns}); }
// Where an item goes: for tied steps, the first of their places not already taken by a right tap.
function goesAt(g, st, ii){
  const it = g.items[ii], slots = g.ranks.map((r, p) => r === it.rank ? p : -1).filter(p => p >= 0);
  const free = slots.find(p => { const o = st.seq[p]; return o == null || o === ii || g.items[o].rank !== it.rank; });
  return (free != null ? free : slots[0]) + 1;
}
// The right order, numbered by place, with tied steps on one line ("2-3").
function orderAnswer(g){
  const groups = [];
  g.steps.forEach(s => { const last = groups[groups.length - 1]; if (last && last.rank === s.rank) last.names.push(s.text); else groups.push({rank:s.rank, names:[s.text]}); });
  let at = 0;
  return `<div class="answer-order"><b>The order:</b><ul>${groups.map(gr => { const from = at + 1; at += gr.names.length;
    return `<li><span class="ord-n">${from === at ? from : `${from}-${at}`}.</span> ${gr.names.join(' or ')}${gr.names.length > 1 ? ' <small>(either order)</small>' : ''}</li>`; }).join('')}</ul>
    ${g.left.length ? `<p class="muted small">${g.left.join(', ')} is left out: it has no fixed place on this scale.</p>` : ''}</div>`;
}
function gameHTML(l){
  const v = VISUALS[l.id], g = gameQuestions(l), st = gameState(l);
  let h = `<p class="muted lead">${g.prompt}</p>`, right = 0, total = 0, finished = false;
  if (g.kind === 'pick') {
    // One question at a time: dots show the results so far (colour and a symbol), Next moves on after the feedback.
    total = g.qs.length;
    g.qs.forEach((q, qi) => { if (st.picks[qi] === q.answer) right++; });
    finished = st.cur >= total;
    const dots = g.qs.map((q, qi) => { const p = st.picks[qi], r = p == null ? '' : p === q.answer ? 'ok' : 'no';
      return `<i class="${r} ${qi === st.cur ? 'cur' : ''}">${r === 'ok' ? '✓' : r === 'no' ? '✗' : ''}</i>`; }).join('');
    h += `<div class="qhead"><span>${finished ? 'Done' : `${st.cur + 1} of ${total}`} · ${right} right</span><span class="dots" aria-hidden="true">${dots}</span></div>`;
    if (!finished) {
      const q = g.qs[st.cur], opts = q.opts || g.options, pick = st.picks[st.cur];
      h += `<ol class="game"><li class="${pick == null ? '' : pick === q.answer ? 'ok' : 'no'}"><b>${q.text}</b>${q.sub ? `<small>${q.sub}</small>` : ''}
        <div class="opts-row">${opts.map((o, oi) => `<button class="chipbtn ${pick === oi ? (oi === q.answer ? 'right' : 'wrong') : pick != null && oi === q.answer ? 'right' : ''}"
          data-act="gPick" data-id="${l.id}" data-i="${st.cur}" data-v="${oi}" ${pick != null ? 'disabled' : ''}>${pick != null && oi === q.answer ? '✓ ' : pick === oi ? '✗ ' : ''}${o}</button>`).join('')}</div>
        ${pick != null ? `<p class="game-fb">${pick === q.answer ? '<b>✓ Right.</b>' : `<b>✗ Not quite.</b> It is ${opts[q.answer]}.`}${q.why ? ` <span class="muted">${q.why}</span>` : ''}</p>` : ''}</li></ol>`;
      if (pick != null) h += `<div class="btns"><button class="btn" data-act="gNext" data-id="${l.id}">${st.cur + 1 < total ? 'Next' : 'See your score'}</button></div>`;
    }
  } else if (g.kind === 'order') {
    // Each tap is checked at once: right place ✓, or ✗ with where it goes.
    const n = g.items.length; finished = st.seq.length === n; total = n;
    h += '<ol class="game order">' + g.items.map((it, ii) => {
      const at = st.seq.indexOf(ii), placed = at >= 0, ok = placed && g.ranks[at] === it.rank; if (ok) right++;
      const goes = goesAt(g, st, ii);
      return `<li class="${placed ? (ok ? 'ok' : 'no') : ''}"><button class="chipbtn wide ${placed ? 'picked' : ''}" data-act="gOrder" data-id="${l.id}" data-i="${ii}" ${placed ? 'disabled' : ''}>
        <span class="ord">${placed ? at + 1 : '?'}</span>${it.text}${placed ? (ok ? ' ✓' : ` ✗ <small>goes at ${goes}</small>`) : ''}</button></li>`;
    }).join('') + '</ol>';
    if (finished) h += orderAnswer(g);
  } else {
    // Who manages what: one tap per column sets where your part ends, and is checked at once.
    total = v.cols.length;
    const head = `<div class="who-h"></div>` + v.cols.map(c => `<div class="who-h">${c.title}${c.ex ? `<small>${c.ex}</small>` : ''}</div>`).join('');
    const rows = v.rows.map((r, ri) => `<div class="who-r">${r}</div>` + v.cols.map((c, ci) => {
      const pick = st.cols[ci];
      if (pick == null) return `<button class="who-c blank" data-act="gCol" data-id="${l.id}" data-i="${ci}" data-v="${ri + 1}"
        aria-label="${c.title}: I manage down to ${r}">?</button>`;
      const mine = ri < pick, ok = mine === ri < c.you;
      return `<div class="who-c ${mine ? 'mine' : 'theirs'} ${ok ? 'ok' : 'no'}" role="img"
        aria-label="${r}, ${c.title}: ${mine ? 'you' : 'them'}, ${ok ? 'right' : 'wrong'}">${mine ? 'You' : 'Them'}${ok ? '' : ' ✗'}</div>`;
    }).join('')).join('');
    h += `<div class="who" style="--cols:${v.cols.length}">${head}${rows}</div>`;
    const lines = v.cols.map((c, ci) => {
      const pick = st.cols[ci]; if (pick == null) return '';
      if (pick === c.you) right++;
      return `<li class="${pick === c.you ? 'ok' : 'no'}">${pick === c.you ? '✓' : '✗'} <b>${c.title}</b>: you manage the top ${c.you} of ${v.rows.length}, down to ${v.rows[c.you - 1].toLowerCase()}.</li>`;
    }).join('');
    if (lines) h += `<ul class="who-fb">${lines}</ul>`;
    finished = Object.keys(st.cols).length === total;
  }
  if (finished) h += `<div class="game-score ${right === total ? 'all' : ''}" data-k="${l.id}:${st.run}"><b>${right} of ${total} right.</b> ${right === total ? 'All correct.' : 'Look at the ✗ ones, then try again.'}
    <button class="link" data-act="gameReset" data-id="${l.id}">Try again</button></div>`;
  else if (g.kind === 'order') h += `<p class="muted small">${st.seq.length} of ${total} placed. <button class="link" data-act="gameReset" data-id="${l.id}">Start over</button></p>`;
  return h;
}

// A Look / Test yourself (or Points / Flip cards) switch above a stage.
function modeSwitch(l, stage, options, shown){
  const cur = shown || ui.mode[l.id + ':' + stage] || options[0][0];   // shown: the part on screen, when it has no tab
  return `<div class="seg small mode" role="group" aria-label="Show">${options.map(([v, label]) =>
    `<button data-act="mode" data-id="${l.id}" data-i="${stage}" data-v="${v}" aria-pressed="${cur === v}">${label}${partDone(l.id, stage, v) ? '<span class="part-ok"> ✓<span class="sr"> done</span></span>' : ''}</button>`).join('')}</div>`;
}
function modeOf(l, stage, dflt){ return ui.mode[l.id + ':' + stage] || dflt; }
