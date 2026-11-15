
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BriefcaseBusiness,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  LockKeyhole,
  Leaf,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Section =
  | "dashboard"
  | "orders"
  | "clients"
  | "services"
  | "payments"
  | "expenses"
  | "settings";

type Stats = {
  orders: number | null;
  clients: number | null;
  services: number | null;
  payments: number | null;
  expenses: number | null;
};

const initialStats: Stats = {
  orders: null,
  clients: null,
  services: null,
  payments: null,
  expenses: null,
};

const menu = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "orders", label: "Commandes", icon: ShoppingBag },
  { id: "clients", label: "Clients", icon: Users },
  { id: "services", label: "Services", icon: BriefcaseBusiness },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "expenses", label: "Dépenses", icon: Receipt },
  { id: "settings", label: "Paramètres", icon: Settings },
] as const;

const titles: Record<Section, string> = {
  dashboard: "Tableau de bord",
  orders: "Gestion des commandes",
  clients: "Gestion des clients",
  services: "Gestion des services",
  payments: "Gestion des paiements",
  expenses: "Gestion des dépenses",
  settings: "Paramètres",
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [mobileMenu, setMobileMenu] = useState(false);

  async function verifyAdmin() {
    const { data, error } = await supabase.rpc("is_baobab_admin");

    if (error || data !== true) {
      setIsAdmin(false);
      setMessage("Accès réservé à l'administrateur.");
      return;
    }

    setIsAdmin(true);
    setMessage("");
  }

  async function loadStats() {
    const tables = [
      "ordres",
      "clients",
      "services",
      "paiements",
      "depenses",
    ] as const;

    const results = await Promise.all(
      tables.map((table) =>
        supabase.from(table).select("*", { count: "exact", head: true })
      )
    );

    setStats({
      orders: results[0].error ? null : results[0].count,
      clients: results[1].error ? null : results[1].count,
      services: results[2].error ? null : results[2].count,
      payments: results[3].error ? null : results[3].count,
      expenses: results[4].error ? null : results[4].count,
    });
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (data.session) {
        await verifyAdmin();
        if (mounted) await loadStats();
      }

      if (mounted) setLoading(false);
    }

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "SIGNED_OUT") {
          setSession(null);
          setIsAdmin(false);
        } else if (newSession) {
          setSession(newSession);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSession(data.session);
    await verifyAdmin();

    if (data.session) await loadStats();

    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setPassword("");
  }

  function chooseSection(id: Section) {
    setSection(id);
    setMobileMenu(false);
  }

  if (loading) {
    return <div className="loading">Chargement de BAOBAB DIGITAL...</div>;
  }

  if (!session || !isAdmin) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-icon"><Leaf size={34} /></div>
          <h1>BAOBAB DIGITAL</h1>
          <p className="subtitle">Espace de gestion sécurisé</p>

          <form onSubmit={handleLogin}>
            <label>Adresse e-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ton adresse e-mail"
              required
            />

            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ton mot de passe"
              required
            />

            <button type="submit" disabled={loading}>
              <LockKeyhole size={18} />
              Se connecter
            </button>
          </form>

          {message && <p className="error-message">{message}</p>}

          <p className="security-note">
            <LockKeyhole size={14} />
            Accès privé réservé à l'administrateur
          </p>
        </section>
      </main>
    );
  }

  const cards = [
    { label: "Commandes", value: stats.orders, icon: ShoppingBag },
    { label: "Clients", value: stats.clients, icon: Users },
    { label: "Services actifs", value: stats.services, icon: BriefcaseBusiness },
    { label: "Paiements", value: stats.payments, icon: CreditCard },
    { label: "Dépenses", value: stats.expenses, icon: Receipt },
  ];

  return (
    <main className="admin-layout">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        
<div className="sidebar-brand">
  <div className="brand-logo">
    <Leaf size={32} />
  </div>
  <div className="brand-name">
    <strong>BAOBAB DIGITAL</strong>
    <span>Gestion</span>
  </div>
  <button className="close-menu" onClick={() => setMobileMenu(false)}>
    <X size={22} />
  </button>
</div>

          <Leaf size={30} />
          <div>
            <strong>BAOBAB DIGITAL</strong>
            <span>Gestion</span>
          </div>
          <button className="close-menu" onClick={() => setMobileMenu(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="side-nav">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={section === item.id ? "nav-item active" : "nav-item"}
                onClick={() => chooseSection(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <LogOut size={19} />
          Déconnexion
        </button>
      </aside>

      {mobileMenu && (
        <button
          className="menu-overlay"
          aria-label="Fermer le menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <section className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={23} />
          </button>
          <div>
            <h1>{titles[section]}</h1>
            <p>Le numérique à votre portée.</p>
          </div>
          <button className="refresh-button" onClick={loadStats}>
            <RefreshCw size={17} />
            <span>Actualiser</span>
          </button>
        </header>

        {section === "dashboard" ? (
          <div className="dashboard-content">
            <div className="welcome-card">
              
<div className="welcome-content">
  <div>
    <span>ESPACE ADMINISTRATEUR</span>
    <h2>Bienvenue dans BAOBAB DIGITAL !</h2>
    <p>Voici un aperçu de ton activité.</p>
  </div>

  <svg
    className="baobab-tree"
    viewBox="0 0 180 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M78 145 L84 85 L72 63 L91 76 L105 55 L101 84 L112 145 Z"
      fill="#D6AE51"
    />
    <path
      d="M89 80 C65 75 50 61 39 42 M96 78 C112 66 126 51 140 32 M86 75 C77 54 77 36 80 20 M101 75 C104 50 99 34 95 18"
      stroke="#D6AE51"
      strokeWidth="8"
      strokeLinecap="round"
    />
    <path
      d="M32 48 C12 38 21 14 44 18 C48 -1 77 2 82 17 C100 -1 127 8 124 25 C148 11 169 29 157 46 C174 65 150 78 131 68 C114 86 91 76 85 68 C64 84 39 72 32 48Z"
      fill="#E8C56E"
    />
    <path
      d="M45 145 Q90 135 135 145"
      stroke="#E8C56E"
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
</div>


            <h2 className="section-heading">Vue d'ensemble</h2>

            <div className="stats-grid">
              {cards.map((card) => {
                const Icon = card.icon;
                return (
                  <article className="stat-card" key={card.label}>
                    <div className="stat-icon"><Icon size={22} /></div>
                    <div>
                      <p>{card.label}</p>
                      <strong>{card.value === null ? "—" : card.value}</strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="dashboard-note">
              <h3>Ton espace de travail</h3>
              <p>
                Utilise le menu pour accéder aux différentes parties de
                ton activité. Les fonctionnalités seront ajoutées
                progressivement.
              </p>
            </div>
          </div>
        ) : (
          <div className="section-placeholder">
            <div className="placeholder-icon"><Leaf size={32} /></div>
            <h2>{titles[section]}</h2>
            <p>
              Cette rubrique sera construite et connectée à Supabase
              dans la prochaine étape.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
