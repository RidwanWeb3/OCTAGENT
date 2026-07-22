import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

type TavilyResult = { title: string; url: string; content: string; score?: number };
type Category = "all" | "crypto" | "stocks" | "companies" | "projects" | "news";

const CAT_LABEL: Record<Category, string> = {
  all: "All", crypto: "Crypto", stocks: "Stocks", companies: "Companies", projects: "Projects", news: "News",
};

const NEWS_HOSTS = ["reuters.com","bloomberg.com","cnbc.com","wsj.com","ft.com","coindesk.com","theblock.co","cointelegraph.com","decrypt.co","axios.com","techcrunch.com"];
const CRYPTO_HOSTS = ["coingecko.com","coinmarketcap.com","dexscreener.com","etherscan.io","solscan.io","dextools.io","defillama.com"];
const STOCK_HOSTS = ["finance.yahoo.com","seekingalpha.com","marketwatch.com","nasdaq.com","sec.gov","tipranks.com","fool.com"];
const COMPANY_HOSTS = ["linkedin.com","crunchbase.com","bloomberg.com/profile","pitchbook.com","apollo.io"];
const PROJECT_HOSTS = ["github.com","docs.","gitlab.com","huggingface.co","npmjs.com","medium.com"];

function hostOf(u: string) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }

function classify(r: TavilyResult): Category {
  const h = hostOf(r.url); const t = (r.title + " " + r.content).toLowerCase();
  if (NEWS_HOSTS.some(x => h.includes(x))) return "news";
  if (CRYPTO_HOSTS.some(x => h.includes(x)) || /\b(token|coin|dex|liquidity|onchain|blockchain|defi|nft|wallet)\b/.test(t)) return "crypto";
  if (STOCK_HOSTS.some(x => h.includes(x)) || /\b(nasdaq|nyse|earnings|eps|p\/e|dividend|ticker)\b/.test(t)) return "stocks";
  if (COMPANY_HOSTS.some(x => h.includes(x)) || /\b(company|corporation|inc\.|ltd\.|founder|ceo|headquartered)\b/.test(t)) return "companies";
  if (PROJECT_HOSTS.some(x => h.includes(x)) || /\b(open[- ]source|repository|framework|library|sdk|api docs)\b/.test(t)) return "projects";
  return "news";
}

function rerank(results: TavilyResult[], q: string, cat: Category): (TavilyResult & { _cat: Category; _score: number })[] {
  const ql = q.toLowerCase();
  const enriched = results.map(r => {
    const c = classify(r);
    const h = hostOf(r.url);
    const t = (r.title + " " + r.content).toLowerCase();
    const tavily = r.score ?? 0;
    let s = tavily * 100;
    if (r.title.toLowerCase().includes(ql)) s += 25;
    if (t.includes(ql)) s += 8;
    if (h.length < 20) s += 2;
    if (c === "news") s += 3; // recency bias
    return { ...r, _cat: c, _score: s };
  });
  const filtered = cat === "all" ? enriched : enriched.filter(r => r._cat === cat);
  return filtered.sort((a, b) => b._score - a._score);
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ans, setAns] = useState<string | null>(null);
  const [results, setResults] = useState<TavilyResult[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState<Category>("all");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim() || busy) return;
    setBusy(true); setErr(null); setAns(null); setResults([]);
    try {
      const r = await fetch("/api/tavily", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setAns(j.answer ?? null);
      setResults(j.results ?? []);
    } catch (e: any) { setErr(e.message ?? "Search failed"); } finally { setBusy(false); }
  }

  const ranked = useMemo(() => rerank(results, q, cat), [results, q, cat]);
  const counts = useMemo(() => {
    const c: Record<Category, number> = { all: results.length, crypto: 0, stocks: 0, companies: 0, projects: 0, news: 0 };
    for (const r of results) c[classify(r)]++;
    return c;
  }, [results]);

  if (!open) return null;
  const cryptoHint = /^[a-zA-Z0-9]{2,10}$|0x[a-f0-9]{40}/.test(q.trim());
  const stockHint = /^[A-Z]{1,5}$/.test(q.trim().toUpperCase());

  return (
    <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-xl flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={run} className="flex items-center gap-3 px-5 h-14 border-b border-border/60">
          <span className="text-neon text-lg">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search markets, tokens, tickers, companies, projects, news…" className="flex-1 bg-transparent focus:outline-none text-sm font-mono" />
          <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5">ESC</kbd>
        </form>

        {(cryptoHint || stockHint) && q && (
          <div className="px-5 py-3 border-b border-border/40 flex gap-2 flex-wrap">
            <Link to="/crypto/$query" params={{ query: q.trim() }} onClick={onClose} className="text-xs font-mono px-3 py-1.5 rounded-md bg-neon/10 text-neon hover:bg-neon/20">→ Crypto: {q}</Link>
            {stockHint && <Link to="/stock/$symbol" params={{ symbol: q.trim().toUpperCase() }} onClick={onClose} className="text-xs font-mono px-3 py-1.5 rounded-md bg-neon/10 text-neon hover:bg-neon/20">→ Stock: {q.toUpperCase()}</Link>}
          </div>
        )}

        {results.length > 0 && (
          <div className="px-5 py-2 border-b border-border/40 flex gap-1 flex-wrap">
            {(Object.keys(CAT_LABEL) as Category[]).map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md transition ${cat === c ? "bg-neon text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-neon/5"}`}
              >
                {CAT_LABEL[c]} <span className="opacity-60">{counts[c]}</span>
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {busy && <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Explorer + Analyst scanning…</div>}
          {err && <div className="p-5 text-sm text-destructive font-mono">{err}</div>}
          {ans && (
            <div className="p-5 border-b border-border/40">
              <div className="text-[10px] font-mono tracking-[0.25em] text-neon uppercase mb-2">Octa-Core Synthesis</div>
              <p className="text-sm leading-relaxed">{ans}</p>
            </div>
          )}
          {ranked.map(r => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="block px-5 py-3 border-b border-border/30 hover:bg-neon/5 transition">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold line-clamp-1 flex-1">{r.title}</div>
                <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-neon/10 text-neon shrink-0">{CAT_LABEL[r._cat]}</span>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono line-clamp-1 mt-0.5">{hostOf(r.url)}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</div>
            </a>
          ))}
          {!busy && !ans && !results.length && !err && (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">
              Try: <span className="text-neon">BTC</span> · <span className="text-neon">NVDA</span> · <span className="text-neon">"AI infra 2026"</span>
            </div>
          )}
          {!busy && ranked.length === 0 && results.length > 0 && (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">No results in <span className="text-neon">{CAT_LABEL[cat]}</span>.</div>
          )}
        </div>
      </div>
    </div>
  );
}
