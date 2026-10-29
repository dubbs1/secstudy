/* ---------- the guided path through a lesson, and "Picture it" (data in content/scenes.js) ---------- */
// A lesson is one line of parts. Finishing a part (a deck, a game, every situation) shows a bridge card under it:
// what you just did, how the next part builds on it, and Continue. Nothing moves by itself; Continue fades the next
// part in. Each part offers the bridge once per visit, so going back to look again never pushes you on. Each lesson
// opens with "Remember from before": pictures from the lessons it builds on, to recall before reading on.
const PATH = [[0, 'recap'], [0, 'scene'], [0, 'points'], [0, 'cards'], [1, 'how'], [1, 'look'], [1, 'test'], [2, 'sim'], [2, 'cases'], [3, null], [4, null]];
const PART_NAMES = {recap:'Remember', scene:'Picture it', points:'Key points', cards:'Flip cards', how:'How it works', look:'Picture', test:'Test yourself', sim:'What if', cases:'Situations'};
const pathUi = {done:{}, next:null, enter:false};   // parts finished ("l3:0:cards"), the bridge on show, fade the next part in
const sceneUi = {}, recapUi = {};                    // pictures tapped in each lesson's scene and recap

const partLabel = p => p[1] ? PART_NAMES[p[1]] : STAGES[p[0]];
function partDone(lid, stage, mode){ return !!pathUi.done[`${lid}:${stage}:${mode}`]; }
function nextPart(part){
  const i = PATH.findIndex(p => p[0] === part[0] && p[1] === part[1]);
  return i >= 0 ? PATH[i + 1] || null : null;
}
// Called when a tap finishes a part: marks it and (the first time only) shows the bridge to the next part.
function finishPart(lid, part){
  const k = `${lid}:${part[0]}:${part[1]}`;
  if (pathUi.done[k]) return;
  pathUi.done[k] = true;
  const to = nextPart(part); if (!to) return;
  pathUi.next = {id:lid, from:part, to}; pathUi.fresh = true;
  pathUi.back = controlKey(document.activeElement);   // where focus returns after Not now
  const l = LESSONS.find(x => x.id === lid);
  $('#advanceBar').textContent = `${partLabel(part)} done. ${bridgeText(l, part, to)} Continue is below.`;
}
function stayHere(){ pathUi.next = null; }
function goNextPart(){
  const n = pathUi.next; stayHere();
  if (!n || S.tab !== 'learn' || S.openLesson !== n.id) { render(); return; }
  S.stage[n.id] = n.to[0]; S.current = n.id;
  if (n.to[1]) ui.mode[n.id + ':' + n.to[0]] = n.to[1];
  // Within a stage focus goes to the part's tab; to a new stage, to the stage strip. Either way it is said.
  const sameStage = n.to[0] === n.from[0];
  pathUi.enter = true;
  focusTo = sameStage ? '[data-act=mode][aria-pressed=true]' : '[data-act=stage][aria-current=step]';
  announce(`Now: ${sameStage || !n.to[1] ? '' : STAGES[n.to[0]] + ', '}${partLabel(n.to)}.`);
  save(); render();
  const top = $('#lessonTop');   // a gentle scroll back up to the lesson, not a jump
  if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
}

// How the next part builds on the one just done: one sentence that ties them together.
function bridgeText(l, from, to){
  const sc = SCENES[l.id], terms = sc ? sc.items.slice(0, 3).map(it => it.aws).join(', ') : '';
  const k = `${from[1] || from[0]}>${to[1] || to[0]}`;
  return ({
    'recap>scene': `You remembered ${recapItems(l).length} ideas from ${lessonsText(l)}. Next, Picture it: today's new pictures, which build on them.`,
    'scene>points': `You matched ${sc ? sc.items.length : ''} everyday pictures to ${terms} and more. Next, the key points: the same ideas in the exact words the exam uses.`,
    'points>cards': 'You have read the terms. Next, flip cards: say each one from memory before you flip, which is what makes it stick.',
    'cards>how': 'You know the words. Next, see them at work: a picture that builds up one step at a time.',
    'how>look': 'You saw it step by step. Next, the whole picture at once: find each step you just watched.',
    'look>test': 'Next, test yourself on that picture, without looking back.',
    'test>sim': 'You know where each part goes. Next, Try: switch parts on and off and see what breaks, and why.',
    'sim>cases': 'You saw what each part makes possible. Next, real situations: decide before you open the answer.',
    'cases>3': `Next, the quiz: ${qsFor(l.id).length} exam-style questions on everything so far. Wrong answers explain themselves.`,
    '3>4': 'Last step: mark the lesson done. What you learned here comes back at the start of the lessons that build on it.'
  })[k] || `Next: ${partLabel(to)}.`;
}
// The bridge card, under the part just finished.
function bridgeHTML(l){
  const n = pathUi.next; if (!n || n.id !== l.id) return '';
  const to = `${n.to[0] !== n.from[0] && n.to[1] ? STAGES[n.to[0]] + ': ' : ''}${partLabel(n.to)}`;
  const fresh = pathUi.fresh; pathUi.fresh = false;
  return `<div class="bridge ${fresh ? 'fresh' : ''}"><span class="adv-check" aria-hidden="true">✓</span><div class="bridge-t">
    <b>${partLabel(n.from)} done.</b> <span>${bridgeText(l, n.from, n.to)}</span></div>
    <div class="btns"><button class="btn" data-act="advGo">Continue: ${to} ›</button><button class="link" data-act="advStay">Not now</button></div></div>`;
}

/* Remember from before: the first part of a lesson that builds on earlier ones. Pictures from those lessons come
   back; you say what each stands for, then tap to check. Then Picture it, today's new pictures. */
const recapFrom = l => (SCENES[l.id] && SCENES[l.id].builds || []).filter(id => SCENES[id]);
const recapItems = l => { const from = recapFrom(l); return from.flatMap(id => SCENES[id].items.slice(0, from.length > 1 ? 2 : 4).map((it, i) => ({...it, key:id + ':' + i}))); };
const hasRecap = l => recapFrom(l).length > 0;
const lessonsText = l => { const n = recapFrom(l).map(lessonNo); return (n.length > 1 ? 'lessons ' : 'lesson ') + n.join(' and '); };
function recapHTML(l){
  const items = recapItems(l), seen = recapUi[l.id] || [];
  return `<div class="scene recap"><b class="flow-t">Remember from before</b>
    <p class="muted small">From ${lessonsText(l)}. Say what each one stands for in AWS, then tap to check. ${seen.length} of ${items.length}.</p>
    <div class="scene-grid">${items.map(it => { const open = seen.includes(it.key);
      return `<button class="scene-item ${open ? 'open' : ''}" data-act="recapTap" data-id="${l.id}" data-v="${it.key}" aria-expanded="${open}">
        <span class="scene-e" aria-hidden="true">${it.e}</span><span class="scene-t">${it.t}</span>
        ${open ? `<span class="scene-a"><b>= ${it.aws}</b></span>` : '<span class="scene-q" aria-hidden="true">Think, then tap</span>'}</button>`; }).join('')}</div>
    ${seen.length < items.length ? `<p class="center small"><button class="link" data-act="recapSkip" data-id="${l.id}">Skip to today's pictures</button></p>` : ''}</div>`;
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
  return `<div class="btns part-done"><button class="btn ghost small" data-act="partDone" data-id="${l.id}" data-i="${stage}" data-v="${mode}">${label}</button></div>`;
}
