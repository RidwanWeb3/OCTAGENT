import { createFileRoute } from "@tanstack/react-router";
import { CHAT_MODEL, OCTA_CORE_SYSTEM } from "@/lib/octa-core";
import { z } from "zod";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const CHAT_MAX_TOKENS = 2048;
const MEM0_URL = "https://api.mem0.ai/v1";

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

async function fetchJson(u: string): Promise<unknown> {
  const r = await fetch(u, { headers: { Accept: "application/json" } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

async function resolveDexData(query: string) {
  const fromUrl = parseDexPairFromUrl(query);
  const isAddr = /^(0x[a-fA-F0-9]{40}|[A-Za-z0-9]{32,44})$/.test(query);

  const raw = fromUrl
    ? await fetchJson(`https://api.dexscreener.com/latest/dex/pairs/${fromUrl.chainId}/${fromUrl.pairAddress}`)
    : isAddr
      ? await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${query}`)
      : await fetchJson(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`);

  const parsed = DexResponseSchema.safeParse(raw);
  const pairs = parsed.success ? (parsed.data.pairs ?? []) : [];
  const top = pairs[0] ?? null;
  return { top, pairs };
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

  const profileRow = Array.isArray(profile) ? profile[0] : null;
  const metricsRow = Array.isArray(metrics) ? metrics[0] : null;
  const newsArr = Array.isArray(news) ? news.slice(0, 6) : [];
  const history = z
    .object({ historical: z.array(z.unknown()).optional() })
    .safeParse(candles).success
    ? (candles as { historical?: unknown[] }).historical?.slice(0, 90).reverse() ?? []
    : [];

  return {
    symbol,
    data: {
      symbol,
      quote,
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
    const j = (await r.json()) as any;
    const arr = Array.isArray(j) ? j : j.results ?? [];
    return arr.map((m: any) => m.memory ?? m.text).filter(Boolean);
  } catch { return []; }
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
          const { top, pairs } = await resolveDexData(cmd.query);
          if (!top) return new Response("Crypto lookup failed (DexScreener returned no pairs).", { status: 404 });
          const compact = {
            query: cmd.query,
            top,
            pairs: pairs.slice(0, 5),
          };
          const sources = [
            top.url ? `[1] ${top.url}` : "[1] DexScreener pair URL not provided",
            top.baseToken?.address && top.chainId ? `[2] https://dexscreener.com/${top.chainId}/${top.baseToken.address}` : "[2] Token contract URL not provided",
          ].join("\n");
          system += `\n\nMode: Crypto Analysis\n\nSources:\n${sources}\n\nData context:\n\`\`\`json\n${JSON.stringify(compact)}\n\`\`\`\n\nWrite a tight institutional brief. Do not invent live prices beyond the context. Cite claims as [1] or [2].`;
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
          system += `\n\nMode: Stock Analysis\n\nSources:\n${sources}\n\nData context:\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\`\n\nWrite a concise institutional equity brief. Do not invent metrics beyond the context. Cite claims as [1] or [2].`;
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
