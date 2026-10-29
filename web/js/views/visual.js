/* ---------- lesson diagrams (data in content/visuals.js) ---------- */
// HTML and CSS, not images: they wrap on a phone, follow the theme and can be read aloud.
function visualHTML(v){
  if (!v) return '';
  const body = {compare:visCompare, who:visWho, nested:visNested, scale:visScale, tiles:visTiles}[v.kind];
  return `<figure class="vis vis-${v.kind}">${body(v)}<figcaption>${v.caption}</figcaption></figure>`;
}
function visCompare(v){
  return `<div class="vis-cols">${v.cols.map(c => `<div class="vis-col tone-${c.tone}"><b>${c.title}</b>
    <ul>${c.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('')}</div>`;
}
// A grid of layers by model: the top `you` rows of each column are yours, the rest the provider's.
function visWho(v){
  const head = `<div class="who-h"></div>` + v.cols.map(c => `<div class="who-h">${c.title}${c.ex ? `<small>${c.ex}</small>` : ''}</div>`).join('');
  const rows = v.rows.map((r, i) => `<div class="who-r">${r}</div>` + v.cols.map(c => {
    const mine = i < c.you;
    return `<div class="who-c ${mine ? 'mine' : 'theirs'}" title="${r}: ${mine ? 'you' : 'provider'}">${mine ? 'You' : 'Them'}</div>`;
  }).join('')).join('');
  return `<div class="who" style="--cols:${v.cols.length}">${head}${rows}</div>
    <div class="vis-key"><span class="key mine"></span>You manage <span class="key theirs"></span>Them: the provider manages</div>`;
}
function visBox(b){
  return `<div class="nbox"><b>${b.title}</b>${b.note ? `<small>${b.note}</small>` : ''}
    ${b.items ? `<ul>${b.items.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
    ${b.children ? `<div class="nkids">${b.children.map(visBox).join('')}</div>` : ''}</div>`;
}
function visNested(v){
  return visBox(v.box) + (v.side ? `<div class="nside">${v.side.map(s => `<div><b>${s.title}</b><small>${s.note}</small></div>`).join('')}</div>` : '');
}
function visScale(v){
  return `<div class="scale-ends"><span>${v.from}</span><span>${v.to}</span></div>
    <ol class="scale">${v.steps.map(s => `<li><b>${s.name}</b><small>${s.note}</small></li>`).join('')}</ol>`;
}
function visTiles(v){
  return `<div class="tiles">${v.tiles.map(t => `<div class="tile"><small>${t.tag}</small><b>${t.title}</b><span>${t.text}</span></div>`).join('')}</div>`;
}
