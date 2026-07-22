import { createFileRoute } from "@tanstack/react-router";

// Uses DexScreener (free, no key) — accepts token address or symbol/name.
export const Route = createFileRoute("/api/crypto/$query")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const q = params.query;
        const j = async (u: string) => fetch(u, { headers: { Accept: "application/json" } }).then(r => r.ok ? r.json() : null).catch(() => null);

        // Try token address endpoint first, fall back to search.
        const isAddr = /^(0x[a-fA-F0-9]{40}|[A-Za-z0-9]{32,44})$/.test(q);
        const primary = isAddr
          ? await j(`https://api.dexscreener.com/latest/dex/tokens/${q}`)
          : await j(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);

        const pairs: any[] = (primary?.pairs ?? []).slice(0, 8);
        const top = pairs[0] ?? null;

        return Response.json({ query: q, top, pairs });
      },
    },
  },
});
