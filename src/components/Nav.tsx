import mascot from "@/assets/octagen mascot.png";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Terminal } from "./Terminal";
import { GlobalSearch } from "./GlobalSearch";

export function Nav() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [term, setTerm] = useState(false);
  const [search, setSearch] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); }
      if (meta && e.key.toLowerCase() === "j") { e.preventDefault(); openTerminal(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!menu) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menu]);

  function openTerminal() {
    if (!user) { nav({ to: "/auth" }); return; }
    setTerm(true);
  }

  async function handleSignOut() {
    setMenu(false);
    await signOut();
    nav({ to: "/" });
  }

  return (
    <>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={mascot} alt="OCTAGEN" className="w-8 h-8 drop-shadow-[0_0_12px_oklch(0.86_0.28_138_/_0.6)] group-hover:scale-110 transition-transform" />
            <span className="font-bold tracking-[0.2em] text-sm">OCTAGEN</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="/#markets" className="hover:text-foreground transition-colors">Crypto</a>
            <a href="/#stocks" className="hover:text-foreground transition-colors">Stocks</a>
            <a href="/#octa-core" className="hover:text-foreground transition-colors">Octa-Core</a>
            <a href="/#minds" className="hover:text-foreground transition-colors">Eight Minds</a>
            <a href="/#about" className="hover:text-foreground transition-colors">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearch(true)} className="hidden sm:inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:border-neon/40 hover:text-foreground transition">
              <span>⌕ Search</span><kbd className="text-[9px] opacity-60">⌘K</kbd>
            </button>
            <button onClick={openTerminal} className="text-xs font-mono tracking-[0.24em] uppercase px-4 py-2 rounded-lg bg-neon text-primary-foreground hover:animate-pulse-neon transition-all">
              MEET THE OCTAGEN
            </button>
            {user ? (
              <div ref={menuRef} className="relative hidden sm:block">
                <button
                  onClick={() => setMenu(m => !m)}
                  className="flex items-center gap-2 text-[10px] font-mono px-2.5 py-1.5 rounded-md border border-border hover:border-neon/40 transition"
                  title={user.email ?? undefined}
                >
                  <span className="w-5 h-5 rounded-full bg-neon/20 text-neon flex items-center justify-center text-[10px] font-bold">
                    {(user.email ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[120px]">{user.email}</span>
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-56 glass rounded-xl overflow-hidden border border-border/60 z-50">
                    <div className="px-3 py-2.5 border-b border-border/40">
                      <div className="text-[9px] font-mono uppercase tracking-widest text-neon">Signed in</div>
                      <div className="text-xs truncate mt-0.5">{user.email}</div>
                    </div>
                    <button onClick={handleSignOut} className="w-full text-left px-3 py-2.5 text-xs hover:bg-destructive/10 hover:text-destructive transition font-mono">
                      → Sign out
                    </button>
                  </div>
                )}
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
