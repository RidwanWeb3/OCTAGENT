import mascot from "@/assets/octagen mascot.png";
import banner from "@/assets/octagen-banner.jpeg";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string };

const COMMANDS = [
  { k: "/analyze BTC", d: "Deep-dive on Bitcoin", cat: "crypto" as const },
  { k: "/analyze ETH", d: "Deep-dive on Ethereum", cat: "crypto" as const },
  { k: "/scan solana ecosystem", d: "Explorer + Analyst sweep", cat: "crypto" as const },
  { k: "/risk PEPE", d: "Guardian rug + liquidity check", cat: "crypto" as const },
  { k: "/strategy defensive", d: "Strategist portfolio plan", cat: "general" as const },
  { k: "/strategy aggressive", d: "Higher-beta strategist plan", cat: "general" as const },
  { k: "/news AI stocks", d: "Analyst news synthesis", cat: "stock" as const },
  { k: "/news crypto", d: "Latest crypto flows", cat: "crypto" as const },
  { k: "/valuation NVDA", d: "Equity valuation brief", cat: "stock" as const },
  { k: "/compare BTC ETH", d: "Comparative analysis", cat: "crypto" as const },
  { k: "/crypto <symbol | address | dexscreener-url | coingecko-url>", d: "CEX + DEX + on-chain research", cat: "crypto" as const },
  { k: "/stock <ticker>", d: "Equity analysis", cat: "stock" as const },
  { k: "/memory", d: "What Octa-Core remembers about me", cat: "general" as const },
];

const HISTORY_KEY = "octagen.terminal.history.v1";

async function* streamChat(messages: Msg[], userId: string | null, signal: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-octagen-user": userId } : {}),
    },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) throw new Error("Rate limit reached. Please slow down.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Stream error ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch { /* keepalive */ }
    }
  }
}

export function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"crypto" | "stock">("crypto");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (!q) return [] as { k: string; d: string; kind: "cmd" | "hist" }[];
    const cmd = COMMANDS.filter(c => c.k.toLowerCase().includes(q)).map(c => ({ ...c, kind: "cmd" as const }));
    const hist = history
      .filter(h => h.toLowerCase().includes(q) && h.toLowerCase() !== q)
      .slice(0, 5)
      .map(h => ({ k: h, d: "History", kind: "hist" as const }));
    return [...hist, ...cmd].slice(0, 8);
  }, [input, history]);

  function inferMode(text: string): "crypto" | "stock" | null {
    const t = text.trim().toLowerCase();
    if (t.startsWith("/stock")) return "stock";
    if (t.startsWith("/crypto")) return "crypto";
    return null;
  }

  const quickCommands = useMemo(() => {
    const base = COMMANDS.filter(c => c.cat === mode || c.cat === "general");
    return base.slice(0, 6);
  }, [mode]);

  function pushHistory(text: string) {
    setHistory(prev => {
      const next = [text, ...prev.filter(h => h !== text)].slice(0, 50);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
    setHistIdx(-1);
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const inferred = inferMode(content);
    if (inferred) setMode(inferred);
    setErr(null);
    setInput("");
    setSuggestOpen(false);
    pushHistory(content);
    const next: Msg[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let acc = "";
      for await (const chunk of streamChat(next.slice(0, -1), user?.id ?? null, ac.signal)) {
        acc += chunk;
        setMessages(cur => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setErr(e.message ?? "Stream failed");
    } finally { setBusy(false); abortRef.current = null; }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestOpen && suggestions.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIdx(i => (i + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSuggestIdx(i => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Tab") { e.preventDefault(); setInput(suggestions[suggestIdx].k); setSuggestOpen(false); return; }
      if (e.key === "Enter") {
        // If highlighted suggestion differs from typed, autocomplete first
        e.preventDefault();
        const chosen = suggestions[suggestIdx].k;
        if (chosen && chosen !== input.trim()) { setInput(chosen); setSuggestOpen(false); return; }
        send(); return;
      }
      if (e.key === "Escape") { e.preventDefault(); setSuggestOpen(false); return; }
    }
    if (!suggestOpen) {
      if (e.key === "ArrowUp" && history.length) {
        e.preventDefault();
        const ni = Math.min(history.length - 1, histIdx + 1);
        setHistIdx(ni); setInput(history[ni] ?? "");
        return;
      }
      if (e.key === "ArrowDown" && histIdx >= 0) {
        e.preventDefault();
        const ni = histIdx - 1;
        setHistIdx(ni);
        setInput(ni < 0 ? "" : history[ni]);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl flex flex-col animate-fade-up">
      <div className="border-b border-border/60 px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={mascot}
              alt="OCTAGEN"
              className={`w-8 h-8 drop-shadow-[0_0_14px_oklch(0.86_0.28_138_/_0.55)] transition-transform ${busy ? "animate-pulse-neon" : "hover:scale-110"}`}
            />
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-border bg-neon ${busy ? "animate-pulse" : "opacity-70"}`} />
          </div>
          <span className="text-xs font-mono tracking-[0.3em] uppercase text-muted-foreground">Octa-Core Terminal</span>
          {user && <span className="text-[10px] font-mono text-muted-foreground/70">· {user.email}</span>}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (!confirm("Clear command history?")) return;
              setHistory([]); try { localStorage.removeItem(HISTORY_KEY); } catch {}
            }}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-destructive"
          >Clear history</button>
          <button onClick={onClose} className="text-xs font-mono text-muted-foreground hover:text-foreground">ESC · Close</button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass rounded-2xl overflow-hidden border border-border/60">
            <div className="relative h-20 sm:h-24">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "saturate(1.06) contrast(1.06) brightness(0.55)",
                }}
              />
              <div className="absolute inset-0 bg-background/55" />
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(800px circle at 20% 0%, oklch(0.86 0.28 138 / 0.18), transparent 55%)" }}
              />
              <div className="relative h-full flex items-end justify-between px-4 sm:px-6 pb-3">
                <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-muted-foreground">OCTAGEN</div>
                <div className={`text-[10px] font-mono tracking-[0.3em] uppercase ${busy ? "text-neon" : "text-muted-foreground"}`}>
                  {busy ? "SYNCING" : "ONLINE"}
                </div>
              </div>
            </div>
          </div>
          {messages.length === 0 && (
            <div className="text-center py-10 sm:py-16">
              <div className="text-[10px] font-mono tracking-[0.3em] text-neon uppercase mb-3">Ready</div>
              <h2 className="text-3xl font-bold">Ask Octa-Core anything.</h2>
              <p className="text-muted-foreground mt-3">Eight minds are synced and ready to think with you. Type <span className="text-neon font-mono">/</span> to unlock command mode, or tap <span className="text-neon font-mono">↑</span> to revisit your last signal.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => { setMode("crypto"); setInput("/crypto "); setSuggestOpen(true); setSuggestIdx(0); setHistIdx(-1); inputRef.current?.focus(); }}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-mono tracking-[0.22em] uppercase transition-all ${mode === "crypto" ? "bg-neon text-primary-foreground hover:animate-pulse-neon" : "glass hover:border-neon/50"}`}
                >
                  Analyze Crypto
                </button>
                <button
                  onClick={() => { setMode("stock"); setInput("/stock "); setSuggestOpen(true); setSuggestIdx(0); setHistIdx(-1); inputRef.current?.focus(); }}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-mono tracking-[0.22em] uppercase transition-all ${mode === "stock" ? "bg-neon text-primary-foreground hover:animate-pulse-neon" : "glass hover:border-neon/50"}`}
                >
                  Analyze Stock
                </button>
              </div>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {quickCommands.map(c => (
                  <button key={c.k} onClick={() => send(c.k)} className="glass rounded-xl p-3 text-left hover:border-neon/40 transition group">
                    <div className="font-mono text-xs text-neon">{c.k}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.d}</div>
                  </button>
                ))}
              </div>
              {history.length > 0 && (
                <div className="mt-8 text-left max-w-xl mx-auto">
                  <div className="text-[10px] font-mono tracking-[0.3em] text-muted-foreground uppercase mb-2">Recent prompts</div>
                  <div className="flex flex-wrap gap-1.5">
                    {history.slice(0, 8).map(h => (
                      <button key={h} onClick={() => send(h)} className="text-[11px] font-mono px-2.5 py-1 rounded-md glass hover:border-neon/40 hover:text-neon transition truncate max-w-[220px] sm:max-w-[280px]">
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={m.role === "user"
                ? "glass rounded-2xl rounded-br-sm px-4 py-3 max-w-[92%] sm:max-w-[85%] text-sm"
                : "text-sm leading-relaxed whitespace-pre-wrap max-w-[96%] sm:max-w-[90%]"}>
                {m.role === "assistant" && (
                  <div className="text-[10px] font-mono tracking-[0.25em] text-neon uppercase mb-1.5">Octa-Core</div>
                )}
                {m.content || <span className="text-muted-foreground animate-pulse">▮</span>}
              </div>
            </div>
          ))}
          {err && <div className="text-xs text-destructive font-mono">{err}</div>}
        </div>
      </div>

      <div className="border-t border-border/60 px-4 sm:px-6 py-4 relative">
        <div className="max-w-3xl mx-auto">
          {suggestOpen && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 px-4 sm:px-6 pb-2">
              <div className="max-w-3xl mx-auto glass rounded-xl overflow-hidden border border-border/60">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.kind}-${s.k}`}
                    onMouseDown={(e) => { e.preventDefault(); setInput(s.k); setSuggestOpen(false); inputRef.current?.focus(); }}
                    onMouseEnter={() => setSuggestIdx(i)}
                    className={`w-full text-left px-4 py-2 flex items-center justify-between gap-3 transition ${i === suggestIdx ? "bg-neon/10" : "hover:bg-neon/5"}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[9px] font-mono uppercase tracking-widest ${s.kind === "hist" ? "text-muted-foreground" : "text-neon"}`}>{s.kind === "hist" ? "↑" : "/"}</span>
                      <span className="font-mono text-xs truncate">{s.k}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{s.d}</span>
                  </button>
                ))}
                <div className="px-4 py-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground border-t border-border/40 bg-background/40">
                  ↑↓ navigate · Tab autocomplete · Enter run · Esc close
                </div>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              autoFocus
              value={input}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                const inferred = inferMode(v);
                if (inferred) setMode(inferred);
                setSuggestOpen(true);
                setSuggestIdx(0);
                setHistIdx(-1);
              }}
              onFocus={() => { if (input) setSuggestOpen(true); }}
              onBlur={() => setTimeout(() => setSuggestOpen(false), 100)}
              onKeyDown={onKeyDown}
              placeholder="Query Octa-Core… ( / for commands · ↑ for history )"
              className="flex-1 bg-background/60 border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-neon/50"
            />
            {busy ? (
              <button onClick={() => abortRef.current?.abort()} className="px-5 rounded-xl glass hover:border-destructive/50 text-sm font-mono">Stop</button>
            ) : (
              <button onClick={() => send()} className="px-5 rounded-xl bg-neon text-primary-foreground text-sm font-semibold tracking-wide hover:animate-pulse-neon">Send</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
