/**
 * RAG Manager
 * Handles IndexedDB Vector Storage and queries using WllamaEngine's Nomic embeddings.
 */

export const PhoneRAG = (() => {
  let isReady = false;
  let db = null;

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
    if (isReady) return;
    try {
      await initDB();
      isReady = true;
      console.log("[RAG] Unified Local Vector DB Initialized.");
    } catch (e) {
      console.error("[RAG] Failed to initialize RAG database:", e);
      throw e;
    }
  }

  async function embed(text) {
    const { WllamaEngine } = await import('./wllama-engine.js');
    if (!WllamaEngine.getStatus().memoryLoaded) {
      throw new Error("Memory (Nomic Embed) model is not loaded in Systems.");
    }
    return await WllamaEngine.embed(text, 'query');
  }

  async function storeFact(text, metadata = {}) {
    if (!isReady) await init();

    const { WllamaEngine } = await import('./wllama-engine.js');
    if (!WllamaEngine.getStatus().memoryLoaded) {
      throw new Error("Memory (Nomic Embed) model is not loaded in Systems.");
    }

    const vector = await WllamaEngine.embed(text, 'document');
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add({ text, vector, metadata, timestamp: Date.now() });

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllFacts() {
    if (!isReady) await init();
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
    if (!isReady) await init();

    // Ensure database is seeded with Armory data first
    await ensureSeeded();

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
  async function ensureSeeded() {
    const facts = await getAllFacts();
    if (facts.length > 0) return; // Already seeded

    console.log("[RAG] Seeding Armory Mini-Bibles into Vector DB...");
    const bibles = [
      "SYSTEM CAPABILITY: The current orchestrator is Liquid LFM-2.5-350M, which handles logic, casework, and general conversation. It runs locally.",
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
