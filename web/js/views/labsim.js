/* ---------- Practise here: each lab in a practice console (data in content/labsims.js) ---------- */
// Every control answers at once: a right choice says why it is right, a wrong one why it is wrong. A step is done
// when all its controls are right; it then shows what the real console would show, and Next step. Per-visit only:
// practising saves nothing except today's study day.
const labUi = {};   // per lab: {step, vals:{controlId: value}, said:{controlId: text}}

function labState(id){ return labUi[id] || (labUi[id] = {step:0, vals:{}, out:{}}); }
// Whether a control is right, and what to say about its current value.
function labCheck(c, v){
  if (c.type === 'choice') { if (v == null) return {ok:false}; const o = c.options[v]; return {ok:!!o.ok, why:o.why, said:true}; }
  if (c.type === 'toggle') { const on = v == null ? !!c.on : v; return {ok:on === c.want, why:on === c.want ? '' : c.why, said:v != null}; }
  if (c.type === 'text') {
    if (v == null) return {ok:false};
    const bad = (c.bad || []).find(b => new RegExp(b.re).test(v));
    if (bad) return {ok:false, why:bad.why, said:true};
    if ((c.taken || []).includes(v.trim().toLowerCase())) return {ok:false, why:`"${esc(v.trim())}" is already taken. ${c.id === 'name' ? 'Bucket names are shared by every AWS account in the world: add something of your own.' : 'Pick another name.'}`, said:true};
    if (!new RegExp(c.need).test(v)) return {ok:false, why:`Not quite: ${c.hint}.`, said:true};
    return {ok:true, why:'', said:true};
  }
  if (c.type === 'cmd') { if (v == null) return {ok:false}; const ok = c.expect.some(re => new RegExp(re).test(v)); return {ok, why:ok ? '' : 'Not that command. Check the task above and type it exactly.', said:true}; }
  return {ok:false};
}
const labStepDone = (id, step) => LAB_SIMS[id].steps[step].controls.every(c => labCheck(c, labState(id).vals[c.id]).ok);

function labControlHTML(id, c){
  const st = labState(id), v = st.vals[c.id], r = labCheck(c, v), key = `data-id="${id}" data-v="${c.id}"`;
  const fb = r.said && r.why ? `<p class="lc-fb ${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'}</b> ${r.why}</p>` : r.said && r.ok ? '<p class="lc-fb ok"><b>✓</b> Right.</p>' : '';
  if (c.type === 'choice') return `<fieldset class="lc"><legend>${c.label}</legend>${c.options.map((o, i) => `<button class="lc-opt ${v === i ? (o.ok ? 'right' : 'wrong') : ''}"
      data-act="labPick" ${key} data-i="${i}" aria-pressed="${v === i}">${v === i ? (o.ok ? '✓ ' : '✗ ') : ''}${o.t}</button>`).join('')}</fieldset>${fb}`;
  if (c.type === 'toggle') { const on = v == null ? !!c.on : v;
    return `<div class="lc"><button class="lc-toggle ${on ? 'on' : ''}" data-act="labToggle" ${key} aria-pressed="${on}"><span class="sw" aria-hidden="true">${on ? 'On' : 'Off'}</span>${c.label}</button></div>${fb}`; }
  if (c.type === 'text') return `<div class="lc"><label class="lc-l" for="lc-${id}-${c.id}">${c.label}</label>
      <div class="lc-row"><input class="field" id="lc-${id}-${c.id}" data-lab="${id}" data-c="${c.id}" value="${esc(v || '')}" placeholder="${esc(c.hint || '')}" autocomplete="off" spellcheck="false">
      <button class="btn small" data-act="labText" ${key}>Check</button></div></div>${fb}`;
  if (c.type === 'cmd') return `<div class="lc term"><div class="term-out" aria-live="polite">${(st.out[c.id] || []).map(line => `<div>${esc(line)}</div>`).join('')}</div>
      <div class="lc-row"><span class="term-p" aria-hidden="true">${c.prompt || '$'}</span><input class="field term-in" id="lc-${id}-${c.id}" data-lab="${id}" data-c="${c.id}"
        aria-label="Type a command" autocomplete="off" spellcheck="false" ${r.ok ? 'disabled' : ''}><button class="btn small" data-act="labText" ${key} ${r.ok ? 'disabled' : ''}>Enter</button></div></div>${fb}`;
  return '';
}

function labSimHTML(lab){
  const sim = LAB_SIMS[lab.id]; if (!sim) return '';
  const st = labState(lab.id), n = sim.steps.length;
  if (st.step >= n) return `<div class="pcon-done"><div class="big-check on" aria-hidden="true">✓</div><b>Practice run done: all ${n} steps.</b>
    <p class="muted">You know the steps and the traps. Ready for the real console?</p>
    <div class="btns"><button class="btn" data-act="labMode" data-id="${lab.id}" data-v="real">Do it in the real console ›</button>
    <button class="btn ghost" data-act="labRestart" data-id="${lab.id}">Practise again</button></div></div>`;
  const s = sim.steps[st.step], done = labStepDone(lab.id, st.step);
  const dots = sim.steps.map((x, i) => `<i class="${i < st.step ? 'ok' : ''} ${i === st.step ? 'cur' : ''}">${i < st.step ? '✓' : ''}</i>`).join('');
  return `<div class="pcon" data-labsim="${lab.id}">
    <div class="pcon-bar"><span class="pcon-tag">Practice console</span><span class="pcon-where">${s.where}</span></div>
    <div class="pcon-body"><div class="qhead"><span>Step ${st.step + 1} of ${n}</span><span class="dots" aria-hidden="true">${dots}</span></div>
      <p class="pcon-task"><b>${s.task}</b></p>${s.controls.map(c => labControlHTML(lab.id, c)).join('')}
      ${done ? `<div class="pcon-see"><b>In the real console you would now see:</b> ${s.see}${s.table ? `<table class="pcon-table"><thead><tr>${s.table.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${s.table.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}</div>
        <div class="btns"><button class="btn" data-act="labNext" data-id="${lab.id}">${st.step + 1 < n ? 'Next step ›' : 'Finish'}</button></div>` : ''}
    </div></div>
    <p class="muted small">Practice only: nothing is created in AWS and nothing costs credits.</p>`;
}
