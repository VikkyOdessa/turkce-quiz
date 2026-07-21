# Türkçe Quiz 🧿

**A Turkish language course, built by a teacher — not a template.**

🔗 **Live app:** https://vikkyodessa.github.io/turkce-quiz/

Türkçe Quiz is a free, installable web app for learning Turkish, structured around
the CEFR levels **A1 → A2 → B1**. Every lesson, example and exercise is written by
a Turkish teacher with 17 years of classroom experience — so the app teaches the
*logic* of the language (vowel harmony, consonant assimilation, personal suffixes),
not just isolated words.

No sign-up, no ads, works offline. Just open it and learn.

---

## ✨ What's inside

- **Structured path** — three CEFR levels (A1, A2, B1) with 17 topics that build on each other.
- **Grammar cards** — short, visual explanations with colour-coded word structure
  (e.g. `değil` + **di** *(past)* + **personal ending**) so learners *see* how a word is built.
- **Interactive exercises** — multiple-choice fill-in-the-blank *and* drag-and-drop
  ("place the ending"), each with instant ✓/✗ feedback and a translation.
- **Living dictionary** — 88 words per level with a status system (new / learning / known)
  that updates automatically from your answers, plus a "train your weak words" mode.
- **Turkish text-to-speech** — tap 🔊 to hear native-style pronunciation.
- **Progress tracking** — completion percentages per topic and level, saved locally.
- **Turkish visual identity** — İznik-tile motifs, the *nazar* bead, cobalt & turquoise palette.

---

## 🎯 Who it's for

Ukrainian speakers learning Turkish from scratch, at their own pace — travellers,
people relocating to Türkiye, mixed families, and anyone who wants a clean,
methodical alternative to gamified language apps.

Interface currently in **Ukrainian** (Russian and English planned).

---

## 🛠️ For developers

A deliberately simple, dependency-free front-end. No framework, no build step,
no backend — just files a browser runs directly.

### Stack

- **Vanilla JavaScript** (no React/Vue, no bundler)
- **Progressive Web App** — installable, offline-capable via a service worker
- **Web Speech API** — Turkish TTS with graceful fallback when unavailable
- **LocalStorage** — all progress kept on-device (no accounts, no tracking of personal data)
- Hosted on **GitHub Pages**

### Project structure

| File | Role |
|------|------|
| `index.html` | Markup skeleton (~140 lines) |
| `styles.css` | All styling and design tokens |
| `data.js` | **Content** — translations, dictionaries, topics, grammar |
| `app.js` | **Logic** — routing, quiz engine, rendering, TTS |
| `sw.js` | Service worker — network-first, cache as fallback |
| `img/`, `icon.svg`, `og.png`, `manifest.webmanifest` | Assets & PWA manifest |

Content and logic are separated on purpose: adding a new chapter means editing
**`data.js`** only, without touching the engine or styles.

### Run locally

Because it's plain static files, any static server works:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` via `file://` also works, but a local server is recommended
so the service worker and fonts load correctly.

### Notes

- Service worker caching is **versioned** — bump the version in `sw.js` when
  shipping CSS/JS changes so clients pick them up.
- Turkish TTS requires the browser to have a Turkish voice installed; some
  privacy browsers disable the Speech API entirely (the 🔊 buttons hide gracefully).

---

## 🚧 Status & roadmap

**Actively developed.** Content is being expanded chapter by chapter from original
teaching materials.

Planned:

- More grammar topics (past tense, cases, tenses) with the drag-and-drop mechanic
- English and Russian interface
- Per-language pages for discoverability

---

## 👩‍🏫 Author

Created by a Turkish teacher — **17 years of teaching experience, TÖMER diploma**.
The methodology is the heart of this project; the code just gives it a home that
answers back.

---

## 📄 License

**© All rights reserved.**

The source is publicly visible (as all front-end code is), but it is **not** released
under an open-source licence. You may view it; you may not copy, redistribute, or
reuse the code or the learning content without permission.
