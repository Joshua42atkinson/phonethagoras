/**
 * Phonethagoras Native JNI Bridge
 * 
 * This module intercepts AI requests and routes them to the Android NDK
 * if the app is running inside the Phonethagoras Android WebView.
 */

export const PhoneNativeBridge = {
  isAvailable() {
    // Check if the AndroidNative JNI object has been injected by the WebView
    return typeof window.AndroidNative !== 'undefined';
  },

  async promptAI(text, systemPrompt = '') {
    if (!this.isAvailable()) {
      throw new Error("Native bridge is not available.");
    }
    
    // Using a Promise wrapper in case the JNI interface uses callbacks
    // Adjust this implementation based on how the actual Android NDK returns data.
    return new Promise((resolve, reject) => {
      try {
        // Option 1: Direct synchronous return from JNI
        // const response = window.AndroidNative.promptAI(text, systemPrompt);
        // resolve(response);

        // Option 2: Asynchronous callback from JNI (recommended for large models)
        const callbackId = 'native_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        window[callbackId] = function(responseStr) {
          delete window[callbackId];
          resolve(responseStr);
        };
        
        // Pass the callback function name so the Android side can evaluate it when done
        window.AndroidNative.promptAIAsync(text, systemPrompt, callbackId);

      } catch (err) {
        reject(err);
      }
    });
  },

  async getEngineStatus() {
    if (!this.isAvailable()) return 'offline';
    try {
      // Stub for getting model status/VRAM from Android
      return window.AndroidNative.getEngineStatus() || 'ready';
    } catch (e) {
      return 'unknown';
    }
  },

  // ─── P2P SYNC STUBS ───

  async startP2PSync() {
    if (!this.isAvailable()) {
      console.warn("Native bridge not available for P2P Sync. Simulating...");
      return new Promise(resolve => setTimeout(() => resolve({ status: 'simulated_success' }), 2000));
    }
    return new Promise((resolve, reject) => {
      try {
        const callbackId = 'p2p_cb_' + Date.now();
        window[callbackId] = function(responseStr) {
          delete window[callbackId];
          resolve(JSON.parse(responseStr));
        };
        window.AndroidNative.startNearbyConnectionsSync(callbackId);
      } catch (err) {
        reject(err);
      }
    });
  },

  async generateQRCode(dataPayload) {
    if (!this.isAvailable()) {
      console.warn("Native bridge not available for QR Code. Simulating...");
      return "simulated_qr_base64_string";
    }
    try {
      return window.AndroidNative.generateQRCode(dataPayload);
    } catch (e) {
      throw e;
    }
  }
};
