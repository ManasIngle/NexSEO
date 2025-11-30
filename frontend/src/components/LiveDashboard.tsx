import type { CrawlState } from '../App';
import { Activity, AlertCircle, Shield } from 'lucide-react';

interface Props {
  crawlState: CrawlState;
}

export default function LiveDashboard({ crawlState }: Props) {
  const { isCrawling, progress, crawled, queue, speed, latestUrl, latestStatus, isBypass, error } = crawlState;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-secondary" />
          Live Telemetry
        </h2>
        {isCrawling && (
          <span className="badge badge-blue animate-pulse-glow flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Crawling
          </span>
        )}
        {!isCrawling && crawled > 0 && (
          <span className="badge badge-green">Complete</span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
          <p className="text-xs text-danger font-medium">{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="stat-card">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Crawled</div>
          <div className="text-2xl font-extrabold text-white tabular-nums">{crawled}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Queue</div>
          <div className="text-2xl font-extrabold text-white tabular-nums">{queue}</div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Speed</div>
          <div className="text-2xl font-extrabold text-secondary tabular-nums">
            {speed.toFixed(1)}
            <span className="text-[10px] text-slate-600 ml-1 font-medium">/s</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Progress</div>
          <div className="text-2xl font-extrabold text-white tabular-nums">
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 truncate max-w-[70%] font-mono">
            {latestUrl || 'Waiting to start...'}
          </span>
          <div className="flex items-center gap-2">
            {isBypass && (
              <span className="badge badge-purple flex items-center gap-1">
                <Shield className="w-3 h-3" /> Akamai Bypassed
              </span>
            )}
            {latestStatus > 0 && (
              <span className={`badge ${latestStatus === 200 ? 'badge-green' : latestStatus >= 400 ? 'badge-red' : 'badge-yellow'}`}>
                {latestStatus}
              </span>
            )}
          </div>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary via-accent to-secondary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
