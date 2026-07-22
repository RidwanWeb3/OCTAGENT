import mascot from "@/assets/octagen mascot.png";

const MINDS = [
  { name: "Analyst", desc: "Processes market & on-chain data in real time." },
  { name: "Strategist", desc: "Simulates countless futures before deciding." },
  { name: "Creator", desc: "Generates code, UI, visuals at human quality." },
  { name: "Executor", desc: "Turns decisions into actions via APIs." },
  { name: "Guardian", desc: "Protects users, data, and digital assets." },
  { name: "Empath", desc: "Understands intent, tone, and preference." },
  { name: "Seeker", desc: "Explores the web, chains, and research." },
  { name: "Shadow", desc: "Runs silent background tasks continuously." },
];

export function OctaCore() {
  return (
    <section id="octa-core" className="relative py-32 px-6 overflow-hidden">
      <div className="absolute inset-0 neural-grid opacity-30 pointer-events-none" />
      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="text-xs font-mono tracking-[0.3em] text-neon uppercase mb-4">The Octa-Core</div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Eight minds. <span className="text-neon">One consciousness.</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Each arm holds its own expertise, synchronized with a central intelligence known as Octa-Core.
          </p>
        </div>

        <div className="relative mx-auto aspect-square max-w-[720px]">
          {/* Orbit rings */}
          <div className="absolute inset-0 rounded-full border border-neon/20 animate-orbit" />
          <div className="absolute inset-8 rounded-full border border-neon/10" style={{ animation: "orbit 60s linear infinite reverse" }} />
          <div className="absolute inset-16 rounded-full border border-neon/10 animate-orbit" style={{ animationDuration: "80s" }} />

          {/* Center mascot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-3xl bg-neon/40 animate-pulse-neon" />
              <img src={mascot} alt="Octa-Core" className="relative w-48 md:w-64 animate-float drop-shadow-[0_0_40px_oklch(0.86_0.28_138_/_0.6)]" />
            </div>
          </div>

          {/* 8 arms positioned around */}
          {MINDS.map((m, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            const r = 46; // percent radius
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <div
                key={m.name}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="glass rounded-xl px-4 py-3 w-40 text-center hover:border-neon/60 hover:-translate-y-1 transition-all duration-300 hover:glow-neon cursor-default">
                  <div className="text-xs font-mono tracking-widest text-neon uppercase">0{i + 1}</div>
                  <div className="font-semibold mt-0.5">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{m.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
