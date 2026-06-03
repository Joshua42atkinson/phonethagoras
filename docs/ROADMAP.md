# Phonethagoras Development Roadmap

> Epoch: Summer 2026

---

## Phase 0: Foundation (Current)
- [x] Master Systems Spec authored
- [x] Player State JSON Schema formalized
- [x] Project workspace scaffolded
- [ ] Landing page / SPA shell (index.html + CSS + JS)
- [ ] SVG Radar Chart component (Attribute Matrix diamond)
- [ ] Local player_state.json read/write (localStorage → IndexedDB)

## Phase 1: Core Cognitive Engine
- [ ] DHMC hardware profiler (WebGPU/WASM detection + model tiering)
- [ ] WebLLM integration (model loading, Cache Storage API persistence)
- [ ] Socratic System Prompt library (initial diagnostic, Ontological Inversion)
- [ ] Local RAG pipeline for journal/narrative ingestion

## Phase 2: Data Ingestion Layer
- [ ] Web Speech API integration (real-time voice capture)
- [ ] Keystroke dynamics engine (typing cadence, cognitive load proxy)
- [ ] Voice stress analysis (vocal jitter detection for burnout warning)
- [ ] Forge Reset tool (Ventral Vagal breathing timer, cold-exposure timer)

## Phase 3: Game Systems
- [ ] Campaign state machine (Hero → Outlaw → Edge Lord → Best Self)
- [ ] Quest engine (active quest log, milestone tracking)
- [ ] Commitment contract system (self-directed goals + milestones)
- [ ] Polarity logic (action gating based on lopsided attribute diamonds)
- [ ] Prestige class selection (12 specialties across Mind/Heart/Body/Action)

## Phase 4: Workspace Sync
- [ ] Google OAuth 2.0 (drive.file scope)
- [ ] player_state.json ↔ Google Drive serialization
- [ ] Template Populate Engine (Google Docs/Sheets for resumes, portfolios)
- [ ] The Great Recycler (XP extraction → document generation)

## Phase 5: Coach's Bridge
- [ ] Coach dashboard (read synced player states)
- [ ] Help/Up sorting algorithm
- [ ] Caseload priority view (UP / HOLD / HELP badges)
- [ ] WIOA compliance report generator

## Phase 6: Peer-to-Peer Trust Mesh
- [ ] WebRTC peer discovery (local Wi-Fi / WebTorrent)
- [ ] CRDT state synchronization (player_state.json merging)
- [ ] Zero-Knowledge Proof milestone commitments
- [ ] The Mirror mechanic (mutual reflection interface)

## Phase 7: Polish & Deploy
- [ ] PWA manifest + service worker (full offline capability)
- [ ] Static deployment (GitHub Pages / Netlify / Vercel)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance audit (Core Web Vitals)
- [ ] Documentation site

---

## Build Priorities (What to tackle first)

1. **The Radar Chart** — It's the visual centerpiece. Getting the SVG diamond rendering with live attribute data gives us something tangible and impressive immediately.
2. **Local State Engine** — player_state.json in IndexedDB with read/write. This is the data backbone everything else plugs into.
3. **DHMC + WebLLM** — The AI core. Hardware detection → model loading → first Socratic prompt.
4. **Everything else** builds on top of those three pillars.

---

*Updated: 2026-06-03*
