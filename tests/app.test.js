// Browser checks for the app in web/, opened from disk. Run: node tests/app.test.js
// Prints one PASS/FAIL line per check and exits 1 if any fail.
const path = require('path');
const fs = require('fs');
const os = require('os');
const {chromium} = require('playwright');
const {WEB, check, ok, finish, serveWeb} = require('./lib');

const URL = 'file://' + path.join(WEB, 'index.html');
const text = async (p, sel) => (await p.textContent(sel)).replace(/\s+/g, ' ').trim();

(async () => {
  const browser = await chromium.launch(process.env.PW_CHROMIUM ? {executablePath:process.env.PW_CHROMIUM} : {});
  const errors = [];
  async function fresh(opts = {}){
    const ctx = await browser.newContext({viewport:{width:390, height:800}, acceptDownloads:true, ...opts});
    const p = await ctx.newPage();
    p.setDefaultTimeout(8000);   // a broken build fails in minutes, not hours
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(URL);
    return p;
  }
  async function seed(p, data){
    await p.evaluate(d => { localStorage.clear(); if (d !== undefined) localStorage.setItem('awsCourse1', typeof d === 'string' ? d : JSON.stringify(d)); }, data);
    await p.reload();
  }
  const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1') || 'null'));
  const answerOf = (p, qid) => p.evaluate(id => QUESTIONS.find(q => q.id === id).a, qid);

  // ---------- content ----------
  const p = await fresh();
  await check('content: lessons, questions and labs present; header counts match', async () => {
    const c = await p.evaluate(() => [LESSONS.length, QUESTIONS.length, LABS.length]);
    ok(c.every(n => n > 0), 'got ' + c);
    ok((await text(p, '.stats')).includes(`Lessons 0/${c[0]}`) && (await text(p, '.stats')).includes(`/${c[1]}`), 'header counts');
  });
  await check('content: every question is well-formed', async () => {
    const bad = await p.evaluate(() => {
      const ids = new Set(), out = [];
      for (const q of QUESTIONS) {
        if (ids.has(q.id)) out.push(q.id + ' duplicate id'); ids.add(q.id);
        if (q.o.length !== 4) out.push(q.id + ' not 4 options');
        if (!(q.a >= 0 && q.a < 4)) out.push(q.id + ' bad answer index');
        if (!q.x) out.push(q.id + ' no explanation');
        q.o.forEach(([t, why], i) => { if (!t) out.push(q.id + ' empty option'); if (i !== q.a && !why) out.push(q.id + ' option ' + i + ' has no why'); });
        if (!LESSONS.some(l => l.id === q.l)) out.push(q.id + ' unknown lesson');
      }
      return out;
    });
    ok(!bad.length, bad.join('; '));
  });
  await check('content: 3 questions per lesson, due dates in order before the exam', async () => {
    const examDate = await p.evaluate(() => EXAM.date);
    const r = await p.evaluate(() => LESSONS.map((l, i) => [QUESTIONS.filter(q => q.l === l.id).length, l.due, i ? LESSONS[i - 1].due : '']));
    r.forEach(([n, due, prev], i) => { ok(n >= 3, `lesson ${i + 1} has ${n} questions`); ok(due > prev && due < examDate, `lesson ${i + 1} due ${due}`); });
  });
  await check('content: lessons follow the domain weights (4/4/5/2)', async () => {
    const c = await p.evaluate(() => ['cc', 'sec', 'tech', 'bill'].map(d => LESSONS.filter(l => l.d === d).length).join('/'));
    ok(c === '4/4/5/2', c);
  });

  // ---------- saved progress ----------
  await check('first load: opens on Today with one Next up action (U1.1, U1.2)', async () => {
    await seed(p);
    ok(await p.getAttribute('#nav [data-tab=today]', 'aria-selected') === 'true', 'Today not selected');
    ok((await p.$$('#nextUpBtn')).length === 1 && await text(p, '#nextUpBtn') === 'Start lesson', 'next up: ' + await text(p, '#main'));
    ok((await text(p, '.nextup')).includes('Lesson 1:') && (await text(p, '.nextup')).includes('15 min'), 'next up does not name lesson 1 and its time');
  });
  await check('older data under awsCourse1 is backed up and never dropped', async () => {
    const old = {lessons:[true, false], done:[1, 2], xp:7};
    await seed(p, old);
    await p.click('#nav [data-tab=labs]');   // forces a save
    const s = await saved(p);
    ok(await p.evaluate(() => localStorage.getItem('awsCourse1_backup')) === JSON.stringify(old), 'backup missing');
    ok(s.xp === 7 && JSON.stringify(s.lessons) === '[true,false]', 'unknown fields lost');
    ok(JSON.stringify(s.old_done) === '[1,2]', 'conflicting field not kept as old_done');
  });
  await check('corrupt saved data does not break the page', async () => {
    await seed(p, '{not json');
    ok(await p.$('#main .card'), 'page did not render');
    await seed(p, {v:2, srs:{q1:{box:'x', due:5}, q2:'junk'}, review:{ids:['zz', 'q1'], i:0}, pFilter:7, ans:{}});
    const s = await p.evaluate(() => ({srs:S.srs, review:S.review, f:S.pFilter}));
    ok(!Object.keys(s.srs).length, 'broken srs kept');
    ok(s.f === 'all', 'bad filter kept');
    ok(s.review && s.review.ids.join() === 'q1', 'unknown review ids kept');
  });

  await check('hostile import: no script runs, no crash, no broken review dates', async () => {
    let alerted = false;
    const onDialog = d => { alerted = true; d.dismiss(); };
    p.on('dialog', onDialog);
    const evil = '<img src=x onerror=alert(1)>';
    for (const review of [{ids:['q1', 'q2'], i:-1}, {ids:['q1', 'q2'], i:1.5}, {ids:['q1', 'q2'], i:5}]) {
      await seed(p, {v:2, tab:'learn', review,
        ans:{q1:{n:1, ok:false, pick:0, wrong:evil}, q2:{n:1, ok:true, pick:0, at:'yesterday'}, gone:{n:1, ok:false}, odd:3},
        srs:{q3:{box:-3, due:'2020-01-01'}, q4:{box:1.5, due:'2020-01-01'}, gone:{box:0, due:'2020-01-01'}}});
      ok(await p.$('#main .card'), 'Learn tab blank with review ' + JSON.stringify(review));
    }
    await p.click('#nav [data-tab=practice]');
    await p.click('[data-act=toggleWeak]');
    await p.waitForTimeout(200);
    p.off('dialog', onDialog);
    ok(!alerted, 'script from the imported file ran');
    const [s, in7] = await p.evaluate(() => [S, addDays(todayISO(), 7)]);
    ok(s.ans.q1.wrong === 0 && s.srs.q2.due === in7 && s.old_ans.odd === 3, 'bad numbers or dates kept: ' + JSON.stringify([s.ans.q1, s.srs.q2]));
    ok(s.srs.q3.box === 0 && s.srs.q4.box === 1 && !s.srs.gone, 'boxes not cleaned: ' + JSON.stringify(s.srs));
    ok(JSON.stringify(s.srs).indexOf('NaN') < 0, 'NaN date in schedule');
  });

  // ---------- Learn ----------
  await check('lesson quiz: wrong answer explains itself inline, retry works', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l1', stage:{l1:3}});
    const wrong = ((await answerOf(p, 'q1')) + 1) % 4;
    await p.click(`[data-act=pick][data-q=q1][data-i="${wrong}"]`);
    ok(await p.$('.opt.wrong .why'), 'no inline why');
    ok(await p.$('.opt.right'), 'right answer not shown');
    ok((await text(p, '.fb')).startsWith('The answer is'), 'no explanation');
    await p.click('[data-act=lqRetry]');
    ok(!(await p.$('.opt.wrong')), 'retry did not reset');
  });
  await check('lesson: finishing the quiz ticks its step, done opens the next lesson', async () => {
    for (const q of ['q1', 'q2', 'q3']) {
      if (await p.$(`[data-act=pick][data-q=${q}]:not([disabled])`)) await p.click(`[data-act=pick][data-q=${q}][data-i="${await answerOf(p, q)}"]`);
      if (await p.$('[data-act=lqNext]')) await p.click('[data-act=lqNext]');
    }
    const s = await saved(p);
    ok(s.steps.l1 && s.steps.l1[2] === true, 'quiz step not ticked');
    await p.click('[data-act=stageNext][data-id=l1]');
    await p.click('[data-act=done][data-id=l1]');
    const s2 = await saved(p);
    ok(s2.done.l1 === true && s2.openLesson === 'l2', 'next lesson not opened');
    ok(await text(p, '.lesson-t') === 'Service and deployment models', 'next lesson not shown');
    ok((await text(p, '.stats')).includes('Lessons 1/' + await p.evaluate(() => LESSONS.length)), 'header not updated');
  });
  await check('exam facts open and close on Today', async () => {
    await p.click('#nav [data-tab=today]');
    await p.click('[data-act=toggleFacts]');
    ok((await text(p, '.card.open')).includes('700 / 1000'), 'facts not shown');
    await p.click('[data-act=toggleFacts]');
    ok(!(await p.$('.card.open')), 'facts did not close');
  });

  // ---------- smart review ----------
  await check('review: answers from before are scheduled (misses due today)', async () => {
    const now = Date.now();
    await seed(p, {v:2, ans:{q1:{n:1, wrong:0, pick:0, ok:true, at:now}, q2:{n:1, wrong:1, pick:0, ok:false, at:now}}});
    const today = await p.evaluate(() => todayISO()), in7 = await p.evaluate(() => addDays(todayISO(), 7));
    const srs = await p.evaluate(() => S.srs);
    ok(srs.q2.due === today && srs.q1.due === in7, JSON.stringify(srs));
    ok((await text(p, '.stats')).includes('Review due 1'), 'header has no review count');
  });
  await check('review: session runs alone on Today, schedules 1 / 3 / 7 days', async () => {
    ok(await text(p, '#nextUpBtn') === 'Start review', 'due review is not the next step');
    await p.click('#nextUpBtn');
    ok((await p.$$('#main .card')).length === 1, 'other cards showing during review');
    await p.click(`.card.review [data-act=pick][data-i="${await answerOf(p, 'q2')}"]`);
    await p.click('[data-act=rvNext]');
    ok((await text(p, '.card.review')).includes('1 of 1 right'), 'summary wrong');
    const r = await p.evaluate(() => [S.srs.q2.box, S.srs.q2.due === addDays(todayISO(), 3)]);
    ok(r[0] === 1 && r[1], 'right answer not pushed to 3 days: ' + r);
    await p.click('[data-act=rvClose]');
    ok(await text(p, '#nextUpBtn') === 'Start lesson', 'after review, next up is not the lesson');
    // a miss comes back tomorrow
    await p.click('#nav [data-tab=practice]');
    await p.click('[data-act=pMode][data-v=all]');
    const qid = await p.getAttribute('[data-act=pick]', 'data-q');
    await p.click(`[data-act=pick][data-i="${((await answerOf(p, qid)) + 1) % 4}"]`);
    ok(await p.evaluate(id => S.srs[id].box === 0 && S.srs[id].due === addDays(todayISO(), 1), qid), 'miss not due tomorrow');
  });
  await check('review: a session survives a reload, at most 10 per sitting', async () => {
    const ans = {}; for (let i = 1; i <= 14; i++) ans['q' + i] = {n:1, wrong:1, pick:0, ok:false, at:Date.now()};
    await seed(p, {v:2, ans});
    await p.click('[data-act=rvStart]');
    ok((await text(p, '.qhead')).includes('of 10'), 'not capped at 10');
    await p.reload();
    ok(await p.$('.card.review [data-act=pick]'), 'review lost on reload');
  });

  // ---------- Practice ----------
  await check('practice: filters, "not right yet" drops right answers after Next', async () => {
    await seed(p, {v:2, tab:'practice'});
    await p.click('[data-act=pFilter][data-v=bill]');
    const nBill = await p.evaluate(() => QUESTIONS.filter(q => LESSONS.find(l => l.id === q.l).d === 'bill').length);
    ok((await text(p, '.qhead')).includes('of ' + nBill), 'billing filter wrong');
    const qid = await p.getAttribute('[data-act=pick]', 'data-q');
    await p.click(`[data-act=pick][data-i="${await answerOf(p, qid)}"]`);
    await p.click('[data-act=pNext]');
    ok((await text(p, '.qhead')).includes('of ' + (nBill - 1)), 'right answer still in set');
  });
  await check('weak spots: domain bars and "Practise" filters to that lesson', async () => {
    await seed(p, {v:2, tab:'practice', ans:{q19:{n:2, wrong:2, pick:0, ok:false, at:Date.now()}}});
    await p.click('[data-act=toggleWeak]');
    const t = await text(p, '.card.open');
    ok(t.includes('Lowest: Security') && t.includes('Security services'), t.slice(0, 120));
    await p.click('[data-act=pLesson][data-id=l7]');
    ok((await text(p, '.qhead')).includes('Lesson 7 · 1 of ' + await p.evaluate(() => qsFor('l7').length)), 'lesson filter not applied');
    ok((await text(p, '.seg.small')).includes('Lesson 7 ✕'), 'no clear-filter pill');
  });

  // ---------- Labs ----------
  await check('labs: ticks persist across a reload', async () => {
    await seed(p, {v:2, tab:'labs'});
    await p.click('[data-act=openLab][data-id=lab3]');
    await p.click('.check input');
    await p.reload();
    ok((await text(p, '.card.open')).includes('1/6 steps'), 'tick lost');
  });

  // ---------- Timer ----------
  await check('timer: 15 min default, runs, survives reload, 5 min option', async () => {
    await seed(p, {v:2, tab:'timer'});
    ok(await text(p, '#clock') === '15:00', 'default not 15:00');
    await p.click('[data-act=tGo]');
    await p.waitForTimeout(1300);
    ok((await text(p, '#clock')) < '15:00', 'not counting');
    await p.reload();
    ok((await text(p, '#clock')) < '15:00' && await p.$('#miniClock'), 'lost on reload');
    await p.click('[data-act=tLen][data-v="5"]');
    ok(await text(p, '#clock') === '05:00', '5 min not set');
  });
  await check('timer: finishing resets and says time is up', async () => {
    await p.evaluate(() => { S.timer.end = Date.now() + 300; save(); render(); });
    await p.waitForTimeout(900);
    ok(await text(p, '#clock') === '05:00', 'did not reset after finishing');
    ok(await p.$('.toast'), 'no message');
  });

  // ---------- backup ----------
  await check('export then import restores progress', async () => {
    await seed(p, {v:2, done:{l1:true, l2:true}});
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act=export]')]);
    const file = path.join(os.tmpdir(), 'secstudy-export.json');
    await dl.saveAs(file);
    ok(JSON.parse(fs.readFileSync(file, 'utf8')).done.l2 === true, 'export missing data');
    await seed(p, {v:2, done:{l3:true}});
    let dialogs = 0; const onDialog = d => { dialogs++; d.dismiss(); }; p.on('dialog', onDialog);
    await p.setInputFiles('#importFile', file);
    await p.waitForSelector('#importBar:not([hidden])');
    ok((await text(p, '#importBar')).includes('secstudy-export.json'), 'bar does not name the file');
    ok(await p.evaluate(() => document.activeElement.dataset.act === 'importYes'), 'Replace button not focused');
    await p.click('[data-act=importNo]');
    ok(await p.evaluate(() => S.done.l3 === true && !S.done.l2) && await p.isHidden('#importBar'), 'Cancel changed progress (AC8.2)');
    await p.setInputFiles('#importFile', file);
    await p.click('[data-act=importYes]');
    await p.waitForFunction(() => S.done.l2 === true);
    p.off('dialog', onDialog);
    ok(!dialogs, 'a browser dialog was used (AC8.1)');
    ok((await text(p, '.stats')).includes('Lessons 2/' + await p.evaluate(() => LESSONS.length)), 'import not shown');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1_beforeImport')).done.l3 === true), 'no backup of the replaced progress');
  });

  await check('a failed import write changes nothing and says so', async () => {
    await seed(p, {v:2, done:{l3:true}});
    await p.evaluate(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = function(){ throw new DOMException('full', 'QuotaExceededError'); }; });
    await p.setInputFiles('#importFile', {name:'p.json', mimeType:'application/json', buffer:Buffer.from(JSON.stringify({v:2, done:{l1:true}}))});
    await p.click('[data-act=importYes]');
    const msg = await text(p, '.toast');
    await p.evaluate(() => { Storage.prototype.setItem = window.__set; });
    ok(/Could not import/.test(msg), 'message: ' + msg);
    ok(await p.evaluate(() => S.done.l3 === true && !S.done.l1) && await p.isHidden('#importBar'), 'progress changed or bar left open');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1')).done.l3 === true), 'saved progress changed');
  });

  // ---------- layout ----------
  for (const [name, opts] of [['phone width, light', {}], ['phone width, dark', {colorScheme:'dark'}], ['narrow phone, 320 px (U7.3)', {viewport:{width:320, height:640}}], ['desktop width', {viewport:{width:1280, height:900}}]]) {
    await check('layout: no sideways scroll at ' + name, async () => {
      const q = await fresh(opts);
      for (const tab of ['today', 'learn', 'practice', 'labs', 'timer']) {
        await q.click(`#nav [data-tab=${tab}]`);
        const w = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(w <= 0, `${tab} overflows by ${w}px`);
      }
      await q.context().close();
    });
  }

  await check('installable app: manifest, icons, works offline from the first visit (AC1.3)', async () => {
    const {base, close} = await serveWeb();
    const ctx = await browser.newContext({viewport:{width:390, height:800}});
    try {
      const q = await ctx.newPage();
      q.on('pageerror', e => errors.push(e.message));
      await q.goto(base);
      const m = await q.evaluate(async () => {
        const href = document.querySelector('link[rel=manifest]').href;
        const man = await (await fetch(href)).json();
        const icons = await Promise.all(man.icons.concat([{src:'icons/apple-touch-icon.png'}]).map(async i => (await fetch(new URL(i.src, href))).status));
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, no) => setTimeout(() => no(new Error('offline cache (service worker) never started')), 10000))]);
        return {man, icons};
      });
      ok(m.man.display === 'standalone' && m.man.start_url && m.man.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'), 'manifest incomplete');
      ok(m.icons.every(s => s === 200), 'missing icon: ' + m.icons);
      // No second online visit: offline must work from what the service worker stored when it installed.
      await q.waitForFunction(() => navigator.serviceWorker.controller);
      await ctx.setOffline(true);
      await q.reload();
      ok((await text(q, '#main')).includes('Exam facts'), 'app did not load offline');
      ok(await q.evaluate(() => getComputedStyle(document.querySelector('.card')).borderRadius === '16px'), 'stylesheet missing offline');
    } finally { await ctx.close(); close(); }
  });

  // ---------- restructure (docs/RESTRUCTURE.md) ----------
  await check('progress saved by release 1.0.0 loads and shows the same (AC1.4)', async () => {
    const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'progress-v2-release-1.0.0.json'), 'utf8'));
    await seed(p, fx.saved);
    ok((await text(p, '.stats')).startsWith(fx.shown.stats), 'header differs: ' + await text(p, '.stats'));
    ok(await text(p, '.lesson-t') === fx.shown.open, 'different lesson open');
    const now = await p.evaluate(() => S);
    for (const k of Object.keys(fx.saved)) ok(JSON.stringify(now[k]) === JSON.stringify(fx.saved[k]), 'field changed on load: ' + k);
  });
  await check('footer shows the version (AC3.1)', async () => {
    ok(await text(p, '#ver') === 'Version ' + await p.evaluate(() => APP_VERSION), 'got ' + await text(p, '#ver'));
  });
  await check('exam text follows the data (AC4.2)', async () => {
    await seed(p);
    const [nLessons, nBillLessons] = await p.evaluate(() => [LESSONS.length, LESSONS.filter(l => l.d === 'bill').length]);
    await p.evaluate(() => {
      EXAM.date = '2027-03-15'; EXAM.questions = 70;
      LESSONS.push({...LESSONS.find(l => l.d === 'bill'), id:'lx', t:'Extra billing lesson', due:'2027-03-01'});
      S.tab = 'today'; S.open = 'facts'; render();
    });
    const head = await text(p, '#top .sub'), facts = await text(p, '.card.open');
    await p.evaluate(() => { LESSONS.forEach(l => S.done[l.id] = true); S.open = null; S.tab = 'learn'; S.openLesson = null; render(); });
    const doneMsg = await text(p, '#main .note');
    await p.reload();   // restore the real content
    ok(head.includes('2027'), 'header year did not follow: ' + head);
    ok(facts.includes('70 questions') && facts.includes(`${nBillLessons + 1} billing`), 'facts did not follow: ' + facts.slice(0, 160));
    ok(doneMsg.startsWith(`All ${nLessons + 1} lessons done`), 'done message: ' + doneMsg);
    ok((await text(p, '.stats')).includes(`Lessons 0/${nLessons}`), 'content not restored');
  });
  await check('an opened lesson, lab or card stays on screen (AC5.1)', async () => {
    await seed(p, {v:2, tab:'learn'});
    const onScreen = sel => p.evaluate(s => { const t = document.querySelector(s).getBoundingClientRect().top; return t >= 0 && t < innerHeight; }, sel);
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=openLesson][data-id=l14]');
    ok(await onScreen('#lessonTop') && await text(p, '.lesson-t') === 'Pricing models', 'lesson 14 off screen');
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=stageNext]');
    ok(await onScreen('#lessonTop'), 'next stage starts off screen');
    await p.click('[data-act=closeLesson]');
    ok(await onScreen('[data-act=openLesson][data-id=l14]'), 'back to the list, lesson 14 row off screen');
    await p.click('#nav [data-tab=today]');
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=toggleFacts]');
    ok(await onScreen('[data-act=toggleFacts]'), 'exam facts off screen');
    await p.click('#nav [data-tab=labs]'); await p.click('[data-act=openLab][data-id=lab1]');
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=openLab][data-id=lab6]');
    ok(await onScreen('[data-act=openLab][data-id=lab6]'), 'lab 6 off screen');
  });
  await check('keyboard focus is kept; answers are announced (AC6.1-6.4)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l1', stage:{l1:3}});
    const active = () => p.evaluate(() => { const a = document.activeElement; return a.className + '|' + (a.dataset.act || '') + '|' + (a.dataset.i || ''); });
    await p.focus('[data-act=pick][data-q=q1][data-i="1"]'); await p.keyboard.press('Enter');
    ok((await active()).startsWith('fb '), 'after answering, focus is on ' + await active());
    await p.waitForFunction(() => document.querySelector('#announce').textContent.length > 10);
    ok(/^(Right\.|The answer is)/.test(await text(p, '#announce')), 'announcement: ' + await text(p, '#announce'));
    await p.focus('[data-act=step][data-id=l1][data-i="2"]'); await p.keyboard.press('Space');
    ok(await active() === '|step|2', 'after ticking, focus is on ' + await active());
    await p.focus('[data-act=theme]'); await p.keyboard.press('Enter');
    ok((await active()).includes('|theme|'), 'after theme change, focus is on ' + await active());
    await p.keyboard.press('Enter'); await p.keyboard.press('Enter');   // back to System
    // the control goes away: "Next question" -> first answer of the next question
    await p.focus('[data-act=lqNext]'); await p.keyboard.press('Enter');
    ok(await p.evaluate(() => document.activeElement.dataset.act === 'pick' && document.activeElement.dataset.q === 'q2'), 'after Next question, focus is on ' + await active());
    // review: Next, Finish and Stop never leave focus on something off screen
    const seen = () => p.evaluate(() => { const a = document.activeElement, r = a.getBoundingClientRect();
      return (r.bottom > 0 && r.top < innerHeight) ? (a.dataset.act || a.id || a.tagName) : 'OFF SCREEN ' + (a.dataset.act || a.tagName); });
    await seed(p, {v:2, ans:{q1:{n:1, wrong:1, pick:0, ok:false, at:Date.now()}, q2:{n:1, wrong:1, pick:0, ok:false, at:Date.now()}}});
    await p.focus('#nextUpBtn'); await p.keyboard.press('Enter');
    ok(await seen() === 'pick', 'after Start review: ' + await seen());
    await p.keyboard.press('Enter'); await p.focus('[data-act=rvNext]'); await p.keyboard.press('Enter');
    ok(await seen() === 'pick', 'after Next: ' + await seen());
    await p.keyboard.press('Enter'); await p.focus('[data-act=rvNext]'); await p.keyboard.press('Enter');
    ok(['rvStart', 'rvClose'].includes(await seen()), 'after Finish: ' + await seen());
    await p.focus('[data-act=rvClose]'); await p.keyboard.press('Enter');
    ok(await seen() === 'openLesson', 'after Done: ' + await seen());
  });
  await check('filter rows are toggle buttons, only the tab bar is tabs (AC6.5)', async () => {
    await p.click('#nav [data-tab=practice]');
    ok(await p.$$eval('[role=tablist]', l => l.length) === 1, 'more than one tablist');
    ok(await p.$$eval('#main .seg.small button', bs => bs.every(b => b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-selected'))), 'filter buttons not aria-pressed');
    ok(await p.$$eval('#nav button', bs => bs.every(b => b.getAttribute('role') === 'tab')), 'tab bar lost role=tab');
  });
  for (const system of ['light', 'dark']) {
    await check(`theme: cycles, overrides a ${system} system, survives reload (AC7.1-7.3)`, async () => {
      const q = await fresh({colorScheme:system});
      const bg = () => q.evaluate(() => getComputedStyle(document.body).backgroundColor);
      ok((await q.getAttribute('[data-act=theme]', 'aria-label')).startsWith('Theme: System'), 'does not start on System');
      await q.click('[data-act=theme]');
      ok((await q.getAttribute('[data-act=theme]', 'aria-label')).startsWith('Theme: Light') && await bg() === 'rgb(245, 244, 242)', 'Light not applied: ' + await bg());
      await q.click('[data-act=theme]');
      ok((await q.getAttribute('[data-act=theme]', 'aria-label')).startsWith('Theme: Dark') && await bg() === 'rgb(22, 20, 28)', 'Dark not applied: ' + await bg());
      await q.reload();
      ok((await q.getAttribute('[data-act=theme]', 'aria-label')).startsWith('Theme: Dark') && await bg() === 'rgb(22, 20, 28)', 'Dark lost on reload');
      await q.click('[data-act=theme]');
      ok(await bg() === (system === 'dark' ? 'rgb(22, 20, 28)' : 'rgb(245, 244, 242)'), 'System not restored');
      await q.context().close();
    });
  }
  await check('a saved Light or Dark theme applies before the app scripts run (AC7.5)', async () => {
    const {base, close} = await serveWeb();
    const ctx = await browser.newContext({colorScheme:'light'});
    try {
      const q = await ctx.newPage();
      await q.goto(base);
      await q.evaluate(() => { S.theme = 'dark'; save(); });
      await q.route('**/js/app.js', r => r.abort());   // the app never starts: only the head script can set the theme
      await q.reload();
      ok(await q.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'no data-theme before app.js');
      ok(await q.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(22, 20, 28)', 'page not dark before app.js');
    } finally { await ctx.close(); close(); }
  });
  await check('text contrast is at least 4.5:1 in both themes, on every screen (AC7.4, U3.2)', async () => {
    const bad = [], found = new Set();
    // Each screen is a state; every selector must appear on at least one of them.
    const screens = [
      `S.tab = 'today'; S.srs.q1 = {box:0, due:'2020-01-01'}; S.days[todayISO()] = true; S.timer.left = 60000;`,
      `S.tab = 'today'; lookupQ = 'nat';`,
      `S.tab = 'learn'; S.openLesson = null; S.stage.l1 = 2;`,
      `S.tab = 'learn'; S.openLesson = 'l1'; S.stage.l1 = 3; S.ans.q1 = {n:1, wrong:1, pick:1, ok:false, at:Date.now()}; lqi.l1 = 0;`,
      `S.tab = 'learn'; S.openLesson = 'l1'; S.stage.l1 = 2; revealed['l1:0'] = true;`,
      `S.tab = 'learn'; S.openLesson = 'l2'; S.stage.l2 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l4'; S.stage.l4 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l5'; S.stage.l5 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l10'; S.stage.l10 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l12'; S.stage.l12 = 1;`,
      `S.tab = 'labs'; S.openLab = 'lab3'; S.labs.lab3 = [true];`
    ];
    const sels = ['body', '#top .sub', '.stat', '.stat.timer', '.theme', '.chip.d-cc', '.chip.d-sec', '.chip.d-tech', '.chip.d-bill', '.foot', '.foot .link', 'h3',
      '.hello', '.streak', '.task-tag', '.nextup small', '.week small', '.row-link small', 'mark', '.group-h small', '.row .t small', '.pill-going',
      '.stage.cur', '.stage', '.opt.wrong .why', '.fb', '.check em', '.answer', '.scenario p', '.who-c.mine', '.who-c.theirs', '.who-h small', '.vis figcaption',
      '.tile small', '.tile span', '.vis-col.tone-you b', '.vis-col.tone-aws li', '.nbox > small', '.nside small', '.scale-ends', '.scale li small', '.see', '.lab-steps li.now .task-tag'];
    for (const theme of ['light', 'dark']) {
      const q = await fresh();
      for (const setup of screens) {
        await q.evaluate(([t, js]) => { S.theme = t; (0, eval)(js); render(); }, [theme, setup]);
        const r = await q.evaluate(sels => {
          const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
          const bgOf = e => { let c; while (e && ((c = getComputedStyle(e).backgroundColor) === 'rgba(0, 0, 0, 0)')) e = e.parentElement; return c || getComputedStyle(document.body).backgroundColor; };
          return sels.map(s => { const e = document.querySelector(s); if (!e) return [s, null];
            // Dimmed (opacity) elements count as their text against the page: check them at full strength only.
            const [a, b] = [lum(getComputedStyle(e).color), lum(bgOf(e))].sort((x, y) => y - x); return [s, (a + .05) / (b + .05)]; });
        }, sels);
        for (const [sel, c] of r) { if (c === null) continue; found.add(sel); if (c < 4.5) bad.push(`${theme} ${sel} ${c.toFixed(2)}`); }
      }
      await q.context().close();
    }
    const missing = sels.filter(x => !found.has(x));
    ok(!missing.length, 'not found on any screen: ' + missing.join(', '));
    ok(!bad.length, [...new Set(bad)].join(', '));
  });

  // ---------- friendlier study flow (docs/UX.md) ----------
  async function at(date, opts = {}){   // a page whose clock reads `date`, for date-dependent screens
    const ctx = await browser.newContext({viewport:{width:390, height:844}, ...opts});
    const q = await ctx.newPage();
    q.setDefaultTimeout(8000);
    q.on('pageerror', e => errors.push(e.message));
    await q.clock.setFixedTime(new Date(date + 'T10:00:00'));
    await q.goto(URL);
    return q;
  }
  await check('Next up picks review, then the lesson in progress, then the next lesson (U1.2)', async () => {
    await seed(p, {v:2, stage:{l3:2}, ans:{q1:{n:1, wrong:1, pick:0, ok:false, at:Date.now()}}});
    ok(await text(p, '#nextUpBtn') === 'Start review', 'due review not first');
    await seed(p, {v:2, stage:{l3:2}});
    ok(await text(p, '#nextUpBtn') === 'Continue' && (await text(p, '.nextup')).includes('Lesson 3:') && (await text(p, '.nextup')).includes('you are on Try'), 'lesson in progress not next: ' + await text(p, '.nextup'));
    await p.click('#nextUpBtn');
    ok(await text(p, '.lesson-t') === 'Global infrastructure' && await p.getAttribute('[data-act=stage][aria-current=step]', 'data-i') === '2', 'did not continue at Try');
  });
  await check('This week lists lessons due in 7 days, done ticked, late marked (U1.3)', async () => {
    const q = await at('2026-11-02');
    await q.evaluate(() => { localStorage.setItem('awsCourse1', JSON.stringify({v:2, done:{l1:true, l3:true}})); });
    await q.reload();
    const rows = await q.$$eval('.week li', ls => ls.map(l => l.className + ':' + l.querySelector('b').textContent));
    ok(JSON.stringify(rows) === JSON.stringify([':Service and deployment models'.replace(':', 'late:'), 'done:Global infrastructure', ':Well-Architected, CAF and migration', ':The shared responsibility model', ':IAM: who can do what']), 'week: ' + JSON.stringify(rows));
    ok((await text(q, '.week li.late')).includes('late, was due'), 'late lesson not explained');
    await q.context().close();
  });
  await check('progress bar per exam domain and a study streak (U1.4, U1.5)', async () => {
    const q = await at('2026-11-10');
    await q.evaluate(() => { localStorage.setItem('awsCourse1', JSON.stringify({v:2, done:{l1:true, l5:true, l6:true}, days:{'2026-11-08':true, '2026-11-09':true}})); });
    await q.reload();
    const doms = await q.$$eval('.dom', ds => ds.map(d => d.innerText.replace(/\s+/g, ' ')));
    ok(doms[0].includes('24 % of the exam') && doms[0].includes('1/4 lessons') && doms[1].includes('2/4 lessons'), 'domains: ' + doms);
    ok(await text(q, '.streak') === '2-day streak', 'streak before studying today: ' + await text(q, '.hello'));
    await q.click('#nextUpBtn'); await q.click('[data-act=step][data-i="0"]');
    await q.click('#nav [data-tab=today]');
    ok(await text(q, '.streak') === '3-day streak', 'streak after a tick today: ' + await text(q, '.hello'));
    await q.evaluate(() => { S.days = {'2026-11-01':true}; render(); });
    ok(!(await q.$('.streak')), 'a broken streak still shows');
    await q.context().close();
  });
  await check('a lesson shows one stage at a time; Next, Back and the strip move; the stage is saved (U2.1, U2.2)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l2'});
    ok(await p.$$eval('[data-act=stage]', b => b.length) === 5 && (await p.$$('.stage-body')).length === 1, 'not five stages with one body');
    ok(await p.$$eval('[aria-current=step]', b => b.map(x => x.textContent.trim()).join()) === 'Read', 'does not start on Read');
    await p.click('[data-act=stageNext]'); ok(await p.$('figure.vis'), 'Next did not show See');
    await p.click('[data-act=stageNext]'); ok(await p.$('.scenario'), 'Next did not show Try');
    await p.click('[data-act=stagePrev]'); ok(await p.$('figure.vis'), 'Back did not show See');
    await p.click('[data-act=stage][data-i="3"]'); ok(await p.$('.opt'), 'strip did not jump to Check');
    await p.reload();
    ok(await p.$('.opt') && await text(p, '.lesson-t') === 'Service and deployment models', 'stage not kept after reload');
    await p.click('[data-act=closeLesson]');
    ok((await text(p, '[data-act=openLesson][data-id=l2]')).includes('In progress: Check'), 'list does not show the stage');
  });
  await check('each Do this task sits on its stage and keeps the same tick data (U2.3)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l4', steps:{l4:[true, false, true]}});
    for (const [stage, i, on] of [[0, 0, true], [2, 1, false], [3, 2, true]]) {
      await p.click(`[data-act=stage][data-i="${stage}"]`);
      const box = await p.$$eval('.stage-body [data-act=step]', bs => bs.map(b => b.dataset.i + ':' + b.checked));
      ok(JSON.stringify(box) === JSON.stringify([`${i}:${on}`]), `stage ${stage} task boxes ${box}`);
    }
    for (const stage of [1, 4]) { await p.click(`[data-act=stage][data-i="${stage}"]`); ok(!(await p.$('.stage-body [data-act=step]')), `task on stage ${stage}`); }
  });
  await check('Done offers next lesson, a 5 min break and the related lab (U2.4)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l10', stage:{l10:4}});
    ok(await p.$('[data-act=done][data-id=l10]') && await p.$('[data-act=breakTimer]') && await p.$('[data-act=goLab][data-id=lab3]'), 'missing a Done action');
    await p.click('[data-act=breakTimer]');
    ok(await p.evaluate(() => S.timer.len === 5 && S.timer.end > Date.now()) && await p.$('#miniClock'), 'break timer not running');
    await p.click('[data-act=goLab]');
    ok(await p.getAttribute('#nav [data-tab=labs]', 'aria-selected') === 'true' && (await text(p, '.card.open')).includes('S3: bucket'), 'lab not opened');
  });
  await check('no stage of any lesson is taller than 1.4 screens on a phone (U2.5)', async () => {
    const tall = await p.evaluate(() => {
      const out = [];
      for (const l of LESSONS) for (let k = 0; k < STAGES.length; k++) {
        S.tab = 'learn'; S.openLesson = l.id; S.stage[l.id] = k; (SCENARIOS[l.id] || []).forEach((x, i) => revealed[l.id + ':' + i] = true); render();
        const h = document.querySelector('#lessonTop').getBoundingClientRect().height;
        if (h > 844 * 1.4) out.push(`${l.id} ${STAGES[k]} ${Math.round(h)}px`);
      }
      return out;
    });
    await p.reload();
    ok(!tall.length, tall.join(', '));
  });
  await check('every lesson has a captioned diagram, scenarios hidden until asked, hands-on links (U3.1, U3.3, U4)', async () => {
    const probs = await p.evaluate(() => {
      const out = [];
      for (const l of LESSONS) {
        S.tab = 'learn'; S.openLesson = l.id; S.stage[l.id] = 1; render();
        const fig = document.querySelector('.stage-body figure.vis');
        if (!fig || !fig.querySelector('figcaption') || fig.querySelector('figcaption').textContent.trim().length < 15) out.push(l.id + ' diagram/caption');
        S.stage[l.id] = 2; render();
        const sc = document.querySelectorAll('.scenario');
        if (!sc.length) out.push(l.id + ' no scenario');
        if (document.querySelector('.answer')) out.push(l.id + ' answer shown before asking');
        const labs = LABS.filter(x => x.lessons.includes(l.id)).map(x => x.id).join();
        if ([...document.querySelectorAll('.handson [data-act=goLab]')].map(b => b.dataset.id).join() !== labs) out.push(l.id + ' hands-on links');
      }
      return out;
    });
    ok(!probs.length, probs.join(', '));
    await seed(p, {v:2, tab:'learn', openLesson:'l9', stage:{l9:2}});
    await p.focus('[data-act=reveal][data-i="0"]'); await p.keyboard.press('Enter');
    ok((await text(p, '.answer')).startsWith('Lambda'), 'answer not shown');
    ok(await p.evaluate(() => document.activeElement.classList.contains('answer')), 'focus not on the answer');
    await p.waitForFunction(() => document.querySelector('#announce').textContent.startsWith('Lambda'));
  });
  await check('labs: every step says what you should see; next step highlighted; cost and lessons shown (U5)', async () => {
    await seed(p, {v:2, tab:'labs', openLab:'lab4', labs:{lab4:[true, true]}});
    const steps = await p.$$eval('.lab-steps li', ls => ls.map(l => [l.className.trim(), !!l.querySelector('.see')]));
    ok(steps.length === 7 && steps.every(s => s[1]), 'missing You should see');
    ok(steps[0][0] === 'on' && steps[1][0] === 'on' && steps[2][0] === 'now' && steps.filter(s => s[0] === 'now').length === 1, 'highlight: ' + JSON.stringify(steps));
    ok((await text(p, '.lab-meta')).includes('Cost:') && (await text(p, '.lab-meta')).includes('Lesson 9'), 'cost or lessons missing');
    await p.click('.lab-meta [data-act=goLesson][data-id=l12]');
    ok(await text(p, '.lesson-t') === 'Networking and content delivery', 'lesson link did not open the lesson');
  });
  await check('look up: word starts, highlighted, opens the place, keeps focus (U6)', async () => {
    await seed(p);
    await p.evaluate(() => { document.querySelector('#nextUpBtn').dataset.probe = 'same'; });
    await p.click('#lookup');
    await p.keyboard.type('nat');
    ok(await p.evaluate(() => document.activeElement.id === 'lookup'), 'typing lost focus');
    ok(await p.evaluate(() => document.querySelector('#nextUpBtn').dataset.probe === 'same'), 'typing redrew the page');
    const hits = await p.$$eval('.hits li', ls => ls.map(l => l.innerText));
    ok(hits.length >= 1 && hits[0].includes('Networking and content delivery') && hits.every(h => !/designated|Terminate/.test(h)), 'hits: ' + hits);
    ok(await text(p, '.hits mark') === 'NAT', 'match not highlighted');
    await p.click('.hits [data-act=goLesson]');
    ok(await text(p, '.lesson-t') === 'Networking and content delivery' && await p.getAttribute('[aria-current=step]', 'data-i') === '0', 'did not open the lesson at Read');
    await p.click('#nav [data-tab=today]'); await p.fill('#lookup', 'xyzzy');
    ok((await text(p, '#lookupResults')).startsWith('Nothing found'), 'no empty message');
    await p.fill('#lookup', 'cross-site');
    await p.click('.hits [data-act=goQuestion]');
    ok(await p.getAttribute('#nav [data-tab=practice]', 'aria-selected') === 'true' && (await text(p, '.qt')).includes('SQL injection'), 'question not opened');
  });
  await check('16 px text, sticky tab bar with icon and word, reduced motion (U7.1, U7.2, U7.4)', async () => {
    await seed(p, {v:2, tab:'learn'});
    const f = await p.evaluate(() => { const c = getComputedStyle(document.body); return [c.fontSize, parseFloat(c.lineHeight) / parseFloat(c.fontSize)]; });
    ok(f[0] === '16px' && f[1] >= 1.55, 'font ' + f);
    await p.evaluate(() => scrollTo(0, 2000));
    ok(await p.evaluate(() => { const t = document.querySelector('#nav').getBoundingClientRect().top; return t >= 0 && t < 40; }), 'tab bar scrolled away');
    ok(await p.$$eval('#nav button', bs => bs.every(b => b.querySelector('svg') && b.innerText.trim().length > 2)), 'tab without icon or word');
    const r = await fresh({reducedMotion:'reduce'});
    await r.evaluate(() => { S.tab = 'learn'; S.openLesson = 'l1'; S.stage.l1 = 4; S.done.l1 = true; render(); });
    ok(await r.evaluate(() => getComputedStyle(document.querySelector('.big-check')).animationName) === 'none', 'animation runs with reduced motion');
    await r.context().close();
  });

  await check('no script errors anywhere above', async () => { ok(!errors.length, errors.join(' | ')); });

  await browser.close();
  finish();
})().catch(e => { console.error(e); process.exit(1); });
