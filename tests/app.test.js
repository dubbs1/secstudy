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
  await check('content: 15 lessons, 45 questions, 6 labs', async () => {
    const c = await p.evaluate(() => [LESSONS.length, QUESTIONS.length, LABS.length]);
    ok(c.join() === '15,45,6', 'got ' + c);
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
    const r = await p.evaluate(() => LESSONS.map((l, i) => [QUESTIONS.filter(q => q.l === l.id).length, l.due, i ? LESSONS[i - 1].due : '']));
    r.forEach(([n, due, prev], i) => { ok(n === 3, `lesson ${i + 1} has ${n} questions`); ok(due > prev && due < '2026-11-30', `lesson ${i + 1} due ${due}`); });
  });
  await check('content: lessons follow the domain weights (4/4/5/2)', async () => {
    const c = await p.evaluate(() => ['cc', 'sec', 'tech', 'bill'].map(d => LESSONS.filter(l => l.d === d).length).join('/'));
    ok(c === '4/4/5/2', c);
  });

  // ---------- saved progress ----------
  await check('first load: no errors, next lesson open, Learn tab', async () => {
    await seed(p);
    ok((await p.$$('.card.open')).length === 1, 'one open card expected');
    ok(await p.getAttribute('#nav [data-tab=learn]', 'aria-selected') === 'true', 'learn not selected');
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
    await seed(p);
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
    await p.click('[data-act=done][data-id=l1]');
    const s2 = await saved(p);
    ok(s2.done.l1 === true && s2.openLesson === 'l2', 'next lesson not opened');
    ok((await text(p, '.stats')).includes('Lessons 1/15'), 'header not updated');
  });
  await check('exam facts open and close; closing reopens the next lesson', async () => {
    await p.click('[data-act=toggleFacts]');
    ok((await text(p, '.card.open')).includes('700 / 1000'), 'facts not shown');
    await p.click('[data-act=toggleFacts]');
    ok((await text(p, '.card.open')).includes('Service and deployment models'), 'next lesson not reopened');
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
  await check('review: session runs, hides lessons, schedules 1 / 3 / 7 days', async () => {
    await p.click('[data-act=rvStart]');
    ok((await p.$$('.card.open')).length === 1, 'lessons still open during review');
    await p.click(`.card.review [data-act=pick][data-i="${await answerOf(p, 'q2')}"]`);
    await p.click('[data-act=rvNext]');
    ok((await text(p, '.card.review')).includes('1/1 right'), 'summary wrong');
    const r = await p.evaluate(() => [S.srs.q2.box, S.srs.q2.due === addDays(todayISO(), 3)]);
    ok(r[0] === 1 && r[1], 'right answer not pushed to 3 days: ' + r);
    await p.click('[data-act=rvClose]');
    ok((await text(p, '#main .card')).includes('Review: nothing due'), 'nothing-due card missing');
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
    ok((await text(p, '.qhead')).includes('of 6'), 'billing filter wrong');
    const qid = await p.getAttribute('[data-act=pick]', 'data-q');
    await p.click(`[data-act=pick][data-i="${await answerOf(p, qid)}"]`);
    await p.click('[data-act=pNext]');
    ok((await text(p, '.qhead')).includes('of 5'), 'right answer still in set');
  });
  await check('weak spots: domain bars and "Practise" filters to that lesson', async () => {
    await seed(p, {v:2, tab:'practice', ans:{q19:{n:2, wrong:2, pick:0, ok:false, at:Date.now()}}});
    await p.click('[data-act=toggleWeak]');
    const t = await text(p, '.card.open');
    ok(t.includes('Lowest: Security') && t.includes('Security services'), t.slice(0, 120));
    await p.click('[data-act=pLesson][data-id=l7]');
    ok((await text(p, '.qhead')).includes('Lesson 7 · 1 of 3'), 'lesson filter not applied');
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
    ok((await text(p, '.stats')).includes('Lessons 2/15'), 'import not shown');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1_beforeImport')).done.l3 === true), 'no backup of the replaced progress');
  });

  // ---------- layout ----------
  for (const [name, opts] of [['phone width, light', {}], ['phone width, dark', {colorScheme:'dark'}], ['desktop width', {viewport:{width:1280, height:900}}]]) {
    await check('layout: no sideways scroll at ' + name, async () => {
      const q = await fresh(opts);
      for (const tab of ['learn', 'practice', 'labs', 'timer']) {
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
    ok(await text(p, '.card.open .row b') === fx.shown.open, 'different lesson open');
    const now = await p.evaluate(() => S);
    for (const k of Object.keys(fx.saved)) ok(JSON.stringify(now[k]) === JSON.stringify(fx.saved[k]), 'field changed on load: ' + k);
  });
  await check('footer shows the version (AC3.1)', async () => {
    ok(await text(p, '#ver') === 'Version ' + await p.evaluate(() => APP_VERSION), 'got ' + await text(p, '#ver'));
  });
  await check('exam text follows the data (AC4.2)', async () => {
    await seed(p);
    await p.evaluate(() => {
      EXAM.date = '2027-03-15'; EXAM.questions = 70;
      LESSONS.push({...LESSONS[14], id:'lx', t:'Extra billing lesson', due:'2027-03-01'});
      S.open = 'facts'; render();
    });
    const head = await text(p, '#top .sub'), facts = await text(p, '.card.open');
    await p.reload();   // restore the real content
    ok(head.includes('2027'), 'header year did not follow: ' + head);
    ok(facts.includes('70 questions') && facts.includes('3 billing'), 'facts did not follow: ' + facts.slice(0, 160));
    ok((await text(p, '.stats')).includes('Lessons 0/15'), 'content not restored');
  });
  await check('an opened lesson, lab or card stays on screen (AC5.1)', async () => {
    await seed(p);
    const onScreen = sel => p.evaluate(s => { const t = document.querySelector(s).getBoundingClientRect().top; return t >= 0 && t < innerHeight; }, sel);
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=openLesson][data-id=l14]');
    ok(await onScreen('[data-act=openLesson][data-id=l14]'), 'lesson 14 off screen');
    await p.click('[data-act=openLesson][data-id=l2]');
    ok(await onScreen('[data-act=openLesson][data-id=l2]'), 'lesson 2 off screen');
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=toggleFacts]');
    ok(await onScreen('[data-act=toggleFacts]'), 'exam facts off screen');
    await p.click('#nav [data-tab=labs]'); await p.click('[data-act=openLab][data-id=lab1]');
    await p.evaluate(() => scrollTo(0, 1e5)); await p.click('[data-act=openLab][data-id=lab6]');
    ok(await onScreen('[data-act=openLab][data-id=lab6]'), 'lab 6 off screen');
  });
  await check('keyboard focus is kept; answers are announced (AC6.1-6.4)', async () => {
    await seed(p);
    const active = () => p.evaluate(() => { const a = document.activeElement; return a.className + '|' + (a.dataset.act || '') + '|' + (a.dataset.i || ''); });
    await p.focus('[data-act=pick][data-q=q1][data-i="1"]'); await p.keyboard.press('Enter');
    ok((await active()).startsWith('fb '), 'after answering, focus is on ' + await active());
    await p.waitForFunction(() => document.querySelector('#announce').textContent.length > 10);
    ok(/^(Right\.|The answer is)/.test(await text(p, '#announce')), 'announcement: ' + await text(p, '#announce'));
    await p.focus('[data-act=step][data-id=l1][data-i="1"]'); await p.keyboard.press('Space');
    ok(await active() === '|step|1', 'after ticking, focus is on ' + await active());
    await p.focus('[data-act=theme]'); await p.keyboard.press('Enter');
    ok((await active()).includes('|theme|'), 'after theme change, focus is on ' + await active());
    await p.keyboard.press('Enter'); await p.keyboard.press('Enter');   // back to System
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
      ok(await text(q, '[data-act=theme]') === 'Theme: System', 'does not start on System');
      await q.click('[data-act=theme]');
      ok(await text(q, '[data-act=theme]') === 'Theme: Light' && await bg() === 'rgb(245, 244, 242)', 'Light not applied: ' + await bg());
      await q.click('[data-act=theme]');
      ok(await text(q, '[data-act=theme]') === 'Theme: Dark' && await bg() === 'rgb(22, 20, 28)', 'Dark not applied: ' + await bg());
      await q.reload();
      ok(await text(q, '[data-act=theme]') === 'Theme: Dark' && await bg() === 'rgb(22, 20, 28)', 'Dark lost on reload');
      await q.click('[data-act=theme]');
      ok(await bg() === (system === 'dark' ? 'rgb(22, 20, 28)' : 'rgb(245, 244, 242)'), 'System not restored');
      await q.context().close();
    });
  }
  await check('text contrast is at least 4.5:1 in both themes (AC7.4)', async () => {
    const bad = [];
    for (const theme of ['light', 'dark']) {
      const q = await fresh();
      await q.evaluate(t => { S.theme = t; S.ans.q1 = {n:1, wrong:1, pick:1, ok:false, at:Date.now()}; S.srs.q1 = {box:0, due:'2020-01-01'}; S.timer.left = 60000; render(); }, theme);
      const r = await q.evaluate(() => {
        const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
        const bgOf = e => { let c; while (e && ((c = getComputedStyle(e).backgroundColor) === 'rgba(0, 0, 0, 0)')) e = e.parentElement; return c || getComputedStyle(document.body).backgroundColor; };
        const sels = ['body', '#top .sub', '.stat', '.stat.timer', '.theme', '.row .t small', '.chip.d-cc', '.chip.d-sec', '.chip.d-tech', '.chip.d-bill', '.opt.wrong .why', '.fb', '.foot', '.foot .link', 'h3', '.check em'];
        return sels.map(s => { const e = document.querySelector(s); if (!e) return [s, null];
          const [a, b] = [lum(getComputedStyle(e).color), lum(bgOf(e))].sort((x, y) => y - x); return [s, (a + .05) / (b + .05)]; });
      });
      for (const [sel, c] of r) if (c === null || c < 4.5) bad.push(`${theme} ${sel} ${c === null ? 'not found' : c.toFixed(2)}`);
      await q.context().close();
    }
    ok(!bad.length, bad.join(', '));
  });

  await check('no script errors anywhere above', async () => { ok(!errors.length, errors.join(' | ')); });

  await browser.close();
  finish();
})().catch(e => { console.error(e); process.exit(1); });
