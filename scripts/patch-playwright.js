const fs = require('fs');
const path = require('path');

const playwrightTestPath = path.resolve(__dirname, '../node_modules/playwright/lib/program.js');

if (!fs.existsSync(playwrightTestPath)) {
  console.error('Playwright not found at', playwrightTestPath);
  process.exit(1);
}

let content = fs.readFileSync(playwrightTestPath, 'utf-8');

// Remove old patch if exists
if (content.includes('// DIRECTOR PATCH')) {
  const startIdx = content.indexOf('// DIRECTOR PATCH');
  const endIdx = content.indexOf('// END DIRECTOR PATCH');
  if (endIdx !== -1) {
    content = content.slice(0, startIdx) + content.slice(endIdx + '// END DIRECTOR PATCH\n\n'.length);
    console.log('✅ Removed old patch');
  }
}

// Add WebSocket server at the very beginning of the file
const patch = `// DIRECTOR PATCH - Start WebSocket server for MD editing
if (global.__directorWsServerStarted) return;
global.__directorWsServerStarted = true;

const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const testSuitesDir = path.resolve(process.cwd(), 'test-suites');
if (!fs.existsSync(testSuitesDir)) fs.mkdirSync(testSuitesDir, { recursive: true });

// WebSocket server on random free port
const wss = new WebSocketServer({ port: 0 });

let wsPort = null;
wss.on('listening', () => {
  wsPort = wss.address().port;
  global.directorWsPort = wsPort;
  console.log(\`Director WebSocket server on ws://localhost:\${wsPort}\`);
  
  // Patch HTML to inject port in node_modules
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
    html = html.replace('</body>', \`<script>window.DIRECTOR_WS_PORT = \${wsPort};</script></body>\`);
    fs.writeFileSync(uiModeHtmlPath, html);
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
      
      if (msg.type === 'GET_FILES') {
        const files = fs.readdirSync(testSuitesDir).filter(f => f.endsWith('.md') || f.endsWith('.feature')).map(name => ({
          name, path: 'test-suites/' + name,
          content: fs.readFileSync(path.join(testSuitesDir, name), 'utf-8'),
          status: 'idle', isModified: false, scenarios: []
        }));
        ws.send(JSON.stringify({ id: msg.id, type: 'FILES', data: files }));
      }
      
      else if (msg.type === 'CREATE_FILE') {
        // Extract just the filename if path includes test-suites/
        let filename = msg.data.name;
        if (filename.startsWith('test-suites/')) {
          filename = filename.replace('test-suites/', '');
        }
        const filePath = path.join(testSuitesDir, filename);
        if (fs.existsSync(filePath)) {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'File already exists' }));
        } else {
          fs.writeFileSync(filePath, msg.data.content || '', 'utf-8');
          ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
        }
      }
      
      else if (msg.type === 'SAVE_FILE') {
        // Extract just the filename if path includes test-suites/
        let filename = msg.data.name;
        if (filename.startsWith('test-suites/')) {
          filename = filename.replace('test-suites/', '');
        }
        const filePath = path.join(testSuitesDir, filename);
        fs.writeFileSync(filePath, msg.data.content, 'utf-8');
        ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
      }
      
      else if (msg.type === 'DELETE_FILE') {
        // Extract just the filename if path includes test-suites/
        let filename = msg.data.name;
        if (filename.startsWith('test-suites/')) {
          filename = filename.replace('test-suites/', '');
        }
        const filePath = path.join(testSuitesDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          ws.send(JSON.stringify({ id: msg.id, type: 'SUCCESS' }));
        } else {
          ws.send(JSON.stringify({ id: msg.id, type: 'ERROR', error: 'File not found' }));
        }
      }
      
    } catch (e) {
      ws.send(JSON.stringify({ id: msg?.id || 0, type: 'ERROR', error: String(e) }));
    }
  });
});
// END DIRECTOR PATCH

`;

const newContent = patch + content;
fs.writeFileSync(playwrightTestPath, newContent);
console.log('✅ Playwright patched successfully!');
