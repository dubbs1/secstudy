/* ---------- "What if": hands-on sandboxes (data in content/sims.js) ---------- */
// build: switch parts on and off and watch which goals each part makes possible, and why.
// pick:  choose one option and see what it can and can't do. Per-visit state only.
const simUi = {on:{}, pick:{}, open:{}};   // parts switched on, option picked, goal whose reason is open

function simOn(key){
  const sim = SIMS[key];
  return simUi.on[key] || (simUi.on[key] = Object.fromEntries(sim.parts.map(p => [p.id, !!p.on])));
}
// One goal's result: met or not, and the reason in words.
function simGoal(key, g){
  const sim = SIMS[key];
  if (sim.kind === 'pick') {
    const pick = simUi.pick[key];
    return {ok:pick != null && g.yes.includes(pick), open:pick == null, why:g.why};
  }
  if (g.never) return {ok:false, never:true, why:g.never};
  const on = simOn(key), missing = g.needs.filter(id => !on[id]), blocking = (g.unless || []).filter(id => on[id]);
  const ok = !missing.length && !blocking.length;
  return {ok, why:ok ? (g.ok || 'Everything it needs is on.') : g.why[missing[0] || blocking[0]]};
}
const simName = (key, id) => (SIMS[key].parts || SIMS[key].options).find(p => p.id === id).t;

function simHTML(key){
  const sim = SIMS[key], build = sim.kind === 'build', on = build ? simOn(key) : null, pick = simUi.pick[key];
  const controls = build
    ? sim.parts.map(p => `<button class="sim-part ${on[p.id] ? 'on' : ''}" data-act="simToggle" data-id="${key}" data-v="${p.id}" aria-pressed="${on[p.id]}">
        ${flowIcon(p.k)}<span><b>${p.t}</b></span><span class="sw" aria-hidden="true">${on[p.id] ? 'On' : 'Off'}</span></button>`).join('')
    : sim.options.map(o => `<button class="sim-part ${pick === o.id ? 'on' : ''}" data-act="simPick" data-id="${key}" data-v="${o.id}" aria-pressed="${pick === o.id}">
        ${flowIcon(o.k)}<span><b>${o.t}</b></span></button>`).join('');
  const results = sim.goals.map(g => [g, simGoal(key, g)]);
  const met = results.filter(([, r]) => r.ok).length;
  const goals = results.map(([g, r], gi) => {
    // A limit by design is not a failure: it gets its own neutral look and mark.
    const mark = r.open ? '?' : r.never ? '⊘' : r.ok ? '✓' : '✗', cls = r.open ? '' : r.never ? '' : r.ok ? 'ok' : 'no';
    // What the goal depends on, each part marked as on or off: the "needs other things" picture.
    let deps = '';
    const shown = !r.open && simUi.open[key] === gi;
    if (shown && build && !g.never && (g.needs.length || (g.unless || []).length)) {
      deps = `<span class="sim-needs">Needs: ${g.needs.map(id => `<i class="${on[id] ? 'ok' : 'no'}">${on[id] ? '✓' : '✗'} ${simName(key, id)}</i>`).join('')}${
        (g.unless || []).map(id => `<i class="${on[id] ? 'no' : 'ok'}">${on[id] ? '✗' : '✓'} no ${simName(key, id)}</i>`).join('')}</span>`;
    }
    if (shown && !build) deps = `<span class="sim-needs">Can do it: ${g.yes.map(id => `<i class="${id === pick ? 'ok' : ''}">${simName(key, id)}</i>`).join('')}</span>`;
    // Tap a goal to read why; the goal a tap just changed opens by itself.
    return `<li class="${cls} ${r.never ? 'never' : ''}"><button class="sim-goal" data-act="simWhy" data-id="${key}" data-i="${gi}" aria-expanded="${shown}" ${r.open ? 'disabled' : ''}>
      <span class="mk" aria-hidden="true">${mark}</span><span class="gt">${g.t}<span class="sr">${r.open ? '' : r.never ? ': never, by design' : r.ok ? ': yes' : ': no'}</span></span>${r.never ? '<span class="never-tag">By design</span>' : ''}${r.open ? '' : `<span class="why-tag">${shown ? 'Hide' : 'Why?'}</span>`}</button>
      ${deps}${shown ? `<small>${markNumbers(r.why)}</small>` : ''}</li>`;
  }).join('');
  return `<div class="sim" data-sim="${key}"><b class="flow-t">${sim.title}</b>
    <div class="sim-parts" role="group" aria-label="${build ? 'Parts' : 'Options'}">${controls}</div>
    ${!build && pick ? `<p class="sim-picked"><b>${simName(key, pick)}:</b> ${sim.options.find(o => o.id === pick).does}</p>` : ''}
    <div class="sim-sum">${build || pick ? `${met} of ${sim.goals.length} goals met · tap a goal to see why` : `Pick one to see what it can and can't do`}</div>
    <ul class="sim-goals">${goals}</ul></div>`;
}

// What changed after a tap, in words for screen readers.
function simSay(key, before){
  const sim = SIMS[key];
  const changed = sim.goals.map((g, i) => [g, simGoal(key, g), before[i], i]).filter(([, r, b]) => r.ok !== b.ok || r.open !== b.open);
  // Open the reason of the first goal that changed, or (after a pick) the first goal it can't do.
  const first = changed.find(([, r]) => !r.ok) || changed[0];
  if (first) simUi.open[key] = first[3];
  const head = sim.kind === 'build'
    ? `${simName(key, simUi.last)} ${simOn(key)[simUi.last] ? 'on' : 'off'}.`
    : `${simName(key, simUi.pick[key])}.`;
  return head + ' ' + (changed.length ? changed.map(([g, r]) => `${g.t}: ${r.ok ? 'yes' : 'no'}.`).join(' ') : 'No goal changed.')
    + (first ? ' ' + plain(simGoal(key, first[0]).why) : '');
}
