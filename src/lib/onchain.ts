type JsonRpcOk = { ok: true; result: unknown };
type JsonRpcErr = { ok: false; error: string; status?: number };

function toHex(n: number) {
  return `0x${n.toString(16)}`;
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ac.signal });
  } finally {
    clearTimeout(id);
  }
}

async function jsonRpc(url: string, method: string, params: unknown[], timeoutMs = 9000): Promise<JsonRpcOk | JsonRpcErr> {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body,
      },
      timeoutMs,
    );
  } catch (e) {
    return { ok: false, error: (e as Error).message || "RPC network error" };
  }

  if (!res.ok) return { ok: false, error: `RPC ${res.status}`, status: res.status };

  const json = (await res.json().catch(() => null)) as unknown;
  if (!json || typeof json !== "object") return { ok: false, error: "RPC invalid JSON" };

  const obj = json as { result?: unknown; error?: unknown };
  if (obj.error) {
    const msg =
      typeof obj.error === "string"
        ? obj.error
        : typeof obj.error === "object" && obj.error && "message" in obj.error
          ? String((obj.error as { message?: unknown }).message)
          : "RPC error";
    return { ok: false, error: msg };
  }

  return { ok: true, result: obj.result };
}

function strip0x(h: string) {
  return h.startsWith("0x") ? h.slice(2) : h;
}

function hexToBytes(hex: string) {
  const h = strip0x(hex);
  if (h.length % 2 !== 0) return null;
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) {
    const b = Number.parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (!Number.isFinite(b)) return null;
    out[i] = b;
  }
  return out;
}

function bytesToAscii(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) {
    if (b === 0) break;
    if (b >= 32 && b <= 126) s += String.fromCharCode(b);
  }
  return s.trim();
}

function decodeUint256(hex: string) {
  const h = strip0x(hex);
  if (!h) return null;
  try {
    return BigInt(`0x${h}`);
  } catch {
    return null;
  }
}

function decodeString(hex: string) {
  const h = strip0x(hex);
  if (h.length === 64) {
    const b = hexToBytes(`0x${h}`);
    return b ? bytesToAscii(b) : null;
  }

  if (h.length < 128) return null;
  const offset = decodeUint256(`0x${h.slice(0, 64)}`);
  if (offset === null) return null;
  const o = Number(offset);
  const start = o * 2;
  if (!Number.isFinite(start) || start + 64 > h.length) return null;
  const len = decodeUint256(`0x${h.slice(start, start + 64)}`);
  if (len === null) return null;
  const l = Number(len);
  const dataStart = start + 64;
  const dataEnd = dataStart + l * 2;
  if (!Number.isFinite(l) || dataEnd > h.length) return null;
  const b = hexToBytes(`0x${h.slice(dataStart, dataEnd)}`);
  return b ? bytesToAscii(b) : null;
}

const DEFAULT_RPCS: Record<string, string> = {
  ethereum: "https://cloudflare-eth.com",
  bsc: "https://bsc-dataseed.binance.org",
  polygon: "https://polygon-rpc.com",
  base: "https://mainnet.base.org",
  arbitrum: "https://arb1.arbitrum.io/rpc",
  optimism: "https://mainnet.optimism.io",
  avalanche: "https://api.avax.network/ext/bc/C/rpc",
  solana: "https://api.mainnet-beta.solana.com",
};

export type EvmTokenOnchain = {
  chain: string;
  address: string;
  rpc: string;
  contractCodePresent: boolean;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  totalSupplyRaw: string | null;
};

export type SolanaTokenOnchain = {
  chain: "solana";
  mint: string;
  rpc: string;
  decimals: number | null;
  supplyRaw: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  largestAccounts: { address: string; amountRaw: string }[];
};

export type TokenOnchain = EvmTokenOnchain | SolanaTokenOnchain;

function getRpc(chain: string) {
  const key = `RPC_${chain.toUpperCase()}_URL`;
  const fromEnv = process.env[key];
  return (typeof fromEnv === "string" && fromEnv.trim() ? fromEnv.trim() : null) ?? DEFAULT_RPCS[chain] ?? null;
}

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
} as const;

async function evmCall(rpc: string, to: string, data: string): Promise<string | null> {
  const r = await jsonRpc(rpc, "eth_call", [{ to, data }, "latest"]);
  if (!r.ok) return null;
  return typeof r.result === "string" ? r.result : null;
}

export async function analyzeEvmErc20(chain: string, address: string): Promise<TokenOnchain | null> {
  const rpc = getRpc(chain);
  if (!rpc) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;

  const code = await jsonRpc(rpc, "eth_getCode", [address, "latest"]);
  const codeHex = code.ok && typeof code.result === "string" ? code.result : null;
  const hasCode = !!codeHex && strip0x(codeHex).length > 0;

  const [nameHex, symbolHex, decimalsHex, supplyHex] = await Promise.all([
    evmCall(rpc, address, SELECTORS.name),
    evmCall(rpc, address, SELECTORS.symbol),
    evmCall(rpc, address, SELECTORS.decimals),
    evmCall(rpc, address, SELECTORS.totalSupply),
  ]);

  const name = nameHex ? decodeString(nameHex) : null;
  const symbol = symbolHex ? decodeString(symbolHex) : null;
  const decimals = decimalsHex ? decodeUint256(decimalsHex) : null;
  const totalSupply = supplyHex ? decodeUint256(supplyHex) : null;

  return {
    chain,
    address,
    rpc,
    contractCodePresent: hasCode,
    name,
    symbol,
    decimals: decimals === null ? null : Number(decimals),
    totalSupplyRaw: totalSupply === null ? null : totalSupply.toString(),
  };
}

export async function analyzeSolanaMint(mint: string): Promise<TokenOnchain | null> {
  const rpc = getRpc("solana");
  if (!rpc) return null;
  const isMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);
  if (!isMint) return null;

  const supplyRes = await jsonRpc(rpc, "getTokenSupply", [mint]);
  const supplyObj =
    supplyRes.ok && supplyRes.result && typeof supplyRes.result === "object"
      ? (supplyRes.result as { value?: unknown }).value
      : null;
  const supplyValue =
    supplyObj && typeof supplyObj === "object"
      ? (supplyObj as { amount?: unknown; decimals?: unknown }).amount
      : null;
  const decimalsValue =
    supplyObj && typeof supplyObj === "object"
      ? (supplyObj as { amount?: unknown; decimals?: unknown }).decimals
      : null;

  const accRes = await jsonRpc(rpc, "getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const parsed =
    accRes.ok && accRes.result && typeof accRes.result === "object"
      ? (accRes.result as { value?: unknown }).value
      : null;
  const dataParsed =
    parsed && typeof parsed === "object"
      ? (parsed as { data?: unknown }).data
      : null;
  const mintInfo =
    dataParsed && typeof dataParsed === "object"
      ? (dataParsed as { parsed?: unknown }).parsed
      : null;
  const info =
    mintInfo && typeof mintInfo === "object"
      ? (mintInfo as { info?: unknown }).info
      : null;

  const mintAuthority =
    info && typeof info === "object" && "mintAuthority" in info ? (info as { mintAuthority?: unknown }).mintAuthority : null;
  const freezeAuthority =
    info && typeof info === "object" && "freezeAuthority" in info ? (info as { freezeAuthority?: unknown }).freezeAuthority : null;

  const largestRes = await jsonRpc(rpc, "getTokenLargestAccounts", [mint]);
  const largestValue =
    largestRes.ok && largestRes.result && typeof largestRes.result === "object"
      ? (largestRes.result as { value?: unknown }).value
      : null;
  const largest =
    Array.isArray(largestValue)
      ? largestValue
          .slice(0, 8)
          .map((x) => ({
            address: typeof x === "object" && x && "address" in x ? String((x as { address?: unknown }).address) : "",
            amountRaw: typeof x === "object" && x && "amount" in x ? String((x as { amount?: unknown }).amount) : "",
          }))
          .filter((x) => x.address && x.amountRaw)
      : [];

  return {
    chain: "solana",
    mint,
    rpc,
    decimals: typeof decimalsValue === "number" ? decimalsValue : null,
    supplyRaw: typeof supplyValue === "string" ? supplyValue : null,
    mintAuthority: typeof mintAuthority === "string" ? mintAuthority : null,
    freezeAuthority: typeof freezeAuthority === "string" ? freezeAuthority : null,
    largestAccounts: largest,
  };
}

