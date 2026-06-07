# AdaptiveRAG — React UI

Dark fintech aesthetic. Apple-grade polish. Two pages.

## Stack
- React 18 + Vite
- Framer Motion (animations)
- React Router v6
- react-dropzone (file upload)
- Lucide React (icons)

## Pages

| Route | Description |
|-------|-------------|
| `/`   | Landing page — hero, pipeline viz, features, benchmark, research papers, CTA |
| `/app` | Main app — chat interface with left sidebar (docs), main chat, right panel (trace / sources / memory) |

## Right panel tabs (in `/app`)

- **Trace** — animated pipeline node execution with live progress, confidence meter, rewritten query
- **Sources** — retrieved chunks with relevance + rerank scores, color-coded bars
- **Memory** — extracted entities from the knowledge graph

## Running

```bash
cd ui
npm install
npm run dev       # → http://localhost:3000
```

## Connecting to backend

Set `VITE_API_URL=http://localhost:8000` in `ui/.env`.
All API calls are in `src/lib/api.js`.

The mock functions in `AppPage.jsx` can be swapped for real API calls:

```js
// AppPage.jsx — replace mockQuery with:
import { runQuery } from '../lib/api'
const res = await runQuery(question)
```

## Design tokens (in `src/index.css`)

| Token | Value |
|-------|-------|
| `--bg-base` | `#080a0f` |
| `--accent-blue` | `#5b9cf6` |
| `--accent-teal` | `#2dd4bf` |
| `--font-display` | Syne |
| `--font-body` | DM Sans |
| `--font-mono` | DM Mono |