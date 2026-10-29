// Checks on the files themselves, no browser. Run: node tests/structure.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {WEB, check, ok, finish} = require('./lib');

const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
function walk(dir){
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}
// Runs classic-script files in one context, the way the page loads them, and returns that context.
function runScripts(files){
  const ctx = vm.createContext({});
  for (const f of files) vm.runInContext(read(f), ctx, {filename:f});
  return ctx;
}

(async () => {
  const html = read('web/index.html');
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => 'web/' + m[1]);

  await check('page shell is small and has no inline style or script logic (AC1.1)', async () => {
    const lines = html.split('\n').length;
    ok(lines < 80, `${lines} lines`);
    ok(!/<style>/.test(html), 'has a <style> block');
    ok(!/<script>(?!<\/script>)/.test(html), 'has an inline <script>');
  });

  await check('every script tag points at a file, and every js file is loaded', async () => {
    for (const s of scripts) ok(fs.existsSync(path.join(ROOT, s)), 'missing ' + s);
    const js = walk(path.join(WEB, 'js')).map(f => path.relative(ROOT, f));
    const notLoaded = js.filter(f => !scripts.includes(f));
    ok(!notLoaded.length, 'not loaded by index.html: ' + notLoaded.join(', '));
    ok(scripts[scripts.length - 1] === 'web/js/app.js', 'app.js must load last');
  });

  await check('content files are data only (AC1.2)', async () => {
    const files = fs.readdirSync(path.join(WEB, 'js', 'content')).map(f => 'web/js/content/' + f);
    const ctx = runScripts(files);
    const fns = vm.runInContext(`(() => { const out = [];
      const walk = (v, at) => { if (typeof v === 'function') out.push(at); else if (v && typeof v === 'object') for (const k in v) walk(v[k], at + '.' + k); };
      for (const n of ['EXAM', 'DOMAINS', 'LESSONS', 'QUESTIONS', 'LABS']) walk(globalThis[n] !== undefined ? globalThis[n] : eval(n), n);
      return out; })()`, ctx);
    ok(!fns.length, 'functions in content: ' + fns.join(', '));
    const counts = vm.runInContext('[LESSONS.length, QUESTIONS.length, LABS.length, typeof EXAM.date]', ctx);
    ok(counts.join() === '15,45,6,string', 'content did not load on its own: ' + counts);
  });

  await check('offline list matches the files in web/ (AC2.2)', async () => {
    const sw = read('web/sw.js');
    const listed = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
    const onDisk = walk(WEB).map(f => path.relative(WEB, f).split(path.sep).join('/')).filter(f => f !== 'sw.js');
    const missing = onDisk.filter(f => !listed.includes(f)), extra = listed.filter(f => !onDisk.includes(f));
    ok(!missing.length, 'not in sw.js FILES: ' + missing.join(', '));
    ok(!extra.length, 'in sw.js FILES but not in web/: ' + extra.join(', '));
  });

  await check('one version: app, Tauri config and Cargo.toml agree; cache name uses it (AC3.2, AC3.3)', async () => {
    const app = vm.runInContext('APP_VERSION', runScripts(['web/js/version.js']));
    const tauri = JSON.parse(read('desktop/src-tauri/tauri.conf.json')).version;
    const cargo = read('desktop/src-tauri/Cargo.toml').match(/^version = "([^"]+)"/m)[1];
    ok(/^\d+\.\d+\.\d+$/.test(app), 'APP_VERSION is ' + app);
    ok(app === tauri && app === cargo, `app ${app}, tauri.conf.json ${tauri}, Cargo.toml ${cargo}`);
    ok(/importScripts\('js\/version\.js'\)/.test(read('web/sw.js')) && /'secstudy-' \+ APP_VERSION/.test(read('web/sw.js')), 'sw.js cache name does not use APP_VERSION');
  });

  await check('Windows app and website both ship web/ as it is (AC2.1)', async () => {
    ok(JSON.parse(read('desktop/src-tauri/tauri.conf.json')).build.frontendDist === '../../web', 'Tauri frontendDist is not ../../web');
    ok(/upload-pages-artifact@v3\s+with:\s+path: web\b/.test(read('.github/workflows/test.yml')), 'pages job does not upload web/');
  });

  await check('no hard-coded exam facts outside content (AC4.1)', async () => {
    const code = walk(path.join(WEB, 'js')).filter(f => !f.includes(path.join('js', 'content'))).map(f => [f, fs.readFileSync(f, 'utf8')]);
    for (const [f, src] of code) {
      ok(!/\b2026\b|CLF-C02|\b65 questions|All 15 lessons/.test(src), path.relative(ROOT, f) + ' has a hard-coded exam fact');
    }
  });

  finish();
})();
