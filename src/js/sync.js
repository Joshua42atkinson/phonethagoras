/**
 * GOOGLE DRIVE SYNC MODULE — phone.com (Zen Zuse)
 * 
 * Implements local-first scoped OAuth 2.0 (drive.file scope) mock sync.
 * All "cloud" operations are serialized and persisted into a secure sandbox
 * in localStorage, demonstrating true non-custodial synchronization.
 */

const PhoneSync = (() => {
  const DRIVE_STORAGE_KEY = 'zen_mock_drive_files';
  const AUTH_STORAGE_KEY = 'zen_google_auth_state';

  let syncBtn, syncRecycledBtn;

  // Initial mock drive state
  const defaultDriveFiles = {
    'book.json': null,
    'Phonethagoras - Recycled Skills.gdoc': null
  };

  function init() {
    syncBtn = document.getElementById('btn-drive-sync');
    syncRecycledBtn = document.getElementById('btn-drive-sync-recycled');

    if (syncBtn) {
      syncBtn.addEventListener('click', handleSettingsSyncClick);
      updateSettingsButtonState();
    }

    if (syncRecycledBtn) {
      // Override default recycle.js handler if it was bound
      syncRecycledBtn.removeEventListener('click', syncRecycledBtn._defaultHandler);
      syncRecycledBtn.addEventListener('click', handleRecycleSyncClick);
    }

    injectModalStyles();
  }

  // ─── OAuth Authentication State ───
  function getAuthState() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setAuthState(state) {
    if (state) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    updateSettingsButtonState();
    if (typeof PhoneDocs !== 'undefined') {
      PhoneDocs.renderSharedFolderList();
    }
  }

  function getDriveFiles() {
    try {
      const raw = localStorage.getItem(DRIVE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { ...defaultDriveFiles };
    } catch (e) {
      return { ...defaultDriveFiles };
    }
  }

  function saveDriveFiles(files) {
    localStorage.setItem(DRIVE_STORAGE_KEY, JSON.stringify(files));
  }

  // ─── UI Updates ───
  function updateSettingsButtonState() {
    if (!syncBtn) return;
    const auth = getAuthState();
    if (auth && auth.authorized) {
      syncBtn.textContent = `Connected: ${auth.email} (Sync Now)`;
      syncBtn.style.border = '1px solid var(--color-success)';
      syncBtn.style.background = 'hsla(145, 65%, 48%, 0.1)';
      
      // Add a small disconnect link if it doesn't exist
      let disconnectLink = document.getElementById('btn-drive-disconnect');
      if (!disconnectLink) {
        disconnectLink = document.createElement('a');
        disconnectLink.id = 'btn-drive-disconnect';
        disconnectLink.href = '#';
        disconnectLink.textContent = 'Disconnect Google Drive';
        disconnectLink.style.display = 'block';
        disconnectLink.style.textAlign = 'center';
        disconnectLink.style.fontSize = '0.75rem';
        disconnectLink.style.color = 'var(--color-danger)';
        disconnectLink.style.marginTop = '0.5rem';
        disconnectLink.style.textDecoration = 'none';
        disconnectLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (confirm('Disconnect Google Drive? Local data is preserved.')) {
            setAuthState(null);
            alert('Google Drive account disconnected.');
          }
        });
        syncBtn.parentNode.appendChild(disconnectLink);
      }
    } else {
      syncBtn.textContent = 'Sync to Google Drive (OAuth)';
      syncBtn.style.border = '1px dashed var(--color-border)';
      syncBtn.style.background = 'var(--color-surface-2)';
      const disconnectLink = document.getElementById('btn-drive-disconnect');
      if (disconnectLink) disconnectLink.remove();
    }
  }

  // ─── Button Click Handlers ───
  function handleSettingsSyncClick() {
    const auth = getAuthState();
    if (auth && auth.authorized) {
      performBackupSync();
    } else {
      openOAuthConsentModal();
    }
  }

  function handleRecycleSyncClick() {
    const resultText = document.getElementById('recycle-result-text');
    if (!resultText || !resultText.textContent.trim()) {
      alert('No recycled skills to sync. Please run the alchemist first.');
      return;
    }

    const auth = getAuthState();
    if (!auth || !auth.authorized) {
      // Trigger OAuth first
      alert('Authorization required. Let’s connect your Google Drive first.');
      openOAuthConsentModal(() => {
        performDocSync(resultText.textContent);
      });
    } else {
      performDocSync(resultText.textContent);
    }
  }

  // ─── Mock Operations ───
  function performBackupSync() {
    syncBtn.textContent = 'Connecting...';
    syncBtn.disabled = true;

    setTimeout(() => {
      syncBtn.textContent = 'Uploading book.json...';
      const state = PhoneState.load();
      const files = getDriveFiles();
      files['book.json'] = {
        content: state,
        syncedAt: new Date().toISOString()
      };
      saveDriveFiles(files);

      setTimeout(() => {
        const now = new Date().toLocaleTimeString();
        alert(`[Drive Sync] Successfully backed up to Google Drive!
File: 'book.json'
Size: ${JSON.stringify(state).length} bytes
Time: ${now}
Scope: drive.file`);
        updateSettingsButtonState();
        syncBtn.disabled = false;
      }, 800);
    }, 600);
  }

  function performDocSync(text) {
    if (!syncRecycledBtn) return;
    syncRecycledBtn.textContent = 'Connecting...';
    syncRecycledBtn.disabled = true;

    setTimeout(() => {
      syncRecycledBtn.textContent = 'Creating Google Doc...';
      const files = getDriveFiles();
      files['Phonethagoras - Recycled Skills.gdoc'] = {
        content: text,
        syncedAt: new Date().toISOString()
      };
      saveDriveFiles(files);

      setTimeout(() => {
        alert(`[Drive Sync] Successfully synchronized document to Google Drive!
File: 'Phonethagoras - Recycled Skills.gdoc'
Scope: drive.file (Access limited to this specific file only)`);
        syncRecycledBtn.textContent = 'Sync to Google Doc';
        syncRecycledBtn.disabled = false;
      }, 800);
    }, 600);
  }

  // ─── OAuth Consent Modal ───
  function openOAuthConsentModal(callback) {
    // Check if modal already exists
    let modal = document.getElementById('oauth-modal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'oauth-modal';
    modal.className = 'oauth-modal-overlay';
    modal.innerHTML = `
      <div class="oauth-modal-card">
        <div class="oauth-modal-header">
          <svg class="google-logo" viewBox="0 0 24 24" width="24" height="24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <h3>Sign in with Google</h3>
        </div>
        <div class="oauth-modal-body">
          <p class="oauth-desc">to continue to <strong>phone.com (Zen Zuse)</strong></p>
          
          <div class="account-selector">
            <div class="account-item active" id="mock-account-item">
              <div class="avatar">J</div>
              <div class="details">
                <span class="name">Joshua Atkinson</span>
                <span class="email">joshua.atkinson@purdue.edu</span>
              </div>
            </div>
          </div>

          <div class="scope-permissions">
            <div class="scope-header">phone.com requests access to:</div>
            <div class="scope-item">
              <input type="checkbox" id="scope-drive-file" checked disabled>
              <label for="scope-drive-file">
                <strong>See, edit, create, and delete only the specific Google Drive files you use with this app.</strong>
                <span class="scope-note">This gives phone.com access to create backups and sync exported documents without accessing your other files (drive.file scope).</span>
              </label>
            </div>
          </div>

          <p class="oauth-policy">
            By clicking Allow, you agree to authorize this non-custodial app to access local simulated OAuth tokens. No data is sent to central servers.
          </p>
        </div>
        <div class="oauth-modal-footer">
          <button class="btn btn-secondary" id="oauth-btn-cancel">Cancel</button>
          <button class="btn btn-primary" id="oauth-btn-allow">Allow</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('oauth-btn-cancel').addEventListener('click', () => {
      modal.remove();
    });

    document.getElementById('oauth-btn-allow').addEventListener('click', () => {
      setAuthState({
        authorized: true,
        email: 'joshua.atkinson@purdue.edu',
        name: 'Joshua Atkinson',
        token: 'mock-oauth-token-' + Math.random().toString(36).substring(2),
        grantedAt: new Date().toISOString()
      });

      modal.remove();

      if (callback) {
        callback();
      } else {
        performBackupSync();
      }
    });
  }

  // ─── Inline CSS Injection ───
  function injectModalStyles() {
    if (document.getElementById('oauth-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'oauth-modal-styles';
    style.textContent = `
      .oauth-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 1100;
        background: rgba(7, 8, 12, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease-out;
      }

      .oauth-modal-card {
        width: 100%;
        max-width: 440px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .oauth-modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid var(--color-border-subtle);
        display: flex;
        align-items: center;
        gap: 0.8rem;
      }

      .oauth-modal-header h3 {
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--color-text);
      }

      .oauth-modal-body {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.2rem;
      }

      .oauth-desc {
        font-size: 0.9rem;
        color: var(--color-text-muted);
      }

      .account-selector {
        background: var(--color-surface-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }

      .account-item {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.8rem 1rem;
        cursor: pointer;
        transition: background var(--transition-fast);
      }

      .account-item:hover {
        background: hsla(220, 20%, 92%, 0.05);
      }

      .account-item.active {
        background: hsla(38, 92%, 56%, 0.05);
        border-left: 3px solid var(--color-accent);
      }

      .account-item .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--color-accent);
        color: var(--color-bg);
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.9rem;
      }

      .account-item .details {
        display: flex;
        flex-direction: column;
      }

      .account-item .name {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--color-text);
      }

      .account-item .email {
        font-size: 0.75rem;
        color: var(--color-text-muted);
      }

      .scope-permissions {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 1rem;
        background: var(--color-bg-elevated);
      }

      .scope-header {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--color-text);
        margin-bottom: 0.6rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .scope-item {
        display: flex;
        gap: 0.8rem;
        align-items: flex-start;
      }

      .scope-item input[type="checkbox"] {
        margin-top: 0.2rem;
        accent-color: var(--color-accent);
      }

      .scope-item label {
        font-size: 0.8rem;
        line-height: 1.4;
        color: var(--color-text);
        cursor: pointer;
      }

      .scope-note {
        display: block;
        font-size: 0.75rem;
        color: var(--color-text-muted);
        margin-top: 0.25rem;
      }

      .oauth-policy {
        font-size: 0.7rem;
        color: var(--color-text-dim);
        line-height: 1.3;
      }

      .oauth-modal-footer {
        padding: 1rem 1.5rem;
        background: var(--color-bg-elevated);
        border-top: 1px solid var(--color-border-subtle);
        display: flex;
        justify-content: flex-end;
        gap: 0.8rem;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  return {
    init,
    getAuthState,
    getDriveFiles,
    openOAuthConsentModal
  };
})();

// Dual-mode module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneSync;
} else {
  window.PhoneSync = PhoneSync;
}
