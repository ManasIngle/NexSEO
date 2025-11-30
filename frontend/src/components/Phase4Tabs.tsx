import { Search, Image as ImageIcon, BookOpen, Share2, Type, Link, Layout, Globe, FileSearch, Hash } from 'lucide-react';

export function CannibalizationTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No keyword cannibalization detected. ✓</p>;
  return (
    <div className="p-5 space-y-4">
      {data.map((r, i) => (
        <div key={i} className="p-4 bg-slate-900/50 border border-[var(--border-color)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-amber-500" /> Topic: "{r.keyword}"
            </div>
            <span className="badge badge-red">{r.count} pages competing</span>
          </div>
          <ul className="space-y-2">
            {r.urls.map((url: string, idx: number) => (
              <li key={idx} className="text-xs text-blue-400 font-mono truncate">{url}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function SocialTagsTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>OG Image</th><th>OG Title</th><th>Twitter Card</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
            <td>{r.social_tags.og_image ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
            <td className="text-slate-300 truncate max-w-[200px] text-xs">{r.social_tags.og_title || '—'}</td>
            <td>{r.social_tags.twitter_title ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HeadingHierarchyTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>H1</th><th>H2</th><th>H3</th><th>H4</th><th>Issues</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
            <td className="tabular-nums text-white font-bold">{r.h1}</td>
            <td className="tabular-nums text-slate-300">{r.h2}</td>
            <td className="tabular-nums text-slate-400">{r.h3}</td>
            <td className="tabular-nums text-slate-500">{r.h4}</td>
            <td>
              {r.issues.length ? r.issues.map((issue: string, idx: number) => (
                <div key={idx} className="text-red-400 text-[10px] mb-1">{issue}</div>
              )) : <span className="badge badge-green">Perfect</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReadabilityTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Word Count</th><th>Score (Est.)</th><th>Grade</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
            <td className="tabular-nums text-slate-300">{r.words}</td>
            <td className="tabular-nums text-white font-bold">{r.readability_score}</td>
            <td>
              <span className={`badge ${r.grade === 'A' ? 'badge-green' : r.grade === 'B' ? 'badge-blue' : r.grade === 'C' ? 'badge-yellow' : 'badge-red'}`}>
                {r.grade}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ImageSeoTab({ data }: { data: any[] }) {
  const allImages = data.flatMap(r => r.images.map((img: any) => ({ url: r.url, ...img })));
  const missingAlt = allImages.filter(i => !i.alt).length;

  return (
    <div>
      <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-3">
        <span className="text-xs text-[var(--color-text-muted)]">Total Images: <b className="text-white">{allImages.length}</b></span>
        {missingAlt > 0 && <span className="badge badge-red">{missingAlt} missing alt text</span>}
      </div>
      <table className="data-table">
        <thead><tr><th>Page URL</th><th>Image Source</th><th>Alt Text</th></tr></thead>
        <tbody>
          {allImages.slice(0, 200).map((img, i) => (
            <tr key={i}>
              <td className="text-slate-400 truncate max-w-[200px] text-xs font-mono">{img.url}</td>
              <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{img.src}</td>
              <td>{img.alt ? <span className="text-slate-300 text-xs">{img.alt}</span> : <span className="badge badge-red">Missing</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkFlowTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Inbound Internal Links</th><th>Outbound Internal Links</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[300px] text-xs font-mono">{r.url}</td>
            <td><span className="badge badge-green">{r.inlinks}</span></td>
            <td><span className="badge badge-blue">{r.outlinks}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SemanticHtmlTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>&lt;nav&gt;</th><th>&lt;main&gt;</th><th>&lt;article&gt;</th><th>&lt;aside&gt;</th><th>&lt;header&gt;</th><th>&lt;footer&gt;</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[150px] text-xs font-mono">{r.url}</td>
            <td className="tabular-nums text-slate-300">{r.tags.nav || 0}</td>
            <td className="tabular-nums text-white font-bold">{r.tags.main ? '1' : '0'}</td>
            <td className="tabular-nums text-slate-300">{r.tags.article || 0}</td>
            <td className="tabular-nums text-slate-300">{r.tags.aside || 0}</td>
            <td className="tabular-nums text-slate-300">{r.tags.header || 0}</td>
            <td className="tabular-nums text-slate-300">{r.tags.footer || 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HreflangTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Detected Languages</th><th>Hreflang Targets</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
            <td>
              <div className="flex gap-1 flex-wrap">
                {r.hreflangs.length ? r.hreflangs.map((h: any, idx: number) => (
                  <span key={idx} className="badge badge-purple">{h.lang}</span>
                )) : <span className="text-xs text-slate-500">—</span>}
              </div>
            </td>
            <td className="text-xs text-slate-400">
              {r.hreflangs.map((h: any, idx: number) => (
                <div key={idx} className="truncate max-w-[250px]">{h.href}</div>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function CanonicalAuditTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Canonical Target</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
            <td className="text-emerald-400 truncate max-w-[250px] text-xs font-mono">{r.canonical || '—'}</td>
            <td>
              <span className={`badge ${r.status === 'Self-Referencing' ? 'badge-green' : r.status === 'Missing' ? 'badge-red' : 'badge-yellow'}`}>
                {r.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function UrlStructureTab({ data }: { data: any[] }) {
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Length</th><th>Structure Issues</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[300px] text-xs font-mono">{r.url}</td>
            <td className="tabular-nums text-slate-300">{r.length}</td>
            <td>
              {r.issues.length ? r.issues.map((issue: string, idx: number) => (
                <div key={idx} className="text-red-400 text-[10px] mb-1">{issue}</div>
              )) : <span className="badge badge-green">Clean URL</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
