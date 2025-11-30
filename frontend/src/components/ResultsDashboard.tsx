import { useState, useEffect } from 'react';
import type { CrawlState } from '../App';
import {
  FileSpreadsheet, FileText, MapPin,
  Link, ExternalLink, Image, Type, FileSearch, Tag,
  ArrowRight, BarChart3, Target, Share2, Gauge, AlertTriangle,
  Copy, Search, Network, ShieldCheck, Code, Clock, Accessibility, Zap, Sparkles
} from 'lucide-react';
import axios from 'axios';
import { generatePdfReport } from '../utils/PdfExport';
import LinkGraphTab from './LinkGraphTab';
import { SecurityHeadersTab, MixedContentTab, StructuredDataTab, FreshnessTab } from './Phase2Tabs';
import { WcagTab, WebVitalsTab, AiActionPlanTab } from './Phase3Tabs';

const API = 'http://localhost:8000';

type Tab = 'overview' | 'internal' | 'external' | 'images' | 'titles' | 'meta' |
           'headers' | 'redirects' | 'status' | 'canonicals' | 'performance' |
           'scores' | 'duplicates' | 'keywords' | 'broken_links' | 'orphans' | 'redirect_chains' |
           'link_graph' | 'security' | 'mixed_content' | 'structured_data' | 'freshness' |
           'wcag' | 'web_vitals' | 'ai_action_plan';

interface Props {
  crawlState: CrawlState;
}

export default function ResultsDashboard({ crawlState }: Props) {
  const { taskId, results } = crawlState;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [scores, setScores] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [brokenLinks, setBrokenLinks] = useState<any[]>([]);
  const [orphans, setOrphans] = useState<any[]>([]);
  const [redirectChains, setRedirectChains] = useState<any[]>([]);
  
  // Phase 2 State
  const [linkGraph, setLinkGraph] = useState<any>(null);
  const [securityHeaders, setSecurityHeaders] = useState<any[]>([]);
  const [mixedContent, setMixedContent] = useState<any[]>([]);
  const [structuredData, setStructuredData] = useState<any[]>([]);
  const [freshness, setFreshness] = useState<any[]>([]);
  
  // Phase 3 State
  const [wcag, setWcag] = useState<any[]>([]);
  const [webVitals, setWebVitals] = useState<any[]>([]);
  const [aiActionPlan, setAiActionPlan] = useState<any>(null);
  
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!taskId) return;
    axios.get(`${API}/api/analysis/summary/${taskId}`).then(r => setSummary(r.data)).catch(() => {});
  }, [taskId, results]);

  useEffect(() => {
    if (!taskId) return;
    if (activeTab === 'scores' && scores.length === 0) {
      axios.get(`${API}/api/analysis/scores/${taskId}`).then(r => setScores(r.data)).catch(() => {});
    }
    if (activeTab === 'duplicates' && duplicates.length === 0) {
      axios.get(`${API}/api/analysis/duplicates/${taskId}`).then(r => setDuplicates(r.data)).catch(() => {});
    }
    if (activeTab === 'keywords' && keywords.length === 0) {
      axios.get(`${API}/api/analysis/keywords/${taskId}`).then(r => setKeywords(r.data)).catch(() => {});
    }
    if (activeTab === 'broken_links' && brokenLinks.length === 0) {
      axios.get(`${API}/api/analysis/broken-links/${taskId}`).then(r => setBrokenLinks(r.data)).catch(() => {});
    }
    if (activeTab === 'orphans' && orphans.length === 0) {
      axios.get(`${API}/api/analysis/orphans/${taskId}`).then(r => setOrphans(r.data)).catch(() => {});
    }
    if (activeTab === 'redirect_chains' && redirectChains.length === 0) {
      axios.get(`${API}/api/analysis/redirect-chains/${taskId}`).then(r => setRedirectChains(r.data)).catch(() => {});
    }
    if (activeTab === 'link_graph' && !linkGraph) {
      axios.get(`${API}/api/analysis/link-graph/${taskId}`).then(r => setLinkGraph(r.data)).catch(() => {});
    }
    if (activeTab === 'security' && securityHeaders.length === 0) {
      axios.get(`${API}/api/analysis/security-headers/${taskId}`).then(r => setSecurityHeaders(r.data)).catch(() => {});
    }
    if (activeTab === 'mixed_content' && mixedContent.length === 0) {
      axios.get(`${API}/api/analysis/mixed-content/${taskId}`).then(r => setMixedContent(r.data)).catch(() => {});
    }
    if (activeTab === 'structured_data' && structuredData.length === 0) {
      axios.get(`${API}/api/analysis/structured-data/${taskId}`).then(r => setStructuredData(r.data)).catch(() => {});
    }
    if (activeTab === 'freshness' && freshness.length === 0) {
      axios.get(`${API}/api/analysis/freshness/${taskId}`).then(r => setFreshness(r.data)).catch(() => {});
    }
    if (activeTab === 'wcag' && wcag.length === 0) {
      axios.get(`${API}/api/analysis/wcag/${taskId}`).then(r => setWcag(r.data)).catch(() => {});
    }
    if (activeTab === 'web_vitals' && webVitals.length === 0) {
      axios.get(`${API}/api/analysis/web-vitals/${taskId}`).then(r => setWebVitals(r.data)).catch(() => {});
    }
    if (activeTab === 'ai_action_plan' && !aiActionPlan) {
      axios.get(`${API}/api/analysis/ai-action-plan/${taskId}`).then(r => setAiActionPlan(r.data)).catch(() => {});
    }
  }, [activeTab, taskId]);

  const filtered = results.filter(r =>
    !filter || r.url?.toLowerCase().includes(filter.toLowerCase()) ||
    r.title?.toLowerCase().includes(filter.toLowerCase())
  );

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: 'overview', icon: BarChart3, label: 'Overview' },
    { id: 'internal', icon: Link, label: 'Internal' },
    { id: 'external', icon: ExternalLink, label: 'External' },
    { id: 'images', icon: Image, label: 'Images' },
    { id: 'titles', icon: Type, label: 'Titles' },
    { id: 'meta', icon: FileSearch, label: 'Meta' },
    { id: 'headers', icon: Tag, label: 'Headers' },
    { id: 'redirects', icon: ArrowRight, label: 'Redirects' },
    { id: 'status', icon: Target, label: 'Status' },
    { id: 'canonicals', icon: Share2, label: 'Canonicals' },
    { id: 'performance', icon: Gauge, label: 'Performance' },
    { id: 'scores', icon: BarChart3, label: 'SEO Scores' },
    { id: 'duplicates', icon: Copy, label: 'Duplicates' },
    { id: 'keywords', icon: Search, label: 'Keywords' },
    { id: 'broken_links', icon: AlertTriangle, label: 'Broken Links' },
    { id: 'orphans', icon: FileSearch, label: 'Orphans' },
    { id: 'redirect_chains', icon: ArrowRight, label: 'Redirect Chains' },
    { id: 'link_graph', icon: Network, label: 'Link Graph' },
    { id: 'security', icon: ShieldCheck, label: 'Security' },
    { id: 'mixed_content', icon: AlertTriangle, label: 'Mixed Content' },
    { id: 'structured_data', icon: Code, label: 'Schema' },
    { id: 'freshness', icon: Clock, label: 'Freshness' },
    { id: 'wcag', icon: Accessibility, label: 'Accessibility' },
    { id: 'web_vitals', icon: Zap, label: 'Web Vitals' },
    { id: 'ai_action_plan', icon: Sparkles, label: 'AI Plan' },
  ];

  if (!results.length && !taskId) return null;

  return (
    <div className="glass-panel p-5 animate-slide-up">
      {/* Export bar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-sm font-bold text-white">Analysis Results</h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => summary && generatePdfReport(summary, results)} className="btn-primary flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> PDF Report
          </button>
          <a href={`${API}/api/export/csv/${taskId}`} className="btn-ghost flex items-center gap-1.5 text-xs" download>
            <FileText className="w-3.5 h-3.5" /> CSV
          </a>
          <a href={`${API}/api/export/issues/${taskId}`} className="btn-ghost flex items-center gap-1.5 text-xs" download>
            <AlertTriangle className="w-3.5 h-3.5" /> Issues
          </a>
          <a href={`${API}/api/export/excel/${taskId}`} className="btn-ghost flex items-center gap-1.5 text-xs" download>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </a>
          <a href={`${API}/api/export/sitemap/${taskId}`} className="btn-ghost flex items-center gap-1.5 text-xs" download>
            <MapPin className="w-3.5 h-3.5" /> Sitemap
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-thin">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`tab-btn flex items-center gap-1.5 shrink-0 ${activeTab === t.id ? 'tab-active' : 'tab-inactive'}`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Search filter */}
      {activeTab !== 'overview' && activeTab !== 'keywords' && activeTab !== 'duplicates' &&
       activeTab !== 'broken_links' && activeTab !== 'orphans' && activeTab !== 'redirect_chains' &&
       activeTab !== 'link_graph' && activeTab !== 'structured_data' && activeTab !== 'ai_action_plan' && (
        <div className="mb-4">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by URL or title..."
            className="input-field text-xs"
          />
        </div>
      )}

      {/* Tab Content */}
      <div className="overflow-x-auto rounded-xl border border-slate-800/40 bg-slate-900/30">
        {activeTab === 'overview' && summary && <OverviewTab summary={summary} />}
        {activeTab === 'internal' && <InternalTab data={filtered} />}
        {activeTab === 'external' && <ExternalTab data={filtered} />}
        {activeTab === 'images' && <ImagesTab data={filtered} />}
        {activeTab === 'titles' && <TitlesTab data={filtered} />}
        {activeTab === 'meta' && <MetaTab data={filtered} />}
        {activeTab === 'headers' && <HeadersTab data={filtered} />}
        {activeTab === 'redirects' && <RedirectsTab data={filtered} />}
        {activeTab === 'status' && <StatusTab data={filtered} />}
        {activeTab === 'canonicals' && <CanonicalsTab data={filtered} />}
        {activeTab === 'performance' && <PerformanceTab data={filtered} />}
        {activeTab === 'scores' && <ScoresTab data={scores} />}
        {activeTab === 'duplicates' && <DuplicatesTab data={duplicates} />}
        {activeTab === 'keywords' && <KeywordsTab data={keywords} />}
        {activeTab === 'broken_links' && <BrokenLinksTab data={brokenLinks} />}
        {activeTab === 'orphans' && <OrphansTab data={orphans} />}
        {activeTab === 'redirect_chains' && <RedirectChainsTab data={redirectChains} />}
        {activeTab === 'link_graph' && <LinkGraphTab data={linkGraph} />}
        {activeTab === 'security' && <SecurityHeadersTab data={securityHeaders} />}
        {activeTab === 'mixed_content' && <MixedContentTab data={mixedContent} />}
        {activeTab === 'structured_data' && <StructuredDataTab data={structuredData} />}
        {activeTab === 'freshness' && <FreshnessTab data={freshness} />}
        {activeTab === 'wcag' && <WcagTab data={wcag} />}
        {activeTab === 'web_vitals' && <WebVitalsTab data={webVitals} />}
        {activeTab === 'ai_action_plan' && <AiActionPlanTab plan={aiActionPlan} />}
      </div>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

export function OverviewTab({ summary }: { summary: any }) {
  const stats = [
    { label: 'Total URLs', value: summary.total, color: 'text-white' },
    { label: 'Indexable', value: summary.indexable, color: 'text-emerald-400' },
    { label: 'Non-Indexable', value: summary.non_indexable, color: 'text-red-400' },
    { label: 'Errors', value: summary.errors, color: 'text-red-400' },
    { label: 'Redirects', value: summary.redirects, color: 'text-amber-400' },
    { label: 'Akamai Bypassed', value: summary.akamai_bypassed, color: 'text-purple-400' },
    { label: 'Missing Title', value: summary.missing_title, color: 'text-red-400' },
    { label: 'Missing Meta', value: summary.missing_meta, color: 'text-amber-400' },
    { label: 'Missing H1', value: summary.missing_h1, color: 'text-amber-400' },
    { label: 'Missing Alt', value: summary.missing_alt, color: 'text-amber-400' },
    { label: 'Avg Response', value: `${summary.avg_response_time}s`, color: 'text-blue-400' },
    { label: 'Avg Words', value: summary.avg_word_count, color: 'text-slate-300' },
    { label: 'With Schema', value: summary.with_schema, color: 'text-emerald-400' },
    { label: 'Fast Pages', value: summary.fast_pages, color: 'text-emerald-400' },
    { label: 'SEO Score', value: `${summary.avg_seo_score}/100`, color: 'text-primary' },
    { label: 'Broken Links', value: summary.broken_links_count || 0, color: 'text-red-400' },
    { label: 'Orphan Pages', value: summary.orphan_pages_count || 0, color: 'text-amber-400' },
    { label: 'Redirect Chains', value: summary.redirect_chains_count || 0, color: 'text-amber-400' },
  ];

  return (
    <div className="p-5">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="stat-card text-center">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-lg font-extrabold ${s.color} tabular-nums`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status code breakdown */}
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Status Code Distribution</h3>
      <div className="flex gap-2 flex-wrap mb-6">
        {Object.entries(summary.status_codes || {}).map(([code, count]) => (
          <div key={code} className={`stat-card flex items-center gap-2 px-3 py-2`}>
            <span className={`badge ${Number(code) === 200 ? 'badge-green' : Number(code) >= 400 ? 'badge-red' : 'badge-yellow'}`}>
              {code}
            </span>
            <span className="text-sm font-bold text-white">{count as number}</span>
          </div>
        ))}
      </div>

      {/* Grade distribution */}
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">SEO Grade Distribution</h3>
      <div className="flex gap-2 flex-wrap">
        {['A', 'B', 'C', 'D', 'F'].map(g => (
          <div key={g} className="stat-card text-center px-4">
            <div className={`text-lg font-extrabold ${g === 'A' ? 'text-emerald-400' : g === 'B' ? 'text-blue-400' : g === 'C' ? 'text-amber-400' : 'text-red-400'}`}>
              {g}
            </div>
            <div className="text-xs text-slate-500">{summary.grade_distribution?.[g] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InternalTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Status</th><th>Indexability</th><th>Depth</th><th>Int. Links</th><th>Time</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-xs font-mono text-xs" title={r.url}>{r.url}</td>
            <td><span className={`badge ${r.status_code === 200 ? 'badge-green' : 'badge-red'}`}>{r.status_code}</span></td>
            <td><span className={`badge ${r.indexability === 'Indexable' ? 'badge-green' : 'badge-red'}`}>{r.indexability}</span></td>
            <td className="text-slate-300 tabular-nums">{r.depth ?? '-'}</td>
            <td className="text-slate-300 tabular-nums">{r.internal_links_count}</td>
            <td className="text-slate-400 tabular-nums">{(r.response_time || 0).toFixed(2)}s</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExternalTab({ data }: { data: any[] }) {
  const rows: any[] = [];
  data.forEach(r => {
    (r.external_links || []).forEach((el: any) => {
      rows.push({ source: r.url, dest: el.url, anchor: el.anchor_text });
    });
  });
  return (
    <table className="data-table">
      <thead><tr><th>Source Page</th><th>External URL</th><th>Anchor Text</th></tr></thead>
      <tbody>
        {rows.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.source}</td>
            <td className="text-emerald-400 truncate max-w-[250px] text-xs font-mono">{r.dest}</td>
            <td className="text-slate-300 truncate max-w-[150px] text-xs">{r.anchor || '(empty)'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ImagesTab({ data }: { data: any[] }) {
  const imgs: any[] = [];
  data.forEach(r => {
    (r.images || []).forEach((img: any) => {
      imgs.push({ page: r.url, src: img.src, alt: img.alt });
    });
  });
  const missingAlt = imgs.filter(i => !i.alt).length;
  return (
    <div>
      <div className="p-3 border-b border-slate-800/50 flex items-center gap-3">
        <span className="text-xs text-slate-400">Total: <b className="text-white">{imgs.length}</b></span>
        {missingAlt > 0 && <span className="badge badge-red">{missingAlt} missing alt</span>}
      </div>
      <table className="data-table">
        <thead><tr><th>Page</th><th>Image URL</th><th>Alt Text</th></tr></thead>
        <tbody>
          {imgs.slice(0, 200).map((r, i) => (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[180px] text-xs font-mono">{r.page}</td>
              <td className="text-slate-300 truncate max-w-[250px] text-xs font-mono">{r.src}</td>
              <td className={`text-xs truncate max-w-[150px] ${r.alt ? 'text-slate-300' : 'text-red-400'}`}>
                {r.alt || 'MISSING'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TitlesTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Title</th><th>Length</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const tl = r.title_length || 0;
          const status = tl === 0 ? 'Missing' : tl > 60 ? 'Too Long' : tl < 30 ? 'Too Short' : 'Good';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 truncate max-w-[250px] text-xs">{r.title || '—'}</td>
              <td className="text-slate-400 tabular-nums text-xs">{tl}</td>
              <td><span className={`badge ${status === 'Good' ? 'badge-green' : status === 'Missing' ? 'badge-red' : 'badge-yellow'}`}>{status}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function MetaTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Meta Description</th><th>Length</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const ml = r.meta_desc_length || 0;
          const st = ml === 0 ? 'Missing' : ml > 160 ? 'Too Long' : ml < 120 ? 'Too Short' : 'Good';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[180px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 truncate max-w-[280px] text-xs">{r.meta_description || '—'}</td>
              <td className="text-slate-400 tabular-nums text-xs">{ml}</td>
              <td><span className={`badge ${st === 'Good' ? 'badge-green' : st === 'Missing' ? 'badge-red' : 'badge-yellow'}`}>{st}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function HeadersTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>H1 Count</th><th>H1 Text</th><th>H2</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const h1c = r.h1_count || 0;
          const st = h1c === 0 ? 'Missing' : h1c > 1 ? 'Multiple' : 'Good';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 tabular-nums text-xs">{h1c}</td>
              <td className="text-slate-300 truncate max-w-[250px] text-xs">{r.h1_tags?.split(';')[0] || '—'}</td>
              <td className="text-slate-400 tabular-nums text-xs">{r.h2_count || 0}</td>
              <td><span className={`badge ${st === 'Good' ? 'badge-green' : st === 'Missing' ? 'badge-red' : 'badge-yellow'}`}>{st}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function RedirectsTab({ data }: { data: any[] }) {
  const redirected = data.filter(r => (r.redirect_count || 0) > 0);
  if (!redirected.length) return <p className="p-5 text-sm text-slate-500">No redirects detected ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>Original URL</th><th>Final URL</th><th>Hops</th><th>Status</th></tr></thead>
      <tbody>
        {redirected.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-amber-400 truncate max-w-[250px] text-xs font-mono">{r.original_url}</td>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
            <td className="text-slate-300 tabular-nums text-xs">{r.redirect_count}</td>
            <td><span className="badge badge-yellow">{r.status_code}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StatusTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Status</th><th>Indexability</th><th>Response</th><th>Bypass</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-xs text-xs font-mono">{r.url}</td>
            <td><span className={`badge ${r.status_code === 200 ? 'badge-green' : r.status_code >= 400 ? 'badge-red' : 'badge-yellow'}`}>{r.status_code}</span></td>
            <td><span className={`badge ${r.indexability === 'Indexable' ? 'badge-green' : 'badge-red'}`}>{r.indexability}</span></td>
            <td className="text-slate-400 tabular-nums text-xs">{(r.response_time || 0).toFixed(2)}s</td>
            <td>{r.is_akamai_bypass ? <span className="badge badge-purple">cURL</span> : <span className="text-slate-600 text-xs">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CanonicalsTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Canonical</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const canon = r.canonical_url || '';
          const st = !canon ? 'Missing' : canon === r.url ? 'Self' : 'Other';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 truncate max-w-[250px] text-xs font-mono">{canon || '—'}</td>
              <td><span className={`badge ${st === 'Self' ? 'badge-green' : st === 'Missing' ? 'badge-red' : 'badge-yellow'}`}>{st}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PerformanceTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Response</th><th>Size</th><th>Words</th><th>Schema</th><th>Rating</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const rt = r.response_time || 0;
          const rating = rt < 1 ? 'Fast' : rt < 3 ? 'OK' : 'Slow';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 tabular-nums text-xs">{rt.toFixed(2)}s</td>
              <td className="text-slate-400 tabular-nums text-xs">{((r.content_length || 0) / 1024).toFixed(0)}KB</td>
              <td className="text-slate-400 tabular-nums text-xs">{r.word_count || 0}</td>
              <td className="text-slate-300 text-xs">{r.schema_types || '—'}</td>
              <td><span className={`badge ${rating === 'Fast' ? 'badge-green' : rating === 'OK' ? 'badge-yellow' : 'badge-red'}`}>{rating}</span></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function ScoresTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">Loading scores...</p>;
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Score</th><th>Grade</th><th>Issues</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
            <td className="text-white font-bold tabular-nums text-sm">{r.score}</td>
            <td>
              <span className={`badge ${r.grade === 'A' ? 'badge-green' : r.grade === 'B' ? 'badge-blue' : r.grade === 'C' ? 'badge-yellow' : 'badge-red'}`}>
                {r.grade}
              </span>
            </td>
            <td className="text-xs text-slate-400">{r.issues?.join(' · ') || 'None'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DuplicatesTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No near-duplicate content detected ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>Page A</th><th>Page B</th><th>Similarity</th></tr></thead>
      <tbody>
        {data.slice(0, 100).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url_a}</td>
            <td className="text-amber-400 truncate max-w-[250px] text-xs font-mono">{r.url_b}</td>
            <td><span className="badge badge-red">{r.similarity}%</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function KeywordsTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">Loading keywords...</p>;
  const maxCount = data[0]?.count || 1;
  return (
    <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {data.map((kw, i) => (
        <div key={i} className="stat-card flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{kw.keyword}</div>
            <div className="text-[10px] text-slate-500">{kw.count} mentions</div>
          </div>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(kw.count / maxCount) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrokenLinksTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No broken links found ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>Source Page</th><th>Broken Target</th><th>Anchor Text</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.source}</td>
            <td className="text-red-400 truncate max-w-[250px] text-xs font-mono">{r.target}</td>
            <td className="text-slate-300 truncate max-w-[150px] text-xs">{r.anchor || '(empty)'}</td>
            <td><span className="badge badge-red">{r.status_code}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function OrphansTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No orphan pages found ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>Orphan URL</th><th>Title</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-amber-400 truncate max-w-[300px] text-xs font-mono">{r.url}</td>
            <td className="text-slate-300 truncate max-w-[300px] text-xs">{r.title || '—'}</td>
            <td><span className={`badge ${r.status_code === 200 ? 'badge-green' : 'badge-red'}`}>{r.status_code}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function RedirectChainsTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No redirect chains detected ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>Original Request</th><th>Final Destination</th><th>Hops</th><th>Chain</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-amber-400 truncate max-w-[200px] text-xs font-mono">{r.original_url}</td>
            <td className="text-emerald-400 truncate max-w-[200px] text-xs font-mono">{r.final_url}</td>
            <td className="text-slate-300 tabular-nums text-xs">{r.hops}</td>
            <td className="text-slate-500 truncate max-w-[300px] text-xs">{r.chain_detail}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
