import { createFileRoute } from "@tanstack/react-router";
import { CHAT_MODEL, OCTA_CORE_SYSTEM } from "@/lib/octa-core";
import { analyzeEvmErc20, analyzeSolanaMint, type TokenOnchain } from "@/lib/onchain";
import { z } from "zod";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const CHAT_MAX_TOKENS = 2048;
const MEM0_URL = "https://api.mem0.ai/v1";

type FetchJsonOk = { ok: true; data: unknown; status: number };
type FetchJsonErr = { ok: false; error: string; status?: number };
type FetchJsonResult = FetchJsonOk | FetchJsonErr;

async function fetchJson(u: string, timeoutMs = 9000): Promise<FetchJsonResult> {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(u, { headers: { Accept: "application/json" }, signal: ac.signal });
    const status = r.status;
    if (!r.ok) return { ok: false, error: `HTTP ${status}`, status };
    const data = await r.json().catch(() => null);
    if (data === null) return { ok: false, error: "Invalid JSON", status };
    return { ok: true, data, status };
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Network error" };
  } finally {
    clearTimeout(id);
  }
}

const DexPairSchema = z.object({
  chainId: z.string().optional(),
  dexId: z.string().optional(),
  url: z.string().optional(),
  pairAddress: z.string().optional(),
  pairCreatedAt: z.number().optional(),
  priceUsd: z.string().optional(),
  baseToken: z
    .object({
      address: z.string().optional(),
      name: z.string().optional(),
      symbol: z.string().optional(),
    })
    .optional(),
  liquidity: z
    .object({
      usd: z.number().optional(),
    })
    .optional(),
  volume: z
    .object({
      h24: z.number().optional(),
    })
    .optional(),
  txns: z
    .object({
      h24: z
        .object({
          buys: z.number().optional(),
          sells: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
  priceChange: z
    .object({
      m5: z.number().optional(),
      h1: z.number().optional(),
      h6: z.number().optional(),
      h24: z.number().optional(),
    })
    .optional(),
  fdv: z.number().optional(),
  marketCap: z.number().optional(),
});

const DexResponseSchema = z.object({ pairs: z.array(DexPairSchema).optional() });

const CoinGeckoSearchSchema = z.object({
  coins: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        symbol: z.string().optional(),
        market_cap_rank: z.number().nullable().optional(),
      }),
    )
    .optional(),
});

const CoinGeckoMarketSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string().optional(),
    name: z.string().optional(),
    current_price: z.number().optional(),
    market_cap: z.number().optional(),
    total_volume: z.number().optional(),
    price_change_percentage_24h: z.number().nullable().optional(),
    sparkline_in_7d: z.object({ price: z.array(z.number()).optional() }).optional(),
  }),
);

const CoinGeckoTickersSchema = z.object({
  tickers: z
    .array(
      z.object({
        market: z
          .object({
            name: z.string().optional(),
            identifier: z.string().optional(),
          })
          .optional(),
        base: z.string().optional(),
        target: z.string().optional(),
        volume: z.number().nullable().optional(),
        trust_score: z.string().nullable().optional(),
        last: z.number().nullable().optional(),
        is_anomaly: z.boolean().optional(),
        is_stale: z.boolean().optional(),
        trade_url: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

const CoinGeckoCoinSchema = z.object({
  id: z.string(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  platforms: z.record(z.string()).optional(),
  links: z
    .object({
      homepage: z.array(z.string()).optional(),
      twitter_screen_name: z.string().optional(),
    })
    .optional(),
});

function parseDexPairFromUrl(raw: string): { chainId: string; pairAddress: string } | null {
  try {
    const u = new URL(raw);
    if (!u.hostname.includes("dexscreener.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    return { chainId: parts[0] ?? "", pairAddress: parts[1] ?? "" };
  } catch {
    return null;
  }
}

function parseCommand(raw: string): { kind: "crypto" | "stock"; query: string } | null {
  const t = raw.trim();
  const m = t.match(/^\/(crypto|stock)\s+(.+)$/i);
  if (!m) return null;
  const kind = m[1]?.toLowerCase() === "stock" ? "stock" : "crypto";
  const query = (m[2] ?? "").trim();
  if (!query) return null;
  return { kind, query };
}

function parseCoinGeckoIdFromUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (!u.hostname.includes("coingecko.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "coins");
    const id = idx >= 0 ? parts[idx + 1] : null;
    return id && /^[a-z0-9-]+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function resolveDexData(query: string) {
  const fromUrl = parseDexPairFromUrl(query);
  const isAddr = /^(0x[a-fA-F0-9]{40}|[A-Za-z0-9]{32,44})$/.test(query);

  const rawRes = fromUrl
    ? await fetchJson(`https://api.dexscreener.com/latest/dex/pairs/${fromUrl.chainId}/${fromUrl.pairAddress}`)
    : isAddr
      ? await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${query}`)
      : await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);

  const parsed = DexResponseSchema.safeParse(rawRes.ok ? rawRes.data : null);
  const pairs = parsed.success ? (parsed.data.pairs ?? []) : [];
  const top = pairs[0] ?? null;
  return { top, pairs, error: rawRes.ok ? null : rawRes.error };
}

type CoinGeckoResolved = {
  coin: { id: string; name: string | null; symbol: string | null } | null;
  market: unknown | null;
  tickers: unknown | null;
  coinMeta: z.infer<typeof CoinGeckoCoinSchema> | null;
  error: string | null;
};

function mapCoinGeckoPlatformToChain(platform: string) {
  const p = platform.toLowerCase();
  if (p === "ethereum") return "ethereum";
  if (p === "solana") return "solana";
  if (p === "base") return "base";
  if (p === "polygon-pos") return "polygon";
  if (p === "binance-smart-chain") return "bsc";
  if (p === "arbitrum-one") return "arbitrum";
  if (p === "optimistic-ethereum") return "optimism";
  if (p === "avalanche") return "avalanche";
  return null;
}

async function resolveCoinGecko(query: string): Promise<CoinGeckoResolved> {
  const idFromUrl = parseCoinGeckoIdFromUrl(query);
  const searchQ = idFromUrl ?? query.trim();
  if (!searchQ) return { coin: null, market: null, tickers: null, coinMeta: null, error: "Empty query" };

  const searchRes = await fetchJson(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQ)}`);
  if (!searchRes.ok) return { coin: null, market: null, tickers: null, coinMeta: null, error: `CoinGecko search: ${searchRes.error}` };

  const searchParsed = CoinGeckoSearchSchema.safeParse(searchRes.data);
  const coins = searchParsed.success ? (searchParsed.data.coins ?? []) : [];
  const best = coins[0] ?? null;
  const coinId = idFromUrl ?? best?.id ?? null;
  if (!coinId) return { coin: null, market: null, tickers: null, coinMeta: null, error: "CoinGecko search returned no matches" };

  const [marketRes, tickersRes, coinRes] = await Promise.all([
    fetchJson(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coinId)}&sparkline=true&price_change_percentage=24h`,
    ),
    fetchJson(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/tickers?order=volume_desc&page=1`),
    fetchJson(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
        coinId,
      )}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,
    ),
  ]);

  const marketParsed = marketRes.ok ? CoinGeckoMarketSchema.safeParse(marketRes.data) : null;
  const market = marketParsed?.success ? marketParsed.data[0] ?? null : null;

  const tickersParsed = tickersRes.ok ? CoinGeckoTickersSchema.safeParse(tickersRes.data) : null;
  const tickers = tickersParsed?.success ? { tickers: (tickersParsed.data.tickers ?? []).slice(0, 10) } : null;

  const coinParsed = coinRes.ok ? CoinGeckoCoinSchema.safeParse(coinRes.data) : null;
  const coinMeta = coinParsed?.success ? coinParsed.data : null;

  return {
    coin: { id: coinId, name: best?.name ?? null, symbol: best?.symbol ?? null },
    market,
    tickers,
    coinMeta,
    error: null,
  };
}

function inferOnchainTargetFromDex(top: z.infer<typeof DexPairSchema> | null) {
  const chain = top?.chainId?.toLowerCase() ?? null;
  const address = top?.baseToken?.address ?? null;
  if (!chain || !address) return null;
  return { chain, address };
}

function inferOnchainTargetFromCoinGecko(coinMeta: z.infer<typeof CoinGeckoCoinSchema> | null) {
  const platforms = coinMeta?.platforms ?? {};
  const entries = Object.entries(platforms).filter(([, addr]) => typeof addr === "string" && addr.trim());
  for (const [platform, addr] of entries) {
    const chain = mapCoinGeckoPlatformToChain(platform);
    if (!chain) continue;
    return { chain, address: addr };
  }
  return null;
}

async function resolveOnchain(
  dexTop: z.infer<typeof DexPairSchema> | null,
  coinMeta: z.infer<typeof CoinGeckoCoinSchema> | null,
): Promise<{ onchain: TokenOnchain | null; error: string | null }> {
  const fromDex = inferOnchainTargetFromDex(dexTop);
  const fromCg = inferOnchainTargetFromCoinGecko(coinMeta);
  const target = fromDex ?? fromCg;
  if (!target) return { onchain: null, error: "No on-chain address found from DexScreener or CoinGecko" };

  if (target.chain === "solana") {
    const r = await analyzeSolanaMint(target.address);
    return r ? { onchain: r, error: null } : { onchain: null, error: "Solana RPC lookup failed" };
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(target.address)) {
    const r = await analyzeEvmErc20(target.chain, target.address);
    return r ? { onchain: r, error: null } : { onchain: null, error: `EVM RPC lookup failed for chain ${target.chain}` };
  }

  return { onchain: null, error: `Unsupported on-chain address format for chain ${target.chain}` };
}

async function resolveStockData(symbolRaw: string) {
  const symbol = symbolRaw.trim().toUpperCase();
  const finnhub = process.env.FINNHUB_API_KEY;
  const fmp = process.env.FMP_API_KEY;
  if (!finnhub || !fmp) return { symbol, data: null as unknown, error: "Missing market data keys" };

  const from = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);

  const [quote, profile, metrics, news, candles] = await Promise.all([
    fetchJson(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhub}`),
    fetchJson(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${fmp}`),
    fetchJson(`https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${fmp}`),
    fetchJson(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhub}`),
    fetchJson(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?serietype=line&timeseries=90&apikey=${fmp}`),
  ]);

  const profileData = profile.ok ? profile.data : null;
  const metricsData = metrics.ok ? metrics.data : null;
  const newsData = news.ok ? news.data : null;
  const candlesData = candles.ok ? candles.data : null;

  const profileRow = Array.isArray(profileData) ? profileData[0] : null;
  const metricsRow = Array.isArray(metricsData) ? metricsData[0] : null;
  const newsArr = Array.isArray(newsData) ? newsData.slice(0, 6) : [];
  const history = z
    .object({ historical: z.array(z.unknown()).optional() })
    .safeParse(candlesData).success
    ? (candlesData as { historical?: unknown[] }).historical?.slice(0, 90).reverse() ?? []
    : [];

  return {
    symbol,
    data: {
      symbol,
      quote: quote.ok ? quote.data : null,
      profile: profileRow,
      metrics: metricsRow,
      news: newsArr,
      history,
    },
    error: null as string | null,
  };
}

async function mem0Search(userId: string, query: string, key: string) {
  try {
    const r = await fetch(`${MEM0_URL}/memories/search/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${key}` },
      body: JSON.stringify({ query, user_id: userId, limit: 5 }),
    });
    if (!r.ok) return [];
    const j = (await r.json().catch(() => null)) as unknown;
    const ItemSchema = z.object({ memory: z.string().optional(), text: z.string().optional() });
    const ResSchema = z.union([z.array(ItemSchema), z.object({ results: z.array(ItemSchema).optional() })]);
    const parsed = ResSchema.safeParse(j);
    if (!parsed.success) return [];
    const arr = Array.isArray(parsed.data) ? parsed.data : parsed.data.results ?? [];
    return arr.map((m) => m.memory ?? m.text).filter((x): x is string => typeof x === "string" && !!x.trim());
  } catch {
    return [];
  }
}

async function mem0Add(userId: string, messages: Msg[], key: string) {
  try {
    await fetch(`${MEM0_URL}/memories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${key}` },
      body: JSON.stringify({ messages, user_id: userId, metadata: { source: "octagen-terminal" } }),
    });
  } catch { /* non-blocking */ }
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as { messages: Msg[] };
        const orKey = process.env.OPENROUTER_API_KEY;
        const mem0Key = process.env.MEM0_API_KEY;
        if (!orKey) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

        const userId = request.headers.get("x-octagen-user") || "";
        const lastUser = [...messages].reverse().find(m => m.role === "user")?.content ?? "";

        let memoryBlock = "";
        if (userId && mem0Key && lastUser) {
          const mems = await mem0Search(userId, lastUser, mem0Key);
          if (mems.length) memoryBlock = `\n\nRelevant memories about this user:\n- ${mems.join("\n- ")}`;
        }

        const cmd = parseCommand(lastUser) ?? (parseDexPairFromUrl(lastUser) ? { kind: "crypto" as const, query: lastUser } : null);
        let system = OCTA_CORE_SYSTEM + memoryBlock;
        let effectiveMessages = messages;

        if (cmd?.kind === "crypto") {
          const [dex, cg] = await Promise.all([resolveDexData(cmd.query), resolveCoinGecko(cmd.query)]);
          const { onchain, error: onchainError } = await resolveOnchain(dex.top, cg.coinMeta);

          if (!dex.top && !cg.coin) {
            const reason = [dex.error ? `DexScreener: ${dex.error}` : null, cg.error ? `CoinGecko: ${cg.error}` : null]
              .filter((x): x is string => typeof x === "string" && !!x)
              .join(" | ");
            return new Response(`Crypto lookup failed. ${reason || "No matches."}`, { status: 404 });
          }

          const compact = {
            query: cmd.query,
            dexscreener: { top: dex.top, pairs: dex.pairs.slice(0, 5), error: dex.error },
            coingecko: {
              coin: cg.coin,
              market: cg.market,
              tickers: cg.tickers,
              links: cg.coinMeta
                ? {
                    homepage: (cg.coinMeta.links?.homepage ?? []).filter(Boolean).slice(0, 2),
                    twitter: cg.coinMeta.links?.twitter_screen_name ?? null,
                  }
                : null,
              error: cg.error,
            },
            onchain: { data: onchain, error: onchainError },
          };

          const sources = [
            dex.top?.url ? `[1] ${dex.top.url}` : "[1] DexScreener pair URL not provided",
            cg.coin?.id ? `[2] https://www.coingecko.com/en/coins/${cg.coin.id}` : "[2] CoinGecko coin URL not provided",
            onchain ? `[3] RPC (${onchain.chain === "solana" ? "solana" : onchain.chain}) ${onchain.rpc}` : "[3] RPC source not available",
          ].join("\n");

          system += `\n\nMode: Crypto Analysis\n\nSources:\n${sources}\n\nData context:\n\`\`\`json\n${JSON.stringify(compact)}\n\`\`\`\n\nWrite a deep institutional research brief with DEX + CEX coverage and an explicit on-chain health/risk section.\n\nAlso provide:\n1) Forecast/Outlook: scenario-based (bull/base/bear) for 7D/30D/90D with probability ranges and clear triggers. Never invent live prices beyond the context; express directional bias and conditional triggers when exact levels are unknown.\n2) Playbook: 3 concrete user actions (entry/avoid/monitor), position sizing guidance, and a risk checklist.\n\nCite claims as [1] (Dex), [2] (CoinGecko), or [3] (On-chain RPC).`;
          const normalized = cmd.query;
          effectiveMessages = messages.map((m, i) => {
            if (i !== messages.length - 1) return m;
            if (m.role !== "user") return m;
            return { ...m, content: `Analyze this token: ${normalized}` };
          });
        }

        if (cmd?.kind === "stock") {
          const { symbol, data, error } = await resolveStockData(cmd.query);
          if (error) return new Response(error, { status: 500 });
          if (!data) return new Response("Stock lookup failed.", { status: 404 });
          const sources = [
            `[1] https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}`,
            `[2] https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}`,
          ].join("\n");
          system += `\n\nMode: Stock Analysis\n\nSources:\n${sources}\n\nData context:\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\`\n\nWrite a concise institutional equity brief.\n\nAlso provide:\n1) Forecast/Outlook: scenario-based (bull/base/bear) for 1W/1M/3M with probability ranges and clear catalysts/triggers. Never invent metrics/prices beyond the context; use directional bias and conditional triggers when needed.\n2) Playbook: 3 concrete user actions, risk controls (position sizing, invalidation), and what to monitor next.\n\nCite claims as [1] or [2].`;
          effectiveMessages = messages.map((m, i) => {
            if (i !== messages.length - 1) return m;
            if (m.role !== "user") return m;
            return { ...m, content: `Analyze this stock: ${symbol}` };
          });
        }

        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${orKey}`,
            "HTTP-Referer": "https://octagen.lovable.app",
            "X-Title": "OCTAGEN",
          },
          body: JSON.stringify({
            model: CHAT_MODEL,
            max_tokens: CHAT_MAX_TOKENS,
            stream: true,
            messages: [{ role: "system", content: system }, ...effectiveMessages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Gateway error", { status: upstream.status });
        }

        // Persist to Mem0 async (fire-and-forget) after streaming starts.
        if (userId && mem0Key && lastUser) {
          mem0Add(userId, [{ role: "user", content: lastUser }], mem0Key);
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
