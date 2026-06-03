# PHONETHAGORAS.COM — Monolithic Systems Architecture, LDT Pedagogical Engine, and Software Design Masterwork

> **The Authoritative Open-Source Systems Specification and Curriculum Compendium**
>
> Published by the Office of Instruction, Learning Design & Technology (LDT) Program, Purdue University
>
> **Chief Systems Architect & Educational Engineer:** Joshua Atkinson
>
> **Current Epoch:** Summer 2026

---

## SECTION 1: DETAILED PHONETHAGORAS SYSTEMS CONFIGURATION

```
      +-----------------------------------------------------------------------+
      |                     CLIENT-SIDE BROWSER ENVELOPE                      |
      |                                                                       |
      |   +---------------------------------------------------------------+   |
      |   |                       DATA INGESTION LAYER                    |   |
      |   |                                                               |   |
      |   |  - Web Speech API (Local Real-Time Audio Capture)             |   |
      |   |  - Keystroke & Interaction Dynamics (Cognitive Load Sensor)   |   |
      |   +---------------------------------------------------------------+   |
      |                                   |                                   |
      |                                   v                                   |
      |   +---------------------------------------------------------------+   |
      |   |                  DYNAMIC COMPILATION ENGINE (DHMC)            |   |
      |   |                                                               |   |
      |   |  - Local Hardware Profiling (navigator.deviceMemory)          |   |
      |   |  - Model Tiering: High-Parameter / Mid-Parameter / WASM-Lite |   |
      |   |  - Cache Storage API Manager (100% Offline Persistence)       |   |
      |   +---------------------------------------------------------------+   |
      |                                   |                                   |
      |                                   v                                   |
      |   +---------------------------------------------------------------+   |
      |   |               LOCAL CORE COGNITIVE ENGINE (WebLLM)            |   |
      |   |                                                               |   |
      |   |  - Liquid Foundation Model (LFM) Inference                    |   |
      |   |  - Constant-Time State Updates (O(1) Memory Complexity)       |   |
      |   |  - Socratic System Prompts & Long-Horizon RAG Context         |   |
      |   +---------------------------------------------------------------+   |
      |                                   |                                   |
      |                                   v                                   |
      |   +---------------------------------------------------------------+   |
      |   |                   DECENTRALIZED WORKSPACE SYNC                |   |
      |   |                                                               |   |
      |   |  - Scoped OAuth 2.0 (drive.file)                              |   |
      |   |  - Local-to-Drive JSON Serialization (player_state.json)      |   |
      |   |  - Template Populate Engine (Google Docs & Sheets REST APIs)  |   |
      |   +---------------------------------------------------------------+   |
      |                                   |                                   |
      |                                   v                                   |
      |   +---------------------------------------------------------------+   |
      |   |                     PEER-TO-PEER TRUST MESH                   |   |
      |   |                                                               |   |
      |   |  - Zero-Knowledge Proof (ZKP) Milestone Commitments           |   |
      |   |  - WebRTC Peer-to-Peer CRDT Sync (The Mirror / Guild)         |   |
      |   +---------------------------------------------------------------+   |
      +-----------------------------------------------------------------------+
```

### 1.1 Local WebLLM & Liquid LFM Edge-Inference

Rather than deploying heavy, resource-intensive Transformer architectures which suffer from quadratic KV-cache complexity (O(N²)) and high VRAM overhead, phonethagoras.com utilizes **Liquid Foundation Models (LFMs)** hosted client-side via WebLLM and WebGPU.

- **Constant-Time Complexity (O(1)):** LFMs replace traditional attention layers with continuous state-space and closed-form continuous-time neural network layers. This ensures that the model can process long-horizon conversational histories (including your entire 282,000-word Great Game curriculum) in a browser tab without memory explosion or browser crashes.

- **Zero-Token-Cost Scaling:** By compiling the model weights into the browser via WebGPU, 100% of the inference compute is shifted to the user's local device, achieving a **$0.00 marginal cost of scale** for non-profits.

### 1.2 Dynamic Hardware-Adaptive Model Compiler (DHMC)

Upon application initialization, a local diagnostic script profiles the user's active hardware envelope to compile the optimal model build:

```javascript
async function profileHardwareAndGetModel() {
  const memory = navigator.deviceMemory || 4; // RAM in GB
  const threads = navigator.hardwareConcurrency || 4; // CPU Threads
  let adapter = null;
  try {
    adapter = await navigator.gpu.requestAdapter();
  } catch (e) {
    console.warn("WebGPU not supported, falling back to WASM");
  }

  if (adapter && memory >= 16) {
    return { tier: "HIGH", model: "Liquid-LFM-3B-Q4_K_M-WebGPU", backend: "webgpu" };
  } else if (adapter && memory >= 8) {
    return { tier: "MID", model: "Liquid-LFM-1.5B-Q4_K_M-WebGPU", backend: "webgpu" };
  } else {
    return { tier: "LITE", model: "Liquid-LFM-1B-WASM", backend: "wasm" };
  }
}
```

Once profiled, the specific model binaries are retrieved via local IPFS/static CDN and stored in the browser's Cache Storage API, allowing subsequent launches to operate 100% offline.

---

## SECTION 2: TRANSLATING "THE GREAT GAME" PHILOSOPHY INTO PEDAGOGICAL ENGINE SPECIFICATIONS

Each chapter of *The Great Game* is translated into an explicit technical component of the phonethagoras.com learning engine:

### 2.1 Chapters 1–3: The Unexamined Life, The Great Fusion, and The Lens of Belief

**The Problem:** The user enters in a state of "Great Fusion"—fused with their conditioned narrative, social anxieties, and mechanical reactions. They operate in a binary "Sin and Salvation" or "Threat and Safety" Reticular Activating System (RAS) filter.

**The Technical Fix:** The Socratic initial diagnostic. The local WebLLM executes an **Ontological Inversion** by running a local RAG pipeline that reads the user's initial journals, analyzes their RAS filter, and splits the Player from the Persona.

**Instructional Workflow:** The model prompts the user to dictate their "disorienting dilemma" (e.g., the driveway realization). The WebLLM parses the text, not as an objective statement of fact, but as a "narrative vehicle" piloted by the Player.

### 2.2 Chapters 4–5: Attributes, Virtues, and the Radar Chart

**The Problem:** Character development is typically tracked using ungrounded self-help surveys. We need a mathematical, visual, and dynamic geometry of self-determination.

**The Technical Fix:** The Attribute Matrix Radar Chart and the Virtue Topology.

**System Design:** The application measures four core attributes:
- **Intelligence** (Sage)
- **Courage** (Hero)
- **Empathy** (Caregiver)
- **Eloquence** (Jester)

Stored as integers `[0, 100]` in the local `player_state.json`.

**The Logic of Polarity:**
- **Tyranny** = High Courage + Low Eloquence (The Kitchen Conflict)
- **Enabling** = High Empathy + Low Courage

```
              North: Intelligence (Sage)
                         /\
                        /  \
                       /    \
West: Eloquence *----o----* East: Courage
      (Jester)       \    /      (Hero)
                      \  /
                       \/
              South: Empathy (Caregiver)
```

The system dynamically renders this diamond on a local **SVG Radar Chart**. If the user's diamond is lopsided, certain system actions (e.g., "Persuade Child" or "Negotiate Boundary") are disabled or "grayed out" in their active quest log, forcing them to balance their shape.

### 2.3 Chapters 6–8: The Campaign (Hero, Outlaw, Edge Lord, Best Self)

The user's level of progression is managed via a **deterministic client-side state machine**:

| Level | Archetype | Characterization | Socratic Focus |
|-------|-----------|-------------------|----------------|
| 1 | **The Hero** (Passive / The Object) | High environmental sensitivity, low autonomy | Basic boundary-setting |
| 2 | **The Outlaw** (Active / The Force) | High willpower, high systemic friction ("Glass Cannon" build) | Burnout prevention, vocal jitter tracking |
| 3 | **The Edge Lord** (The Observer / Single-Player) | Dis-identification | Monitor own thoughts as system logs, edit belief code |
| 4 | **The Best Self** (Integration / Wu Wei) | Final synthesis | Harmonize Empathy + Drive, low-friction background flow |

### 2.4 Chapters 9–11: Stewardship, Ownership, and The Antenna

These three skills are designed as the foundational UI/UX drivers:

- **Stewardship (Attention Currency):** The application acts as a "Quiet Field." Zero social features, zero external notifications, zero transactional elements. The UI leverages Cognitive Load Theory to minimize split-attention.

- **Ownership (The Great Recycler):** The WebLLM parses the client's past trauma and rejections. It acts as an alchemical recycling engine, extracting raw Experience Points (XP) and skills. These are immediately written to local Google Doc templates (resumes, cover letters, portfolio projects) via the Google Drive API.

- **The Antenna (Vulnerability / Kintsugi):** The non-custodial local-first architecture acts as a "Zero-Trust Sanctuary." By running everything on WebGPU and saving files directly to private Google Drive (`drive.file` scope), the user is completely unmonitored, allowing radical honesty.

### 2.5 Chapters 12–14: The Alchemical Forge (Body, Will, and Fasting)

- **Stress Tempering (The Cold Shower Principle):** If keystroke dynamics or voice stress parameters signal sympathetic nervous system panic, the app guides through a "Manual Override" (Ventral Vagal breathing or cold-exposure timers).

- **Nutritional Alchemy:** Tracks fasting cycles relative to cognitive performance, treating food protocols as Build Constraints (e.g., fasting to clear mental ash before a deep-writing quest).

### 2.6 Chapters 15–17: The Social Forge, The Guild, and Prestige Classes

**The Mirror Mechanic (Indra's Net):** Decentralized WebRTC overlay networks exchange serialized `player_state.json` updates using CRDTs. Peers verify milestone completions via ZKP commitments, without uploading raw private data.

**Prestige Classes (The Specialties):**

| Domain | Class | Focus |
|--------|-------|-------|
| **Mind** | The Oracle | Intuition |
| | The Kabbalist | Mapping |
| | The Hermeticist | Manifestation |
| **Heart** | The Empath | Resonance |
| | The Bard | Narrative |
| | The Templar | Devotion |
| **Body** | The Druid | Symbiosis |
| | The Catalyst | Breath |
| | The Cultivator | Vitality |
| **Action** | The Artificer | Imbuing |
| | The Technomancer | Systems |
| | The Adept | Intensity |

---

## SECTION 3: LEGAL, COMPLIANCE, AND FINANCIAL STRUCTURES

### 3.1 Non-Custodial Compliance-by-Design

By removing the central database completely, the legal status of data controllership shifts to the user's local device:

| Regulation | Compliance Mechanism |
|------------|---------------------|
| **GDPR / CCPA** | Complete data sovereignty. Clearing local storage = permanent erasure |
| **HIPAA** | Bypasses BAAs — zero PHI transmitted across networks |
| **FERPA & COPPA** | Student records isolated in private Google Drive containers |
| **WIOA** | Local scripts compile client attributes into downloadable state compliance reports |

### 3.2 FOSS Financial Model

- **Operational Cost:** $0.00 per user
- Static SPA hosted on free platforms (GitHub Pages, Netlify, Vercel)
- WebLLM handles inference via local WebGPU/WASM
- Private Google Account handles storage via Google Drive
- **Infinite scaling at zero hosting, database, or API token costs**

---

## SECTION 4: STAKEHOLDER WORKFLOWS & TECHNICAL SCHEMAS

### 4.1 The Core Player State JSON Schema

Complete unified data state stored in `/.phonethagoras/player_state.json` in the user's private Google Drive:

```json
{
  "player_id": "uuid-mj-28",
  "archetype_build": "Techno-Druid-In-Training",
  "demographics_private": {
    "narrative_context": "Transitioning veteran, currently in substance recovery"
  },
  "attribute_matrix": {
    "intelligence_sage": 65,
    "courage_hero": 85,
    "empathy_caregiver": 40,
    "eloquence_jester": 30
  },
  "virtue_topology_gravity": {
    "autonomy_sovereignty": 0.80,
    "relatedness_tribe": 0.35,
    "competence_mastery": 0.55
  },
  "active_campaign": {
    "current_level": "Edge Lord (Observer Mode)",
    "current_quest": "Metabolic and Attention Stewardship Reset",
    "commitment_contract": {
      "contract_id": "contract-01",
      "self_directed_goal": "Maintain a 16-hour daily fasting window and execute 3-minute cold showers to stabilize the Ventral Vagal nervous system.",
      "milestones": [
        {
          "step": 1,
          "action": "Clean the 'Forge' via physical fasting",
          "completed": true,
          "timestamp": "2026-06-03T08:00:00Z"
        },
        {
          "step": 2,
          "action": "Execute manual override of sympathetic panic (cold shower)",
          "completed": false,
          "timestamp": null
        }
      ]
    }
  },
  "local_sensor_telemetry": {
    "attention_stewardship_score": 0.90,
    "armor_density_vulnerability": 0.30
  }
}
```

### 4.2 The "Help/Up" Sorting Algorithm (The Coach's Dashboard)

```javascript
function sortCaseload(players) {
  return players.map(player => {
    const autonomy = player.virtue_topology_gravity.autonomy_sovereignty;
    const competence = player.virtue_topology_gravity.competence_mastery;
    const attention = player.local_sensor_telemetry.attention_stewardship_score;
    const milestones = player.active_campaign.commitment_contract.milestones;
    
    const completedSteps = milestones.filter(m => m.completed).length;
    const complianceRate = completedSteps / milestones.length;

    // Readiness Score Formula
    const readinessScore = (autonomy * 0.4) + (competence * 0.3) + (complianceRate * 0.3);

    return {
      ...player,
      readinessScore,
      actionRequired: readinessScore >= 0.75 ? "UP" : readinessScore < 0.40 || attention < 0.5 ? "HELP" : "HOLD"
    };
  }).sort((a, b) => b.readinessScore - a.readinessScore);
}
```

---

> *This master document forms the absolute, unyielding architectural and pedagogical blueprint for the development of phonethagoras.com. By resolving the critical tension between absolute data privacy and automation, it bridges modern edge-computing with the deep, timeless science of self-determination.*
