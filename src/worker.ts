export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // --- API Health ---
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, app: env.APP_NAME || "HelixNotes Cloud" });
    }

    // --- R2 File API ---
    if (url.pathname.startsWith("/api/file/")) {
      const key = url.pathname.replace("/api/file/", "");
      if (request.method === "GET") {
        const obj = await env.VAULT.get(key);
        if (!obj) return new Response("Not found", { status: 404 });
        return new Response(obj.body, {
          headers: { "Content-Type": obj.httpMetadata?.contentType || "text/markdown" }
        });
      }
      if (request.method === "PUT") {
        await env.VAULT.put(key, await request.arrayBuffer());
        return Response.json({ ok: true, key });
      }
      if (request.method === "DELETE") {
        await env.VAULT.delete(key);
        return Response.json({ ok: true });
      }
    }

    // --- List files ---
    if (url.pathname === "/api/files") {
      const listed = await env.VAULT.list();
      return Response.json(listed.objects.map((o: any) => o.key));
    }

    // --- KV Settings API ---
    if (url.pathname.startsWith("/api/settings/")) {
      const key = url.pathname.replace("/api/settings/", "");
      if (request.method === "GET") {
        const val = await env.SETTINGS.get(key);
        return Response.json({ key, value: val });
      }
      if (request.method === "PUT") {
        const value = await request.text();
        await env.SETTINGS.put(key, value);
        return Response.json({ ok: true });
      }
    }

    // Fallback to frontend static files from ./build
    return (env.ASSETS as any).fetch(request);
  }
} as any;
