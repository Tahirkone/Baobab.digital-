
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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

function statusTone(value: string) {
  if (["paye", "termine", "livre"].includes(value)) return "badge-success";
  if (value === "annule") return "badge-danger";
  if (
    [
      "attente_paiement",
      "attente_validation_prix",
      "attente_validation_client",
      "a_clarifier",
    ].includes(value)
  ) {
    return "badge-warning";
  }
  if (value === "en_cours") return "badge-info";
  return "badge-neutral";
}

function paymentTone(value: string) {
  if (value === "confirme") return "badge-success";
  if (value === "echoue") return "badge-danger";
  return "badge-warning";
}

function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return <p className={error ? "notice notice-error" : "notice"}>{children}</p>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
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

  const selectedOrder = orders.find((item) => item.id === selectedOrderId);
  const selectedDetails = details.filter(
    (item) => item.ordre_id === selectedOrderId
  );

  const filteredOrders = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return orders;
    return orders.filter((item) =>
      [item.reference, item.nom_client, item.telephone_client].some((field) =>
        field?.toLowerCase().includes(value)
      )
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

  async function loadAll(): Promise<boolean> {
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

    const errors: string[] = [];

    if (ordersResult.error) {
      errors.push("commandes : " + ordersResult.error.message);
    } else {
      setOrders((ordersResult.data ?? []) as Order[]);
    }

    if (clientsResult.error) {
      errors.push("clients : " + clientsResult.error.message);
    } else {
      setClients((clientsResult.data ?? []) as Client[]);
    }

    if (servicesResult.error) {
      errors.push("services : " + servicesResult.error.message);
    } else {
      setServices((servicesResult.data ?? []) as Service[]);
    }

    if (paymentsResult.error) {
      errors.push("paiements : " + paymentsResult.error.message);
    } else {
      setPayments((paymentsResult.data ?? []) as Payment[]);
    }

    if (expensesResult.error) {
      errors.push("dépenses : " + expensesResult.error.message);
    } else {
      setExpenses((expensesResult.data ?? []) as Expense[]);
    }

    if (historyResult.error) {
      errors.push("historique : " + historyResult.error.message);
    } else {
      setHistory((historyResult.data ?? []) as HistoryItem[]);
    }

    if (brandResult.error) {
      errors.push("paramètres de marque : " + brandResult.error.message);
    } else if (brandResult.data) {
      const currentBrand = brandResult.data as Brand;
      setBrand(currentBrand);
      setBrandName(currentBrand.nom_marque);
      setBrandSlogan(currentBrand.slogan ?? "");
      setBrandLogo(currentBrand.chemin_logo ?? "");
    }

    if (errors.length > 0) {
      showNotice("Certaines données n'ont pas été chargées : " + errors.join(" | "), true);
      return false;
    }

    return true;
  }

  async function loadOrderDetails(orderId: string) {
    const { data, error } = await supabase
      .from("details_commandes")
      .select("*")
      .eq("ordre_id", orderId);

    if (error) {
      showNotice("Impossible de charger les services de cette commande.", true);
      return false;
    }

    setDetails((previous) => [
      ...previous.filter((item) => item.ordre_id !== orderId),
      ...((data ?? []) as OrderDetail[]),
    ]);
    return true;
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
    const loaded = await loadAll();
    let detailsLoaded = true;

    if (selectedOrderId) {
      detailsLoaded = await loadOrderDetails(selectedOrderId);
    }

    if (loaded && detailsLoaded) {
      showNotice("Données actualisées.");
    }

    setSaving(false);
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

  function scrollToOrderDetail() {
    if (window.innerWidth > 900) return;
    window.setTimeout(() => {
      document
        .getElementById("order-detail")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  async function saveOrder() {
    if (!selectedOrder) return;

    if (
      orderStatus === "paye" &&
      selectedOrder.statut_paiement !== "paye"
    ) {
      showNotice(
        "Impossible de déclarer cette commande payée sans paiement confirmé.",
        true
      );
      return;
    }

    const amountText = orderAmount.trim();
    const amount = amountText === "" ? null : Number(amountText);

    if (amount !== null && (!Number.isInteger(amount) || amount < 0)) {
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
    setServicePrice(service ? String(service.indicative_price) : "");
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
      editService();
      const loaded = await loadAll();
      if (loaded) showNotice("Service enregistré.");
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
      const loaded = await loadAll();
      if (loaded) showNotice("Disponibilité du service modifiée.");
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
      const loaded = await loadAll();
      if (loaded) showNotice("Dépense enregistrée.");
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

    const existingPayment = payments.find(
      (item) =>
        item.ordre_id === order.id &&
        ["confirme", "en_attente"].includes(item.statut)
    );

    if (order.statut_paiement === "paye" || existingPayment) {
      showNotice(
        "Un paiement confirmé ou en attente existe déjà pour cette commande. Vérifie son historique avant toute nouvelle opération.",
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
        paymentStatus === "confirme" ? new Date().toISOString() : null,
    });

    if (error) {
      showNotice("Erreur de paiement : " + error.message, true);
      setSaving(false);
      return;
    }

    if (paymentStatus === "confirme") {
      const newOrderStatus =
        order.statut === "attente_paiement" ? "paye" : order.statut;

      const { error: orderError } = await supabase
        .from("ordres")
        .update({
          statut_paiement: "paye",
          statut: newOrderStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) {
        await loadAll();
        showNotice(
          "Le paiement en espèces est enregistré, mais la commande n'a pas été mise à jour. Ne recommence pas le paiement : vérifie la commande.",
          true
        );
        setSaving(false);
        return;
      }

      if (newOrderStatus !== order.statut) {
        const { error: historyError } = await supabase
          .from("historique_commandes")
          .insert({
            ordre_id: order.id,
            ancien_statut: order.statut,
            nouveau_statut: newOrderStatus,
            modifie_par: session?.user.email ?? "Administrateur",
          });

        if (historyError) {
          await loadAll();
          showNotice(
            "Paiement confirmé et commande mise à jour, mais l'historique n'a pas pu être enregistré.",
            true
          );
          setSaving(false);
          return;
        }
      }
    }

    setTransactionReference("");
    const loaded = await loadAll();

    if (loaded) {
      showNotice(
        paymentStatus === "confirme"
          ? "Paiement en espèces enregistré comme reçu."
          : "Paiement Orange Money enregistré en attente de confirmation officielle."
      );
    }

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
      const loaded = await loadAll();
      if (loaded) showNotice("Identité de la marque enregistrée.");
    }

    setSaving(false);
  }

  async function printReceipt(payment: Payment, order: Order) {
    if (payment.statut !== "confirme") {
      showNotice("Un reçu ne peut être imprimé que pour un paiement confirmé.", true);
      return;
    }

    const receiptWindow = window.open("", "_blank", "width=700,height=800");
    if (!receiptWindow) {
      showNotice(
        "Autorise les fenêtres contextuelles pour imprimer le reçu.",
        true
      );
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

    receiptWindow.document.write(
      "<!doctype html><html lang='fr'><head><meta charset='UTF-8'><title>Reçu BAOBAB DIGITAL</title></head><body>Préparation du reçu...</body></html>"
    );

    const { data: orderDetails, error } = await supabase
      .from("details_commandes")
      .select("nom_service, quantite")
      .eq("ordre_id", order.id);

    if (error) {
      receiptWindow.close();
      showNotice(
        "Impossible de récupérer les prestations pour le reçu. Réessaie.",
        true
      );
      return;
    }

    const prestation =
      (orderDetails ?? [])
        .map((item) => `${item.nom_service} × ${item.quantite}`)
        .join(", ") || "Prestation non détaillée";

    receiptWindow.document.open();
    receiptWindow.document.write(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Reçu BAOBAB DIGITAL</title>
        <style>
          body{font-family:Arial,sans-serif;color:#0F3D2E;padding:35px}
          .receipt{max-width:600px;margin:auto;border:1px solid #ddd;border-top:6px solid #C9A227;padding:30px}
          h1{margin-bottom:4px;color:#0F3D2E}
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
          <div class="line"><strong>Prestation</strong><span>${safe(prestation)}</span></div>
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
        <Leaf size={28} />
        <span>Chargement de BAOBAB DIGITAL...</span>
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
            <Leaf size={28} />
          </div>
          <div className="brand-name">
            <strong>{brandName}</strong>
            <span>Gestion</span>
          </div>
          <button
            className="close-menu"
            onClick={() => setMobileMenu(false)}
            aria-label="Fermer le menu"
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
          <div className="topbar-title">
            <h1>{titles[section]}</h1>
            <p>{brandSlogan}</p>
          </div>
          <button className="refresh-button" onClick={refresh} disabled={saving}>
            <RefreshCw size={17} className={saving ? "spin" : ""} />
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
                    <span className="welcome-tag">ESPACE ADMINISTRATEUR</span>
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
                      <div className="stat-text">
                        <p>{card.label}</p>
                        <strong>{card.value}</strong>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="card watch-card">
                <h3 className="card-title"><Clock size={18} /> À surveiller</h3>
                <div className="watch-list">
                  <div className="watch-item">
                    <span>Commandes non payées</span>
                    <strong>{orders.filter((item) => item.statut_paiement === "impaye").length}</strong>
                  </div>
                  <div className="watch-item">
                    <span>Paiements en attente</span>
                    <strong>{payments.filter((item) => item.statut === "en_attente").length}</strong>
                  </div>
                  <div className="watch-item">
                    <span>Commandes en cours</span>
                    <strong>{orders.filter((item) => item.statut === "en_cours").length}</strong>
                  </div>
                </div>
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
                  <div className="placeholder-icon"><ClipboardList size={30} /></div>
                  <h2>Aucune commande pour le moment</h2>
                  <p>Les nouvelles commandes apparaîtront ici.</p>
                </div>
              ) : (
                <div className="orders-layout">
                  <div className="card">
                    <h3 className="card-title">Liste des commandes ({filteredOrders.length})</h3>
                    <div className="order-list">
                      {filteredOrders.map((order) => (
                        <button
                          key={order.id}
                          className={selectedOrderId === order.id ? "order-item selected" : "order-item"}
                          onClick={() => {
                            openOrder(order);
                            scrollToOrderDetail();
                          }}
                        >
                          <div className="order-item-top">
                            <strong>{order.nom_client}</strong>
                            <span className="order-amount">{money(order.montant_final ?? 0)}</span>
                          </div>
                          <small>{order.reference} — {order.telephone_client}</small>
                          <span className={`badge ${statusTone(order.statut)}`}>{statusText(order.statut)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="card" id="order-detail">
                    {!selectedOrder ? (
                      <p className="empty-text">Sélectionne une commande pour voir ses détails.</p>
                    ) : (
                      <>
                        <h3 className="card-title">Détails de la commande</h3>
                        <div className="detail-list">
                          <p><span>Référence</span><strong>{selectedOrder.reference}</strong></p>
                          <p><span>Client</span><strong>{selectedOrder.nom_client}</strong></p>
                          <p><span>Téléphone</span><strong>{selectedOrder.telephone_client}</strong></p>
                          <p><span>Date</span><strong>{dateText(selectedOrder.created_at)}</strong></p>
                        </div>

                        <h4 className="sub-title">Services demandés</h4>
                        {selectedDetails.length === 0 ? (
                          <p className="empty-text">Aucun service détaillé.</p>
                        ) : (
                          <ul className="service-lines">
                            {selectedDetails.map((detail) => (
                              <li key={detail.id}>
                                <span>{detail.nom_service} × {detail.quantite}</span>
                                <strong>{money(detail.prix_indicatif)}</strong>
                              </li>
                            ))}
                          </ul>
                        )}

                        {selectedOrder.message_client && (
                          <div className="client-message">
                            <strong>Message du client</strong>
                            <p>{selectedOrder.message_client}</p>
                          </div>
                        )}

                        <hr />
                        <Field label="Montant final (FCFA)">
                          <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            value={orderAmount}
                            onChange={(event) => setOrderAmount(event.target.value)}
                          />
                        </Field>

                        <Field label="Statut de la commande">
                          <select
                            className="input"
                            value={orderStatus}
                            onChange={(event) => setOrderStatus(event.target.value)}
                          >
                            {statusOptions
                              .filter(
                                (item) =>
                                  item.value !== "paye" ||
                                  orderStatus === "paye"
                              )
                              .map((item) => (
                                <option key={item.value} value={item.value}>
                                  {item.label}
                                </option>
                              ))}
                          </select>
                        </Field>

                        <button
                          className="btn btn-primary btn-block"
                          onClick={saveOrder}
                          disabled={saving}
                        >
                          <Save size={17} /> Enregistrer
                        </button>

                        <h4 className="sub-title">Historique</h4>
                        <div className="timeline">
                          {history
                            .filter((item) => item.ordre_id === selectedOrder.id)
                            .map((item) => (
                              <p key={item.id}>
                                <strong>
                                  {item.ancien_statut
                                    ? statusText(item.ancien_statut) + " → "
                                    : ""}
                                  {statusText(item.nouveau_statut)}
                                </strong>
                                <small>{dateText(item.date_modification)}</small>
                              </p>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
              {orders.length > 0 && filteredOrders.length === 0 && (
                <p className="empty-text">Aucune commande ne correspond à cette recherche.</p>
              )}
            </>
          )}

          {section === "clients" && (
            <>
              <h2 className="section-heading">Liste des clients</h2>
              <div className="card">
                <p className="card-subtitle">Total : {clients.length} client(s)</p>
                {clients.length === 0 ? (
                  <p className="empty-text">Aucun client enregistré pour le moment.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Téléphone</th>
                          <th>Commandes</th>
                          <th>Inscription</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map((client) => (
                          <tr key={client.id}>
                            <td data-label="Nom"><strong>{client.nom_complet}</strong></td>
                            <td data-label="Téléphone">{client.telephone}</td>
                            <td data-label="Commandes">{orders.filter((order) => order.client_id === client.id).length}</td>
                            <td data-label="Inscription">{dateText(client.created_at)}</td>
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
              <div className="two-columns">
                <form className="card" onSubmit={saveService}>
                  <h3 className="card-title">{serviceId ? "Modifier le service" : "Ajouter un service"}</h3>
                  <Field label="Nom du service">
                    <input className="input" value={serviceName} onChange={(event) => setServiceName(event.target.value)} required />
                  </Field>
                  <Field label="Description">
                    <textarea className="input" value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} rows={3} />
                  </Field>
                  <Field label="Tarif indicatif (FCFA)">
                    <input className="input" type="number" min="0" step="1" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} required />
                  </Field>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={serviceActive} onChange={(event) => setServiceActive(event.target.checked)} />
                    Service actif
                  </label>
                  <div className="btn-row">
                    <button className="btn btn-primary" disabled={saving}><Save size={17} /> Enregistrer</button>
                    {serviceId && (
                      <button type="button" className="btn btn-secondary" onClick={() => editService()}>Annuler</button>
                    )}
                  </div>
                </form>

                <div className="card">
                  <h3 className="card-title">Services existants ({services.length})</h3>
                  <div className="row-list">
                    {services.map((service) => (
                      <div key={service.id} className="row-item">
                        <div className="row-main">
                          <strong>{service.name}</strong>
                          {service.description && <p>{service.description}</p>}
                          <div className="row-meta">
                            <span className="price">{money(service.indicative_price)}</span>
                            <span className={`badge ${service.is_active ? "badge-success" : "badge-neutral"}`}>
                              {service.is_active ? "Actif" : "Désactivé"}
                            </span>
                          </div>
                        </div>
                        <div className="btn-row">
                          <button className="btn btn-secondary btn-small" onClick={() => editService(service)}>Modifier</button>
                          <button
                            className={service.is_active ? "btn btn-danger btn-small" : "btn btn-success btn-small"}
                            onClick={() => toggleService(service)}
                          >
                            {service.is_active ? "Désactiver" : "Activer"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <Notice>Les prix enregistrés dans les anciennes commandes restent conservés dans leurs détails.</Notice>
            </>
          )}

          {section === "payments" && (
            <>
              <h2 className="section-heading">Paiements</h2>
              <div className="summary-grid">
                <div className="summary-card">
                  <p>Recettes confirmées</p>
                  <h2>{money(revenue)}</h2>
                </div>
                <div className="summary-card summary-gold">
                  <p>Paiements en attente</p>
                  <h2>{payments.filter((item) => item.statut === "en_attente").length}</h2>
                </div>
              </div>

              <form className="card section-gap" onSubmit={recordPayment}>
                <h3 className="card-title"><CreditCard size={18} /> Enregistrer un paiement</h3>
                <div className="form-grid">
                  <Field label="Commande">
                    <select
                      className="input"
                      value={paymentOrderId}
                      onChange={(event) => {
                        setPaymentOrderId(event.target.value);
                        const order = orders.find((item) => item.id === event.target.value);
                        setPaymentAmount(
                          order?.montant_final === null || !order
                            ? ""
                            : String(order.montant_final)
                        );
                      }}
                      required
                    >
                      <option value="">Choisir une commande</option>
                      {orders.map((order) => (
                        <option key={order.id} value={order.id}>
                          {order.reference} — {order.nom_client} — {money(order.montant_final ?? 0)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Montant intégral reçu / à vérifier (FCFA)">
                    <input className="input" type="number" min="1" step="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                  </Field>

                  <Field label="Méthode">
                    <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                      <option value="especes">Espèces</option>
                      <option value="orange_money">Orange Money</option>
                    </select>
                  </Field>

                  {paymentMethod === "orange_money" && (
                    <Field label="Référence de transaction (facultative)">
                      <input
                        className="input"
                        value={transactionReference}
                        onChange={(event) => setTransactionReference(event.target.value)}
                        placeholder="Référence Orange Money"
                      />
                    </Field>
                  )}
                </div>

                <button className="btn btn-primary" disabled={saving}>
                  <Plus size={17} /> Enregistrer le paiement
                </button>
                <p className="help-text">
                  Les espèces sont enregistrées comme reçues par l'administrateur. Orange Money reste en attente de confirmation officielle.
                </p>
              </form>

              <div className="card section-gap">
                <h3 className="card-title">Historique des paiements</h3>
                {payments.length === 0 ? (
                  <p className="empty-text">Aucun paiement enregistré.</p>
                ) : (
                  <div className="row-list">
                    {payments.map((payment) => {
                      const order = orders.find((item) => item.id === payment.ordre_id);
                      return (
                        <div key={payment.id} className="row-item">
                          <div className="row-main">
                            <strong>{order?.nom_client ?? "Client"}</strong>
                            <p>{order?.reference ?? payment.ordre_id}</p>
                            <div className="row-meta">
                              <span className="price">{money(payment.montant)}</span>
                              <span className="badge badge-neutral">
                                {payment.methode === "especes" ? "Espèces" : "Orange Money"}
                              </span>
                              <span className={`badge ${paymentTone(payment.statut)}`}>
                                {payment.statut === "confirme"
                                  ? "Confirmé"
                                  : payment.statut === "echoue"
                                    ? "Échoué"
                                    : "En attente"}
                              </span>
                            </div>
                          </div>
                          {payment.statut === "confirme" && order && (
                            <button
                              className="btn btn-secondary btn-small"
                              onClick={() => printReceipt(payment, order)}
                            >
                              <Printer size={16} /> Imprimer le reçu
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {section === "expenses" && (
            <>
              <h2 className="section-heading">Dépenses</h2>
              <div className="summary-grid">
                <div className="summary-card">
                  <p>Total des dépenses</p>
                  <h2>{money(totalExpenses)}</h2>
                </div>
                <div className="summary-card summary-gold">
                  <p>Solde actuel</p>
                  <h2>{money(balance)}</h2>
                </div>
              </div>

              <form className="card section-gap" onSubmit={saveExpense}>
                <h3 className="card-title"><Receipt size={18} /> Ajouter une dépense</h3>
                <div className="form-grid">
                  <Field label="Description">
                    <input className="input" value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} required />
                  </Field>
                  <Field label="Montant (FCFA)">
                    <input className="input" type="number" min="1" step="1" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required />
                  </Field>
                  <Field label="Date">
                    <input className="input" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
                  </Field>
                </div>
                <button className="btn btn-primary" disabled={saving}><Plus size={17} /> Enregistrer la dépense</button>
              </form>

              <div className="card section-gap">
                <h3 className="card-title">Historique des dépenses</h3>
                {expenses.length === 0 ? (
                  <p className="empty-text">Aucune dépense enregistrée.</p>
                ) : (
                  <div className="row-list">
                    {expenses.map((expense) => (
                      <div key={expense.id} className="row-item">
                        <div className="row-main">
                          <strong>{expense.description}</strong>
                          <div className="row-meta">
                            <span className="price price-expense">{money(expense.montant)}</span>
                            <small>{dateText(expense.date_depense)}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {section === "settings" && (
            <>
              <h2 className="section-heading">Identité de la marque</h2>
              <form className="card settings-card" onSubmit={saveBrand}>
                <Field label="Nom de la marque">
                  <input className="input" value={brandName} onChange={(event) => setBrandName(event.target.value)} required />
                </Field>
                <Field label="Slogan">
                  <input className="input" value={brandSlogan} onChange={(event) => setBrandSlogan(event.target.value)} />
                </Field>
                <Field label="Chemin du logo (adresse publique ou chemin de stockage)">
                  <input className="input" value={brandLogo} onChange={(event) => setBrandLogo(event.target.value)} placeholder="Adresse du logo" />
                </Field>
                {brandLogo && (
                  <div className="logo-preview">
                    <p>Aperçu du logo</p>
                    <img src={brandLogo} alt="Logo BAOBAB DIGITAL" />
                  </div>
                )}
                <button className="btn btn-primary" disabled={saving}>
                  <Save size={17} /> Enregistrer les paramètres
                </button>
              </form>
              <Notice>
                Le champ du logo accepte actuellement une adresse ou un chemin existant. Le téléversement sécurisé du fichier logo sera ajouté séparément.
              </Notice>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
