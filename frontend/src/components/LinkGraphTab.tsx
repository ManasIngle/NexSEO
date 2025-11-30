import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export default function LinkGraphTab({ data }: { data: { nodes: any[]; links: any[] } }) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          setDimensions({
            width: width,
            height: Math.max(600, window.innerHeight - 250) // Use more of the vertical space
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return <p className="p-5 text-sm text-slate-500">Loading graph data or no nodes found...</p>;
  }

  return (
    <div className="relative w-full border border-slate-800/50 rounded-xl overflow-hidden bg-slate-950" ref={containerRef}>
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-700/50 backdrop-blur">
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2)} className="p-1.5 hover:bg-slate-700 rounded text-slate-300">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.2)} className="p-1.5 hover:bg-slate-700 rounded text-slate-300">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => fgRef.current?.zoomToFit(400)} className="p-1.5 hover:bg-slate-700 rounded text-slate-300">
          <Maximize className="w-4 h-4" />
        </button>
      </div>
      
      <div className="absolute top-4 left-4 z-10 pointer-events-none bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800 backdrop-blur">
        <div className="text-xs font-semibold text-slate-300 mb-1">Node Legend</div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> 200 OK
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div> 3xx Redirect
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <div className="w-2 h-2 rounded-full bg-red-500"></div> 4xx/5xx Error
        </div>
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={data}
        nodeLabel="title"
        nodeColor={(node: any) => {
          if (node.status === 200) return '#10b981'; // emerald-500
          if (node.status >= 300 && node.status < 400) return '#f59e0b'; // amber-500
          if (node.status >= 400) return '#ef4444'; // red-500
          return '#64748b'; // slate-500
        }}
        nodeRelSize={4}
        linkColor={() => 'rgba(148, 163, 184, 0.2)'} // slate-400/20
        linkWidth={1}
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        onNodeClick={(node) => {
          fgRef.current?.centerAt(node.x, node.y, 1000);
          fgRef.current?.zoom(8, 2000);
        }}
        backgroundColor="#020617" // slate-950
      />
    </div>
  );
}
