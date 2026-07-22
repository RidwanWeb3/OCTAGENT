import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stock/$symbol")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const symbol = params.symbol.toUpperCase();
        const finnhub = process.env.FINNHUB_API_KEY;
        const fmp = process.env.FMP_API_KEY;
        if (!finnhub || !fmp) return new Response("Missing keys", { status: 500 });

        const j = async (u: string) => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);

        const [quote, profile, metrics, news, candles] = await Promise.all([
          j(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhub}`),
          j(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${fmp}`),
          j(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${fmp}`),
          j(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${new Date(Date.now()-7*864e5).toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&token=${finnhub}`),
          j(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&timeseries=90&apikey=${fmp}`),
        ]);

        return Response.json({
          symbol,
          quote,
          profile: Array.isArray(profile) ? profile[0] : null,
          metrics: Array.isArray(metrics) ? metrics[0] : null,
          news: Array.isArray(news) ? news.slice(0, 6) : [],
          history: (candles as any)?.historical?.slice(0, 90).reverse() ?? [],
        });
      },
    },
  },
});
