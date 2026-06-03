# 🚃 THE META MATURATION MAP
### *A Unified Governance Plan for Graph-Based Slide Delivery & Cross-Platform Sovereign Gamutainment*

> **Updated:** May 20, 2026  
> **Author:** Joshua Atkinson (Platform Architect) & Antigravity (Co-Pilot)  
> **Status:** **PLAN-TO-PLAN (Approved)** — Precedes the Master Design Document  

---

## 0. THE VISION: The "Frictionless Sandbox"

We are officially decommissioning the VR 3D NPC sandbox as our entry point. It was a beautiful technical experiment, but it suffered from massive scope creep and required high-spec local GPUs. 

The **actual gold** is a **Choose-Your-Own-Adventure slide graph**.

In this architecture, a curriculum is represented as a directed graph of interactive slides. The student is exposed to a single focused subject at a time, encapsulated by exactly **one story segment, one backing song/tone, one ambient image, and one "subject power word."** 

By collapsing the complexity into a lightweight, JSON-serializable `StoryGraph`, we can compile it into a single-binary Rust webapp *and* easily port it to a **native Android app in Kotlin** using Jetpack Compose and Gemini in Android Studio.

---

## 1. THE INFORMATION DELIVERY FRAMEWORK
*How, when, and in what format do we deliver information to optimize cognitive load?*

```
                 [SOMATIC BASELINE]
                         │ (Ventral Vagal Gate)
                         ▼
┌──────────────────────────────────────────────────┐
│ 1. PERCEIVE: The Sensory Phase (What & How)       │
│    Format: Ambient Image (Visual) + Tone (Audio) │
│    Goal: Establish emotional and somatic safety  │
└────────────────────────┬─────────────────────────┘
                         │ (Pitch-Gate Unlock)
                         ▼
┌──────────────────────────────────────────────────┐
│ 2. EMBODY: The Kinesthetic Phase (When)          │
│    Format: PLING! Mic Feedback / Breath Monitor  │
│    Goal: Active vocal-motor neural integration   │
└────────────────────────┬─────────────────────────┘
                         │ (Success / Skip)
                         ▼
┌──────────────────────────────────────────────────┐
│ 3. EXPRESS: The Decision Phase (Format)         │
│    Format: Glassmorphic Branching Choices        │
│    Goal: Metacognitive exploration & Bevy update │
└──────────────────────────────────────────────────┘
```

### 1.1 The "What": The Semantic Unit
To prevent cognitive overload (CLT), every slide delivers exactly **one conceptual payload**:
*   **The Story (Text)**: 2–3 sentences establishing context, setting, and dialogue. Avoids paragraphs of boring instructional prose.
*   **The Song (Audio)**: A specific backing track or reference frequency. It creates a somatic anchor for pitch-gated learning.
*   **The Image (Visual)**: A single artwork with semi-transparent layering (35% opacity, soft blur) to suggest a sense of place without visually distracting the student.
*   **The Power Word (Semantic)**: The core vocabulary word (VAAM) or pedagogical concept being taught.

### 1.2 The "When": Somatic Gating
Information is not delivered on a timer. It is delivered based on **somatic readiness**:
*   **The Breath Gate**: The student's breathing must stabilize before the active phase opens.
*   **The Pitch Gate (PLING!)**: The student must hear the reference tone, internalize it, and sing/hum it back into the microphone. This active vocal-motor step acts as a "neurological handshake" that proves presence before the choices are revealed.
*   **The Reflection Gate**: After making a decision, the student is given a silent reflection window to process the consequences of their action before the next node is loaded.

### 1.3 The "How": State Transitions
Every slide transitions slowly through four specific states, using anti-dopamine, deliberately slowed animations (Framer Motion / custom CSS):
1.  `Intro`: The background image fades in, the song starts playing, and the setting text is rendered.
2.  `Listening`: The reference tone is played. The microphone icon glows softly.
3.  `Gate`: Real-time pitch-matching feedback (the pitch needle).
4.  `Choose`: The pitch gate passes (or is skipped), and the glowing glassmorphic choice cards slide up.

---

## 2. THE WORKSPACE PORTABILITY STRATEGY
*How the single JSON-serializable StoryGraph runs across Web, Desktop, and Android.*

Because the entire game loop is governed by a lightweight graph of nodes, we can serialize any learning quest into a standard JSON file. This allows identical curriculum content to be executed across all workspaces:

```
                          ┌───────────────────────────┐
                          │    Visual Authoring Tool  │
                          │   (day_dream NodeCanvas)  │
                          └─────────────┬─────────────┘
                                        │ exports
                                        ▼
                          ┌───────────────────────────┐
                          │   StoryGraph JSON Model   │
                          └─────────────┬─────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │    RUST / LEPTOS     │   │      BEVY / ECS      │   │    KOTLIN / COMPOSE  │
 │  (day_dream Client)  │   │  (day_dream Backend) │   │     (Phone App)      │
 │  Renders WASM slides │   │ Updates virtues and  │   │ Native Jetpack UI,   │
 │  in web browser      │   │ cognitive load state │   │ Android pitch gate   │
 └──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

### 2.1 The Common Rust Model (`common`)
The `StoryGraph` JSON acts as the single source of truth. We serialize:
*   Nodes with positions (`x`, `y`), content, and media assets.
*   Branching paths where choices map directly to target scene IDs (`leads_to`).
*   Optional pitch gates (`target_freq`) that require somatic unlocking.

### 2.2 The Android Kotlin Bridge
The same JSON can be loaded into an **Android Studio Kotlin project**.
*   **Jetpack Compose**: We can build a gorgeous, premium UI that reads the JSON nodes and renders them as interactive cards.
*   **Gemini in Android Studio**: Can be used to quickly generate the Kotlin voice/pitch detection algorithms (using Android's `AudioRecord` API) to replicate the PLING! pitch gate natively.
*   **Zero-Cloud Portability**: An APK built this way is self-contained, fully offline, and highly secure.

---

## 3. THE REBIRTH ROADMAP: Six Milestones of Execution

To bring Daydream to life as a market-ready homeschool product, we will follow these structured milestones:

| Milestone | Phase | Deliverable | Status |
|-----------|-------|-------------|:------:|
| **Milestone 1** | **Planning** | Master Design Document (`implementation_plan.md`) | ✅ **Done** |
| **Milestone 2** | **Wave 1** | Enriched Rust data structures in `common` + Axum save/load JSON API | ✅ **Done** |
| **Milestone 3** | **Wave 2** | Visual node canvas, property panels, Bezier connections | ✅ **Done** |
| **Milestone 4** | **Wave 3** | Somatic Adventure Player with pitch gate, PLING!, waveform visualizer | ✅ **Done** |
| **Milestone 5** | **Wave 4** | Bevy ECS virtue topology bridge (`POST /api/quest/action`) | 🔄 **In Progress** |
| **Milestone 6** | **Android** | Android Kotlin integration guide for JSON model compilation | 🔲 |
| **Milestone 7** | **Clean** | Archive legacy modules, verify 100% stable compilation | 🔄 **Started** |

---

## 4. IMMEDIATE NEXT STEP

I will proceed to **Milestone 1** and generate the **Master Design Document** in `implementation_plan.md` in the workspace directory. 

This document will outline the exact file edits, schema additions, API updates, and visual components required to begin executing Wave 1. 

> [!TIP]
> **We have successfully cleaned the workspace repo (10K+ lines of debris deleted) and committed it.** We are in a perfect, clean state to start building this new visual, branching adventure sandbox. Let's do it!
