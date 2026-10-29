// Checks the installed Windows app (Tauri). The workflow starts the app with
// SECSTUDY_DEBUG_PORT=9222 (opens the WebView2 debug port, see main.rs) and runs this twice:
//   node exe.test.js first    -> app shows, a tick is saved, Export writes a file
//   node exe.test.js restart  -> after closing and reopening the app, the tick is still there
const fs = require('fs');
const os = require('os');
const path = require('path');
const {chromium} = require('playwright');

const phase = process.argv[2] || 'first';
const results = [];
async function check(name, fn){
  try { await fn(); results.push(true); console.log('PASS', name); }
  catch (e) { results.push(false); console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); }
}
function ok(cond, msg){ if (!cond) throw new Error(msg); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function connect(){
  for (let i = 0; i < 60; i++) {
    try {
      const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
      for (let k = 0; k < 20; k++) {
        const page = browser.contexts().flatMap(c => c.pages()).find(p => !p.url().startsWith('devtools'));
        if (page) return {browser, page};
        await sleep(500);
      }
      await browser.close();
    } catch (e) { /* app still starting */ }
    await sleep(1000);
  }
  throw new Error('could not reach the app on port 9222');
}

(async () => {
  const {browser, page} = await connect();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.waitForSelector('#main .card', {timeout:30000});

  if (phase === 'first') {
    await check('app window shows the study tool', async () => {
      ok(await page.title() === 'AWS CP Study', 'title is ' + await page.title());
      ok(await page.evaluate(() => LESSONS.length === 15 && QUESTIONS.length === 45), 'content missing');
    });
    await check('ticking a lesson step is saved', async () => {
      await page.evaluate(() => { localStorage.clear(); location.reload(); }).catch(() => {});
      await page.waitForSelector('[data-act=step]');
      await page.click('[data-act=step][data-id=l1][data-i="0"]');
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1')));
      ok(s.steps.l1[0] === true, 'not saved');
    });
    await check('Export writes a progress file', async () => {
      const downloads = path.join(os.homedir(), 'Downloads');
      const before = new Set(fs.existsSync(downloads) ? fs.readdirSync(downloads) : []);
      const got = page.waitForEvent('download', {timeout:15000}).then(d => d.path()).catch(() => null);
      await page.click('[data-act=export]');
      let file = await got;
      for (let i = 0; !file && i < 15; i++) {   // WebView2 may save straight to Downloads instead
        const fresh = (fs.existsSync(downloads) ? fs.readdirSync(downloads) : []).filter(f => !before.has(f) && f.startsWith('aws-study-progress-') && f.endsWith('.json'));
        if (fresh.length) file = path.join(downloads, fresh[0]);
        else await sleep(1000);
      }
      ok(file, 'no file appeared');
      ok(JSON.parse(fs.readFileSync(file, 'utf8')).steps.l1[0] === true, 'file has no progress in it');
    });
  } else {
    await check('progress is still there after closing and reopening the app', async () => {
      const s = await page.evaluate(() => JSON.parse(localStorage.getItem('awsCourse1')));
      ok(s && s.steps.l1 && s.steps.l1[0] === true, 'tick lost: ' + JSON.stringify(s && s.steps));
    });
  }
  await check('no script errors in the app', async () => { ok(!errors.length, errors.join(' | ')); });

  await browser.close().catch(() => {});
  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
