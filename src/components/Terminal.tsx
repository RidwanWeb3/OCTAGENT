import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

async function* streamChat(messages: Msg[], signal: AbortSignal) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });
  if (!res.ok || !res.body) {
    if (res.status === 429) throw new Error("Rate limit reached. Please slow down.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
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
      } catch { /* ignore keepalives */ }
    }
  }
}

const COMMANDS = [
  { k: "/analyze BTC", d: "Deep-dive on Bitcoin" },
  { k: "/scan solana ecosystem", d: "Explorer + Analyst sweep" },
  { k: "/risk PEPE", d: "Guardian rug + liquidity check" },
  { k: "/strategy defensive", d: "Strategist portfolio plan" },
  { k: "/news AI stocks", d: "Analyst news synthesis" },
];

export function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setErr(null);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }, { role: "assistant", content: "" }];
    setMessages(next);
    setBusy(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let acc = "";
      for await (const chunk of streamChat(next.slice(0, -1), ac.signal)) {
        acc += chunk;
        setMessages((cur) => {
          const copy = cur.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setErr(e.message ?? "Stream failed");
    } finally { setBusy(false); abortRef.current = null; }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-2xl flex flex-col animate-fade-up">
      <div className="border-b border-border/60 px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-neon animate-pulse" />
          <span className="text-xs font-mono tracking-[0.3em] uppercase text-muted-foreground">Octa-Core Terminal</span>
        </div>
        <button onClick={onClose} className="text-xs font-mono text-muted-foreground hover:text-foreground">ESC · Close</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="text-[10px] font-mono tracking-[0.3em] text-neon uppercase mb-3">Ready</div>
              <h2 className="text-3xl font-bold">Ask Octa-Core anything.</h2>
              <p className="text-muted-foreground mt-3">Eight minds are online. Try a command:</p>
              <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                {COMMANDS.map((c) => (
                  <button key={c.k} onClick={() => send(c.k)} className="glass rounded-xl p-3 text-left hover:border-neon/40 transition group">
                    <div className="font-mono text-xs text-neon">{c.k}</div>
                    <div className="text-xs text-muted-foreground mt-1">{c.d}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div className={m.role === "user"
                ? "glass rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] text-sm"
                : "text-sm leading-relaxed whitespace-pre-wrap max-w-[90%]"}>
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

      <div className="border-t border-border/60 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Query Octa-Core… (e.g. /analyze ETH, or ask anything)"
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
  );
}
