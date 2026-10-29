/* ---------- the guided path through a lesson, and "Picture it" (data in content/scenes.js) ---------- */
// A lesson is one line of parts. Finishing a part (a deck, a game, every situation) moves you on to the next one
// by itself after a short pause, with Go now and Stay here. Each part moves you on once per visit, so going back
// to look again never bounces you forward. Per-visit state only.
const PATH = [[0, 'scene'], [0, 'points'], [0, 'cards'], [1, 'how'], [1, 'look'], [1, 'test'], [2, 'sim'], [2, 'cases'], [3, null], [4, null]];
const PART_NAMES = {scene:'Picture it', points:'Key points', cards:'Flip cards', how:'How it works', look:'Picture', test:'Test yourself', sim:'What if', cases:'Situations'};
const ADVANCE_MS = 2200;
const pathUi = {done:{}, next:null, timer:null};   // parts finished ("l3:0:cards"), the move waiting to happen
const sceneUi = {};                                 // things tapped in each lesson's scene

const partLabel = p => p[1] ? PART_NAMES[p[1]] : STAGES[p[0]];
function partDone(lid, stage, mode){ return !!pathUi.done[`${lid}:${stage}:${mode}`]; }
function nextPart(part){
  const i = PATH.findIndex(p => p[0] === part[0] && p[1] === part[1]);
  return i >= 0 ? PATH[i + 1] || null : null;
}
// Called when a tap finishes a part: marks it, then (the first time only) offers the move to the next part.
// auto: move by itself after a pause. Parts that end on feedback (an answer, a score) pass false: the banner then
// waits for Next, so the explanation stays on screen until it has been read.
function finishPart(lid, part, auto = true){
  const k = `${lid}:${part[0]}:${part[1]}`;
  if (pathUi.done[k]) return;
  pathUi.done[k] = true;
  const to = nextPart(part); if (!to) return;
  pathUi.next = {id:lid, from:part, to};
  pathUi.back = controlKey(document.activeElement);   // where focus returns after Stay here
  clearTimeout(pathUi.timer); pathUi.timer = auto ? setTimeout(goNextPart, ADVANCE_MS) : null;
}
function stayHere(){ clearTimeout(pathUi.timer); pathUi.timer = null; pathUi.next = null; }
function goNextPart(){
  const n = pathUi.next; stayHere();
  if (!n || S.tab !== 'learn' || S.openLesson !== n.id) { render(); return; }
  S.stage[n.id] = n.to[0]; S.current = n.id;
  if (n.to[1]) ui.mode[n.id + ':' + n.to[0]] = n.to[1];
  // Within a stage focus goes to the part's tab; to a new stage, to the stage strip. Either way it is said.
  const sameStage = n.to[0] === n.from[0];
  reveal = '#lessonTop'; focusTo = sameStage ? '[data-act=mode][aria-pressed=true]' : '[data-act=stage][aria-current=step]';
  announce(`Now: ${sameStage || !n.to[1] ? '' : STAGES[n.to[0]] + ', '}${partLabel(n.to)}.`);
  save(); render();
}
// The banner at the bottom of the screen while a move is waiting.
function pathBanner(){
  const n = pathUi.next; if (!n) return '';
  return `<div class="advance"><span class="adv-check" aria-hidden="true">✓</span>
    <span class="adv-t"><b>${partLabel(n.from)} done.</b> Next: ${n.to[0] !== n.from[0] && n.to[1] ? `${STAGES[n.to[0]]} · ` : ''}${partLabel(n.to)}</span>
    ${pathUi.timer ? `<button class="btn small" data-act="advGo">Go now</button><button class="link" data-act="advStay">Stay here</button>
    <i class="adv-bar" style="animation-duration:${ADVANCE_MS}ms" aria-hidden="true"></i>`
      : `<button class="btn small" data-act="advGo">Next ›</button><button class="link" data-act="advStay">Not yet</button>`}</div>`;
}

/* Picture it: tap each everyday thing to see the AWS idea it stands for */
function sceneHTML(l){
  const sc = SCENES[l.id], seen = sceneUi[l.id] || (sceneUi[l.id] = []), n = sc.items.length;
  return `<div class="scene"><b class="flow-t">${sc.title}</b>
    <p class="muted small">Tap each picture to see what it is in AWS. ${seen.length} of ${n} found.</p>
    <div class="scene-grid">${sc.items.map((it, i) => {
      const open = seen.includes(i);
      return `<button class="scene-item ${open ? 'open' : ''}" data-act="sceneTap" data-id="${l.id}" data-i="${i}" aria-expanded="${open}">
        <span class="scene-e" aria-hidden="true">${it.e}</span><span class="scene-t">${it.t}</span>
        ${open ? `<span class="scene-a"><b>= ${it.aws}</b><small>${markNumbers(it.n)}</small></span>` : '<span class="scene-q" aria-hidden="true">Tap to see</span>'}</button>`;
    }).join('')}</div></div>`;
}

// "I've read these" and "I've looked" buttons, for the parts with nothing else to finish.
function partDoneBtn(l, stage, mode, label){
  return `<div class="btns part-done"><button class="btn ghost" data-act="partDone" data-id="${l.id}" data-i="${stage}" data-v="${mode}">${label}</button></div>`;
}
