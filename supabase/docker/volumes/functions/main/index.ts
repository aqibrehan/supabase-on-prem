import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const { pathname } = url;

  // Route to the correct function
  if (pathname.startsWith("/products")) {
    const module = await import("../products/index.ts");
    return module.default(req);
  }

  return new Response(
    JSON.stringify({
      message: "Supabase Edge Functions running",
      available: ["/products"],
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
});
