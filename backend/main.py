"""
UltimateCrawler API — FastAPI backend with WebSocket crawling, REST exports, and history.
Akamai bypass is integrated directly into the crawler, not a separate tool.
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from crawler import UltimateCrawlerCrawler
from storage import create_session, finish_session, save_result, get_sessions, get_session_results, diff_sessions
from analysis import (find_near_duplicates, score_page, extract_keywords, 
                      generate_sitemap_xml, get_broken_links, get_orphan_pages, 
                      get_redirect_flattener, get_link_graph, get_security_headers,
                      get_mixed_content, validate_structured_data, get_content_freshness,
                      get_wcag_issues, get_web_vitals, generate_ai_action_plan)
from reports import generate_csv, generate_issues_csv, generate_excel
import asyncio
from concurrent.futures import ThreadPoolExecutor
from collections import deque
import json
import time
import uuid
import io

app = FastAPI(title="UltimateCrawler API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for active crawls (live results for the WS session)
active_crawls: dict[str, dict] = {}


# ─── WebSocket: Live Crawl Engine ─────────────────────────────────────────────

@app.websocket("/api/crawler/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)
            action = payload.get("action")

            if action == "start":
                task_id = payload.get("task_id", str(uuid.uuid4()))
                active_crawls[task_id] = {"stop": False, "results": []}
                mode = payload.get("mode", "spider")

                if mode == "spider":
                    await _run_spider(websocket, payload, task_id)
                elif mode == "list":
                    await _run_list(websocket, payload, task_id)
                elif mode == "sitemap":
                    await _run_sitemap(websocket, payload, task_id)

            elif action == "stop":
                tid = payload.get("task_id")
                if tid in active_crawls:
                    active_crawls[tid]["stop"] = True

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass


async def _run_spider(ws: WebSocket, cfg: dict, task_id: str):
    start_url = cfg.get("start_url", "").strip()
    max_urls = cfg.get("max_urls", 1000)
    scope = cfg.get("crawl_scope", "subfolder")
    ignore_robots = cfg.get("ignore_robots", False)
    delay = cfg.get("delay", 0.0)
    user_agent = cfg.get("user_agent", "desktop")
    custom_extractors = cfg.get("custom_extractors", [])

    crawler = UltimateCrawlerCrawler(max_urls, ignore_robots, scope, delay, user_agent)
    crawler.set_base_url(start_url)
    use_js_rendering = cfg.get("use_js_rendering", False)

    # Persist session
    create_session(task_id, start_url, "spider", scope, max_urls)

    urls_to_visit = deque([start_url])
    visited_urls: set[str] = set()
    url_depths: dict[str, int] = {start_url.split('#')[0].rstrip('/'): 0}
    crawl_data: list[dict] = []
    t0 = time.time()

    browser_context = None
    playwright_instance = None
    browser_instance = None
    
    if use_js_rendering:
        from playwright.sync_api import sync_playwright
        playwright_instance = sync_playwright().start()
        browser_instance = playwright_instance.chromium.launch(headless=True)
        browser_context = browser_instance.new_context(user_agent=crawler.active_ua)

    try:
        while urls_to_visit and len(visited_urls) < max_urls:
            if active_crawls.get(task_id, {}).get("stop"):
                break

            # Drain up to batch_size URLs from the queue
            batch: list[str] = []
            batch_size = min(15, len(urls_to_visit), max_urls - len(visited_urls))
            while len(batch) < batch_size and urls_to_visit:
                u = urls_to_visit.popleft()
                # Normalize before dedup
                norm = u.split('#')[0].rstrip('/')
                if norm in visited_urls:
                    continue
                if not crawler.can_fetch(u):
                    continue
                batch.append(u)
                visited_urls.add(norm)

            if not batch:
                break

            # Run batch in a thread pool (blocking I/O)
            workers = min(len(batch), 3 if use_js_rendering else 10)
            with ThreadPoolExecutor(max_workers=workers) as pool:
                futures = {pool.submit(crawler.extract_page_data, u, browser_context): u for u in batch}
                results_batch = []
                for f in futures:
                    try:
                        results_batch.append(f.result(timeout=20))
                    except:
                        pass

            for page_data in results_batch:
                if active_crawls.get(task_id, {}).get("stop"):
                    break

                # Set depth for the current page
                page_norm = page_data.get('url', '').split('#')[0].rstrip('/')
                current_depth = url_depths.get(page_norm, url_depths.get(start_url.split('#')[0].rstrip('/'), 0))
                page_data['depth'] = current_depth

                crawl_data.append(page_data)
                save_result(task_id, page_data)

                # Discover new internal links
                for link in page_data.get('internal_links', []):
                    href = link['url'].split('#')[0].rstrip('/')
                    if href not in visited_urls and crawler.should_crawl_url(href):
                        if href not in url_depths:
                            url_depths[href] = current_depth + 1
                        if len(visited_urls) + len(urls_to_visit) < max_urls:
                            urls_to_visit.append(href)

            # Send progress update
            elapsed = time.time() - t0
            speed = len(crawl_data) / max(elapsed, 0.01)
            try:
                await ws.send_json({
                    "type": "progress",
                    "progress": min(len(crawl_data) / max_urls, 1.0),
                    "crawled": len(crawl_data),
                    "queue": len(urls_to_visit),
                    "speed": round(speed, 1),
                    "latest_url": results_batch[-1].get('url', '') if results_batch else '',
                    "status_code": results_batch[-1].get('status_code', 0) if results_batch else 0,
                    "is_bypass": results_batch[-1].get('is_akamai_bypass', False) if results_batch else False,
                })
            except:
                break

            # Yield control to event loop so WS messages actually flush
            await asyncio.sleep(0.01)

    finally:
        if browser_context: browser_context.close()
        if browser_instance: browser_instance.close()
        if playwright_instance: playwright_instance.stop()

    # Finish
    finish_session(task_id, len(crawl_data),
                   "stopped" if active_crawls.get(task_id, {}).get("stop") else "completed")
    active_crawls[task_id]["results"] = crawl_data
    try:
        await ws.send_json({"type": "complete", "task_id": task_id, "total": len(crawl_data)})
    except:
        pass


async def _run_list(ws: WebSocket, cfg: dict, task_id: str):
    url_list = cfg.get("url_list", [])
    ignore_robots = cfg.get("ignore_robots", False)
    delay = cfg.get("delay", 0.0)
    user_agent = cfg.get("user_agent", "desktop")

    crawler = UltimateCrawlerCrawler(len(url_list), ignore_robots, delay=delay, user_agent=user_agent)
    create_session(task_id, url_list[0] if url_list else "", "list", "exact", len(url_list))

    crawl_data = []
    t0 = time.time()

    valid_urls = [u.strip() for u in url_list if u.strip().startswith('http')]

    for i in range(0, len(valid_urls), 20):
        if active_crawls.get(task_id, {}).get("stop"):
            break
        batch = valid_urls[i:i+20]
        with ThreadPoolExecutor(max_workers=min(len(batch), 10)) as pool:
            futures = {pool.submit(crawler.extract_page_data, u): u for u in batch}
            for f in futures:
                try:
                    page_data = f.result(timeout=20)
                    crawl_data.append(page_data)
                    save_result(task_id, page_data)

                    elapsed = time.time() - t0
                    await ws.send_json({
                        "type": "progress",
                        "progress": len(crawl_data) / len(valid_urls),
                        "crawled": len(crawl_data),
                        "queue": len(valid_urls) - len(crawl_data),
                        "speed": round(len(crawl_data) / max(elapsed, 0.01), 1),
                        "latest_url": page_data.get('url', ''),
                        "status_code": page_data.get('status_code', 0),
                        "is_bypass": page_data.get('is_akamai_bypass', False),
                    })
                except:
                    pass
        await asyncio.sleep(0.01)

    finish_session(task_id, len(crawl_data))
    active_crawls[task_id]["results"] = crawl_data
    try:
        await ws.send_json({"type": "complete", "task_id": task_id, "total": len(crawl_data)})
    except:
        pass


async def _run_sitemap(ws: WebSocket, cfg: dict, task_id: str):
    sitemap_url = cfg.get("sitemap_url", "")
    max_urls = cfg.get("max_urls", 5000)
    ignore_robots = cfg.get("ignore_robots", False)

    crawler = UltimateCrawlerCrawler(max_urls, ignore_robots)
    await ws.send_json({"type": "status", "message": "Extracting URLs from sitemap..."})

    sitemap_urls = await asyncio.to_thread(crawler.extract_sitemap_urls, sitemap_url)
    if not sitemap_urls:
        await ws.send_json({"type": "error", "message": "No URLs found in sitemap"})
        return
    if len(sitemap_urls) > max_urls:
        sitemap_urls = sitemap_urls[:max_urls]

    await ws.send_json({"type": "status", "message": f"Found {len(sitemap_urls)} URLs. Starting crawl..."})
    cfg["url_list"] = sitemap_urls
    await _run_list(ws, cfg, task_id)


# ─── REST: Export & Analysis Endpoints ────────────────────────────────────────

@app.get("/api/results/{task_id}")
def get_results(task_id: str):
    """Get crawl results (from memory if live, else from DB)."""
    if task_id in active_crawls and active_crawls[task_id].get("results"):
        return active_crawls[task_id]["results"]
    return get_session_results(task_id)


@app.get("/api/export/csv/{task_id}")
def export_csv(task_id: str):
    data = get_results(task_id)
    csv_content = generate_csv(data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_{task_id[:8]}.csv"}
    )


@app.get("/api/export/issues/{task_id}")
def export_issues(task_id: str):
    data = get_results(task_id)
    csv_content = generate_issues_csv(data)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_issues_{task_id[:8]}.csv"}
    )


@app.get("/api/export/excel/{task_id}")
def export_excel(task_id: str):
    data = get_results(task_id)
    xlsx_bytes = generate_excel(data)
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_{task_id[:8]}.xlsx"}
    )


@app.get("/api/export/sitemap/{task_id}")
def export_sitemap(task_id: str):
    data = get_results(task_id)
    xml_content = generate_sitemap_xml(data)
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=sitemap_{task_id[:8]}.xml"}
    )


@app.get("/api/analysis/scores/{task_id}")
def get_scores(task_id: str):
    data = get_results(task_id)
    return [score_page(p) for p in data]


@app.get("/api/analysis/duplicates/{task_id}")
def get_duplicates(task_id: str, threshold: int = Query(default=5)):
    data = get_results(task_id)
    return find_near_duplicates(data, threshold)


@app.get("/api/analysis/keywords/{task_id}")
def get_keywords(task_id: str):
    data = get_results(task_id)
    combined_text = " ".join(
        f"{p.get('title','')} {p.get('meta_description','')} {p.get('h1_tags','')}"
        for p in data
    )
    return extract_keywords(combined_text, top_n=30)


@app.get("/api/analysis/summary/{task_id}")
def get_summary(task_id: str):
    """Quick dashboard summary stats."""
    data = get_results(task_id)
    if not data:
        return {}

    total = len(data)
    indexable = sum(1 for p in data if p.get('indexability') == 'Indexable')
    errors = sum(1 for p in data if p.get('status_code', 0) >= 400 or p.get('status_code', 0) == 0)
    redirects = sum(1 for p in data if p.get('redirect_count', 0) > 0)
    bypassed = sum(1 for p in data if p.get('is_akamai_bypass'))
    missing_title = sum(1 for p in data if p.get('title_length', 0) == 0)
    missing_meta = sum(1 for p in data if p.get('meta_desc_length', 0) == 0)
    missing_h1 = sum(1 for p in data if p.get('h1_count', 0) == 0)
    missing_alt = sum(p.get('images_without_alt', 0) for p in data)
    avg_response = sum(p.get('response_time', 0) for p in data) / max(total, 1)
    avg_word_count = sum(p.get('word_count', 0) for p in data) / max(total, 1)
    with_schema = sum(1 for p in data if p.get('schema_count', 0) > 0)
    fast_pages = sum(1 for p in data if p.get('response_time', 0) < 2.0)

    # Status code breakdown
    status_map = {}
    for p in data:
        sc = p.get('status_code', 0)
        status_map[sc] = status_map.get(sc, 0) + 1

    # SEO score distribution
    scores = [score_page(p) for p in data]
    grade_dist = {}
    for s in scores:
        g = s['grade']
        grade_dist[g] = grade_dist.get(g, 0) + 1
    avg_score = sum(s['score'] for s in scores) / max(len(scores), 1)

    # Phase 1 Additions
    broken_links = get_broken_links(data)
    orphans = get_orphan_pages(data)
    flatteners = get_redirect_flattener(data)

    return {
        "total": total,
        "indexable": indexable,
        "non_indexable": total - indexable,
        "errors": errors,
        "redirects": redirects,
        "akamai_bypassed": bypassed,
        "missing_title": missing_title,
        "missing_meta": missing_meta,
        "missing_h1": missing_h1,
        "missing_alt": missing_alt,
        "avg_response_time": round(avg_response, 2),
        "avg_word_count": int(avg_word_count),
        "with_schema": with_schema,
        "fast_pages": fast_pages,
        "status_codes": status_map,
        "avg_seo_score": round(avg_score, 1),
        "grade_distribution": grade_dist,
        "broken_links_count": len(broken_links),
        "orphan_pages_count": len(orphans),
        "redirect_chains_count": len(flatteners),
    }

@app.get("/api/analysis/broken-links/{task_id}")
def get_broken_links_api(task_id: str):
    data = get_results(task_id)
    return get_broken_links(data)

@app.get("/api/analysis/orphans/{task_id}")
def get_orphans_api(task_id: str):
    data = get_results(task_id)
    return get_orphan_pages(data)

@app.get("/api/analysis/redirect-chains/{task_id}")
def get_redirect_chains_api(task_id: str):
    data = get_results(task_id)
    return get_redirect_flattener(data)

# ─── Phase 2 Endpoints ────────────────────────────────────────────────────────

@app.get("/api/analysis/link-graph/{task_id}")
def get_link_graph_api(task_id: str):
    data = get_results(task_id)
    return get_link_graph(data)

@app.get("/api/analysis/security-headers/{task_id}")
def get_security_headers_api(task_id: str):
    data = get_results(task_id)
    return get_security_headers(data)

@app.get("/api/analysis/mixed-content/{task_id}")
def get_mixed_content_api(task_id: str):
    data = get_results(task_id)
    return get_mixed_content(data)

@app.get("/api/analysis/structured-data/{task_id}")
def get_structured_data_api(task_id: str):
    data = get_results(task_id)
    return validate_structured_data(data)

@app.get("/api/analysis/freshness/{task_id}")
def get_freshness_api(task_id: str):
    data = get_results(task_id)
    return get_content_freshness(data)

# ─── Phase 3 Endpoints ────────────────────────────────────────────────────────

@app.get("/api/analysis/wcag/{task_id}")
def get_wcag_api(task_id: str):
    data = get_results(task_id)
    return get_wcag_issues(data)

@app.get("/api/analysis/web-vitals/{task_id}")
def get_web_vitals_api(task_id: str):
    data = get_results(task_id)
    return get_web_vitals(data)

@app.get("/api/analysis/ai-action-plan/{task_id}")
def get_ai_action_plan_api(task_id: str):
    # Generates plan based on summary
    from storage import get_session_results
    _, data = get_session_results(task_id)
    if not data: return {"actions": []}
    
    # Need summary first
    from analysis import get_broken_links, get_orphan_pages, get_redirect_flattener, score_page
    # Re-calculate summary on the fly for AI
    total = len(data)
    indexable = sum(1 for p in data if p.get('indexability') == 'Indexable')
    errors = sum(1 for p in data if p.get('status_code', 0) >= 400)
    redirects = sum(1 for p in data if p.get('status_code', 0) in [301, 302, 307, 308])
    missing_title = sum(1 for p in data if not p.get('title'))
    missing_meta = sum(1 for p in data if not p.get('meta_description'))
    missing_h1 = sum(1 for p in data if p.get('h1_count', 0) == 0)
    broken_links = get_broken_links(data)
    orphans = get_orphan_pages(data)
    chains = get_redirect_flattener(data)
    
    summary = {
        "total": total,
        "indexable": indexable,
        "errors": errors,
        "redirects": redirects,
        "missing_title": missing_title,
        "missing_meta": missing_meta,
        "missing_h1": missing_h1,
        "broken_links_count": len(broken_links),
        "orphan_pages_count": len(orphans),
        "redirect_chains_count": len(chains)
    }
    return generate_ai_action_plan(summary)

# ─── REST: Exports ────────────────────────────────────────────────────────────

from fastapi.responses import Response, StreamingResponse
from reports import generate_csv, generate_issues_csv, generate_excel

@app.get("/api/export/csv/{task_id}")
def export_csv(task_id: str):
    data = get_results(task_id)
    csv_data = generate_csv(data)
    return Response(
        content=csv_data, 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_data_{task_id}.csv"}
    )

@app.get("/api/export/issues/{task_id}")
def export_issues_csv(task_id: str):
    data = get_results(task_id)
    csv_data = generate_issues_csv(data)
    return Response(
        content=csv_data, 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_issues_{task_id}.csv"}
    )

@app.get("/api/export/excel/{task_id}")
def export_excel(task_id: str):
    data = get_results(task_id)
    excel_data = generate_excel(data, filename_base="ultimatecrawler")
    return Response(
        content=excel_data, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        headers={"Content-Disposition": f"attachment; filename=ultimatecrawler_audit_{task_id}.xlsx"}
    )

@app.get("/api/export/sitemap/{task_id}")
def export_sitemap(task_id: str):
    data = get_results(task_id)
    # Generate simple sitemap XML for 200 OK Indexable pages
    urls = [p.get('url') for p in data if p.get('status_code') == 200 and p.get('indexability') == 'Indexable' and p.get('url')]
    
    xml = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    for u in urls:
        xml.append(f'  <url><loc>{u}</loc></url>')
    xml.append('</urlset>')
    
    return Response(
        content="\\n".join(xml), 
        media_type="application/xml", 
        headers={"Content-Disposition": f"attachment; filename=sitemap.xml"}
    )

# ─── REST: History & Diffing ──────────────────────────────────────────────────

@app.get("/api/history")
def list_history(limit: int = 50):
    return get_sessions(limit)


@app.get("/api/history/{session_id}")
def get_history_detail(session_id: str):
    return get_session_results(session_id)


@app.get("/api/diff")
def diff_crawls(a: str = Query(...), b: str = Query(...)):
    return diff_sessions(a, b)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "app": "UltimateCrawler", "version": "3.0"}

# ─── Phase 4 Endpoints (10 New Medium/Hard Tools) ──────────────────────────────

@app.get("/api/analysis/cannibalization/{task_id}")
def get_cannibalization_api(task_id: str):
    data = get_results(task_id)
    # Group by first 2 words of H1
    groups = {}
    for p in data:
        h1 = p.get('h1_tags', '').split(';')[0].strip()
        if not h1: continue
        key = ' '.join(h1.lower().split()[:2])
        if key not in groups: groups[key] = []
        groups[key].append(p.get('url'))
    return [{"keyword": k, "urls": urls, "count": len(urls)} for k, urls in groups.items() if len(urls) > 1]

@app.get("/api/analysis/social-tags/{task_id}")
def get_social_tags_api(task_id: str):
    data = get_results(task_id)
    return [{"url": p.get('url'), "social_tags": p.get('social_tags', {})} for p in data]

@app.get("/api/analysis/heading-hierarchy/{task_id}")
def get_heading_hierarchy_api(task_id: str):
    data = get_results(task_id)
    results = []
    for p in data:
        h1c = p.get('h1_count', 0)
        h2c = p.get('h2_count', 0)
        h3c = len(p.get('h3_tags', '').split(';')) if p.get('h3_tags') else 0
        h4c = len(p.get('h4_tags', '').split(';')) if p.get('h4_tags') else 0
        issues = []
        if h1c == 0: issues.append("Missing H1")
        if h1c > 1: issues.append("Multiple H1s")
        if h3c > 0 and h2c == 0: issues.append("Skipped H2 (H1 -> H3)")
        if h4c > 0 and h3c == 0: issues.append("Skipped H3 (H2 -> H4)")
        results.append({"url": p.get('url'), "h1": h1c, "h2": h2c, "h3": h3c, "h4": h4c, "issues": issues})
    return results

@app.get("/api/analysis/readability/{task_id}")
def get_readability_api(task_id: str):
    data = get_results(task_id)
    results = []
    for p in data:
        words = p.get('word_count', 0)
        # Mock calculation: Grade level approximation based on word count
        score = min(100, max(0, 100 - (words / 50)))
        grade = "A" if score > 80 else "B" if score > 60 else "C" if score > 40 else "D"
        results.append({"url": p.get('url'), "words": words, "readability_score": int(score), "grade": grade})
    return results

@app.get("/api/analysis/image-seo/{task_id}")
def get_image_seo_api(task_id: str):
    data = get_results(task_id)
    return [{"url": p.get('url'), "images": p.get('images', [])} for p in data]

@app.get("/api/analysis/link-flow/{task_id}")
def get_link_flow_api(task_id: str):
    data = get_results(task_id)
    inlinks = {}
    for p in data:
        for link in p.get('internal_links', []):
            target = link.get('url', '').split('#')[0].rstrip('/')
            inlinks[target] = inlinks.get(target, 0) + 1
    
    results = []
    for p in data:
        url = p.get('url', '').split('#')[0].rstrip('/')
        results.append({
            "url": p.get('url'),
            "inlinks": inlinks.get(url, 0),
            "outlinks": p.get('internal_links_count', 0)
        })
    return sorted(results, key=lambda x: x['inlinks'], reverse=True)

@app.get("/api/analysis/semantic-html/{task_id}")
def get_semantic_html_api(task_id: str):
    data = get_results(task_id)
    return [{"url": p.get('url'), "tags": p.get('semantic_tags', {})} for p in data]

@app.get("/api/analysis/hreflang/{task_id}")
def get_hreflang_api(task_id: str):
    data = get_results(task_id)
    return [{"url": p.get('url'), "hreflangs": p.get('hreflangs', [])} for p in data]

@app.get("/api/analysis/canonical-audit/{task_id}")
def get_canonical_audit_api(task_id: str):
    data = get_results(task_id)
    results = []
    for p in data:
        canon = p.get('canonical_url', '')
        url = p.get('url', '')
        status = "Missing" if not canon else "Self-Referencing" if canon == url else "Cross-Referencing"
        results.append({"url": url, "canonical": canon, "status": status})
    return results

@app.get("/api/analysis/url-structure/{task_id}")
def get_url_structure_api(task_id: str):
    data = get_results(task_id)
    results = []
    for p in data:
        url = p.get('url', '')
        issues = []
        if len(url) > 75: issues.append("Too Long (>75 chars)")
        if '_' in url: issues.append("Contains Underscores")
        if '?' in url: issues.append("Contains Parameters")
        if any(c.isupper() for c in url.split('://')[-1]): issues.append("Contains Uppercase")
        results.append({"url": url, "length": len(url), "issues": issues})
    return results

