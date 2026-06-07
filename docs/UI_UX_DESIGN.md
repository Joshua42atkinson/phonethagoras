# Phonethagoras: UI & UX Design Document

## 1. Design Philosophy: "Calm Autonomy"
Phonethagoras is designed for individuals navigating intense transitions—veterans, single parents, people in recovery. The UI must not feel like a bureaucratic government form, nor should it feel like a childish game. It must exude **Calm Autonomy**.

### Core Principles
- **Low Cognitive Load:** No dense walls of text. Clean typography, generous spacing, and progressive disclosure (only show what is needed *right now*).
- **Glassmorphism & Depth:** Using blurred, semi-transparent panels (`backdrop-filter`) over deep, dark backgrounds creates a sense of spatial depth and softness, reducing harsh screen glare.
- **Dark Mode Default:** A deep navy/obsidian theme (`#0a0f19`) feels private, secure, and restful on the eyes, especially for users interacting with the app late at night.
- **The "Hand" Navigation:** Mobile-first, thumb-driven navigation. The primary controls sit at the bottom or are easily reachable, collapsing complex menus into simple, iconic "sigils".

---

## 2. Visual Language & Aesthetics

### Color Palette
- **Background:** Deep Obsidian (`hsl(220, 43%, 7%)`) - grounding, secure.
- **Surface:** Glassy Charcoal (`hsla(220, 20%, 15%, 0.6)`) - used for cards and modals.
- **Accent (The Spark):** Muted Gold/Amber (`hsl(40, 46%, 61%)`) - represents warmth, guidance, and value without being aggressive like pure yellow or red.
- **Attributes:** 
  - **Mind:** Sapphire Blue (Clarity, Logic)
  - **Heart:** Ruby Red (Empathy, Connection)
  - **Body:** Emerald Green (Grounding, Resilience)
  - **Act:** Amethyst Purple (Creation, Action)

### Typography
- **Headings:** *Cormorant Garamond* - Serif, brings a touch of ancient wisdom, dignity, and weight to the user's journey.
- **Body & UI:** *Inter* - Sans-serif, highly legible, modern, and clean for chat interfaces and forms.
- **Data/Code:** *JetBrains Mono* - Used for stats, attributes, and precise data points to give a structured, "system" feel.

---

## 3. Core Interface Components

### 3.1 The Radar Chart (The Diamond)
The visual centerpiece of the user's dashboard ("Your Shape").
- **Why:** Instead of arbitrary progress bars, the user sees themselves as a balanced (or imbalanced) shape across Mind, Heart, Body, and Act. It gamifies self-reflection without trivializing it.
- **Usability:** SVG-based, animating smoothly when stats change. It provides instant visual feedback on where the user is spending their energy.

### 3.2 The Chat Interface ("Zen Zuse" / The Walk)
The primary interaction paradigm for the AI.
- **Why:** Conversational UI is the lowest barrier to entry. Users don't need to learn a complex menu system to get help; they just talk.
- **Usability:** 
  - Bubbles use the Glassmorphism style.
  - "Quick Actions" float above the keyboard (e.g., "Draft Resume", "Help me breathe").
  - An explicitly visible **"Offline Status Indicator"** reassures the user that the AI is running locally and their data is safe.

### 3.3 The Forge (Somatic Regulation)
A dedicated, distraction-free screen for physiological resets (e.g., Box Breathing).
- **Why:** Users in crisis cannot process cognitive tasks (like writing a resume) until their nervous system is regulated.
- **Usability:** A pulsing, expanding/contracting geometric circle synced with breathing intervals (4-4-4-4). Ambient, low-frequency tones (174.6 Hz) can be toggled on. The UI fades away all other elements during this exercise.

### 3.4 S.I.L.K. Extraction (The Recycler)
The interface for turning raw, emotional stories into professional artifacts.
- **Why:** Vulnerable users struggle to "write a resume," but they can easily tell a story about a hard time.
- **Usability:** A split-screen or step-by-step flow. 
  - **Input:** A simple, non-judgmental text box: *"What happened? (Messy is fine)."*
  - **Output:** The AI generates a clean, structured list of skills extracted from that story, appearing on "cards" that the user can swipe to save to their profile.

### 3.5 The Mentorship Bridge
The portal where the user decides what to share with their human coach/caseworker.
- **Why:** Empowers the user with absolute consent. They generate a "Weekly SitRep" (Situation Report) and explicitly press "Send" or "Export" to share it.
- **Usability:** Form-based, but auto-populated by the AI based on the week's chat history. The user reviews, edits, and approves the data before it ever leaves the device.

---

## 4. Mobile Architecture (Standard WebView)

Since the application will be bundled inside an Android WebView utilizing a native `llama.cpp` NDK backend:

1. **JNI Bridge Interaction:** The UI will communicate with the native AI via a global JavaScript bridge (e.g., `window.AndroidNative.promptAI(text)`). 
2. **Loading States:** Because loading a 1.2B model into phone memory takes a few seconds, the UI must gracefully handle startup. A "Booting Neural Engine" glass overlay with a smooth spinner will mask the loading time.
3. **Responsive Design:** The CSS must heavily utilize Flexbox and CSS Grid, ensuring that the Radar Chart scales down cleanly on small screens and the keyboard doesn't obscure the chat input.

## 5. Next Steps for Implementation
1. **Refine CSS Variables:** Ensure all colors, fonts, and spacing map to a unified `index.css` or `base.css` token system.
2. **Componentizing the HTML:** Structure the `index.html` into clear semantic sections (`<section id="panel-walk">`, `<section id="panel-forge">`) that the JS can seamlessly toggle between, avoiding page reloads.
3. **Backend Hook Integration:** Define the exact JS interfaces (Promises/Callbacks) that the UI will use to request completions from your working Android NDK backend.
