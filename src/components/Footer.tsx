import mascot from "@/assets/octagen mascot.png";

export function Footer() {
  return (
    <footer className="relative border-t border-border/40 mt-24">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <img src={mascot} alt="OCTAGEN" className="w-8 h-8" />
            <span className="font-bold tracking-[0.2em] text-sm text-neon drop-shadow-[0_0_18px_oklch(0.86_0.28_138_/_0.35)]">OCTAGEN</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            The 8-armed autonomous AI intelligence. Eight minds, one consciousness — designed for traders, developers, and researchers.
          </p>
        </div>
        <div>
          <div className="text-xs font-mono tracking-widest text-muted-foreground mb-4">NAVIGATE</div>
          <ul className="space-y-2 text-sm">
            <li><a href="#markets" className="hover:text-neon transition-colors">Live Market</a></li>
            <li><a href="#octa-core" className="hover:text-neon transition-colors">Octa-Core</a></li>
            <li><a href="#minds" className="hover:text-neon transition-colors">Eight Minds</a></li>
            <li><a href="#about" className="hover:text-neon transition-colors">About</a></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-mono tracking-widest text-muted-foreground mb-4">CONNECT</div>
          <div className="flex gap-3">
            <a href=" https://x.com/OctagenAI" target="_blank" rel="noreferrer" className="glass w-10 h-10 rounded-lg flex items-center justify-center hover:text-neon hover:border-neon/50 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.797l-5.32-6.94L4.8 22H1.54l8.02-9.16L1 2h6.94l4.81 6.36L18.244 2Zm-1.19 18h1.88L7.03 4H5.02l12.034 16Z"/></svg>
            </a>
            <a href=" https://t.me/OctagenAI" target="_blank" rel="noreferrer" className="glass w-10 h-10 rounded-lg flex items-center justify-center hover:text-neon hover:border-neon/50 transition-colors">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9.78 18.65 10.06 14.42 17.74 7.5c.34-.31-.07-.46-.52-.19L7.74 13.47 3.64 12.2c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42Z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 py-6 text-center text-xs font-mono text-muted-foreground tracking-widest">
        © {new Date().getFullYear()} OCTAGEN · OCTA-CORE ONLINE
      </div>
    </footer>
  );
}
