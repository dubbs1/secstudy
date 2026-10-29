// Stand-in for the Windows app on any OS, to try exe.test.js locally:
//   node exe-standin.js <profile-dir> &   then   node exe.test.js first   (stop it, start again)   node exe.test.js restart
// Chromium with debug port 9222 and a persistent profile, showing web/index.html.
const path = require('path');
const {chromium} = require('playwright');
(async () => {
  const ctx = await chromium.launchPersistentContext(process.argv[2], {args:['--remote-debugging-port=9222'], acceptDownloads:true});
  const p = ctx.pages()[0] || await ctx.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..', 'web', 'index.html'));
  process.on('SIGTERM', async () => { await ctx.close(); process.exit(0); });
  setInterval(() => {}, 1000);
})();
