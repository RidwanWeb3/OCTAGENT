import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { MarketTicker } from "@/components/MarketTicker";
import { MarketGrid } from "@/components/MarketGrid";
import { OctaCore } from "@/components/OctaCore";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Footer } from "@/components/Footer";
import banner from "@/assets/octagen-banner.jpg.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "OCTAGEN — The 8-Armed Autonomous AI Intelligence" },
      { name: "description", content: "OCTAGEN is a living AI operating system. Eight specialized minds, one consciousness — real-time market intelligence, autonomous strategy, and continuous execution." },
      { property: "og:title", content: "OCTAGEN — The 8-Armed Autonomous AI Intelligence" },
      { property: "og:description", content: "Eight minds. One consciousness. Infinite intelligence. Enter the OCTAGEN AI Operating System." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: banner.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OCTAGEN — The 8-Armed Autonomous AI Intelligence" },
      { name: "twitter:description", content: "Eight minds. One consciousness. Infinite intelligence." },
      { name: "twitter:image", content: banner.url },
    ],
  }),
});

function Index() {
  return (
    <div className="dark min-h-screen">
      <Nav />
      <main>
        <Hero />
        <MarketTicker />
        <MarketGrid />
        <OctaCore />
        <div id="minds" />
        <ActivityFeed />
        <section id="about" className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="text-xs font-mono tracking-[0.3em] text-neon uppercase mb-4">About</div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Not an assistant. <span className="text-neon">An intelligence.</span>
          </h2>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed">
            OCTAGEN is an autonomous intelligence composed of eight specialized minds operating simultaneously under a single consciousness — Octa-Core. Each arm holds its own domain: analysis, strategy, creation, execution, protection, empathy, discovery, and silent operation. Together they form a living AI operating system designed for developers, investors, traders, and researchers who work at the edge of what's possible.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
