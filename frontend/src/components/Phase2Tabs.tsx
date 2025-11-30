export function SecurityHeadersTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No security headers data.</p>;
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>CSP</th><th>HSTS</th><th>X-Frame-Options</th><th>Score</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{r.url}</td>
            <td>{r.csp ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
            <td>{r.hsts ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
            <td>{r.x_frame ? <span className="badge badge-green">Yes</span> : <span className="badge badge-red">Missing</span>}</td>
            <td className="text-white font-bold">{r.score}/3</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MixedContentTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No mixed content detected (all HTTPS) ✓</p>;
  return (
    <table className="data-table">
      <thead><tr><th>URL (HTTPS)</th><th>Insecure Resources (HTTP)</th><th>Count</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => (
          <tr key={i}>
            <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
            <td className="text-red-400 truncate max-w-[400px] text-xs font-mono">
              {r.resources.map((res: string, idx: number) => (
                <div key={idx} className="truncate">{res}</div>
              ))}
            </td>
            <td><span className="badge badge-red">{r.mixed_count}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StructuredDataTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No structured data found.</p>;
  return (
    <div className="p-5 space-y-4">
      {data.map((r, i) => (
        <div key={i} className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl">
          <div className="text-xs font-mono text-blue-400 truncate mb-3">{r.url}</div>
          <div className="flex gap-4 flex-wrap">
            {r.schemas.map((s: any, idx: number) => (
              <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex-1 min-w-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{s.type}</span>
                  <span className={`badge ${s.status === 'Pass' ? 'badge-green' : 'badge-red'}`}>{s.status}</span>
                </div>
                {s.missing_fields?.length > 0 && (
                  <div className="text-xs text-slate-400">
                    Missing required: <span className="text-red-400">{s.missing_fields.join(', ')}</span>
                  </div>
                )}
                {s.status === 'Pass' && <div className="text-xs text-emerald-400">All required fields present ✓</div>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FreshnessTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No freshness markers detected.</p>;
  
  const getAge = (dateStr: string) => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>Header Last-Modified</th><th>Meta Article Date</th><th>Age (Days)</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const ageH = getAge(r.last_modified_header);
          const ageM = getAge(r.meta_modified);
          const bestAge = ageM !== null ? ageM : ageH;
          const status = bestAge === null ? 'Unknown' : bestAge > 180 ? 'Stale' : 'Fresh';
          
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[250px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 text-xs">{r.last_modified_header || '—'}</td>
              <td className="text-slate-300 text-xs">{r.meta_modified || '—'}</td>
              <td className="text-slate-400 text-xs tabular-nums">{bestAge !== null ? bestAge : '—'}</td>
              <td>
                <span className={`badge ${status === 'Fresh' ? 'badge-green' : status === 'Stale' ? 'badge-red' : 'badge-yellow'}`}>
                  {status}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
