import { createFileRoute } from "@tanstack/react-router";
import { OCTA_CORE_SYSTEM } from "@/lib/octa-core";

const OR_MODEL = "google/gemini-2.0-flash-exp:free";

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
            model: OR_MODEL,
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
