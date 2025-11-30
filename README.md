# NexSEO — Free Enterprise SEO Tools Platform

A full-stack, enterprise-grade SEO analysis platform built on a custom Python crawler engine. NexSEO exposes 26 free SEO tools through a clean React frontend, backed by a FastAPI WebSocket server that crawls pages in real-time and runs multi-phase analysis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Python 3.11+, FastAPI, WebSockets |
| Crawler Engine | Custom `UltimateCrawlerCrawler` with cURL WAF bypass |
| Database | SQLite (via `nexseo.db`) |
| Exports | Excel (openpyxl), CSV, PDF (jsPDF), Sitemap XML |
| Visualization | react-force-graph-2d (D3-backed link graph) |

---

## Features

### Crawl Modes
- **Spider Mode** — follows all internal links from a seed URL up to a configurable limit
- **List Mode** — audits a pasted list of up to 100 URLs
- **Sitemap Mode** — parses an XML sitemap and crawls every URL inside it

### On-Page SEO Tools
| Tool | What it checks |
|---|---|
| SEO Score Calculator | Grades pages A–F across 10 weighted signals |
| Meta Tag Analyzer | Title + meta description length and quality |
| Heading Hierarchy Auditor | Missing H1, multiple H1s, skipped heading levels |
| Keyword Density Analyzer | TF-based top-30 keyword extraction |
| Readability & NLP Grader | Word count + estimated reading difficulty |
| Image Optimization Auditor | Missing alt text, image count per page |
| Content Freshness Analyzer | `Last-Modified` headers + `article:modified_time` |
| Social Meta Tags Previewer | OpenGraph + Twitter Card extraction |
| Keyword Cannibalization Checker | Pages competing for the same H1 topic |

### Technical SEO Tools
| Tool | What it checks |
|---|---|
| Broken Link Checker | Internal links pointing to 4xx pages |
| Orphan Page Finder | Pages with zero inbound internal links |
| Redirect Chain Finder | Multi-hop redirect chains |
| Canonical Misconfiguration Checker | Missing, self-ref, or cross-ref canonicals |
| Schema Markup Validator | JSON-LD validation against Google field requirements |
| Mixed Content Checker | HTTP resources on HTTPS pages |
| Duplicate Content Checker | SimHash near-duplicate detection (64-bit) |
| Accessibility (WCAG) Checker | Missing alt, aria-labels, lang attributes |
| Semantic HTML5 Auditor | `<main>`, `<nav>`, `<article>`, `<aside>` coverage |
| URL Structure Analyzer | Length, casing, underscores, query params |
| Hreflang Validator | Multi-language tag extraction |
| HTTP Status Checker | Bulk 200/301/404/500 mapping |

### Performance & Links
| Tool | What it checks |
|---|---|
| Core Web Vitals Checker | FCP + Load via Playwright (JS rendering mode) |
| Page Speed Analyzer | TTFB, content size, word count |
| Internal Link Graph | Force-directed D3 visualization of link architecture |
| Internal Link Equity Flow | Inlink counts as a PageRank proxy |
| Outbound Link Analyzer | All external links leaving the site |

---

## Project Structure

```
NexSEO/
├── backend/
│   ├── main.py          # FastAPI app — WebSocket crawler + 30+ REST endpoints
│   ├── crawler.py       # UltimateCrawlerCrawler — HTTP, Playwright, cURL bypass
│   ├── analysis.py      # SimHash, scoring, keyword extraction, all analysis logic
│   ├── storage.py       # SQLite session/result persistence
│   ├── reports.py       # CSV, issues CSV, styled Excel export
│   └── nexseo.db        # SQLite database (auto-created on startup)
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                    # Root layout, routing, theme toggle
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           # Tool grid + hero section
│   │   │   └── ToolPage.tsx           # Tool runner (URL input → WebSocket → results)
│   │   ├── components/
│   │   │   ├── ResultsDashboard.tsx   # Full multi-tab results dashboard
│   │   │   ├── Phase2Tabs.tsx         # Schema, mixed content, freshness tabs
│   │   │   ├── Phase3Tabs.tsx         # WCAG, Web Vitals, AI action plan tabs
│   │   │   ├── Phase4Tabs.tsx         # Cannibalization, social tags, headings, etc.
│   │   │   ├── LinkGraphTab.tsx       # Force-graph link visualization
│   │   │   ├── LiveDashboard.tsx      # Real-time crawl progress UI
│   │   │   ├── CrawlConfig.tsx        # Crawl mode + advanced settings panel
│   │   │   └── HistoryPanel.tsx       # Crawl session history + diff viewer
│   │   ├── data/
│   │   │   └── tools.ts               # Tool registry (26 tools, metadata + endpoints)
│   │   └── utils/
│   │       └── PdfExport.ts           # jsPDF-based PDF report generator
│   └── package.json
│
└── manual.md            # Full user manual
```

---

## Getting Started

### Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn requests beautifulsoup4 openpyxl lxml

# Optional: JS rendering support
pip install playwright
playwright install chromium

# Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend

npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API Reference

### WebSocket

| Endpoint | Description |
|---|---|
| `ws://localhost:8000/api/crawler/ws` | Live crawl engine. Send JSON with `action`, `mode`, and config. |

**Start a crawl:**
```json
{
  "action": "start",
  "mode": "list",
  "url_list": ["https://example.com/page1", "https://example.com/page2"],
  "ignore_robots": true
}
```

**Stop a crawl:**
```json
{ "action": "stop", "task_id": "<task_id>" }
```

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/results/{task_id}` | Raw crawl results array |
| `GET` | `/api/analysis/scores/{task_id}` | SEO scores (A–F grades) |
| `GET` | `/api/analysis/broken-links/{task_id}` | Broken internal links |
| `GET` | `/api/analysis/orphans/{task_id}` | Orphan pages |
| `GET` | `/api/analysis/redirect-chains/{task_id}` | Multi-hop redirect chains |
| `GET` | `/api/analysis/link-graph/{task_id}` | Nodes/edges for force graph |
| `GET` | `/api/analysis/structured-data/{task_id}` | JSON-LD schema validation |
| `GET` | `/api/analysis/wcag/{task_id}` | WCAG accessibility issues |
| `GET` | `/api/analysis/web-vitals/{task_id}` | Core Web Vitals (JS mode) |
| `GET` | `/api/analysis/cannibalization/{task_id}` | Keyword cannibalization groups |
| `GET` | `/api/analysis/social-tags/{task_id}` | OG + Twitter card tags |
| `GET` | `/api/analysis/heading-hierarchy/{task_id}` | H1–H4 structure audit |
| `GET` | `/api/analysis/image-seo/{task_id}` | Image alt text audit |
| `GET` | `/api/analysis/canonical-audit/{task_id}` | Canonical tag status |
| `GET` | `/api/analysis/url-structure/{task_id}` | URL quality issues |
| `GET` | `/api/export/csv/{task_id}` | Download full CSV |
| `GET` | `/api/export/issues/{task_id}` | Download issues-only CSV |
| `GET` | `/api/export/excel/{task_id}` | Download styled Excel (.xlsx) |
| `GET` | `/api/export/sitemap/{task_id}` | Download sitemap.xml |
| `GET` | `/api/history` | List past crawl sessions |
| `GET` | `/api/diff?a={id}&b={id}` | Diff two crawl sessions |

---

## Akamai / Cloudflare Bypass

The crawler automatically detects WAF blocks (403, 429) and falls back to a native `curl` subprocess with spoofed headers. This is completely transparent — the crawl continues without interruption and flagged pages are marked as `is_akamai_bypass: true` in results.

---

## Exports

| Format | Contents |
|---|---|
| **PDF** | Branded executive summary with SEO grade chart and top issues |
| **Excel** | Sheet 1: all data · Sheet 2: color-coded issues by severity |
| **CSV** | Flat raw data for use in Python / Looker Studio / R |
| **Sitemap XML** | Auto-generated sitemap of all 200 OK indexable pages |

---

## License

MIT
