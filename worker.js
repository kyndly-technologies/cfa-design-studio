// Simple KV-backed annotation store for Deno Deploy / Cloudflare Workers
// For now, deploy as a simple in-memory store on any free host

let annotations = {};

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/annotations' && request.method === 'GET') {
      // Try KV first, fall back to memory
      let data = annotations;
      if (env?.ANNOTATIONS) {
        const stored = await env.ANNOTATIONS.get('data');
        if (stored) data = JSON.parse(stored);
      }
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/annotations' && request.method === 'PUT') {
      const body = await request.json();
      annotations = body;
      if (env?.ANNOTATIONS) {
        await env.ANNOTATIONS.put('data', JSON.stringify(body));
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('not found', { status: 404, headers: corsHeaders });
  }
};
