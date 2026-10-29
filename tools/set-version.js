// Sets the app version everywhere it lives: node tools/set-version.js 1.1.0
// web/js/version.js, desktop/src-tauri/tauri.conf.json, Cargo.toml and the app's entry in Cargo.lock.
const fs = require('fs');
const path = require('path');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Usage: node tools/set-version.js 1.2.3'); process.exit(1); }
const root = path.resolve(__dirname, '..');
// Every pattern is checked before anything is written, so a miss never leaves files half-updated.
// \r?\n: a Windows checkout may have CRLF line endings.
const edits = [
  ['web/js/version.js', /const APP_VERSION = '[^']*';/, `const APP_VERSION = '${v}';`],
  ['desktop/src-tauri/tauri.conf.json', /"version": "[^"]*"/, `"version": "${v}"`],
  ['desktop/src-tauri/Cargo.toml', /^version = "[^"]*"/m, `version = "${v}"`],
  ['desktop/src-tauri/Cargo.lock', /(name = "aws-cp-study"\r?\nversion = )"[^"]*"/, `$1"${v}"`]
].map(([rel, re, to]) => {
  const f = path.join(root, rel), s = fs.readFileSync(f, 'utf8');
  if (!re.test(s)) { console.error('Version not found in ' + rel + '. Nothing was changed.'); process.exit(1); }
  return [rel, f, s.replace(re, to)];
});
for (const [rel, f, out] of edits) { fs.writeFileSync(f, out); console.log('set ' + rel); }
