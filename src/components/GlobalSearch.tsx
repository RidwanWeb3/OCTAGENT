import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

type TavilyResult = { title: string; url: string; content: string; score?: number };

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ans, setAns] = useState<string | null>(null);
  const [results, setResults] = useState<TavilyResult[]>([]);
  const [err, setErr] = useState<string | null>(null);

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

  if (!open) return null;
  const cryptoHint = /^[a-zA-Z0-9]{2,10}$|0x[a-f0-9]{40}/.test(q.trim());
  const stockHint = /^[A-Z]{1,5}$/.test(q.trim().toUpperCase());

  return (
    <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-xl flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={run} className="flex items-center gap-3 px-5 h-14 border-b border-border/60">
          <span className="text-neon text-lg">⌕</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search markets, tokens, tickers, news…" className="flex-1 bg-transparent focus:outline-none text-sm font-mono" />
          <kbd className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5">ESC</kbd>
        </form>

        {(cryptoHint || stockHint) && q && (
          <div className="px-5 py-3 border-b border-border/40 flex gap-2 flex-wrap">
            <Link to="/crypto/$query" params={{ query: q.trim() }} onClick={onClose} className="text-xs font-mono px-3 py-1.5 rounded-md bg-neon/10 text-neon hover:bg-neon/20">→ Crypto: {q}</Link>
            {stockHint && <Link to="/stock/$symbol" params={{ symbol: q.trim().toUpperCase() }} onClick={onClose} className="text-xs font-mono px-3 py-1.5 rounded-md bg-neon/10 text-neon hover:bg-neon/20">→ Stock: {q.toUpperCase()}</Link>}
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
          {results.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="block px-5 py-3 border-b border-border/30 hover:bg-neon/5 transition">
              <div className="text-sm font-semibold line-clamp-1">{r.title}</div>
              <div className="text-[11px] text-muted-foreground font-mono line-clamp-1 mt-0.5">{r.url}</div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</div>
            </a>
          ))}
          {!busy && !ans && !results.length && !err && (
            <div className="p-8 text-center text-xs font-mono text-muted-foreground">
              Try: <span className="text-neon">BTC</span> · <span className="text-neon">NVDA</span> · <span className="text-neon">"AI infra 2026"</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
