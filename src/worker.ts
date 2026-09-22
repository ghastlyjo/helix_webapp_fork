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
        return new Response(obj.body);
      }
      if (request.method === "PUT") {
        await env.VAULT.put(key, request.body);
        return Response.json({ ok: true });
      }
      if (request.method === "DELETE") {
        await env.VAULT.delete(key);
        return Response.json({ ok: true });
      }
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

    // أي شي ثاني -> خليه يجيب ملفات الـ Frontend من مجلد build
    return env.ASSETS.fetch(request);
  }
} as any;
