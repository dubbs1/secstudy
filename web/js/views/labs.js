/* ---------- Labs ---------- */
function renderLabs(){
  const fOpen = S.open === 'free';
  let h = `<div class="card ${fOpen ? 'open' : ''}"><button class="row" data-act="toggleFree" aria-expanded="${fOpen}">
    <span class="n">$</span><span class="t"><b>The AWS Free plan</b><small>New rules since July 2025</small></span><span class="chev">›</span></button>`;
  if (fOpen) h += `<div class="body"><ul class="pts">
      <li>New accounts choose a <b>Free</b> or <b>Paid</b> plan at sign-up. These labs assume the <b>Free plan</b>.</li>
      <li>You get <b>$100 in credits</b>, and up to <b>$200</b> in total by doing activities in the console.</li>
      <li>The Free plan ends after <b>6 months</b> or when the credits run out, whichever comes first.</li>
      <li>On the Free plan, overruns use up credits, not your card.</li>
      <li>Clean up at the end of every lab so the credits last.</li></ul></div>`;
  h += '</div>';
  LABS.forEach((lab, idx) => {
    const st = S.labs[lab.id] || [], n = st.filter(Boolean).length, all = n === lab.steps.length;
    const open = S.openLab === lab.id && !fOpen;
    h += `<div class="card ${open ? 'open' : ''}"><button class="row" data-act="openLab" data-id="${lab.id}" aria-expanded="${open}">
      <span class="n ${all ? 'done' : ''}">${all ? '✓' : idx + 1}</span>
      <span class="t"><b>${lab.t}</b><small>about ${lab.min} min · ${n}/${lab.steps.length} steps</small></span><span class="chev">›</span></button>`;
    if (open) {
      h += '<div class="body">';
      lab.steps.forEach((s, i) => {
        h += `<label class="check ${st[i] ? 'on' : ''}"><input type="checkbox" data-act="labStep" data-id="${lab.id}" data-i="${i}" ${st[i] ? 'checked' : ''}><span>${s}</span></label>`;
      });
      h += `<div class="note">${lab.note}</div>`;
      if (n) h += `<div class="btns"><button class="btn ghost" data-act="labReset" data-id="${lab.id}">Untick all</button></div>`;
      h += '</div>';
    }
    h += '</div>';
  });
  return h;
}
