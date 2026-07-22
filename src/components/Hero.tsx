import { useEffect, useRef, useState } from "react";
import mascot from "@/assets/octagen mascot.png";

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 40 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setPos({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section ref={ref} className="relative overflow-hidden min-h-[92vh] flex items-center">
      {/* interactive glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity"
        style={{ background: `radial-gradient(600px circle at ${pos.x}% ${pos.y}%, oklch(0.86 0.28 138 / 0.18), transparent 60%)` }}
      />
      <div className="absolute inset-0 neural-grid opacity-40 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon/60 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center w-full">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-muted-foreground">Octa-Core · v1.0 · Online</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] tracking-tight">
            The 8-Armed <br />
            <span className="text-neon">Autonomous AI</span> <br />
            Intelligence.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl">
            Eight minds. One consciousness. Infinite intelligence. OCTAGEN is a living AI operating system that scans markets, executes strategies, and defends your world in real time.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#markets" className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-neon text-primary-foreground text-sm font-mono tracking-[0.24em] uppercase hover:animate-pulse-neon transition-all">
              MEET THE OCTAGEN
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </a>
            <a href="#markets" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl glass hover:border-neon/50 text-sm font-mono tracking-[0.24em] uppercase transition-all">
              EXPLORE MARKETS
            </a>
          </div>
          <div className="mt-5 glass rounded-2xl px-5 py-4 max-w-2xl">
            <div className="text-[10px] font-mono tracking-[0.26em] uppercase text-muted-foreground">$OCTAGEN CA</div>
            <div className="mt-2 text-lg sm:text-xl font-semibold text-neon tracking-[0.18em] uppercase">
              COMING SOON
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="https://ponsfamily.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-neon text-primary-foreground text-sm font-mono tracking-[0.22em] uppercase hover:animate-pulse-neon transition-all"
              >
                BUY $OCTAGEN
              </a>
              <a
                href="https://dexscreener.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl glass hover:border-neon/50 text-sm font-mono tracking-[0.22em] uppercase transition-all"
              >
                $OCTAGEN CHART
              </a>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
            {[
              { k: "8", l: "Specialized Minds" },
              { k: "24/7", l: "Autonomous Ops" },
              { k: "<40ms", l: "Signal Latency" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-bold text-neon">{s.k}</div>
                <div className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative aspect-square max-w-[560px] justify-self-center w-full">
          <div className="absolute inset-6 rounded-full blur-3xl bg-neon/25 animate-pulse-neon" />
          <div className="absolute inset-0 rounded-full border border-neon/20 animate-orbit" />
          <div className="absolute inset-12 rounded-full border border-neon/10" style={{ animation: "orbit 30s linear infinite reverse" }} />
          <img
            src={mascot}
            alt="OCTAGEN mascot — Octa-Core intelligence"
            className="relative w-full h-full object-contain animate-float drop-shadow-[0_0_60px_oklch(0.86_0.28_138_/_0.55)]"
          />
        </div>
      </div>
    </section>
  );
}
