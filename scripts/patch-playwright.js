/* eslint-disable @typescript-eslint/no-require-imports, no-undef, no-console */
const fs = require('fs')
const path = require('path')

const playwrightTestPath = path.resolve(__dirname, '../node_modules/playwright/lib/program.js')

if (!fs.existsSync(playwrightTestPath)) {
  console.error('Playwright not found at', playwrightTestPath)
  process.exit(1)
}

let content = fs.readFileSync(playwrightTestPath, 'utf-8')

// Remove old patch if exists
if (content.includes('// DIRECTOR PATCH')) {
  const startIdx = content.indexOf('// DIRECTOR PATCH')
  const endIdx = content.indexOf('// END DIRECTOR PATCH')
  if (endIdx !== -1) {
    content =
      content.slice(0, startIdx) + content.slice(endIdx + '// END DIRECTOR PATCH\n\n'.length)
    console.log('✅ Removed old patch')
  }
}

// Add WebSocket server at the very beginning of the file. The patch is a function: a top-level
// return would skip the rest of program.js
const patch = `// DIRECTOR PATCH - Start WebSocket server for MD editing
(() => {
// Only UI mode shows the Director panel - CLI, CI and IDE runs open no port
const isUiMode = process.argv.some(arg => /^--ui(-host|-port)?(=|$)/.test(arg));
if (!isUiMode || global.__directorWsServerStarted) return;
global.__directorWsServerStarted = true;

const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// The server reads, writes and deletes specs: only the Director UI, which gets the token through
// uiMode.html, may connect - not another site open in the browser or another machine
const token = crypto.randomBytes(32).toString('hex');
function hasToken(req) {
  const received = Buffer.from(new URL(req.url, 'http://127.0.0.1').searchParams.get('token') || '');
  const expected = Buffer.from(token);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

const testSuitesDir = path.resolve(process.cwd(), 'test-suites');
if (!fs.existsSync(testSuitesDir)) fs.mkdirSync(testSuitesDir, { recursive: true });

// Suite files in test-suites and its subfolders; names are '/'-separated relative paths
function listSuiteFiles(dir, prefix) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = prefix + entry.name;
    if (entry.isDirectory()) return listSuiteFiles(path.join(dir, entry.name), name + '/');
    return entry.name.endsWith('.md') || entry.name.endsWith('.feature') ? [name] : [];
  });
}

// Absolute path for UI file name ('test-suites/' prefix optional); null when it leaves test-suites
function resolveSuitePath(name) {
  const relative = name.startsWith('test-suites/') ? name.slice('test-suites/'.length) : name;
  const filePath = path.resolve(testSuitesDir, relative);
  return filePath.startsWith(testSuitesDir + path.sep) ? filePath : null;
}

// WebSocket server on a random free loopback port
const wss = new WebSocketServer({
  host: '127.0.0.1',
  port: 0,
  verifyClient: ({ req }) => hasToken(req)
});

let wsPort = null;
wss.on('listening', () => {
  wsPort = wss.address().port;
  global.directorWsPort = wsPort;
  console.log(\`Director WebSocket server on ws://127.0.0.1:\${wsPort}\`);

  // Patch HTML to inject port and token in node_modules
  const uiModeHtmlPath = path.resolve(process.cwd(), 'node_modules/playwright-core/lib/vite/traceViewer/uiMode.html');
  if (fs.existsSync(uiModeHtmlPath)) {
    let html = fs.readFileSync(uiModeHtmlPath, 'utf-8');
    // Remove old script if exists by marker
    const marker = 'DIRECTOR_WS_PORT';
    const startIdx = html.indexOf(marker);
    if (startIdx !== -1) {
      const scriptStart = html.lastIndexOf('<script>', startIdx);
      const scriptEnd = html.indexOf('</script>', startIdx) + '</script>'.length;
      if (scriptStart !== -1 && scriptEnd !== -1) {
        html = html.slice(0, scriptStart) + html.slice(scriptEnd);
      }
    }
    // Change title
    html = html.replace('<title>Playwright Test</title>', '<title>Playwright BDD Director</title>');
    // Add new script
    html = html.replace('</body>', \`<script>window.DIRECTOR_WS_PORT = \${wsPort}; window.DIRECTOR_WS_TOKEN = '\${token}';</script></body>\`);
    fs.writeFileSync(uiModeHtmlPath, html);
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
      
      if (msg.type === 'GET_FILES') {
        const files = listSuiteFiles(testSuitesDir, '').map(name => ({
          name, path: 'test-suites/' + name,
          content: fs.readFileSync(path.join(testSuitesDir, name), 'utf-8'),
          status: 'idle', isModified: false, scenarios: []
        }));
        ws.send(JSON.stringify({ id: msg.id, type: 'FILES', data: files }));
      }
      
      else if (msg.type === 'CREATE_FILE') {
        const filePath = resolveSuitePath(msg.data.name);
        if (!filePath) {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'Path is outside test-suites' }));
          return;
        }
        if (fs.existsSync(filePath)) {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'File already exists' }));
        } else {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, msg.data.content || '', 'utf-8');
          ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
        }
      }
      
      else if (msg.type === 'SAVE_FILE') {
        const filePath = resolveSuitePath(msg.data.name);
        if (!filePath) {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'Path is outside test-suites' }));
          return;
        }
        fs.writeFileSync(filePath, msg.data.content, 'utf-8');
        ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
      }
      
      else if (msg.type === 'DELETE_FILE') {
        const filePath = resolveSuitePath(msg.data.name);
        if (!filePath) {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'Path is outside test-suites' }));
          return;
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
        } else {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'File not found' }));
        }
      }
      
      else if (msg.type === 'RUN_STAGE') {
        const { spawn } = require('child_process');
        const stage = spawn('npx', ['tsx', 'scripts/md-ts-director.ts'], {
          cwd: process.cwd(),
          stdio: 'pipe',
          shell: true
        });
        
        let output = '';
        stage.stdout.on('data', (data) => {
          output += data.toString();
        });
        stage.stderr.on('data', (data) => {
          output += data.toString();
        });
        
        stage.on('close', (code) => {
          ws.send(JSON.stringify({
            id: msg.id,
            type: code === 0 ? 'SUCCESS' : 'ERROR',
            data: { output, code }
          }));
        });
      }
      
    } catch (e) {
      ws.send(JSON.stringify({ id: msg?.id || 0, type: 'ERROR', error: String(e) }));
    }
  });
});
})();
// END DIRECTOR PATCH

`

const newContent = patch + content
fs.writeFileSync(playwrightTestPath, newContent)
console.log('✅ Playwright patched successfully!')
