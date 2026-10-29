// Shared by the test files: one PASS/FAIL line per check, a summary, and a static server for web/.
const fs = require('fs');
const path = require('path');
const http = require('http');

const WEB = path.resolve(__dirname, '..', 'web');
const results = [];

async function check(name, fn){
  try { await fn(); results.push(true); console.log('PASS', name); }
  catch (e) { results.push(false); console.log('FAIL', name, '\n     ', e.message.split('\n')[0]); }
}
function ok(cond, msg){ if (!cond) throw new Error(msg); }
function finish(){
  const failed = results.filter(r => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

// Serves web/ on localhost (a secure context, so the service worker runs). Resolves to {base, close}.
function serveWeb(){
  const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webmanifest':'application/manifest+json'};
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(WEB, rel === '/' ? 'index.html' : rel);
    if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {'Content-Type':types[path.extname(f)] || 'application/octet-stream'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => r({base:`http://localhost:${server.address().port}/`, close:() => server.close()})));
}

module.exports = {WEB, check, ok, finish, serveWeb};
