import { useState } from 'react';
import type { CrawlState } from '../App';
import {
  Globe, FileText, Map, Play, Square, Settings2,
  ChevronDown, Shield, Clock, Bot, MonitorPlay
} from 'lucide-react';

type Mode = 'spider' | 'list' | 'sitemap';

interface Props {
  crawlState: CrawlState;
  setCrawlState: React.Dispatch<React.SetStateAction<CrawlState>>;
  ws: WebSocket | null;
  setWs: React.Dispatch<React.SetStateAction<WebSocket | null>>;
}

export default function CrawlConfig({ crawlState, setCrawlState, ws, setWs }: Props) {
  const [mode, setMode] = useState<Mode>('spider');
  const [startUrl, setStartUrl] = useState('');
  const [maxUrls, setMaxUrls] = useState(500);
  const [crawlScope, setCrawlScope] = useState('subfolder');
  const [ignoreRobots, setIgnoreRobots] = useState(false);
  const [useJsRendering, setUseJsRendering] = useState(false);
  const [delay, setDelay] = useState(0);
  const [userAgent, setUserAgent] = useState('desktop');
  const [urlList, setUrlList] = useState('');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { isCrawling } = crawlState;

  const handleStart = () => {
    // Validate
    if (mode === 'spider' && !startUrl.trim()) return;
    if (mode === 'list' && !urlList.trim()) return;
    if (mode === 'sitemap' && !sitemapUrl.trim()) return;

    const taskId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    setCrawlState({
      taskId,
      isCrawling: true,
      progress: 0,
      crawled: 0,
      queue: 0,
      speed: 0,
      latestUrl: 'Connecting...',
      latestStatus: 0,
      isBypass: false,
      results: [],
      error: '',
    });

    const socket = new WebSocket('ws://localhost:8000/api/crawler/ws');
    setWs(socket);

    socket.onopen = () => {
      const payload: Record<string, any> = {
        action: 'start',
        task_id: taskId,
        mode,
        ignore_robots: ignoreRobots,
        use_js_rendering: useJsRendering,
        delay,
        user_agent: userAgent,
      };
      if (mode === 'spider') {
        payload.start_url = startUrl.trim();
        payload.max_urls = maxUrls;
        payload.crawl_scope = crawlScope;
      } else if (mode === 'list') {
        payload.url_list = urlList.split('\n').map(u => u.trim()).filter(Boolean);
      } else {
        payload.sitemap_url = sitemapUrl.trim();
        payload.max_urls = maxUrls;
      }
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (ev) => {
      const data = JSON.parse(ev.data);
      if (data.type === 'progress') {
        setCrawlState(prev => ({
          ...prev,
          progress: data.progress,
          crawled: data.crawled,
          queue: data.queue,
          speed: data.speed,
          latestUrl: data.latest_url,
          latestStatus: data.status_code ?? 0,
          isBypass: data.is_bypass ?? false,
        }));
      } else if (data.type === 'complete') {
        setCrawlState(prev => ({
          ...prev,
          isCrawling: false,
          taskId: data.task_id || prev.taskId,
        }));
        // Fetch full results from REST API
        fetch(`http://localhost:8000/api/results/${data.task_id || taskId}`)
          .then(r => r.json())
          .then(results => {
            setCrawlState(prev => ({ ...prev, results }));
          })
          .catch(() => {});
        socket.close();
      } else if (data.type === 'error') {
        setCrawlState(prev => ({ ...prev, error: data.message, isCrawling: false }));
        socket.close();
      } else if (data.type === 'status') {
        setCrawlState(prev => ({ ...prev, latestUrl: data.message }));
      }
    };

    socket.onerror = () => {
      setCrawlState(prev => ({
        ...prev,
        error: 'WebSocket connection failed. Is the backend running on port 8000?',
        isCrawling: false,
      }));
    };
  };

  const handleStop = () => {
    if (ws) {
      ws.send(JSON.stringify({ action: 'stop', task_id: crawlState.taskId }));
      setCrawlState(prev => ({ ...prev, isCrawling: false }));
    }
  };

  return (
    <div className="glass-panel p-5 flex flex-col gap-5 sticky top-24">
      {/* Mode Selector */}
      <div>
        <label className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2 block">
          Crawl Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { id: 'spider', icon: Globe, label: 'Spider' },
            { id: 'list', icon: FileText, label: 'List' },
            { id: 'sitemap', icon: Map, label: 'Sitemap' },
          ] as const).map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              disabled={isCrawling}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                mode === m.id
                  ? 'bg-primary/15 border-primary/40 text-primary shadow-inner'
                  : 'bg-slate-800/30 border-slate-700/30 text-slate-500 hover:border-slate-600'
              }`}
            >
              <m.icon className="w-5 h-5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode-specific inputs */}
      <div className="flex flex-col gap-3">
        {mode === 'spider' && (
          <>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 block">URL</label>
              <input
                type="url"
                value={startUrl}
                onChange={e => setStartUrl(e.target.value)}
                placeholder="https://example.com"
                className="input-field"
                disabled={isCrawling}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Max URLs</label>
                <input
                  type="number"
                  value={maxUrls}
                  onChange={e => setMaxUrls(Number(e.target.value))}
                  className="input-field"
                  disabled={isCrawling}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Scope</label>
                <select value={crawlScope} onChange={e => setCrawlScope(e.target.value)} className="input-field" disabled={isCrawling}>
                  <option value="subfolder">Subfolder</option>
                  <option value="subdomain">Subdomain</option>
                  <option value="exact">Exact</option>
                </select>
              </div>
            </div>
          </>
        )}

        {mode === 'list' && (
          <div>
            <label className="text-[11px] text-slate-500 font-semibold mb-1 block">URLs (one per line)</label>
            <textarea
              value={urlList}
              onChange={e => setUrlList(e.target.value)}
              rows={8}
              className="input-field font-mono text-xs"
              placeholder={"https://example.com/page1\nhttps://example.com/page2"}
              disabled={isCrawling}
            />
          </div>
        )}

        {mode === 'sitemap' && (
          <>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Sitemap URL</label>
              <input
                type="url"
                value={sitemapUrl}
                onChange={e => setSitemapUrl(e.target.value)}
                placeholder="https://example.com/sitemap.xml"
                className="input-field"
                disabled={isCrawling}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Max URLs</label>
              <input
                type="number"
                value={maxUrls}
                onChange={e => setMaxUrls(Number(e.target.value))}
                className="input-field"
                disabled={isCrawling}
              />
            </div>
          </>
        )}
      </div>

      {/* Advanced Options */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Advanced Options
        <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-800/50 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Delay (s)
              </label>
              <input
                type="number"
                value={delay}
                onChange={e => setDelay(Number(e.target.value))}
                min={0}
                max={10}
                step={0.1}
                className="input-field"
                disabled={isCrawling}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 flex items-center gap-1">
                <Bot className="w-3 h-3" /> User Agent
              </label>
              <select value={userAgent} onChange={e => setUserAgent(e.target.value)} className="input-field" disabled={isCrawling}>
                <option value="desktop">Chrome Desktop</option>
                <option value="mobile">Mobile Android</option>
                <option value="googlebot">Googlebot</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ignoreRobots}
                onChange={e => setIgnoreRobots(e.target.checked)}
                disabled={isCrawling}
                className="rounded border-slate-700 bg-slate-900 accent-primary"
              />
              <Shield className="w-3.5 h-3.5" />
              Ignore robots.txt
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none" title="Uses Headless Chromium. Slower but required for SPAs.">
              <input
                type="checkbox"
                checked={useJsRendering}
                onChange={e => setUseJsRendering(e.target.checked)}
                disabled={isCrawling}
                className="rounded border-slate-700 bg-slate-900 accent-primary"
              />
              <MonitorPlay className="w-3.5 h-3.5" />
              Use JS Rendering (Playwright)
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/50">
        <button onClick={handleStart} disabled={isCrawling} className="btn-primary flex items-center justify-center gap-2">
          <Play className="w-4 h-4" /> Crawl
        </button>
        <button onClick={handleStop} disabled={!isCrawling} className="btn-danger flex items-center justify-center gap-2">
          <Square className="w-4 h-4" /> Stop
        </button>
      </div>

      {/* Akamai Info */}
      <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl">
        <p className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-1">Akamai Bypass Active</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          If a site blocks requests (403/429), UltimateCrawler automatically retries with native OS cURL to bypass WAF fingerprinting.
        </p>
      </div>
    </div>
  );
}
