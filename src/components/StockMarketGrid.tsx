import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type Row = {
  symbol: string;
  quote: { c: number; d: number; dp: number; h: number; l: number; pc: number } | null;
  profile: { name?: string; logo?: string; finnhubIndustry?: string; marketCapitalization?: number } | null;
};

export function StockMarketGrid() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/stocks-market");
        if (!r.ok) throw new Error("Feed offline");
        const j = await r.json();
        if (alive) { setRows(j.data); setErr(null); }
      } catch (e: any) { if (alive) setErr(e.message); }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <section id="stocks" className="relative py-16 sm:py-24 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
            <span className="text-xs font-mono tracking-[0.3em] text-muted-foreground uppercase">Live Equities · Finnhub</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Public markets <span className="text-neon">under Analyst gaze</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl">Real-time quotes on the AI + high-beta universe. Click any ticker for full institutional analysis.</p>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {err ? <span className="text-destructive">{err}</span> : <span>REFRESH · 60s</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {(rows ?? Array.from({ length: 10 })).map((r: any, i) => {
          if (!r) return <div key={i} className="glass rounded-2xl h-28 sm:h-32 animate-pulse" />;
          const up = (r.quote?.dp ?? 0) >= 0;
          return (
            <Link
              key={r.symbol}
              to="/stock/$symbol"
              params={{ symbol: r.symbol }}
              className="glass rounded-2xl p-3 sm:p-4 hover:border-neon/40 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="flex items-center gap-2 mb-2">
                {r.profile?.logo && <img src={r.profile.logo} alt={r.symbol} className="w-6 h-6 rounded-md bg-white/5 p-0.5" />}
                <div className="font-mono text-xs tracking-widest text-muted-foreground">{r.symbol}</div>
              </div>
              <div className="text-lg font-bold tabular-nums">${(r.quote?.c ?? 0).toFixed(2)}</div>
              <div className={`text-[11px] font-mono mt-1 ${up ? "text-neon" : "text-destructive"}`}>
                {up ? "+" : ""}{(r.quote?.dp ?? 0).toFixed(2)}%
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
