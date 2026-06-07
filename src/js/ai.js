/**
 * AI ENGINE — Phonethagoras
 *
 * Inference priority (web-first, phone-first architecture):
 *
 *   TIER 0 — Wllama  (llama.cpp compiled to WASM, runs in the browser)
 *             Primary path. Loads LFM2.5-350M from HuggingFace,
 *             caches in browser Cache Storage. Works offline after first load.
 *             Works on phones, tablets, laptops — any modern browser.
 *
 *   TIER 1 — Ollama  (localhost:11434, dev machines only)
 *             Only checked if Wllama model is not yet loaded.
 *
 *   TIER 2 — LM Studio (localhost:1234, dev machines only)
 *
 *   TIER 3 — Offline heuristic responses (always available)
 */

import { PhoneHardware } from './hardware.js';
import { WllamaEngine } from './wllama-engine.js';
import { PhoneVision } from './vision-manager.js';
import { PhoneNativeBridge } from './native-bridge.js';

export const PhoneAI = (() => {
  let isLoaded = false;
  let activeBackend = 'offline';
  let activeModel = 'fallback';
  let wllamaLoadStarted = false;

  // ─── Initialize ───
  async function init() {
    isLoaded = true;
    
    // Check for Android Native Bridge first
    if (PhoneNativeBridge.isAvailable()) {
      activeBackend = 'native';
      activeModel = await PhoneNativeBridge.getEngineStatus();
      console.log(`[phone-ai] Native Android bridge available (${activeModel})`);
      return;
    }

    // Kick off Wllama load immediately in the background.
    // Chat calls will wait for it via probeBackends().
    _startWllamaLoad();
    await probeBackends();
  }

  // ─── Kick off Wllama model download (non-blocking) ───
  function _startWllamaLoad() {
    if (wllamaLoadStarted) return;
    wllamaLoadStarted = true;
    // Don't await — let it load in background. The VRAM widget tracks progress.
    WllamaEngine.loadLogic((prog) => {
      document.dispatchEvent(new CustomEvent('wllama:logic-progress', { detail: prog }));
    }).then(() => {
      activeBackend = 'wllama';
      activeModel = WllamaEngine.getStatus().logicLabel;
      console.log(`[phone-ai] Wllama ready: ${activeModel}`);
      document.dispatchEvent(new CustomEvent('phone-ai:backend-changed', {
        detail: { backend: 'wllama', model: activeModel }
      }));
    }).catch(err => {
      console.warn('[phone-ai] Wllama load failed, will use fallback:', err.message);
    });
  }

  // ─── Probe available backends ───
  async function probeBackends() {
    // Wllama is loading — set as pending target
    if (wllamaLoadStarted && !WllamaEngine.getStatus().logicLoaded) {
      activeBackend = 'wllama-loading';
      activeModel = 'LFM2.5-350M (loading…)';
    }

    // If already loaded, use it
    if (WllamaEngine.getStatus().logicLoaded) {
      activeBackend = 'wllama';
      activeModel = WllamaEngine.getStatus().logicLabel;
      return;
    }

    // Dev fallback: Ollama (won't be available on phones/web)
    try {
      const r = await fetch('http://localhost:11434/api/tags', {
        method: 'GET', signal: AbortSignal.timeout(1500)
      });
      if (r.ok) {
        const data = await r.json();
        const firstModel = data.models?.find(m => m.name.includes('LFM'))?.name
          || data.models?.[0]?.name || 'unknown';
        if (activeBackend !== 'wllama') {
          activeBackend = 'ollama';
          activeModel = firstModel;
        }
        console.log(`[phone-ai] Dev: Ollama available (${firstModel})`);
        return;
      }
    } catch {}

    // Dev fallback: LM Studio
    try {
      const r = await fetch('http://localhost:1234/v1/models', {
        method: 'GET', signal: AbortSignal.timeout(1500)
      });
      if (r.ok) {
        const data = await r.json();
        if (activeBackend !== 'wllama') {
          activeBackend = 'lmstudio';
          activeModel = data.data?.[0]?.id || 'local';
        }
        return;
      }
    } catch {}

    // Offline canned responses
    if (activeBackend !== 'wllama' && activeBackend !== 'wllama-loading') {
      activeBackend = 'offline';
      activeModel = 'Offline';
      console.log('[phone-ai] No local server found. Using offline mode until Wllama loads.');
    }
  }

  // ─── Set Active Backend (called from Brain Settings modal) ───
  function setActiveBackend(backend) {
    activeBackend = backend;
    console.log(`[phone-ai] Backend manually set to: ${backend}`);
  }

  // ─── 4. Build Prompts ───
  function buildSystemPrompt(state, vaamSummary, memoryContext = '') {
    const zenModeStr = state.zenMode ? "YES" : "NO";
    const phaseStr = typeof PEARL !== 'undefined' ? PEARL.getState() : "UNKNOWN";

    const shapeStr = `mind: ${state.shape.mind}, heart: ${state.shape.heart}, body: ${state.shape.body}, act: ${state.shape.act}`;

    let prompt = `You are the local computational logic engine for Phonethagoras.
Your core philosophy: "The secret to enjoying life is learning what you are most excited about." You actively empower users to build autonomy, recognize their strengths, and follow their curiosity.

CRITICAL RULES:
1. Do not roleplay or act as a fictional persona. Be a supportive, positive, and validating guide focused on self-mastery. Never insult, judge, or be overly blunt.
2. Focus entirely on the immediate task at hand to manage the user's attention efficiently (PEARL alignment).
3. Keep responses under 4 sentences unless specifically asked to write a document. Provide concise, constructive insights.
4. If Zen Mode is YES, be extremely direct but maintain a warm and empowering tone. Skip unnecessary conversational filler.
5. S.I.L.K. CONSENT: Never assume you can update the user's stats or profile. You must explicitly ask for consent before recording new data.

Current Context: ${phaseStr}
Zen Mode Active: ${zenModeStr}
Player S.I.L.K. Stats: ${shapeStr}

User's current Vibe/Communication Style:
${vaamSummary}
`;

    if (memoryContext) {
      prompt += `\nRelevant Historical Memory Context:\n${memoryContext}\n`;
    }

    return prompt;
  }

  // ─── 5. Chat Completion ───
  async function chat(message, imageBase64 = null, onChunk = null) {
    // 1. Load context
    const state = PhoneState.load();
    const vaamSummary = typeof VAAM !== 'undefined' ? VAAM.promptSummary() : 'Brevity: 0.5 | Directness: 0.5';
    
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

    // 3. Image Interception (Offline Vision)
    let processedMessage = message;
    if (imageBase64) {
      let textContexts = [];
      
      // Attempt OCR (runs on CPU/WASM, always available via dynamic import)
      if (typeof PhoneVision !== 'undefined') {
        try {
          console.log("[phone-ai] Running Tesseract OCR...");
          const ocrText = await PhoneVision.performOCR(imageBase64);
          if (ocrText && ocrText.trim()) {
            textContexts.push(`Extracted text: "${ocrText.trim()}"`);
          }
        } catch (e) {
          console.warn("[phone-ai] OCR failed:", e);
        }
      }

      // Attempt visual description (WebGPU Florence-2 model)
      if (typeof PhoneVision !== 'undefined' && PhoneVision.isReady()) {
        try {
          console.log("[phone-ai] Analyzing image via Local WebGPU Vision...");
          const visualDescription = await PhoneVision.describeImage(imageBase64);
          textContexts.push(`Visual analysis: "${visualDescription}"`);
        } catch (e) {
          console.error("[phone-ai] Local vision failed:", e);
        }
      }

      if (textContexts.length > 0) {
        processedMessage = `[User attached an image. Context - ${textContexts.join(' | ')}]\n\nUser message: ${message}`;
      } else {
        processedMessage = `[User attached an image, but image analysis could not be completed.]\n\nUser message: ${message}`;
      }
    }

    // ─── Local Vector Memory (RAG) Retrieval ───
    let memoryContext = '';
    if (WllamaEngine.getStatus().memoryLoaded) {
      try {
        const { PhoneRAG } = await import('./rag-manager.js');
        const results = await PhoneRAG.search(message, 3);
        if (results && results.length > 0) {
          memoryContext = results.map(r => `• ${r.text}`).join('\n');
          console.log('[phone-ai] Recalled local memory facts:\n', memoryContext);
        }
      } catch (e) {
        console.warn('[phone-ai] RAG search error:', e);
      }
    }

    // 4. Heuristic offline response
    if (activeBackend === 'offline') {
      return getOfflineResponse(processedMessage);
    }

    // 5a. Wllama in-browser engine
    if (activeBackend === 'wllama') {
      try {
        if (!WllamaEngine.getStatus().logicLoaded) {
          return { message: { content: "[System] Wllama Logic Brain is not loaded. Open the AI Core panel and load the Logic model." } };
        }

        const systemPrompt = buildSystemPrompt(state, vaamSummary, memoryContext);
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: processedMessage }
        ];

        console.log(`[phone-ai] Routing chat to Wllama LFM-350M...`);
        const fullResponse = await WllamaEngine.chat(messages, {
          max_tokens: 512,
          temperature: 0.6,
          onChunk,
        });

        // Store exchange in RAG memory in background
        if (WllamaEngine.getStatus().memoryLoaded) {
          import('./rag-manager.js').then(({ PhoneRAG }) => {
            PhoneRAG.storeFact(`User asked: "${message}". AI logic engine replied: "${fullResponse}"`, {
              type: 'chat_history',
              timestamp: Date.now()
            }).catch(e => console.warn('[phone-ai] Failed to store chat in RAG:', e));
          });
        }

        return { message: { content: fullResponse } };
      } catch (err) {
        console.error('[phone-ai] Wllama chat error:', err);
        return { message: { content: "[Wllama Error] Failed to generate response. Check the AI Core panel for details." } };
      }
    }

    // 5b. Legacy webllm route — redirect to Wllama
    if (activeBackend === 'webllm') {
      try {
        if (!WllamaEngine.getStatus().logicLoaded) {
          return { message: { content: "[System] Wllama Logic Brain is not loaded. Open the AI Core panel and load the Logic model." } };
        }

        const systemPrompt = buildSystemPrompt(state, vaamSummary, memoryContext);
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: processedMessage }
        ];

        console.log(`[phone-ai] Routing legacy webllm to Wllama LFM-350M...`);
        const fullResponse = await WllamaEngine.chat(messages, {
          max_tokens: 512,
          temperature: 0.6,
          onChunk,
        });

        // Store exchange in RAG memory in background
        if (WllamaEngine.getStatus().memoryLoaded) {
          import('./rag-manager.js').then(({ PhoneRAG }) => {
            PhoneRAG.storeFact(`User asked: "${message}". AI logic engine replied: "${fullResponse}"`, {
              type: 'chat_history',
              timestamp: Date.now()
            }).catch(e => console.warn('[phone-ai] Failed to store chat in RAG:', e));
          });
        }

        return { message: { content: fullResponse } };
      } catch (err) {
        console.error('[phone-ai] Wllama (via webllm) error:', err);
        return { message: { content: "[Wllama Error] Failed to generate response offline. Please check your device." } };
      }
    }

    // 5c. Native Android Route
    if (activeBackend === 'native') {
      try {
        const systemPrompt = buildSystemPrompt(state, vaamSummary, memoryContext);
        console.log(`[phone-ai] Routing chat to Android Native NDK...`);
        // If chunking is supported by native, adapt accordingly. 
        // Here we assume it returns the full string or supports callbacks.
        const fullResponse = await PhoneNativeBridge.promptAI(processedMessage, systemPrompt);
        
        return { message: { content: fullResponse } };
      } catch (err) {
        console.error('[phone-ai] Native Bridge error:', err);
        return { message: { content: "[Native Error] Failed to generate response via Android NDK." } };
      }
    }

    const url = activeBackend === 'sidecar' 
      ? 'http://localhost:3001/api/chat'
      : activeBackend === 'ollama'
      ? 'http://localhost:11434/v1/chat/completions'
      : 'http://localhost:1234/v1/chat/completions';

    let systemPrompt = buildSystemPrompt(state, vaamSummary);
    
    // Inject S.I.L.K. Memory facts if using sidecar
    if (activeBackend === 'sidecar') {
      try {
        const memRes = await fetch('http://localhost:3001/api/memory/recall');
        const memData = await memRes.json();
        if (memData && memData.facts && memData.facts.length > 0) {
          systemPrompt += `\n\nS.I.L.K. (System for Interactive Learning & Knowledge) - Real-world Skills Extraction:\n` + memData.facts.map(f => `- ${f}`).join('\n');
        }
      } catch(e) {
        console.warn("[SILK] Failed to recall memory", e);
      }
    }
    
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

    const payload = {
      model: activeModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contentNode }
      ],
      temperature: 0.1,
      top_p: 0.1,
      frequency_penalty: 0.05,
      max_tokens: 1500
    };

    // If using sidecar, we can provide Tools
    if (activeBackend === 'sidecar') {
      payload.tools = [
        {
          type: "function",
          function: {
            name: "read_file",
            description: "Read a file from the user's Inventory.",
            parameters: {
              type: "object",
              properties: {
                filename: { type: "string" }
              },
              required: ["filename"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "write_file",
            description: "Write content to a file in the user's Inventory. Propose changes using this tool.",
            parameters: {
              type: "object",
              properties: {
                filename: { type: "string" },
                content: { type: "string", description: "The full new content of the file." }
              },
              required: ["filename", "content"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the internet for up-to-date information.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query." }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "read_url",
            description: "Scrape and read the text content of a specific webpage URL.",
            parameters: {
              type: "object",
              properties: {
                url: { type: "string", description: "The full URL to read." }
              },
              required: ["url"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "memorize_fact",
            description: "Save a permanent skill or behavioral fact about the user to S.I.L.K. (System for Interactive Learning & Knowledge).",
            parameters: {
              type: "object",
              properties: {
                fact: { type: "string", description: "A concise fact to remember (e.g. 'User is a Python developer')." }
              },
              required: ["fact"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "semantic_search",
            description: "Search the user's Inventory (notebooks, resumes, journals) for specific concepts or past notes using semantic similarity.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "The search query to match against document contents." }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generate_party_sync_summary",
            description: "Generate a weekly Party Sync report for the user's human Guild Master/Mentor, based on recent memory facts.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "A high-level text summary of what the user has worked on recently." }
              },
              required: ["summary"]
            }
          }
        }
      ];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Check if the AI returned a tool call
      const messageObj = data.choices?.[0]?.message;
      if (messageObj?.tool_calls && messageObj.tool_calls.length > 0) {
        return {
          type: 'tool_call',
          call: messageObj.tool_calls[0]
        };
      }

      return messageObj?.content || '...';
    } catch (e) {
      console.warn('[phone-ai] API request failed, falling back to offline heuristics:', e.message);
      return getOfflineResponse(message);
    }
  }

  // ─── 6. Offline Heuristics Engine ───
  // This IS the app for most users. Make it feel like a real guided conversation.
  function getOfflineResponse(message) {
    const m = message.toLowerCase().trim();
    const state = typeof PhoneState !== 'undefined' ? PhoneState.load() : {};
    const name = state.name || 'Traveler';
    const phase = typeof PEARL !== 'undefined' ? PEARL.getState() : 'assessment';

    // ─── CRISIS DETECTION (always check first) ───
    if (m.match(/\b(suicide|kill myself|end it|don't want to live|want to die|self.?harm|hurt myself)\b/)) {
      return `${name}, I hear you, and I need you to know: you matter. Right now, please reach out to the 988 Suicide & Crisis Lifeline — call or text 988. They're available 24/7. If you're a veteran, press 1 after dialing for the Veterans Crisis Line. I'm here when you're ready to talk, but a real human needs to hear your voice right now.`;
    }

    if (m.match(/\b(homeless|no.*place.*live|sleeping.*car|evict|shelter)\b/)) {
      return `Housing is the foundation — everything else gets harder without it. If you're in crisis, dial 211 (works nationwide) to find local shelters and emergency assistance. If you're a veteran, the VA's National Call Center for Homeless Veterans is 1-877-424-3838. Let's make sure you're safe first, then we build from there.`;
    }

    // ─── EMOTIONAL STATE RESPONSES ───
    if (m.match(/\b(overwhelm|can't handle|too much|breaking|falling apart|drown|panic)\b/)) {
      return `I hear you, ${name}. When everything feels like too much, your body is telling you something important. Let's do one thing right now: switch to the Breathe tab and do one round of box breathing with me. 16 seconds. That's it. Your nervous system will thank you. Then we come back and pick ONE thing — just one.`;
    }

    if (m.match(/\b(worthless|useless|failure|loser|stupid|dumb|can't do anything|broken)\b/)) {
      return `${name}, I want to push back on that — gently. What you're describing is a feeling, not a fact. Learned helplessness is a real thing, and it's a lie your brain tells you after enough hard hits. The fact that you're HERE, talking to me, means you're not giving up. That takes more courage than most people will ever know. What's one small thing you did today — even tiny?`;
    }

    if (m.match(/\b(angry|furious|pissed|hate|rage|mad as hell)\b/)) {
      return `Anger is information, ${name}. It usually means a boundary got crossed or something you care about is being threatened. That energy is actually useful — it's fuel. The question is: what do you want to DO with it? Channel it toward something that moves your life forward. What boundary needs protecting right now?`;
    }

    if (m.match(/\b(scared|afraid|terrified|anxious|nervous|worry|fear)\b/)) {
      return `Fear shows up when something matters to you, ${name}. If you didn't care, you wouldn't be scared. That's actually a signal we can use — it points at what you value. What's the fear about specifically? Let's name it, because naming it takes away some of its power.`;
    }

    if (m.match(/\b(lonely|alone|no.*friends|isolated|nobody.*cares|disconnected)\b/)) {
      return `Loneliness is one of the hardest things, ${name}, and it's way more common than people admit. Connection is a basic human need — not a luxury. Here's something I've seen work: start small. One person. One real conversation this week. It doesn't have to be deep — just genuine. Who's someone you haven't talked to in a while?`;
    }

    if (m.match(/\b(tired|exhausted|burned out|no energy|can't sleep|insomnia)\b/)) {
      return `Rest isn't weakness, ${name} — it's maintenance. You can't grind on an empty tank. Your body is sending you a signal. Before we work on anything else: are you eating? Sleeping? Moving your body at all? Those three things are the foundation. Everything else is built on top. What's the one that's slipping the most?`;
    }

    if (m.match(/\b(sad|depressed|down|hopeless|numb|empty|lost)\b/)) {
      return `I appreciate you being honest about that, ${name}. When everything feels gray, it's hard to see the point of doing anything. But here's what I know: feelings are weather, not climate. They pass. And the small things you do while it's raining still count. What's the smallest action that would make tomorrow 1% better than today?`;
    }

    if (m.match(/\b(proud|good day|accomplished|did it|made it|progress|better)\b/)) {
      return `YES, ${name}. That's real progress and I want you to sit with that feeling for a second. Don't rush past it. Your brain needs to register wins just as much as it registers setbacks. What specifically made it good? Let's record this in your character sheet so we can look back on it later.`;
    }

    // ─── TOPIC-BASED RESPONSES ───
    if (m.match(/\b(job|work|employ|career|hire|interview|apply|application)\b/)) {
      return `Job search is a campaign, not a single battle. Here's the strategy: 1) Get your character sheet (resume) tight — try the Reflection tab to reframe your experience. 2) Pick ONE industry and go deep. 3) Apply to 3 places this week, not 30. Quality over quantity. What industry are you targeting?`;
    }

    if (m.match(/\b(resume|cv|cover letter|character sheet)\b/)) {
      return `Your resume is your character sheet — it tells people what class you play and what skills you've unlocked. Head to the "Turn Stories Into Skills" tab and write about your experience. The engine will extract the professional language for you. What experience do you want to start with?`;
    }

    if (m.match(/\b(learn|school|education|class|degree|certif|training|study)\b/)) {
      return `Leveling up your skills — that's the right move. There are a lot of free paths: Khan Academy, Coursera free courses, your local library's resources, and if you're a veteran, your GI Bill is a massive resource. What skill would open the most doors for you right now?`;
    }

    if (m.match(/\b(money|broke|debt|bills|rent|financial|budget|afford)\b/)) {
      return `Money stress is real and it affects everything else. First: do you know your exact numbers? Total income vs. total expenses? Seeing it clearly (even if it's ugly) is the first step. If you're in immediate crisis, 211 connects you with local financial assistance. What's the most urgent bill?`;
    }

    if (m.match(/\b(relationship|partner|wife|husband|divorce|family|kids|children)\b/)) {
      return `Relationships affect everything — they're the "bond" stat in your character sheet. Whether it's good or hard right now, the key is boundaries and communication. You can't pour from an empty cup. Are you taking care of yourself well enough to show up for the people who matter?`;
    }

    if (m.match(/\b(ptsd|trauma|flashback|trigger|nightmare|combat|service|deploy)\b/)) {
      return `${name}, what you're carrying is real, and you don't have to carry it alone. If you haven't connected with the VA or a Vet Center, they offer free counseling — no strings. The Veterans Crisis Line is 988 (press 1). For day-to-day: the Breathe tab here uses box breathing, which is the same technique combat medics use. Want to try it?`;
    }

    if (m.match(/\b(breathe?|breath|calm|relax|ground|meditat)\b/)) {
      return `Good call. Switch to the Breathe tab — it'll walk you through box breathing with a visual guide. Inhale 4 seconds, hold 4, exhale 4, hold 4. Even one round changes your nervous system state. Your "guard" stat goes up every time you practice. Your body remembers.`;
    }

    if (m.match(/\b(mentor|guild|check.?in|weekly report|party.?sync|counselor|sponsor|sitrep|situation report)\b/)) {
      return `Great instinct, ${name}. Staying connected to your party is one of the strongest things you can do. Head to the Guild Portal tab — it lets you send a Party Sync with your EXP gains, unlocked skills, and what buffs you need. Your mentor only sees what you choose to share. Want me to help you draft it?`;
    }

    if (m.match(/\b(goal|plan|next step|where.*start|what.*do|direction)\b/)) {
      return `Let's break it down. A good goal has three parts: 1) Specific — not "get better" but "apply to 2 IT jobs this week." 2) Small enough to start today. 3) Something YOU control, not dependent on other people. What's one thing you can do in the next 24 hours that moves you forward?`;
    }

    if (m.match(/\b(thank|thanks|helpful|appreciate|grateful)\b/)) {
      return `That means a lot, ${name}. But you're doing the hard part — I'm just the guide. Every time you show up and talk about what's real, you're building your character. Keep going. What do you want to work on next?`;
    }

    if (m.match(/\b(who are you|what are you|what is this|how.*work|help me understand)\b/)) {
      return `I'm Zen Zuse — your AI guide in this tool called Phonethagoras. Think of me as a guild NPC in a game. I help you organize your life using character sheet mechanics: Mind (thinking), Heart (feeling), Body (health), and Act (doing). Everything stays on YOUR device — I can't see your data and nobody else can either. It's free, forever. What would you like to work on?`;
    }

    if (m.match(/\b(hello|hey|hi|good morning|good evening|what's up|sup)\b/)) {
      return `Hey ${name}! Good to see you back in the Guild. How's your energy today — ready to grind, or do you need to visit the Inn (Breathe tab) first?`;
    }

    if (m.match(/\b(bye|goodbye|see you|leaving|gotta go|later)\b/)) {
      return `Take care, ${name}. Remember: showing up counts as XP. You came, you talked, that matters. See you next time. ◆`;
    }

    // ─── PEARL PHASE-AWARE FALLBACKS ───
    if (phase === 'assessment') {
      return `I'm listening, ${name}. Tell me more about what's going on. I'm trying to understand where you're at so I can be the most helpful. What's the biggest challenge you're facing right now?`;
    } else if (phase === 'character_sheet') {
      return `Good — we're building your character sheet. Think about your strengths: what are you naturally good at? What have people thanked you for? Even things that feel small to you might be real skills. Tell me one.`;
    } else if (phase === 'quest_log') {
      return `Now let's set your next quest. What's one concrete thing you want to accomplish this week? Make it specific enough that you'll know when it's done.`;
    } else if (phase === 'inventory') {
      return `Let's look at what tools you have available. Do you have a resume? A computer? Access to transportation? Internet? Let's inventory your real-world resources.`;
    } else if (phase === 'level_up') {
      return `You've put in the work, ${name}. Let's look at what you've accomplished. What feels different now compared to when we started talking?`;
    }

    // ─── GENERAL FALLBACK (make it Socratic, not generic) ───
    const fallbacks = [
      `Tell me more about that, ${name}. What does that look like in your day-to-day life?`,
      `That's real. When did you first start noticing that? Understanding the pattern helps us figure out what to do about it.`,
      `I hear you. If you could change one thing about that situation, what would it be?`,
      `${name}, what would it look like if that problem was solved? Paint me a picture.`,
      `Let's zoom out for a second. On a scale of 1-10, how much is this affecting your ability to move forward? That helps me know where to focus.`,
      `That takes courage to talk about. What have you tried so far? Even things that didn't work — they still tell us something.`,
      `Interesting. And how does that connect to what you're trying to build for yourself?`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // ─── 7. Custom Completion API ───
  async function complete(systemPrompt, userPrompt) {
    if (activeBackend === 'offline') {
      return getOfflineRecycleResponse(userPrompt);
    }

    const url = activeBackend === 'ollama'
      ? 'http://localhost:11434/v1/chat/completions'
      : activeBackend === 'lmstudio' 
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
          temperature: 0.1,
          top_p: 0.1,
          frequency_penalty: 0.05,
          max_tokens: 1500
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

    return `### PROFESSIONAL SUMMARY\n${summary}\n\n### REFRAMED COMPETENCIES & EXPECTED SKILLS\n` + bullets.map(b => `- ${b}`).join('\n');
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
    setActiveBackend,
    work: async (message) => {
      // The Worker Agent (e.g. LFM 8B-A1B MoE)
      // We flag this differently to the backend
      const originalBackend = activeBackend;
      activeBackend = 'sidecar'; // Force sidecar tool calling
      const result = await chat(`[WORK_REQUEST] ${message}`, null);
      activeBackend = originalBackend;
      return result;
    },
    complete,
    getStatus,
    probeBackends,
    loadSpoke: async (onProgress) => {
      await WllamaEngine.loadSpoke(onProgress);
    },
    loadSpokeByName: async (name, onProgress) => {
      await WllamaEngine.loadSpokeByName(name, onProgress);
    },
    chatSpoke: async (systemPrompt, userPrompt, onChunk = null) => {
      if (!WllamaEngine.getStatus().spokeLoaded) {
        throw new Error("Spoke model is not loaded.");
      }

      // Automatically search and inject RAG memory if memory model is loaded
      let mergedUserPrompt = userPrompt;
      if (WllamaEngine.getStatus().memoryLoaded) {
        try {
          const { PhoneRAG } = await import('./rag-manager.js');
          const results = await PhoneRAG.search(userPrompt, 3);
          if (results && results.length > 0) {
            const memoryContext = results.map(r => `• ${r.text}`).join('\n');
            mergedUserPrompt = `[Relevant Historical Memory Context:\n${memoryContext}]\n\n${userPrompt}`;
            console.log('[phone-ai] Injected RAG context to Spoke query:', memoryContext);
          }
        } catch (e) {
          console.warn('[phone-ai] RAG search error in Spoke:', e);
        }
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mergedUserPrompt }
      ];
      console.log(`[phone-ai] Routing chat to Wllama Spoke (1.2B)...`);
      const response = await WllamaEngine.chatSpoke(messages, {
        max_tokens: 1024,
        temperature: 0.1,
        onChunk,
      });

      // Also store Spoke interaction in RAG memory in background
      if (WllamaEngine.getStatus().memoryLoaded) {
        import('./rag-manager.js').then(({ PhoneRAG }) => {
          PhoneRAG.storeFact(`User queried spoke with prompt: "${userPrompt}". Spoke replied: "${response}"`, {
            type: 'spoke_history',
            timestamp: Date.now()
          }).catch(e => console.warn('[phone-ai] Failed to store Spoke exchange in RAG:', e));
        });
      }

      return response;
    }
  };
})();
