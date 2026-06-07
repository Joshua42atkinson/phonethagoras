# Phonethagoras Architecture & Design Document

## Philosophy
> **Note to Contributors:** The core philosophy, branding, and tone of Phonethagoras is tracked in `IDENTITY.md`. Please read that file before contributing. This document (`ARCHITECTURE.md`) is strictly for technical structure, state management, and platform integration mechanics.

---

## 1. Directory Structure

```text
/src
  /css
    index.css         # Complete design system (HSL tokens, glassmorphism, responsive rules)
  /js
    /data
      constants.js    # Enums for Archetypes (FACE), Roots, Colors, Depths
      personas.js     # Demo data for the Coach's Bridge
    ai.js             # Offline heuristic engine (regex-based response matching & crisis detection)
    app.js            # Orchestrator (Tab navigation, zen-mode gating, initialization)
    breath.js         # Box-breathing mechanic (UI & Timer)
    bridge.js         # Coach Dashboard (caseload sorting, client viewing)
    chat.js           # Chat interface controller
    dashboard.js      # Player identity card and radar chart rendering
    docs.js           # WIOA intake forms and voice questionnaire hookups
    onboarding.js     # First-run wizard and character sheet isomorphism
    pearl.js          # Session state machine (detects context shifts & escalation)
    radar.js          # SVG Radar chart renderer (no canvas dependency)
    recycle.js        # Cognitive reframing tool (turns stories into isolated skills)
    state.js          # Core state manager (localStorage sync, archetype calculation)
    sync.js           # Peer-to-peer sync protocol stubs
    voice.js          # Web Speech API wrapper for STT/TTS
    webllm-manager.js # WebGPU inference manager (optional, progressive enhancement)
  index.html          # Core single-page application view
```

---

## 2. State Management (`state.js`)

The user's state is encapsulated in a single JSON object.
- **Shape (Attributes)**: Mind, Heart, Body, Act. These drive the radar chart.
- **Roots (Virtues)**: Own (Autonomy), Bond (Relatedness), Skill (Competence). Based on Self-Determination Theory (SDT).
- **Walk (Progress)**: Tracks current goals (dares), path steps, and session depth.
- **Face (Archetype)**: The player's identity class (Seer, Singer, Gardener, Maker, Weaver) derived automatically from their highest `Shape` stat.

### The Isomorphism (Character Sheet)
During onboarding (`onboarding.js`), users answer a 4-question behavioral assessment ("The Sorting"). 
This maps their real-world psychological inclinations to the RPG stats:
- **Mind**: Analytical, theoretical problem solving. → **Seer**
- **Heart**: Empathic, relational connection. → **Singer**
- **Body**: Enduring, environmental/physical action. → **Gardener**
- **Act**: Decisive, constructive execution. → **Maker**
- **Balanced**: Equal distribution. → **Weaver**

The state system `updateFace()` method acts as the single source of truth, recalculating the archetype whenever state is saved.

---

## 3. The Offline AI Engine (`ai.js`)

Because the application must work in environments with poor or no connectivity, it uses a robust fallback heuristic engine.
- **Regex Pattern Matching**: Evaluates user input against 30+ semantic patterns (e.g., jobs, relationships, burnout, grief).
- **Crisis Detection**: A hard-coded emergency pattern matcher that halts normal flow and outputs critical hotline numbers (988, 211, Veterans Crisis Line) when words like "suicide" or "harm" are detected.
- **PEARL State Machine Integration**: Responses are routed through `checkCoachRouting()` in `pearl.js` to determine if a human coach needs to be pinged, or if the offline AI can handle the emotional support locally.

---

## 4. Progressive Enhancement (WebGPU / LLM)

While the default is the offline regex heuristic, the system is wired to detect WebGPU capabilities.
- If a compatible local model (e.g., Janus Pro 1B / Liquid LFM) is available, `webllm-manager.js` intercepts the chat routing to provide genuine neural generation entirely on the client side.
- This ensures maximum privacy while offering high-fidelity coaching. If VRAM is exceeded or the connection fails, the system seamlessly degrades back to `ai.js`.

---

## 5. The Coach's Bridge (`bridge.js`)

A secondary interface (hidden behind "Zen Mode" toggle) designed for the human vocational coach.
- **The Algorithm**: Sorts the caseload using a "Help/Up" matrix. Clients who are stuck (low roots/high depth) are bumped to the top for intervention. Clients who are thriving are flagged for "Level Up" progression.
- **WIOA Integration**: The `docs.js` engine takes the semantic data generated in the chat and maps it into standard WIOA (Workforce Innovation and Opportunity Act) federal intake forms, saving the coach hours of administrative overhead.

---

## 6. Portability & Hot-Swappable Thumb Interface Contract

The core architectural pattern in Phonethagoras is **The Hand** (collapsible Hub widget as the Thumb, Spoke pages as the specialized Fingers).
A crucial design constraint is that **The Thumb is an interface contract, not a hardcoded implementation**.

Any intake engine that implements the following API contract can run the Global Collapsible Thumb widget, allowing Phonethagoras to scale across different platforms:

### The Interface Contract
Any Thumb provider must expose the following core operations:
1. `PhoneAI.chat(messages, options) -> Promise<string>` - For direct intake conversation.
2. `WllamaEngine.chat(messages, options) -> Promise<string>` - For low-latency local routing inference.
3. `classifyIntent(text) -> Promise<'PROFESSOR' | 'NURSE' | 'STORYTELLER' | 'SCOUT' | 'CHAT'>` - For intent delegation.

### Platform Swappability Matrix

| Platform | Thumb Engine | Implementation Method | VRAM Overhead |
|---|---|---|---|
| **Web Browser (Standard)** | Liquid LFM-350M (WASM) | `wllama-engine.js` | ~350 MB |
| **Android Mobile** | **Gemini Nano (AI Core)** | `window.AICore.createSession()` | **0 MB** (Shared OS process) |
| **Desktop Wrapper** | Native LFM-8B (Tauri) | Tauri command `invoke("llama_chat")` | Native GPU speed |

### Android Gemini Nano Hot-swap Integration
To deploy Phonethagoras as an Android App, the standard WASM `WllamaEngine` is bypassed. Instead, we swap the intake routing calls to use the system-level **AI Core API**:
```javascript
// Example hot-swap implementation in android wrapper
if (window.AICore) {
  PhoneAI.chat = async (message) => {
    const session = await window.AICore.createSession();
    return await session.prompt(message);
  };
}
```
This reduces mobile memory consumption to virtually zero on the Hub page, preserving the entire VRAM budget for loading the heavy 1.2B/3B Horsemen spoke models.

---

## Future Roadmap (Next Steps)
1. **International Identity & True Offline P2P Sync**: 
   - **Authentication**: Replace Google OAuth with a **WhatsApp Business API (OTP)** login flow to serve international markets where phone numbers are the primary identity.
   - **Local Storage**: Use **SQLCipher** for encrypted local data at rest on Android natively via the JNI bridge.
   - **Encrypted Sync**: Leverage CRDTs (Conflict-free Replicated Data Types like Yjs) over a **self-hosted Open Source Relay** (e.g., GunDB or Y-Websockets) to ensure data sovereignty. 
   - **Peer-to-Peer**: Enable true offline sync between Mentee and Mentor via Android Nearby Connections or QR code optical transfer.
2. **Local Media Suite (Triple-Reply System)**: Integrate Nomic embeddings and local image upscaling for "fun mode" litRPG exploration, ensuring cognitive processing is wrapped in engaging game mechanics.
