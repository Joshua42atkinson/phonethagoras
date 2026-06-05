import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PhoneRAG } from '../src/js/rag-manager.js';

// Mock the WllamaEngine module
vi.mock('../src/js/wllama-engine.js', () => {
  return {
    WllamaEngine: {
      getStatus: () => ({ memoryLoaded: true }),
      embed: async (text, type) => {
        const size = 384;
        const arr = new Array(size).fill(0);
        
        // Simple bag-of-words hashing to simulate semantic overlap in tests
        const words = text.toLowerCase().split(/[^a-z0-9]+/);
        for (const word of words) {
          if (!word) continue;
          let hash = 0;
          for (let i = 0; i < word.length; i++) {
            hash = (hash * 31 + word.charCodeAt(i)) % size;
          }
          arr[hash] = 1.0;
        }
        return arr;
      }
    }
  };
});

describe('PhoneRAG Vector DB', () => {
  let mockStore = [];

  beforeEach(() => {
    mockStore = [];
    
    // In-memory IndexedDB mock tailored for PhoneRAG
    const mockDb = {
      objectStoreNames: {
        contains: (name) => name === 'vectors'
      },
      transaction: (stores, mode) => {
        return {
          objectStore: (storeName) => {
            return {
              add: (item) => {
                const id = mockStore.length + 1;
                const newItem = { ...item, id };
                mockStore.push(newItem);
                const req = {};
                setTimeout(() => {
                  req.result = id;
                  if (req.onsuccess) req.onsuccess();
                }, 0);
                return req;
              },
              getAll: () => {
                const req = {};
                setTimeout(() => {
                  req.result = [...mockStore];
                  if (req.onsuccess) {
                    req.onsuccess({ target: { result: [...mockStore] } });
                  }
                }, 0);
                return req;
              }
            };
          }
        };
      }
    };

    const mockIndexedDB = {
      open: (name, version) => {
        const req = {};
        setTimeout(() => {
          if (req.onsuccess) {
            req.onsuccess({ target: { result: mockDb } });
          }
        }, 0);
        return req;
      }
    };

    global.indexedDB = mockIndexedDB;
  });

  it('should initialize and store facts', async () => {
    await PhoneRAG.init();
    expect(PhoneRAG.isReady()).toBe(true);

    const factId = await PhoneRAG.storeFact("The quick brown fox jumps over the lazy dog.", { source: 'test' });
    expect(mockStore.length).toBe(1);
    expect(mockStore[0].text).toBe("The quick brown fox jumps over the lazy dog.");
    expect(mockStore[0].metadata.source).toBe('test');
    expect(mockStore[0].vector).toBeDefined();
  });

  it('should search stored facts by cosine similarity', async () => {
    await PhoneRAG.init();
    
    // Add some facts
    await PhoneRAG.storeFact("JavaScript programming is cool", { category: 'dev' });
    await PhoneRAG.storeFact("Cooking delicious food in the kitchen", { category: 'hobby' });

    // When we search, the database will auto-seed with Armory data first (because mockStore was empty at init/search)
    // Let's verify that search works and returns ranked results
    const results = await PhoneRAG.search("JavaScript coding", 2);
    expect(results).toBeDefined();
    expect(results.length).toBe(2);
    // The top result should be the JS programming fact because of the word "JavaScript" matching
    expect(results[0].text).toBe("JavaScript programming is cool");
  });
});
