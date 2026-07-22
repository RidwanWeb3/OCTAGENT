import { useCryptoMarkets, formatUsd } from "@/lib/market";
import { Sparkline } from "./Sparkline";

export function MarketGrid() {
  const { data, error } = useCryptoMarkets();

  return (
    <section id="markets" className="relative py-24 px-6 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-neon animate-pulse-neon" />
            <span className="text-xs font-mono tracking-[0.3em] text-muted-foreground uppercase">Live Market · CoinGecko</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Real-time market <span className="text-neon">intelligence</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Streaming prices, 7-day charts, and volume across the top digital assets. Analyst is scanning.
          </p>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {error ? <span className="text-destructive">RATE LIMIT — retrying…</span> : <span>UPDATED EVERY 45s</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {(data ?? Array.from({ length: 8 })).map((c: any, i) => {
          if (!c) return <div key={i} className="glass rounded-2xl h-44 animate-pulse" />;
          const up = (c.price_change_percentage_24h ?? 0) >= 0;
          return (
            <article
              key={c.id}
              className="glass rounded-2xl p-5 group hover:border-neon/40 transition-all hover:-translate-y-1 duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                   style={{ background: "radial-gradient(circle at 50% 0%, oklch(0.86 0.28 138 / 0.15), transparent 60%)" }} />
              <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                  <img src={c.image} alt={c.name} className="w-9 h-9 rounded-full ring-1 ring-border" />
                  <div>
                    <div className="font-semibold leading-tight">{c.name}</div>
                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">{c.symbol}</div>
                  </div>
                </div>
                <span className={`text-xs font-mono px-2 py-1 rounded-md ${up ? "bg-neon/10 text-neon" : "bg-destructive/10 text-destructive"}`}>
                  {up ? "+" : ""}{(c.price_change_percentage_24h ?? 0).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-end justify-between gap-3 relative">
                <div>
                  <div className="text-2xl font-bold tracking-tight tabular-nums">{formatUsd(c.current_price)}</div>
                  <div className="text-[11px] font-mono text-muted-foreground mt-1">
                    MC {formatUsd(c.market_cap)} · Vol {formatUsd(c.total_volume)}
                  </div>
                </div>
                <Sparkline data={c.sparkline_in_7d?.price ?? []} up={up} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
