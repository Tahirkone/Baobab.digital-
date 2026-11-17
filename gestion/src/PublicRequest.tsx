import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { supabase } from "./lib/supabase";

type PublicService = {
  id: string;
  name: string;
  description: string | null;
  indicative_price: number;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string;
        action?: string;
        callback: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function PublicRequest() {
  const [services, setServices] = useState<PublicService[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const buildTimeSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";
  const [siteKey, setSiteKey] = useState(buildTimeSiteKey);
  const widgetIdRef = useRef("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [successReference, setSuccessReference] = useState("");
  const [website, setWebsite] = useState("");

  useEffect(() => {
    let alive = true;
    supabase.from("services")
      .select("id,name,description,indicative_price")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error: loadError }) => {
        if (!alive) return;
        if (loadError) {
          setNotice("Impossible de charger les prestations. Réessaie plus tard.");
          setError(true);
        } else {
          setServices((data ?? []) as PublicService[]);
        }
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/config", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Configuration indisponible");
        return response.json();
      })
      .then((config: { turnstileSiteKey?: unknown }) => {
        if (alive && typeof config.turnstileSiteKey === "string") {
          setSiteKey(config.turnstileSiteKey.trim() || buildTimeSiteKey);
        }
      })
      .catch(() => {
        if (alive) setSiteKey(buildTimeSiteKey);
      });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!siteKey) return;
    const scriptId = "cloudflare-turnstile-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    let cancelled = false;
    const renderWidget = () => {
      if (cancelled) return;
      const container = document.getElementById("public-turnstile");
      if (!container || !window.turnstile || widgetIdRef.current) return;
      const id = window.turnstile.render(container, {
        sitekey: siteKey,
        action: "public_request",
        callback: (token) => setCaptchaToken(token),
        "expired-callback": () => setCaptchaToken(""),
        "error-callback": () => setCaptchaToken(""),
      });
      widgetIdRef.current = id;
    };
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      script.addEventListener("load", renderWidget, { once: true });
    }
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = "";
      }
    };
  }, [siteKey]);

  const total = services.reduce((sum, service) =>
    sum + service.indicative_price * (quantities[service.id] ?? 0), 0);
  const selectedCount = Object.values(quantities).filter((quantity) => quantity > 0).length;

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError(false);
    if (website.trim()) {
      setNotice("Impossible d'envoyer cette demande.");
      setError(true);
      return;
    }
    if (!selectedCount || total <= 0) {
      setNotice("Choisis au moins une prestation.");
      setError(true);
      return;
    }
    if (!captchaToken) {
      setNotice("Valide la vérification de sécurité avant l'envoi.");
      setError(true);
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/demande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom_complet: name.trim(),
          telephone: phone.trim(),
          message_client: message.trim(),
          items: Object.entries(quantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([service_id, quantity]) => ({ service_id, quantity })),
          turnstile_token: captchaToken,
          website,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Envoi impossible. Réessaie plus tard.");
      setSuccessReference(result.reference || "");
      setNotice("Ta demande a bien été envoyée à BAOBAB DIGITAL.");
      setName("");
      setPhone("");
      setMessage("");
      setQuantities({});
      setCaptchaToken("");
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    } catch (submitError) {
      setNotice(submitError instanceof Error ? submitError.message : "Une erreur est survenue.");
      setError(true);
      setCaptchaToken("");
      if (widgetIdRef.current && window.turnstile) window.turnstile.reset(widgetIdRef.current);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="public-page">
      <header className="public-header">
        <a href="/" className="public-back"><ArrowLeft size={18} /> BAOBAB DIGITAL</a>
        <span>Le numérique à votre portée.</span>
      </header>
      <section className="public-card">
        <div className="public-brand-mark">BD</div>
        <p className="public-eyebrow">ESPACE CLIENT</p>
        <h1>Faire une demande</h1>
        <p className="public-intro">Choisis les prestations dont tu as besoin et laisse tes coordonnées. Notre équipe te recontactera pour confirmer les détails.</p>
        {successReference ? (
          <div className="public-success">
            <CheckCircle2 size={42} />
            <h2>Demande envoyée !</h2>
            <p>Ta référence est :</p>
            <strong>{successReference}</strong>
            <p>Conserve cette référence pour le suivi de ta demande.</p>
            <button type="button" className="public-submit" onClick={() => { setSuccessReference(""); setNotice(""); }}>
              Faire une autre demande
            </button>
          </div>
        ) : (
          <form onSubmit={submitRequest}>
            <h2>1. Tes coordonnées</h2>
            <label>Nom complet
              <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} required placeholder="Ex. Awa Ouédraogo" />
            </label>
            <label>Numéro de téléphone
              <input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={6} maxLength={30} required placeholder="Ex. 70 00 00 00" />
            </label>
            <h2>2. Les prestations</h2>
            {loading ? <p className="public-muted">Chargement des prestations…</p> : services.length === 0 ? (
              <p className="public-muted">Aucune prestation disponible pour le moment.</p>
            ) : (
              <div className="public-services">
                {services.map((service) => {
                  const quantity = quantities[service.id] ?? 0;
                  return (
                    <div className="public-service" key={service.id}>
                      <label className="public-service-choice">
                        <input type="checkbox" checked={quantity > 0} onChange={(event) => setQuantities((previous) => ({ ...previous, [service.id]: event.target.checked ? 1 : 0 }))} />
                        <span><strong>{service.name}</strong>{service.description && <small>{service.description}</small>}<small>{service.indicative_price.toLocaleString("fr-FR")} FCFA / unité</small></span>
                      </label>
                      {quantity > 0 && <label className="public-quantity">Quantité
                        <input type="number" min="1" max="20" step="1" value={quantity} onChange={(event) => setQuantities((previous) => ({ ...previous, [service.id]: Math.min(20, Math.max(1, Number(event.target.value) || 1)) }))} />
                      </label>}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="public-total"><span>Total indicatif</span><strong>{total.toLocaleString("fr-FR")} FCFA</strong></div>
            <p className="public-muted">Le montant final sera confirmé par BAOBAB DIGITAL avant le paiement.</p>
            <h2>3. Précisions (facultatif)</h2>
            <label>Ton message
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={4} placeholder="Décris brièvement ce dont tu as besoin…" />
            </label>
            <div className="public-honeypot" aria-hidden="true">
              <label>Ne pas remplir<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
            </div>
            {siteKey ? <div id="public-turnstile" className="public-captcha" /> : <p className="public-warning">Le formulaire sera disponible après la configuration de la protection anti-robot.</p>}
            {notice && <p className={error ? "public-notice public-error" : "public-notice"}>{notice}</p>}
            <button className="public-submit" type="submit" disabled={sending || loading || services.length === 0 || !siteKey || !captchaToken}>
              {sending ? <LoaderCircle size={18} className="public-spinner" /> : <Send size={18} />}
              {sending ? "Envoi en cours…" : "Envoyer ma demande"}
            </button>
          </form>
        )}
      </section>
      <footer className="public-footer">BAOBAB DIGITAL · Bobo-Dioulasso, Burkina Faso</footer>
    </main>
  );
}
