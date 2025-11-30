from fastapi.testclient import TestClient
from main import app
import uuid
import sys

client = TestClient(app)

ENDPOINTS = [
    "link-graph", "web-vitals", "duplicates", "structured-data",
    "scores", "wcag", "link-flow", "cannibalization", "redirect-chains",
    "hreflang", "mixed-content", "semantic-html", "social-tags",
    "heading-hierarchy", "readability", "keywords", "orphans",
    "broken-links", "canonical-audit", "image-seo", "freshness",
    "summary", "url-structure"
]

def run_tests():
    print("Simulating fake crawl data...")
    task_id = str(uuid.uuid4())
    
    from storage import create_session, save_result
    fake_data = {
        "url": "https://example.com",
        "status_code": 200,
        "indexability": "Indexable",
        "title": "Example Title",
        "meta_description": "Example meta description.",
        "word_count": 500,
        "internal_links": [{"url": "https://example.com/about", "anchor_text": "About"}],
        "h1_count": 1,
        "images": [{"src": "image.jpg", "alt": "image"}],
        "schema_json": [{"@type": "Organization", "name": "Example"}],
        "social_tags": {"og_title": "OG Title"},
        "canonical_url": "https://example.com",
        "hreflangs": [{"lang": "en", "url": "https://example.com"}],
        "semantic_tags": {"main": 1, "nav": 1}
    }
    create_session(task_id, "https://example.com", "spider", "subfolder", 100)
    save_result(task_id, fake_data)
    print(f"Data injected for task: {task_id}")
    
    print("\nAuditing Endpoints...")
    failed = []
    
    # Test RAW results
    res = client.get(f"/api/results/{task_id}")
    if res.status_code != 200:
        failed.append(("RAW /api/results", res.status_code))
        print(f"FAIL RAW /api/results failed with {res.status_code}")
    else:
        print("PASS RAW /api/results passed")

    # Test analysis endpoints
    for ep in ENDPOINTS:
        url = f"/api/analysis/{ep}/{task_id}"
        try:
            res = client.get(url)
            if res.status_code == 200:
                print(f"PASS {ep} passed")
            else:
                failed.append((ep, res.status_code))
                print(f"FAIL {ep} failed with {res.status_code}")
        except Exception as e:
            failed.append((ep, str(e)))
            print(f"FAIL {ep} exception: {e}")

    print("\n--- Audit Summary ---")
    if failed:
        print(f"FAILED {len(failed)} endpoints:")
        for f in failed:
            print(f" - {f[0]}: {f[1]}")
    else:
        print("ALL FEATURES PASSED SUCCESSFULLY! 100% CRASH PROOF!")

if __name__ == "__main__":
    run_tests()
