import { Accessibility, Sparkles } from 'lucide-react';

export function WcagTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No structural accessibility issues found. ✓</p>;
  return (
    <div className="p-5 space-y-4">
      {data.map((r, i) => (
        <div key={i} className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-mono text-blue-400 truncate max-w-[70%]">{r.url}</div>
            <span className="badge badge-red">{r.issue_count} issues</span>
          </div>
          <ul className="space-y-2">
            {r.issues.map((issue: string, idx: number) => (
              <li key={idx} className="flex gap-2 items-start text-xs text-slate-300">
                <Accessibility className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function WebVitalsTab({ data }: { data: any[] }) {
  if (!data.length) return <p className="p-5 text-sm text-slate-500">No Core Web Vitals data available. Enable 'JS Rendering' before crawling.</p>;
  return (
    <table className="data-table">
      <thead><tr><th>URL</th><th>FCP (ms)</th><th>Load (ms)</th><th>Status</th></tr></thead>
      <tbody>
        {data.slice(0, 200).map((r, i) => {
          const status = r.fcp < 1800 ? 'Good' : r.fcp < 3000 ? 'Needs Improvement' : 'Poor';
          return (
            <tr key={i}>
              <td className="text-blue-400 truncate max-w-[400px] text-xs font-mono">{r.url}</td>
              <td className="text-slate-300 tabular-nums font-mono">{r.fcp.toFixed(0)}</td>
              <td className="text-slate-300 tabular-nums font-mono">{r.load.toFixed(0)}</td>
              <td>
                <span className={`badge ${status === 'Good' ? 'badge-green' : status === 'Needs Improvement' ? 'badge-yellow' : 'badge-red'}`}>
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

export function AiActionPlanTab({ plan }: { plan: any }) {
  if (!plan || !plan.actions || plan.actions.length === 0) {
    return <p className="p-5 text-sm text-slate-500">Loading AI Action Plan...</p>;
  }
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold text-white">AI Prioritized SEO Action Plan</h3>
      </div>
      
      <div className="space-y-4">
        {plan.actions.map((action: any, i: number) => (
          <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden group hover:border-slate-700 transition-colors">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              action.impact === 'High' ? 'bg-red-500' : action.impact === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            
            <div className="flex justify-between items-start mb-2 ml-3">
              <h4 className="text-base font-bold text-white">{action.title}</h4>
              <div className="flex gap-2">
                <span className={`badge ${
                  action.impact === 'High' ? 'badge-red' : action.impact === 'Medium' ? 'badge-yellow' : 'badge-green'
                }`}>
                  Impact: {action.impact}
                </span>
                <span className={`badge ${
                  action.effort === 'High' ? 'badge-red' : action.effort === 'Medium' ? 'badge-yellow' : 'badge-green'
                }`}>
                  Effort: {action.effort}
                </span>
              </div>
            </div>
            
            <p className="text-sm text-slate-400 ml-3 leading-relaxed">{action.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
