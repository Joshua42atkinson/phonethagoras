# phonethagoras.com

> **The Local-First, Non-Custodial Pedagogical Engine**
>
> A zero-cost, privacy-sovereign learning platform built on WebLLM edge-inference,
> Liquid Foundation Models, and Self-Determination Theory.

## Architecture

```
Browser (100% Client-Side)
├── Data Ingestion Layer      → Web Speech API, Keystroke Dynamics
├── DHMC (Hardware Compiler)  → WebGPU/WASM Model Tiering
├── WebLLM Cognitive Engine   → Liquid LFM, Socratic Prompts, RAG
├── Workspace Sync            → Google Drive (drive.file scope)
└── P2P Trust Mesh            → WebRTC CRDTs, ZKP Milestones
```

## Key Principles

- **$0.00 operational cost** — Static SPA, local inference, user-owned storage
- **Non-custodial** — Zero central database, automatic GDPR/HIPAA/FERPA compliance
- **Edge-first** — All AI runs on the user's device via WebGPU
- **Pedagogically grounded** — Self-Determination Theory (Autonomy, Competence, Relatedness)

## Project Structure

```
phonethagoras/
├── README.md                    ← You are here
├── research/                    ← Source research & architecture specs
│   └── MASTER_SYSTEMS_SPEC.md   ← The authoritative blueprint
├── schemas/                     ← JSON schemas & data contracts
│   └── player_state.schema.json
├── docs/                        ← Design docs, ADRs, compliance notes
│   └── ROADMAP.md
└── src/                         ← Application source (SPA)
    ├── index.html
    ├── css/
    ├── js/
    └── assets/
```

## Quick Start

```bash
# Serve locally (any static server)
cd src && python3 -m http.server 8080
# or
npx serve src
```

## Status

🟡 **Pre-Alpha** — Project scaffolding and architecture research phase.

## License

FOSS — Free and Open Source Software. Specific license TBD.

---

*Chief Systems Architect: Joshua Atkinson — Purdue University LDT Program, Summer 2026*
