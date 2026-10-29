/* ---------- "What if": hands-on sandboxes (data in content/sims.js) ---------- */
// build: switch parts on and off and watch which goals each part makes possible, and why.
// pick:  choose one option and see what it can and can't do. Per-visit state only.
// A build sandbox with a `map` draws the real setup: its parts are switched on the map, and each goal is a test
// that sends a request along its path (a moving dot) until it arrives or is stopped.
const simUi = {on:{}, pick:{}, open:{}, play:null, tried:{}};   // parts on, option picked, open goal, test to animate next

function simOn(key){
  const sim = SIMS[key];
  return simUi.on[key] || (simUi.on[key] = Object.fromEntries(sim.parts.map(p => [p.id, !!p.on])));
}
// One goal's result: met or not, the reason in words, and what was missing or blocking.
function simGoal(key, g){
  const sim = SIMS[key];
  if (sim.kind === 'pick') {
    const pick = simUi.pick[key];
    return {ok:pick != null && g.yes.includes(pick), open:pick == null, why:g.why};
  }
  if (g.never) return {ok:false, never:true, why:g.never};
  const on = simOn(key), missing = g.needs.filter(id => !on[id]), blocking = (g.unless || []).filter(id => on[id]);
  const ok = !missing.length && !blocking.length;
  const fine = (g.unless || []).length ? 'Everything it needs is on, and nothing blocks it.' : 'Everything it needs is on.';
  return {ok, missing, blocking, why:ok ? (g.ok || fine) : g.why[missing[0] || blocking[0]]};
}
const simName = (key, id) => (SIMS[key].parts || SIMS[key].options).find(p => p.id === id).t;

// What a goal depends on, each part marked: the "needs other things" picture.
function simNeeds(key, g){
  const sim = SIMS[key];
  if (sim.kind === 'pick') {
    const pick = simUi.pick[key];
    return `<span class="sim-needs">Can do it: ${g.yes.map(id => `<i class="${id === pick ? 'ok' : ''}">${simName(key, id)}</i>`).join('')}</span>`;
  }
  if (g.never || !(g.needs.length || (g.unless || []).length)) return '';
  // On a map, parts go by their short names on the map.
  const on = simOn(key), node = sim.map && (id => sim.map.nodes.find(n => n.part === id)), name = id => node && node(id) ? node(id).t : simName(key, id);
  return `<span class="sim-needs">${g.needs.length ? 'Needs: ' : ''}${g.needs.map(id => `<i class="${on[id] ? 'ok' : 'no'}">${on[id] ? '✓' : '✗'} ${name(id)}</i>`).join('')}${
    (g.unless || []).length ? ` Blocked by: ${g.unless.map(id => `<i class="${on[id] ? 'no' : 'ok'}">${on[id] ? '✗ on:' : '✓ off:'} ${name(id)}</i>`).join('')}` : ''}</span>`;
}
const simMark = r => r.open ? '?' : r.never ? '⊘' : r.ok ? '✓' : '✗';
const simState = r => r.open ? 'open' : r.never ? 'never' : r.ok ? 'ok' : 'no';
const simSr = r => r.open ? '' : r.never ? ': never, by design' : r.ok ? ': yes' : ': no';

function simHTML(key){
  const sim = SIMS[key], build = sim.kind === 'build', on = build ? simOn(key) : null, pick = simUi.pick[key];
  const results = sim.goals.map(g => [g, simGoal(key, g)]);
  const met = results.filter(([, r]) => r.ok).length, total = results.filter(([, r]) => !r.never).length;
  // The part last switched (or the option picked), described in one line.
  const last = build ? sim.parts.find(p => p.id === simUi.last && simUi.lastKey === key) : sim.options.find(o => o.id === pick);
  const said = last ? `<p class="sim-picked"><b>${last.t}${build ? (on[last.id] ? ' (on)' : ' (off)') : ''}:</b> ${last.does}</p>` : '';
  const sum = build || pick ? `${met} of ${total} goals met · tap a ${sim.map ? 'test to send it' : 'goal to see why'}` : 'Pick one to see what it can and can\'t do';
  if (sim.map) return simMapHTML(key, results, sum);   // the map shows each part's state; its result box says why
  const controls = build
    ? sim.parts.map(p => `<button class="sim-part ${on[p.id] ? 'on' : ''}" data-act="simToggle" data-id="${key}" data-v="${p.id}" aria-pressed="${on[p.id]}">
        ${flowIcon(p.k)}<span><b>${p.t}</b></span><span class="sw" aria-hidden="true">${on[p.id] ? 'On' : 'Off'}</span></button>`).join('')
    : sim.options.map(o => `<button class="sim-part ${pick === o.id ? 'on' : ''}" data-act="simPick" data-id="${key}" data-v="${o.id}" aria-pressed="${pick === o.id}">
        ${flowIcon(o.k)}<span><b>${o.t}</b></span></button>`).join('');
  const goals = results.map(([g, r], gi) => {
    // Tap a goal to read why; the goal a tap just changed opens by itself. A limit by design is not a failure.
    const shown = !r.open && simUi.open[key] === gi, st = simState(r);
    return `<li class="${st === 'open' ? '' : st}" data-goal="${gi}" data-state="${st}"><button class="sim-goal" data-act="simWhy" data-id="${key}" data-i="${gi}" aria-expanded="${shown}" ${r.open ? 'disabled' : ''}>
      <span class="mk" aria-hidden="true">${simMark(r)}</span><span class="gt">${g.t}<span class="sr">${simSr(r)}</span></span>${r.never ? '<span class="never-tag">By design</span>' : ''}${r.open ? '' : `<span class="why-tag" aria-hidden="true">${shown ? 'Hide' : 'Why?'}</span>`}</button>
      ${shown ? simNeeds(key, g) + `<small>${markNumbers(r.why)}</small>` : ''}</li>`;
  }).join('');
  return `<div class="sim" data-sim="${key}"><b class="flow-t">${sim.title}</b>
    <div class="sim-parts" role="group" aria-label="${build ? 'Parts' : 'Options'}">${controls}</div>
    ${said}<div class="sim-sum">${sum}</div><ul class="sim-goals">${goals}</ul></div>`;
}

// The map: frames (Region, AZ, subnets), lines between parts, parts you can switch, and one button per test.
function simMapHTML(key, results, sum){
  const sim = SIMS[key], m = sim.map, on = simOn(key), at = id => m.nodes.find(n => n.id === id);
  const lines = m.links.map(([a, b]) => { const p = at(a), q = at(b); return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`; }).join('');
  const frames = m.frames.map(f => `<div class="mframe" style="left:${f.x}%;top:${f.y}%;width:${f.w}%;height:${f.h}%"><span>${f.t}</span></div>`).join('');
  const nodes = m.nodes.map(n => {
    const pos = `style="left:${n.x}%;top:${n.y}%"`, inner = `${flowIcon(n.k)}<span>${n.t}</span>`;
    if (n.part) return `<button class="mnode part ${on[n.part] ? 'on' : 'off'}" ${pos} data-node="${n.id}" data-act="simToggle" data-id="${key}" data-v="${n.part}"
      aria-pressed="${on[n.part]}" aria-label="${esc(simName(key, n.part))}">${inner}<small aria-hidden="true">${on[n.part] ? 'On' : 'Off'}</small></button>`;
    return `<div class="mnode ${n.down ? 'down' : ''}" ${pos} data-node="${n.id}">${inner}${n.down ? '<small>⚡ Down</small>' : ''}</div>`;
  }).join('');
  const open = simUi.open[key], tests = results.map(([g, r], gi) => `<button class="sim-test ${simState(r)}" data-goal="${gi}" data-state="${simState(r)}"
    data-act="simWhy" data-id="${key}" data-i="${gi}" aria-pressed="${open === gi}" aria-label="${esc(g.t + simSr(r))}"><span class="mk" aria-hidden="true">${simMark(r)}</span>${g.short || g.t}</button>`).join('');
  const sel = open != null && results[open];
  const result = sel ? `<div class="sim-result ${simState(sel[1])}"><b>${simMark(sel[1])} ${sel[0].t}</b>${sel[1].never ? ' <span class="never-tag">By design</span>' : ''}
      ${simNeeds(key, sel[0])}<small>${markNumbers(sel[1].why)}</small></div>` : '';
  return `<div class="sim" data-sim="${key}"><b class="flow-t">${sim.title}</b>
    <div class="simmap" style="--r:${m.ratio}" role="group" aria-label="Map of the setup. Tap a part to switch it on or off.">
      ${frames}<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes}<span class="mdot" aria-hidden="true"></span></div>
    <div class="sim-tests" role="group" aria-label="Tests"><span class="sim-sum">${sum}</span>${tests}</div>${result}</div>`;
}

// Where a test's request stops: the first part on its path that is missing or blocking, or the node that stops
// it on purpose (a firewall doing its job), or the end of the path.
function simStop(key, gi){
  const sim = SIMS[key], g = sim.goals[gi], route = sim.map && sim.map.routes[gi];
  if (!route) return null;
  const r = simGoal(key, g), at = id => sim.map.nodes.find(n => n.id === id);
  const bad = [...(r.missing || []), ...(r.blocking || [])];
  let stop = route.path.length - 1;
  if (!r.never && !r.ok) { const i = route.path.findIndex(id => { const n = at(id); return bad.includes(n.part) || (n.checks || []).some(c => bad.includes(c)); }); if (i >= 0) stop = i; }
  else if (r.ok && route.stop) stop = route.path.indexOf(route.stop);
  return {path:route.path.slice(0, stop + 1), state:simState(r)};
}
// Moves the dot along the test's path after the page is drawn, then marks where it ended.
function simPlay(){
  const p = simUi.play; simUi.play = null;
  if (!p) return;
  const box = document.querySelector(`[data-sim="${p.key}"] .simmap`), plan = simStop(p.key, p.gi);
  if (!box || !plan) return;
  const at = id => SIMS[p.key].map.nodes.find(n => n.id === id), dot = box.querySelector('.mdot');
  const pts = plan.path.map(id => ({left:at(id).x + '%', top:at(id).y + '%'}));
  const end = box.querySelector(`[data-node="${plan.path[plan.path.length - 1]}"]`);
  const finish = () => { dot.classList.remove('go'); if (end) end.classList.add('hit', 'hit-' + plan.state); };   // the mark replaces the dot
  dot.classList.add('go'); Object.assign(dot.style, pts[pts.length - 1]);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || pts.length < 2 || !dot.animate) { finish(); return; }
  dot.animate(pts, {duration:450 * (pts.length - 1), easing:'linear'}).onfinish = finish;
}

// What changed after a tap, in words for screen readers; opens the goal that changed.
function simSay(key, before){
  const sim = SIMS[key];
  const changed = sim.goals.map((g, i) => [g, simGoal(key, g), before[i], i]).filter(([, r, b]) => r.ok !== b.ok || r.open !== b.open);
  // Open the first goal that changed, preferring one that is now not met. Nothing changed: keep what is open.
  const first = changed.find(([, r]) => !r.ok) || changed[0];
  if (first) simUi.open[key] = first[3];
  if (first && sim.map) simUi.play = {key, gi:first[3]};
  const head = sim.kind === 'build'
    ? `${simName(key, simUi.last)} ${simOn(key)[simUi.last] ? 'on' : 'off'}.`
    : `${simName(key, simUi.pick[key])}.`;
  return head + ' ' + (changed.length ? changed.map(([g, r]) => `${g.t}: ${r.ok ? 'yes' : 'no'}.`).join(' ') : 'No goal changed.')
    + (first ? ' ' + plain(simGoal(key, first[0]).why) : '');
}
