const http = require('http');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'annotations.json');
const PORT = 3847;
const ALLOWED_ORIGIN = 'https://kyndly-technologies.github.io';

// Load or init
let annotations = {};
try { annotations = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) { annotations = {}; }

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(annotations, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // GET /annotations — return all
  if (req.method === 'GET' && req.url === '/annotations') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify(annotations));
  }

  // POST /annotations — add stroke(s) for an image key
  if (req.method === 'POST' && req.url === '/annotations') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // data = { key: "image-key", stroke: {...} }
        if (!data.key || !data.stroke) throw new Error('need key + stroke');
        if (!annotations[data.key]) annotations[data.key] = [];
        annotations[data.key].push(data.stroke);
        save();
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ ok: true, total: annotations[data.key].length }));
      } catch(e) {
        res.writeHead(400, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /annotations?key=X&name=Y — clear one person's annotations on one image
  if (req.method === 'DELETE' && req.url.startsWith('/annotations')) {
    const url = new URL(req.url, 'http://localhost');
    const name = url.searchParams.get('name');
    if (name) {
      // Clear all of this person's strokes across all images
      Object.keys(annotations).forEach(key => {
        annotations[key] = (annotations[key] || []).filter(s => s.name !== name);
      });
      save();
    }
    res.writeHead(200, {'Content-Type': 'application/json'});
    return res.end(JSON.stringify({ ok: true }));
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Annotations API running on :${PORT}`);
});
