# CivicTrack

**AI-powered civic issue reporting platform for Pimpri-Chinchwad (PCMC), Pune.**

Built for the *Community Hero Hyperlocal Problem Solver* hackathon track. CivicTrack lets residents report local civic issues — potholes, garbage, broken streetlights, waterlogging, and more in under a minute, then tracks each issue from report to resolution through community verification and AI-powered categorization.

🔗 **Live App:** https://civictrack-weld.vercel.app

## The Problem

Reporting a civic issue to PCMC today typically means a phone call, a written complaint, or a generic web form — with no way to attach a photo, no automatic location tagging, and no visibility into whether a neighbor already reported the same problem. This leads to duplicate effort, slow verification, and low citizen engagement.

## The Solution

CivicTrack gives residents a fast, visual, location-aware way to report issues, lets the community verify them together, and uses the Gemini API to handle the manual work of categorizing and summarizing each report — so issues move from *reported* to *resolved* with more transparency and less friction.

---

## Features

- 📸 **Photo-based reporting** — works for signed-in users *and* guests, no account required
- 🤖 **AI-powered categorization** — Gemini analyzes each photo to classify category, severity, and generate a description automatically
- 🗺️ **Interactive map** — color-coded status pins, plus a live "your location" marker
- ✅ **Community verification** — neighbors confirm issues are real; enough confirmations auto-advances status
- 📡 **Real-time tracking** — live status timeline (Reported → Verified → In Progress → Resolved)
- 📊 **Impact dashboard** — category/status breakdowns, resolution rates, community leaderboard
- 🔮 **AI-generated insights** — Gemini reasons over real historical issue data to surface patterns
- 🏆 **Gamification** — points and badge tiers for reporting and verifying issues
- 🚨 **Emergency contacts** — official PCMC helpline and national emergency numbers, clearly separated from non-emergency reporting
- ⚖️ **"Why CivicTrack"** — an honest comparison against PCMC's existing official channels

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js (server-side runtime) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google Sign-In) + guest reporting |
| AI | Gemini API (multimodal image analysis + reasoning over data) |
| Maps | Google Maps JavaScript API |
| Hosting | Vercel |
| Built with | Google AI Studio (Build Mode / Antigravity Agent) |

---

## Architecture Notes

A couple of deliberate, transparent tradeoffs made for this build:

- **Images are stored as compressed base64 strings directly in Firestore documents**, rather than in a separate object storage bucket. Firebase Storage now requires the paid Blaze plan; storing compressed images directly in Firestore keeps the entire stack on the free Spark tier while still showing real photos for every report.
- **If the Gemini API is rate-limited or temporarily unavailable, the app falls back to lightweight heuristic categorization** instead of blocking or erroring  reporting always stays functional, even under quota pressure.

---

## Running Locally

**View this app in AI Studio:** https://ai.studio/apps/b870ea6d-40b2-4c97-a6a6-bcc76573f1b8

**Prerequisites:** Node.js

```bash
npm install
```

Set the `GEMINI_API_KEY` in `.env.local` to your own Gemini API key, then:

```bash
npm run dev
```

---

## Disclaimer

CivicTrack is an independent civic-tech project built for this hackathon and is **not affiliated with or endorsed by the Pimpri-Chinchwad Municipal Corporation (PCMC)**. PCMC contact details referenced in-app are sourced from [pcmcindia.gov.in](https://pcmcindia.gov.in).

---

## License

MIT
