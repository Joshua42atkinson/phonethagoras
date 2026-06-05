/**
 * VAULT — Phonethagoras Storage Abstraction
 * 
 * Supports two modes:
 * 1. Tauri Native FS (Obsidian-style Markdown Vault)
 * 2. Browser LocalStorage (Web fallback)
 */

const IS_TAURI = !!window.__TAURI__;

let fs = null;
let path = null;
let appDataDir = null;

export const Vault = (() => {
  let isInitialized = false;
  let vaultDir = null;

  async function init() {
    if (isInitialized) return;

    if (IS_TAURI) {
      // Import Tauri APIs dynamically so they don't break the web build
      const tauriFs = await import('@tauri-apps/plugin-fs');
      const tauriPath = await import('@tauri-apps/api/path');
      fs = tauriFs;
      path = tauriPath;

      appDataDir = await path.appDataDir();
      vaultDir = await path.join(appDataDir, 'Vault');
      
      // Ensure Vault directories exist
      await _ensureDir(vaultDir);
      await _ensureDir(await path.join(vaultDir, 'Quests'));
      await _ensureDir(await path.join(vaultDir, 'SITREPS'));
      
      console.log(`[Vault] Initialized Native FS at: ${vaultDir}`);
    } else {
      console.log('[Vault] Initialized in Web Mode (LocalStorage fallback)');
    }

    isInitialized = true;
  }

  async function _ensureDir(dirPath) {
    if (!IS_TAURI) return;
    try {
      const exists = await fs.exists(dirPath);
      if (!exists) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    } catch (err) {
      console.error(`[Vault] Failed to create directory ${dirPath}:`, err);
    }
  }

  /**
   * Save content to a file in the Vault.
   * @param {string} relativePath - Path relative to the Vault root (e.g. 'Character.md' or 'SITREPS/week1.md')
   * @param {string} content - String content to write
   */
  async function write(relativePath, content) {
    if (!isInitialized) await init();

    if (IS_TAURI) {
      const fullPath = await path.join(vaultDir, relativePath);
      await fs.writeTextFile(fullPath, content);
      console.log(`[Vault] Wrote file: ${fullPath}`);
    } else {
      localStorage.setItem(`vault_${relativePath}`, content);
      console.log(`[Vault] Saved to LocalStorage: vault_${relativePath}`);
    }
  }

  /**
   * Read content from a file in the Vault.
   * @param {string} relativePath 
   * @returns {string|null} - File content or null if not found
   */
  async function read(relativePath) {
    if (!isInitialized) await init();

    if (IS_TAURI) {
      const fullPath = await path.join(vaultDir, relativePath);
      try {
        if (await fs.exists(fullPath)) {
          return await fs.readTextFile(fullPath);
        }
        return null;
      } catch (err) {
        console.warn(`[Vault] Read failed for ${fullPath}:`, err);
        return null;
      }
    } else {
      return localStorage.getItem(`vault_${relativePath}`);
    }
  }

  /**
   * Delete a file in the Vault
   */
  async function remove(relativePath) {
    if (!isInitialized) await init();

    if (IS_TAURI) {
      const fullPath = await path.join(vaultDir, relativePath);
      if (await fs.exists(fullPath)) {
        await fs.removeFile(fullPath);
      }
    } else {
      localStorage.removeItem(`vault_${relativePath}`);
    }
  }

  /**
   * Get all filenames in a specific Vault directory
   * @param {string} relativeDir 
   * @returns {string[]} - Array of filenames
   */
  async function list(relativeDir) {
    if (!isInitialized) await init();

    if (IS_TAURI) {
      const fullPath = await path.join(vaultDir, relativeDir);
      try {
        if (await fs.exists(fullPath)) {
          const entries = await fs.readDir(fullPath);
          return entries.map(e => e.name);
        }
        return [];
      } catch (err) {
        console.warn(`[Vault] List failed for ${fullPath}:`, err);
        return [];
      }
    } else {
      // Simulate directory listing for localStorage
      const prefix = `vault_${relativeDir}/`;
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          // Extract just the filename
          keys.push(key.replace(prefix, ''));
        }
      }
      return keys;
    }
  }

  return {
    init,
    write,
    read,
    remove,
    list
  };
})();
