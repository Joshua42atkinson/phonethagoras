# DAYDREAM — Master Design Document

> **Letters spell words. Words cast spells. The Great Game is the curriculum. Daydream is the engine that runs it.**

**Version:** 0.3.0 — ARCANA System + TCG Mechanics  
**Updated:** May 20, 2026  
**Author:** Joshua Atkinson (Architect) & Antigravity (Co-Pilot)  
**License:** GPL-3.0  

---

## 1. What Daydream IS

Daydream is a **sovereign, local-first meaning-making engine** that teaches vocabulary through experiential narrative, not definitions.

It is **not** a flashcard app. It is **not** a quiz platform. It is a **Choose-Your-Own-Adventure spellbook** where every word is a playable spell card, and mastering it means learning to *cast* that spell — changing your relationship with the concept it represents.

### The Elevator Pitch

> A parent designs a vocabulary curriculum as a graph of word-spells. Their child plays through it as an interactive story. Each word is a card with a mood, a narrative moment, and a Socratic question. The child swipes right to accept, left to reject, down to dig deeper. Their journey through the graph reveals not just what words they know, but *how they think* — which channels of consciousness they favor, which they avoid. The system reflects this back without judgment: an AI mirror.

### Who This Is For

| User | Role | What They Do |
|------|------|--------------|
| **Parent** | Architect | Authors word-DAG curricula using a visual editor. Chooses words, writes stories, sets moods, defines branching paths. |
| **Child** | Player | Plays through the story. Swipes to navigate. Builds a SpellBook of mastered words. Discovers their emergent class. |
| **AI** | Bard | (Future) Generates story text, adapts to the child's patterns, narrates the journey. Fine-tuned Gemma 4 E2B via WebLLM. |

### Why This Matters

The homeschool market is exploding. Parents want tools that:
- Run offline (privacy-first, no cloud dependency)
- Are not standardized-test-obsessed
- Teach *thinking*, not just facts
- Are engaging enough that kids choose to use them
- Give parents visibility into their child's learning patterns

Daydream does all five. The Great Game framework provides the pedagogical depth. The Bevy ECS provides the performance. VAAM provides the differentiation.

---

## 2. The Philosophy: How The Great Game Powers Daydream

Joshua's book *The Great Game* provides the complete game design system. Every element maps 1:1 to engine mechanics:

### 2.1 Core Mechanic: Words Are Spells (VAAM)

**VAAM** (Vocabulary Acquisition Autonomous Meaning) says: a word isn't defined by other words — it's defined by *experience*.

- A **dictionary definition** = reading the spell description in a textbook
- **VAAM mastery** = actually *casting* the spell and feeling what it does
- The DAG ensures you arrive at "Resilience" only AFTER walking through "Courage" or "Patience" — so the word's meaning is **earned through narrative journey**

### 2.2 The Great Recycler = The Core Gameplay Loop

```
ENCOUNTER (see the word) → EXPERIENCE (feel it in a story) → OWN (it enters your SpellBook)
```

This IS The Great Recycler from the book: take junk (confusion/unknown) → process it (narrative experience + choice) → forge new gear (mastered spell). Every word transition in the DAG is the student performing this alchemy.

### 2.3 The Four Channels = Card Element Types

| Channel | Color | Element | Core Question | Word Examples |
|---------|-------|---------|---------------|---------------|
| **Mind** | 🟢 Green | Wood/Sage | "What does this mean?" | Analysis, Bias, Clarity, Framework |
| **Heart** | 🟠 Orange | Fire/Mystic | "Where is the love here?" | Empathy, Courage, Joy, Devotion |
| **Body** | 🔵 Blue | Water/Healer | "What is my body telling me?" | Presence, Patience, Resilience, Breath |
| **Action** | 🟡 Gold | Earth/Builder | "How do I make this real?" | Create, Build, Forge, Steward |

A balanced curriculum uses all four. The system tracks which channels the student engages with (attunement) and which they avoid.

### 2.4 The Four Stages = Mastery Tiers

| Stage | Depth | Student Experience |
|-------|-------|-------------------|
| **Hero** ★ | Absorb | Immersed in the story. Word meaning arrives through narrative. |
| **Outlaw** ★★ | Challenge | The word pushes back. Tension between meaning and assumption. |
| **Edge Lord** ★★★ | Reflect | Metacognitive. The student sees the code behind the story. |
| **Best Self** ★★★★ | Synthesize | The student creates new meaning. Their journey IS the story. |

### 2.5 Emergent Classes

Based on swipe patterns and channel attunement, the student earns an emergent title:

| Dominant Pattern | Class | Description |
|-----------------|-------|-------------|
| Mind-heavy | **The Oracle** | "You ask 'why' more than 'what'" |
| Heart-heavy | **The Bard** | "You live inside the story" |
| Body-heavy | **The Cultivator** | "You listen before you leap" |
| Action-heavy | **The Templar** | "You move forward with conviction" |
| Balanced | **The Architect** | "You build from every direction" |
| Deep-dive heavy | **The Hermeticist** | "You see the code behind the words" |

### 2.6 The Triple Sandwich = Mind/Heart/Body Integration

```
┌─────────────────────────────────────────┐
│  TOP:    Word Card = Mind               │
│          (what is this word?)            │
│                                         │
│  MIDDLE: Story Text = Heart             │
│          (what does it feel like?)       │
│                                         │
│  BOTTOM: Setting Background = Body      │
│          (what's the vibe right now?)    │
└─────────────────────────────────────────┘
```

When all three layers land, the student experiences the word across all channels simultaneously. That's not memorization — that's Flow.

### 2.7 The SpellBook = TCG Collection

Every word the student engages with enters their SpellBook with a mastery level:

- 🔮 **Encountered** — saw the card
- ⚡ **Experienced** — felt it in a story (first "dig deeper")
- 🌟 **Owned** — connected to personal meaning
- 👑 **Mastered** — connected to other words (synergy discovery)

### 2.8 Synergy = The Generation Cycle

Words that share thematic relationships amplify each other. Based on the Five Phases (Wǔ Xíng):

- Mastered **Mind** words → Heart words become easier to feel
- Mastered **Heart** words → Action words become easier to commit to
- Mastered **Action** words → Body words become easier to notice
- Mastered **Body** words → Mind words become easier to think

### 2.9 The ARCANA System = TCG Card Game

**Full details:** [docs/ARCANA_SYSTEM.md](ARCANA_SYSTEM.md)

The ARCANA (word-spell library) adds full TCG mechanics:

**Grammar Symbols** — teach parts of speech through gameplay:
| Symbol | Name | Grammar | Game Effect |
|--------|------|---------|-------------|
| ◆ Stone | Noun | Persists on field |
| ◇ Spark | Verb | One-time cast effect |
| △ Prism | Adjective | Attaches to boost another card |
| ○ Void | Abstract | Resonates with any card type |
| ☆ Star | Key term | Anchors a synergy chain |

**Deck + Hand** — the student draws cards and plays them into the story:
- Draw from Deck → Hand (3-5 cards)
- Swipe RIGHT to cast, LEFT to discard, DOWN to study
- Played cards affect the story, setting, and mastery tracking

**Dual DAG Architecture** — separates content from presentation:
- **VAAM DAG**: What to learn (vocabulary, channels, stages, symbols)
- **Story DAG**: How to experience it (genre, mood, narrative wrapper)
- Same curriculum can be played in Fantasy, Sci-Fi, Noir, etc.

### 2.10 Fine-Tuning People Like AI

The same systems management that trains a LoRA adapter trains a human:
- **Training data** = Curriculum (ARCANA library)
- **LoRA adapter** = SpellBook (focused word mastery)
- **Batch size** = Hand size
- **Data augmentation** = Genre skinning (same content, different presentation)
- **Curriculum learning** = Stages (easy → hard)
- **Evaluation** = CharacterSheet attunement scores

### 2.11 Full Game Mechanics

**See:** [docs/GAME_MECHANICS.md](GAME_MECHANICS.md) for the complete game system:
- **Story Crafting** — player fills word-slots to BUILD their story (no costs, no punishments)
- **Hero's Journey** — Joseph Campbell's monomyth structures every curriculum into 6 chapters
- **Mad Libs Slots** — Setting (◆noun) / Subject (☆term) / Action (◇verb) teach grammar through building
- **Choose Your Own Adventure** — branching paths, different word orders, unique journeys
- **Resonance** — reflective glow when words naturally connect (no scores, just a mirror)
- **The Recycler** — spaced repetition through natural story replay
- **Archetypes** — reflective mirror of how the student creates (no buffs, just self-awareness)


---

## 3. Technical Architecture

### 3.1 Engine Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Engine** | Bevy 0.18 (Rust) | ECS runtime, rendering, state management |
| **Rendering** | Bevy 2D Sprites + Text2d | Triple Sandwich visuals |
| **Data** | Hardcoded → JSON (planned) | Curriculum word-DAG definitions |
| **AI** | WebLLM + Gemma 4 E2B (planned) | Dynamic story generation |
| **Desktop** | Native Rust binary | Authoring environment |
| **Mobile** | WASM → PWA (planned) | Student player experience |

### 3.2 ECS Architecture

```
ENTITIES (Word Spell Cards):
  WordCard        — word, depth_prompt, themes
  Channel         — Mind | Heart | Body | Action
  Stage           — Hero | Outlaw | EdgeLord | BestSelf
  WordEdges       — yes_targets, no_targets (DAG navigation)
  CardStyle       — color (from Channel), mood
  Setting         — mood, genre, background_color
  SpellPower      — mastery level, encounter counts
  SynergyLinks    — partner words, synergy types

RESOURCES (Session State):
  Curriculum      — name, start_word
  StudentTrail    — visited words, swipe history, current entity
  CurrentSlide    — story text, input readiness
  CharacterSheet  — channel attunement, emergent class, stats
  SpellBook       — word collection with mastery levels

STATES:
  Loading → Playing → DepthView → TrailReview
```

### 3.3 File Structure

```
engine/
├── Cargo.toml              # Bevy 0.18 + serde dependencies
├── src/
│   ├── main.rs             # App setup, system registration
│   ├── components.rs       # All ECS types (470 lines)
│   ├── dag.rs              # Curriculum loading + demo data
│   ├── input.rs            # Swipe gesture detection
│   └── render.rs           # Triple Sandwich visuals + trail review
│
└── arcana/                 # ARCANA card generation pipeline (Python)
    ├── forge.py            # Main pipeline with quality gates
    ├── prompts.py          # Channel-aware LongCat prompt builder
    ├── comfyui_client.py   # ComfyUI API wrapper
    ├── builder.py          # Textbook → VAAM DAG builder
    ├── classifier.py       # Word → Channel/Stage/Symbol classifier
    ├── curriculum.json     # Current curriculum data
    ├── manifest.json       # Card generation tracking
    └── cards/              # Generated card art output
```

---

## 4. Current State (What Exists)

### ✅ Complete
- Bevy 0.18 ECS engine compiles and runs (Vulkan/RADV on Strix Halo)
- Full Great Game type system (Channel, Stage, SpellPower, Synergy, CharacterSheet, SpellBook)
- 5-word demo curriculum ("Bias & Mirrors") with channel/stage tagging
- Triple Sandwich rendering with channel-colored cards
- Swipe input (mouse drag + keyboard) with 3 directions
- Depth overlay (Socratic VAAM prompts)
- Mastery tracking (SpellPower updates on swipe, auto-promotion)
- CharacterSheet attunement tracking with emergent class detection
- Trail review with attunement bars, SpellBook summary, class title
- **ARCANA Forge pipeline** — LongCat card art generation with quality gates
- **Curriculum Builder** — textbook → VAAM DAG conversion tool
- **Word Classifier** — auto-assigns Channel/Stage/Symbol/Rarity
- **ComfyUI client** — API wrapper for local image generation

### 🔲 Not Built Yet
- Deck/Hand ECS mechanics in Rust (deck.rs, synergy.rs)
- Genre skinning templates (fantasy, sci-fi, noir)
- JSON curriculum loader in Bevy (replace hardcoded demo)
- SpellBook persistence across sessions (save/load)
- Synergy gameplay impact (links exist but aren't read)
- WebLLM integration (AI narrator / dynamic stories)
- WASM compile target (PWA mobile delivery)
- Card art generation (waiting for Unsloth to finish)
- Fine-tuned Gemma model per curriculum

---

## 5. Roadmap: From Demo to Product

### Phase 1: Framework ✅ DONE
*Build the ECS data model and prove the Great Game maps to code.*

### Phase 2: Curriculum Authoring 🔲 NEXT
*The highest-value missing piece. Without this, only developers can create content.*
- JSON schema for word-DAG curricula
- File-based curriculum loading (replace hardcoded demo)
- Simple CLI or TUI tool for parents to author word graphs
- Validate with 3+ real curricula (different subjects, different Channels)

### Phase 3: Session Persistence 🔲
*Make the SpellBook real. This is the TCG collection hook.*
- Save/load SpellBook to local JSON
- Track mastery across multiple play sessions
- Synergy activation when partner words are both mastered
- CharacterSheet persists and evolves over weeks

### Phase 4: Visual Polish 🔲
*Move from programmer art to something a child would be excited to use.*
- Generated card art (per-word images via image generation)
- Setting background images (mood-driven generation)
- Card animations (swipe, flip, glow on mastery)
- Custom fonts and typography
- Mobile-responsive layout

### Phase 5: AI Narrator (WebLLM) 🔲
*The Bard comes alive.*
- JS harness for Bevy WASM + WebLLM bridge
- Fine-tuned Gemma 4 E2B model per curriculum
- Dynamic story generation based on word + channel + student history
- AI adapts tone to match emergent class

### Phase 6: Mobile Delivery 🔲
*Get it on phones.*
- WASM compile target validation
- PWA wrapper with offline support
- Touch-native swipe gestures
- Service worker for curriculum caching

---

## 6. Competitive Edge

| Feature | Flashcard Apps | LMS Platforms | Daydream |
|---------|---------------|---------------|----------|
| Offline-first | ❌ | ❌ | ✅ |
| Privacy (no cloud) | ❌ | ❌ | ✅ |
| Experiential learning | ❌ | ❌ | ✅ (VAAM) |
| Parent-authored | ❌ | ❌ | ✅ |
| Narrative-driven | ❌ | ❌ | ✅ |
| Meaning through structure | ❌ | ❌ | ✅ (DAG) |
| Student self-awareness | ❌ | ❌ | ✅ (CharacterSheet) |
| On-device AI | ❌ | ❌ | ✅ (WebLLM) |
| Open source | sometimes | ❌ | ✅ (GPL-3.0) |

**The moat is the philosophy.** Anyone can build a word game. Nobody else has a 2000-line self-help book that doubles as a game design document, a ECS-native meaning-making architecture, and a fine-tuned local AI that runs on the student's own hardware.

---

## 7. Design Decisions (Pending)

These are open questions that will shape the next phases:

1. **SpellBook visibility** — Should students see their full collection, or should mastery be felt rather than displayed?
2. **Class revelation** — Should the emergent class be revealed during play, or only at trail review?
3. **Synergy depth** — Full Generation Cycle buffs, or subtle DAG routing weights?
4. **Multi-curriculum** — Can a student's SpellBook span multiple curricula, or is each curriculum a separate save?
5. **Parent dashboard** — How much of the CharacterSheet data should parents see? Channel attunement? Swipe patterns?
6. **AI persona** — Should the narrator embody a Great Game archetype (Bard for Heart curricula, Sage for Mind)?

---

*This document is the single source of truth for the Daydream project. All other planning documents (META_MATURATION_MAP, implementation_plan, brainstorm) are historical artifacts that fed into this.*
