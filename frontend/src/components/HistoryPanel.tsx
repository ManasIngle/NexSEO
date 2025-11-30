import { useState, useEffect } from 'react';
import type { CrawlState, AppView } from '../App';
import { ArrowRight, GitCompare } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

interface Props {
  setCrawlState: React.Dispatch<React.SetStateAction<CrawlState>>;
  setView: React.Dispatch<React.SetStateAction<AppView>>;
}

export default function HistoryPanel({ setCrawlState, setView }: Props) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [diffA, setDiffA] = useState('');
  const [diffB, setDiffB] = useState('');
  const [diffResult, setDiffResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/history`).then(r => setSessions(r.data)).catch(() => {});
  }, []);

  const loadSession = async (id: string) => {
    const results = (await axios.get(`${API}/api/results/${id}`)).data;
    setCrawlState(prev => ({
      ...prev,
      taskId: id,
      results,
      isCrawling: false,
      crawled: results.length,
      progress: 1,
    }));
    setView('crawl');
  };

  const runDiff = async () => {
    if (!diffA || !diffB || diffA === diffB) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/diff`, { params: { a: diffA, b: diffB } });
      setDiffResult(res.data);
    } catch { }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-extrabold text-white">Crawl History & Diff</h2>
        <p className="text-sm text-slate-500">View past crawls, compare sessions, and track changes over time.</p>
      </div>

      {/* Session List */}
      <div className="glass-panel overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800/50">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Sessions</h3>
        </div>
        {sessions.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No crawl history yet. Run your first crawl!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Mode</th>
                <th>URLs</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="text-blue-400 truncate max-w-[200px] text-xs font-mono">{s.start_url}</td>
                  <td><span className="badge badge-blue">{s.mode}</span></td>
                  <td className="text-slate-300 tabular-nums text-xs">{s.total_urls}</td>
                  <td>
                    <span className={`badge ${s.status === 'completed' ? 'badge-green' : s.status === 'running' ? 'badge-blue' : 'badge-yellow'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-slate-500 text-xs">{new Date(s.started_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => loadSession(s.id)} className="btn-ghost text-xs flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Diff Tool */}
      {sessions.length >= 2 && (
        <div className="glass-panel p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-accent" />
            Compare Two Crawls
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Session A (older)</label>
              <select value={diffA} onChange={e => setDiffA(e.target.value)} className="input-field text-xs">
                <option value="">Select...</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.start_url?.slice(0, 30)} — {new Date(s.started_at).toLocaleDateString()} ({s.total_urls} urls)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-500 font-semibold mb-1 block">Session B (newer)</label>
              <select value={diffB} onChange={e => setDiffB(e.target.value)} className="input-field text-xs">
                <option value="">Select...</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.start_url?.slice(0, 30)} — {new Date(s.started_at).toLocaleDateString()} ({s.total_urls} urls)
                  </option>
                ))}
              </select>
            </div>
            <button onClick={runDiff} disabled={loading || !diffA || !diffB} className="btn-primary">
              {loading ? 'Comparing...' : 'Compare'}
            </button>
          </div>

          {diffResult && (
            <div className="space-y-4 animate-slide-up">
              <div className="grid grid-cols-3 gap-3">
                <div className="stat-card text-center">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">New URLs</div>
                  <div className="text-xl font-extrabold text-emerald-400">{diffResult.new_urls?.length || 0}</div>
                </div>
                <div className="stat-card text-center">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Removed URLs</div>
                  <div className="text-xl font-extrabold text-red-400">{diffResult.removed_urls?.length || 0}</div>
                </div>
                <div className="stat-card text-center">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase mb-1">Changed</div>
                  <div className="text-xl font-extrabold text-amber-400">{diffResult.changes?.length || 0}</div>
                </div>
              </div>

              {(diffResult.changes?.length > 0) && (
                <div className="overflow-x-auto rounded-xl border border-slate-800/40">
                  <table className="data-table">
                    <thead><tr><th>URL</th><th>Old Status</th><th>New Status</th><th>Title Changed</th></tr></thead>
                    <tbody>
                      {diffResult.changes.slice(0, 50).map((c: any, i: number) => (
                        <tr key={i}>
                          <td className="text-blue-400 truncate max-w-[300px] text-xs font-mono">{c.url}</td>
                          <td><span className={`badge ${c.old_status === 200 ? 'badge-green' : 'badge-red'}`}>{c.old_status}</span></td>
                          <td><span className={`badge ${c.new_status === 200 ? 'badge-green' : 'badge-red'}`}>{c.new_status}</span></td>
                          <td>{c.title_changed ? <span className="badge badge-yellow">Changed</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
