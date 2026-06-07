# DESIGN.md - The Engineering & Instructional Blueprint

> **[CORE DIRECTIVE]**
> This document governs the technical architecture and instructional design patterns of Phonethagoras. All codebase contributions, distribution strategies, and user interface implementations must execute the exact specifications defined here.

---

## 1. Architectural Strategy: Agnostic Distribution

Phonethagoras is designed with a bifurcated architecture: the **Lightweight Engine** and the **Heavy Weights (AI)**. Because the core engine requires minimal overhead, the system must remain structurally agnostic to allow for universal accessibility.

### I. The Lightweight Engine (HTML/JS/CSS)
The foundational User Interface and interaction logic are engineered as a strictly local client. It does not require a centralized backend server for computation or data retention. The UI is built to be modular, fast, and entirely offline-capable.

### II. The Dual-Tier Deployment & VRAM Constraints
The system achieves "dual-boot" capabilities, scaling mathematically based on hard hardware limits (VRAM constraints):
- **Tier 1: The Web Domain (PWA/WASM):** Restricted to a strict **1.5 GB VRAM** ceiling to prevent browser tab crashes. This tier utilizes the Native OS for Speech-to-Text (0 MB), ONNX Kokoro for TTS (150 MB), and a highly optimized 350M–500M parameter model via WebLLM (~300 MB). This guarantees zero-friction access on 95% of global devices.
- **Tier 2: The Native Apps (Tauri/NDK):** Packaged via Tauri for Android (.apk) and Apple (.ipa). Bypassing the browser allows access to **4 GB to 8+ GB of VRAM** via native Vulkan/Metal graphics APIs. This tier unlocks massive 8B+ parameter models (The Professor / Llama 3) for deep vector search and profound reasoning, running entirely offline without network reliance.

---

## 2. Instructional Design: The Dual-Language Translation Protocol

The primary engineering challenge of Phonethagoras is bridging the gap between engaging user experience and rigid institutional requirements. This is solved via the **Dual-Language Translation Protocol**.

### The Input Layer (LitRPG)
The user interacts with the system exclusively through the lens of a Literary Role-Playing Game. Inputs regarding mental health, career objectives, and physical well-being are tracked as Attributes (Mind, Heart, Body, Act) and Quests. 

### The Output Layer (WIOA / Institutional Compliance)
The local AI (Zen Zuse) acts as an instructional translation engine. 
- When a user initiates a "Party Sync" or generates an "Artifact," the AI processes the raw LitRPG data.
- The output is synthesized into professional, structured documentation compliant with the **Workforce Innovation and Opportunity Act (WIOA)** or Veterans Affairs (VA) standards.
- This ensures that a Case Worker or Mentor receives a highly actionable, professionally formatted Situation Report (SitRep) while the user remains completely immersed in their narrative framework.

---

## 3. Interaction Mechanics: Voice Supremacy

Phonethagoras is engineered as a **spoken-word engine**. The Graphical User Interface (GUI) exists secondarily to support the Voice User Interface (VUI).

### Speech-to-Text (STT) and Text-to-Speech (TTS)
- **STT Integration:** Utilizes native Web Speech API and local transcription engines to ensure immediate, frictionless capture of user input. 
- **TTS Integration:** Deploys the Kokoro neural TTS model. The architecture features a tiered fallback system (Tier 0: ONNX WASM, Tier 1: Local Sidecar, Tier 2: Native OS Synthesis) to guarantee vocal output regardless of the user's connection status or hardware capability.
- **Hands-Free Operation:** The instructional design mandates that the user must be able to operate the application entirely via voice while walking or engaging in somatic regulation, minimizing screen-induced cognitive load.

---

## 4. Network Design: The Zero-Server Alliance

In adherence to the Claim of Sovereignty (see `IDENTITY.md`), Phonethagoras utilizes existing decentralized communication channels rather than proprietary database architecture.

### The WhatsApp Bridge
- Peer-to-Peer communication (Party Syncs) bypasses traditional webhooks and Application Programming Interfaces (APIs).
- The system generates URL-encoded deep-links (e.g., `https://wa.me/`) loaded with the translated WIOA reports.
- Upon execution, the application hands the payload directly to the user's native WhatsApp client. This guarantees end-to-end encryption, utilizes a globally accessible network with zero barrier to entry, and ensures that the Phonethagoras system maintains zero retention of the transmitted data.
