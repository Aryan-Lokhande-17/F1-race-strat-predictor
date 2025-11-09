# OpenF1 Dashboard

Multi-page React + TypeScript dashboard for F1 analysis using the OpenF1 API and Wikidata.

## First-time setup (remote PC)

Requirements:
- Node.js >= 18
- Git

Clone and run:
```bash
git clone https://github.com/VedangM05/F1Dashboard.git
cd F1Dashboard
npm ci            # or: npm install
npm run dev       # starts Vite dev server
```
Dev server default: http://localhost:5173

## Production build
```bash
npm run build     # outputs to dist/
# Optional local preview
npx serve -s dist # or any static server
```

Copy build to a folder (example):
```bash
mkdir -p /Users/vedangm/Desktop/F1
rsync -a dist/ /Users/vedangm/Desktop/F1/
```

## APIs
- OpenF1: race sessions, drivers, positions, laps, results
- Wikidata (SPARQL): track length (P2043), corners (P1090)

No API keys required. Wikidata requests include `origin=*` so they work in the browser.

## Scripts
- `npm run dev` – start dev server
- `npm run build` – typecheck + production build
- `npm run preview` – preview built app

## Notes
- Client-side routing: serve with a static server (don’t double-click `index.html`).
- You can deploy to Netlify/Vercel/GitHub Pages; no server required.
