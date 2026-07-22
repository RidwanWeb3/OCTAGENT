import { createFileRoute } from "@tanstack/react-router";

const COINS = "bitcoin,ethereum,solana,binancecoin,ripple,dogecoin,cardano,avalanche-2,chainlink,polkadot";

export const Route = createFileRoute("/api/crypto-market")({
  server: {
    handlers: {
      GET: async () => {
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`;

        try {
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            return new Response(`CoinGecko ${response.status}`, { status: response.status });
          }

          const data = await response.json();
          return Response.json(data, {
            headers: {
              "Cache-Control": "public, max-age=45",
            },
          });
        } catch {
          return new Response("CoinGecko unavailable", { status: 502 });
        }
      },
    },
  },
});
