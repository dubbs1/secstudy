// Sets the app version everywhere it lives: node tools/set-version.js 1.1.0
// web/js/version.js, desktop/src-tauri/tauri.conf.json, Cargo.toml and the app's entry in Cargo.lock.
const fs = require('fs');
const path = require('path');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Usage: node tools/set-version.js 1.2.3'); process.exit(1); }
const root = path.resolve(__dirname, '..');
function edit(rel, re, to){
  const f = path.join(root, rel), s = fs.readFileSync(f, 'utf8');
  if (!re.test(s)) { console.error('Version not found in ' + rel); process.exit(1); }
  fs.writeFileSync(f, s.replace(re, to)); console.log('set ' + rel);
}
edit('web/js/version.js', /const APP_VERSION = '[^']*';/, `const APP_VERSION = '${v}';`);
edit('desktop/src-tauri/tauri.conf.json', /"version": "[^"]*"/, `"version": "${v}"`);
edit('desktop/src-tauri/Cargo.toml', /^version = "[^"]*"/m, `version = "${v}"`);
edit('desktop/src-tauri/Cargo.lock', /(name = "aws-cp-study"\nversion = )"[^"]*"/, `$1"${v}"`);
