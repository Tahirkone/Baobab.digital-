interface Env {
  VITE_TURNSTILE_SITE_KEY?: string;
}

interface PagesContext {
  env: Env;
}

export async function onRequestGet({ env }: PagesContext) {
  return new Response(JSON.stringify({
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY ?? "",
  }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
