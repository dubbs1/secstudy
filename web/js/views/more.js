/* ---------- More: everything that is not a next step ---------- */
// Look up, the exam plan, the exam facts, hands-on labs and settings, each folded until opened.
function renderMore(){
  const labsDone = LABS.filter(l => (S.labs[l.id] || []).filter(Boolean).length === l.steps.length).length;
  return lookupCard() + examPlanCard()
    + `<div class="card"><button class="row" data-act="goLabs"><span class="n">⚗</span><span class="t"><b>Hands-on labs</b>
       <small>${labsDone}/${LABS.length} done · practise in the app first, then the real console</small></span><span class="chev">›</span></button></div>`
    + factsCard() + prefsCard();
}
