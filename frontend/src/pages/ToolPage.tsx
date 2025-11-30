import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tools } from '../data/tools';
import { ArrowLeft, Play, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

// Import Tabs
import {
  ScoresTab, BrokenLinksTab, RedirectChainsTab, OrphansTab,
  TitlesTab, MetaTab, PerformanceTab, KeywordsTab, DuplicatesTab,
  StatusTab, ExternalTab
} from '../components/ResultsDashboard';
import { StructuredDataTab, MixedContentTab, FreshnessTab } from '../components/Phase2Tabs';
import { WcagTab, WebVitalsTab } from '../components/Phase3Tabs';
import {
  CannibalizationTab, SocialTagsTab, HeadingHierarchyTab, ReadabilityTab,
  ImageSeoTab, LinkFlowTab, SemanticHtmlTab, HreflangTab, CanonicalAuditTab,
  UrlStructureTab
} from '../components/Phase4Tabs';
import LinkGraphTab from '../components/LinkGraphTab';

const API = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/api/crawler/ws';

export default function ToolPage() {
  const { id } = useParams<{ id: string }>();
  const tool = tools.find(t => t.id === id);

  const [inputUrls, setInputUrls] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'fetching' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState('');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [rawData, setRawData] = useState<any>(null); // For meta-analyzer which needs raw results
  const wsRef = useRef<WebSocket | null>(null);

  // Cleanup WS on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  if (!tool) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Tool Not Found</h2>
        <Link to="/" className="btn-primary">Return to Home</Link>
      </div>
    );
  }

  const handleRun = () => {
    const urls = inputUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      setError('Please enter at least one URL.');
      return;
    }
    if (urls.length > 100) {
      setError('Maximum 100 URLs allowed for free tools.');
      return;
    }
    
    setError('');
    setStatus('running');
    setProgress(null);
    setAnalysisData(null);
    setRawData(null);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        action: 'start',
        mode: 'list',
        url_list: urls,
        ignore_robots: true,
      }));
    };

    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'progress') {
        setProgress(msg);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setStatus('error');
        ws.close();
      } else if (msg.type === 'complete') {
        ws.close();
        setStatus('fetching');
        try {
          const taskId = msg.task_id;
          // For tools that need raw results array
          if (tool.id === 'meta-analyzer' || tool.endpoint === 'raw') {
            const rawRes = await axios.get(`${API}/api/results/${taskId}`);
            setRawData(rawRes.data);
            setAnalysisData(rawRes.data); // Keep both for simplicity
          } else {
            const res = await axios.get(`${API}/api/analysis/${tool.endpoint}/${taskId}`);
            setAnalysisData(res.data);
          }
          setStatus('complete');
        } catch (err: any) {
          setError(err.message || 'Failed to fetch analysis results.');
          setStatus('error');
        }
      }
    };

    ws.onerror = () => {
      setError('WebSocket connection failed.');
      setStatus('error');
    };
  };

  const renderResults = () => {
    if (status !== 'complete') return null;

    if (tool.id === 'meta-analyzer') {
      return (
        <div className="space-y-6 animate-slide-up">
          <div className="glass-panel p-5">
            <h3 className="text-lg font-bold mb-4 text-[var(--color-text-main)]">Title Tags Analysis</h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-surface-2/30">
              <TitlesTab data={rawData || []} />
            </div>
          </div>
          <div className="glass-panel p-5">
            <h3 className="text-lg font-bold mb-4 text-[var(--color-text-main)]">Meta Descriptions Analysis</h3>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-surface-2/30">
              <MetaTab data={rawData || []} />
            </div>
          </div>
        </div>
      );
    }

    // Default renderer for other tools
    const ComponentMap: Record<string, React.ElementType> = {
      'seo-score': ScoresTab,
      'broken-links': BrokenLinksTab,
      'redirect-chains': RedirectChainsTab,
      'orphan-pages': OrphansTab,
      'schema-validator': StructuredDataTab,
      'wcag-checker': WcagTab,
      'core-web-vitals': WebVitalsTab,
      'mixed-content': MixedContentTab,
      'content-freshness': FreshnessTab,
      'keyword-analyzer': KeywordsTab,
      'duplicate-checker': DuplicatesTab,
      'link-graph': LinkGraphTab,
      'performance-analyzer': PerformanceTab,
      'cannibalization-checker': CannibalizationTab,
      'social-tags-preview': SocialTagsTab,
      'heading-hierarchy': HeadingHierarchyTab,
      'readability-grader': ReadabilityTab,
      'image-seo': ImageSeoTab,
      'link-flow': LinkFlowTab,
      'semantic-html': SemanticHtmlTab,
      'hreflang-validator': HreflangTab,
      'canonical-audit': CanonicalAuditTab,
      'url-structure': UrlStructureTab,
      'http-status-checker': StatusTab,
      'outbound-link-analyzer': ExternalTab
    };

    const TabComponent = ComponentMap[tool.id];
    if (!TabComponent) return <p className="text-[var(--color-text-muted)]">Renderer not implemented.</p>;

    return (
      <div className="glass-panel p-5 animate-slide-up">
        <h3 className="text-lg font-bold mb-4 text-[var(--color-text-main)]">Analysis Results</h3>
        <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-surface-2/30">
          <TabComponent data={analysisData || []} plan={analysisData || {}} />
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto w-full px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-sm font-semibold text-[var(--color-text-muted)] hover:text-primary transition-colors mb-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Tools
        </Link>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <tool.icon className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--color-text-main)]">{tool.title}</h2>
        </div>
        <p className="text-[var(--color-text-muted)] max-w-2xl text-lg">{tool.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Input */}
        <div className="lg:col-span-4">
          <div className="glass-panel p-5 sticky top-24">
            <h3 className="text-sm font-bold text-[var(--color-text-main)] uppercase tracking-wider mb-4">
              Enter URLs to Analyze
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-3">
              Enter up to 100 links (one per line). Include http:// or https://
            </p>
            <textarea
              className="input-field h-48 mb-4 resize-none font-mono text-xs"
              placeholder="https://example.com/page1&#10;https://example.com/page2"
              value={inputUrls}
              onChange={(e) => setInputUrls(e.target.value)}
              disabled={status === 'running' || status === 'fetching'}
            />
            
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2 text-danger text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={status === 'running' || status === 'fetching' || !inputUrls.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {(status === 'running' || status === 'fetching') ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {status === 'running' ? 'Crawling...' : 'Analyzing...'}</>
              ) : (
                <><Play className="w-5 h-5" /> Run Free Analysis</>
              )}
            </button>

            {/* Progress UI */}
            {(status === 'running' || status === 'fetching') && progress && (
              <div className="mt-6 p-4 rounded-xl bg-surface-2/50 border border-[var(--border-color)]">
                <div className="flex justify-between text-xs font-semibold mb-2 text-[var(--color-text-main)]">
                  <span>Crawling Progress</span>
                  <span>{Math.round((progress.progress || 0) * 100)}%</span>
                </div>
                <div className="w-full bg-[var(--border-color)] rounded-full h-2 mb-4 overflow-hidden">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.progress || 0) * 100}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-surface rounded text-center">
                    <div className="text-[var(--color-text-muted)] mb-0.5">Crawled</div>
                    <div className="font-bold text-[var(--color-text-main)]">{progress.crawled}</div>
                  </div>
                  <div className="p-2 bg-surface rounded text-center">
                    <div className="text-[var(--color-text-muted)] mb-0.5">Queue</div>
                    <div className="font-bold text-[var(--color-text-main)]">{progress.queue}</div>
                  </div>
                </div>
                {progress.latest_url && (
                  <div className="mt-3 text-[10px] text-[var(--color-text-muted)] truncate font-mono">
                    Latest: {progress.latest_url}
                  </div>
                )}
              </div>
            )}

            {status === 'complete' && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center gap-2 text-secondary text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Analysis Complete
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Results */}
        <div className="lg:col-span-8">
          {status === 'idle' && (
            <div className="h-full min-h-[400px] border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-[var(--color-text-muted)] p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                <tool.icon className="w-8 h-8 opacity-50" />
              </div>
              <p className="text-lg font-medium">Ready to Analyze</p>
              <p className="text-sm max-w-sm mt-2">Enter your links on the left and click "Run Free Analysis" to see detailed insights here.</p>
            </div>
          )}
          
          {renderResults()}
        </div>
      </div>
    </div>
  );
}
