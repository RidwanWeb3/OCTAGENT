import { useCryptoMarkets, formatUsd } from "@/lib/market";

export function MarketTicker() {
  const { data } = useCryptoMarkets(60000);
  const items = data ?? [];
  const loop = [...items, ...items];
  return (
    <div className="relative border-y border-border/40 bg-background/60 backdrop-blur-md overflow-hidden mask-fade-x">
      <div className="flex whitespace-nowrap py-3 animate-ticker" style={{ width: "max-content" }}>
        {loop.length === 0 && (
          <span className="px-4 sm:px-6 text-xs font-mono text-muted-foreground tracking-widest">STREAMING LIVE MARKET DATA…</span>
        )}
        {loop.map((c, i) => {
          const up = (c.price_change_percentage_24h ?? 0) >= 0;
          return (
            <span key={`${c.id}-${i}`} className="flex items-center gap-2 px-4 sm:px-6 text-xs sm:text-sm font-mono">
              <img src={c.image} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
              <span className="text-muted-foreground uppercase tracking-wider">{c.symbol}</span>
              <span className="text-foreground">{formatUsd(c.current_price)}</span>
              <span className={up ? "text-neon" : "text-destructive"}>
                {up ? "▲" : "▼"} {Math.abs(c.price_change_percentage_24h ?? 0).toFixed(2)}%
              </span>
              <span className="text-border">|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
