import { createFileRoute } from "@tanstack/react-router";
import { OCTA_CORE_SYSTEM, CHAT_MODEL } from "@/lib/octa-core";

export const Route = createFileRoute("/api/ai-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, context } = (await request.json()) as { prompt: string; context?: string };
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: [
              { role: "system", content: OCTA_CORE_SYSTEM },
              { role: "user", content: context ? `Data context:\n\`\`\`json\n${context}\n\`\`\`\n\n${prompt}` : prompt },
            ],
          }),
        });
        if (!r.ok) return new Response(await r.text(), { status: r.status });
        const j = await r.json() as any;
        return Response.json({ text: j.choices?.[0]?.message?.content ?? "" });
      },
    },
  },
});
