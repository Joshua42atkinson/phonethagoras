/**
 * Wllama GGUF Inference Engine
 *
 * Unified browser-side inference via llama.cpp → WASM (wllama).
 * Manages two independent Wllama instances:
 *   1. Logic  — LiquidAI LFM-2.5-350M (Q4_K_M) for chat / text generation
 *   2. Memory — Nomic Embed Text v1.5 (Q4_K_M) for vector embeddings
 *
 * All models are downloaded from HuggingFace and cached in browser
 * Cache Storage automatically by wllama's `loadModelFromHF`.
 *
 * @module wllama-engine
 */

// ---------------------------------------------------------------------------
// CDN paths — pinned to @wllama/wllama v3.2.  The v3.1+ single-build
// architecture means we only need the unified wllama.wasm.
// ---------------------------------------------------------------------------
const WLLAMA_CDN_BASE = 'https://cdn.jsdelivr.net/npm/@wllama/wllama@3.2.3';

const WLLAMA_CONFIG_PATHS = {
  'single-thread/wllama.js':         `${WLLAMA_CDN_BASE}/esm/single-thread/wllama.js`,
  'single-thread/wllama.wasm':       `${WLLAMA_CDN_BASE}/esm/single-thread/wllama.wasm`,
  'multi-thread/wllama.js':          `${WLLAMA_CDN_BASE}/esm/multi-thread/wllama.js`,
  'multi-thread/wllama.wasm':        `${WLLAMA_CDN_BASE}/esm/multi-thread/wllama.wasm`,
  'multi-thread/wllama.worker.mjs':  `${WLLAMA_CDN_BASE}/esm/multi-thread/wllama.worker.mjs`,
};

// ---------------------------------------------------------------------------
// HuggingFace model repos + filenames — from official LiquidAI docs
// ---------------------------------------------------------------------------
const LOGIC_MODEL = Object.freeze({
  repo: 'LiquidAI/LFM2.5-350M-GGUF',
  file: 'LFM2.5-350M-Q4_K_M.gguf',
  sizeMB: 219,
  label: 'LFM2.5-350M-Q4',
  contextWindow: 32768,   // official: 32K tokens
  params: '350M dense',
});

// 1.2B Instruct — Dense model fits in <1GB VRAM for phones
const SPOKE_MODEL = Object.freeze({
  repo: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
  file: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
  sizeMB: 850,
  label: 'LFM2.5-1.2B-Instruct-Q4',
  contextWindow: 32768,   // official: 32K tokens
  params: '1.2B dense',
});

// ── The Four Horsemen: Spoke Model Registry ──────────────────────────
const SPOKE_MODELS = Object.freeze({
  professor: {
    repo: 'LiquidAI/LFM2.5-1.2B-Instruct-GGUF',
    file: 'LFM2.5-1.2B-Instruct-Q4_K_M.gguf',
    sizeMB: 698,
    label: 'The Scholar (1.2B Instruct)',
    contextWindow: 32768,
    persona: 'professor',
  },
  scout: {
    repo: 'LiquidAI/LFM2.5-1.2B-Thinking-GGUF',
    file: 'LFM2.5-1.2B-Thinking-Q4_K_M.gguf',
    sizeMB: 698,
    label: 'The Ranger (1.2B Thinking)',
    contextWindow: 32768,
    persona: 'scout',
  },
  nurse: {
    repo: 'prithivMLmods/Llama-Doctor-3.2-3B-Instruct-GGUF',
    file: 'Llama-Doctor-3.2-3B-Instruct.Q4_K_M.gguf',
    sizeMB: 1880,
    label: 'The Healer (Doctor 3B)',
    contextWindow: 8192,
    persona: 'nurse',
  },
  storyteller: {
    repo: 'mradermacher/Story-writer-3B-i1-GGUF',
    file: 'Story-writer-3B.i1-Q4_K_M.gguf',
    sizeMB: 1880,
    label: 'The Lorekeeper (Story-writer 3B)',
    contextWindow: 8192,
    persona: 'storyteller',
  },
});

const MEMORY_MODEL = Object.freeze({
  repo: 'nomic-ai/nomic-embed-text-v1.5-GGUF',
  file: 'nomic-embed-text-v1.5.Q4_K_M.gguf',
  sizeMB: 80,
  label: 'Nomic-Embed-v1.5-Q4',
  contextWindow: 8192,
});

// ---------------------------------------------------------------------------
// Lazy-load the Wllama class once from the CDN ESM bundle
// ---------------------------------------------------------------------------
let _WllamaClass = null;

async function getWllamaClass() {
  if (_WllamaClass) return _WllamaClass;
  try {
    const mod = await import(`${WLLAMA_CDN_BASE}/esm/index.js`);
    _WllamaClass = mod.Wllama;
    if (!_WllamaClass) {
      throw new Error('Wllama export not found in ESM bundle');
    }
    console.log('[WllamaEngine] Wllama class loaded from CDN');
    return _WllamaClass;
  } catch (err) {
    console.error('[WllamaEngine] Failed to import Wllama from CDN:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// WllamaEngine  singleton
// ---------------------------------------------------------------------------
export const WllamaEngine = (() => {
  /** @type {import('@wllama/wllama').Wllama | null} */
  let logicModel = null;
  /** @type {import('@wllama/wllama').Wllama | null} */
  let memoryModel = null;
  /** @type {import('@wllama/wllama').Wllama | null} */
  let spokeModel = null;

  let isLogicLoaded = false;
  let isMemoryLoaded = false;
  let isSpokeLoaded = false;
  let loadingLogic = false;
  let loadingMemory = false;
  let loadingSpoke = false;
  let activeSpokeConfig = null;  // tracks which Horseman model is loaded
  let lastError = null;

  // ── Load Logic Model ────────────────────────────────────────────────
  /**
   * Download (or retrieve from cache) and initialise the Logic model.
   * @param {(progress: {loaded: number, total: number, pct: number}) => void} [onProgress]
   * @returns {Promise<void>}
   */
  async function loadLogic(onProgress) {
    if (isLogicLoaded || loadingLogic) return;
    loadingLogic = true;
    lastError = null;

    try {
      const Wllama = await getWllamaClass();
      logicModel = new Wllama(WLLAMA_CONFIG_PATHS);

      await logicModel.loadModelFromHF(
        LOGIC_MODEL.repo,
        LOGIC_MODEL.file,
        {
          n_ctx: LOGIC_MODEL.contextWindow,  // 32768 for 350M
          n_threads: Math.min(navigator.hardwareConcurrency || 2, 4),
          progressCallback: ({ loaded, total }) => {
            if (onProgress) {
              const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
              onProgress({ loaded, total, pct });
            }
          },
        },
      );

      isLogicLoaded = true;
      loadingLogic = false;
      console.log(`[WllamaEngine] Logic model loaded: ${LOGIC_MODEL.label}`);
      _dispatchStatus();
    } catch (err) {
      loadingLogic = false;
      lastError = err;
      console.error('[WllamaEngine] Failed to load logic model:', err);
      _dispatchStatus();
      throw err;
    }
  }

  // ── Unload Logic Model ──────────────────────────────────────────────
  async function unloadLogic() {
    if (!logicModel) return;
    try {
      await logicModel.exit();
    } catch { /* worker may already be dead */ }
    logicModel = null;
    isLogicLoaded = false;
    loadingLogic = false;
    console.log('[WllamaEngine] Logic model unloaded');
    _dispatchStatus();
  }

  // ── Load Spoke Model ────────────────────────────────────────────────
  /**
   * Download (or retrieve from cache) and initialise a Spoke model.
   * @param {(progress: {loaded: number, total: number, pct: number}) => void} [onProgress]
   * @param {Object} [modelConfig] - Optional custom model config. Defaults to SPOKE_MODEL.
   */
  async function loadSpoke(onProgress, modelConfig = null) {
    if (isSpokeLoaded || loadingSpoke) return;
    loadingSpoke = true;
    lastError = null;

    const config = modelConfig || SPOKE_MODEL;

    try {
      const Wllama = await getWllamaClass();
      spokeModel = new Wllama(WLLAMA_CONFIG_PATHS);

      await spokeModel.loadModelFromHF(
        config.repo,
        config.file,
        {
          n_ctx: config.contextWindow,
          n_threads: Math.min(navigator.hardwareConcurrency || 2, 4),
          progressCallback: ({ loaded, total }) => {
            if (onProgress) {
              const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
              onProgress({ loaded, total, pct });
            }
          },
        },
      );

      isSpokeLoaded = true;
      loadingSpoke = false;
      activeSpokeConfig = config;
      console.log(`[WllamaEngine] Spoke model loaded: ${config.label}`);
      _dispatchStatus();
    } catch (err) {
      loadingSpoke = false;
      lastError = err;
      console.error('[WllamaEngine] Failed to load spoke model:', err);
      _dispatchStatus();
      throw err;
    }
  }

  /**
   * Load a spoke model by Horseman name: 'professor', 'scout', 'nurse', 'storyteller'
   * @param {string} name
   * @param {(progress: {loaded: number, total: number, pct: number}) => void} [onProgress]
   */
  async function loadSpokeByName(name, onProgress) {
    const config = SPOKE_MODELS[name];
    if (!config) throw new Error(`[WllamaEngine] Unknown spoke: '${name}'. Valid: ${Object.keys(SPOKE_MODELS).join(', ')}`);

    // If a different spoke is already loaded, unload it first
    if (isSpokeLoaded && activeSpokeConfig?.persona !== name) {
      console.log(`[WllamaEngine] Swapping spoke: ${activeSpokeConfig?.label} → ${config.label}`);
      await unloadSpoke();
    }

    return loadSpoke(onProgress, config);
  }

  // ── Unload Spoke Model ──────────────────────────────────────────────
  async function unloadSpoke() {
    if (!spokeModel) return;
    try {
      await spokeModel.exit();
    } catch { /* worker may already be dead */ }
    spokeModel = null;
    isSpokeLoaded = false;
    loadingSpoke = false;
    activeSpokeConfig = null;
    console.log('[WllamaEngine] Spoke model unloaded');
    _dispatchStatus();
  }

  // ── Load Memory (Embedding) Model ───────────────────────────────────
  /**
   * @param {(progress: {loaded: number, total: number, pct: number}) => void} [onProgress]
   */
  async function loadMemory(onProgress) {
    if (isMemoryLoaded || loadingMemory) return;
    loadingMemory = true;
    lastError = null;

    try {
      const Wllama = await getWllamaClass();
      memoryModel = new Wllama(WLLAMA_CONFIG_PATHS);

      await memoryModel.loadModelFromHF(
        MEMORY_MODEL.repo,
        MEMORY_MODEL.file,
        {
          n_ctx: 2048,
          n_threads: Math.min(navigator.hardwareConcurrency || 2, 4),
          embeddings: true,
          progressCallback: ({ loaded, total }) => {
            if (onProgress) {
              const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
              onProgress({ loaded, total, pct });
            }
          },
        },
      );

      isMemoryLoaded = true;
      loadingMemory = false;
      console.log(`[WllamaEngine] Memory model loaded: ${MEMORY_MODEL.label}`);
      _dispatchStatus();
    } catch (err) {
      loadingMemory = false;
      lastError = err;
      console.error('[WllamaEngine] Failed to load memory model:', err);
      _dispatchStatus();
      throw err;
    }
  }

  // ── Unload Memory Model ─────────────────────────────────────────────
  async function unloadMemory() {
    if (!memoryModel) return;
    try {
      await memoryModel.exit();
    } catch { /* worker may already be dead */ }
    memoryModel = null;
    isMemoryLoaded = false;
    loadingMemory = false;
    console.log('[WllamaEngine] Memory model unloaded');
    _dispatchStatus();
  }

  // ── Chat Completion ─────────────────────────────────────────────────
  /**
   * Run a chat completion against the Logic model.
   *
   * @param {Array<{role: string, content: string}>} messages
   * @param {{max_tokens?: number, temperature?: number, onChunk?: (text: string) => void}} [options]
   * @returns {Promise<string>} The assistant's response text.
   */
  async function chat(messages, options = {}) {
    if (!isLogicLoaded || !logicModel) {
      throw new Error('[WllamaEngine] Logic model is not loaded.');
    }

    // Official LFM2.5 inference parameters (from docs.liquid.ai):
    //   temp=0.1, top_k=50, min_p=0.15, repeat_penalty=1.05
    const {
      max_tokens = 512,
      temperature = 0.1,      // deterministic — good for extraction/tool-use
      top_k = 50,
      min_p = 0.15,
      repeat_penalty = 1.05,
      onChunk = null,
    } = options;

    try {
      // Try the OpenAI-compatible createChatCompletion first (v3+)
      if (typeof logicModel.createChatCompletion === 'function') {
        const response = await logicModel.createChatCompletion({
          messages,
          max_tokens,
          temperature,
          // Note: wllama may not support all params; they're passed through
          // to the underlying llama.cpp sampler if the version supports it.
        });

        const content = response?.choices?.[0]?.message?.content ?? '';
        if (onChunk && content) onChunk(content);
        return content;
      }

      // Fallback: manually format the prompt and use createCompletion
      const prompt = _formatChatPrompt(messages);
      const result = await logicModel.createCompletion(prompt, {
        nPredict: max_tokens,
        temperature,
        repeatPenalty: repeat_penalty,
      });

      if (onChunk && result) onChunk(result);
      return result ?? '';
    } catch (err) {
      console.error('[WllamaEngine] Chat error:', err);
      throw err;
    }
  }

  // ── Chat Completion (Spoke) ─────────────────────────────────────────
  async function chatSpoke(messages, options = {}) {
    if (!isSpokeLoaded || !spokeModel) {
      throw new Error('[WllamaEngine] Spoke model is not loaded.');
    }

    const {
      max_tokens = 512,
      temperature = 0.1,
      top_k = 50,
      min_p = 0.15,
      repeat_penalty = 1.05,
      onChunk = null,
    } = options;

    try {
      if (typeof spokeModel.createChatCompletion === 'function') {
        const response = await spokeModel.createChatCompletion({
          messages,
          max_tokens,
          temperature,
        });

        const content = response?.choices?.[0]?.message?.content ?? '';
        if (onChunk && content) onChunk(content);
        return content;
      }

      const prompt = _formatChatPrompt(messages);
      const result = await spokeModel.createCompletion(prompt, {
        nPredict: max_tokens,
        temperature,
        repeatPenalty: repeat_penalty,
      });

      if (onChunk && result) onChunk(result);
      return result ?? '';
    } catch (err) {
      console.error('[WllamaEngine] Spoke Chat error:', err);
      throw err;
    }
  }

  // ── Embeddings ──────────────────────────────────────────────────────
  /**
   * Generate a vector embedding for the given text.
   *
   * Nomic Embed v1.5 expects task-prefixed input:
   *   • "search_query: <text>"   for queries
   *   • "search_document: <text>" for corpus documents
   *
   * @param {string} text  - Raw text (prefix will be added automatically).
   * @param {'query' | 'document'} [type='query']
   * @returns {Promise<number[]>}
   */
  async function embed(text, type = 'query') {
    if (!isMemoryLoaded || !memoryModel) {
      throw new Error('[WllamaEngine] Memory model is not loaded.');
    }

    const prefix = type === 'document' ? 'search_document: ' : 'search_query: ';
    const prefixedText = `${prefix}${text}`;

    try {
      const vec = await memoryModel.createEmbedding(prefixedText);
      // wllama returns Float32Array or number[] depending on version
      return Array.isArray(vec) ? vec : Array.from(vec);
    } catch (err) {
      console.error('[WllamaEngine] Embedding error:', err);
      throw err;
    }
  }

  // ── Status ──────────────────────────────────────────────────────────
  /**
   * @returns {{
   *   logicLoaded: boolean,
   *   spokeLoaded: boolean,
   *   memoryLoaded: boolean,
   *   logicLoading: boolean,
   *   spokeLoading: boolean,
   *   memoryLoading: boolean,
   *   lastError: Error | null,
   *   logicLabel: string,
   *   spokeLabel: string,
   *   memoryLabel: string,
   *   logicSizeMB: number,
   *   spokeSizeMB: number,
   *   memorySizeMB: number,
   * }}
   */
  function getStatus() {
    return {
      logicLoaded: isLogicLoaded,
      spokeLoaded: isSpokeLoaded,
      memoryLoaded: isMemoryLoaded,
      logicLoading: loadingLogic,
      spokeLoading: loadingSpoke,
      memoryLoading: loadingMemory,
      lastError,
      logicLabel: LOGIC_MODEL.label,
      spokeLabel: SPOKE_MODEL.label,
      memoryLabel: MEMORY_MODEL.label,
      logicSizeMB: LOGIC_MODEL.sizeMB,
      spokeSizeMB: SPOKE_MODEL.sizeMB,
      memorySizeMB: MEMORY_MODEL.sizeMB,
    };
  }

  // ── Model metadata (for UI) ─────────────────────────────────────────
  function getModelInfo() {
    return {
      logic: { ...LOGIC_MODEL },
      spoke: activeSpokeConfig ? { ...activeSpokeConfig } : { ...SPOKE_MODEL },
      memory: { ...MEMORY_MODEL },
      spokeModels: { ...SPOKE_MODELS },
    };
  }

  // ── Internal helpers ────────────────────────────────────────────────

  /**
   * Format messages into LFM2.5's official ChatML prompt.
   * Per docs.liquid.ai/lfm/key-concepts/chat-template:
   *
   *   <|startoftext|><|im_start|>system\n...content...<|im_end|>\n
   *   <|im_start|>user\n...content...<|im_end|>\n
   *   <|im_start|>assistant\n
   *
   * Used as fallback when createChatCompletion is unavailable.
   */
  function _formatChatPrompt(messages) {
    let prompt = '<|startoftext|>';
    for (const msg of messages) {
      prompt += `<|im_start|>${msg.role}\n${msg.content}<|im_end|>\n`;
    }
    prompt += '<|im_start|>assistant\n';
    return prompt;
  }

  /**
   * Dispatch a CustomEvent on `document` so UI components can react to
   * engine state changes without polling.
   */
  function _dispatchStatus() {
    if (typeof document !== 'undefined') {
      document.dispatchEvent(
        new CustomEvent('wllama:status', { detail: getStatus() }),
      );
    }
  }

  // ── Public API ──────────────────────────────────────────────────────
  return Object.freeze({
    loadLogic,
    unloadLogic,
    loadSpoke,
    loadSpokeByName,
    unloadSpoke,
    loadMemory,
    unloadMemory,
    chat,
    chatSpoke,
    embed,
    getStatus,
    getModelInfo,
    SPOKE_MODELS,
  });
})();
