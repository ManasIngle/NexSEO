"""
Content analysis utilities: duplicate detection, content quality scoring,
keyword extraction, and sitemap XML generation.
"""
import re
import hashlib
from collections import Counter
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom


# ─── Near-Duplicate Detection (SimHash) ───────────────────────────────────────

def _tokenize(text: str):
    """Split text into lowercase word tokens."""
    return re.findall(r'\b\w+\b', text.lower())

def simhash(text: str, hashbits=64):
    """Compute a SimHash fingerprint for a text string."""
    tokens = _tokenize(text)
    v = [0] * hashbits
    for token in tokens:
        token_hash = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
        for i in range(hashbits):
            bitmask = 1 << i
            if token_hash & bitmask:
                v[i] += 1
            else:
                v[i] -= 1
    fingerprint = 0
    for i in range(hashbits):
        if v[i] > 0:
            fingerprint |= 1 << i
    return fingerprint

def hamming_distance(a: int, b: int):
    return bin(a ^ b).count('1')

def find_near_duplicates(pages: list, threshold=5):
    """
    Compare all pages and find near-duplicate pairs.
    Returns list of dicts with url_a, url_b, similarity_score.
    """
    fingerprints = []
    for page in pages:
        text = f"{page.get('title','')} {page.get('meta_description','')} {page.get('h1_tags','')}"
        fp = simhash(text)
        fingerprints.append((page.get('url', ''), fp, page.get('word_count', 0)))
    
    duplicates = []
    for i in range(len(fingerprints)):
        for j in range(i + 1, len(fingerprints)):
            url_a, fp_a, wc_a = fingerprints[i]
            url_b, fp_b, wc_b = fingerprints[j]
            dist = hamming_distance(fp_a, fp_b)
            if dist <= threshold:
                similarity = round((1 - dist / 64) * 100, 1)
                duplicates.append({
                    'url_a': url_a,
                    'url_b': url_b,
                    'similarity': similarity,
                    'distance': dist
                })
    return duplicates


# ─── Content Quality Scoring ──────────────────────────────────────────────────

def score_page(page: dict) -> dict:
    """Score a page 0-100 based on SEO best practices."""
    score = 0
    issues = []
    tips = []
    
    # Title (max 20 pts)
    tl = page.get('title_length', 0)
    if tl == 0:
        issues.append("Missing page title")
    elif tl < 30:
        score += 8
        issues.append(f"Title too short ({tl} chars, aim for 30-60)")
    elif tl > 60:
        score += 12
        issues.append(f"Title too long ({tl} chars, aim for 30-60)")
    else:
        score += 20

    # Meta description (max 15 pts)
    ml = page.get('meta_desc_length', 0)
    if ml == 0:
        issues.append("Missing meta description")
    elif ml < 120:
        score += 7
        issues.append(f"Meta description too short ({ml} chars, aim for 120-160)")
    elif ml > 160:
        score += 10
        issues.append(f"Meta description too long ({ml} chars, aim for 120-160)")
    else:
        score += 15

    # H1 (max 15 pts)
    h1c = page.get('h1_count', 0)
    if h1c == 0:
        issues.append("Missing H1 tag")
    elif h1c > 1:
        score += 7
        issues.append(f"Multiple H1 tags ({h1c}), should have exactly 1")
    else:
        score += 15

    # Status code (max 10 pts)
    sc = page.get('status_code', 0)
    if sc == 200:
        score += 10
    else:
        issues.append(f"Non-200 status code: {sc}")

    # Response time (max 10 pts)
    rt = page.get('response_time', 0)
    if rt < 1.0:
        score += 10
    elif rt < 3.0:
        score += 6
        tips.append(f"Response time {rt:.1f}s, aim for under 1s")
    else:
        score += 2
        issues.append(f"Slow response time: {rt:.1f}s")

    # Images alt text (max 10 pts)
    img_count = page.get('image_count', 0)
    missing_alt = page.get('images_without_alt', 0)
    if img_count == 0:
        score += 10
    elif missing_alt == 0:
        score += 10
    else:
        ratio = (img_count - missing_alt) / img_count
        score += int(ratio * 10)
        issues.append(f"{missing_alt}/{img_count} images missing alt text")

    # Schema markup (max 5 pts)
    if page.get('schema_count', 0) > 0:
        score += 5
    else:
        tips.append("Add structured data (Schema.org)")

    # Canonical (max 5 pts)
    if page.get('canonical_url', ''):
        score += 5
    else:
        tips.append("Add a canonical URL")

    # Word count (max 5 pts)
    wc = page.get('word_count', 0)
    if wc >= 300:
        score += 5
    elif wc > 0:
        score += 2
        tips.append(f"Low word count ({wc}), aim for 300+")
    else:
        issues.append("No content found on page")

    # Internal links (max 5 pts)
    il = page.get('internal_links_count', 0)
    if il >= 3:
        score += 5
    elif il > 0:
        score += 2
        tips.append(f"Only {il} internal links, add more for better crawlability")
    else:
        issues.append("No internal links found")

    return {
        'url': page.get('url', ''),
        'score': min(score, 100),
        'grade': 'A' if score >= 90 else 'B' if score >= 75 else 'C' if score >= 60 else 'D' if score >= 40 else 'F',
        'issues': issues,
        'tips': tips
    }


# ─── Keyword Extraction (TF-based) ───────────────────────────────────────────

STOP_WORDS = set("the a an is are was were be been being have has had do does did will would shall should can could may might must and but or nor for yet so at by from in into of on to up with as it its this that these those".split())

def extract_keywords(text: str, top_n=20):
    """Extract top keywords from text using term frequency."""
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    words = [w for w in words if w not in STOP_WORDS]
    counter = Counter(words)
    return [{'keyword': kw, 'count': count} for kw, count in counter.most_common(top_n)]


# ─── Sitemap XML Generator ───────────────────────────────────────────────────

def generate_sitemap_xml(pages: list) -> str:
    """Generate a valid sitemap.xml from crawled indexable pages."""
    urlset = Element('urlset')
    urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
    
    for page in pages:
        if page.get('indexability') != 'Indexable':
            continue
        if page.get('status_code') != 200:
            continue
            
        url_elem = SubElement(urlset, 'url')
        loc = SubElement(url_elem, 'loc')
        loc.text = page.get('url', '')
        
        if page.get('crawl_timestamp'):
            lastmod = SubElement(url_elem, 'lastmod')
            lastmod.text = page['crawl_timestamp'][:10]  # YYYY-MM-DD
    
    rough_string = tostring(urlset, 'unicode')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")


# ─── Custom Extractor Engine ─────────────────────────────────────────────────

def run_custom_extractors(html: str, url: str, extractors: list) -> dict:
    """
    Run user-defined regex or CSS selector extractors against page HTML.
    Each extractor is a dict: { name: str, type: 'regex'|'css', pattern: str }
    """
    results = {}
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    
    for ext in extractors:
        name = ext.get('name', 'unnamed')
        ext_type = ext.get('type', 'regex')
        pattern = ext.get('pattern', '')
        
        try:
            if ext_type == 'regex':
                matches = re.findall(pattern, html)
                results[name] = matches[:10]  # Cap at 10
            elif ext_type == 'css':
                elements = soup.select(pattern)
                results[name] = [el.get_text().strip()[:200] for el in elements[:10]]
            else:
                results[name] = []
        except Exception as e:
            results[name] = [f"Error: {str(e)}"]
    
    return results

# ─── Phase 1: Quick Wins ──────────────────────────────────────────────────────

def get_broken_links(pages: list) -> list:
    """Find all internal links that point to pages returning 404 or >= 400 errors."""
    broken = []
    status_lookup = {p.get('url', '').split('#')[0].rstrip('/'): p.get('status_code', 0) for p in pages}
    
    for page in pages:
        source_url = page.get('url', '')
        for link in page.get('internal_links', []):
            target = link.get('url', '').split('#')[0].rstrip('/')
            status = status_lookup.get(target)
            if status is not None and status >= 400:
                broken.append({
                    'source': source_url,
                    'target': target,
                    'anchor': link.get('anchor_text', ''),
                    'status_code': status
                })
    return broken

def get_orphan_pages(pages: list) -> list:
    """Find crawled pages that have exactly 0 incoming internal links."""
    inbound_counts = {p.get('url', '').split('#')[0].rstrip('/'): 0 for p in pages}
    
    for page in pages:
        source_url = page.get('url', '').split('#')[0].rstrip('/')
        for link in page.get('internal_links', []):
            target = link.get('url', '').split('#')[0].rstrip('/')
            if target in inbound_counts and target != source_url:
                inbound_counts[target] += 1
                
    orphans = []
    for page in pages:
        url = page.get('url', '').split('#')[0].rstrip('/')
        # Ignore depth 0 (start url) which often has 0 inbound if crawled standalone
        if inbound_counts.get(url, 0) == 0 and page.get('depth', 1) > 0:
            orphans.append({
                'url': page.get('url', ''),
                'title': page.get('title', ''),
                'status_code': page.get('status_code', 0)
            })
    return orphans

def get_redirect_flattener(pages: list) -> list:
    """Find pages with redirect chains (2+ hops) and suggest the direct map."""
    flattener = []
    for page in pages:
        chain = page.get('redirect_chain', [])
        if len(chain) > 1:
            original = chain[0].get('from_url', '')
            final = page.get('url', '')
            flattener.append({
                'original_url': original,
                'final_url': final,
                'hops': len(chain),
                'chain_detail': " -> ".join([c.get('from_url', '') for c in chain] + [final])
            })
    return flattener

# ─── Phase 2: Core Upgrades ───────────────────────────────────────────────────

def get_link_graph(pages: list) -> dict:
    """Build a nodes/edges graph for D3/force-graph visualization."""
    nodes = []
    links = []
    crawled_urls = {p.get('url', '').split('#')[0].rstrip('/') for p in pages}
    
    for page in pages:
        source_url = page.get('url', '').split('#')[0].rstrip('/')
        nodes.append({
            'id': source_url,
            'status': page.get('status_code', 0),
            'depth': page.get('depth', 0),
            'title': page.get('title', '')
        })
        
        for link in page.get('internal_links', []):
            target = link.get('url', '').split('#')[0].rstrip('/')
            if target in crawled_urls:
                links.append({
                    'source': source_url,
                    'target': target
                })
    return {'nodes': nodes, 'links': links}

def get_security_headers(pages: list) -> list:
    """Extract and score security headers for each page."""
    results = []
    for page in pages:
        sec = page.get('security_headers', {})
        score = 0
        if sec.get('csp'): score += 1
        if sec.get('hsts'): score += 1
        if sec.get('x_frame'): score += 1
        
        results.append({
            'url': page.get('url', ''),
            'status_code': page.get('status_code', 0),
            'csp': sec.get('csp', ''),
            'hsts': sec.get('hsts', ''),
            'x_frame': sec.get('x_frame', ''),
            'permissions_policy': sec.get('permissions_policy', ''),
            'score': score
        })
    return results

def get_mixed_content(pages: list) -> list:
    """Find pages with HTTP resources on HTTPS URLs."""
    results = []
    for page in pages:
        mixed = page.get('mixed_content', [])
        if mixed:
            results.append({
                'url': page.get('url', ''),
                'mixed_count': len(mixed),
                'resources': mixed[:10]  # Cap at 10 for display
            })
    return results

def validate_structured_data(pages: list) -> list:
    """Validate JSON-LD schema against basic required fields."""
    results = []
    for page in pages:
        schemas = page.get('schema_json', [])
        if not schemas:
            continue
            
        validations = []
        for schema in schemas:
            stype = schema.get('@type', 'Unknown')
            missing = []
            
            if stype == 'Article' or stype == 'NewsArticle' or stype == 'BlogPosting':
                for field in ['headline', 'author', 'datePublished', 'image']:
                    if field not in schema: missing.append(field)
            elif stype == 'Product':
                for field in ['name', 'image']:
                    if field not in schema: missing.append(field)
                if 'offers' not in schema: missing.append('offers')
            elif stype == 'Organization' or stype == 'LocalBusiness':
                for field in ['name', 'url']:
                    if field not in schema: missing.append(field)
                    
            status = 'Pass' if not missing else 'Fail'
            validations.append({
                'type': stype,
                'status': status,
                'missing_fields': missing
            })
            
        results.append({
            'url': page.get('url', ''),
            'schemas': validations,
            'pass_count': sum(1 for v in validations if v['status'] == 'Pass'),
            'fail_count': sum(1 for v in validations if v['status'] == 'Fail')
        })
    return results

def get_content_freshness(pages: list) -> list:
    """Return raw freshness dates for frontend parsing."""
    results = []
    for page in pages:
        lm = page.get('last_modified_header', '')
        mm = page.get('meta_modified', '')
        if lm or mm:
            results.append({
                'url': page.get('url', ''),
                'last_modified_header': lm,
                'meta_modified': mm,
            })
    return results

# ─── Phase 3: Enterprise Features ─────────────────────────────────────────────

def get_wcag_issues(pages: list) -> list:
    """Return structural accessibility issues."""
    results = []
    for page in pages:
        issues = page.get('wcag_issues', [])
        if issues:
            results.append({
                'url': page.get('url', ''),
                'issues': issues,
                'issue_count': len(issues)
            })
    return results

def get_web_vitals(pages: list) -> list:
    """Return Core Web Vitals if JS rendering was used."""
    results = []
    for page in pages:
        vitals = page.get('web_vitals', {})
        if vitals and (vitals.get('fcp', 0) > 0 or vitals.get('load', 0) > 0):
            results.append({
                'url': page.get('url', ''),
                'fcp': round(vitals.get('fcp', 0), 2),
                'load': round(vitals.get('load', 0), 2)
            })
    return results

def generate_ai_action_plan(summary: dict) -> dict:
    """Generate a heuristic-based AI SEO Action Plan."""
    actions = []
    
    # Priority 1: Blocking / High Impact
    if summary.get('errors', 0) > 0:
        actions.append({
            'title': 'Fix Critical HTTP Errors',
            'impact': 'High',
            'effort': 'Medium',
            'description': f"Detected {summary['errors']} pages returning 4xx/5xx status codes. These waste crawl budget and harm user experience. Review the 'Status' or 'Errors' tab and implement 301 redirects or restore missing content."
        })
        
    if summary.get('broken_links_count', 0) > 0:
        actions.append({
            'title': 'Repair Broken Internal Links',
            'impact': 'High',
            'effort': 'Low',
            'description': f"Found {summary['broken_links_count']} broken internal links. These create dead-ends for users and search engine bots. Update the href targets to working URLs."
        })

    # Priority 2: Indexability & Architecture
    if summary.get('orphan_pages_count', 0) > 0:
        actions.append({
            'title': 'Integrate Orphan Pages',
            'impact': 'Medium',
            'effort': 'Medium',
            'description': f"{summary['orphan_pages_count']} orphan pages were found. These pages have zero incoming internal links. If they are important, link to them from relevant category or blog pages to allow link equity to flow."
        })
        
    if summary.get('redirect_chains_count', 0) > 0:
        actions.append({
            'title': 'Flatten Redirect Chains',
            'impact': 'Medium',
            'effort': 'Low',
            'description': f"{summary['redirect_chains_count']} redirect chains (multi-hop) detected. Update the source internal links to point directly to the final destination URL."
        })

    # Priority 3: Content & On-Page
    missing_basics = (summary.get('missing_title', 0) + 
                      summary.get('missing_meta', 0) + 
                      summary.get('missing_h1', 0))
    if missing_basics > 0:
        actions.append({
            'title': 'Optimize On-Page Metadata',
            'impact': 'Medium',
            'effort': 'High',
            'description': f"There are {missing_basics} missing Title, Meta Description, or H1 tags across the site. Prioritize rewriting these for your top traffic-driving pages."
        })
        
    if not actions:
        actions.append({
            'title': 'Maintain Current Strategy',
            'impact': 'Low',
            'effort': 'Low',
            'description': "Your site's technical health is exceptional. No critical action items were detected. Focus on producing high-quality content and building backlinks."
        })
        
    return {
        'timestamp': datetime.now().isoformat(),
        'actions': actions
    }
