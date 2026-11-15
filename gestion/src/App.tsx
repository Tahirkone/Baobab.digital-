
import { useEffect, useMemo, useState } from "react";
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
  Wallet,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  TrendingUp,
  Trash2,
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

type Order = {
  id: string;
  reference: string;
  client_id: string | null;
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
  service_id: string | null;
  nom_service: string;
  prix_indicatif: number;
  quantite: number;
};

type Client = {
  id: string;
  nom_complet: string;
  telephone: string;
  created_at: string;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  indicative_price: number;
  is_active: boolean;
};

type Payment = {
  id: string;
  ordre_id: string;
  methode: string;
  montant: number;
  statut: string;
  reference_transaction: string | null;
  confirme_le: string | null;
  created_at: string;
};

type Expense = {
  id: string;
  description: string;
  montant: number;
  date_depense: string;
  created_at: string;
};

type HistoryItem = {
  id: string;
  ordre_id: string;
  ancien_statut: string | null;
  nouveau_statut: string;
  modifie_par: string | null;
  date_modification: string;
};

type Brand = {
  id: number;
  nom_marque: string;
  slogan: string | null;
  chemin_logo: string | null;
};

const statusOptions = [
  { value: "nouveau", label: "Nouvelle commande" },
  { value: "a_clarifier", label: "À clarifier" },
  { value: "attente_validation_prix", label: "Validation du prix" },
  { value: "attente_paiement", label: "En attente de paiement" },
  { value: "paye", label: "Payé / confirmé" },
  { value: "en_cours", label: "En cours" },
  { value: "attente_validation_client", label: "Validation du client" },
  { value: "termine", label: "Terminé" },
  { value: "livre", label: "Livré" },
  { value: "annule", label: "Annulé" },
];

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
  orders: "Commandes",
  clients: "Clients",
  services: "Services",
  payments: "Paiements",
  expenses: "Dépenses",
  settings: "Paramètres",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  border: "1px solid #dce5df",
  borderRadius: "9px",
  fontSize: "14px",
  boxSizing: "border-box",
  background: "#fff",
  color: "#173d2b",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: "9px",
  padding: "11px 15px",
  background: "#174b32",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e7eee9",
  borderRadius: "13px",
  padding: "18px",
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 600,
  fontSize: "13px",
  marginBottom: "7px",
  color: "#315640",
};

function money(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value) + " FCFA";
}

function dateText(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function statusText(value: string) {
  return statusOptions.find((item) => item.value === value)?.label ?? value;
}

function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p
      style={{
        padding: "11px",
        borderRadius: "8px",
        background: error ? "#fff0ee" : "#edf7ef",
        color: error ? "#a33325" : "#17613a",
        fontSize: "13px",
      }}
    >
      {children}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [brand, setBrand] = useState<Brand | null>(null);

  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderStatus, setOrderStatus] = useState("nouveau");

  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceActive, setServiceActive] = useState(true);

  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionReference, setTransactionReference] = useState("");

  const [brandName, setBrandName] = useState("BAOBAB DIGITAL");
  const [brandSlogan, setBrandSlogan] = useState("Le numérique à votre portée.");
  const [brandLogo, setBrandLogo] = useState("");

  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptPaymentId, setReceiptPaymentId] = useState("");

  const selectedOrder = orders.find((item) => item.id === selectedOrderId);
  const selectedDetails = details.filter(
    (item) => item.ordre_id === selectedOrderId
  );

  const filteredOrders = useMemo(() => {
    const value = search.toLowerCase().trim();

    if (!value) return orders;

    return orders.filter((item) =>
      [
        item.reference,
        item.nom_client,
        item.telephone_client,
      ].some((field) => field?.toLowerCase().includes(value))
    );
  }, [orders, search]);

  const confirmedPayments = payments.filter(
    (payment) => payment.statut === "confirme"
  );

  const revenue = confirmedPayments.reduce(
    (sum, payment) => sum + payment.montant,
    0
  );

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.montant,
    0
  );

  const balance = revenue - totalExpenses;

  const receiptPayment = payments.find(
    (item) => item.id === receiptPaymentId
  );

  const receiptOrder = receiptPayment
    ? orders.find((item) => item.id === receiptPayment.ordre_id)
    : undefined;

  function showNotice(text: string, error = false) {
    setNotice(text);
    setErrorNotice(error);
  }

  async function verifyAdmin() {
    const { data, error } = await supabase.rpc("is_baobab_admin");

    if (error || data !== true) {
      setIsAdmin(false);
      setMessage("Accès réservé à l'administrateur.");
      return false;
    }

    setIsAdmin(true);
    setMessage("");
    return true;
  }

  async function loadAll() {
    const [
      ordersResult,
      clientsResult,
      servicesResult,
      paymentsResult,
      expensesResult,
      historyResult,
      brandResult,
    ] = await Promise.all([
      supabase.from("ordres").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("depenses").select("*").order("date_depense", { ascending: false }),
      supabase.from("historique_commandes").select("*").order("date_modification", { ascending: false }),
      supabase.from("parametres_marque").select("*").limit(1).maybeSingle(),
    ]);

    if (ordersResult.error) {
      showNotice("Erreur de chargement des commandes : " + ordersResult.error.message, true);
    } else {
      setOrders((ordersResult.data ?? []) as Order[]);
    }

    if (clientsResult.error) {
      showNotice("Erreur de chargement des clients : " + clientsResult.error.message, true);
    } else {
      setClients((clientsResult.data ?? []) as Client[]);
    }

    if (servicesResult.error) {
      showNotice("Erreur de chargement des services : " + servicesResult.error.message, true);
    } else {
      setServices((servicesResult.data ?? []) as Service[]);
    }

    if (paymentsResult.error) {
      showNotice("Erreur de chargement des paiements : " + paymentsResult.error.message, true);
    } else {
      setPayments((paymentsResult.data ?? []) as Payment[]);
    }

    if (expensesResult.error) {
      showNotice("Erreur de chargement des dépenses : " + expensesResult.error.message, true);
    } else {
      setExpenses((expensesResult.data ?? []) as Expense[]);
    }

    if (historyResult.error) {
      showNotice("Erreur de chargement de l'historique : " + historyResult.error.message, true);
    } else {
      setHistory((historyResult.data ?? []) as HistoryItem[]);
    }

    if (brandResult.data) {
      const currentBrand = brandResult.data as Brand;
      setBrand(currentBrand);
      setBrandName(currentBrand.nom_marque);
      setBrandSlogan(currentBrand.slogan ?? "");
      setBrandLogo(currentBrand.chemin_logo ?? "");
    }
  }

  async function loadOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from("details_commandes")
      .select("*")
      .eq("ordre_id", orderId);

    if (error) {
      showNotice("Impossible de charger les services de cette commande.", true);
      return;
    }

    setDetails((previous) => [
      ...previous.filter((item) => item.ordre_id !== orderId),
      ...((data ?? []) as OrderDetail[]),
    ]);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      setSession(data.session);

      if (data.session) {
        const allowed = await verifyAdmin();

        if (allowed && active) await loadAll();
      }

      if (active) setLoading(false);
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
      active = false;
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

    const allowed = await verifyAdmin();

    if (allowed) await loadAll();

    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  }

  async function refresh() {
    setSaving(true);
    await loadAll();

    if (selectedOrderId) {
      await loadOrderDetails(selectedOrderId);
    }

    setSaving(false);
    showNotice("Données actualisées.");
  }

  function openOrder(order: Order) {
    setSelectedOrderId(order.id);
    setOrderAmount(
      order.montant_final === null ? "" : String(order.montant_final)
    );
    setOrderStatus(order.statut);
    setPaymentOrderId(order.id);
    setPaymentAmount(
      order.montant_final === null ? "" : String(order.montant_final)
    );
    showNotice("");
    loadOrderDetails(order.id);
  }

  async function saveOrder() {
    if (!selectedOrder) return;

    const amountText = orderAmount.trim();
    const amount = amountText === "" ? null : Number(amountText);

    if (
      amount !== null &&
      (!Number.isInteger(amount) || amount < 0)
    ) {
      showNotice("Le montant doit être un nombre entier positif.", true);
      return;
    }

    setSaving(true);

    const oldStatus = selectedOrder.statut;

    const { error } = await supabase
      .from("ordres")
      .update({
        montant_final: amount,
        statut: orderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedOrder.id);

    if (error) {
      showNotice("Erreur : " + error.message, true);
      setSaving(false);
      return;
    }

    if (oldStatus !== orderStatus) {
      const { error: historyError } = await supabase
        .from("historique_commandes")
        .insert({
          ordre_id: selectedOrder.id,
          ancien_statut: oldStatus,
          nouveau_statut: orderStatus,
          modifie_par: session?.user.email ?? "Administrateur",
        });

      if (historyError) {
        showNotice(
          "Commande enregistrée, mais l'historique n'a pas pu être ajouté : " +
            historyError.message,
          true
        );
      } else {
        setHistory((previous) => [
          {
            id: crypto.randomUUID(),
            ordre_id: selectedOrder.id,
            ancien_statut: oldStatus,
            nouveau_statut: orderStatus,
            modifie_par: session?.user.email ?? "Administrateur",
            date_modification: new Date().toISOString(),
          },
          ...previous,
        ]);
      }
    }

    setOrders((previous) =>
      previous.map((item) =>
        item.id === selectedOrder.id
          ? { ...item, montant_final: amount, statut: orderStatus }
          : item
      )
    );

    showNotice("Commande mise à jour.");
    setSaving(false);
  }

  function editService(service?: Service) {
    setServiceId(service?.id ?? "");
    setServiceName(service?.name ?? "");
    setServiceDescription(service?.description ?? "");
    setServicePrice(
      service ? String(service.indicative_price) : ""
    );
    setServiceActive(service?.is_active ?? true);
    showNotice("");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const price = Number(servicePrice);

    if (!serviceName.trim() || !Number.isInteger(price) || price < 0) {
      showNotice("Vérifie le nom et le tarif du service.", true);
      return;
    }

    setSaving(true);

    const values = {
      name: serviceName.trim(),
      description: serviceDescription.trim() || null,
      indicative_price: price,
      is_active: serviceActive,
      updated_at: new Date().toISOString(),
    };

    const result = serviceId
      ? await supabase.from("services").update(values).eq("id", serviceId)
      : await supabase.from("services").insert(values);

    if (result.error) {
      showNotice("Erreur : " + result.error.message, true);
    } else {
      showNotice("Service enregistré.");
      editService();
      await loadAll();
    }

    setSaving(false);
  }

  async function toggleService(service: Service) {
    const { error } = await supabase
      .from("services")
      .update({
        is_active: !service.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", service.id);

    if (error) {
      showNotice(error.message, true);
    } else {
      await loadAll();
      showNotice("Disponibilité du service modifiée.");
    }
  }

  async function saveExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(expenseAmount);

    if (
      !expenseDescription.trim() ||
      !Number.isInteger(amount) ||
      amount <= 0 ||
      !expenseDate
    ) {
      showNotice("Remplis correctement les informations de la dépense.", true);
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("depenses").insert({
      description: expenseDescription.trim(),
      montant: amount,
      date_depense: expenseDate,
    });

    if (error) {
      showNotice("Erreur : " + error.message, true);
    } else {
      setExpenseDescription("");
      setExpenseAmount("");
      await loadAll();
      showNotice("Dépense enregistrée.");
    }

    setSaving(false);
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const order = orders.find((item) => item.id === paymentOrderId);
    const amount = Number(paymentAmount);

    if (!order || !order.montant_final || order.montant_final <= 0) {
      showNotice("Cette commande doit avoir un montant final valide.", true);
      return;
    }

    if (!Number.isInteger(amount) || amount !== order.montant_final) {
      showNotice(
        "Le paiement doit correspondre exactement au montant final de la commande.",
        true
      );
      return;
    }

    if (order.statut_paiement === "paye") {
      showNotice("Cette commande est déjà marquée comme payée.", true);
      return;
    }

    if (
      paymentMethod === "orange_money" &&
      !transactionReference.trim()
    ) {
      showNotice(
        "Saisis la référence de transaction Orange Money si elle est disponible.",
        true
      );
      return;
    }

    setSaving(true);

    const paymentStatus =
      paymentMethod === "especes" ? "confirme" : "en_attente";

    const { error } = await supabase.from("paiements").insert({
      ordre_id: order.id,
      methode: paymentMethod,
      montant: amount,
      statut: paymentStatus,
      reference_transaction:
        paymentMethod === "orange_money"
          ? transactionReference.trim() || null
          : null,
      confirme_le:
        paymentStatus === "confirme"
          ? new Date().toISOString()
          : null,
    });

    if (error) {
      showNotice("Erreur de paiement : " + error.message, true);
      setSaving(false);
      return;
    }

    if (paymentStatus === "confirme") {
      const { error: orderError } = await supabase
        .from("ordres")
        .update({ statut_paiement: "paye" })
        .eq("id", order.id);

      if (orderError) {
        showNotice(
          "Paiement enregistré, mais le statut de la commande n'a pas été mis à jour. Vérifie-le.",
          true
        );
      } else {
        await supabase
          .from("historique_commandes")
          .insert({
            ordre_id: order.id,
            ancien_statut: order.statut,
            nouveau_statut:
              order.statut === "attente_paiement"
                ? "paye"
                : order.statut,
            modifie_par: session?.user.email ?? "Administrateur",
          });
      }
    }

    setTransactionReference("");
    await loadAll();
    showNotice(
      paymentStatus === "confirme"
        ? "Paiement en espèces enregistré comme reçu."
        : "Paiement Orange Money enregistré en attente de confirmation."
    );
    setSaving(false);
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!brandName.trim()) {
      showNotice("Le nom de la marque est obligatoire.", true);
      return;
    }

    setSaving(true);

    const values = {
      nom_marque: brandName.trim(),
      slogan: brandSlogan.trim() || null,
      chemin_logo: brandLogo.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const result = brand
      ? await supabase
          .from("parametres_marque")
          .update(values)
          .eq("id", brand.id)
      : await supabase
          .from("parametres_marque")
          .insert({ id: 1, ...values });

    if (result.error) {
      showNotice("Erreur : " + result.error.message, true);
    } else {
      await loadAll();
      showNotice("Identité de la marque enregistrée.");
    }

    setSaving(false);
  }

  function printReceipt(payment: Payment, order: Order) {
    const receiptWindow = window.open("", "_blank", "width=700,height=800");

    if (!receiptWindow) {
      showNotice("Autorise les fenêtres contextuelles pour imprimer le reçu.", true);
      return;
    }

    const safe = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        };
        return entities[character];
      });

    receiptWindow.document.write(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Reçu BAOBAB DIGITAL</title>
        <style>
          body{font-family:Arial,sans-serif;color:#173d2b;padding:35px}
          .receipt{max-width:600px;margin:auto;border:1px solid #ddd;padding:30px}
          h1{margin-bottom:4px;color:#174b32}
          .muted{color:#666;font-size:13px}
          hr{border:0;border-top:1px solid #ddd;margin:20px 0}
          .line{display:flex;justify-content:space-between;margin:13px 0;gap:20px}
          .total{font-size:21px;font-weight:bold}
          .footer{text-align:center;margin-top:35px;font-size:12px;color:#666}
          @media print{body{padding:0}.receipt{border:0}}
        </style>
      </head>
      <body>
        <div class="receipt">
          <h1>${safe(brandName)}</h1>
          <p class="muted">${safe(brandSlogan)}</p>
          <hr>
          <h2>REÇU DE PAIEMENT</h2>
          <p>Référence du reçu : ${safe(payment.id.slice(0, 8).toUpperCase())}</p>
          <p>Commande : ${safe(order.reference)}</p>
          <p>Date : ${safe(dateText(payment.confirme_le ?? payment.created_at))}</p>
          <hr>
          <div class="line"><strong>Client</strong><span>${safe(order.nom_client)}</span></div>
          <div class="line"><strong>Téléphone</strong><span>${safe(order.telephone_client)}</span></div>
          <div class="line"><strong>Prestation</strong><span>${safe(order.reference)}</span></div>
          <div class="line total"><strong>Montant payé</strong><span>${money(payment.montant)}</span></div>
          <div class="line"><strong>Méthode</strong><span>${payment.methode === "especes" ? "Espèces" : "Orange Money"}</span></div>
          <div class="line"><strong>État</strong><span>Paiement confirmé</span></div>
          <hr>
          <p class="footer">Merci pour votre confiance.<br>${safe(brandName)}</p>
        </div>
        <script>window.onload=()=>window.print();</script>
      </body>
      </html>
    `);

    receiptWindow.document.close();
  }

  function navigate(id: Section) {
    setSection(id);
    setMobileMenu(false);
    showNotice("");
  }

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
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Ton adresse e-mail"
              required
            />

            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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

  return (
    <main className="admin-layout">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <Leaf size={32} />
          </div>
          <div className="brand-name">
            <strong>{brandName}</strong>
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
                className={section === item.id ? "nav-item active" : "nav-item"}
                onClick={() => navigate(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="sidebar-logout" onClick={logout}>
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
            <p>{brandSlogan}</p>
          </div>

          <button className="refresh-button" onClick={refresh} disabled={saving}>
            <RefreshCw size={17} />
            <span>Actualiser</span>
          </button>
        </header>

        <div className="dashboard-content">
          {notice && <Notice error={errorNotice}>{notice}</Notice>}

          {section === "dashboard" && (
            <>
              <div className="welcome-card">
                <div className="welcome-content">
                  <div>
                    <span>ESPACE ADMINISTRATEUR</span>
                    <h2>Bienvenue dans {brandName} !</h2>
                    <p>{brandSlogan}</p>
                  </div>
                  <svg className="baobab-tree" viewBox="0 0 180 180" fill="none">
                    <path d="M78 145 L84 85 L72 63 L91 76 L105 55 L101 84 L112 145 Z" fill="#D6AE51"/>
                    <path d="M89 80 C65 75 50 61 39 42 M96 78 C112 66 126 51 140 32 M86 75 C77 54 77 36 80 20 M101 75 C104 50 99 34 95 18" stroke="#D6AE51" strokeWidth="8" strokeLinecap="round"/>
                    <path d="M32 48 C12 38 21 14 44 18 C48 -1 77 2 82 17 C100 -1 127 8 124 25 C148 11 169 29 157 46 C174 65 150 78 131 68 C114 86 91 76 85 68 C64 84 39 72 32 48Z" fill="#E8C56E"/>
                    <path d="M45 145 Q90 135 135 145" stroke="#E8C56E" strokeWidth="5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>

              <h2 className="section-heading">Vue financière</h2>

              <div className="stats-grid">
                {[
                  { label: "Commandes", value: orders.length, icon: ShoppingBag },
                  { label: "Clients", value: clients.length, icon: Users },
                  { label: "Services", value: services.filter((item) => item.is_active).length, icon: BriefcaseBusiness },
                  { label: "Paiements confirmés", value: confirmedPayments.length, icon: CheckCircle2 },
                  { label: "Recettes encaissées", value: money(revenue), icon: TrendingUp },
                  { label: "Dépenses", value: money(totalExpenses), icon: Receipt },
                  { label: "Solde", value: money(balance), icon: Wallet },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <article className="stat-card" key={card.label}>
                      <div className="stat-icon"><Icon size={22} /></div>
                      <div>
                        <p>{card.label}</p>
                        <strong>{card.value}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div style={cardStyle}>
                <h3>À surveiller</h3>
                <p>Commandes non payées : {orders.filter((item) => item.statut_paiement === "impaye").length}</p>
                <p>Paiements en attente : {payments.filter((item) => item.statut === "en_attente").length}</p>
                <p>Commandes en cours : {orders.filter((item) => item.statut === "en_cours").length}</p>
              </div>
            </>
          )}

          {section === "orders" && (
            <>
              <h2 className="section-heading">Commandes des clients</h2>
              <div className="orders-search">
                <Search size={19} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par nom, téléphone ou référence..."
                />
              </div>

              {orders.length === 0 ? (
                <div className="section-placeholder">
                  <ClipboardList size={34} />
                  <h2>Aucune commande pour le moment</h2>
                  <p>Les nouvelles commandes apparaîtront ici.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "16px" }}>
                  <div style={cardStyle}>
                    <h3>Liste des commandes ({filteredOrders.length})</h3>
                    {filteredOrders.map((order) => (
                      <button
                        key={order.id}
                        onClick={() => openOrder(order)}
                        style={{
                          ...inputStyle,
                          textAlign: "left",
                          marginBottom: "8px",
                          cursor: "pointer",
                          borderColor: selectedOrderId === order.id ? "#174b32" : "#dce5df",
                        }}
                      >
                        <strong>{order.nom_client}</strong>
                        <br />
                        <small>{order.reference} — {order.telephone_client}</small>
                        <br />
                        <small>{statusText(order.statut)} · {money(order.montant_final ?? 0)}</small>
                      </button>
                    ))}
                  </div>

                  <div style={cardStyle}>
                    {!selectedOrder ? (
                      <p>Sélectionne une commande pour voir ses détails.</p>
                    ) : (
                      <>
                        <h3>Détails de la commande</h3>
                        <p><strong>Référence :</strong> {selectedOrder.reference}</p>
                        <p><strong>Client :</strong> {selectedOrder.nom_client}</p>
                        <p><strong>Téléphone :</strong> {selectedOrder.telephone_client}</p>
                        <p><strong>Date :</strong> {dateText(selectedOrder.created_at)}</p>
                        <h4>Services demandés</h4>
                        {selectedDetails.length === 0 ? (
                          <p>Aucun service détaillé.</p>
                        ) : selectedDetails.map((detail) => (
                          <p key={detail.id}>
                            {detail.nom_service} × {detail.quantite} — {money(detail.prix_indicatif)}
                          </p>
                        ))}
                        {selectedOrder.message_client && (
                          <p><strong>Message :</strong> {selectedOrder.message_client}</p>
                        )}

                        <hr />
                        <Field label="Montant final (FCFA)">
                          <input style={inputStyle} type="number" min="0" step="1" value={orderAmount} onChange={(event) => setOrderAmount(event.target.value)} />
                        </Field>

                        <Field label="Statut de la commande">
                          <select style={inputStyle} value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
                            {statusOptions.map((item) => (
                              <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                          </select>
                        </Field>

                        <button style={buttonStyle} onClick={saveOrder} disabled={saving}>
                          <Save size={17} /> Enregistrer
                        </button>

                        <h4>Historique</h4>
                        {history.filter((item) => item.ordre_id === selectedOrder.id).map((item) => (
                          <p key={item.id} style={{ fontSize: "12px" }}>
                            {item.ancien_statut ? statusText(item.ancien_statut) + " → " : ""}
                            {statusText(item.nouveau_statut)} — {dateText(item.date_modification)}
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {section === "clients" && (
            <>
              <h2 className="section-heading">Liste des clients</h2>
              <div style={cardStyle}>
                <p>Total : {clients.length} client(s)</p>
                {clients.length === 0 ? (
                  <p>Aucun client enregistré pour le moment.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "10px" }}>Nom</th>
                          <th style={{ textAlign: "left", padding: "10px" }}>Téléphone</th>
                          <th style={{ textAlign: "left", padding: "10px" }}>Commandes</th>
                          <th style={{ textAlign: "left", padding: "10px" }}>Inscription</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((client) => (
                          <tr key={client.id} style={{ borderTop: "1px solid #e5ece7" }}>
                            <td style={{ padding: "10px" }}>{client.nom_complet}</td>
                            <td style={{ padding: "10px" }}>{client.telephone}</td>
                            <td style={{ padding: "10px" }}>{orders.filter((order) => order.client_id === client.id).length}</td>
                            <td style={{ padding: "10px" }}>{dateText(client.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {section === "services" && (
            <>
              <h2 className="section-heading">Catalogue et tarifs</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "16px" }}>
                <form style={cardStyle} onSubmit={saveService}>
                  <h3>{serviceId ? "Modifier le service" : "Ajouter un service"}</h3>
                  <Field label="Nom du service">
                    <input style={inputStyle} value={serviceName} onChange={(event) => setServiceName(event.target.value)} required />
                  </Field>
                  <Field label="Description">
                    <textarea style={inputStyle} value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} rows={3} />
                  </Field>
                  <Field label="Tarif indicatif (FCFA)">
                    <input style={inputStyle} type="number" min="0" step="1" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} required />
                  </Field>
                  <label style={{ display: "flex", gap: "8px", marginBottom: "15px" }}>
                    <input type="checkbox" checked={serviceActive} onChange={(event) => setServiceActive(event.target.checked)} />
                    Service actif
                  </label>
                  <button style={buttonStyle} disabled={saving}><Save size={17} /> Enregistrer</button>
                  {serviceId && <button type="button" style={{ ...buttonStyle, background: "#68776d", marginLeft: "8px" }} onClick={() => editService()}>Annuler</button>}
                </form>

                <div style={cardStyle}>
                  <h3>Services existants ({services.length})</h3>
                  {services.map((service) => (
                    <div key={service.id} style={{ borderBottom: "1px solid #e5ece7", padding: "12px 0" }}>
                      <strong>{service.name}</strong>
                      <p>{service.description}</p>
                      <p>{money(service.indicative_price)} · {service.is_active ? "Actif" : "Désactivé"}</p>
                      <button style={buttonStyle} onClick={() => editService(service)}>Modifier</button>
                      <button style={{ ...buttonStyle, background: service.is_active ? "#9b4036" : "#26734b", marginLeft: "7px" }} onClick={() => toggleService(service)}>
                        {service.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Notice>Les prix enregistrés dans les anciennes commandes restent conservés dans leurs détails.</Notice>
            </>
          )}

          {section === "payments" && (
            <>
              <h2 className="section-heading">Paiements</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: "12px" }}>
                <div style={cardStyle}>
                  <p>Recettes confirmées</p>
                  <h2>{money(revenue)}</h2>
                </div>
                <div style={cardStyle}>
                  <p>Paiements en attente</p>
                  <h2>{payments.filter((item) => item.statut === "en_attente").length}</h2>
                </div>
              </div>

              <form style={{ ...cardStyle, marginTop: "16px" }} onSubmit={recordPayment}>
                <h3>Enregistrer un paiement</h3>
                <Field label="Commande">
                  <select style={inputStyle} value={paymentOrderId} onChange={(event) => {
                    setPaymentOrderId(event.target.value);
                    const order = orders.find((item) => item.id === event.target.value);
                    setPaymentAmount(order?.montant_final === null || !order ? "" : String(order.montant_final));
                  }} required>
                    <option value="">Choisir une commande</option>
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>
                        {order.reference} — {order.nom_client} — {money(order.montant_final ?? 0)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Montant intégral reçu / à vérifier (FCFA)">
                  <input style={inputStyle} type="number" min="1" step="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                </Field>
                <Field label="Méthode">
                  <select style={inputStyle} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                    <option value="especes">Espèces</option>
                    <option value="orange_money">Orange Money</option>
                  </select>
                </Field>
                {paymentMethod === "orange_money" && (
                  <Field label="Référence de transaction">
                    <input style={inputStyle} value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} placeholder="Référence Orange Money" />
                  </Field>
                )}
                <button style={buttonStyle} disabled={saving}>
                  <Plus size={17} /> Enregistrer le paiement
                </button>
                <p style={{ fontSize: "12px", color: "#6c766f" }}>
                  Les espèces sont enregistrées comme reçues par l'administrateur. Orange Money reste en attente de confirmation officielle.
                </p>
              </form>

              <div style={{ ...cardStyle, marginTop: "16px" }}>
                <h3>Historique des paiements</h3>
                {payments.length === 0 ? <p>Aucun paiement enregistré.</p> : payments.map((payment) => {
                  const order = orders.find((item) => item.id === payment.ordre_id);
                  return (
                    <div key={payment.id} style={{ borderBottom: "1px solid #e5ece7", padding: "12px 0" }}>
                      <strong>{order?.nom_client ?? "Client"}</strong>
                      <p>{order?.reference ?? payment.ordre_id}</p>
                      <p>{money(payment.montant)} · {payment.methode === "especes" ? "Espèces" : "Orange Money"}</p>
                      <p>{payment.statut === "confirme" ? "Confirmé" : payment.statut === "echoue" ? "Échoué" : "En attente"}</p>
                      {payment.statut === "confirme" && order && (
                        <button style={buttonStyle} onClick={() => printReceipt(payment, order)}>
                          <Printer size={17} /> Imprimer le reçu
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === "expenses" && (
            <>
              <h2 className="section-heading">Dépenses</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: "12px" }}>
                <div style={cardStyle}>
                  <p>Total des dépenses</p>
                  <h2>{money(totalExpenses)}</h2>
                </div>
                <div style={cardStyle}>
                  <p>Solde actuel</p>
                  <h2>{money(balance)}</h2>
                </div>
              </div>

              <form style={{ ...cardStyle, marginTop: "16px" }} onSubmit={saveExpense}>
                <h3>Ajouter une dépense</h3>
                <Field label="Description">
                  <input style={inputStyle} value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required />
                </Field>
                <Field label="Montant (FCFA)">
                  <input style={inputStyle} type="number" min="1" step="1" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required />
                </Field>
                <Field label="Date">
                  <input style={inputStyle} type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
                </Field>
                <button style={buttonStyle} disabled={saving}><Plus size={17} /> Enregistrer la dépense</button>
              </form>

              <div style={{ ...cardStyle, marginTop: "16px" }}>
                <h3>Historique des dépenses</h3>
                {expenses.length === 0 ? <p>Aucune dépense enregistrée.</p> : expenses.map((expense) => (
                  <div key={expense.id} style={{ borderBottom: "1px solid #e5ece7", padding: "12px 0" }}>
                    <strong>{expense.description}</strong>
                    <p>{money(expense.montant)} · {dateText(expense.date_depense)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === "settings" && (
            <>
              <h2 className="section-heading">Identité de la marque</h2>
              <form style={cardStyle} onSubmit={saveBrand}>
                <Field label="Nom de la marque">
                  <input style={inputStyle} value={brandName} onChange={(event) => setBrandName(event.target.value)} required />
                </Field>
                <Field label="Slogan">
                  <input style={inputStyle} value={brandSlogan} onChange={(event) => setBrandSlogan(event.target.value)} />
                </Field>
                <Field label="Chemin du logo (adresse publique ou chemin de stockage)">
                  <input style={inputStyle} value={brandLogo} onChange={(event) => setBrandLogo(event.target.value)} placeholder="Adresse du logo" />
                </Field>
                {brandLogo && (
                  <div style={{ marginBottom: "15px" }}>
                    <p>Aperçu du logo</p>
                    <img src={brandLogo} alt="Logo BAOBAB DIGITAL" style={{ maxWidth: "140px", maxHeight: "100px", objectFit: "contain" }} />
                  </div>
                )}
                <button style={buttonStyle} disabled={saving}><Save size={17} /> Enregistrer les paramètres</button>
              </form>
              <Notice>Le champ du logo accepte actuellement une adresse ou un chemin existant. Le téléversement sécurisé du fichier logo sera ajouté séparément.</Notice>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
