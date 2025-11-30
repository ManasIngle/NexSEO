import { Link } from 'react-router-dom';
import { tools } from '../data/tools';
import { Zap, ArrowRight, ShieldCheck, Search, Activity, Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-[1400px] mx-auto w-full px-6 py-12 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary dark:from-white dark:via-slate-200 dark:to-slate-400 mb-6 relative z-10 transition-colors">
          Ultimate Free SEO Tools
        </h1>
        <p className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-3xl mx-auto font-medium relative z-10 leading-relaxed">
          Unlock your website's true potential with our suite of enterprise-grade, lightning-fast SEO analyzers. 
          Identify critical issues, optimize performance, and dominate search rankings—completely free.
        </p>
        <div className="mt-8 flex justify-center gap-4 relative z-10">
          <div className="badge badge-blue px-4 py-1.5 text-sm">
            <Zap className="w-4 h-4 mr-1.5 inline" /> Lightning Fast
          </div>
          <div className="badge badge-green px-4 py-1.5 text-sm">
            <ShieldCheck className="w-4 h-4 mr-1.5 inline" /> Enterprise Grade
          </div>
          <div className="badge badge-purple px-4 py-1.5 text-sm">
            <Sparkles className="w-4 h-4 mr-1.5 inline" /> AI Powered
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
        {tools.map((tool) => (
          <Link to={`/tool/${tool.id}`} key={tool.id} className="group outline-none">
            <div className="glass-card h-full p-6 flex flex-col items-start relative overflow-hidden transform group-hover:-translate-y-1 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
              
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-5 border border-primary/20 group-hover:border-primary/40 transition-colors">
                <tool.icon className="w-6 h-6 text-primary group-hover:text-accent transition-colors" />
              </div>
              
              <h3 className="text-xl font-bold text-[var(--color-text-main)] mb-3 group-hover:text-primary transition-colors">
                {tool.title}
              </h3>
              
              <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-6 flex-1">
                {tool.description}
              </p>
              
              <div className="mt-auto flex items-center text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                Launch Tool <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Discoverability Banner */}
      <div className="mt-20 p-8 glass-panel text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10 opacity-50" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <Activity className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-4">Want the Ultimate SEO Platform?</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            These free tools are powered by our core crawling engine. To crawl massive sites, automate reports, and access our full enterprise dashboard, check out our premium offering.
          </p>
          <button className="btn-primary">
            Get Ultimate Crawler Pro
          </button>
        </div>
      </div>
    </div>
  );
}
