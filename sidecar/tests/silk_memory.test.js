process.env.TEST_DB = ':memory:';

const test = require('node:test');
const assert = require('node:assert');
const MemoryEngine = require('../silk_memory');

test('SILK Memory - Insert and Recall Facts', (t) => {
  MemoryEngine.rememberFact("Test fact 1");
  MemoryEngine.rememberFact("Test fact 2");
  
  const facts = MemoryEngine.recallFacts();
  assert.strictEqual(facts.length >= 2, true);
  assert.strictEqual(facts.includes("Test fact 1"), true);
  assert.strictEqual(facts.includes("Test fact 2"), true);
});

test('SILK Memory - Insert and Get Chunks', (t) => {
  MemoryEngine.clearChunks();
  MemoryEngine.insertChunk('chunk_1', 'test.md', 0, 'hello world', '[0.1, 0.2]');
  
  const chunks = MemoryEngine.getAllChunks();
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0].id, 'chunk_1');
  assert.strictEqual(chunks[0].filename, 'test.md');
  assert.strictEqual(chunks[0].text_content, 'hello world');
});
