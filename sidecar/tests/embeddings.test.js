const test = require('node:test');
const assert = require('node:assert');
const Embeddings = require('../embeddings');

test('Cosine Similarity - Exact Match', (t) => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const score = Embeddings.cosineSimilarity(vecA, vecB);
  assert.strictEqual(score, 1, 'Exact vectors should have similarity of 1');
});

test('Cosine Similarity - Orthogonal', (t) => {
  const vecA = [1, 0, 0];
  const vecB = [0, 1, 0];
  const score = Embeddings.cosineSimilarity(vecA, vecB);
  assert.strictEqual(score, 0, 'Orthogonal vectors should have similarity of 0');
});

test('Cosine Similarity - Opposite', (t) => {
  const vecA = [1, 0];
  const vecB = [-1, 0];
  const score = Embeddings.cosineSimilarity(vecA, vecB);
  assert.strictEqual(score, -1, 'Opposite vectors should have similarity of -1');
});

test('Chunk Text - Short Text', (t) => {
  const text = "Hello world";
  const chunks = Embeddings.chunkText(text, 10);
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0], "Hello world");
});

test('Chunk Text - Long Text', (t) => {
  const words = Array(30).fill('word').join(' ');
  const chunks = Embeddings.chunkText(words, 10);
  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0].split(' ').length, 10);
});
