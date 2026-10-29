/* ---------- Practise here: each lab in a practice console (data in content/labsims.js) ---------- */
// Laid out like the real console: a top bar with the service and Region, the service menu, breadcrumbs, the page
// title, form sections and the main button; then the page you land on with its success banner. Mistakes show the way
// the console shows them (red text under a field, an error banner for a wrong button), and the Coach under the page
// says why. Per-visit only: practising saves nothing except today's study day.
const labUi = {};   // per lab: {mode, step, vals, draft, out, sent (main button pressed), err (banner), menu, nav}

function labState(id){ return labUi[id] || (labUi[id] = {step:0, vals:{}, out:{}, draft:{}}); }
// {id} in data text becomes the value typed for that control (the bucket name, the user name, ...).
const LAB_STANDINS = {name:'your-bucket', user:'your-user', group:'Admins', iname:'test', fname:'hello'};
function labFill(id, text){
  const v = labState(id).vals;
  return String(text).replace(/\{(\w+)\}/g, (m, k) => typeof v[k] === 'string' && v[k].trim() ? esc(v[k].trim()) : LAB_STANDINS[k] || m);
}
// Whether a control is right, and what to say about its current value.
function labCheck(c, v, id){
  const st = labState(id), sent = !!(st.sent && st.sent[st.step]);   // after the main button, an unanswered field is an error too
  if (c.type === 'note') return {ok:true};
  if (c.type === 'choice') { if (v == null) return {ok:false, why:'Choose one of these options.', said:sent}; const o = c.options[v]; return {ok:!!o.ok, why:o.why, said:true}; }
  if (c.type === 'toggle') { const on = v == null ? !!c.on : v; return {ok:on === c.want, why:on === c.want ? '' : c.why, said:v != null || sent}; }
  if (c.type === 'text') {
    if (v == null || (!c.same && !v.trim() && !(c.bad || []).some(b => new RegExp(b.re).test(v)))) return {ok:false, why:'This field is required.', said:sent};
    if (c.same) { const want = (labState(id).vals[c.same] || '').trim(); return v.trim() === want ? {ok:true, why:'', said:true} : {ok:false, why:`Type the bucket name exactly: ${esc(want)}. The console asks so nobody deletes the wrong bucket by accident.`, said:true}; }
    const bad = (c.bad || []).find(b => new RegExp(b.re).test(v));
    if (bad) return {ok:false, why:bad.why, said:true};
    if ((c.taken || []).includes(v.trim().toLowerCase())) return {ok:false, why:`"${esc(v.trim())}" is already taken. ${c.id === 'name' ? 'Bucket names are shared by every AWS account in the world: add something of your own.' : 'User names must be unique in the account (case does not count).'}`, said:true};
    if (!new RegExp(c.need).test(v)) return {ok:false, why:`Not quite: ${labFill(id, c.hint)}.`, said:true};
    return {ok:true, why:'', said:true};
  }
  if (c.type === 'cmd') { if (v == null) return {ok:false, why:c.editor ? 'Write the line, then Deploy.' : '', said:sent && !!c.editor}; const ok = c.expect.some(re => new RegExp(re).test(v)); return {ok, why:ok ? '' : c.editor ? 'Not that line. Inside the handler, print exactly: hello from lambda.' : 'Not that command. Check the task and type it exactly.', said:true}; }
  return {ok:false};
}
const labControls = (id, step) => LAB_SIMS[id].steps[step].controls;
const labAllRight = (id, step) => labControls(id, step).every(c => labCheck(c, labState(id).vals[c.id], id).ok);
// A step is done when every control is right and, if it has a main button, that button was pressed.
function labStepDone(id, step){
  const s = LAB_SIMS[id].steps[step], st = labState(id);
  return labAllRight(id, step) && (!s.action || !!(st.sent && st.sent[step]));
}
// Errors show once the main button was pressed (at once for terminals, toolbar buttons and steps without one).
function labShowErr(id, c){
  const st = labState(id), s = LAB_SIMS[id].steps[st.step];
  return !s.action || c.type === 'cmd' || !!(st.sent && st.sent[st.step]);
}
const labIsBar = c => c.style === 'buttons' || c.style === 'menu';

function labControlHTML(id, c){
  const st = labState(id), v = st.vals[c.id], r = labCheck(c, v, id), key = `data-id="${id}" data-v="${c.id}"`;
  st.draft = st.draft || {};
  const fid = `fb-${id}-${c.id}`, did = `ds-${id}-${c.id}`, bad = r.said && !r.ok && labShowErr(id, c);
  const err = bad ? `<p class="cs-err" id="${fid}" tabindex="-1"><b aria-hidden="true">⚠</b> ${r.why}</p>` : '';
  // The helper text and the error both describe the field; an error also marks it invalid.
  const aria = `aria-describedby="${c.desc ? did + ' ' : ''}${fid}" ${bad ? 'aria-invalid="true"' : ''}`;
  const desc = c.desc ? `<span class="cs-desc" id="${did}">${c.desc}</span>` : '';
  const head = `${c.label ? `<span class="cs-label" id="lb-${id}-${c.id}">${labFill(id, c.label)}</span>` : ''}${desc}`;
  if (c.type === 'note') return `<div class="cs-field"><span class="cs-label">${labFill(id, c.label)}</span><span class="cs-note">${c.t}</span>${desc}</div>`;
  if (c.type === 'choice') {
    // A radio group is one Tab stop; the arrow keys move between its options.
    const tab = v != null ? v : 0;
    return `<div class="cs-field">${head}<div class="cs-${c.style === 'tiles' ? 'tiles' : 'radios'}" role="radiogroup" ${c.label ? `aria-labelledby="lb-${id}-${c.id}"` : 'aria-label="Choose one"'} ${aria}>${c.options.map((o, i) =>
      `<button class="cs-radio ${v === i ? 'on' : ''}" role="radio" aria-checked="${v === i}" tabindex="${i === tab ? 0 : -1}" data-act="labPick" ${key} data-i="${i}"><i aria-hidden="true"></i><span>${labFill(id, o.t)}</span></button>`).join('')}</div>${err}</div>`;
  }
  if (c.type === 'toggle') { const on = v == null ? !!c.on : v, sw = c.style === 'switch';
    return `<div class="cs-field"><button class="cs-check ${sw ? 'switch' : ''} ${on ? 'on' : ''}" role="${sw ? 'switch' : 'checkbox'}" aria-checked="${on}" ${aria} data-act="labToggle" ${key}>
      <i aria-hidden="true">${!sw && on ? '✓' : ''}</i><span>${labFill(id, c.label)}</span></button>${err}</div>`; }
  if (c.type === 'text') return `<div class="cs-field"><label class="cs-label" for="lc-${id}-${c.id}">${labFill(id, c.label)}</label>${c.desc ? `<span class="cs-desc">${c.desc}</span>` : ''}
      <input class="field cs-input ${bad ? 'bad' : ''}" id="lc-${id}-${c.id}" data-lab="${id}" data-c="${c.id}" ${aria} value="${esc(st.draft[c.id] != null ? st.draft[c.id] : v || '')}" placeholder="${labFill(id, c.hint || '')}" autocomplete="off" spellcheck="false">${err}</div>`;
  if (c.type === 'cmd' && c.editor) return `<div class="cs-editor"><div class="cs-ed-tab">${c.editor.file}</div><ol class="cs-ed-lines">
      ${c.editor.before.map(l => `<li><code>${esc(l) || ' '}</code></li>`).join('')}
      <li class="cs-ed-me"><code aria-hidden="true">    </code><input class="cs-ed-in ${bad ? 'bad' : ''}" id="lc-${id}-${c.id}" data-lab="${id}" data-c="${c.id}" ${aria} aria-label="Line ${c.editor.before.length + 1} of ${c.editor.file}" value="${esc(st.draft[c.id] != null ? st.draft[c.id] : v || '')}" placeholder="    write your line here" autocomplete="off" spellcheck="false"></li>
      ${c.editor.after.map(l => `<li><code>${esc(l)}</code></li>`).join('')}</ol></div>${err}`;
  if (c.type === 'cmd') return `<div class="cs-term"><div class="cs-term-bar">${labFill(id, c.window || 'Terminal')}</div><div class="cs-term-body">
      ${(c.banner || []).map(l => `<div class="dim">${esc(l)}</div>`).join('')}
      <div class="term-out">${(st.out[c.id] || []).map(line => `<div>${esc(line)}</div>`).join('')}</div>
      ${r.ok ? '' : `<div class="lc-row"><span class="term-p" aria-hidden="true">${esc(c.prompt || '$')}</span><input class="term-in" id="lc-${id}-${c.id}" data-lab="${id}" data-c="${c.id}" ${aria}
        aria-label="Type a command" autocomplete="off" spellcheck="false"><button class="btn small" data-act="labText" ${key}>Enter</button></div>`}</div></div>${err}`;
  return '';
}

// A list (S3 buckets, EC2 instances...) with its toolbar: the buttons or the dropdown menu a step is about.
function labListHTML(id, s){
  const L = s.list, st = labState(id), act = s.controls.find(labIsBar);
  let bar = '';
  if (act && act.style === 'buttons') bar = `<div class="cs-toolbar" role="group" aria-label="Actions">${act.options.map((o, i) =>
    `<button class="cs-btn" data-act="labPick" data-id="${id}" data-v="${act.id}" data-i="${i}">${o.t}</button>`).join('')}</div>`;
  if (act && act.style === 'menu') bar = `<div class="cs-toolbar"><button class="cs-btn" data-act="labMenu" data-id="${id}" aria-haspopup="menu" aria-expanded="${!!st.menu}">${act.label} ▾</button>
    ${st.menu ? `<div class="cs-menu" role="menu">${act.options.map((o, i) => `<button role="menuitem" data-act="labPick" data-id="${id}" data-v="${act.id}" data-i="${i}">${o.t}</button>`).join('')}</div>` : ''}</div>`;
  return `<div class="cs-panel"><div class="cs-panel-h"><b>${labFill(id, L.title)}</b>${bar}</div>${labTableHTML(id, L)}</div>`;
}
function labTableHTML(id, T){
  if (!T.rows.length) return `<p class="cs-empty">${T.empty || 'Nothing here yet.'}</p>`;
  const cell = c => labFill(id, c).replace(/^● (.*)$/, '<span class="cs-badge ok">● $1</span>').replace(/^○ (.*)$/, '<span class="cs-badge">○ $1</span>');
  return `<div class="cs-tablewrap"><table class="cs-table"><thead><tr>${T.selected != null ? '<th><span class="sr">Selected</span></th>' : ''}${T.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${T.rows.map((r, i) => `<tr class="${T.selected === i ? 'sel' : ''}">${T.selected != null ? `<td>${T.selected === i ? '☑<span class="sr"> selected</span>' : '☐'}</td>` : ''}${r.map(c => `<td>${cell(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
// A page of the practice console: top bar, menu, breadcrumbs, banner, title, then the body.
function labPage(id, {crumbs, title, nav, flash, flashBad, body}){
  const lab = LAB_SIMS[id], st = labState(id);
  return `<div class="cs" data-labsim="${id}">
    <div class="cs-top"><button class="cs-menu-btn" data-act="labNav" data-id="${id}" aria-expanded="${!!st.nav}" aria-label="${lab.service} menu">☰</button>
      <span class="cs-brand">Practice console</span><span class="cs-search" aria-hidden="true">🔍 Search</span>
      <span class="cs-region">${lab.region ? lab.region : '<span class="long">Europe (Frankfurt)</span><span class="short">Frankfurt</span>'} ▾</span></div>
    ${st.nav ? `<nav class="cs-nav" aria-label="${lab.service} menu"><b>${lab.service}</b>${lab.nav.map(n => `<span class="${n === nav ? 'on' : ''}">${n}</span>`).join('')}</nav>` : ''}
    <div class="cs-main">
      ${crumbs ? `<div class="cs-crumbs">${crumbs.map(c => labFill(id, c)).join(' <span aria-hidden="true">›</span> ')}</div>` : ''}
      ${flash ? `<div class="cs-flash ${flashBad ? 'bad' : 'ok'}">${flashBad ? '⚠' : '✓'} ${labFill(id, flash)}</div>` : ''}
      <h3 class="cs-title">${labFill(id, title)}</h3>${body}</div></div>`;
}

function labSimHTML(lab){
  const sim = LAB_SIMS[lab.id]; if (!sim) return '';
  const id = lab.id, st = labState(id), n = sim.steps.length;
  if (st.step >= n) return `<div class="pcon-done"><div class="big-check on" aria-hidden="true">✓</div><b>Practice run done: all ${n} steps.</b>
    <p class="muted">You know the screens, the buttons and the traps. Ready for the real console?</p>
    <div class="btns"><button class="btn" data-act="labMode" data-id="${id}" data-v="real">Do it in the real console ›</button>
    <button class="btn ghost" data-act="labRestart" data-id="${id}">Practise again</button></div></div>`;
  const s = sim.steps[st.step];
  s.controls.forEach(c => { if (c.pre != null && st.vals[c.id] === undefined) st.vals[c.id] = c.pre; });   // what the real console starts with
  const done = labStepDone(id, st.step);
  const dots = sim.steps.map((x, i) => `<i class="${i < st.step ? 'ok' : ''} ${i === st.step ? 'cur' : ''}">${i < st.step ? '✓' : ''}</i>`).join('');
  let page;
  if (done && s.after) {
    // The page the real console lands on.
    const A = s.after;
    page = labPage(id, {crumbs:A.crumbs || s.crumbs, title:A.title, nav:s.nav, flash:A.flash,
      body:`${A.table ? `<div class="cs-panel"><div class="cs-panel-h"><b>${labFill(id, A.table.title)}</b></div>${labTableHTML(id, A.table)}</div>` : ''}
        ${A.panel ? `<div class="cs-panel ${A.mono ? 'mono' : ''}">${A.panel.map(l => `<div>${labFill(id, l)}</div>`).join('')}</div>` : ''}`});
  } else {
    // The form, grouped into the console's boxes, and the main button.
    let body = s.list ? labListHTML(id, s) : '', box;
    for (const c of s.controls.filter(c => !labIsBar(c))) {
      const sec = c.section ? labFill(id, c.section) : '';
      if (sec !== box) { if (box !== undefined) body += '</div>'; body += sec ? `<div class="cs-panel"><div class="cs-panel-h"><b>${sec}</b></div>` : '<div class="cs-plain">'; box = sec; }
      body += labControlHTML(id, c);
    }
    if (box !== undefined) body += '</div>';
    if (s.action && !done) body += `<div class="cs-actions"><span class="cs-btn ghosted" aria-hidden="true">Cancel</span><button class="cs-btn primary" data-act="labGo" data-id="${id}">${s.action}</button></div>`;
    page = labPage(id, {crumbs:s.crumbs, title:s.title, nav:s.nav, flash:st.err, flashBad:true, body});
  }
  // The Coach: the task, then why each answer was right or wrong.
  // Mistakes in a field show in red under it; the Coach adds why right answers are right, and why a wrong toolbar or
  // menu button (which has no field to show under) is wrong.
  const said = s.controls.map(c => [c, labCheck(c, st.vals[c.id], id)]).filter(([c, r]) => r.said && r.why && labShowErr(id, c) && (r.ok || labIsBar(c)));
  const coach = `<div class="coach"><div class="qhead"><small class="task-tag">Coach · step ${st.step + 1} of ${n}</small><span class="dots" aria-hidden="true">${dots}</span></div>
    <p class="pcon-task" tabindex="-1"><b>Your task:</b> ${labFill(id, s.task)}</p>
    ${said.map(([c, r]) => `<p class="lc-fb ${r.ok ? 'ok' : 'no'}"><b>${r.ok ? '✓' : '✗'}</b> ${labFill(id, r.why)}</p>`).join('')}
    ${done ? `<p class="coach-see"><b>Done.</b> In the real console you would now see: ${labFill(id, s.see)}</p>
      <div class="btns"><button class="btn" data-act="labNext" data-id="${id}">${st.step + 1 < n ? 'Next step ›' : 'Finish'}</button></div>` : ''}</div>`;
  return `${coach}${page}<p class="muted small">Practice only: laid out like the real console, but nothing is created in AWS and nothing costs credits.</p>`;
}
