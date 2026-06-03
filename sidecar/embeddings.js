const chunkText = (text, maxWords = 100) => {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/);
    if (words.length === 0 || (words.length === 1 && words[0] === '')) continue;

    // If a single paragraph is longer than maxWords, split it up
    if (words.length > maxWords) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
        currentChunk = [];
        currentWordCount = 0;
      }
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      continue;
    }

    if (currentWordCount + words.length > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [para];
      currentWordCount = words.length;
    } else {
      currentChunk.push(para);
      currentWordCount += words.length;
    }
  }
  
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }
  return chunks;
};

// Requires fetch to be available (Node 18+)
const getEmbedding = async (text) => {
  try {
    const response = await fetch('http://localhost:1234/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        model: "nomic-embed-text-v1.5"
      })
    });
    
    if (!response.ok) {
      console.error(`[embeddings] Error fetching embedding: HTTP ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    if (data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding; // Array of floats
    }
    return null;
  } catch (error) {
    console.error(`[embeddings] Network error:`, error.message);
    return null;
  }
};

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = {
  chunkText,
  getEmbedding,
  cosineSimilarity
};
