import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/tavily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { query } = (await request.json()) as { query: string };
        const key = process.env.TAVILY_API_KEY;
        if (!key) return new Response("Missing TAVILY_API_KEY", { status: 500 });
        if (!query?.trim()) return Response.json({ results: [] });

        const r = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: key,
            query,
            search_depth: "advanced",
            include_answer: true,
            max_results: 10,
            topic: "general",
          }),
        });
        if (!r.ok) return new Response(await r.text(), { status: r.status });
        return Response.json(await r.json());
      },
    },
  },
});
