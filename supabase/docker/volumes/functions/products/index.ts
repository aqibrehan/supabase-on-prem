// Supabase Edge Function: products
// Connects to the on-premises PostgreSQL via Supabase PostgREST
// Endpoint: http://localhost:8000/functions/v1/products

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client — connects to local PostgREST → on-prem PostgreSQL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "http://kong:8000";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const method = req.method;

    // ─── GET /products — List all products with pagination ───
    if (method === "GET") {
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const pageSize = parseInt(url.searchParams.get("page_size") ?? "20");
      const search = url.searchParams.get("search");
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({
          items: data,
          total: count,
          page,
          page_size: pageSize,
          total_pages: Math.ceil((count ?? 0) / pageSize),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ─── POST /products — Create a product ───
    if (method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: body.name,
          description: body.description ?? null,
          price: body.price,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PATCH /products?id=<uuid> — Update a product ───
    if (method === "PATCH") {
      const id = url.searchParams.get("id");
      if (!id) throw new Error("Missing product id");

      const body = await req.json();
      const { data, error } = await supabase
        .from("products")
        .update(body)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DELETE /products?id=<uuid> — Delete a product ───
    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) throw new Error("Missing product id");

      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;

      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
