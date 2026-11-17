interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  PUBLIC_SITE_HOSTNAME?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequestPost({ request, env }: PagesContext) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.TURNSTILE_SECRET_KEY) {
    return json({ error: "Le formulaire n'est pas encore configuré. Réessaie plus tard." }, 503);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Données de formulaire invalides." }, 400);
  }

  if (body?.website) return json({ error: "Demande rejetée." }, 400);
  const name = typeof body?.nom_complet === "string" ? body.nom_complet.trim() : "";
  const phone = typeof body?.telephone === "string" ? body.telephone.trim() : "";
  const message = typeof body?.message_client === "string" ? body.message_client.trim() : "";
  const token = typeof body?.turnstile_token === "string" ? body.turnstile_token : "";
  const items = Array.isArray(body?.items) ? body.items : [];

  if (name.length < 2 || name.length > 120 || phone.length < 6 || phone.length > 30 || message.length > 1000 || !token || items.length < 1 || items.length > 8) {
    return json({ error: "Vérifie les coordonnées et les prestations sélectionnées." }, 400);
  }

  const formData = new FormData();
  formData.set("secret", env.TURNSTILE_SECRET_KEY);
  formData.set("response", token);
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) formData.set("remoteip", clientIp);

  let captcha: any;
  try {
    const verifyResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });
    captcha = await verifyResponse.json();
  } catch {
    return json({ error: "Vérification de sécurité indisponible. Réessaie." }, 503);
  }

  if (!captcha?.success || captcha?.action !== "public_request") {
    return json({ error: "La vérification de sécurité a échoué. Actualise-la puis réessaie." }, 403);
  }
  if (env.PUBLIC_SITE_HOSTNAME && captcha.hostname !== env.PUBLIC_SITE_HOSTNAME) {
    return json({ error: "Origine du formulaire non autorisée." }, 403);
  }

  const supabaseUrl = env.SUPABASE_URL.replace(/\/+$/, "");
  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(supabaseUrl + "/rest/v1/rpc/creer_demande_publique", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        p_nom_complet: name,
        p_telephone: phone,
        p_message: message || null,
        p_items: items,
      }),
    });
  } catch {
    return json({ error: "Impossible de transmettre la demande. Réessaie plus tard." }, 503);
  }

  if (!rpcResponse.ok) {
    return json({ error: "La demande n'a pas pu être enregistrée. Vérifie les informations et réessaie." }, 400);
  }

  const result: any = await rpcResponse.json().catch(() => null);
  if (!result?.reference) return json({ error: "Réponse du serveur invalide." }, 502);
  return json({ reference: result.reference }, 201);
}
