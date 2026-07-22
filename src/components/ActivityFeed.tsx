import { useEffect, useState } from "react";

const EVENTS = [
  { arm: "Analyst", action: "Scanning BTC order flow", tag: "MARKET" },
  { arm: "Seeker", action: "Indexing 2,481 news sources", tag: "WEB" },
  { arm: "Guardian", action: "Monitoring 14 threat vectors", tag: "SECURITY" },
  { arm: "Shadow", action: "Running 32 background tasks", tag: "SYSTEM" },
  { arm: "Strategist", action: "Simulating 512 ETH scenarios", tag: "STRATEGY" },
  { arm: "Executor", action: "Dispatched 8 API calls", tag: "ACTION" },
  { arm: "Empath", action: "Adapting to user context", tag: "MEMORY" },
  { arm: "Creator", action: "Rendering visual report", tag: "OUTPUT" },
  { arm: "Analyst", action: "Detected divergence on SOL/USDT", tag: "SIGNAL" },
  { arm: "Seeker", action: "Fetched 47 blockchain events", tag: "CHAIN" },
];

export function ActivityFeed() {
  const [feed, setFeed] = useState(() => EVENTS.slice(0, 6));

  useEffect(() => {
    const id = setInterval(() => {
      setFeed((prev) => {
        const next = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        return [{ ...next, id: Date.now() } as any, ...prev].slice(0, 6);
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative py-24 px-6 max-w-7xl mx-auto">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-xs font-mono tracking-[0.3em] text-neon uppercase mb-4">AI Activity</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Always thinking. <br /><span className="text-neon">Never idle.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg">
            While you read this, the eight minds of Octa-Core are scanning markets, fetching intelligence, executing tasks, and guarding your session — in real time.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 font-mono text-[11px]">
            {["ANALYST", "STRATEGIST", "CREATOR", "EXECUTOR", "GUARDIAN", "EMPATH", "SEEKER", "SHADOW"].map((n) => (
              <span key={n} className="px-2.5 py-1 rounded-md glass tracking-widest text-muted-foreground">{n}</span>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 font-mono text-sm">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neon animate-pulse" />
              <span className="text-xs tracking-widest text-muted-foreground">OCTA-CORE // LIVE FEED</span>
            </div>
            <span className="text-[10px] text-muted-foreground">SECURE</span>
          </div>
          <ul className="space-y-2">
            {feed.map((e: any, i) => (
              <li key={(e.id ?? e.arm) + i} className="flex items-start gap-3 animate-fade-up">
                <span className="text-neon">›</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon/10 text-neon tracking-widest mt-0.5">{e.tag}</span>
                <span className="text-muted-foreground"><span className="text-foreground">{e.arm}</span> — {e.action}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-1 text-neon">
            <span>_</span><span className="animate-blink">▊</span>
          </div>
        </div>
      </div>
    </section>
  );
}
