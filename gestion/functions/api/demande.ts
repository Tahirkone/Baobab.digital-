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
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function supabaseRestBaseUrl(value: string) {
  // Accept either the project URL or a URL that already ends in /rest/v1.
  return value.trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

export async function onRequestPost({ request, env }: PagesContext) {
  const supabaseUrl = supabaseRestBaseUrl(env.SUPABASE_URL ?? "");
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  const turnstileSecret = (env.TURNSTILE_SECRET_KEY ?? "").trim();

  if (!supabaseUrl || !serviceKey || !turnstileSecret) {
    return json(
      { error: "Le formulaire n'est pas encore configuré. Réessaie plus tard." },
      503,
    );
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

  if (
    name.length < 2 ||
    name.length > 120 ||
    phone.length < 6 ||
    phone.length > 30 ||
    message.length > 1000 ||
    !token ||
    items.length < 1 ||
    items.length > 8
  ) {
    return json(
      { error: "Vérifie les coordonnées et les prestations sélectionnées." },
      400,
    );
  }

  const formData = new FormData();
  formData.set("secret", turnstileSecret);
  formData.set("response", token);
  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp) formData.set("remoteip", clientIp);

  let captcha: any;
  try {
    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: formData },
    );
    captcha = await verifyResponse.json();
  } catch {
    return json(
      { error: "Vérification de sécurité indisponible. Réessaie." },
      503,
    );
  }

  if (!captcha?.success || captcha?.action !== "public_request") {
    return json(
      { error: "La vérification de sécurité a échoué. Actualise-la puis réessaie." },
      403,
    );
  }

  if (
    env.PUBLIC_SITE_HOSTNAME &&
    captcha.hostname !== env.PUBLIC_SITE_HOSTNAME.trim()
  ) {
    return json({ error: "Origine du formulaire non autorisée." }, 403);
  }

  // New Supabase secret keys (sb_secret_...) are opaque API keys, not JWTs.
  // They belong in the apikey header only. Legacy service_role JWTs need both.
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: serviceKey,
  };
  if (!serviceKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${serviceKey}`;
  }

  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/creer_demande_publique`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_nom_complet: name,
          p_telephone: phone,
          p_message: message || null,
          p_items: items,
        }),
      },
    );
  } catch {
    console.error("public_request_supabase_network_error");
    return json(
      { error: "Impossible de transmettre la demande. Réessaie plus tard." },
      503,
    );
  }

  const result: any = await rpcResponse.json().catch(() => null);
  if (!rpcResponse.ok) {
    const errorCode =
      typeof result?.code === "string" ? result.code.slice(0, 40) : "unknown";
    console.error("public_request_supabase_error", {
      status: rpcResponse.status,
      code: errorCode,
      apiKeyType: serviceKey.startsWith("sb_secret_")
        ? "opaque_secret"
        : serviceKey.startsWith("eyJ")
          ? "legacy_jwt"
          : "unknown",
      apiKeyLength: serviceKey.length,
    });

    if (rpcResponse.status === 401 || rpcResponse.status === 403) {
      return json(
        { error: "La connexion sécurisée au serveur est invalide. Contacte CYBER." },
        503,
      );
    }
    if (rpcResponse.status === 400) {
      return json(
        { error: "Certaines informations sont invalides. Vérifie les coordonnées et les prestations." },
        400,
      );
    }
    return json(
      { error: "Le serveur n'a pas pu enregistrer la demande. Réessaie plus tard." },
      502,
    );
  }

  if (!result?.reference) {
    console.error("public_request_supabase_invalid_response");
    return json({ error: "Réponse du serveur invalide." }, 502);
  }

  return json({ reference: result.reference }, 201);
}
