# Endless Opportunities Course

Standalone extraction of the Endless Opportunities learning portal from `autonateai-website`.

## Included

- Endless Opportunities lesson content
- EO landing page
- Auth pages
- EO analytics page
- Firebase hosting config, Firestore rules, and function packages

## Quick Start

```bash
npm install
npm run setup:functions
npm run dev
```

Open the local Firebase hosting URL and you will land on the EO course page.

## Full Local Stack

```bash
npm run dev:full
```

This starts Firebase hosting and functions emulators together.

## GitHub Pages

Production URL: `https://eo.autonateai.com`

Deploy the static site to the `gh-pages` branch with:

```bash
npm run deploy:pages
```

For GitHub Pages settings, use:

- Source: `Deploy from a branch`
- Branch: `gh-pages`
- Folder: `/ (root)`
- Custom domain: `eo.autonateai.com`

## Important

- Client-side Firebase config is in `courses/shared/js/firebase-config.js`
- Hosting serves the `courses/` directory via `firebase.json`
- Lesson pages still enforce Firebase Auth + EO organization access
