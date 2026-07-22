export type RiskFactor = {
  label: string;
  score: number;       // 0-100, higher = safer/better
  weight: number;      // relative weight
  detail: string;
};

export function computeRisk(factors: RiskFactor[]) {
  const totalW = factors.reduce((a, f) => a + f.weight, 0) || 1;
  const safety = factors.reduce((a, f) => a + f.score * f.weight, 0) / totalW;
  const risk = Math.round(100 - safety);
  return { risk, safety: Math.round(safety) };
}

export function RiskBreakdown({ factors, title = "Transparent Risk Breakdown" }: { factors: RiskFactor[]; title?: string }) {
  const { risk } = computeRisk(factors);
  const band = risk < 30 ? "text-neon" : risk < 60 ? "text-yellow-400" : "text-destructive";
  const bandBg = risk < 30 ? "bg-neon" : risk < 60 ? "bg-yellow-400" : "bg-destructive";
  const label = risk < 30 ? "LOW" : risk < 60 ? "MODERATE" : "HIGH";

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">Composite score computed live from the data sources on this page.</div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className={`text-5xl font-bold tabular-nums ${band}`}>{risk}</span>
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">/100</span>
            <span className={`text-[10px] font-mono uppercase tracking-widest ${band}`}>{label} RISK</span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {factors.map(f => {
          const barW = Math.max(3, Math.min(100, f.score));
          const barColor = f.score >= 70 ? "bg-neon" : f.score >= 40 ? "bg-yellow-400" : "bg-destructive";
          return (
            <div key={f.label}>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="uppercase tracking-widest text-muted-foreground">{f.label} <span className="opacity-60">×{f.weight}</span></span>
                <span className={f.score >= 70 ? "text-neon" : f.score >= 40 ? "text-yellow-400" : "text-destructive"}>{f.score}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-border/40 mt-1.5 overflow-hidden">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${barW}%` }} />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mt-1">{f.detail}</div>
            </div>
          );
        })}
      </div>
      <div className={`mt-5 h-2 rounded-full bg-border/40 overflow-hidden`}>
        <div className={`h-full ${bandBg}`} style={{ width: `${risk}%` }} />
      </div>
    </div>
  );
}

export function Citations({ items }: { items: { label: string; url?: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5 pt-4 border-t border-border/40">
      <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground mb-2">Citations · Data Sources</div>
      <ol className="space-y-1 text-[11px] font-mono">
        {items.map((c, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-neon">[{i + 1}]</span>
            {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-neon truncate">{c.label}</a> : <span className="text-muted-foreground">{c.label}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
