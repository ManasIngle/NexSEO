"""
Crawl history persistence using SQLite.
Stores crawl sessions and their results for historical diffing.
"""
import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "nexseo.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS crawl_sessions (
            id TEXT PRIMARY KEY,
            start_url TEXT NOT NULL,
            mode TEXT NOT NULL,
            crawl_scope TEXT DEFAULT 'subfolder',
            max_urls INTEGER DEFAULT 1000,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            total_urls INTEGER DEFAULT 0,
            status TEXT DEFAULT 'running'
        );
        CREATE TABLE IF NOT EXISTS crawl_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            url TEXT NOT NULL,
            original_url TEXT,
            status_code INTEGER DEFAULT 0,
            is_akamai_bypass INTEGER DEFAULT 0,
            title TEXT DEFAULT '',
            title_length INTEGER DEFAULT 0,
            meta_description TEXT DEFAULT '',
            meta_desc_length INTEGER DEFAULT 0,
            canonical_url TEXT DEFAULT '',
            meta_robots TEXT DEFAULT '',
            h1_tags TEXT DEFAULT '',
            h1_count INTEGER DEFAULT 0,
            h2_tags TEXT DEFAULT '',
            h2_count INTEGER DEFAULT 0,
            word_count INTEGER DEFAULT 0,
            response_time REAL DEFAULT 0,
            content_length INTEGER DEFAULT 0,
            internal_links_count INTEGER DEFAULT 0,
            external_links_count INTEGER DEFAULT 0,
            image_count INTEGER DEFAULT 0,
            images_without_alt INTEGER DEFAULT 0,
            schema_types TEXT DEFAULT '',
            schema_count INTEGER DEFAULT 0,
            redirect_count INTEGER DEFAULT 0,
            indexability TEXT DEFAULT '',
            error TEXT DEFAULT '',
            data_json TEXT DEFAULT '{}',
            crawl_timestamp TEXT,
            FOREIGN KEY (session_id) REFERENCES crawl_sessions(id)
        );
        CREATE INDEX IF NOT EXISTS idx_results_session ON crawl_results(session_id);
        CREATE INDEX IF NOT EXISTS idx_results_url ON crawl_results(url);
    """)
    conn.commit()
    conn.close()

def create_session(session_id: str, start_url: str, mode: str, crawl_scope: str, max_urls: int):
    conn = get_db()
    conn.execute(
        "INSERT INTO crawl_sessions (id, start_url, mode, crawl_scope, max_urls, started_at) VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, start_url, mode, crawl_scope, max_urls, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()

def finish_session(session_id: str, total_urls: int, status: str = "completed"):
    conn = get_db()
    conn.execute(
        "UPDATE crawl_sessions SET finished_at = ?, total_urls = ?, status = ? WHERE id = ?",
        (datetime.now().isoformat(), total_urls, status, session_id)
    )
    conn.commit()
    conn.close()

def save_result(session_id: str, page_data: dict):
    conn = get_db()
    # Store full nested data (links, images, redirects) as JSON blob
    full_json = json.dumps({
        k: v for k, v in page_data.items()
        if k in ('internal_links', 'external_links', 'images', 'redirect_chain', 
                 'depth', 'security_headers', 'mixed_content', 'schema_json', 
                 'wcag_issues', 'web_vitals', 'last_modified_header', 'meta_modified')
    })
    conn.execute("""
        INSERT INTO crawl_results 
        (session_id, url, original_url, status_code, is_akamai_bypass, title, title_length,
         meta_description, meta_desc_length, canonical_url, meta_robots,
         h1_tags, h1_count, h2_tags, h2_count, word_count, response_time, content_length,
         internal_links_count, external_links_count, image_count, images_without_alt,
         schema_types, schema_count, redirect_count, indexability, error, data_json, crawl_timestamp)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        session_id, page_data.get('url', ''), page_data.get('original_url', ''),
        page_data.get('status_code', 0), 1 if page_data.get('is_akamai_bypass') else 0,
        page_data.get('title', ''), page_data.get('title_length', 0),
        page_data.get('meta_description', ''), page_data.get('meta_desc_length', 0),
        page_data.get('canonical_url', ''), page_data.get('meta_robots', ''),
        page_data.get('h1_tags', ''), page_data.get('h1_count', 0),
        page_data.get('h2_tags', ''), page_data.get('h2_count', 0),
        page_data.get('word_count', 0), page_data.get('response_time', 0),
        page_data.get('content_length', 0),
        page_data.get('internal_links_count', 0), page_data.get('external_links_count', 0),
        page_data.get('image_count', 0), page_data.get('images_without_alt', 0),
        page_data.get('schema_types', ''), page_data.get('schema_count', 0),
        page_data.get('redirect_count', 0), page_data.get('indexability', ''),
        page_data.get('error', ''), full_json, page_data.get('crawl_timestamp', '')
    ))
    conn.commit()
    conn.close()

def get_sessions(limit=50):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM crawl_sessions ORDER BY started_at DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_session_results(session_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM crawl_results WHERE session_id = ? ORDER BY id", (session_id,)
    ).fetchall()
    conn.close()
    results = []
    for r in rows:
        d = dict(r)
        try:
            nested = json.loads(d.pop('data_json', '{}'))
            d.update(nested)
        except:
            pass
        results.append(d)
    return results

def diff_sessions(session_a: str, session_b: str):
    """Compare two crawl sessions and return differences."""
    results_a = {r['url']: r for r in get_session_results(session_a)}
    results_b = {r['url']: r for r in get_session_results(session_b)}
    
    urls_a = set(results_a.keys())
    urls_b = set(results_b.keys())
    
    return {
        'new_urls': list(urls_b - urls_a),
        'removed_urls': list(urls_a - urls_b),
        'common_urls': list(urls_a & urls_b),
        'changes': [
            {
                'url': url,
                'old_status': results_a[url]['status_code'],
                'new_status': results_b[url]['status_code'],
                'old_title': results_a[url]['title'],
                'new_title': results_b[url]['title'],
                'title_changed': results_a[url]['title'] != results_b[url]['title'],
                'status_changed': results_a[url]['status_code'] != results_b[url]['status_code'],
            }
            for url in urls_a & urls_b
            if results_a[url]['title'] != results_b[url]['title'] or
               results_a[url]['status_code'] != results_b[url]['status_code']
        ]
    }

# Auto-init on import
init_db()
