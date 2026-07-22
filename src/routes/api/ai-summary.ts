import { createFileRoute } from "@tanstack/react-router";
import { CHAT_MODEL, OCTA_CORE_SYSTEM } from "@/lib/octa-core";

const SUMMARY_MAX_TOKENS = 1200;

export const Route = createFileRoute("/api/ai-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, context, citations } = (await request.json()) as {
          prompt: string; context?: string; citations?: { label: string; url?: string }[];
        };
        const key = process.env.OPENROUTER_API_KEY;
        if (!key) return new Response("Missing OPENROUTER_API_KEY", { status: 500 });

        const citeBlock = citations?.length
          ? `\n\nData sources (cite by [n]):\n${citations.map((c, i) => `[${i + 1}] ${c.label}${c.url ? ` — ${c.url}` : ""}`).join("\n")}`
          : "";

        const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": "https://octagen.lovable.app",
            "X-Title": "OCTAGEN",
          },
          body: JSON.stringify({
            model: CHAT_MODEL,
            max_tokens: SUMMARY_MAX_TOKENS,
            messages: [
              { role: "system", content: OCTA_CORE_SYSTEM },
              { role: "user", content: (context ? `Data context:\n\`\`\`json\n${context}\n\`\`\`\n\n` : "") + prompt + citeBlock },
            ],
          }),
        });
        if (!r.ok) return new Response(await r.text(), { status: r.status });
        const j = (await r.json()) as any;
        return Response.json({ text: j.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
