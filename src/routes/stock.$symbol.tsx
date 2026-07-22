import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Sparkline } from "@/components/Sparkline";
import { formatUsd } from "@/lib/market";
import { RequireAuth } from "@/components/RequireAuth";
import { RiskBreakdown, Citations, type RiskFactor } from "@/components/RiskBreakdown";
import { SiteBackdrop } from "@/components/SiteBackdrop";

export const Route = createFileRoute("/stock/$symbol")({
  component: () => <RequireAuth><StockPage /></RequireAuth>,
  head: ({ params }) => ({
    meta: [
      { title: `${params.symbol.toUpperCase()} · Stock Analysis · OCTAGEN` },
      { name: "description", content: `Live quote, fundamentals, news and Octa-Core AI valuation for ${params.symbol.toUpperCase()}.` },
      { property: "og:title", content: `${params.symbol.toUpperCase()} — OCTAGEN Stock Analysis` },
      { property: "og:description", content: "Institutional-grade AI equity intelligence." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function StockPage() {
  const { symbol } = Route.useParams();
  const nav = useNavigate();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ai, setAi] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [input, setInput] = useState(symbol);

  useEffect(() => {
    setInput(symbol); setD(null); setAi(null); setErr(null);
    fetch(`/api/stock/${encodeURIComponent(symbol)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Lookup failed")))
      .then(setD).catch(e => setErr(e.message));
  }, [symbol]);

  const q = d?.quote;
  const p = d?.profile;
  const m = d?.metrics;
  const prices: number[] = (d?.history ?? []).map((h: any) => h.close);
  const up = q ? q.d >= 0 : true;

  const citations = useMemo(() => {
    if (!d) return [];
    return [
      { label: `Finnhub quote & news feed for ${d.symbol}`, url: `https://finnhub.io/` },
      { label: `Financial Modeling Prep — profile, metrics & 90d history`, url: `https://site.financialmodelingprep.com/` },
    ];
  }, [d]);

  const riskFactors = useMemo<RiskFactor[]>(() => {
    if (!d) return [];
    const pe = Number(m?.peRatioTTM ?? 0);
    const beta = Number(p?.beta ?? 1);
    const mcap = Number(p?.mktCap ?? 0);
    const margin = Number(m?.netProfitMarginTTM ?? 0);
    const last30 = prices.slice(-30);
    const dp = Number(q?.dp ?? 0);
    const mean = last30.reduce((a, b) => a + b, 0) / (last30.length || 1);
    const vol = last30.length ? Math.sqrt(last30.reduce((a, b) => a + (b - mean) ** 2, 0) / last30.length) / (mean || 1) : 0;

    const valuationScore = pe <= 0 ? 25 : pe < 15 ? 90 : pe < 25 ? 75 : pe < 40 ? 55 : pe < 70 ? 30 : 10;
    const marginScore = margin >= 0.25 ? 95 : margin >= 0.15 ? 80 : margin >= 0.05 ? 60 : margin >= 0 ? 35 : 10;
    const mcapScore = mcap >= 500e9 ? 95 : mcap >= 50e9 ? 85 : mcap >= 10e9 ? 70 : mcap >= 2e9 ? 50 : mcap >= 500e6 ? 30 : 10;
    const betaScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(beta - 1) * 40)));
    const momScore = Math.max(0, Math.min(100, 50 + dp * 3));
    const volScore = Math.max(0, Math.min(100, Math.round(100 - vol * 500)));

    return [
      { label: "Valuation (P/E)", weight: 3, score: valuationScore, detail: pe > 0 ? `P/E ${pe.toFixed(2)}x TTM` : "Unprofitable or missing" },
      { label: "Profitability", weight: 2, score: marginScore, detail: `${(margin * 100).toFixed(2)}% net margin TTM` },
      { label: "Market cap resilience", weight: 2, score: mcapScore, detail: `${formatUsd(mcap)} market cap` },
      { label: "Beta stability", weight: 1, score: betaScore, detail: `β ${beta.toFixed(2)} vs market` },
      { label: "30d realized vol", weight: 1, score: volScore, detail: `${(vol * 100).toFixed(2)}% stdev / mean` },
      { label: "Session momentum", weight: 1, score: momScore, detail: `${dp >= 0 ? "+" : ""}${dp.toFixed(2)}% today` },
    ];
  }, [d, m, p, q, prices]);

  async function runAI() {
    if (aiBusy || !d) return;
    setAiBusy(true); setAi(null);
    try {
      const compact = {
        symbol: d.symbol, quote: d.quote, profile: d.profile ? {
          name: d.profile.companyName, sector: d.profile.sector, industry: d.profile.industry,
          mktCap: d.profile.mktCap, beta: d.profile.beta, description: d.profile.description?.slice(0, 400),
        } : null,
        metrics: d.metrics,
        recentPrices: prices.slice(-30),
        computedRiskFactors: riskFactors,
      };
      const r = await fetch("/api/ai-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        context: JSON.stringify(compact),
        citations,
        prompt: `Engage Analyst + Strategist + Guardian. Give an institutional equity brief on ${d.symbol}: (1) business one-liner, (2) valuation read (P/E, P/S, margins from metrics), (3) momentum & technical support/resistance derived from the recent price series, (4) key risks, (5) a BUY/HOLD/SELL bias with confidence % and 1-line thesis, (6) confirm or challenge the pre-computed risk factors above. Cite every data claim inline as [1] or [2]. Markdown, tight, no fluff.`,
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
          <div className="flex items-center gap-4">
            {p?.image && <img src={p.image} alt={p.companyName} className="w-14 h-14 rounded-xl bg-white/5 p-1" />}
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] text-neon uppercase mb-1">Stock Analysis</div>
              <h1 className="text-4xl font-bold tracking-tight">{p?.companyName ?? d?.symbol ?? symbol.toUpperCase()}</h1>
              <p className="text-muted-foreground mt-1 font-mono text-xs">{d?.symbol ?? symbol.toUpperCase()} · {p?.exchangeShortName ?? ""} · {p?.sector ?? ""}</p>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (input.trim()) nav({ to: "/stock/$symbol", params: { symbol: input.trim().toUpperCase() } }); }} className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} placeholder="Ticker (e.g. NVDA)" className="bg-background/60 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-neon/50" />
            <button className="px-4 py-2 rounded-lg bg-neon text-primary-foreground text-sm font-mono tracking-[0.18em] uppercase">Scan</button>
          </form>
        </div>

        {err && <div className="glass rounded-xl p-6 text-destructive font-mono text-sm">{err}</div>}
        {!d && !err && <div className="glass rounded-2xl h-64 animate-pulse" />}

        {d && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass rounded-2xl p-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <div className="text-4xl font-bold tabular-nums">${(q?.c ?? 0).toFixed(2)}</div>
                  <div className={`text-xs font-mono mt-2 ${up ? "text-neon" : "text-destructive"}`}>
                    {up ? "+" : ""}{(q?.d ?? 0).toFixed(2)} ({(q?.dp ?? 0).toFixed(2)}%) · Today
                  </div>
                </div>
                <div className="text-right text-[11px] font-mono text-muted-foreground space-y-1">
                  <div>H {(q?.h ?? 0).toFixed(2)}</div>
                  <div>L {(q?.l ?? 0).toFixed(2)}</div>
                  <div>O {(q?.o ?? 0).toFixed(2)}</div>
                  <div>PC {(q?.pc ?? 0).toFixed(2)}</div>
                </div>
              </div>
              {prices.length > 1 && (
                <div className="h-64 w-full">
                  <Sparkline data={prices} up={up} width={800} height={240} />
                </div>
              )}
              <div className="mt-3 text-[10px] font-mono tracking-widest uppercase text-muted-foreground">90-day close · FMP</div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-3">
              <Metric label="Market Cap" value={p?.mktCap ? formatUsd(p.mktCap) : "—"} />
              <Metric label="P/E (TTM)" value={m?.peRatioTTM ? m.peRatioTTM.toFixed(2) : "—"} />
              <Metric label="P/S (TTM)" value={m?.priceToSalesRatioTTM ? m.priceToSalesRatioTTM.toFixed(2) : "—"} />
              <Metric label="Net margin" value={m?.netProfitMarginTTM ? `${(m.netProfitMarginTTM*100).toFixed(2)}%` : "—"} />
              <Metric label="ROE" value={m?.roeTTM ? `${(m.roeTTM*100).toFixed(2)}%` : "—"} />
              <Metric label="Beta" value={p?.beta ? p.beta.toFixed(2) : "—"} />
              <Metric label="Sector" value={p?.sector ?? "—"} />
              <Metric label="Website" value={p?.website ? <a href={p.website} target="_blank" rel="noreferrer" className="text-neon hover:underline">{p.website.replace(/^https?:\/\//,"")}</a> : "—"} />
            </div>

            <div className="lg:col-span-3">
              <RiskBreakdown factors={riskFactors} title="Guardian · Transparent Risk Breakdown" />
            </div>

            <div className="lg:col-span-3 glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Octa-Core AI Analysis</h2>
                <button onClick={runAI} disabled={aiBusy} className="text-xs font-mono tracking-[0.18em] uppercase px-4 py-2 rounded-lg bg-neon text-primary-foreground disabled:opacity-50 hover:animate-pulse-neon">
                  {aiBusy ? "Strategist Working…" : ai ? "Regenerate" : "Run Analysis"}
                </button>
              </div>
              {!ai && !aiBusy && <p className="text-sm text-muted-foreground">Fundamentals + technicals synthesized with inline citations to Finnhub & FMP.</p>}
              {aiBusy && <div className="animate-pulse text-sm text-muted-foreground">Eight minds converging…</div>}
              {ai && (
                <>
                  <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">{ai}</div>
                  <Citations items={citations} />
                </>
              )}
            </div>

            {d.news?.length > 0 && (
              <div className="lg:col-span-3">
                <h3 className="text-xs font-mono tracking-[0.3em] uppercase text-muted-foreground mb-3">Latest news</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {d.news.map((n: any) => (
                    <a key={n.id} href={n.url} target="_blank" rel="noreferrer" className="glass rounded-xl p-4 hover:border-neon/40 transition">
                      <div className="text-[10px] font-mono text-muted-foreground">{n.source} · {new Date(n.datetime*1000).toLocaleDateString()}</div>
                      <div className="text-sm font-semibold mt-1 line-clamp-2">{n.headline}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.summary}</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8"><Link to="/" className="text-xs font-mono text-muted-foreground hover:text-foreground">← Home</Link></div>
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
