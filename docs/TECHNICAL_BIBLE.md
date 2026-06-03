# Phonethagoras: Technical Bible & Architecture Guide

Welcome to the open-source repository for Phonethagoras. 

## The Vision: Autonomous Bureaucracy for the Vulnerable
Phonethagoras is designed to act as an autonomous "Guild Administrator" (Zen Zuse) for clients in Workforce Development, HUD housing, or other social safety nets. The goal is to take the crushing weight of administrative paperwork—intake forms, resumes, calendar scheduling, and email drafting—off the shoulders of both the vulnerable client and the overworked caseworker.

## The Liquid AI Two-Model Router
To maximize privacy, battery life, and accessibility on low-end hardware, we utilize a **Two-Model "Router" Architecture** powered by Liquid Foundation Models (LFM 2.5).

1. **The Intake Router (LFM 2.5 - 1.2B):**
   - **Purpose:** Handles the fast, conversational "Greeting" and daily emotional check-ins.
   - **Hardware Profile:** Extremely lightweight (<2GB RAM). Can run via WebGPU natively in the browser or on the lowest-end edge devices.
   
2. **The Worker Agent (LFM 2.5 - 8B-A1B MoE):**
   - **Purpose:** Activated only when heavy lifting is required (e.g., reading a full intake form and generating a formatted resume).
   - **Hardware Profile:** Utilizes a Mixture-of-Experts (MoE) architecture. Despite having 8B parameters, it runs highly efficiently locally because only ~1B parameters are active at once. It features a massive 128K context window, allowing it to read the user's entire history simultaneously.

## Privacy First: The Local Sidecar
This software is designed to run locally. We use a local Node.js or Rust sidecar to bridge the web frontend with the user's local filesystem (`~/Phonethagoras_Inventory`).
This ensures that **no personal data, resumes, or psychological profiles ever leave the user's device.** 

## Consensual Profiling
The AI builds a "Character Sheet" of the user to help match them with jobs or services. This process is strictly consensual. The AI is programmed to explicitly ask for permission before logging any data, and all data is accessible to the user transparently.

---

## License & Liability Disclaimer (MIT License)

Copyright (c) 2026 Phonethagoras Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.**

### Not Medical or Legal Advice
Phonethagoras is an experimental AI tool. It is not a licensed therapist, caseworker, legal advisor, or medical professional. Users should not rely on this software for critical life decisions, mental health crises, or legally binding paperwork without human review. The developers assume zero liability for missed appointments, incorrectly filled forms, or emotional distress resulting from the use of this software.
