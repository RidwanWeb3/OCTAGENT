import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Sparkline } from "@/components/Sparkline";
import { formatUsd } from "@/lib/market";
import { RequireAuth } from "@/components/RequireAuth";
import { RiskBreakdown, Citations, type RiskFactor } from "@/components/RiskBreakdown";
import { SiteBackdrop } from "@/components/SiteBackdrop";

export const Route = createFileRoute("/crypto/$query")({
  component: () => <RequireAuth><CryptoPage /></RequireAuth>,
  head: ({ params }) => ({
    meta: [
      { title: `${params.query.toUpperCase()} · Crypto Analysis · OCTAGEN` },
      { name: "description", content: `Live DEX chart, liquidity, holders and Octa-Core AI risk analysis for ${params.query}.` },
      { property: "og:title", content: `${params.query.toUpperCase()} — OCTAGEN Crypto Analysis` },
      { property: "og:description", content: "AI-powered on-chain intelligence." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function CryptoPage() {
  const { query } = Route.useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ai, setAi] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [input, setInput] = useState(query);

  useEffect(() => {
    setInput(query); setData(null); setAi(null); setErr(null);
    fetch(`/api/crypto/${encodeURIComponent(query)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Lookup failed")))
      .then(setData).catch(e => setErr(e.message));
  }, [query]);

  const top = data?.top;

  const citations = useMemo(() => {
    if (!top) return [];
    const c: { label: string; url?: string }[] = [
      { label: `DexScreener — ${top.chainId}/${top.dexId} pair`, url: top.url },
      { label: `Base token contract (${top.chainId})`, url: `https://dexscreener.com/${top.chainId}/${top.baseToken?.address}` },
    ];
    return c;
  }, [top]);

  const riskFactors = useMemo<RiskFactor[]>(() => {
    if (!top) return [];
    const liq = Number(top.liquidity?.usd ?? 0);
    const vol24 = Number(top.volume?.h24 ?? 0);
    const ageDays = top.pairCreatedAt ? Math.max(0, (Date.now() - top.pairCreatedAt) / 86400000) : 0;
    const chg24 = Number(top.priceChange?.h24 ?? 0);
    const buys = Number(top.txns?.h24?.buys ?? 0);
    const sells = Number(top.txns?.h24?.sells ?? 0);
    const total = buys + sells;
    const buyRatio = total ? buys / total : 0.5;

    const liqScore = liq >= 5_000_000 ? 95 : liq >= 1_000_000 ? 80 : liq >= 250_000 ? 60 : liq >= 50_000 ? 35 : liq >= 10_000 ? 15 : 5;
    const volScore = vol24 >= 10_000_000 ? 95 : vol24 >= 1_000_000 ? 80 : vol24 >= 100_000 ? 55 : vol24 >= 10_000 ? 30 : 10;
    const ageScore = ageDays >= 365 ? 95 : ageDays >= 180 ? 80 : ageDays >= 60 ? 60 : ageDays >= 14 ? 35 : ageDays >= 3 ? 15 : 5;
    const momScore = Math.max(0, Math.min(100, 50 + chg24 * 2));
    const flowScore = Math.round(50 + (buyRatio - 0.5) * 100);

    return [
      { label: "Liquidity depth", weight: 3, score: liqScore, detail: `$${liq.toLocaleString()} in pool` },
      { label: "24h volume", weight: 2, score: volScore, detail: `$${vol24.toLocaleString()} traded` },
      { label: "Pair age", weight: 2, score: ageScore, detail: `${Math.floor(ageDays)}d since launch` },
      { label: "24h momentum", weight: 1, score: momScore, detail: `${chg24 >= 0 ? "+" : ""}${chg24.toFixed(2)}% price change` },
      { label: "Buy / sell flow", weight: 1, score: Math.max(0, Math.min(100, flowScore)), detail: `${buys} buys · ${sells} sells (${Math.round(buyRatio * 100)}% buys)` },
    ];
  }, [top]);

  async function runAI() {
    if (!top || aiBusy) return;
    setAiBusy(true); setAi(null);
    try {
      const compact = {
        symbol: top.baseToken?.symbol, name: top.baseToken?.name, address: top.baseToken?.address,
        chain: top.chainId, dex: top.dexId,
        priceUsd: top.priceUsd, priceChange: top.priceChange,
        liquidity: top.liquidity, volume: top.volume, txns: top.txns,
        fdv: top.fdv, marketCap: top.marketCap, pairCreatedAt: top.pairCreatedAt,
        computedRiskFactors: riskFactors,
      };
      const r = await fetch("/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        context: JSON.stringify(compact),
        citations,
        prompt: `Engage Analyst + Guardian + Explorer. Give a concise institutional brief on this token: (1) what it is, (2) liquidity & volume health, (3) momentum vs 24h/7d, (4) red flags (age, low liquidity, honeypot signals), (5) confirm or challenge the pre-computed risk factors above. Cite every data claim inline as [1] or [2]. Use markdown headings.`,
      })});
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setAi(j.text);
    } catch (e: any) { setAi(`Error: ${e.message}`); } finally { setAiBusy(false); }
  }

  return (
    <div className="page-shell page-shell--subtle dark min-h-screen">
      <SiteBackdrop variant="subtle" />
      <div className="page-content">
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-neon uppercase mb-2">Crypto Analysis</div>
            <h1 className="text-4xl font-bold tracking-tight">{top?.baseToken?.name ?? query.toUpperCase()}</h1>
            {top?.baseToken?.symbol && <p className="text-muted-foreground mt-1 font-mono text-xs">{top.baseToken.symbol} · {top.chainId} · {top.dexId}</p>}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav({ to: "/crypto/$query", params: { query: input.trim() } }); }} className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Symbol or 0x… address" className="bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-neon/50" />
            <button className="px-4 py-2 rounded-lg bg-neon text-primary-foreground text-sm font-mono tracking-[0.18em] uppercase">Scan</button>
          </form>
        </div>

        {err && <div className="glass rounded-xl p-6 text-destructive font-mono text-sm">{err}</div>}
        {!data && !err && <div className="glass rounded-2xl h-64 animate-pulse" />}

        {top && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="text-4xl font-bold tabular-nums">${Number(top.priceUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
                  <div className="flex gap-3 mt-2 text-xs font-mono">
                    {["m5","h1","h6","h24"].map(k => {
                      const v = top.priceChange?.[k] ?? 0;
                      return <span key={k} className={v>=0?"text-neon":"text-destructive"}>{k.toUpperCase()} {v>=0?"+":""}{Number(v).toFixed(2)}%</span>;
                    })}
                  </div>
                </div>
                <a href={top.url} target="_blank" rel="noreferrer" className="text-xs font-mono text-neon hover:underline">Open on DexScreener →</a>
              </div>
              <div className="rounded-xl overflow-hidden border border-border/60 bg-black/40" style={{ aspectRatio: "16/10" }}>
                <iframe key={top.pairAddress} src={`https://dexscreener.com/${top.chainId}/${top.pairAddress}?embed=1&theme=dark&info=0`} className="w-full h-full" title="DexScreener chart" />
              </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-3">
              <Metric label="Liquidity (USD)" value={formatUsd(top.liquidity?.usd ?? 0)} />
              <Metric label="24h Volume" value={formatUsd(top.volume?.h24 ?? 0)} />
              <Metric label="Market Cap" value={top.marketCap ? formatUsd(top.marketCap) : "—"} />
              <Metric label="FDV" value={top.fdv ? formatUsd(top.fdv) : "—"} />
              <Metric label="24h Txns (buy/sell)" value={`${top.txns?.h24?.buys ?? 0} / ${top.txns?.h24?.sells ?? 0}`} />
              <Metric label="Pair age" value={top.pairCreatedAt ? `${Math.max(1, Math.floor((Date.now() - top.pairCreatedAt)/86400000))}d` : "—"} />
              <Metric label="Contract" value={<span className="font-mono text-[10px] break-all">{top.baseToken?.address}</span>} />
            </div>

            <div className="lg:col-span-3">
              <RiskBreakdown factors={riskFactors} title="Guardian · Transparent Risk Breakdown" />
            </div>

            <div className="lg:col-span-3 glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Octa-Core AI Analysis</h2>
                <button onClick={runAI} disabled={aiBusy} className="text-xs font-mono tracking-[0.18em] uppercase px-4 py-2 rounded-lg bg-neon text-primary-foreground disabled:opacity-50 hover:animate-pulse-neon">
                  {aiBusy ? "Analyst Working…" : ai ? "Regenerate" : "Run Analysis"}
                </button>
              </div>
              {!ai && !aiBusy && <p className="text-sm text-muted-foreground">Run Analyst + Guardian to score risk and synthesize on-chain signals with inline citations.</p>}
              {aiBusy && <div className="animate-pulse text-sm text-muted-foreground">Eight minds converging…</div>}
              {ai && (
                <>
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">{ai}</div>
                  <Citations items={citations} />
                </>
              )}
            </div>

            {(data.pairs?.length ?? 0) > 1 && (
              <div className="lg:col-span-3">
                <h3 className="text-xs font-mono tracking-[0.3em] uppercase text-muted-foreground mb-3">Other pairs</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.pairs.slice(1, 5).map((p: any) => (
                    <div key={p.pairAddress} className="glass rounded-xl p-4">
                      <div className="text-xs font-mono text-muted-foreground">{p.chainId} · {p.dexId}</div>
                      <div className="text-lg font-bold tabular-nums mt-1">${Number(p.priceUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-1">Liq {formatUsd(p.liquidity?.usd ?? 0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8"><Link to="/" className="text-xs font-mono text-muted-foreground hover:text-foreground">← Home</Link></div>
        <div className="hidden"><Sparkline data={[]} up /></div>
      </main>
      <Footer />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-2 last:border-0">
      <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-right">{value}</span>
    </div>
  );
}
