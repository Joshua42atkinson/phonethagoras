/**
 * AI Core Widget — Global Collapsible Thumb Overlay
 *
 * Dynamically injects a glassmorphism floating overlay (the "Thumb")
 * on any page. It runs the Logic (LFM-350M), Memory (Nomic Embed), and
 * Voice (Kokoro TTS) engines, managing the 4GB global RAM budget.
 *
 * It classifies user prompts and routes them as "Pending Quests"
 * to specialized spoke pages.
 *
 * @module ai-core-widget
 */

import { WllamaEngine } from './wllama-engine.js';
import { PhoneVoice } from './voice.js';
import { PhoneAI } from './ai.js';
import { PhoneState } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
  // Auto-init state if not loaded
  (async () => {
    try {
      await PhoneState.init();
    } catch (e) {
      console.warn('[Widget] State init warning:', e);
    }
  })();

  // ── 1. Inject Stylesheets dynamically ──────────────────────────────
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Floating Widget container */
    #zen-zuse-widget-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Floating trigger button */
    #zen-zuse-trigger {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(10, 15, 25, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s, box-shadow 0.2s;
      position: relative;
      user-select: none;
    }
    #zen-zuse-trigger:hover {
      transform: scale(1.08);
      border-color: hsl(38, 92%, 56%);
      box-shadow: 0 0 16px hsla(38, 92%, 56%, 0.35);
    }
    #zen-zuse-trigger:active {
      transform: scale(0.95);
    }

    /* VRAM status indicator dot */
    .zz-badge-status {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #7f8c8d;
      border: 2px solid #0a0f19;
      transition: background 0.3s, box-shadow 0.3s;
    }
    .zz-badge-status.loaded {
      background: #2ecc71;
      box-shadow: 0 0 8px #2ecc71;
    }
    .zz-badge-status.loading {
      background: #f1c40f;
      animation: zz-pulse 1.2s infinite;
    }
    @keyframes zz-pulse {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.15); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    /* Floating Panel container */
    #zen-zuse-panel {
      position: absolute;
      bottom: 72px;
      right: 0;
      width: 360px;
      max-width: 90vw;
      height: 480px;
      background: rgba(10, 15, 25, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
      border-radius: 12px;
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
      transform: scale(0.92) translateY(15px);
      opacity: 0;
      pointer-events: none;
      transform-origin: bottom right;
    }
    #zen-zuse-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }

    /* Headers & Subtitles */
    .zz-header {
      padding: 0.9rem 1.2rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.01);
    }
    .zz-title-block {
      display: flex;
      flex-direction: column;
    }
    .zz-title {
      font-weight: 700;
      font-size: 0.92rem;
      color: hsl(38, 92%, 56%);
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .zz-subtitle {
      font-size: 0.72rem;
      color: rgba(232, 230, 227, 0.45);
    }
    .zz-close {
      background: none;
      border: none;
      color: rgba(232, 230, 227, 0.4);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.2rem;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .zz-close:hover {
      color: #fff;
    }

    /* Tabs */
    .zz-tabs {
      display: flex;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .zz-tab-btn {
      flex: 1;
      padding: 0.6rem;
      background: none;
      border: none;
      color: rgba(232, 230, 227, 0.4);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      text-align: center;
    }
    .zz-tab-btn:hover {
      color: rgba(232, 230, 227, 0.7);
    }
    .zz-tab-btn.active {
      color: hsl(38, 92%, 56%);
      border-bottom-color: hsl(38, 92%, 56%);
      background: rgba(255, 255, 255, 0.02);
    }

    /* Body & Panels */
    .zz-body {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .zz-tab-panel {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      padding: 1rem;
      display: none;
      flex-direction: column;
      overflow-y: auto;
    }
    .zz-tab-panel.active {
      display: flex;
    }

    /* VRAM Progress bar */
    .zz-system-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 0.8rem;
      margin-bottom: 1rem;
    }
    .zz-progress-track {
      height: 6px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.4rem;
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .zz-progress-fill {
      height: 100%;
      background: hsl(38, 92%, 56%);
      width: 0%;
      transition: width 0.3s ease, background-color 0.3s;
      box-shadow: 0 0 8px hsla(38, 92%, 56%, 0.4);
    }

    /* Trinity model items */
    .zz-model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.8rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      margin-bottom: 0.6rem;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .zz-model-item.active {
      background: rgba(255, 255, 255, 0.05);
    }
    .zz-model-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .zz-model-name {
      font-weight: 600;
      font-size: 0.82rem;
      color: #fff;
    }
    .zz-model-size {
      font-size: 0.68rem;
      color: rgba(232, 230, 227, 0.4);
      font-family: monospace;
    }
    .zz-model-progress {
      font-size: 0.62rem;
      color: rgba(232, 230, 227, 0.35);
      margin-top: 2px;
    }
    .zz-btn-toggle {
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
      color: #e8e6e3;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .zz-btn-toggle:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.3);
    }
    .zz-btn-toggle:active {
      transform: scale(0.97);
    }
    .zz-btn-toggle.loaded {
      background: var(--color-state, #e8c547);
      color: #0a0f19;
      border-color: var(--color-state, #e8c547);
    }
    .zz-btn-toggle.loaded:hover {
      filter: brightness(1.1);
    }
    .zz-btn-toggle:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Chat view styles */
    .zz-chat-feed {
      flex: 1;
      overflow-y: auto;
      padding-right: 4px;
      display: flex;
      flex-direction: column;
      gap: 0.7rem;
      margin-bottom: 0.5rem;
    }
    .zz-msg {
      max-width: 85%;
      padding: 0.55rem 0.75rem;
      border-radius: 8px;
      font-size: 0.82rem;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .zz-msg.user {
      background: rgba(255, 255, 255, 0.08);
      align-self: flex-end;
      border-bottom-right-radius: 2px;
      color: #fff;
    }
    .zz-msg.ai {
      background: rgba(255, 165, 0, 0.05);
      border: 1px solid rgba(255, 165, 0, 0.12);
      align-self: flex-start;
      border-bottom-left-radius: 2px;
      color: #e8e6e3;
    }
    .zz-msg.system {
      background: rgba(255, 255, 255, 0.02);
      font-style: italic;
      font-size: 0.74rem;
      max-width: 95%;
      align-self: center;
      color: rgba(232, 230, 227, 0.45);
      text-align: center;
      border-radius: 4px;
      padding: 0.3rem 0.6rem;
    }

    /* Typing indicators */
    .zz-typing {
      display: flex;
      gap: 4px;
      padding: 0.6rem 0.8rem;
      background: rgba(255, 165, 0, 0.03);
      border: 1px solid rgba(255, 165, 0, 0.08);
      border-radius: 8px;
      border-bottom-left-radius: 2px;
      align-self: flex-start;
    }
    .zz-dot {
      width: 6px;
      height: 6px;
      background: rgba(232, 230, 227, 0.5);
      border-radius: 50%;
      animation: zz-bounce 1.3s infinite;
    }
    .zz-dot:nth-child(2) { animation-delay: 0.15s; }
    .zz-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes zz-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    /* Input controls */
    .zz-input-group {
      display: flex;
      gap: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding: 0.6rem 0;
    }
    .zz-input {
      flex: 1;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e8e6e3;
      padding: 0.45rem 0.7rem;
      border-radius: 6px;
      font-size: 0.82rem;
      outline: none;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .zz-input:focus {
      border-color: hsl(38, 92%, 56%);
    }
    .zz-btn-icon {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #e8e6e3;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .zz-btn-icon:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.06);
      border-color: hsl(38, 92%, 56%);
    }
    .zz-btn-icon:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .zz-btn-icon.active {
      background: rgba(231, 76, 60, 0.15);
      color: #e74c3c;
      border-color: #e74c3c;
      animation: zz-recording-pulse 1.5s infinite;
    }
    @keyframes zz-recording-pulse {
      0% { box-shadow: 0 0 0 0px rgba(231, 76, 60, 0.3); }
      70% { box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
      100% { box-shadow: 0 0 0 0px rgba(231, 76, 60, 0); }
    }

    /* Scrollbars */
    .zz-chat-feed::-webkit-scrollbar,
    .zz-tab-panel::-webkit-scrollbar {
      width: 4px;
    }
    .zz-chat-feed::-webkit-scrollbar-track,
    .zz-tab-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .zz-chat-feed::-webkit-scrollbar-thumb,
    .zz-tab-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
    }
  `;
  document.head.appendChild(styleEl);

  // ── 2. Build and Inject Floating DOM Markup ────────────────────────
  let widgetContainer = document.getElementById('zen-zuse-widget-container');
  if (!widgetContainer) {
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'zen-zuse-widget-container';
    widgetContainer.innerHTML = `
      <div id="zen-zuse-trigger" title="Zen Zuse Orchestrator">
        🤖
        <div class="zz-badge-status" id="zz-badge"></div>
      </div>
      <div id="zen-zuse-panel">
        <div class="zz-header">
          <div class="zz-title-block">
            <span class="zz-title">Zen Zuse Hub</span>
            <span class="zz-subtitle">Orchestration & intake router</span>
          </div>
          <button class="zz-close" id="zz-panel-close" title="Close Panel">✕</button>
        </div>
        <div class="zz-tabs">
          <button class="zz-tab-btn active" id="zz-tab-btn-intake">Intake</button>
          <button class="zz-tab-btn" id="zz-tab-btn-systems">Systems</button>
        </div>
        <div class="zz-body">
          <!-- Intake Tab -->
          <div class="zz-tab-panel active" id="zz-panel-intake">
            <div class="zz-chat-feed" id="zz-chat-feed">
              <div class="zz-msg system">Zen Zuse active. Speak or type your request. I will help directly or route you to a specialist.</div>
            </div>
            <div class="zz-input-group">
              <button class="zz-btn-icon" id="zz-btn-mic" title="Record Voice">🎙️</button>
              <input type="text" class="zz-input" id="zz-chat-input" placeholder="Ask anything, e.g. Resume help...">
              <button class="zz-btn-icon" id="zz-btn-send" title="Send Request">➔</button>
            </div>
          </div>
          <!-- Systems Tab -->
          <div class="zz-tab-panel" id="zz-panel-systems">
            <div class="zz-system-card">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:2px; font-weight:600;">
                <span>GLOBAL MEMORY BUDGET</span>
                <span id="zz-vram-text">0 / 6000 MB</span>
              </div>
              <div class="zz-progress-track">
                <div id="zz-vram-bar" class="zz-progress-fill"></div>
              </div>
              <div style="font-size:0.6rem; color:rgba(232,230,227,0.35); margin-top:5px; text-align:center;">
                Active finger spokes swap automatically to avoid exceeding 4GB RAM.
              </div>
            </div>

            <!-- Trinity Toggles -->
            <div class="zz-model-item" id="zz-item-logic">
              <div class="zz-model-meta">
                <span class="zz-model-name">Logic (Liquid 350M)</span>
                <span class="zz-model-size">~219MB RAM</span>
                <div class="zz-model-progress" id="zz-progress-logic"></div>
              </div>
              <button class="zz-btn-toggle" id="zz-btn-logic">Load</button>
            </div>

            <div class="zz-model-item" id="zz-item-memory">
              <div class="zz-model-meta">
                <span class="zz-model-name">Memory (Nomic Embed)</span>
                <span class="zz-model-size">~81MB RAM</span>
                <div class="zz-model-progress" id="zz-progress-memory"></div>
              </div>
              <button class="zz-btn-toggle" id="zz-btn-memory">Load</button>
            </div>

            <div class="zz-model-item" id="zz-item-voice">
              <div class="zz-model-meta">
                <span class="zz-model-name">Voice (Kokoro TTS)</span>
                <span class="zz-model-size">~80MB RAM</span>
                <div class="zz-model-progress" id="zz-progress-voice"></div>
              </div>
              <button class="zz-btn-toggle" id="zz-btn-voice">Load</button>
            </div>

            <div class="zz-model-item" id="zz-item-spoke" style="border-style:dashed;">
              <div class="zz-model-meta">
                <span class="zz-model-name" id="zz-active-spoke-name">Active Spoke: None</span>
                <span class="zz-model-size" id="zz-active-spoke-size">0 MB RAM</span>
              </div>
              <button class="zz-btn-toggle" id="zz-btn-spoke-unload" disabled>Unload</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(widgetContainer);
  }

  // ── 3. Panel Toggle Logic ──────────────────────────────────────────
  const triggerBtn  = document.getElementById('zen-zuse-trigger');
  const panelEl     = document.getElementById('zen-zuse-panel');
  const closeBtn    = document.getElementById('zz-panel-close');
  const badgeEl     = document.getElementById('zz-badge');

  function togglePanel() {
    panelEl.classList.toggle('open');
    triggerBtn.classList.toggle('active');
    if (panelEl.classList.contains('open')) {
      document.getElementById('zz-chat-input').focus();
      scrollChatToEnd();
    }
  }

  triggerBtn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  // ── 4. Tabs Toggle Logic ───────────────────────────────────────────
  const tabIntake = document.getElementById('zz-tab-btn-intake');
  const tabSystems = document.getElementById('zz-tab-btn-systems');
  const panelIntake = document.getElementById('zz-panel-intake');
  const panelSystems = document.getElementById('zz-panel-systems');

  tabIntake.addEventListener('click', () => {
    tabIntake.classList.add('active');
    tabSystems.classList.remove('active');
    panelIntake.classList.add('active');
    panelSystems.classList.remove('active');
  });

  tabSystems.addEventListener('click', () => {
    tabSystems.classList.add('active');
    tabIntake.classList.remove('active');
    panelSystems.classList.add('active');
    panelIntake.classList.remove('active');
  });

  // ── 5. Model Registry & VRAM Tracking ──────────────────────────────
  const modelInfo = WllamaEngine.getModelInfo();
  const MAX_VRAM = 6000; // Display cap

  const models = {
    logic: {
      sizeMB: modelInfo.logic.sizeMB,
      btn: document.getElementById('zz-btn-logic'),
      progressEl: document.getElementById('zz-progress-logic'),
      color: 'hsl(38, 92%, 56%)',
      loaded: false,
      loading: false,
    },
    memory: {
      sizeMB: modelInfo.memory.sizeMB,
      btn: document.getElementById('zz-btn-memory'),
      progressEl: document.getElementById('zz-progress-memory'),
      color: 'hsl(200, 80%, 50%)',
      loaded: false,
      loading: false,
    },
    voice: {
      sizeMB: modelInfo.voice?.sizeMB || 80,
      btn: document.getElementById('zz-btn-voice'),
      progressEl: document.getElementById('zz-progress-voice'),
      color: 'hsl(340, 80%, 60%)',
      loaded: false,
      loading: false,
    }
  };

  let currentVram = 0;

  function updateVramBar() {
    currentVram = 0;
    if (WllamaEngine.getStatus().logicLoaded)  currentVram += models.logic.sizeMB;
    if (WllamaEngine.getStatus().memoryLoaded) currentVram += models.memory.sizeMB;
    if (PhoneVoice.isKokoroLoaded())          currentVram += models.voice.sizeMB;

    const status = WllamaEngine.getStatus();
    const activeSpokeEl = document.getElementById('zz-active-spoke-name');
    const activeSpokeSizeEl = document.getElementById('zz-active-spoke-size');
    const activeSpokeBtn = document.getElementById('zz-btn-spoke-unload');

    if (status.spokeLoaded && modelInfo.spoke) {
      currentVram += status.spokeSizeMB || modelInfo.spoke.sizeMB;
      activeSpokeEl.textContent = `Active Spoke: ${status.spokeLabel || 'Loaded'}`;
      activeSpokeSizeEl.textContent = `${status.spokeSizeMB || modelInfo.spoke.sizeMB} MB RAM`;
      activeSpokeBtn.disabled = false;
      activeSpokeBtn.classList.add('loaded');
      activeSpokeBtn.style.background = 'hsl(145, 60%, 45%)';
      activeSpokeBtn.style.color = '#0a0f19';
      activeSpokeBtn.style.borderColor = 'hsl(145, 60%, 45%)';
    } else {
      activeSpokeEl.textContent = 'Active Spoke: None';
      activeSpokeSizeEl.textContent = '0 MB RAM';
      activeSpokeBtn.disabled = true;
      activeSpokeBtn.classList.remove('loaded');
      activeSpokeBtn.style.background = 'transparent';
      activeSpokeBtn.style.color = '#e8e6e3';
      activeSpokeBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    }

    document.getElementById('zz-vram-text').textContent = `${currentVram} / ${MAX_VRAM} MB`;
    const pct = Math.min((currentVram / MAX_VRAM) * 100, 100);
    const bar = document.getElementById('zz-vram-bar');
    bar.style.width = `${pct}%`;

    // Colors
    if (pct > 85) {
      bar.style.backgroundColor = 'hsl(0, 80%, 50%)';
      bar.style.boxShadow = '0 0 10px hsl(0, 80%, 50%)';
    } else if (pct > 50) {
      bar.style.backgroundColor = 'hsl(38, 92%, 56%)';
      bar.style.boxShadow = '0 0 10px hsl(38, 92%, 56%)';
    } else {
      bar.style.backgroundColor = '#2ecc71';
      bar.style.boxShadow = '0 0 10px #2ecc71';
    }

    // Badge styling on trigger button
    badgeEl.className = 'zz-badge-status';
    if (status.logicLoaded) {
      badgeEl.classList.add('loaded');
    } else if (status.logicLoading) {
      badgeEl.classList.add('loading');
    }
  }

  // ── 6. Button Render States ───────────────────────────────────────
  function setBtnLoading(key, pct = 0) {
    const btn = models[key].btn;
    btn.textContent = pct > 0 ? `${pct}%` : '...';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  function setBtnLoaded(key) {
    const btn = models[key].btn;
    const color = models[key].color;
    btn.textContent = 'Unload';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.backgroundColor = color;
    btn.style.color = '#0a0f19';
    btn.style.borderColor = color;
  }

  function setBtnUnloaded(key) {
    const btn = models[key].btn;
    btn.textContent = 'Load';
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.backgroundColor = 'transparent';
    btn.style.color = '#e8e6e3';
    btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    models[key].progressEl.textContent = '';
  }

  function formatProgress(loaded, total) {
    return `${(loaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`;
  }

  // ── 7. Load & Unload Handlers ─────────────────────────────────────
  async function toggleLogic() {
    if (WllamaEngine.getStatus().logicLoaded) {
      await WllamaEngine.unloadLogic();
      setBtnUnloaded('logic');
    } else {
      setBtnLoading('logic');
      try {
        await WllamaEngine.loadLogic(({ loaded, total, pct }) => {
          setBtnLoading('logic', pct);
          models.logic.progressEl.textContent = formatProgress(loaded, total);
        });
        setBtnLoaded('logic');
      } catch (err) {
        setBtnUnloaded('logic');
        appendSystemMessage(`Logic loading failed: ${err.message || err}`);
      }
    }
    updateVramBar();
  }

  async function toggleMemory() {
    if (WllamaEngine.getStatus().memoryLoaded) {
      await WllamaEngine.unloadMemory();
      setBtnUnloaded('memory');
    } else {
      setBtnLoading('memory');
      try {
        await WllamaEngine.loadMemory(({ loaded, total, pct }) => {
          setBtnLoading('memory', pct);
          models.memory.progressEl.textContent = formatProgress(loaded, total);
        });
        setBtnLoaded('memory');
      } catch (err) {
        setBtnUnloaded('memory');
        appendSystemMessage(`Memory loading failed: ${err.message || err}`);
      }
    }
    updateVramBar();
  }

  async function toggleVoice() {
    if (PhoneVoice.isKokoroLoaded()) {
      PhoneVoice.unloadKokoro();
      setBtnUnloaded('voice');
    } else {
      setBtnLoading('voice');
      try {
        await PhoneVoice.loadKokoro((pct) => {
          setBtnLoading('voice', pct);
          models.voice.progressEl.textContent = `Downloading TTS model weights (${pct}%)`;
        });
        PhoneVoice.setTTSEnabled(true);
        setBtnLoaded('voice');
        // Update input mic icon status (make it clickable)
        document.getElementById('zz-btn-mic').disabled = false;
        appendSystemMessage('Voice Engine loaded successfully (in-browser Kokoro).');
      } catch (err) {
        setBtnUnloaded('voice');
        appendSystemMessage(`Voice loading failed: ${err.message || err}`);
      }
    }
    updateVramBar();
  }

  async function unloadSpoke() {
    await WllamaEngine.unloadSpoke();
    updateVramBar();
    appendSystemMessage('Active Spoke model unloaded from memory.');
  }

  // Bind systems button click handlers
  models.logic.btn.addEventListener('click', toggleLogic);
  models.memory.btn.addEventListener('click', toggleMemory);
  models.voice.btn.addEventListener('click', toggleVoice);
  document.getElementById('zz-btn-spoke-unload').addEventListener('click', unloadSpoke);

  // Sync state initially
  const status = WllamaEngine.getStatus();
  if (status.logicLoaded)  setBtnLoaded('logic');  else setBtnUnloaded('logic');
  if (status.memoryLoaded) setBtnLoaded('memory'); else setBtnUnloaded('memory');
  if (PhoneVoice.isKokoroLoaded()) setBtnLoaded('voice'); else setBtnUnloaded('voice');
  updateVramBar();

  // Watch for external loading updates
  document.addEventListener('wllama:status', updateVramBar);
  document.addEventListener('wllama:logic-progress', (e) => {
    const { pct, loaded, total } = e.detail;
    if (!WllamaEngine.getStatus().logicLoaded) {
      setBtnLoading('logic', pct);
      models.logic.progressEl.textContent = formatProgress(loaded, total);
    }
  });
  document.addEventListener('phone-ai:backend-changed', () => {
    if (WllamaEngine.getStatus().logicLoaded) {
      setBtnLoaded('logic');
    }
    updateVramBar();
  });

  // ── 8. Chat & Intent Routing Logic ─────────────────────────────────
  const chatFeed = document.getElementById('zz-chat-feed');
  const chatInput = document.getElementById('zz-chat-input');
  const sendBtn = document.getElementById('zz-btn-send');
  const micBtn = document.getElementById('zz-btn-mic');

  function scrollChatToEnd() {
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function appendUserMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'zz-msg user';
    msg.textContent = text;
    chatFeed.appendChild(msg);
    scrollChatToEnd();
  }

  function appendAiMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'zz-msg ai';
    msg.innerHTML = text.replace(/\n/g, '<br>');
    chatFeed.appendChild(msg);
    scrollChatToEnd();
    return msg;
  }

  function appendSystemMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'zz-msg system';
    msg.textContent = text;
    chatFeed.appendChild(msg);
    scrollChatToEnd();
  }

  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'zz-typing';
    indicator.id = 'zz-typing-indicator';
    indicator.innerHTML = '<div class="zz-dot"></div><div class="zz-dot"></div><div class="zz-dot"></div>';
    chatFeed.appendChild(indicator);
    scrollChatToEnd();
  }

  function removeTypingIndicator() {
    document.getElementById('zz-typing-indicator')?.remove();
  }

  // Intent Classifier
  async function classifyIntent(userText) {
    const cleanText = userText.toLowerCase().trim();
    
    // Crisis overrides
    if (cleanText.match(/\b(suicide|kill myself|end it|die|self.?harm|hurt myself)\b/)) {
      return 'NURSE';
    }
    if (cleanText.match(/\b(homeless|no.*place.*live|shelter|evict)\b/)) {
      return 'SCOUT';
    }

    // Default heuristic classifications if Logic is offline
    if (!WllamaEngine.getStatus().logicLoaded) {
      if (cleanText.match(/\b(job|resume|cv|interview|apply|career|profession|skills)\b/)) return 'PROFESSOR';
      if (cleanText.match(/\b(sleep|diet|nutrition|exercise|workout|health|wellness|doctor|breathing)\b/)) return 'NURSE';
      if (cleanText.match(/\b(journal|write|story|vocab|vaam|creative|lore|book|diary)\b/)) return 'STORYTELLER';
      if (cleanText.match(/\b(survival|camp|emergency|fire|water|map|compass|navigation|checklist)\b/)) return 'SCOUT';
      return 'CHAT';
    }

    // Model zero-shot routing
    const messages = [
      {
        role: 'system',
        content: `You are Zen Zuse, the intent router. Classify the user's message into one of four active Guild Masters (Spoke pages) or CHAT:
- PROFESSOR: Resumes, cover letters, career, education, skill reframing, job applications, or professional development.
- NURSE: Sleep, diet, exercise, wellness, breathing, biometrics, or physical/mental health.
- STORYTELLER: Creative writing, journaling, vocabulary practice (VAAM), or personal reflections.
- SCOUT: Survival skills, navigation, emergency preparedness, weather, checklist, or field notes.
- CHAT: General conversation, greetings, casual questions, or doesn't fit the above.

Reply with EXACTLY one word: PROFESSOR, NURSE, STORYTELLER, SCOUT, or CHAT. Do not write any other explanation or punctuation.`
      },
      {
        role: 'user',
        content: userText
      }
    ];

    try {
      const response = await WllamaEngine.chat(messages, {
        max_tokens: 10,
        temperature: 0.1
      });
      const cleaned = response.trim().toUpperCase().replace(/[^A-Z]/g, '');
      console.log(`[Zen Zuse Classify] Decision: ${cleaned}`);
      
      if (['PROFESSOR', 'NURSE', 'STORYTELLER', 'SCOUT', 'CHAT'].includes(cleaned)) {
        return cleaned;
      }
      if (cleaned.includes('PROFESSOR')) return 'PROFESSOR';
      if (cleaned.includes('NURSE')) return 'NURSE';
      if (cleaned.includes('STORYTELLER')) return 'STORYTELLER';
      if (cleaned.includes('SCOUT')) return 'SCOUT';
      return 'CHAT';
    } catch (err) {
      console.warn('[Classifier] Zero-shot error, fallback to heuristics:', err);
      if (cleanText.match(/\b(job|resume|cv|interview|apply|career|profession|skills)\b/)) return 'PROFESSOR';
      if (cleanText.match(/\b(sleep|diet|nutrition|exercise|workout|health|wellness|doctor|breathing)\b/)) return 'NURSE';
      if (cleanText.match(/\b(journal|write|story|vocab|vaam|creative|lore|book|diary)\b/)) return 'STORYTELLER';
      if (cleanText.match(/\b(survival|camp|emergency|fire|water|map|compass|navigation|checklist)\b/)) return 'SCOUT';
      return 'CHAT';
    }
  }

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendUserMessage(text);
    showTypingIndicator();

    try {
      const route = await classifyIntent(text);

      if (route === 'CHAT') {
        // Direct response from 350M Logic model
        const responseObj = await PhoneAI.chat(text);
        const reply = responseObj.message?.content || responseObj;
        
        removeTypingIndicator();
        appendAiMessage(reply);

        // Speak if Kokoro/TTS is active
        if (PhoneVoice.isListening()) {
          PhoneVoice.stopListening();
        }
        if (PhoneVoice.isSpeaking()) {
          PhoneVoice.cancel();
        }
        await PhoneVoice.speak(reply);
      } else {
        // Spoke routing (Pending Quest Pattern)
        removeTypingIndicator();
        
        const guildMasters = {
          PROFESSOR: 'The Scholar (Professor)',
          NURSE: 'The Healer (Nurse)',
          STORYTELLER: 'The Lorekeeper (Storyteller)',
          SCOUT: 'The Ranger (Scout)',
        };

        appendSystemMessage(`🧭 Quest assigned: Routing to ${guildMasters[route]}...`);
        
        // Write Pending Quest details to localStorage
        localStorage.setItem('zen_pending_quest', JSON.stringify({
          prompt: text,
          route: route.toLowerCase(),
          timestamp: Date.now()
        }));

        // Page redirect resolution (relative path checker)
        const isSpoke = window.location.pathname.includes('/models/');
        const targetPath = isSpoke ? `./${route.toLowerCase()}.html` : `models/${route.toLowerCase()}.html`;
        
        // Unload 350M Logic model to reclaim RAM prior to navigation, if loading the heavy spoke
        if (WllamaEngine.getStatus().logicLoaded) {
          console.log('[Widget] Unloading logic (350M) to prepare VRAM budget for Spoke page.');
          await WllamaEngine.unloadLogic();
        }

        setTimeout(() => {
          window.location.href = targetPath;
        }, 1200);
      }
    } catch (err) {
      console.error('[Widget] Chat processing error:', err);
      removeTypingIndicator();
      appendSystemMessage('Processing error. Please try again.');
    }
  }

  sendBtn.addEventListener('click', handleSend);
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  // ── 9. STT / Microphone Setup ─────────────────────────────────────
  let micActive = false;

  // Initialize Speech-to-Text callbacks
  PhoneVoice.setCallbacks(
    // interim transcript
    (text) => {
      chatInput.value = text;
    },
    // final transcript
    (text) => {
      chatInput.value = text;
      handleSend();
    }
  );

  micBtn.addEventListener('click', () => {
    if (PhoneVoice.isListening()) {
      PhoneVoice.stopListening();
      micBtn.classList.remove('active');
    } else {
      // Prompt user warning if Voice model not loaded (we can still do STT, but TTS won't talk)
      PhoneVoice.startListening();
      micBtn.classList.add('active');
    }
  });

  // Keep mic state synced visually with PhoneVoice
  document.addEventListener('zen:mic-status', (e) => {
    const active = e.detail?.active || false;
    if (active) {
      micBtn.classList.add('active');
    } else {
      micBtn.classList.remove('active');
    }
  });
});
