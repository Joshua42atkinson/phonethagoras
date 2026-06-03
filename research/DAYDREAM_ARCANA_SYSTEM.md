# ARCANA System Architecture — The Complete Game Engine

> **Fine-tuning AI teaches us how to fine-tune people.**
> The same systems management that makes a LoRA adapter work is what makes VAAM work.

---

## The Core Parallel: AI Training = Human Learning

| AI Fine-Tuning | VAAM Human Learning | Game Mechanic |
|---|---|---|
| Base model | Student's prior knowledge | Starting deck |
| Training dataset | Curriculum (ARCANA library) | Card collection |
| LoRA adapter | SpellBook (targeted mastery) | Equipped deck |
| Batch size | Hand size (3-5 active cards) | Cards in hand |
| Epochs | Re-encounters across sessions | Card replay |
| Learning rate | Pacing (new word introduction speed) | Draw rate |
| Data augmentation | Genre skinning (same content, different story) | Setting swap |
| Curriculum learning | Stages (Hero→Outlaw→EdgeLord→BestSelf) | Card rarity |
| Multi-task learning | Multi-channel (Mind/Heart/Body/Action) | Card elements |
| Loss function | Depth prompts (Socratic questions) | Dig Deeper |
| Overfitting | Definition memorization | ❌ No mastery credit |
| Generalization | Using word in new contexts | ✅ Full mastery |
| Temperature | Player agency (swipe choices) | Branching paths |
| Evaluation | CharacterSheet attunement scores | Player stats |

---

## The Dual DAG Architecture

Two graphs power every curriculum. Same vocabulary, different experiences.

### DAG 1: VAAM Graph (What To Learn)
```
Nodes = Words (spell cards)
Edges = Meaning prerequisites
Properties = Channel, Stage, Symbols, Grammar Role
```
- **Owned by:** The instructor/parent (curriculum author)
- **Purpose:** Defines WHAT vocabulary to teach and HOW words relate
- **Example:** "Resilience" requires walking through "Patience" first
- **Immutable per curriculum** — the learning content never changes

### DAG 2: Story Graph (How To Experience It)
```
Nodes = Story moments / scenes
Edges = Branching choices (swipe directions)  
Properties = Genre, Mood, Setting, Emotional Tone
```
- **Owned by:** The genre template (fantasy, sci-fi, noir, etc.)
- **Purpose:** Wraps the same vocabulary in different narrative experiences
- **Example:** "Resilience" as crossing a canyon (fantasy) OR repairing a hull breach (sci-fi)
- **Swappable** — student picks their genre, keeps the same learning

### How They Layer
```
┌─────────────────────────────────────┐
│  GENRE TEMPLATE (Story DAG)         │  ← Student chooses
│  Fantasy / Sci-Fi / Noir / Ghibli   │
├─────────────────────────────────────┤
│  VOCABULARY (VAAM DAG)              │  ← Instructor authors  
│  Words, Channels, Stages, Symbols   │
├─────────────────────────────────────┤
│  GAME ENGINE (Bevy ECS)             │  ← We build
│  Deck, Hand, Swipe, Mastery         │
└─────────────────────────────────────┘
```

---

## TCG Card Properties

### Card Anatomy
```
┌──────────────────────────┐
│ ◆ RESILIENCE        ★★  │  ← Name + Stage stars
│ [Action] [🟡 Gold]       │  ← Channel + Color
├──────────────────────────┤
│                          │
│      [CARD ART]          │  ← LongCat generated
│                          │
├──────────────────────────┤
│ "The bridge holds if     │
│  you keep walking."      │  ← Story text (flavor)
├──────────────────────────┤
│ ◆Noun  △Adj  Power: 3   │  ← Symbols + SpellPower
│ Synergy: Patience +2     │  ← Synergy bonus
└──────────────────────────┘
```

### Symbols (Grammar/Semantic Markers)

Symbols represent how a word FUNCTIONS in meaning-making:

| Symbol | Name | Grammar Role | Game Effect |
|--------|------|-------------|-------------|
| ◆ | Stone | Noun (entity/thing) | Can be "placed" — persists on field |
| ◇ | Spark | Verb (action/process) | Can be "cast" — one-time effect |
| △ | Prism | Adjective/Adverb (modifier) | "Attaches" to another card, boosting it |
| ○ | Void | Abstract concept | "Resonates" with any card type |
| ☆ | Star | Proper noun / key term | "Anchors" a synergy chain |

**Why symbols matter:** They teach grammar implicitly. A student learns that "Resilience" (◆ Stone) behaves differently than "Resilient" (△ Prism) — same root, different function. The game mechanic IS the grammar lesson.

### Rarity (Derived from Stage)

| Stage | Rarity | Draw Frequency | Mastery Required |
|-------|--------|---------------|-----------------|
| Hero ★ | Common | Appears often | Low — absorb through story |
| Outlaw ★★ | Uncommon | Moderate | Medium — must push back |
| EdgeLord ★★★ | Rare | Infrequent | High — metacognitive reflection |
| BestSelf ★★★★ | Legendary | Very rare | Synthesis — connect prior words |

### Card Types

| Type | Purpose | Example |
|------|---------|---------|
| **Spell Card** | Core vocabulary | "RESILIENCE" — the word to learn |
| **Setting Card** | Change atmosphere | "STORM" — shifts mood to tense |
| **Ally Card** | Synergy partner | Patience + Resilience = +2 bonus |

---

## Deck + Hand Mechanics

### The Loop
```
SESSION START
    │
    ▼
┌─ DRAW ──────────────────────────────────┐
│ Draw cards from Deck into Hand (max 5)  │
│ Cards drawn based on DAG position +     │
│ synergy with current story moment       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─ PLAY ──────────────────────────────────┐
│ Student sees their Hand of 3-5 cards    │
│ Swipe RIGHT on a card = CAST it         │
│ Swipe LEFT = DISCARD (skip)             │
│ Swipe DOWN = STUDY (dig deeper first)   │
│ DOUBLE TAP = go deeper (Socratic)       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─ RESOLVE ───────────────────────────────┐
│ The played card takes effect:           │
│   Story text changes to match word      │
│   Setting shifts to word's Channel mood │
│   SpellPower increases                  │
│   Synergy bonuses calculated            │
│   CharacterSheet updated                │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─ DRAW AGAIN ────────────────────────────┐
│ Refill hand from deck                   │
│ If deck empty → SESSION REVIEW          │
└─────────────────────────────────────────┘
```

### Synergy System

When cards share synergy links, playing them together creates bonuses:

```
Patience (Body) + Resilience (Action) = "Steadfast" synergy
  → Both cards get +1 SpellPower
  → Student sees: "Your patience became your strength."
  → CharacterSheet: Body+Action attunement rises
```

This teaches that words don't exist alone — meaning is relational.

---

## The Curriculum Builder (Arcana Builder)

### Input → Output
```
INPUT:  Textbook PDF / curriculum doc / word list
OUTPUT: curriculum.json (VAAM DAG) + genre templates
```

### Pipeline Stages

```
1. EXTRACT ──────────────────────────────────
   Input: Raw text / PDF
   Output: Word list with context sentences
   Method: NLP tokenization + frequency analysis
   Gate: Instructor reviews extracted words

2. CLASSIFY ─────────────────────────────────
   Input: Word list
   Output: Channel + Stage assignments
   Method: Semantic analysis:
     - Emotional/relational words → Heart
     - Analytical/pattern words → Mind
     - Somatic/sensory words → Body
     - Action/creation words → Action
     - Common/foundational → Hero stage
     - Complex/rare → higher stages
   Gate: Instructor reviews classifications

3. CONNECT ──────────────────────────────────
   Input: Classified words
   Output: DAG edges (prerequisites + synergies)
   Method: Co-occurrence analysis + semantic similarity
     - Words that appear in same context → synergy
     - Words that define each other → prerequisite edge
     - Shared themes → thematic cluster
   Gate: Instructor reviews graph structure

4. SYMBOLIZE ────────────────────────────────
   Input: Connected DAG
   Output: Grammar symbols per word
   Method: POS tagging + semantic role analysis
     - Nouns → ◆ Stone
     - Verbs → ◇ Spark
     - Adjectives/Adverbs → △ Prism
     - Abstract concepts → ○ Void
   Gate: Instructor reviews symbol assignments

5. NARRATE ──────────────────────────────────
   Input: Symbolized DAG
   Output: Story text + depth prompts per word
   Method: LLM generation (fine-tuned Gemma per curriculum)
     - Generate story_text for each word
     - Generate depth_prompt (Socratic question)
     - Generate per-genre variants
   Gate: Instructor reviews narrative quality

6. ILLUSTRATE ───────────────────────────────
   Input: Narrated DAG
   Output: Card art per word (4 mastery levels)
   Method: LongCat-Image via ARCANA Forge pipeline
   Gate: Art quality review (existing forge.py gates)

7. EXPORT ───────────────────────────────────
   Output: curriculum.json + cards/*.png
   Ready for: Bevy engine loading
```

### Example: Biology Textbook → ARCANA

```
Input: Chapter on Cell Biology

Extracted words:
  mitochondria, membrane, nucleus, cytoplasm, ATP,
  organelle, diffusion, osmosis, homeostasis, enzyme

Auto-classified:
  mitochondria → Body/Hero ◆ (physical structure, foundational)
  membrane     → Body/Hero ◆ (physical structure)
  ATP          → Action/Outlaw ◇ (energy process)
  diffusion    → Action/Hero ◇ (movement process)
  homeostasis  → Mind/BestSelf ○ (abstract synthesis concept)
  enzyme       → Action/EdgeLord ◇ (complex process)

Auto-connected DAG:
  membrane → diffusion → osmosis → homeostasis
  mitochondria → ATP → enzyme
  (cross-link: ATP → homeostasis)
```

---

## Genre Skinning System

The same VAAM DAG experienced through different Story DAGs:

| Genre | Setting Style | Mood Palette | Story Frame |
|-------|-------------|--------------|-------------|
| **Fantasy** | Castles, forests, magic | Warm/mystical | "You are a wizard learning ancient spells" |
| **Sci-Fi** | Spaceships, planets, tech | Cool/electric | "You are an engineer decoding alien signals" |
| **Noir** | City streets, rain, shadows | Dark/moody | "You are a detective uncovering hidden meanings" |
| **Ghibli** | Nature, spirits, gentle | Soft/hopeful | "You are a child discovering a magical world" |
| **Cyberpunk** | Neon, data, rebellion | Intense/neon | "You are a hacker breaking through firewalls of ignorance" |

### How Genre Skinning Works
```json
{
  "genre": "sci-fi",
  "word_overrides": {
    "Resilience": {
      "story_text": "The hull breach alarm screams. Zero-G pulls at your boots. The repair kit is across the bay — every magnetic step forward is a choice.",
      "setting_image": "spaceship_hull_breach.png",
      "mood": "tense"
    }
  }
}
```

The VAAM DAG stays identical. Only the story wrapper changes.
The depth prompt ("What does resilience feel like in your body?") stays the same across all genres — because the learning objective is genre-independent.

---

## File Structure (Complete System)

```
engine/
├── src/
│   ├── main.rs           # Bevy app entry
│   ├── components.rs     # ECS types (Channel, Stage, Symbols, Deck, Hand...)
│   ├── dag.rs            # VAAM DAG + Story DAG loading
│   ├── deck.rs           # Deck/Hand/Draw/Play mechanics (NEW)
│   ├── input.rs          # Swipe gesture detection
│   ├── render.rs         # Triple Sandwich visuals
│   └── synergy.rs        # Synergy resolution system (NEW)
│
├── arcana/
│   ├── forge.py          # Card art generation pipeline
│   ├── prompts.py        # LongCat prompt builder
│   ├── comfyui_client.py # ComfyUI API wrapper
│   ├── builder.py        # Curriculum→DAG builder (NEW)
│   ├── classifier.py     # Word→Channel/Stage classifier (NEW)
│   ├── curriculum.json   # Current curriculum
│   ├── manifest.json     # Card generation tracking
│   ├── cards/            # Generated card art
│   └── genres/           # Genre template overrides (NEW)
│       ├── fantasy.json
│       ├── sci_fi.json
│       └── noir.json
│
└── docs/
    ├── MASTER_DESIGN_DOC.md
    └── ARCANA_SYSTEM.md   # This document
```

---

## ECS Additions (Rust Components Needed)

```rust
// New symbol system
enum Symbol { Stone, Spark, Prism, Void, Star }

// New card type system  
enum CardType { Spell, Setting, Ally }

// Deck + Hand resources
struct Deck { cards: Vec<Entity>, shuffled: bool }
struct Hand { cards: Vec<Entity>, max_size: usize }
struct DiscardPile { cards: Vec<Entity> }

// Genre/Setting selection
struct GenreTemplate { name: String, overrides: HashMap<String, StoryOverride> }
struct ActiveGenre(String);

// Synergy resolution
struct SynergyBonus { source: String, target: String, bonus: i32, flavor: String }
```

---

## Implementation Priority

| Priority | Component | Depends On |
|----------|-----------|-----------|
| 1 | `builder.py` — Curriculum extractor | Nothing (CPU-only) |
| 2 | `classifier.py` — Channel/Stage/Symbol auto-assign | builder.py |
| 3 | Genre templates JSON schema | Nothing |
| 4 | `deck.rs` — Deck/Hand ECS mechanics | components.rs |
| 5 | `synergy.rs` — Synergy resolution | deck.rs |
| 6 | Card art generation (LongCat) | Unsloth completion |
| 7 | Story DAG loader | Genre templates |
| 8 | Genre skinning in render.rs | Story DAG |
