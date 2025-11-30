import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Zap, Moon, Sun } from 'lucide-react';
import HomePage from './pages/HomePage';
import ToolPage from './pages/ToolPage';

function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col transition-colors duration-300">
        {/* ─── Top Bar ─── */}
        <header className="glass-panel mx-4 mt-4 mb-6 sticky top-4 z-50">
          <div className="px-6 py-3 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group outline-none">
              <div className="w-9 h-9 bg-gradient-to-br from-primary via-accent to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight">
                <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-secondary dark:from-white dark:via-slate-200 dark:to-slate-400 transition-colors">
                  Ultimate SEO Tools
                </h1>
                <p className="text-[10px] text-[var(--color-text-muted)] font-semibold tracking-widest uppercase">
                  Free SEO Utilities
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-surface-2 border border-[var(--border-color)] text-[var(--color-text-main)] hover:bg-[var(--color-text-muted)]/10 transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* ─── Body ─── */}
        <main className="flex-1 pb-12 w-full">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tool/:id" element={<ToolPage />} />
          </Routes>
        </main>

        <footer className="py-6 text-center border-t border-[var(--border-color)] mt-auto bg-surface/50">
          <p className="text-[var(--color-text-muted)] text-sm mb-2">
            Powered by the UltimateCrawler Engine &middot; Built for Scale
          </p>
          <p className="text-xs text-primary/80 font-medium">
            <a href="#" className="hover:underline">Visit our main platform for the complete Enterprise SEO Platform</a>
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
