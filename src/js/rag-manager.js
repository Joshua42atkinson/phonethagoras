/**
 * RAG Manager
 * Handles local WebGPU embeddings (Nomic-Embed-Text) and IndexedDB Vector Storage.
 */

export const PhoneRAG = (() => {
  let embedPipeline = null;
  let isDownloading = false;
  let isReady = false;
  let db = null;

  const MODEL_ID = 'Xenova/nomic-embed-text-v1.5';
  const DB_NAME = 'PhoneRAG_DB';
  const STORE_NAME = 'vectors';

  async function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onupgradeneeded = (event) => {
        db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error("[RAG] IndexedDB error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async function init() {
    if (embedPipeline) return embedPipeline;
    isDownloading = true;

    try {
      await initDB();

      console.log("[RAG] Importing @huggingface/transformers (v3-alpha) for Nomic...");
      const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19');
      
      // Configure for WebGPU/WASM. Embeddings are very fast in WASM if WebGPU is busy.
      // We will try to use WebGPU but fallback to WASM seamlessly.
      env.backends.onnx.wasm.numThreads = 1;

      console.log(`[RAG] Loading model: ${MODEL_ID}...`);
      embedPipeline = await pipeline('feature-extraction', MODEL_ID, {
        dtype: 'q4'
      });
      
      isDownloading = false;
      isReady = true;
      console.log("[RAG] Engine is ready!");

      // Pre-seed the database with Armory Mini-Bibles if empty
      await seedArmoryData();

      return embedPipeline;
    } catch (e) {
      console.error("[RAG] Failed to initialize:", e);
      isDownloading = false;
      throw e;
    }
  }

  async function embed(text) {
    if (!isReady || !embedPipeline) throw new Error("RAG Engine not ready.");
    const output = await embedPipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async function storeFact(text, metadata = {}) {
    const vector = await embed(text);
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({ text, vector, metadata, timestamp: Date.now() });

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllFacts() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async function search(query, topK = 3) {
    const queryVector = await embed(query);
    const facts = await getAllFacts();

    const scoredFacts = facts.map(fact => ({
      ...fact,
      score: cosineSimilarity(queryVector, fact.vector)
    }));

    // Sort descending by score
    scoredFacts.sort((a, b) => b.score - a.score);
    return scoredFacts.slice(0, topK);
  }

  // Seed the Model Armory details so the AI knows its own capabilities
  async function seedArmoryData() {
    const facts = await getAllFacts();
    if (facts.length > 0) return; // Already seeded

    console.log("[RAG] Seeding Armory Mini-Bibles into Vector DB...");
    const bibles = [
      "SYSTEM CAPABILITY: The current orchestrator is Llama-3.2-1B, which handles logic, casework, and general conversation. It runs strictly on WebGPU.",
      "SYSTEM CAPABILITY: For offline multimodal vision, the app uses Florence-2-base, an extremely efficient 230MB vision model running in WebGPU. It can describe images the user attaches.",
      "SYSTEM CAPABILITY: The memory system relies on Nomic Embed Text v1.5 to vectorize text and store it in an IndexedDB vector database locally on the user's phone.",
      "ARMORY: DeepSeek Janus-Pro-1B is an extremely powerful multimodal vision model, but it is heavy (1GB+). It requires a dedicated 'Swap-to-Play' harness page to run safely on mobile without crashing the browser.",
      "ARMORY: Liquid LFM-1B is an experimental non-transformer logic engine available in the Armory. It requires swapping out the main Llama brain to run.",
      "ARMORY: Nemotron-3.5-ASR is a high-accuracy streaming audio transcription model. It is heavier than the native Web Speech API and requires a dedicated harness to run."
    ];

    for (const text of bibles) {
      await storeFact(text, { type: 'system_manual' });
    }
    console.log("[RAG] Armory Seeding Complete.");
  }

  return {
    init,
    embed,
    storeFact,
    search,
    isReady: () => isReady
  };
})();
