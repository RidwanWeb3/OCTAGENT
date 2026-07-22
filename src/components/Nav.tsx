import mascot from "@/assets/octagen-mascot.png.asset.json";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Terminal } from "./Terminal";
import { GlobalSearch } from "./GlobalSearch";

export function Nav() {
  const { user, signOut } = useAuth();
  const [term, setTerm] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
      if (meta && e.key.toLowerCase() === "j") { e.preventDefault(); setTerm(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={mascot.url} alt="OCTAGEN" className="w-8 h-8 drop-shadow-[0_0_12px_oklch(0.86_0.28_138_/_0.6)] group-hover:scale-110 transition-transform" />
            <span className="font-bold tracking-[0.2em] text-sm">OCTAGEN</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="/#markets" className="hover:text-foreground transition-colors">Markets</a>
            <a href="/#octa-core" className="hover:text-foreground transition-colors">Octa-Core</a>
            <a href="/#minds" className="hover:text-foreground transition-colors">Eight Minds</a>
            <a href="/#about" className="hover:text-foreground transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearch(true)} className="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:border-neon/40 hover:text-foreground transition">
              <span>⌕ Search</span><kbd className="text-[9px] opacity-60">⌘K</kbd>
            </button>
            <button onClick={() => setTerm(true)} className="text-xs font-mono tracking-widest px-4 py-2 rounded-lg bg-neon text-primary-foreground hover:animate-pulse-neon transition-all">
              LAUNCH AI
            </button>
            {user ? (
              <div className="hidden sm:flex items-center gap-2 ml-1">
                <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]" title={user.email ?? undefined}>{user.email}</span>
                <button onClick={() => signOut()} className="text-[10px] font-mono px-2 py-1.5 rounded-md border border-border hover:border-destructive/50 hover:text-destructive transition">Sign out</button>
              </div>
            ) : (
              <Link to="/auth" className="hidden sm:inline text-[10px] font-mono px-3 py-1.5 rounded-md border border-border hover:border-neon/40 transition">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      <Terminal open={term} onClose={() => setTerm(false)} />
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
    </>
  );
}
