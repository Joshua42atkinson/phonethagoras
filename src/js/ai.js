/**
 * AI ENGINE — phone.com
 * 
 * Implements:
 * 1. Local-first RAG (BM25 Indexer) over "The Great Game" book (src/assets/book.md)
 * 2. Three-tier inference routing:
 *    - TIER 1 (High): Local Nemotron 120B on LM Studio (http://localhost:1234/v1)
 *    - TIER 2 (Mid): Liquid Sidecar (http://localhost:1235/v1) or in-browser
 *    - TIER 3 (Lite): Offline Socratic fallback using RAG context
 * 3. Vision API support (sending base64 image data to local vision model)
 */

const PhoneAI = (() => {
  let bookIndex = null;
  let isLoaded = false;
  let activeBackend = 'offline';
  let activeModel = 'fallback';

  // ─── 1. BM25 Search Indexer ───
  function tokenize(text) {
    return text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function createBM25Index(paragraphs) {
    const docs = paragraphs
      .map(p => p.trim())
      .filter(p => p.length > 30) // Filter out small fragments
      .map((text, id) => {
        const tokens = tokenize(text);
        const terms = {};
        tokens.forEach(t => terms[t] = (terms[t] || 0) + 1);
        return { id, text, terms, len: tokens.length };
      });

    const N = docs.length;
    if (N === 0) return null;
    
    const avgDocLen = docs.reduce((sum, d) => sum + d.len, 0) / N;

    const df = {};
    docs.forEach(d => {
      Object.keys(d.terms).forEach(t => {
        df[t] = (df[t] || 0) + 1;
      });
    });

    const idf = {};
    Object.keys(df).forEach(t => {
      idf[t] = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
    });

    return { docs, idf, avgDocLen, N };
  }

  function queryBM25(index, queryText, topK = 3) {
    if (!index) return [];
    const qTokens = tokenize(queryText);
    const scores = index.docs.map(doc => {
      let score = 0;
      qTokens.forEach(t => {
        if (doc.terms[t]) {
          const idf = index.idf[t] || 0;
          const tf = doc.terms[t];
          const k1 = 1.2;
          const b = 0.75;
          const num = tf * (k1 + 1);
          const den = tf + k1 * (1 - b + b * (doc.len / index.avgDocLen));
          score += idf * (num / den);
        }
      });
      return { doc, score };
    });

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(x => x.doc.text);
  }

  // ─── 2. Initialize RAG ───
  async function init() {
    try {
      console.log('[phone-ai] Loading Great Game book...');
      const response = await fetch('assets/book.md');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();

      // Split by double newlines to index paragraphs
      const paragraphs = text.split(/\n\s*\n+/);
      bookIndex = createBM25Index(paragraphs);
      isLoaded = true;
      console.log(`[phone-ai] Indexed ${paragraphs.length} paragraphs. RAG ready.`);
      
      // Probe backends
      await probeBackends();
    } catch (e) {
      console.warn('[phone-ai] Could not load book for RAG:', e.message);
      isLoaded = false;
    }
  }

  // ─── 3. Probe Backends ───
  async function probeBackends() {
    let hwRecommendedModel = 'Liquid-LFM-1B';
    let hwRecommendedBackend = 'wasm';

    if (typeof PhoneHardware !== 'undefined') {
      try {
        const hw = await PhoneHardware.profile();
        hwRecommendedModel = hw.model;
        hwRecommendedBackend = hw.backend;
      } catch (e) {
        console.warn('[phone-ai] Failed to fetch hardware profile:', e);
      }
    }

    // 1. Try LM Studio (Nemotron 120B / Custom local model)
    try {
      const response = await fetch('http://localhost:1234/v1/models', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        activeBackend = 'lmstudio';
        activeModel = data.data?.[0]?.id || 'Nemotron-120B';
        console.log(`[phone-ai] Connected to LM Studio: ${activeModel} (Hardware Tier Override)`);
        return;
      }
    } catch {}

    // 2. Try Liquid Sidecar (Model chosen according to hardware-aware compilation)
    try {
      const response = await fetch('http://localhost:1235/v1/models', { method: 'GET' });
      if (response.ok) {
        activeBackend = 'liquid';
        activeModel = hwRecommendedModel;
        console.log(`[phone-ai] Connected to Liquid Sidecar: Running hardware-aware model ${activeModel} via ${hwRecommendedBackend.toUpperCase()}`);
        return;
      }
    } catch {}

    // 3. Fallback to Offline (Informs user what model their hardware is ready to run)
    activeBackend = 'offline';
    activeModel = `Offline (Ready for ${hwRecommendedModel} via ${hwRecommendedBackend.toUpperCase()})`;
    console.log(`[phone-ai] Operating in offline mode. Configured for local NPU/WebGPU: ${hwRecommendedModel}`);
  }

  // ─── 4. Build Prompts ───
  function buildSystemPrompt(state, vaamSummary, ragContexts) {
    const rootsStr = `own: ${Math.round(state.roots.own*100)}%, bond: ${Math.round(state.roots.bond*100)}%, skill: ${Math.round(state.roots.skill*100)}%`;
    const shapeStr = `mind: ${state.shape.mind}, heart: ${state.shape.heart}, body: ${state.shape.body}, act: ${state.shape.act}`;
    const walkStr = `depth: ${state.walk.depth}, dare: ${state.walk.dare}`;
    
    let contextBlock = '';
    if (ragContexts && ragContexts.length > 0) {
      contextBlock = `\n[Teachings from The Great Game Book]:\n` + ragContexts.map(c => `  - ${c}`).join('\n');
    }

    return `You are the Mind of phone, a local-first Socratic AI agent. You act as an educational companion, guiding the user's personal learning walk.

We follow the "Zen Zuse" philosophy (East meets West):
- Zen: Strip away institutional fluff. Speak in simple, direct, rooted English words.
- Zuse: Build understanding from first principles, step-by-step.

Current Player Book State:
- Shape: ${shapeStr}
- Roots: ${rootsStr}
- Walk: ${walkStr}

VAAM Language Profile:
- ${vaamSummary}

Rules:
1. Speak in the second person ("You notice...", "Your body...").
2. Mirror the user's directness and brevity. If they are terse, keep your responses under 50 words. Never exceed 90 words.
3. Draw insights from the context from The Great Game below if relevant.
4. End your response with a single, short, powerful Socratic question that invites self-observation. Do not add standard conversational filler.
${contextBlock}`;
  }

  // ─── 5. Chat Completion ───
  async function chat(message, imageBase64 = null) {
    // 1. Load context
    const state = PhoneState.load();
    const vaamSummary = typeof VAAM !== 'undefined' ? VAAM.promptSummary() : 'Brevity: 0.5 | Directness: 0.5';
    
    // 2. Query RAG
    const ragContexts = bookIndex ? queryBM25(bookIndex, message, 3) : [];
    
    // Record message details for VAAM profile
    if (typeof VAAM !== 'undefined') {
      const words = message.split(/\s+/).length;
      const questions = (message.match(/\?/g) || []).length;
      const statements = Math.max(message.split(/[.!?]/).length - questions, 1);
      VAAM.recordInteraction(words, questions, statements);
      
      // Check if message has any vocabulary matches
      const constants = window.ZEN_CONST;
      if (constants) {
        const vocab = Object.values(constants.ZEN);
        const detections = VAAM.scanMessage(message, vocab);
        if (detections.length > 0) {
          detections.forEach(d => {
            VAAM.recordWordUsage(d.word, true);
            console.log(`[phone-ai] Detected vocabulary: ${d.word} (times: ${d.timesUsed}, mastered: ${d.newlyMastered})`);
          });
        }
      }
    }

    // 3. Heuristic offline response
    if (activeBackend === 'offline') {
      return getOfflineResponse(message, ragContexts);
    }

    // 4. Online API request
    const url = activeBackend === 'lmstudio' 
      ? 'http://localhost:1234/v1/chat/completions'
      : 'http://localhost:1235/v1/chat/completions'; // Liquid sidecar

    const systemPrompt = buildSystemPrompt(state, vaamSummary, ragContexts);
    
    let contentNode;
    if (imageBase64) {
      contentNode = [
        { type: 'text', text: message },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`
          }
        }
      ];
    } else {
      contentNode = message;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: contentNode }
          ],
          temperature: 0.7,
          max_tokens: 150
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '...';
    } catch (e) {
      console.warn('[phone-ai] API request failed, falling back to offline heuristics:', e.message);
      return getOfflineResponse(message, ragContexts);
    }
  }

  // ─── 6. Offline Heuristics Engine ───
  function getOfflineResponse(message, ragContexts) {
    const cleanMsg = message.toLowerCase().trim();
    let responseText = '';

    if (ragContexts && ragContexts.length > 0) {
      // Clean up markdown in selected paragraph
      const cleanSnippet = ragContexts[0]
        .replace(/[*#_`\-]/g, '')
        .split('\n')[0]
        .trim();
      responseText = `The Great Game teaches us:\n"${cleanSnippet}"\n\nHow does this truth show up in your body right now?`;
    } else if (cleanMsg.includes('hello') || cleanMsg.includes('hi')) {
      responseText = "You are here. Let us observe the pattern of your breath. What is drawing your attention today?";
    } else if (cleanMsg.includes('mind') || cleanMsg.includes('think') || cleanMsg.includes('reason')) {
      responseText = "Your mind seeking meaning. When you stop naming what you see, what is left?";
    } else if (cleanMsg.includes('heart') || cleanMsg.includes('love') || cleanMsg.includes('feel')) {
      responseText = "The heart feeling the connection. Where is the love in this moment?";
    } else if (cleanMsg.includes('body') || cleanMsg.includes('breath') || cleanMsg.includes('pain')) {
      responseText = "The physical temple. What is your body trying to tell you?";
    } else if (cleanMsg.includes('act') || cleanMsg.includes('do') || cleanMsg.includes('work')) {
      responseText = "Action. Building, moving, doing. How do you take this first principle and make it real?";
    } else {
      responseText = "Every experience is a word. You are reading your own code. What pattern are you noticing in this interaction?";
    }

    return responseText;
  }

  // ─── 7. Custom Completion API ───
  async function complete(systemPrompt, userPrompt) {
    if (activeBackend === 'offline') {
      return getOfflineRecycleResponse(userPrompt);
    }

    const url = activeBackend === 'lmstudio' 
      ? 'http://localhost:1234/v1/chat/completions'
      : 'http://localhost:1235/v1/chat/completions';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 350
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '...';
    } catch (e) {
      console.warn('[phone-ai] Custom completion failed, falling back to offline heuristics:', e.message);
      return getOfflineRecycleResponse(userPrompt);
    }
  }

  function getOfflineRecycleResponse(text) {
    const cleanText = text.toLowerCase();
    
    // Default bullet points generated offline based on keyword matches
    let summary = "Experienced professional offering a robust history of project completion and problem-solving.";
    let bullets = [
      "Demonstrates high resilience and adaptability in high-stress, rapidly evolving environments.",
      "Maintains strong ownership and accountability over complex operational outcomes.",
      "Translates complex challenges into structured action plans and executable deliverables."
    ];

    if (cleanText.includes('marine') || cleanText.includes('military') || cleanText.includes('combat') || cleanText.includes('veteran')) {
      summary = "Resourceful transition specialist with a strong background in operational coordination, team leadership, and tactical execution.";
      bullets = [
        "Led cross-functional teams in challenging environments, establishing standard operating procedures and mitigating systemic risk.",
        "Demonstrated intense resilience and grit under operational pressure, prioritizing focus and mission success.",
        "Managed physical assets and equipment accountability with zero loss under high-stress scenarios."
      ];
    } else if (cleanText.includes('recovery') || cleanText.includes('addiction') || cleanText.includes('sober') || cleanText.includes('rehab')) {
      summary = "Peer support advocate and facilitator specializing in resilience training, structured life transitions, and accountability counseling.";
      bullets = [
        "Leverages deep personal experience in overcoming setbacks to guide peers through cognitive and behavioral changes.",
        "Facilitates communication and relationship-building across diverse caseloads to reduce social friction.",
        "Established personal discipline regimes, achieving consistency in daily habits and metric self-observation."
      ];
    } else if (cleanText.includes('work') || cleanText.includes('job') || cleanText.includes('fired') || cleanText.includes('performance')) {
      summary = "Systematic coordinator focused on performance optimization, process auditing, and self-directed professional development.";
      bullets = [
        "Rebounded from operational pivots by performing rigorous gap audits on personal skills and project outcomes.",
        "Cultivated mastery in technical and communication competencies, boosting productivity and workflow efficiency.",
        "Utilized attention metrics and feedback loops to drive personal performance goals."
      ];
    }

    return `### PROFESSIONAL SUMMARY\n${summary}\n\n### RECYCLED COMPETENCIES & EXPACTED SKILLS\n` + bullets.map(b => `- ${b}`).join('\n');
  }

  function getStatus() {
    return {
      isLoaded,
      backend: activeBackend,
      model: activeModel
    };
  }

  return {
    init,
    chat,
    complete,
    getStatus,
    probeBackends
  };
})();
