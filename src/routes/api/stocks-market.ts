import { createFileRoute } from "@tanstack/react-router";

const TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL", "AMZN", "META", "AMD", "NFLX", "COIN"];

export const Route = createFileRoute("/api/stocks-market")({
  server: {
    handlers: {
      GET: async () => {
        const finnhub = process.env.FINNHUB_API_KEY;
        if (!finnhub) return new Response("Missing FINNHUB_API_KEY", { status: 500 });
        const j = async (u: string) => fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null);

        const rows = await Promise.all(
          TICKERS.map(async (t) => {
            const [q, p] = await Promise.all([
              j(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${finnhub}`),
              j(`https://finnhub.io/api/v1/stock/profile2?symbol=${t}&token=${finnhub}`),
            ]);
            return { symbol: t, quote: q, profile: p };
          }),
        );
        return Response.json(
          { data: rows, ts: Date.now() },
          { headers: { "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
