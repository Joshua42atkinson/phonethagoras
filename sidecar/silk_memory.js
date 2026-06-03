const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const INVENTORY_DIR = path.join(os.homedir(), 'Phonethagoras_Inventory');
if (!fs.existsSync(INVENTORY_DIR)) {
  fs.mkdirSync(INVENTORY_DIR, { recursive: true });
}

// Allow overriding DB path for tests (e.g., ':memory:')
const dbPath = process.env.TEST_DB ? process.env.TEST_DB : path.join(INVENTORY_DIR, 'silk_memory.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fact TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory_chunks (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    vector_json TEXT NOT NULL
  );
`);

const MemoryEngine = {
  // Save a new fact about the user
  rememberFact: (fact) => {
    try {
      const stmt = db.prepare('INSERT OR IGNORE INTO facts (fact) VALUES (?)');
      const info = stmt.run(fact);
      return { success: true, inserted: info.changes > 0 };
    } catch (err) {
      console.error('[SILK Memory] Error remembering fact:', err);
      return { success: false, error: err.message };
    }
  },

  // Retrieve all facts
  recallFacts: () => {
    try {
      const stmt = db.prepare('SELECT fact FROM facts ORDER BY created_at ASC');
      return stmt.all().map(row => row.fact);
    } catch (err) {
      console.error('[SILK Memory] Error recalling facts:', err);
      return [];
    }
  },

  // Log chat history
  logChat: (role, content) => {
    try {
      const stmt = db.prepare('INSERT INTO chat_history (role, content) VALUES (?, ?)');
      stmt.run(role, content);
    } catch (err) {
      console.error('[SILK Memory] Error logging chat:', err);
    }
  },

  // Get recent chat history
  getChatHistory: (limit = 20) => {
    try {
      const stmt = db.prepare('SELECT role, content FROM chat_history ORDER BY id DESC LIMIT ?');
      return stmt.all().reverse();
    } catch (err) {
      console.error('[SILK Memory] Error getting chat history:', err);
      return [];
    }
  },

  // RAG Methods
  insertChunk: (id, filename, chunkIndex, textContent, vectorJson) => {
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO inventory_chunks (id, filename, chunk_index, text_content, vector_json) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, filename, chunkIndex, textContent, vectorJson);
      return true;
    } catch (err) {
      console.error('[SILK Memory] Error inserting chunk:', err);
      return false;
    }
  },

  getAllChunks: () => {
    try {
      const stmt = db.prepare('SELECT * FROM inventory_chunks');
      return stmt.all();
    } catch (err) {
      console.error('[SILK Memory] Error getting chunks:', err);
      return [];
    }
  },

  clearChunks: () => {
    try {
      db.exec('DELETE FROM inventory_chunks');
      return true;
    } catch (err) {
      return false;
    }
  }
};

module.exports = MemoryEngine;
