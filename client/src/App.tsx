import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown, CircleUserRound, FileText, Headphones, LogIn, LogOut, Menu, Plus, ShieldCheck, ShoppingBag, Sparkles, TreeDeciduous, UserPlus, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Service = { id: string; name: string; description: string | null; indicative_price: number; icon_url: string | null };
type Brand = { nom_marque: string; slogan: string | null; chemin_logo: string | null };

const money = (value: number) => new Intl.NumberFormat("fr-FR").format(value) + " FCFA";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [brand, setBrand] = useState<Brand>({ nom_marque: "BAOBAB DIGITAL", slogan: "Le numérique à votre portée.", chemin_logo: null });
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.auth.getSession(),
      supabase.from("services").select("id,name,description,indicative_price,icon_url").eq("is_active", true).order("created_at", { ascending: true }),
      supabase.from("parametres_marque").select("nom_marque,slogan,chemin_logo").limit(1).maybeSingle()
    ]).then(([auth, serviceResult, brandResult]) => {
      if (!active) return;
      setSession(auth.data.session);
      if (serviceResult.error) setNotice("Le catalogue n'est pas encore disponible. Réessaie dans un instant.");
      else setServices((serviceResult.data ?? []) as Service[]);
      if (brandResult.data) setBrand(brandResult.data as Brand);
      setLoading(false);
    }).catch(() => { if (active) { setNotice("Connexion temporairement indisponible."); setLoading(false); } });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const count = useMemo(() => Object.values(cart).reduce((sum, quantity) => sum + quantity, 0), [cart]);
  const total = useMemo(() => services.reduce((sum, service) => sum + service.indicative_price * (cart[service.id] ?? 0), 0), [services, cart]);

  function add(service: Service) {
    setCart((current) => ({ ...current, [service.id]: (current[service.id] ?? 0) + 1 }));
    setNotice(service.name + " ajouté au panier.");
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true); setNotice("");
    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone } } });
        if (error) throw error;
        if (data.session) setNotice("Compte créé. Bienvenue chez BAOBAB DIGITAL !");
        else setNotice("Compte créé. Vérifie ton adresse e-mail pour confirmer ton inscription.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setNotice("Connexion réussie.");
      }
      setAuthOpen(false); setPassword("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally { setAuthBusy(false); }
  }

  async function signOut() { await supabase.auth.signOut(); setNotice("Tu es déconnecté."); }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#accueil" aria-label="BAOBAB DIGITAL accueil">
          {brand.chemin_logo ? <img src={brand.chemin_logo} alt="" /> : <span className="brand-icon"><TreeDeciduous size={27} /></span>}
          <span><strong>{brand.nom_marque}</strong><small>ESPACE CLIENT</small></span>
        </a>
        <button className="mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Ouvrir le menu">{mobileMenu ? <X/> : <Menu/>}</button>
        <nav className={mobileMenu ? "nav nav-open" : "nav"}>
          <a href="#services" onClick={() => setMobileMenu(false)}>Nos services</a>
          <a href="#fonctionnement" onClick={() => setMobileMenu(false)}>Comment ça marche</a>
          <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
        </nav>
        <div className="top-actions">
          <button className="cart-button" onClick={() => setNotice(count ? "Ton panier contient " + count + " prestation(s), pour un total indicatif de " + money(total) + "." : "Ton panier est vide.")}><ShoppingBag size={18}/><span>Panier</span>{count > 0 && <b>{count}</b>}</button>
          {session ? <button className="account-button" onClick={signOut}><LogOut size={17}/> Déconnexion</button> : <button className="account-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}><CircleUserRound size={18}/> Mon compte</button>}
        </div>
      </header>

      <main>
        <section className="hero" id="accueil">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={15}/> VOS SERVICES NUMÉRIQUES</span>
            <h1>Vos démarches,<br/><em>plus simples.</em></h1>
            <p>{brand.slogan || "Le numérique à votre portée."} Commandez vos documents et prestations en quelques étapes, directement depuis votre téléphone.</p>
            <div className="hero-buttons"><a className="primary-button" href="#services">Découvrir nos services <ArrowRight size={18}/></a><a className="text-button" href="#fonctionnement">Comment ça marche ?</a></div>
            <div className="trust-line"><ShieldCheck size={17}/> Un suivi clair et un échange direct avec notre équipe</div>
          </div>
          <div className="hero-art">
            <div className="art-circle"></div>
            <div className="document-card"><div className="doc-head"><span className="doc-mark"><TreeDeciduous/></span><span>BAOBAB DIGITAL</span></div><div className="doc-line wide"></div><div className="doc-line"></div><div className="doc-line short"></div><div className="doc-photo"></div><div className="doc-line wide"></div><div className="doc-line"></div><div className="doc-stamp"><CheckCircle2/> SIMPLE & PRATIQUE</div></div>
            <div className="floating-note"><CheckCircle2 size={18}/> Commande simplifiée</div>
          </div>
        </section>

        <section className="service-section" id="services">
          <div className="section-intro"><div><span className="eyebrow">NOS PRESTATIONS</span><h2>De quoi as-tu besoin ?</h2><p>Choisis une ou plusieurs prestations. Les prix affichés sont indicatifs.</p></div><span className="catalog-count">{services.length} service(s)</span></div>
          {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Fermer"><X size={16}/></button></div>}
          {loading ? <div className="loading">Chargement du catalogue…</div> : services.length === 0 ? <div className="empty-state"><BriefcaseBusiness size={28}/><strong>Le catalogue arrive bientôt</strong><span>Nos prestations seront affichées ici.</span></div> :
            <div className="service-grid">{services.map((service) => <article className="service-card" key={service.id}>
              <div className="service-icon">{service.icon_url ? <img src={service.icon_url} alt=""/> : <FileText size={25}/>}</div>
              <div className="service-card-body"><h3>{service.name}</h3><p>{service.description || "Une prestation réalisée avec soin par BAOBAB DIGITAL."}</p><div className="service-bottom"><div><small>À partir de</small><strong>{money(service.indicative_price)}</strong></div><button onClick={() => add(service)} aria-label={"Ajouter " + service.name}><Plus size={19}/></button></div></div>
              {cart[service.id] > 0 && <span className="quantity-pill">{cart[service.id]} dans le panier</span>}
            </article>)}</div>
          }
          <div className="cart-summary"><div><span>Ton panier</span><strong>{count} prestation(s) · {money(total)}</strong><small>Le montant définitif sera confirmé par BAOBAB DIGITAL.</small></div><button onClick={() => { if (!count) setNotice("Ajoute d'abord une prestation à ton panier."); else if (!session) { setAuthMode("signup"); setAuthOpen(true); setNotice("Connecte-toi ou crée un compte pour continuer."); } else setNotice("Ton compte est connecté. Le formulaire de commande sera activé dans la prochaine étape."); }}>Continuer <ArrowRight size={17}/></button></div>
        </section>

        <section className="steps-section" id="fonctionnement"><span className="eyebrow">C'EST SIMPLE</span><h2>Comment ça marche ?</h2><div className="steps-grid">
          <div className="step"><span>01</span><ShoppingBag/><h3>Choisis tes services</h3><p>Ajoute les prestations dont tu as besoin à ton panier.</p></div>
          <div className="step"><span>02</span><UserPlus/><h3>Envoie ta demande</h3><p>Renseigne tes coordonnées et transmets les informations utiles.</p></div>
          <div className="step"><span>03</span><Headphones/><h3>Nous te répondons</h3><p>Notre équipe confirme les détails et le prix définitif.</p></div>
          <div className="step"><span>04</span><CheckCircle2/><h3>Reçois ton travail</h3><p>Après confirmation du paiement intégral, récupère ton document.</p></div>
        </div></section>
        <section className="contact-strip" id="contact"><div><span className="eyebrow">UNE QUESTION ?</span><h2>Nous sommes là pour t'aider.</h2><p>BAOBAB DIGITAL · Le numérique à votre portée.</p></div><a href="https://wa.me/" target="_blank" rel="noreferrer">Contacter notre équipe <ArrowRight size={18}/></a></section>
      </main>
      <footer><span>© {new Date().getFullYear()} {brand.nom_marque}</span><span>Burkina Faso · Tous droits réservés</span></footer>

      {authOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><section className="auth-modal">
        <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Fermer"><X/></button>
        <span className="modal-symbol"><TreeDeciduous size={28}/></span><span className="eyebrow">ESPACE CLIENT</span><h2>{authMode === "signup" ? "Créer mon compte" : "Heureux de te revoir"}</h2><p>{authMode === "signup" ? "Inscris-toi pour suivre tes demandes et retrouver tes reçus." : "Connecte-toi pour accéder à ton espace client."}</p>
        <form onSubmit={submitAuth}>
          {authMode === "signup" && <><label>Nom complet<input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required placeholder="Ton nom et prénom"/></label><label>Téléphone<input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required placeholder="+226 …"/></label></>}
          <label>Adresse e-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required placeholder="exemple@email.com"/></label>
          <label>Mot de passe<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} required placeholder="8 caractères minimum"/></label>
          <button className="primary-button full-button" disabled={authBusy}>{authBusy ? "Patiente…" : authMode === "signup" ? "Créer mon compte" : "Me connecter"} <ArrowRight size={17}/></button>
        </form>
        <div className="switch-auth">{authMode === "signup" ? "Tu as déjà un compte ?" : "Tu n'as pas encore de compte ?"} <button onClick={() => setAuthMode(authMode === "signup" ? "login" : "signup")}>{authMode === "signup" ? "Se connecter" : "Créer un compte"}</button></div>
      </section></div>}
    </div>
  );
}
