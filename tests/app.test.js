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
  // Saves `data` as this version's progress (adds `days`, which only this version writes), then reloads.
  // {legacy:true} saves it as it is, the way an older version left it.
  async function seed(p, data, {legacy = false} = {}){
    if (data && typeof data === 'object' && !legacy && !('days' in data)) data = {...data, days:{}};
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
    await seed(p, old, {legacy:true});
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
    // Done pauses on the tick with a choice; it does not jump on by itself.
    ok((await saved(p)).done.l1 === true && await text(p, '.lesson-t') === 'Why companies use the cloud', 'did not stay on the finished lesson');
    ok((await text(p, '.finish')).includes('Lesson done') && await p.$('.big-check.on'), 'no tick');
    ok(await p.evaluate(() => document.activeElement.textContent === 'Next lesson'), 'focus not on Next lesson');
    await p.click('text=Next lesson');
    const s2 = await saved(p);
    ok(s2.openLesson === 'l2' && await text(p, '.lesson-t') === 'Service and deployment models', 'next lesson not shown');
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
  await check('timer: 15 min default, runs, survives reload and tab switches, 5 min option (U8.3)', async () => {
    await seed(p, {v:2, tab:'timer'});   // a Timer tab saved by an older version
    ok(await p.getAttribute('#nav [data-tab=today]', 'aria-selected') === 'true' && !(await p.$('#nav [data-tab=timer]')), 'old Timer tab not mapped to Today');
    ok(await text(p, '#timerLabel') === '15:00', 'idle button does not show 15:00');
    await p.click('#timerBtn');
    ok(await text(p, '#clock') === '15:00', 'default not 15:00');
    await p.click('[data-act=tGo]');
    await p.waitForTimeout(1300);
    ok((await text(p, '#clock')) < '15:00' && (await text(p, '#timerLabel')) < '15:00', 'not counting');
    await p.click('#nav [data-tab=labs]'); await p.waitForTimeout(1100);
    ok((await text(p, '#timerLabel')) < '14:59', 'stopped after a tab switch');
    await p.reload();
    ok((await text(p, '#timerLabel')) < '15:00' && await p.evaluate(() => document.querySelector('#timerBtn').classList.contains('running')), 'lost on reload');
    await p.click('#timerBtn'); await p.click('[data-act=tGo]');   // pause
    ok((await text(p, '#timerLabel')).startsWith('❚❚'), 'paused state not shown');
    await p.click('[data-act=tLen][data-v="5"]');
    ok(await text(p, '#clock') === '05:00' && await text(p, '#timerLabel') === '05:00', '5 min not set');
  });
  await check('timer: finishing resets and says time is up', async () => {
    await p.evaluate(() => { S.timer.end = Date.now() + 300; save(); render(); });
    await p.waitForTimeout(900);
    ok(await text(p, '#timerLabel') === '05:00', 'did not reset after finishing');
    ok(await p.$('.toast'), 'no message');
  });
  await check('timer panel: opens from the top bar, closes by Close, Escape, a tap outside or Back; focus returns (U8.1, U8.2)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l1'});
    const isOpen = () => p.isVisible('#focusPanel');
    const onBtn = () => p.evaluate(() => document.activeElement.id === 'timerBtn');
    await p.focus('#timerBtn'); await p.keyboard.press('Enter');
    ok(await isOpen() && await p.evaluate(() => document.activeElement.dataset.act === 'tGo'), 'panel not open with focus on Start');
    ok(await p.getAttribute('#timerBtn', 'aria-expanded') === 'true', 'aria-expanded not set');
    await p.click('[data-act=focusClose]'); ok(!(await isOpen()) && await onBtn(), 'Close');
    await p.click('#timerBtn'); await p.keyboard.press('Escape'); ok(!(await isOpen()) && await onBtn(), 'Escape');
    await p.click('#timerBtn'); await p.click('#top h1'); ok(!(await isOpen()), 'tap outside');
    ok(await text(p, '.lesson-t') === 'Why companies use the cloud', 'the lesson behind changed');
    await p.click('#timerBtn'); await p.goBack().catch(() => {}); await p.waitForTimeout(150);
    ok(!(await isOpen()) && await p.evaluate(() => S.openLesson === 'l1'), 'Back did not close only the panel');
    await p.click('#timerBtn'); await p.fill('#task', 'Draw the IaaS table');
    ok(await p.evaluate(() => S.timer.task === 'Draw the IaaS table' && document.activeElement.id === 'task'), 'typing in Working on lost');
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
      for (const tab of ['today', 'learn', 'practice', 'labs']) {
        await q.click(`#nav [data-tab=${tab}]`);
        const w = await q.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(w <= 0, `${tab} overflows by ${w}px`);
      }
      await q.click('#timerBtn');   // the open timer panel fits too (U8.4)
      const fit = await q.evaluate(() => { const r = document.querySelector('#focusPanel').getBoundingClientRect(), n = document.querySelector('#nav').getBoundingClientRect();
        return [r.left >= 0 && r.right <= innerWidth, r.top >= n.bottom, document.documentElement.scrollWidth - innerWidth]; });
      ok(fit[0] && fit[1] && fit[2] <= 0, 'timer panel does not fit: ' + fit);
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
    await seed(p, fx.saved, {legacy:true});
    ok((await text(p, '.stats')).startsWith(fx.shown.stats), 'header differs: ' + await text(p, '.stats'));
    // First load after updating opens Today once (U1.1); everything else is kept as it was.
    ok(await p.getAttribute('#nav [data-tab=today]', 'aria-selected') === 'true', 'update did not open on Today');
    ok((await text(p, '.nextup')).includes('Lesson 2: ' + fx.shown.open), 'next up is not the lesson that was open: ' + await text(p, '.nextup'));
    const now = await p.evaluate(() => S);
    for (const k of Object.keys(fx.saved)) if (k !== 'tab') ok(JSON.stringify(now[k]) === JSON.stringify(fx.saved[k]), 'field changed on load: ' + k);
    // the streak starts from the days already studied
    const studiedOn = [...new Set(Object.values(fx.saved.ans).map(a => new Date(a.at)).map(d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')))];
    ok(studiedOn.every(d => now.days[d] === true), 'old study days not in the streak: ' + JSON.stringify(now.days));
    await p.click('#nextUpBtn');
    ok(await text(p, '.lesson-t') === fx.shown.open, 'different lesson open');
    await p.reload();
    ok(await text(p, '.lesson-t') === fx.shown.open, 'Today was forced again on the second load');
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
      `S.tab = 'today'; S.srs.q1 = {box:0, due:'2020-01-01'}; S.days[todayISO()] = true; S.timer.left = 60000; LESSONS[1].due = '2020-01-02';`,
      `S.tab = 'today'; lookupQ = 'nat';`,
      `S.tab = 'learn'; S.openLesson = null; S.stage.l1 = 2;`,
      `S.tab = 'learn'; S.openLesson = 'l1'; S.stage.l1 = 3; S.ans.q1 = {n:1, wrong:1, pick:1, ok:false, at:Date.now()}; lqi.l1 = 0;`,
      `S.tab = 'learn'; S.openLesson = 'l1'; S.stage.l1 = 2; revealed['l1:0'] = true;`,
      `S.tab = 'learn'; S.openLesson = 'l2'; S.stage.l2 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l4'; S.stage.l4 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l5'; S.stage.l5 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l10'; S.stage.l10 = 1;`,
      `S.tab = 'learn'; S.openLesson = 'l12'; S.stage.l12 = 1;`,
      `S.tab = 'labs'; S.openLab = 'lab3'; S.labs.lab3 = [true];`,
      `S.tab = 'learn'; S.openLesson = 'l10'; S.stage.l10 = 0; ui.mode['l10:0'] = 'points';`,
      `S.tab = 'learn'; S.openLesson = 'l7'; S.stage.l7 = 0; ui.mode['l7:0'] = 'cards'; ui.cards.l7 = {order:[0,1,2], pos:0, flipped:true, got:0, again:[]};`,
      `S.tab = 'learn'; S.openLesson = 'l9'; S.stage.l9 = 0; ui.mode['l9:0'] = 'cards'; ui.cards.l9 = {order:[flashCards(LESSONS[8]).findIndex(c => c.kind === 'gap')], pos:0, flipped:true, got:0, again:[]};`,
      `S.tab = 'learn'; S.openLesson = 'l9'; S.stage.l9 = 0; ui.mode['l9:0'] = 'cards'; ui.cards.l9 = {order:[0], pos:1, flipped:false, got:0, again:[0]};`,
      `S.tab = 'learn'; S.openLesson = 'l14'; S.stage.l14 = 1; ui.mode['l14:1'] = 'test'; ui.game.l14 = {picks:{}, cur:0, seq:[3,2,1,0], cols:{}, run:1};`,
      `S.tab = 'learn'; S.openLesson = 'l7'; S.stage.l7 = 1; ui.mode['l7:1'] = 'test'; ui.game.l7 = {picks:{0:(gameQuestions(LESSONS[6]).qs[0].answer + 1) % 3}, cur:0, seq:[], cols:{}, run:1};`,
      `S.tab = 'learn'; S.openLesson = 'l2'; S.stage.l2 = 1; ui.mode['l2:1'] = 'test'; ui.game.l2 = {picks:{}, cur:0, seq:[], cols:{0:7, 1:2}, run:1};`,
      `S.tab = 'practice'; pCur = 'q19';`,
      `S.tab = 'learn'; S.openLesson = null;`
    ];
    const sels = ['body', '#top .sub', '.stat', '.stat.timer', '.theme', '.chip.d-cc', '.chip.d-sec', '.chip.d-tech', '.chip.d-bill', '.foot', '.foot .link', 'h3',
      '.hello', '.streak', '.task-tag', '.nextup small', '.week li.behind small', '.week small', '.row-link small', 'mark', '.group-h small', '.row .t small', '.pill-going',
      '.stage.cur', '.stage', '.opt.wrong .why', '.fb', '.check em', '.answer', '.scenario p', '.who-c.mine', '.who-c.theirs', '.who-h small', '.vis figcaption',
      '.tile small', '.tile span', '.vis-col.tone-you b', '.vis-col.tone-aws li', '.nbox > small', '.nside small', '.scale-ends', '.scale li small', '.see', '.lab-steps li.now .task-tag',
      '.num', '.band-meta', '.lesson .pts b', '.colour-key b', '.stage.cur', '.flipcard small', '.flipcard span', '.chipbtn.right', '.chipbtn.wrong', '.game-fb',
      '.who-c.blank', '.btn.good', '.who-c.no', '.who-fb li.ok', '.who-fb li.no', '.answer-order', '.answer-order small', '.game-fb .muted', '.deck-done p',
      '.flipcard.gap span', '.qhead span', '.row .n.d-cc', '.row .n.d-sec', '.row .n.d-tech', '.row .n.d-bill'];
    for (const theme of ['light', 'dark']) {
      const q = await fresh();
      for (const setup of screens) {
        await q.evaluate(([t, js]) => { S.theme = t; (0, eval)(js); render(); }, [theme, setup]);
        const r = await q.evaluate(sels => {
          const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
          const bgOf = e => { let c; while (e && ((c = getComputedStyle(e).backgroundColor) === 'rgba(0, 0, 0, 0)')) e = e.parentElement; return c || getComputedStyle(document.body).backgroundColor; };
          // The lowest ratio among all elements matching each selector, not only the first one.
          return sels.map(s => { const es = [...document.querySelectorAll(s)]; if (!es.length) return [s, null];
            return [s, Math.min(...es.map(e => { const [a, b] = [lum(getComputedStyle(e).color), lum(bgOf(e))].sort((x, y) => y - x); return (a + .05) / (b + .05); }))]; });
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
    await seed(p, {v:2, stage:{l7:1}});   // only looked at lesson 7: Next up stays on lesson 1
    ok(await text(p, '#nextUpBtn') === 'Start lesson' && (await text(p, '.nextup')).includes('Lesson 1:'), 'a lesson only looked at took over: ' + await text(p, '.nextup'));
    await seed(p, {v:2, stage:{l3:2}, current:'l3'});
    ok(await text(p, '#nextUpBtn') === 'Continue' && (await text(p, '.nextup')).includes('Lesson 3:') && (await text(p, '.nextup')).includes('you are on Try')
      && (await text(p, '.nextup')).includes('8 min left'), 'lesson in progress not next: ' + await text(p, '.nextup'));
    await p.click('#nextUpBtn');
    ok(await text(p, '.lesson-t') === 'Global infrastructure' && await p.getAttribute('[data-act=stage][aria-current=step]', 'data-i') === '2', 'did not continue at Try');
  });
  await check('This week lists lessons due in 7 days, done ticked, late marked (U1.3)', async () => {
    const q = await at('2026-11-02');
    await q.evaluate(() => { localStorage.setItem('awsCourse1', JSON.stringify({v:2, done:{l1:true, l3:true}})); });
    await q.reload();
    const rows = await q.$$eval('.week li', ls => ls.map(l => l.className + ':' + l.querySelector('b').textContent));
    ok(JSON.stringify(rows) === JSON.stringify(['behind:1 lesson behind', 'done:Global infrastructure', ':Well-Architected, CAF and migration', ':The shared responsibility model', ':IAM: who can do what']), 'week: ' + JSON.stringify(rows));
    ok((await text(q, '.week li.behind')).includes('Catch up: start with Service and deployment models'), 'late line does not say where to start');
    await q.click('.week li.behind button');
    ok(await text(q, '.lesson-t') === 'Service and deployment models', 'catch up did not open the late lesson');
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
    ok(await p.evaluate(() => S.timer.len === 5 && S.timer.end > Date.now()) && await p.evaluate(() => document.querySelector('#timerBtn').classList.contains('running')), 'break timer not running');
    await p.click('[data-act=goLab]');
    ok(await p.getAttribute('#nav [data-tab=labs]', 'aria-selected') === 'true' && (await text(p, '.card.open')).includes('S3: bucket'), 'lab not opened');
  });
  await check('no stage of any lesson is taller than 1.4 screens on a phone, in every mode (U2.5, U10.5)', async () => {
    // Its own page: timer idle, at 390 x 844. Cards are measured flipped on their longest back, games after an answer.
    const q = await at('2026-11-02');
    const tall = await q.evaluate(() => {
      const out = [];
      for (const l of LESSONS) for (let k = 0; k < STAGES.length; k++) {
        for (const mode of k === 0 ? ['points', 'cards'] : k === 1 ? ['look', 'test'] : ['-']) {
          S.tab = 'learn'; S.openLesson = l.id; S.stage[l.id] = k; ui.mode[l.id + ':' + k] = mode; (SCENARIOS[l.id] || []).forEach((x, i) => revealed[l.id + ':' + i] = true);
          if (mode === 'cards') { const cs = flashCards(l), i = cs.reduce((b, c, j) => c.back.length > cs[b].back.length ? j : b, 0); ui.cards[l.id] = {order:[i], pos:0, flipped:true, got:0, again:[]}; }
          if (mode === 'test') {
            const g = gameQuestions(l); delete ui.game[l.id]; const st = gameState(l);
            if (g.kind === 'pick') { const i = g.qs.reduce((b, x, j) => (x.text + (x.sub || '')).length > (g.qs[b].text + (g.qs[b].sub || '')).length ? j : b, 0); st.cur = i; st.picks[i] = (g.qs[i].answer + 1) % (g.qs[i].opts || g.options).length; }
            else if (g.kind === 'order') st.seq = g.items.map((x, j) => j);
            else VISUALS[l.id].cols.forEach((c, ci) => st.cols[ci] = 1);
          }
          render();
          const h = document.querySelector('#lessonTop').getBoundingClientRect().height;
          if (h > 844 * 1.4) out.push(`${l.id} ${STAGES[k]} ${mode} ${Math.round(h)}px`);
        }
      }
      return out;
    });
    ok(await q.evaluate(() => !S.timer.end && !S.timer.left), 'timer not idle');
    await q.context().close();
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
    await p.evaluate(() => { S.stage.l12 = 2; save(); });
    await p.click('.lab-meta [data-act=openLesson][data-id=l12]');
    ok(await text(p, '.lesson-t') === 'Networking and content delivery', 'lesson link did not open the lesson');
    ok(await p.getAttribute('[aria-current=step]', 'data-i') === '2', 'a lab link sent the lesson back to Read');
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

  await check('a done lesson still offers the next lesson; Mark not done is a small link and resets it (U2.4)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l3', stage:{l3:4}, done:{l1:true, l3:true}});
    ok(await text(p, '.finish ~ .btns .btn') === 'Next lesson' && !(await p.$('.btns [data-act=undone]')) && await p.$('.link[data-act=undone]'), 'done lesson actions');
    await p.click('text=Next lesson');
    ok(await text(p, '.lesson-t') === 'Service and deployment models', 'Next lesson went to ' + await text(p, '.lesson-t'));
    await p.evaluate(() => { S.openLesson = 'l3'; render(); });
    await p.click('[data-act=undone]');
    ok(await p.evaluate(() => !S.done.l3 && S.stage.l3 === 0 && S.current === 'l3'), 'not reset after Mark not done');
    await p.click('#nav [data-tab=today]');
    ok(!(await text(p, '.nextup')).includes('Done'), 'Next up still says Done: ' + await text(p, '.nextup'));
  });
  await check('Done says when the quiz has not been answered, with a way back to it', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l2', stage:{l2:4}});
    ok((await text(p, '.finish')).includes("You haven't answered the quiz yet"), 'blames the learner: ' + await text(p, '.finish'));
    await p.click('text=Go to the quiz');
    ok(await p.$('.opt') && await p.getAttribute('[aria-current=step]', 'data-i') === '3', 'did not go to Check');
  });
  await check('a reload during a review does not count an answer twice', async () => {
    await seed(p, {v:2, ans:{q1:{n:1, wrong:1, pick:0, ok:false, at:Date.now()}}});
    await p.click('#nextUpBtn');
    await p.click(`.card.review [data-act=pick][data-i="${await answerOf(p, 'q1')}"]`);
    await p.reload();
    ok(await p.$('.card.review .fb') && !(await p.$('.card.review [data-act=pick]:not([disabled])')), 'answered question shows as new after reload');
    await p.click('[data-act=rvNext]');
    ok((await text(p, '.card.review')).includes('1 of 1 right') && await p.evaluate(() => S.ans.q1.n === 2), 'counted twice: ' + await text(p, '.card.review'));
  });
  // Back: each case opens the app after a blank page, so leaving the app shows up as about:blank.
  async function backPage(data){
    const ctx = await browser.newContext({viewport:{width:390, height:844}});
    const q = await ctx.newPage();
    q.setDefaultTimeout(8000);
    q.on('pageerror', e => errors.push(e.message));
    await q.goto('about:blank');
    await q.goto(URL);
    if (data) { await q.evaluate(d => localStorage.setItem('awsCourse1', JSON.stringify(d)), {days:{}, ...data}); await q.reload(); }
    return q;
  }
  const back = async q => { await q.goBack().catch(() => {}); await q.waitForTimeout(150); };
  const left = q => q.url() === 'about:blank';
  await check("Back closes what is on screen, returns to Today, and only then leaves the app", async () => {
    const q = await backPage({v:2});
    await q.click('#nextUpBtn');                                   // lesson 1, opened from Today
    await back(q);
    ok(!left(q) && await q.evaluate(() => S.tab === 'today' && !S.openLesson), 'Back from a lesson opened on Today did not return to Today');
    await q.click('#nav [data-tab=learn]'); await q.click('[data-act=openLesson][data-id=l2]');
    await back(q);
    ok(!left(q) && await q.evaluate(() => S.tab === 'learn' && !S.openLesson), 'Back from a lesson did not return to the list');
    await back(q);
    ok(!left(q) && await q.evaluate(() => S.tab === 'today'), 'Back from Learn did not go to Today');
    await q.click('[data-act=toggleFacts]');
    await back(q);
    ok(!left(q) && await q.evaluate(() => !S.open), 'Back did not fold the exam facts card first');
    await back(q);
    ok(left(q), 'Back on Today with nothing open did not leave the app');
    await q.context().close();
  });
  await check('Back: a double tap on All lessons stays in the app; a hidden review and a lesson stay separate', async () => {
    const q = await backPage({v:2, ans:{q1:{n:1, wrong:1, pick:0, ok:false, at:Date.now()}}});
    await q.click('#nextUpBtn');                                   // review starts
    await q.click('#nav [data-tab=learn]'); await q.click('[data-act=openLesson][data-id=l1]');
    await q.dblclick('[data-act=closeLesson]');
    ok(!left(q) && await q.evaluate(() => !S.openLesson && !!S.review), 'double tap left the app, or closed the review');
    await back(q);                                                 // Learn -> Today, review on screen
    ok(await q.$('.card.review'), 'review not shown on Today');
    await back(q);
    ok(!left(q) && await q.evaluate(() => !S.review), 'Back did not close the review');
    await q.context().close();
  });
  await check('Back from a lab opened in a lesson returns to the lesson; after a relaunch Back still closes the lesson', async () => {
    let q = await backPage({v:2, tab:'learn', openLesson:'l10', stage:{l10:2}});
    await q.click('.handson [data-act=goLab]');
    await back(q);
    ok(!left(q) && await q.evaluate(() => S.tab === 'learn' && S.openLesson === 'l10'), 'Back from the lab did not return to the lesson');
    await q.context().close();
    q = await backPage({v:2, tab:'learn', openLesson:'l2'});       // relaunch with a lesson open
    await q.click('[data-act=stage][data-i="1"]');                 // any first tap
    await back(q);
    ok(!left(q) && await q.evaluate(() => !S.openLesson), 'Back after a relaunch left the app');
    await q.context().close();
  });
  await check('a review saved by release 1.0.0 can still be answered', async () => {
    const q = await backPage({v:2, review:{ids:['q1', 'q2'], i:0, right:0}, srs:{q1:{box:0, due:'2020-01-01'}, q2:{box:0, due:'2020-01-01'}},
      ans:{q1:{n:1, wrong:1, pick:0, ok:false, at:Date.now() - 864e5}, q2:{n:1, wrong:1, pick:0, ok:false, at:Date.now() - 864e5}}});
    ok(await q.$('.card.review [data-act=pick]:not([disabled])'), 'old review shows the old answer, cannot answer');
    await q.context().close();
  });

  // ---------- colour coding and hands-on practice (docs/UX.md U9, U10) ----------
  await check('one colour per exam domain: list, lesson band, key terms, Today bars, Practice card (U9.1)', async () => {
    await seed(p, {v:2, tab:'learn'});
    const col = await p.evaluate(() => { const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return {sec:v('--sec'), secbg:v('--sec-bg'), bill:v('--bill')}; });
    const rgb = hex => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-id=l5] .n')).color) === rgb(col.sec), 'list number not in its domain colour');
    await p.click('[data-act=openLesson][data-id=l5]');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.lesson-band')).backgroundColor) === rgb(col.secbg), 'lesson band not in its domain colour');
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.lesson .pts b')).color) === rgb(col.sec), 'key terms not in the domain colour');
    await p.click('#nav [data-tab=today]');
    ok(await p.evaluate(() => getComputedStyle(document.querySelectorAll('.dom .bar i')[3]).backgroundColor) === rgb(col.bill), 'Today bar not in its domain colour');
    await p.evaluate(() => { S.tab = 'practice'; pCur = 'q44'; render(); });
    ok(await p.evaluate(() => getComputedStyle(document.querySelector('.coloured-top')).borderTopColor) === rgb(col.bill), 'practice card not in its domain colour');
  });
  await check('each lesson stage has its own icon, the current one stands out (U9.2)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l1', stage:{l1:2}});
    const icons = await p.$$eval('[data-act=stage]', bs => bs.map(b => b.querySelector('svg') && b.querySelector('svg').innerHTML));
    ok(icons.length === 5 && icons.every(Boolean) && new Set(icons).size === 5, 'stage without its own icon');
    const c = await p.$$eval('[data-act=stage] i', is => is.map(i => getComputedStyle(i).backgroundColor));
    ok(c[2] !== c[1] && c[2] !== c[3] && c[1] !== c[3], 'current, done and later stages look the same: ' + c);
  });
  await check('domain colours cannot be mistaken for right, wrong or the brand, in both themes (U9.5)', async () => {
    // By hue: each domain colour is at least 28 degrees round the colour wheel from green, red and the brand purple,
    // and no domain background is one of the right, wrong or brand backgrounds.
    for (const theme of ['light', 'dark']) {
      const near = await p.evaluate(t => {
        S.theme = t; render();
        const css = getComputedStyle(document.documentElement), hex = n => css.getPropertyValue(n).trim().toUpperCase();
        const hue = n => { const v = parseInt(hex(n).slice(1), 16), [r, g, b] = [v >> 16, (v >> 8) & 255, v & 255].map(x => x / 255);
          const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b); if (!d) return 0;
          const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
        const gap = (a, b) => { const d = Math.abs(hue(a) - hue(b)) % 360; return Math.min(d, 360 - d); };
        const out = [];
        for (const d of ['cc', 'sec', 'tech', 'bill']) {
          for (const o of ['--ok', '--bad', '--bad-text', '--brand', '--brand-text']) if (gap('--' + d, o) < 28) out.push(`--${d} near ${o} (${Math.round(gap('--' + d, o))})`);
          for (const o of ['--ok-soft', '--bad-soft', '--brand-soft']) if (hex('--' + d + '-bg') === hex(o)) out.push(`--${d}-bg equals ${o}`);
        }
        return out;
      }, theme);
      ok(!near.length, theme + ': ' + near.join(', '));
    }
  });
  await check('numbers in key points are highlighted, names with digits are not, with a colour key (U9.3)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l10'});
    const nums = await p.$$eval('.pts .num', ns => ns.map(n => n.textContent));
    ok(['99.999999999 %', '11 nines', '12 hours'].every(x => nums.includes(x)), 'numbers: ' + nums);
    ok(!nums.some(x => /^3$/.test(x)), 'the 3 in S3 was highlighted');
    ok(await p.$('.colour-key'), 'no colour key');
    await p.evaluate(() => { S.openLesson = 'l3'; render(); });
    const n3 = await p.$$eval('.pts .num', ns => ns.map(n => n.textContent));
    ok(!n3.includes('1') && n3.includes('3'), 'eu-central-1 marked, or "at least 3" not: ' + n3);
    const odd = await p.evaluate(() => [...new DOMParser().parseFromString(markNumbers('a 2-minute warning, 24/7 phone, until 1 January 2027, since December 2025, 5G'), 'text/html').querySelectorAll('.num')].map(n => n.textContent));
    ok(JSON.stringify(odd) === JSON.stringify(['2-minute', '24/7', '1 January 2027', 'December 2025']), 'hyphen, 24/7 or dates: ' + odd);
    await p.evaluate(() => { S.openLesson = 'l15'; S.stage.l15 = 1; render(); });
    ok((await p.$$eval('figure.vis .num', ns => ns.map(n => n.textContent))).includes('24/7'), 'diagram numbers not highlighted');
    ok(await p.evaluate(() => { const h = markNumbers('<code>port 22</code> and <a href="x1">5 min</a> &#39;'); return h.includes('<code>port 22</code>') && h.includes('href="x1"') && h.includes('&#39;') && h.includes('<span class="num">5 min</span>'); }), 'markNumbers touched code, an attribute or an entity');
  });
  await check('flip cards: from the lesson terms, flip with keys, Got it and Again (U10.1)', async () => {
    ok(await p.evaluate(() => LESSONS.every(l => flashCards(l).length >= 2)), 'a lesson has under 2 cards');
    await seed(p, {v:2, tab:'learn', openLesson:'l9'});
    await p.click('[data-act=mode][data-v=cards]');
    const n = await p.evaluate(() => flashCards(LESSONS[8]).length);
    ok((await text(p, '.deck-count')).startsWith(`Card 1 of ${n}`), 'deck count');
    const front = await text(p, '.flipcard span');
    await p.focus('.flipcard'); await p.keyboard.press('Enter');
    ok((await text(p, '.flipcard small')).startsWith(front) && await p.getAttribute('.flipcard', 'aria-pressed') === 'true', 'Enter did not flip');
    await p.click('[data-act=cardAgain]');
    ok((await text(p, '.deck-count')).startsWith(`Card 2 of ${n + 1}`), 'Again did not put the card back');
    await p.focus('.flipcard'); await p.keyboard.press('Space'); await p.click('[data-act=cardGot]');
    ok((await text(p, '.deck-count')).includes('1 right first time'), 'Got it not counted');
    for (let i = 2; i < n + 1; i++) { await p.click('.flipcard'); await p.click('[data-act=cardGot]'); }
    ok((await text(p, '.deck-done')).includes(`${n - 1} right first time, 1 needed a second go`), 'deck end: ' + await text(p, '.deck-done'));
  });
  await check('flip cards keep whole definitions and every defined term, once (U10.1)', async () => {
    const r = await p.evaluate(() => {
      const card = (id, t) => flashCards(LESSONS.find(l => l.id === id)).find(c => c.kind === 'term' && c.front === t);
      const back = (id, t) => (card(id, t) || {back:''}).back;
      const out = [];
      if (!back('l12', 'Security group').includes('stateful') || !back('l12', 'Network ACL').includes('stateless')) out.push('stateful/stateless lost');
      if (!back('l8', 'Organizations').includes('SCPs')) out.push('SCPs lost');
      if (!back('l12', 'VPC').includes('internet gateway')) out.push('VPC cut');
      if (!back('l9', 'Fargate').includes('containers') || !back('l10', 'One Zone-IA').includes('one AZ')) out.push('Fargate or One Zone-IA lost its fact');
      if (!back('l15', 'Cost and Usage Report').includes('Data Exports') || !back('l15', 'Consolidated billing').includes('Organizations')) out.push('a (note) before the colon was dropped');
      for (const t of ['Enterprise On-Ramp', 'Enterprise', 'TAM']) if (!card('l15', t)) out.push('l15 no ' + t);
      for (const t of ['User', 'Group', 'Role', 'Policy']) if (!card('l6', t)) out.push('l6 no ' + t);
      for (const t of ['Glacier Deep Archive', 'Standard-IA', 'Lex', 'Amazon Q']) if (!card(t === 'Lex' || t === 'Amazon Q' ? 'l13' : 'l10', t)) out.push('no ' + t);
      if (back('l13', 'Transcribe') !== 'speech to text') out.push('Transcribe: ' + back('l13', 'Transcribe'));
      if (!flashCards(LESSONS[8]).some(c => c.kind === 'gap' && c.front.includes('up to ____ per run') && c.back === '15 minutes')) out.push('no gap card for 15 minutes');
      for (const l of LESSONS) {
        const fronts = flashCards(l).filter(c => c.kind === 'term').map(c => c.front.toLowerCase());
        if (new Set(fronts).size !== fronts.length) out.push(l.id + ' repeats a term');
        for (const [a, b] of [['artifact', 'aws artifact'], ['spot', 'spot instances'], ['rds or aurora', 'rds'], ['organizations scps', 'organizations']])
          if (fronts.includes(a) && fronts.includes(b)) out.push(l.id + ' has ' + a + ' and ' + b);
        // Every "<b>Term</b>:" or "<b>Term</b> =" in the key points has a card.
        for (const p of l.pts) for (const m of p.matchAll(/<b>([^<]+)<\/b>\s*(?:\([^)]*\))?\s*[:=]/g)) if (!fronts.includes(m[1].trim().toLowerCase())) out.push(l.id + ' no card for ' + m[1]);
      }
      return out;
    });
    ok(!r.length, r.join(', '));
  });
  await check('every lesson has a diagram game, and a perfect game scores full marks (U10.2)', async () => {
    const res = await p.evaluate(() => LESSONS.map(l => {
      const g = gameQuestions(l); delete ui.game[l.id]; const st = gameState(l);
      if (g.kind === 'pick') { g.qs.forEach((q, i) => st.picks[i] = q.answer); st.cur = g.qs.length; }
      else if (g.kind === 'order') { st.seq = g.items.map((it, i) => i).sort((a, b) => g.items[a].rank - g.items[b].rank); }
      else VISUALS[l.id].cols.forEach((c, ci) => st.cols[ci] = c.you);
      const div = document.createElement('div'); div.innerHTML = gameHTML(l);
      const score = div.querySelector('.game-score b'); delete ui.game[l.id];
      return l.id + ' ' + g.kind + ' ' + (score ? score.textContent : 'no score');
    }));
    const bad = res.filter(r => { const m = r.match(/(\d+) of (\d+) right/); return !m || m[1] !== m[2] || +m[2] < 2; });
    ok(!bad.length, bad.join(', '));
    // Tied steps (Savings Plans and Reserved Instances) score in either order.
    const tie = await p.evaluate(() => {
      const l = LESSONS.find(x => x.id === 'l14'), g = gameQuestions(l), name = t => g.items.findIndex(i => i.text === t);
      return [['On-Demand', 'Reserved Instances', 'Savings Plans', 'Spot'], ['On-Demand', 'Savings Plans', 'Reserved Instances', 'Spot']].map(order => {
        delete ui.game.l14; gameState(l).seq = order.map(name);
        const div = document.createElement('div'); div.innerHTML = gameHTML(l); delete ui.game.l14;
        return div.querySelector('.game-score b').textContent;
      });
    });
    ok(tie.every(t => t === '4 of 4 right.'), 'tied steps: ' + tie);
    // A wrong tap on a tied step points to the free place, numbered like the answer list.
    const goes = await p.evaluate(() => {
      const l = LESSONS.find(x => x.id === 'l14'), g = gameQuestions(l), name = t => g.items.findIndex(i => i.text === t);
      delete ui.game.l14; gameState(l).seq = ['On-Demand', 'Savings Plans', 'Spot', 'Reserved Instances'].map(name);
      const div = document.createElement('div'); div.innerHTML = gameHTML(l); delete ui.game.l14;
      return [...div.querySelectorAll('.game.order li.no')].map(li => li.textContent.replace(/\s+/g, ' ').trim()).join(' | ') + ' || ' + div.querySelector('.answer-order').textContent.replace(/\s+/g, ' ');
    });
    ok(goes.includes('Spot ✗ goes at 4') && goes.includes('Reserved Instances ✗ goes at 3') && goes.includes('2-3. Savings Plans or Reserved Instances') && goes.includes('4. Spot'), 'tied places: ' + goes);
  });
  await check('every game answer agrees with the diagram it comes from (U10.2)', async () => {
    // Checked against VISUALS directly, not against the game's own answer key.
    const wrong = await p.evaluate(() => {
      const out = [];
      for (const l of LESSONS) {
        const v = VISUALS[l.id], g = gameQuestions(l);
        if (g.kind === 'order') {
          // Steps keep the diagram's order; only steps marked with the same rank may swap.
          const steps = v.steps.filter(s => !s.unranked);
          g.items.forEach(it => { const i = steps.findIndex(s => s.name === it.text); if (i < 0) out.push(l.id + ' order ' + it.text);
            steps.forEach((s, j) => { const r = s.rank != null ? s.rank : v.steps.indexOf(s); if (j < i && r > it.rank) out.push(l.id + ' order ' + it.text); }); });
        }
        if (g.kind !== 'pick') continue;
        if (g.qs.length < 3) out.push(l.id + ' only ' + g.qs.length + ' questions');
        const texts = g.qs.map(q => q.text);
        if (new Set(texts).size !== texts.length) out.push(l.id + ' the same clue twice');
        g.qs.forEach(q => {
          const opts = q.opts || g.options, chosen = opts[q.answer];
          if (opts.length < 2 || new Set(opts).size !== opts.length) out.push(l.id + ' bad options');
          if (v.kind === 'compare' && !v.cols.find(c => c.title === chosen).items.includes(q.text)) out.push(l.id + ' ' + q.text);
          if (v.kind === 'tiles' && !v.tiles.some(t => t.title === chosen && (t.tag === q.text && t.text === q.sub || t.text === q.text))) out.push(l.id + ' ' + q.text);
          if (v.kind === 'nested') {
            const name = b => b.label || b.title, kids = v.box.children || [];
            const item = (q.text.match(/^Where does "(.*)" sit\?$/) || [])[1];
            const ok = item ? kids.some(k => name(k) === chosen && (k.items || []).includes(item))
              : (v.side || []).some(sd => sd.note === q.text && sd.title === chosen) || kids.some(k => k.note === q.text && name(k) === chosen) || (v.box.note === q.text && name(v.box) === chosen);
            if (!ok) out.push(l.id + ' ' + q.text);
          }
        });
      }
      return out;
    });
    ok(!wrong.length, wrong.join(', '));
  });
  await check('game feedback is instant, with a symbol and words, and read out (U10.3)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l1', stage:{l1:1}});
    await p.click('[data-act=mode][data-v=test]');
    const ans = await p.evaluate(() => gameQuestions(LESSONS[0]).qs[0].answer);
    await p.click(`[data-act=gPick][data-v="${1 - ans}"]`);
    ok((await text(p, '.game-fb')).startsWith('✗ Not quite.') && await p.$('.chipbtn.wrong') && await p.$('.chipbtn.right'), 'wrong answer feedback');
    await p.waitForFunction(() => document.querySelector('#announce').textContent.startsWith('Not quite'));
    ok(await p.evaluate(() => document.activeElement.dataset.act === 'gNext'), 'focus not on Next');
    await p.keyboard.press('Enter');
    const a2 = await p.evaluate(() => gameQuestions(LESSONS[0]).qs[1].answer);
    await p.click(`[data-act=gPick][data-v="${a2}"]`);
    ok((await text(p, '.game-fb')).startsWith('✓ Right.'), 'right answer feedback');
    ok((await text(p, '.qhead')).includes('1 right') && (await text(p, '.dots')).includes('✗') && (await text(p, '.dots')).includes('✓'), 'dots show colour only');
    // Order game: every tap is checked at once; the right order shows at the end.
    await seed(p, {v:2, tab:'learn', openLesson:'l9', stage:{l9:1}});
    await p.click('[data-act=mode][data-v=test]');
    const wrongFirst = await p.evaluate(() => gameQuestions(LESSONS[8]).items.findIndex(i => i.text === 'Lambda'));
    await p.click(`[data-act=gOrder][data-i="${wrongFirst}"]`);
    ok((await text(p, '.game.order li.no')).includes('goes at 5'), 'order tap not checked at once');
    await p.waitForFunction(() => document.querySelector('#announce').textContent.startsWith('Lambda: not there'));
    for (let k = 0; k < 4; k++) await p.click('.game .chipbtn:not(:disabled)');
    ok((await text(p, '.answer-order')).includes('3-4. Elastic Beanstalk or Fargate') && await p.$$eval('.answer-order li', ls => ls.length) === 4, 'right order not shown: ' + await text(p, '.answer-order'));
    // Who manages what: one tap per column, checked at once, labelled for screen readers.
    await seed(p, {v:2, tab:'learn', openLesson:'l2', stage:{l2:1}});
    await p.click('[data-act=mode][data-v=test]');
    await p.click('[data-act=gCol][data-i="1"][data-v="4"]');
    ok((await text(p, '.who-fb li.ok')).includes('IaaS'), 'right column not marked right');
    await p.click('[data-act=gCol][data-i="2"][data-v="5"]');
    ok((await text(p, '.who-fb li.no')).includes('top 2'), 'wrong column not explained');
    ok(await p.$$eval('.who-c.no', cs => cs.every(c => /wrong/.test(c.getAttribute('aria-label')) && c.textContent.includes('✗'))), 'wrong cells not labelled');
    ok(!(await p.$('.game-score')), 'score before every column is set');
    await p.click('[data-act=gCol][data-i="0"][data-v="7"]'); await p.click('[data-act=gCol][data-i="3"][data-v="1"]');
    await p.waitForFunction(() => document.querySelector('#announce').textContent.endsWith(' 3 of 4 right.'));
    await p.click('[data-act=gameReset]'); await p.click('[data-act=gCol][data-i="0"][data-v="7"]');
    for (const [i, v] of [[1, 4], [2, 2], [3, 1]]) await p.click(`[data-act=gCol][data-i="${i}"][data-v="${v}"]`);
    await p.waitForFunction(() => document.querySelector('#announce').textContent === 'SaaS: right. 4 of 4 right.');
  });
  await check('cards and games change no saved progress except today as a study day; they restart (U10.4)', async () => {
    await seed(p, {v:2, tab:'learn', openLesson:'l10', stage:{l10:1}});
    const before = await p.evaluate(() => { save(); const s = JSON.parse(localStorage.getItem('awsCourse1')); delete s.days; return JSON.stringify(s); });
    await p.click('[data-act=mode][data-v=test]');
    const steps = await p.evaluate(() => gameQuestions(LESSONS[9]).items.length);
    for (let k = 0; k < steps; k++) await p.click('.game .chipbtn:not(:disabled)');
    ok(await p.$('.game-score'), 'order game did not finish');
    await p.click('[data-act=gameReset]');
    ok((await text(p, '.game ~ p')).startsWith(`0 of ${steps} placed`), 'game did not restart');
    await p.evaluate(() => { S.stage.l10 = 0; render(); });
    await p.click('[data-act=mode][data-v=cards]'); await p.click('.flipcard'); await p.click('[data-act=cardGot]');
    const after = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('awsCourse1')); const d = s.days; delete s.days; s.stage.l10 = 1; return [JSON.stringify(s), d[todayISO()] === true]; });
    ok(after[0] === before, 'saved progress changed by practising');
    ok(after[1], 'today not marked as a study day');
  });

  await check('no script errors anywhere above', async () => { ok(!errors.length, errors.join(' | ')); });

  await browser.close();
  finish();
})().catch(e => { console.error(e); process.exit(1); });
