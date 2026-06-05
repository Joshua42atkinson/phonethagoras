import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PhoneAI } from '../src/js/ai.js';
import PhoneState from '../src/js/state.js';

// Mock PhoneState
vi.mock('../src/js/state.js', () => {
  return {
    default: {
      load: () => ({
        zenMode: false,
        shape: { mind: 10, heart: 10, body: 10, act: 10 },
        face: null
      })
    }
  };
});

global.PhoneState = PhoneState;

// Mock WllamaEngine
const mockWllamaStatus = {
  memoryLoaded: false,
  logicLoaded: true,
  spokeLoaded: true
};

vi.mock('../src/js/wllama-engine.js', () => {
  return {
    WllamaEngine: {
      getStatus: () => mockWllamaStatus,
      chat: vi.fn().mockResolvedValue("Mock AI response"),
      chatSpoke: vi.fn().mockResolvedValue("Mock Spoke response")
    }
  };
});

// Mock PhoneRAG
const mockSearch = vi.fn().mockResolvedValue([
  { text: "Fact A" },
  { text: "Fact B" }
]);
const mockStoreFact = vi.fn().mockResolvedValue(true);

vi.mock('../src/js/rag-manager.js', () => {
  return {
    PhoneRAG: {
      search: mockSearch,
      storeFact: mockStoreFact,
      init: vi.fn().mockResolvedValue(true),
      isReady: () => true
    }
  };
});

describe('PhoneAI Engine Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWllamaStatus.memoryLoaded = false;
  });

  it('should run a chat session without RAG when memory is not loaded', async () => {
    PhoneAI.setActiveBackend('wllama');
    const response = await PhoneAI.chat("Hello there");
    
    expect(response.message.content).toBe("Mock AI response");
    expect(mockSearch).not.toHaveBeenCalled();
    expect(mockStoreFact).not.toHaveBeenCalled();
  });

  it('should run a chat session with RAG and store the fact when memory is loaded', async () => {
    mockWllamaStatus.memoryLoaded = true;
    PhoneAI.setActiveBackend('wllama');
    
    const response = await PhoneAI.chat("Hello there");
    
    expect(response.message.content).toBe("Mock AI response");
    expect(mockSearch).toHaveBeenCalledWith("Hello there", 3);
    
    // Allow promises in background tasks to settle
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockStoreFact).toHaveBeenCalled();
  });

  it('should inject RAG facts into Spoke chat prompts when memory is loaded', async () => {
    mockWllamaStatus.memoryLoaded = true;
    
    const response = await PhoneAI.chatSpoke("You are a helper", "What is code?");
    
    expect(response).toBe("Mock Spoke response");
    expect(mockSearch).toHaveBeenCalledWith("What is code?", 3);
  });
});
