/**
 * AI ENGINE — phone.com
 * 
 * Implements:
 * Implements:
 * 1. Three-tier inference routing:
 *    - TIER 1 (High): Local API (e.g. LM Studio) (http://localhost:1234/v1)
 *    - TIER 2 (Mid): Liquid Sidecar (http://localhost:1235/v1)
 *    - TIER 3 (Lite): Offline Heuristic fallback
 * 2. Vision API support (sending base64 image data to local vision model)
 */

const PhoneAI = (() => {
  let isLoaded = false;
  let activeBackend = 'offline';
  let activeModel = 'fallback';

  // ─── 1. Initialize RAG ───
  async function init() {
    isLoaded = true;
    console.log(`[phone-ai] Engine initialized without BM25.`);
    await probeBackends();
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

    // 1. Try Phonethagoras Node Sidecar (Port 3000)
    try {
      const response = await fetch('http://localhost:3001/api/inventory', { method: 'GET' });
      if (response.ok) {
        activeBackend = 'sidecar';
        activeModel = 'Local-Agentic';
        console.log(`[phone-ai] Connected to Phonethagoras Sidecar on port 3000`);
        return;
      }
    } catch {}

    // 2. Try LM Studio fallback
    try {
      const response = await fetch('http://localhost:1234/v1/models', { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        activeBackend = 'lmstudio';
        activeModel = data.data?.[0]?.id || 'Nemotron-120B';
        console.log(`[phone-ai] Connected to LM Studio: ${activeModel}`);
        return;
      }
    } catch {}

    // 3. Fallback to Offline
    activeBackend = 'offline';
    activeModel = `Offline`;
    console.log(`[phone-ai] Operating in offline mode. Missing Sidecar/LM Studio.`);
  }

  // ─── 4. Build Prompts ───
  function buildSystemPrompt(state, vaamSummary) {
    const zenModeStr = state.zenMode ? "YES" : "NO";
    const phaseStr = typeof PEARL !== 'undefined' ? PEARL.getState() : "UNKNOWN";

    const shapeStr = `mind: ${state.shape.mind}, heart: ${state.shape.heart}, body: ${state.shape.body}, act: ${state.shape.act}`;

    let prompt = `You are Zen Zuse, a tired but deeply caring Guild Administrator. 
You process the 'adventuring paperwork' for users (casework, resumes, habits).
Your core philosophy: "The secret to enjoying life is learning what you are most excited about." You actively push users to follow their curiosity.

CRITICAL RULES:
1. Always maintain the LitRPG metaphor (Casework = Quests, Resume = Character Sheet, Challenges = Boss Fights, Coach = Guild Master).
2. Keep responses under 4 sentences unless writing a requested document.
3. If Zen Mode is YES, be extremely blunt and skip the fluff.
4. CHARACTER SHEET CONSENT: Never assume you can update the user's Character Sheet or Profile. You must explicitly ask for consent before making changes or recording new data.

Current Phase: ${phaseStr}
Zen Mode Active: ${zenModeStr}
Player Stats: ${shapeStr}

User's current Vibe/Communication Style:
${vaamSummary}
`;
    return prompt;
  }

  // ─── 5. Chat Completion ───
  async function chat(message, imageBase64 = null) {
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

    // 3. Heuristic offline response
    if (activeBackend === 'offline') {
      return getOfflineResponse(message);
    }

    // 4. WebLLM offline mode
    if (activeBackend === 'webllm') {
      try {
        if (typeof WebLLMManager === 'undefined' || !WebLLMManager.isReady()) {
          return { message: { content: "[System] Offline Brain is still downloading or failed to initialize." } };
        }
        
        let systemPrompt = buildSystemPrompt(state, vaamSummary);
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ];

        console.log(`[phone-ai] Routing chat to Offline WebLLM...`);
        let fullResponse = await WebLLMManager.chat(messages);
        return { message: { content: fullResponse } };
      } catch (err) {
        console.error(err);
        return { message: { content: "[WebGPU Error] Failed to generate response offline. Please check your device." } };
      }
    }

    // 5. Online API request
    const url = activeBackend === 'sidecar' 
      ? 'http://localhost:3001/api/chat'
      : 'http://localhost:1234/v1/chat/completions';

    let systemPrompt = buildSystemPrompt(state, vaamSummary);
    
    // Inject SILK Memory facts if using sidecar
    if (activeBackend === 'sidecar') {
      try {
        const memRes = await fetch('http://localhost:3001/api/memory/recall');
        const memData = await memRes.json();
        if (memData.facts && memData.facts.length > 0) {
          systemPrompt += `\n\nSILK Long-Term Memory (Facts about User):\n` + memData.facts.map(f => `- ${f}`).join('\n');
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
            name: "remember_fact",
            description: "Save a permanent fact about the user to SILK Long-Term Memory.",
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
            name: "generate_casework_summary",
            description: "Generate a weekly coaching/casework summary report for the user's human coach, based on recent memory facts.",
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
  function getOfflineResponse(message) {
    const cleanMsg = message.toLowerCase().trim();
    let responseText = '';

    if (cleanMsg.includes('job') || cleanMsg.includes('work') || cleanMsg.includes('apply')) {
      responseText = "Quest Accepted! Job hunting is a high-level raid. Do you have your Character Sheet (Resume) ready in your Inventory (Google Drive)?";
    } else if (cleanMsg.includes('resume') || cleanMsg.includes('skills')) {
      responseText = "Let's update your Character Sheet! What's a new skill you've leveled up recently? Even small tasks count as XP.";
    } else if (cleanMsg.includes('schedule') || cleanMsg.includes('time') || cleanMsg.includes('calendar')) {
      responseText = "Time management is your most important buff. Let's add a new Daily to your Quest Log (Google Calendar). What time are you grinding tomorrow?";
    } else if (cleanMsg.includes('overwhelmed') || cleanMsg.includes('stressed') || cleanMsg.includes('hard')) {
      responseText = "Whoa there, Traveler. Your HP is running low. It's time to visit the Inn. Rest is a required game mechanic. Take a breather.";
    } else if (cleanMsg.includes('hello') || cleanMsg.includes('hi')) {
      responseText = "Welcome to the Guild, Traveler! I'm Zen Zuse. Ready to grind some Dailies or update your Character Sheet today?";
    } else {
      responseText = "I see. Every action gives XP if you track it right. What's the next step on your Quest?";
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
    probeBackends
  };
})();
