
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
  Search,
  Save,
  ClipboardList,
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

type Order = {
  id: string;
  reference: string;
  client_id: string;
  nom_client: string;
  telephone_client: string;
  montant_final: number | null;
  statut: string;
  statut_paiement: string;
  option_paiement_espece: string | null;
  message_client: string | null;
  created_at: string;
  updated_at: string;
};

type OrderDetail = {
  id: string;
  ordre_id: string;
  service_id: string;
  nom_service: string;
  prix_indicatif: number;
  quantite: number;
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

const statusOptions = [
  { value: "nouveau", label: "Nouvelle commande" },
  { value: "a_clarifier", label: "À clarifier" },
  {
    value: "attente_validation_prix",
    label: "En attente de validation du prix",
  },
  { value: "attente_paiement", label: "En attente de paiement" },
  { value: "paye", label: "Payé / confirmé" },
  { value: "en_cours", label: "En cours" },
  {
    value: "attente_validation_client",
    label: "En attente du client",
  },
  { value: "termine", label: "Terminé" },
  { value: "livre", label: "Livré" },
  { value: "annule", label: "Annulé" },
];

function formatMoney(value: number | null) {
  if (value === null) return "À définir";

  return (
    new Intl.NumberFormat("fr-FR").format(value) + " FCFA"
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getStatusLabel(value: string) {
  return (
    statusOptions.find((item) => item.value === value)?.label ??
    value
  );
}

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

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [statusInput, setStatusInput] = useState("nouveau");
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

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
        supabase.from(table).select("*", {
          count: "exact",
          head: true,
        })
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

  async function loadOrders() {
    setOrdersLoading(true);
    setOrderError("");

    const { data, error } = await supabase
      .from("ordres")
      .select(
        "id, reference, client_id, nom_client, telephone_client, montant_final, statut, statut_paiement, option_paiement_espece, message_client, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setOrderError("Impossible de charger les commandes : " + error.message);
      setOrdersLoading(false);
      return;
    }

    const loadedOrders = (data ?? []) as Order[];
    setOrders(loadedOrders);

    if (loadedOrders.length === 0) {
      setOrderDetails([]);
      setSelectedOrderId("");
      setOrdersLoading(false);
      return;
    }

    const ids = loadedOrders.map((order) => order.id);

    const { data: details, error: detailsError } = await supabase
      .from("details_commandes")
      .select("id, ordre_id, service_id, nom_service, prix_indicatif, quantite")
      .in("ordre_id", ids);

    if (detailsError) {
      setOrderError(
        "Les commandes sont chargées, mais leurs services ne peuvent pas être affichés."
      );
    } else {
      setOrderDetails((details ?? []) as OrderDetail[]);
    }

    setOrdersLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (data.session) {
        await verifyAdmin();

        if (mounted) {
          await loadStats();
        }
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

    if (data.session) {
      await loadStats();
    }

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

    if (id === "orders") {
      loadOrders();
    }
  }

  function selectOrder(order: Order) {
    setSelectedOrderId(order.id);
    setAmountInput(
      order.montant_final === null
        ? ""
        : String(order.montant_final)
    );
    setStatusInput(order.statut);
    setSaveMessage("");
  }

  async function saveOrderChanges() {
    const selectedOrder = orders.find(
      (order) => order.id === selectedOrderId
    );

    if (!selectedOrder) return;

    const trimmedAmount = amountInput.trim();
    const amount =
      trimmedAmount === "" ? null : Number(trimmedAmount);

    if (
      amount !== null &&
      (!Number.isFinite(amount) || amount < 0)
    ) {
      setSaveMessage("Entre un montant valide et positif.");
      return;
    }

    if (amount !== null && !Number.isInteger(amount)) {
      setSaveMessage("Le montant doit être un nombre entier en FCFA.");
      return;
    }

    setSavingOrder(true);
    setSaveMessage("");

    const { error } = await supabase
      .from("ordres")
      .update({
        montant_final: amount,
        statut: statusInput,
      })
      .eq("id", selectedOrder.id);

    if (error) {
      setSaveMessage("Erreur : " + error.message);
      setSavingOrder(false);
      return;
    }

    setOrders((previous) =>
      previous.map((order) =>
        order.id === selectedOrder.id
          ? {
              ...order,
              montant_final: amount,
              statut: statusInput,
            }
          : order
      )
    );

    setSaveMessage("Modifications enregistrées avec succès.");
    setSavingOrder(false);
    await loadStats();
  }

  const cards = [
    { label: "Commandes", value: stats.orders, icon: ShoppingBag },
    { label: "Clients", value: stats.clients, icon: Users },
    {
      label: "Services actifs",
      value: stats.services,
      icon: BriefcaseBusiness,
    },
    { label: "Paiements", value: stats.payments, icon: CreditCard },
    { label: "Dépenses", value: stats.expenses, icon: Receipt },
  ];

  const filteredOrders = orders.filter((order) => {
    const search = searchTerm.toLowerCase();

    return (
      order.reference?.toLowerCase().includes(search) ||
      order.nom_client?.toLowerCase().includes(search) ||
      order.telephone_client?.toLowerCase().includes(search)
    );
  });

  const selectedOrder = orders.find(
    (order) => order.id === selectedOrderId
  );

  const selectedDetails = orderDetails.filter(
    (detail) => detail.ordre_id === selectedOrderId
  );

  if (loading) {
    return (
      <div className="loading">
        Chargement de BAOBAB DIGITAL...
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="brand-icon">
            <Leaf size={34} />
          </div>

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

          {message && (
            <p className="error-message">{message}</p>
          )}

          <p className="security-note">
            <LockKeyhole size={14} />
            Accès privé réservé à l'administrateur
          </p>
        </section>
      </main>
    );
  }

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

          <button
            className="close-menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={22} />
          </button>
        </div>

        <nav className="side-nav">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                className={
                  section === item.id
                    ? "nav-item active"
                    : "nav-item"
                }
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

          <button
            className="refresh-button"
            onClick={() => {
              loadStats();
              if (section === "orders") loadOrders();
            }}
          >
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
            </div>

            <h2 className="section-heading">Vue d'ensemble</h2>

            <div className="stats-grid">
              {cards.map((card) => {
                const Icon = card.icon;

                return (
                  <article className="stat-card" key={card.label}>
                    <div className="stat-icon">
                      <Icon size={22} />
                    </div>
                    <div>
                      <p>{card.label}</p>
                      <strong>
                        {card.value === null ? "—" : card.value}
                      </strong>
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
        ) : section === "orders" ? (
          <div className="dashboard-content">
            <div className="section-heading">
              <h2>Commandes des clients</h2>
              <p>Consulte et gère les demandes reçues.</p>
            </div>

            <div className="orders-search">
              <Search size={19} />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, téléphone ou référence..."
              />
            </div>

            {ordersLoading ? (
              <div className="section-placeholder">
                Chargement des commandes...
              </div>
            ) : orderError ? (
              <div className="section-placeholder">
                <p>{orderError}</p>
                <button onClick={loadOrders}>Réessayer</button>
              </div>
            ) : orders.length === 0 ? (
              <div className="section-placeholder">
                <div className="placeholder-icon">
                  <ClipboardList size={32} />
                </div>
                <h2>Aucune commande pour le moment</h2>
                <p>
                  Les nouvelles commandes des clients apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="orders-layout">
                <div className="orders-list">
                  {filteredOrders.length === 0 ? (
                    <p>Aucun résultat pour cette recherche.</p>
                  ) : (
                    filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        className={
                          selectedOrderId === order.id
                            ? "order-item selected"
                            : "order-item"
                        }
                        onClick={() => selectOrder(order)}
                      >
                        <strong>{order.nom_client}</strong>
                        <span>{order.reference}</span>
                        <span>{order.telephone_client}</span>
                        <span>{getStatusLabel(order.statut)}</span>
                        <small>
                          {formatDate(order.created_at)}
                        </small>
                      </button>
                    ))
                  )}
                </div>

                <div className="order-details-panel">
                  {!selectedOrder ? (
                    <div className="section-placeholder">
                      <ClipboardList size={32} />
                      <p>
                        Sélectionne une commande pour voir ses détails.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h2>Détails de la commande</h2>

                      <p>
                        <strong>Référence :</strong>{" "}
                        {selectedOrder.reference}
                      </p>

                      <p>
                        <strong>Client :</strong>{" "}
                        {selectedOrder.nom_client}
                      </p>

                      <p>
                        <strong>Téléphone :</strong>{" "}
                        {selectedOrder.telephone_client}
                      </p>

                      <p>
                        <strong>Date :</strong>{" "}
                        {formatDate(selectedOrder.created_at)}
                      </p>

                      <h3>Services demandés</h3>

                      {selectedDetails.length === 0 ? (
                        <p>Aucun détail de service trouvé.</p>
                      ) : (
                        <div className="order-services">
                          {selectedDetails.map((detail) => (
                            <div key={detail.id}>
                              <strong>{detail.nom_service}</strong>
                              <span>
                                Quantité : {detail.quantite}
                              </span>
                              <span>
                                Prix indicatif :{" "}
                                {formatMoney(detail.prix_indicatif)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {selectedOrder.message_client && (
                        <>
                          <h3>Message du client</h3>
                          <p>{selectedOrder.message_client}</p>
                        </>
                      )}

                      <div className="order-payment-info">
                        <h3>État du paiement</h3>
                        <p>
                          {selectedOrder.statut_paiement === "paye"
                            ? "Paiement confirmé"
                            : "Paiement non confirmé"}
                        </p>
                        <p>
                          Le paiement se gère séparément du statut
                          de la commande.
                        </p>
                      </div>

                      <div className="order-edit-form">
                        <h3>Gestion de la commande</h3>

                        <label>Montant final (FCFA)</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={amountInput}
                          onChange={(e) =>
                            setAmountInput(e.target.value)
                          }
                          placeholder="Saisir le prix définitif"
                        />

                        <label>Statut de la commande</label>
                        <select
                          value={statusInput}
                          onChange={(e) =>
                            setStatusInput(e.target.value)
                          }
                        >
                          {statusOptions.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={saveOrderChanges}
                          disabled={savingOrder}
                        >
                          <Save size={18} />
                          {savingOrder
                            ? "Enregistrement..."
                            : "Enregistrer les modifications"}
                        </button>

                        {saveMessage && (
                          <p className="save-message">
                            {saveMessage}
                          </p>
                        )}

                        <p className="payment-warning">
                          Attention : enregistrer le statut « Payé »
                          ne confirme pas réellement un paiement.
                          Vérifie toujours le paiement avant de
                          confirmer sa réception.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="section-placeholder">
            <div className="placeholder-icon">
              <Leaf size={32} />
            </div>
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

