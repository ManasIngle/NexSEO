import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import requests
import json
from datetime import datetime
import xml.etree.ElementTree as ET
from urllib.robotparser import RobotFileParser
import subprocess
import re

class UltimateCrawlerCrawler:
    def __init__(self, max_urls=100000, ignore_robots=False, crawl_scope="subfolder", delay=0.0, user_agent="desktop", use_js_rendering=False):
        self.max_urls = max_urls
        self.ignore_robots = ignore_robots
        self.crawl_scope = crawl_scope
        self.delay = delay
        self.use_js_rendering = use_js_rendering
        
        self.user_agents = {
            "desktop": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "mobile": "Mozilla/5.0 (Linux; Android 13; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36",
            "googlebot": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
        }
        self.active_ua = self.user_agents.get(user_agent, self.user_agents["desktop"])
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': self.active_ua,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=50,
            pool_maxsize=50,
            max_retries=2
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        
        self.robots_cache = {}
        self.base_domain = None
        self.base_path = None
    
    def normalize_domain(self, domain):
        return domain.replace('www.', '')
    
    def set_base_url(self, url):
        parsed = urlparse(url)
        self.base_domain = self.normalize_domain(parsed.netloc)
        self.base_path = parsed.path.rstrip('/')
    
    def should_crawl_url(self, url):
        parsed = urlparse(url)
        domain = self.normalize_domain(parsed.netloc)
        
        if self.crawl_scope == "exact":
            expected_url = urljoin(f"https://{parsed.netloc}", self.base_path)
            return url.split('?')[0] == expected_url
        elif self.crawl_scope == "subdomain":
            return self.base_domain in domain
        else:
            return (domain == self.base_domain and 
                   parsed.path.startswith(self.base_path if self.base_path else '/'))
    
    def can_fetch(self, url):
        if self.ignore_robots:
            return True
        try:
            domain = urlparse(url).netloc
            if domain not in self.robots_cache:
                try:
                    rp = RobotFileParser()
                    rp.set_url(f"https://{domain}/robots.txt")
                    rp.read()
                    self.robots_cache[domain] = rp
                except:
                    self.robots_cache[domain] = None
            if self.robots_cache[domain] is None:
                return True
            return self.robots_cache[domain].can_fetch(self.active_ua, url)
        except:
            return True

    def fetch_with_curl(self, url):
        """Fallback method using native CURL to bypass Akamai/Cloudflare blocks"""
        cmd = [
            'curl', '-s', '-L',
            '--connect-timeout', '10',
            '--max-time', '20',
            '-H', f'User-Agent: {self.active_ua}',
            '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            '-H', 'Accept-Language: en-US,en;q=0.5',
            '-w', '\\n%{url_effective}|||%{http_code}',
            '--',
            url
        ]
        try:
            # We fetch the HTML body for parsing instead of just headers
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
            if res.returncode != 0:
                return None, 0, url
            
            output = res.stdout
            if not output:
                return None, 0, url
            
            parts = output.rsplit('\\n', 1)
            if len(parts) == 2:
                body = parts[0]
                meta = parts[1].strip().split('|||')
                final_url = meta[0] if len(meta) > 0 else url
                status_code = int(meta[1]) if len(meta) > 1 and meta[1].isdigit() else 200
                return body, status_code, final_url
            return None, 0, url
        except Exception:
            return None, 0, url
    
    def extract_sitemap_urls(self, sitemap_url):
        urls = []
        try:
            response = self.session.get(sitemap_url, timeout=15)
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                namespaces = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                sitemapindex = root.findall('.//sitemap:sitemap', namespaces)
                if sitemapindex:
                    for sitemap in sitemapindex:
                        loc = sitemap.find('sitemap:loc', namespaces)
                        if loc is not None:
                            urls.extend(self.extract_sitemap_urls(loc.text))
                else:
                    url_elements = root.findall('.//sitemap:url', namespaces)
                    for url_elem in url_elements:
                        loc = url_elem.find('sitemap:loc', namespaces)
                        if loc is not None:
                            urls.append(loc.text)
        except Exception as e:
            print(f"Error parsing sitemap: {e}")
        return urls
        
    def extract_page_data(self, url, browser_context=None):
        try:
            if self.delay > 0:
                time.sleep(self.delay)

            start_time = time.time()
            html_content = ""
            status_code = 0
            final_url = url
            is_akamai_bypass = False
            redirect_chain = []
            headers_dict = {}
            vitals = {'fcp': 0, 'load': 0}
            
            try:
                if self.use_js_rendering and browser_context:
                    page = browser_context.new_page()
                    try:
                        response = page.goto(url, timeout=20000, wait_until="networkidle")
                        if not response:
                            raise Exception("Playwright blank response")
                        
                        status_code = response.status
                        html_content = page.content()
                        final_url = page.url
                        headers_dict = {k.lower(): v for k, v in response.all_headers().items()}
                        
                        # Extract Core Web Vitals via JS
                        perf = page.evaluate('''() => {
                            let m = { fcp: 0, load: 0 };
                            try {
                                const paint = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint');
                                if (paint) m.fcp = paint.startTime;
                                m.load = performance.timing.loadEventEnd - performance.timing.navigationStart;
                            } catch(e) {}
                            return m;
                        }''')
                        vitals = perf
                    finally:
                        page.close()
                else:
                    response = self.session.get(url, timeout=10, allow_redirects=True, stream=True)
                    status_code = response.status_code
                    
                    if status_code in [403, 429, 401] or response.elapsed.total_seconds() > 9:
                        raise Exception("WAF Blocked or Timeout - Triggering Bypass")
                    
                    # Prevent OOM DoS (Limit to 5MB)
                    content = b""
                    for chunk in response.iter_content(chunk_size=8192):
                        content += chunk
                        if len(content) > 5 * 1024 * 1024:
                            break
                    html_content = content
                    
                    final_url = response.url
                    headers_dict = {k.lower(): v for k, v in response.headers.items()}
                    
                    if hasattr(response, 'history') and response.history:
                        for i, resp in enumerate(response.history):
                            redirect_chain.append({
                                'step': i + 1,
                                'from_url': resp.url,
                                'to_url': resp.headers.get('location', ''),
                                'status_code': resp.status_code,
                                'redirect_type': f'{resp.status_code} Redirect'
                            })
                        
            except Exception as e:
                # Akamai / Cloudflare Bypass Fallback
                is_akamai_bypass = True
                html_content, status_code, final_url = self.fetch_with_curl(url)
                if not html_content:
                    raise Exception(f"Bypass failed: {e}")

            response_time = time.time() - start_time
            soup = BeautifulSoup(html_content, 'html.parser')
            
            title = soup.find('title')
            title_text = title.get_text().strip() if title else ""
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            meta_desc_text = meta_desc.get('content', '') if meta_desc else ""
            canonical = soup.find('link', attrs={'rel': 'canonical'})
            canonical_url = canonical.get('href') if canonical else ""
            meta_robots = soup.find('meta', attrs={'name': 'robots'})
            robots_content = meta_robots.get('content', '') if meta_robots else ""
            
            og_title = soup.find('meta', attrs={'property': 'og:title'})
            og_image = soup.find('meta', attrs={'property': 'og:image'})
            og_desc = soup.find('meta', attrs={'property': 'og:description'})
            twitter_title = soup.find('meta', attrs={'name': 'twitter:title'})
            twitter_desc = soup.find('meta', attrs={'name': 'twitter:description'})
            twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
            
            social_tags = {
                'og_title': og_title.get('content', '') if og_title else '',
                'og_image': og_image.get('content', '') if og_image else '',
                'og_desc': og_desc.get('content', '') if og_desc else '',
                'twitter_title': twitter_title.get('content', '') if twitter_title else '',
                'twitter_desc': twitter_desc.get('content', '') if twitter_desc else '',
                'twitter_image': twitter_image.get('content', '') if twitter_image else '',
            }
            
            h1_tags = [h1.get_text().strip() for h1 in soup.find_all('h1')]
            h2_tags = [h2.get_text().strip() for h2 in soup.find_all('h2')]
            h3_tags = [h3.get_text().strip() for h3 in soup.find_all('h3')]
            h4_tags = [h4.get_text().strip() for h4 in soup.find_all('h4')]
            
            internal_links = []
            external_links = []
            source_domain = self.normalize_domain(urlparse(final_url).netloc)
            
            for link in soup.find_all('a', href=True):
                href = urljoin(final_url, link['href']).split('#')[0] # ignore fragments
                if not href.startswith('http'): continue
                
                link_text = link.get_text().strip()[:100]
                target_domain = self.normalize_domain(urlparse(href).netloc)
                
                # Check internal by comparing normalized domains
                if target_domain == source_domain or (self.base_domain and target_domain == self.base_domain):
                    internal_links.append({'url': href, 'anchor_text': link_text})
                else:
                    external_links.append({'url': href, 'anchor_text': link_text})
            
            images = [{'src': urljoin(final_url, img.get('src', '')), 'alt': img.get('alt', '')} for img in soup.find_all('img')]
            
            # Accessibility (WCAG) Checks
            wcag_issues = []
            if not soup.find('html', lang=True):
                wcag_issues.append("Missing lang attribute on <html>")
            
            for img in images:
                if not img.get('alt'):
                    wcag_issues.append(f"Image missing alt text: {img['src'][:50]}...")
            
            for btn in soup.find_all('button'):
                if not btn.get_text().strip() and not btn.get('aria-label'):
                    wcag_issues.append("Button missing text or aria-label")
                    
            for inp in soup.find_all('input'):
                inp_type = inp.get('type', 'text').lower()
                if inp_type not in ['submit', 'button', 'hidden', 'image']:
                    if not inp.get('aria-label') and not inp.get('id'):
                        wcag_issues.append(f"Input type '{inp_type}' missing aria-label or id for label pairing")
            
            schema_data_list = []
            schema_types = []
            for script in soup.find_all('script', type='application/ld+json'):
                try:
                    if script.string:
                        schema_data = json.loads(script.string)
                        if isinstance(schema_data, dict):
                            schema_data_list.append(schema_data)
                            if '@type' in schema_data: schema_types.append(schema_data['@type'])
                        elif isinstance(schema_data, list):
                            for s in schema_data:
                                if isinstance(s, dict):
                                    schema_data_list.append(s)
                                    if '@type' in s: schema_types.append(s['@type'])
                except: pass
            
            mixed_content = []
            if final_url.startswith('https'):
                for tag in soup.find_all(['img', 'script', 'iframe', 'link']):
                    url_attr = tag.get('src') or tag.get('href')
                    if url_attr and url_attr.startswith('http://'):
                        mixed_content.append(url_attr)
                        
            sec_headers = {
                'csp': headers_dict.get('content-security-policy', ''),
                'hsts': headers_dict.get('strict-transport-security', ''),
                'x_frame': headers_dict.get('x-frame-options', ''),
                'permissions_policy': headers_dict.get('permissions-policy', '')
            }
            
            last_modified_header = headers_dict.get('last-modified', '')
            article_modified = soup.find('meta', attrs={'property': 'article:modified_time'})
            meta_modified = article_modified.get('content', '') if article_modified else ''
            
            word_count = len(soup.get_text().split())
            
            semantic_tags = {
                'nav': len(soup.find_all('nav')),
                'main': len(soup.find_all('main')),
                'article': len(soup.find_all('article')),
                'aside': len(soup.find_all('aside')),
                'header': len(soup.find_all('header')),
                'footer': len(soup.find_all('footer'))
            }
            
            hreflangs = []
            for link in soup.find_all('link', attrs={'rel': 'alternate'}):
                lang = link.get('hreflang')
                if lang:
                    hreflangs.append({'lang': lang, 'href': link.get('href', '')})
            
            return {
                'url': final_url,
                'original_url': url,
                'status_code': status_code,
                'is_akamai_bypass': is_akamai_bypass,
                'title': title_text,
                'title_length': len(title_text),
                'meta_description': meta_desc_text,
                'meta_desc_length': len(meta_desc_text),
                'canonical_url': canonical_url,
                'meta_robots': robots_content,
                'h1_tags': '; '.join(h1_tags),
                'h1_count': len(h1_tags),
                'h2_tags': '; '.join(h2_tags),
                'h2_count': len(h2_tags),
                'word_count': word_count,
                'response_time': response_time,
                'content_length': len(html_content),
                'internal_links_count': len(internal_links),
                'external_links_count': len(external_links),
                'internal_links': internal_links,
                'external_links': external_links,
                'images': images,
                'image_count': len(images),
                'images_without_alt': len([img for img in images if not img['alt']]),
                'schema_types': '; '.join(schema_types),
                'schema_count': len(schema_types),
                'schema_json': schema_data_list,
                'mixed_content': mixed_content,
                'security_headers': sec_headers,
                'last_modified_header': last_modified_header,
                'meta_modified': meta_modified,
                'wcag_issues': wcag_issues,
                'web_vitals': vitals,
                'redirect_chain': redirect_chain,
                'redirect_count': len(redirect_chain),
                'indexability': self.get_indexability_status(status_code, robots_content),
                'social_tags': social_tags,
                'semantic_tags': semantic_tags,
                'hreflangs': hreflangs,
                'h3_tags': '; '.join(h3_tags),
                'h4_tags': '; '.join(h4_tags),
                'crawl_timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {
                'url': url, 'original_url': url, 'status_code': 0, 'error': str(e),
                'is_akamai_bypass': False, 'title': '', 'title_length': 0, 
                'meta_description': '', 'meta_desc_length': 0, 'indexability': 'Error',
                'internal_links': [], 'external_links': [], 'images': [],
                'response_time': 0, 'internal_links_count': 0, 'external_links_count': 0,
                'h1_count': 0, 'h2_count': 0, 'word_count': 0
            }
    
    def get_indexability_status(self, status_code, robots_content):
        if status_code != 200:
            return 'Non-Indexable'
        if 'noindex' in robots_content.lower():
            return 'Non-Indexable'
        return 'Indexable'
