import { createFileRoute } from "@tanstack/react-router";
import { OCTA_CORE_SYSTEM } from "@/lib/octa-core";

type Msg = { role: "system" | "user" | "assistant"; content: string };

const OR_MODEL = "google/gemini-2.0-flash-exp:free";
const MEM0_URL = "https://api.mem0.ai/v1";

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

        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${orKey}`,
            "HTTP-Referer": "https://octagen.lovable.app",
            "X-Title": "OCTAGEN",
          },
          body: JSON.stringify({
            model: OR_MODEL,
            stream: true,
            messages: [{ role: "system", content: OCTA_CORE_SYSTEM + memoryBlock }, ...messages],
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
