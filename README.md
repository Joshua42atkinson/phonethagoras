# Phonethagoras

**A private, offline-first AI life coach that runs entirely in your browser.**

---

Phonethagoras is a free, open-source life management tool built for people navigating hard transitions — veterans entering the civilian workforce, people in recovery, anyone rebuilding. It combines Socratic coaching, resume building, and gamified self-mastery into a single app that fits in 4GB of memory and never sends your data anywhere.

Your stories, your struggles, your progress — all of it stays on your device. Period.

## Why This Exists

Most "AI life coach" apps want your data, your subscription, and your attention. Phonethagoras wants none of those things. It's a tool, not a product. It runs offline after one visit. It works on a cheap Android phone. It speaks English and Spanish. And it's built by people who've sat across the desk from someone trying to explain a ten-year gap on their resume.

## Features

### ✅ Working Now

- **Socratic AI Coach** — Conversational guidance with built-in crisis detection (988 Suicide & Crisis Lifeline, 211 community resources)
- **Voice Input/Output** — Speech-to-text and text-to-speech with hands-free mode, because sometimes you're driving or your hands are full
- **Character Sheet** — Track personal growth across Mind, Heart, Body, and Act stats using RPG-style mechanics
- **S.I.L.K. Resume Engine** — Extract real, transferable skills from personal narratives ("I managed a crew of 12 on night shift" → Leadership, Team Management, Operations)
- **Box Breathing** — Guided breathing exercises with optional binaural tones for anxiety and focus
- **Mentorship Portal** — Weekly check-in reports for case managers, coaches, and mentors
- **WIOA Intake Autofill** — Voice-guided questionnaire that pre-fills Workforce Innovation and Opportunity Act forms
- **PWA Installable** — Add to your phone's homescreen, use it like a native app
- **Bilingual** — English + Spanish

### 🔜 Coming Soon

- **In-Browser AI Inference** — Local LLM via Wllama/GGUF models (no server, no API keys)
- **Specialized AI Personas** — Professor (learning), Nurse (wellness), Scout (career), Storyteller (narrative therapy)
- **LitRPG Game Mode** — Vocabulary building and skill challenges wrapped in a lightweight RPG framework

## Who This Is For

- **Veterans** in career transition who need help translating military experience into civilian resume language
- **People in recovery** who want a private, judgment-free space to track personal growth
- **Case managers and career coaches** who need a tool they can hand to a client and say "use this between our meetings"
- **Anyone** who wants a private AI assistant that actually respects their data

## Tech Stack

No build tools. No npm. No frameworks. Just the browser.

| Layer | Technology |
|-------|-----------|
| UI | Vanilla HTML / CSS / JS |
| Speech | Web Speech API (STT + TTS) |
| Storage | localStorage + IndexedDB |
| Offline | Service Worker (network-first with cache fallback) |
| AI (planned) | [Wllama](https://github.com/nicehash/nicehash-wllama) for GGUF model inference in-browser |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/Joshua42atkinson/phonethagoras.git
cd phonethagoras

# Serve locally (any static server works)
npx serve src

# Or use Python
python3 -m http.server 8000 --directory src

# Or just open src/index.html in Chrome or Edge
# (Service Worker requires a server for full offline support)
```

Once loaded, tap the browser's "Install" or "Add to Home Screen" prompt to pin it as an app.

## Architecture

Phonethagoras uses a **Hand architecture** — one hub page with four spoke pages, like fingers on a hand.

```
src/
├── index.html          ← Hub (main app, all core features)
├── models.html         ← Spoke launcher / model gallery
└── models/
    ├── professor.html  ← Learning & education AI persona
    ├── nurse.html      ← Wellness & health AI persona
    ├── scout.html      ← Career & exploration AI persona
    └── storyteller.html← Narrative therapy AI persona
```

**Why separate HTML pages instead of a single SPA?** Memory. Each AI persona will eventually load its own GGUF model, and on a 4GB device, you can't keep multiple models in VRAM simultaneously. Separate pages let the browser fully unload one model before loading another. The hub stores shared state in `localStorage` under the key `zen_book`, and spokes read from it.

The Service Worker caches all pages on first load, so switching between personas works offline with no network requests.

## Project Structure

```
phonethagoras/
├── src/
│   ├── index.html           # Main application
│   ├── models.html          # Persona gallery
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Offline caching
│   ├── icon-192.svg         # PWA icon (small)
│   ├── icon-512.svg         # PWA icon (large)
│   ├── css/                 # Stylesheets (base, layout, components, views, utilities)
│   ├── js/                  # Application modules
│   │   ├── app.js           # Main entry point
│   │   ├── ai.js            # AI conversation engine
│   │   ├── voice.js         # Speech-to-text / text-to-speech
│   │   ├── breath.js        # Box breathing exercise
│   │   ├── state.js         # State management (localStorage)
│   │   ├── quest.js         # Gamification / quest system
│   │   └── ...              # And more
│   └── models/              # AI persona spoke pages
├── README.md
└── LICENSE
```

## Contributing

Contributions are welcome. This is a GPL-3.0 project — your improvements stay open.

**Good first contributions:**
- Accessibility improvements (screen reader support, keyboard navigation)
- Additional language translations
- UI/UX polish on mobile
- Documentation and tutorials

**Before you start:**
1. Check [open issues](../../issues) for something that interests you
2. For larger changes, open an issue first to discuss the approach
3. Keep it vanilla — no build tools, no npm dependencies, no frameworks

## Design Notes

- **Dark theme** — Background `#0a0f19`, accent `hsl(38, 92%, 56%)` (warm gold)
- **Mobile-first** — Designed for phones, works on desktop
- **4GB budget** — Every feature is weighed against memory cost
- **Privacy by architecture** — There is no server to breach. Your data literally cannot leak because it never leaves your browser.

## A Note on Crisis Detection

Phonethagoras includes basic crisis keyword detection. When it senses someone may be in distress, it surfaces the **988 Suicide & Crisis Lifeline** and **211** community resources. This is not a substitute for professional help — it's a guardrail. If you or someone you know is in crisis, please call or text **988**.

## License

[GPL-3.0](LICENSE)

---

*Built with care for people who deserve better tools.*
