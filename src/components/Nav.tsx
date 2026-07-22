import mascot from "@/assets/octagen-mascot.png.asset.json";
import { Link } from "@tanstack/react-router";

export function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border/40">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={mascot.url} alt="OCTAGEN" className="w-8 h-8 drop-shadow-[0_0_12px_oklch(0.86_0.28_138_/_0.6)] group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-[0.2em] text-sm">OCTAGEN</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#markets" className="hover:text-foreground transition-colors">Markets</a>
          <a href="#octa-core" className="hover:text-foreground transition-colors">Octa-Core</a>
          <a href="#minds" className="hover:text-foreground transition-colors">Eight Minds</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] font-mono tracking-widest text-neon">● LIVE</span>
          <a href="#markets" className="text-xs font-mono tracking-widest px-4 py-2 rounded-lg bg-neon text-primary-foreground hover:animate-pulse-neon transition-all">
            LAUNCH AI
          </a>
        </div>
      </div>
    </header>
  );
}
