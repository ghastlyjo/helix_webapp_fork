export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- API Health ---
    if (url.pathname === "/api/health") {
      return new Response(JSON.stringify({ ok: true, app: env.APP_NAME || "HelixNotes Cloud" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- List files from R2 ---
    if (url.pathname === "/api/files") {
      try {
        const prefix = url.searchParams.get("prefix") || "";
        const listed = await env.VAULT.list({ prefix });
        const keys = listed.objects.map((o: any) => o.key);
        return new Response(JSON.stringify(keys), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      } catch (e: any) {
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // --- R2 File API: /api/file/{key} ---
    if (url.pathname.startsWith("/api/file/")) {
      const key = decodeURIComponent(url.pathname.replace("/api/file/", ""));
      try {
        if (request.method === "GET") {
          const obj = await env.VAULT.get(key);
          if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders });
          return new Response(obj.body, {
            headers: {
              "Content-Type": obj.httpMetadata?.contentType || "text/markdown",
              ...corsHeaders,
            },
          });
        }
        if (request.method === "PUT" || request.method === "POST") {
          await env.VAULT.put(key, await request.arrayBuffer());
          return new Response(JSON.stringify({ ok: true, key }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (request.method === "DELETE") {
          await env.VAULT.delete(key);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // --- KV Settings API ---
    if (url.pathname.startsWith("/api/settings/")) {
      const key = url.pathname.replace("/api/settings/", "");
      try {
        if (request.method === "GET") {
          const val = await env.SETTINGS.get(key);
          return new Response(JSON.stringify({ key, value: val ? JSON.parse(val) : null }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        if (request.method === "PUT" || request.method === "POST") {
          const value = await request.text();
          await env.SETTINGS.put(key, value);
          return new Response(JSON.stringify({ ok: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // --- Frontend static files (SPA fallback) ---
    try {
      let response = await env.ASSETS.fetch(request);
      // If 404 and it's a page navigation, serve index.html
      if (response.status === 404 && request.headers.get("Accept")?.includes("text/html")) {
        const indexUrl = new URL(request.url);
        indexUrl.pathname = "/index.html";
        response = await env.ASSETS.fetch(new Request(indexUrl, request));
      }
      return response;
    } catch {
      // Fallback to index.html
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }
  },
} as any;
