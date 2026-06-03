const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Set up the Inventory directory in the user's home folder
const INVENTORY_DIR = path.join(os.homedir(), 'Phonethagoras_Inventory');

// Ensure the directory exists
if (!fs.existsSync(INVENTORY_DIR)) {
  fs.mkdirSync(INVENTORY_DIR, { recursive: true });
  // Add a dummy file just for testing
  fs.writeFileSync(path.join(INVENTORY_DIR, 'resume_draft.txt'), "John Doe\nSkills: Communication, Teamwork\nNeeds improvement: Excel.");
}

console.log(`[Sidecar] Inventory path: ${INVENTORY_DIR}`);

// 1. List files in Inventory
app.get('/api/inventory', (req, res) => {
  try {
    const files = fs.readdirSync(INVENTORY_DIR);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Read specific file
app.get('/api/inventory/read', (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) return res.status(400).json({ error: 'Missing file parameter' });
    
    // Prevent directory traversal
    const safePath = path.normalize(path.join(INVENTORY_DIR, filename));
    if (!safePath.startsWith(INVENTORY_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(safePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = fs.readFileSync(safePath, 'utf8');
    res.json({ filename, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Write to specific file
app.post('/api/inventory/write', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || content === undefined) {
      return res.status(400).json({ error: 'Missing filename or content' });
    }

    const safePath = path.normalize(path.join(INVENTORY_DIR, filename));
    if (!safePath.startsWith(INVENTORY_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (global.ignoreNextWatchEvent) {
      global.ignoreNextWatchEvent.add(filename);
    }
    fs.writeFileSync(safePath, content, 'utf8');
    
    // Automatically re-index this single file for RAG if it's a doc
    if (filename.endsWith('.md') || filename.endsWith('.txt')) {
       // Fire and forget re-index (ideally, just chunks for this file)
    }

    res.json({ success: true, message: `File ${filename} updated.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Proxy Chat to local LM Studio
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('[Sidecar] LM Studio not running or unreachable:', err.message);
    res.status(502).json({ error: 'Failed to connect to local LLM (is LM Studio running?)' });
  }
});

// 5. SILK Memory endpoints
const MemoryEngine = require('./silk_memory');

app.post('/api/memory/remember', (req, res) => {
  const { fact } = req.body;
  if (!fact) return res.status(400).json({ error: 'Missing fact' });
  const result = MemoryEngine.rememberFact(fact);
  res.json(result);
});

app.get('/api/memory/recall', (req, res) => {
  res.json({ facts: MemoryEngine.recallFacts() });
});

// 6. Web Search endpoint (using google-it)
const googleIt = require('google-it');

app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing search query' });
  
  try {
    const results = await googleIt({ query, disableConsole: true });
    res.json({ results });
  } catch (err) {
    console.error('[Sidecar] Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Web Scraper endpoint (using cheerio)
const cheerio = require('cheerio');

app.get('/api/fetch', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'Missing url' });
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, etc.
    $('script, style, nav, footer, header, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Limit to ~10k chars to avoid blowing up context
    res.json({ text: text.substring(0, 10000) });
  } catch (err) {
    console.error('[Sidecar] Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

const Embeddings = require('./embeddings');

// 8. RAG Index Endpoint
app.post('/api/inventory/index', async (req, res) => {
  try {
    const files = fs.readdirSync(INVENTORY_DIR);
    let chunksProcessed = 0;
    
    MemoryEngine.clearChunks(); // Start fresh (naive indexing)

    for (const file of files) {
      if (!file.endsWith('.md') && !file.endsWith('.txt')) continue;
      
      const filePath = path.join(INVENTORY_DIR, file);
      const text = fs.readFileSync(filePath, 'utf-8');
      
      const chunks = Embeddings.chunkText(text, 150); // 150 words per chunk
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const vector = await Embeddings.getEmbedding(chunkText);
        
        if (vector) {
          const id = `${file}_chunk_${i}`;
          MemoryEngine.insertChunk(id, file, i, chunkText, JSON.stringify(vector));
          chunksProcessed++;
        }
      }
    }
    
    res.json({ success: true, message: `Indexed ${chunksProcessed} chunks across inventory.` });
  } catch (err) {
    console.error('[Sidecar] Indexing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. RAG Semantic Search Endpoint
app.get('/api/inventory/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  try {
    const queryVector = await Embeddings.getEmbedding(query);
    if (!queryVector) return res.status(500).json({ error: 'Failed to generate embedding for query' });

    const allChunks = MemoryEngine.getAllChunks();
    const scoredChunks = allChunks.map(chunk => {
      const chunkVector = JSON.parse(chunk.vector_json);
      const score = Embeddings.cosineSimilarity(queryVector, chunkVector);
      return { ...chunk, score };
    });

    // Sort descending by score
    scoredChunks.sort((a, b) => b.score - a.score);
    
    // Return top 3 matches
    const topMatches = scoredChunks.slice(0, 3).map(c => ({
      filename: c.filename,
      content: c.text_content,
      score: c.score
    }));

    res.json({ results: topMatches });
  } catch (err) {
    console.error('[Sidecar] Semantic search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Server-Sent Events (SSE) for Async Quest Drops
let sseClients = [];

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

function broadcastEvent(type, data) {
  sseClients.forEach(client => {
    client.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  });
}

const ignoreNextWatchEvent = new Set();
// Expose the Set globally so /api/inventory/write can add to it
global.ignoreNextWatchEvent = ignoreNextWatchEvent;

// Debounce the fs watch to prevent multiple rapid fires for a single file save
const debounceWatchers = {};

fs.watch(INVENTORY_DIR, (eventType, filename) => {
  if (filename && (filename.endsWith('.md') || filename.endsWith('.txt'))) {
    if (debounceWatchers[filename]) clearTimeout(debounceWatchers[filename]);
    
    debounceWatchers[filename] = setTimeout(() => {
      if (global.ignoreNextWatchEvent.has(filename)) {
        global.ignoreNextWatchEvent.delete(filename);
        return;
      }
      
      if (fs.existsSync(path.join(INVENTORY_DIR, filename))) {
        console.log(`[Sidecar] External file modification detected: ${filename}`);
        broadcastEvent('file_updated', { filename });
      }
    }, 500); // 500ms debounce
  }
});

app.listen(PORT, () => {
  console.log(`[Sidecar] Phonethagoras local sidecar running on http://localhost:${PORT}`);
});
