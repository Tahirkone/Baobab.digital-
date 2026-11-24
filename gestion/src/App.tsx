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
  Download,
  MessageCircle,
  Upload,
  Clock,
  TrendingUp,
  Archive,
  ArchiveRestore,
  Bell,
  MonitorCog,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import PublicRequest from "./PublicRequest";
import ClientAppearance from "./ClientAppearance";

type Section =
  | "dashboard"
  | "orders"
  | "messages"
  | "clients"
  | "services"
  | "payments"
  | "expenses"
  | "settings"
  | "client_design";

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
  archived_at?: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  indicative_price: number;
  is_active: boolean;
  icon_url: string | null;
};

type Payment = {
  id: string;
  ordre_id: string;
  methode: string;
  montant: number;
  statut: string;
  reference_transaction: string | null;
  confirme_le: string | null;
  motif_refus?: string | null;
  refuse_le?: string | null;
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

type OrderFileAdmin = {
  id: string;
  ordre_id: string;
  nom_fichier: string;
  chemin_stockage: string;
  type_fichier: string;
  type_mime: string | null;
  created_at: string;
};

type OrderMessageAdmin = {
  id: string;
  ordre_id: string;
  expediteur: string;
  contenu: string | null;
  chemin_audio: string | null;
  created_at: string;
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
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "clients", label: "Clients", icon: Users },
  { id: "services", label: "Services", icon: BriefcaseBusiness },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "expenses", label: "Dépenses", icon: Receipt },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "client_design", label: "App Client", icon: MonitorCog },
] as const;

const titles: Record<Section, string> = {
  dashboard: "Tableau de bord",
  orders: "Commandes",
  messages: "Messages",
  clients: "Clients",
  services: "Services",
  payments: "Paiements",
  expenses: "Dépenses",
  settings: "Paramètres",
  client_design: "Personnaliser l’application Client",
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
  if (value === "echoue" || value === "refuse") return "badge-danger";
  return "badge-warning";
}

function paymentMethodText(value: string) {
  const labels: Record<string, string> = {
    especes: "Espèces",
    orange_money: "Orange Money",
    moov_money: "Moov Money",
    wave: "Wave",
    virement_bancaire: "Virement bancaire",
  };
  return labels[value] ?? value;
}

function BaobabIcon({ className }: { className?: string }) {
  return <img className={className} src="/icon.svg" alt="CYBER" />;
}

function browserNotify(title:string,body:string){if(typeof window==="undefined"||!("Notification" in window)||Notification.permission!=="granted")return;new Notification(title,{body,icon:"/favicon.ico"});}

function BrandMark({ logo, className }: { logo: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  if (logo && !failed) {
    return (
      <img
        className={className}
        src={logo}
        alt="Logo"
        onError={() => setFailed(true)}
      />
    );
  }

  return <BaobabIcon className={className} />;
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

async function optimizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choisis un fichier image.");
  }
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1200;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Impossible de préparer cette image.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => result ? resolve(result) : reject(new Error("La compression de l'image a échoué.")),
      "image/webp",
      0.84
    );
  });
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error("L'image reste trop volumineuse. Choisis une image plus légère.");
  }
  return new File([blob], "baobab-image.webp", {
    type: "image/webp",
    lastModified: Date.now(),
  });
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
  const [showArchivedClients, setShowArchivedClients] = useState(false);
  const [clientFormId, setClientFormId] = useState("");
  const [clientFormName, setClientFormName] = useState("");
  const [clientFormPhone, setClientFormPhone] = useState("");
  const [newOrderClientId, setNewOrderClientId] = useState("");
  const [newOrderMessage, setNewOrderMessage] = useState("");
  const [newOrderServices, setNewOrderServices] = useState<Record<string, number>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [orderFiles, setOrderFiles] = useState<OrderFileAdmin[]>([]);
  const [orderMessages, setOrderMessages] = useState<OrderMessageAdmin[]>([]);
  const [inboxMessages, setInboxMessages] = useState<OrderMessageAdmin[]>([]);
  const [inboxFiles, setInboxFiles] = useState<OrderFileAdmin[]>([]);
  const [messageSearch, setMessageSearch] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
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
  const [serviceIconUrl, setServiceIconUrl] = useState("");
  const [serviceIconFile, setServiceIconFile] = useState<File | null>(null);
  const [serviceIconRemoved, setServiceIconRemoved] = useState(false);
  const [serviceIconPreview, setServiceIconPreview] = useState("");
  const [brandLogoFile, setBrandLogoFile] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [refusingPaymentId, setRefusingPaymentId] = useState("");
  const [refusalReason, setRefusalReason] = useState("");
  const [brandName, setBrandName] = useState("CYBER");
  const [brandSlogan, setBrandSlogan] = useState("Vos documents, notre expertise digitale.");
  const [brandLogo, setBrandLogo] = useState("");
  const [notice, setNotice] = useState("");
  const [errorNotice, setErrorNotice] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationPermission,setNotificationPermission]=useState<NotificationPermission>(typeof Notification!=="undefined"?Notification.permission:"default");

  const selectedOrder = orders.find((item) => item.id === selectedOrderId);
  const inboxOrders = useMemo(() => {
    const grouped = new Map<string, { order: Order; last: OrderMessageAdmin; count: number }>();
    for (const item of inboxMessages) {
      const order = orders.find((candidate) => candidate.id === item.ordre_id);
      if (!order) continue;
      const current = grouped.get(order.id);
      if (!current) grouped.set(order.id, { order, last: item, count: 1 });
      else current.count += 1;
    }
    const value = messageSearch.trim().toLocaleLowerCase();
    return [...grouped.values()]
      .filter(({ order }) => !value || [order.nom_client, order.telephone_client, order.reference].some((v) => v?.toLocaleLowerCase().includes(value)))
      .sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
  }, [inboxMessages, orders, messageSearch]);
  const selectedDetails = details.filter(
    (item) => item.ordre_id === selectedOrderId
  );

  const visibleClients = clients.filter((client) => showArchivedClients ? Boolean(client.archived_at) : !client.archived_at);

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

  const monthlyFinance = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthPayments = confirmedPayments
        .filter((payment) => {
          const paymentDate = new Date(payment.confirme_le ?? payment.created_at);
          return `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}` === key;
        })
        .reduce((sum, payment) => sum + payment.montant, 0);
      const monthExpenses = expenses
        .filter((expense) => expense.date_depense.slice(0, 7) === key)
        .reduce((sum, expense) => sum + expense.montant, 0);
      return {
        key,
        label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
        revenue: monthPayments,
        expenses: monthExpenses,
      };
    });
  }, [confirmedPayments, expenses]);

  const monthlyMax = Math.max(
    1,
    ...monthlyFinance.flatMap((month) => [month.revenue, month.expenses])
  );

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
      inboxResult,
      inboxFilesResult,
    ] = await Promise.all([
      supabase.from("ordres").select("*").order("created_at", { ascending: false }),
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("*").order("created_at", { ascending: false }),
      supabase.from("paiements").select("*").order("created_at", { ascending: false }),
      supabase.from("depenses").select("*").order("date_depense", { ascending: false }),
      supabase.from("historique_commandes").select("*").order("date_modification", { ascending: false }),
      supabase.from("parametres_marque").select("*").limit(1).maybeSingle(),
      supabase.from("messages").select("*").order("created_at", { ascending: false }),
      supabase.from("fichiers_commandes").select("*").order("created_at", { ascending: false }),
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

    if (inboxResult.error) {
      errors.push("messages : " + inboxResult.error.message);
    } else {
      setInboxMessages((inboxResult.data ?? []) as OrderMessageAdmin[]);
    }
    if (inboxFilesResult.error) {
      errors.push("fichiers de conversation : " + inboxFilesResult.error.message);
    } else {
      setInboxFiles((inboxFilesResult.data ?? []) as OrderFileAdmin[]);
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

  async function loadOrderExtras(orderId: string) {
    const [filesResult, messagesResult] = await Promise.all([
      supabase.from("fichiers_commandes").select("*").eq("ordre_id", orderId).order("created_at", { ascending: true }),
      supabase.from("messages").select("*").eq("ordre_id", orderId).order("created_at", { ascending: true }),
    ]);
    if (filesResult.error || messagesResult.error) {
      showNotice("Impossible de charger les fichiers ou les messages de cette commande.", true);
      return;
    }
    setOrderFiles((filesResult.data ?? []) as OrderFileAdmin[]);
    setOrderMessages((messagesResult.data ?? []) as OrderMessageAdmin[]);
  }

  async function uploadOrderDeliverable(file: File) {
    if (!selectedOrder) return;
    if (file.size > 10 * 1024 * 1024) {
      showNotice("Le fichier dépasse la limite de 10 Mo.", true);
      return;
    }
    setSaving(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${selectedOrder.id}/deliverables/${Date.now()}-${safeName}`;
    try {
      const { error: uploadError } = await supabase.storage.from("baobab-client-files").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from("fichiers_commandes").insert({
        ordre_id: selectedOrder.id,
        nom_fichier: file.name,
        chemin_stockage: path,
        type_fichier: "livrable",
        type_mime: file.type || null,
      });
      if (rowError) {
        await supabase.storage.from("baobab-client-files").remove([path]);
        throw rowError;
      }
      await loadOrderExtras(selectedOrder.id);
      showNotice("Document final ajouté. Le client pourra le télécharger après confirmation du paiement intégral.");
    } catch (error) {
      showNotice("Envoi du document impossible : " + (error instanceof Error ? error.message : "erreur inconnue"), true);
    } finally {
      setSaving(false);
    }
  }

  async function sendAdminOrderMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrder || !adminMessage.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("messages").insert({
      ordre_id: selectedOrder.id,
      expediteur: "admin",
      contenu: adminMessage.trim(),
    });
    if (error) showNotice("Message non envoyé : " + error.message, true);
    else {
      setAdminMessage("");
      await loadOrderExtras(selectedOrder.id);
      showNotice("Message envoyé au client.");
    }
    setSaving(false);
  }

  async function openPrivateOrderFile(path: string) {
    const { data, error } = await supabase.storage.from("baobab-client-files").createSignedUrl(path, 300);
    if (error) {
      showNotice("Téléchargement impossible : " + error.message, true);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (!session || !isAdmin) return;
    const channel = supabase.channel("gestion-messages-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, async (payload) => {
        const changedMessage = payload.new as OrderMessageAdmin;
        if (payload.eventType === "INSERT" && changedMessage.expediteur === "client") {
          browserNotify("Nouveau message client", changedMessage.contenu || "Un client a envoyé un message vocal ou un fichier.");
          showNotice("Nouveau message reçu d'un client.");
        }
        const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
        if (data) setInboxMessages(data as OrderMessageAdmin[]);
        const changedOrderId = (payload.new as { ordre_id?: string } | null)?.ordre_id;
        if (changedOrderId && changedOrderId === selectedOrderId) {
          const { data: thread } = await supabase.from("messages").select("*").eq("ordre_id", changedOrderId).order("created_at", { ascending: true });
          if (thread) setOrderMessages(thread as OrderMessageAdmin[]);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "fichiers_commandes" }, async () => {
        const { data } = await supabase.from("fichiers_commandes").select("*").order("created_at", { ascending: false });
        if (data) setInboxFiles(data as OrderFileAdmin[]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ordres" }, (payload) => {
        const order = payload.new as Order;
        browserNotify("Nouvelle commande", (order.nom_client || "Un client") + " vient d'envoyer une commande.");
        showNotice("Nouvelle commande reçue.");
        loadAll().catch(() => {});
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "paiements" }, () => {
        browserNotify("Nouveau paiement à vérifier", "Un client vient d'enregistrer un paiement.");
        showNotice("Nouveau paiement à vérifier.");
        loadAll().catch(() => {});
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [session, isAdmin, selectedOrderId]);

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

  useEffect(() => {
    if (!brandLogo) return;
    const iconUrl = brandLogo.replace(/\\/brand\\/logo\\.webp(?:\\?.*)?$/, "/brand/app-icon.png");
    const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]') ?? document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.href = iconUrl;
    if (!appleIcon.parentNode) document.head.appendChild(appleIcon);

    const manifest = {
      name: brandName || "CYBER GESTION",
      short_name: "CYBER",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0F3D2E",
      icons: [{ src: iconUrl, sizes: "512x512", type: "image/png", purpose: "any maskable" }]
    };
    const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" }));
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousHref = manifestLink?.href;
    if (manifestLink) manifestLink.href = blobUrl;
    return () => {
      URL.revokeObjectURL(blobUrl);
      if (manifestLink && previousHref) manifestLink.href = previousHref;
    };
  }, [brandLogo, brandName]);

  useEffect(() => {
    if (!brandLogoFile) {
      setBrandLogoPreview("");
      return;
    }
    const url = URL.createObjectURL(brandLogoFile);
    setBrandLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [brandLogoFile]);

  useEffect(() => {
    if (!serviceIconFile) {
      setServiceIconPreview("");
      return;
    }
    const url = URL.createObjectURL(serviceIconFile);
    setServiceIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [serviceIconFile]);

  useEffect(() => {
    document.body.classList.toggle("menu-open", mobileMenu);
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, [mobileMenu]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenu(false);
    }
    function onResize() {
      if (window.innerWidth >= 992) setMobileMenu(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  async function enableNotifications(){if(!("Notification" in window)){showNotice("Les notifications ne sont pas prises en charge par ce navigateur.",true);return;}const permission=await Notification.requestPermission();setNotificationPermission(permission);showNotice(permission==="granted"?"Notifications activées sur cet appareil.":permission==="denied"?"Notifications bloquées. Autorise-les dans les réglages du navigateur.":"Autorisation des notifications non accordée.",permission!=="granted");}

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
    loadOrderExtras(order.id);
    setAdminMessage("");
  }

  function scrollToOrderDetail() {
    if (window.innerWidth >= 992) return;
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

  function editClient(client?: Client) {
    setClientFormId(client?.id ?? "");
    setClientFormName(client?.nom_complet ?? "");
    setClientFormPhone(client?.telephone ?? "");
    showNotice("");
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEditing = Boolean(clientFormId);
    const name = clientFormName.trim();
    const phone = clientFormPhone.trim();

    if (name.length < 2 || phone.length < 6) {
      showNotice("Saisis un nom et un numéro de téléphone valides.", true);
      return;
    }

    setSaving(true);
    const values = {
      nom_complet: name,
      telephone: phone,
      updated_at: new Date().toISOString(),
    };
    const result = clientFormId
      ? await supabase.from("clients").update(values).eq("id", clientFormId)
      : await supabase.from("clients").insert({
          nom_complet: name,
          telephone: phone,
        });

    if (result.error) {
      showNotice("Impossible d'enregistrer le client : " + result.error.message, true);
      setSaving(false);
      return;
    }

    editClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      showNotice("Client enregistré, mais actualisation impossible : " + error.message, true);
    } else {
      setClients((data ?? []) as Client[]);
      showNotice(isEditing ? "Client modifié." : "Client ajouté.");
    }
    setSaving(false);
  }

  async function toggleClientArchive(client: Client) {
    const archivedAt = client.archived_at ? null : new Date().toISOString();
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({ archived_at: archivedAt, updated_at: new Date().toISOString() })
      .eq("id", client.id);
    if (error) {
      showNotice("Impossible de modifier l’archivage du client : " + error.message, true);
    } else {
      setClients((previous) => previous.map((item) => item.id === client.id ? { ...item, archived_at: archivedAt } : item));
      showNotice(archivedAt ? "Client archivé. Son historique est conservé." : "Client restauré.");
    }
    setSaving(false);
  }

  function toggleNewOrderService(serviceId: string, checked: boolean) {
    setNewOrderServices((previous) => {
      const next = { ...previous };
      if (checked) next[serviceId] = Math.max(1, next[serviceId] ?? 1);
      else delete next[serviceId];
      return next;
    });
  }

  async function createManualOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = clients.find((item) => item.id === newOrderClientId);
    const chosenServices = services.filter(
      (item) => item.is_active && (newOrderServices[item.id] ?? 0) > 0
    );

    if (!client) {
      showNotice("Choisis un client pour cette commande.", true);
      return;
    }
    if (chosenServices.length === 0) {
      showNotice("Choisis au moins un service.", true);
      return;
    }

    const total = chosenServices.reduce(
      (sum, service) => sum + service.indicative_price * newOrderServices[service.id],
      0
    );
    if (!Number.isSafeInteger(total) || total <= 0) {
      showNotice("Le montant calculé est invalide.", true);
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    const reference = `BD-${Date.now().toString(36).toUpperCase()}-${suffix}`;
    const { data: createdOrder, error: orderError } = await supabase
      .from("ordres")
      .insert({
        reference,
        client_id: client.id,
        nom_client: client.nom_complet,
        telephone_client: client.telephone,
        montant_final: total,
        statut: "nouveau",
        statut_paiement: "impaye",
        option_paiement_espece: null,
        message_client: newOrderMessage.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (orderError || !createdOrder) {
      showNotice("Création de la commande impossible : " + (orderError?.message ?? "réponse vide"), true);
      setSaving(false);
      return;
    }

    const detailRows = chosenServices.map((service) => ({
      ordre_id: createdOrder.id,
      service_id: service.id,
      nom_service: service.name,
      prix_indicatif: service.indicative_price,
      quantite: newOrderServices[service.id],
    }));
    const { error: detailsError } = await supabase
      .from("details_commandes")
      .insert(detailRows);

    if (detailsError) {
      const { error: rollbackError } = await supabase
        .from("ordres")
        .delete()
        .eq("id", createdOrder.id);
      showNotice(
        "Les prestations n'ont pas pu être enregistrées : " +
          detailsError.message +
          (rollbackError ? " Attention : la commande créée n'a pas pu être annulée automatiquement." : " La commande incomplète a été annulée."),
        true
      );
      setSaving(false);
      return;
    }

    await supabase.from("historique_commandes").insert({
      ordre_id: createdOrder.id,
      ancien_statut: null,
      nouveau_statut: "nouveau",
      modifie_par: session?.user.email ?? "Administrateur",
    });

    setNewOrderClientId("");
    setNewOrderMessage("");
    setNewOrderServices({});
    const loaded = await loadAll();
    if (loaded) {
      setSelectedOrderId(createdOrder.id);
      setOrderAmount(String(total));
      setOrderStatus("nouveau");
      await loadOrderDetails(createdOrder.id);
      showNotice("Commande créée : " + reference);
    }
    setSaving(false);
  }

  function editService(service?: Service) {
    setServiceId(service?.id ?? "");
    setServiceName(service?.name ?? "");
    setServiceDescription(service?.description ?? "");
    setServicePrice(service ? String(service.indicative_price) : "");
    setServiceActive(service?.is_active ?? true);
    setServiceIconUrl(service?.icon_url ?? "");
    setServiceIconFile(null);
    setServiceIconRemoved(false);
    showNotice("");
  }

  async function saveService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const price = Number(servicePrice);

    if (/photocopie|photocopies|impression|impressions|imprimer|imprimante|imprimantes/i.test(serviceName) || !serviceName.trim() || !Number.isInteger(price) || price < 0) {
      showNotice(/photocopie|impression|imprimer|imprimante/i.test(serviceName) ? "Cette prestation ne fait pas partie du catalogue CYBER." : "Vérifie le nom et le tarif du service.", true);
      return;
    }

    setSaving(true);
    const id = serviceId || crypto.randomUUID();
    let iconUrl = serviceIconRemoved ? null : serviceIconUrl || null;

    try {
      if (serviceIconFile) {
        const optimized = await optimizeImageFile(serviceIconFile);
        const path = `services/${id}.webp`;
        const { error: uploadError } = await supabase.storage
          .from("baobab-assets")
          .upload(path, optimized, {
            cacheControl: "3600",
            contentType: "image/webp",
            upsert: true,
          });
        if (uploadError) throw uploadError;
        iconUrl = supabase.storage.from("baobab-assets").getPublicUrl(path).data.publicUrl;
      }

      const values = {
        name: serviceName.trim(),
        description: serviceDescription.trim() || null,
        indicative_price: price,
        is_active: serviceActive,
        icon_url: iconUrl,
        updated_at: new Date().toISOString(),
      };

      const result = serviceId
        ? await supabase.from("services").update(values).eq("id", serviceId)
        : await supabase.from("services").insert({ id, ...values });

      if (result.error) throw result.error;

      editService();
      const loaded = await loadAll();
      if (loaded) showNotice("Service enregistré.");
    } catch (saveError) {
      showNotice(
        "Impossible d'enregistrer le service ou son image : " +
          (saveError instanceof Error ? saveError.message : "erreur inconnue"),
        true
      );
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

    const { error } = await supabase.rpc("enregistrer_paiement", {
      p_ordre_id: order.id,
      p_methode: paymentMethod,
      p_montant: amount,
      p_reference_transaction:
        paymentMethod === "especes" ? null : transactionReference.trim() || null,
    });

    if (error) {
      showNotice("Erreur de paiement : " + error.message, true);
      setSaving(false);
      return;
    }

    setTransactionReference("");
    const loaded = await loadAll();

    if (loaded) {
      showNotice(
        paymentMethod === "especes"
          ? "Paiement en espèces enregistré et confirmé."
          : "Paiement enregistré en attente de vérification réelle par l'administrateur."
      );
    }

    setSaving(false);
  }

  async function confirmPayment(paymentId: string) {
    if (
      !window.confirm(
        "As-tu vérifié directement que l'argent est réellement arrivé sur le compte ou le portefeuille CYBER ? Ne confirme pas uniquement sur la base d'une capture d'écran ou d'un SMS."
      )
    ) {
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("confirmer_paiement", {
      p_paiement_id: paymentId,
    });

    if (error) {
      showNotice("Confirmation impossible : " + error.message, true);
      setSaving(false);
      return;
    }

    const loaded = await loadAll();
    if (loaded) showNotice("Paiement vérifié et confirmé. Le reçu peut maintenant être imprimé.");
    setSaving(false);
  }

  async function refusePayment(paymentId: string) {
    const reason = refusalReason.trim();

    if (reason.length < 5) {
      showNotice("Indique un motif de refus d'au moins 5 caractères.", true);
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("refuser_paiement", {
      p_paiement_id: paymentId,
      p_motif: reason,
    });

    if (error) {
      showNotice("Refus impossible : " + error.message, true);
      setSaving(false);
      return;
    }

    setRefusingPaymentId("");
    setRefusalReason("");
    const loaded = await loadAll();
    if (loaded) showNotice("Paiement refusé. Une nouvelle tentative pourra être enregistrée.");
    setSaving(false);
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!brandName.trim()) {
      showNotice("Le nom de la marque est obligatoire.", true);
      return;
    }

    setSaving(true);
    try {
      let logoToSave = brandLogo.trim() || null;
      if (brandLogoFile) {
        const optimized = await optimizeImageFile(brandLogoFile);
        const path = "brand/logo.webp";
        const { error: uploadError } = await supabase.storage
          .from("baobab-assets")
          .upload(path, optimized, {
            cacheControl: "3600",
            contentType: "image/webp",
            upsert: true,
          });
        if (uploadError) throw uploadError;
        logoToSave = supabase.storage.from("baobab-assets").getPublicUrl(path).data.publicUrl;

        const bitmap = await createImageBitmap(brandLogoFile);
        const iconCanvas = document.createElement("canvas");
        iconCanvas.width = 512;
        iconCanvas.height = 512;
        const iconContext = iconCanvas.getContext("2d");
        if (!iconContext) {
          bitmap.close();
          throw new Error("Impossible de préparer l'icône de l'application.");
        }
        iconContext.fillStyle = "#ffffff";
        iconContext.fillRect(0, 0, 512, 512);
        const scale = Math.min(440 / bitmap.width, 440 / bitmap.height);
        const width = bitmap.width * scale;
        const height = bitmap.height * scale;
        iconContext.drawImage(bitmap, (512 - width) / 2, (512 - height) / 2, width, height);
        bitmap.close();
        const iconBlob = await new Promise<Blob>((resolve, reject) => {
          iconCanvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("La création de l'icône PNG a échoué.")), "image/png");
        });
        const { error: iconUploadError } = await supabase.storage
          .from("baobab-assets")
          .upload("brand/app-icon.png", iconBlob, {
            cacheControl: "3600",
            contentType: "image/png",
            upsert: true,
          });
        if (iconUploadError) throw iconUploadError;
      }

      const values = {
        nom_marque: brandName.trim(),
        slogan: brandSlogan.trim() || null,
        chemin_logo: logoToSave,
        updated_at: new Date().toISOString(),
      };

      const result = brand
        ? await supabase.from("parametres_marque").update(values).eq("id", brand.id)
        : await supabase.from("parametres_marque").insert({ id: 1, ...values });

      if (result.error) throw result.error;
      setBrandLogo(logoToSave ?? "");
      setBrandLogoFile(null);
      const loaded = await loadAll();
      if (loaded) showNotice("Identité de la marque enregistrée.");
    } catch (saveError) {
      showNotice(
        "Impossible d'enregistrer le logo ou les paramètres : " +
          (saveError instanceof Error ? saveError.message : "erreur inconnue"),
        true
      );
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
      "<!doctype html><html lang='fr'><head><meta charset='UTF-8'><title>Reçu CYBER</title></head><body>Préparation du reçu...</body></html>"
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

    const logoHtml = brandLogo
      ? `<img class="logo" src="${safe(brandLogo)}" alt="" onerror="this.style.display='none'">`
      : "";

    receiptWindow.document.open();
    receiptWindow.document.write(`
      <!doctype html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Reçu CYBER</title>
        <style>
          *{box-sizing:border-box}
          body{font-family:Arial,Helvetica,sans-serif;color:#0F3D2E;margin:0;padding:20px;background:#f5f7f4}
          .receipt{max-width:600px;margin:auto;background:#fff;border:1px solid #ddd;border-top:8px solid #C9A227;padding:28px;border-radius:6px}
          .head{display:flex;align-items:center;gap:14px}
          .logo{width:64px;height:64px;object-fit:contain}
          h1{margin:0 0 4px;color:#0F3D2E;font-size:22px}
          h2{margin:0;font-size:18px;letter-spacing:1px}
          .muted{color:#666;font-size:13px;margin:0}
          hr{border:0;border-top:1px solid #ddd;margin:18px 0}
          p{margin:6px 0}
          .line{display:flex;justify-content:space-between;margin:12px 0;gap:20px}
          .line span{text-align:right;overflow-wrap:anywhere}
          .total{font-size:20px;font-weight:bold;color:#0F3D2E;background:#F6EBC4;padding:12px;border-radius:8px}
          .footer{text-align:center;margin-top:30px;font-size:12px;color:#666}
          .print-btn{display:block;width:100%;max-width:600px;margin:16px auto 0;padding:14px;border:0;border-radius:10px;background:#0F3D2E;color:#fff;font-size:16px;font-weight:bold}
          @page{size:A5;margin:10mm}
          @media print{body{padding:0;background:#fff}.receipt{border:0;border-top:8px solid #C9A227}.print-btn{display:none}}
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="head">
            ${logoHtml}
            <div>
              <h1>${safe(brandName)}</h1>
              <p class="muted">${safe(brandSlogan)}</p>
            </div>
          </div>
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
          <div class="line"><strong>Méthode</strong><span>${paymentMethodText(payment.methode)}</span></div>
          <div class="line"><strong>État</strong><span>Paiement confirmé</span></div>
          <hr>
          <p class="footer">Merci pour votre confiance.<br>${safe(brandName)}</p>
        </div>
        <button class="print-btn" onclick="window.print()">Imprimer / Enregistrer en PDF</button>
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
    window.scrollTo({ top: 0 });
  }

  if (window.location.pathname === "/demande" || window.location.pathname === "/demande/") {
    return <PublicRequest />;
  }

  if (loading) {
    return (
      <div className="loading">
        <BaobabIcon className="loading-icon" />
        <span>Chargement de CYBER...</span>
      </div>
    );
  }

  if (!session || !isAdmin) {
    return (
      <main className="login-page">
        <section className="login-card">
          <div className="login-logo">
            <BaobabIcon className="brand-mark" />
          </div>
          <h1>CYBER</h1>
          <p className="subtitle">Vos documents, notre expertise digitale.</p>
          <p className="login-intro">Espace de gestion sécurisé</p>
          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Adresse e-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Votre adresse e-mail"
              required
            />
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Votre mot de passe"
              required
            />
            <button
              type="submit"
              className="btn btn-primary btn-block btn-large"
              disabled={loading}
            >
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
      {mobileMenu && (
        <button
          type="button"
          className="menu-overlay"
          aria-label="Fermer le menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <BrandMark logo={brandLogo} className="brand-mark" />
          </div>
          <div className="brand-name">
            <strong>{brandName}</strong>
            <span>Espace de gestion</span>
          </div>
          <button
            type="button"
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
                type="button"
                key={item.id}
                className={section === item.id ? `nav-item nav-item-${item.id} active` : `nav-item nav-item-${item.id}`}
                aria-current={section === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <Icon size={20} className="nav-icon" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button type="button" className="sidebar-logout" onClick={logout}>
          <LogOut size={20} />
          Déconnexion
        </button>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
          <div className="topbar-title">
            <h1>{titles[section]}</h1>
            <p>{brandSlogan}</p>
          </div>
          <button type="button" className="refresh-button" onClick={enableNotifications} title={notificationPermission==="granted"?"Alertes activées":"Activer les alertes"} aria-label="Activer les notifications">
            <Bell size={18} />
            <span>{notificationPermission==="granted"?"Alertes activées":"Activer les alertes"}</span>
          </button>
          <button
            type="button"
            className="refresh-button"
            onClick={refresh}
            disabled={saving}
            aria-label="Actualiser les données"
          >
            <RefreshCw size={18} className={saving ? "spin" : ""} />
            <span>Actualiser</span>
          </button>
        </header>

        <div className="dashboard-content">
          {notice && <Notice error={errorNotice}>{notice}</Notice>}

          {section === "dashboard" && (
            <>
              <div className="welcome-card">
                <div className="welcome-content">
                  <div className="welcome-text">
                    <span className="welcome-tag">ESPACE ADMINISTRATEUR</span>
                    <h2>Bienvenue dans {brandName} !</h2>
                    <p>{brandSlogan}</p>
                  </div>
                  <div className="welcome-badge">
                    <BrandMark logo={brandLogo} className="baobab-tree" />
                  </div>
                </div>
              </div>

              <h2 className="section-heading">Actions rapides</h2>
              <div className="quick-grid">
                <button type="button" className="quick-tile" onClick={() => navigate("orders")}>
                  <span className="quick-icon quick-icon-orders"><ShoppingBag size={24} /></span>
                  <span>Voir les commandes</span>
                </button>
                <button type="button" className="quick-tile" onClick={() => navigate("payments")}>
                  <span className="quick-icon quick-icon-payments"><CreditCard size={24} /></span>
                  <span>Enregistrer un paiement</span>
                </button>
                <button type="button" className="quick-tile" onClick={() => navigate("expenses")}>
                  <span className="quick-icon quick-icon-expenses"><Receipt size={24} /></span>
                  <span>Ajouter une dépense</span>
                </button>
                <button type="button" className="quick-tile" onClick={() => navigate("services")}>
                  <span className="quick-icon quick-icon-services"><BriefcaseBusiness size={24} /></span>
                  <span>Gérer les services</span>
                </button>
              </div>

              <h2 className="section-heading">Mon argent</h2>
              <div className="finance-grid">
                <article className="finance-card finance-in">
                  <div className="finance-icon finance-icon-revenue"><TrendingUp size={22} /></div>
                  <p>Recettes encaissées</p>
                  <strong>{money(revenue)}</strong>
                </article>
                <article className="finance-card finance-out">
                  <div className="finance-icon finance-icon-expenses"><Receipt size={22} /></div>
                  <p>Dépenses</p>
                  <strong>{money(totalExpenses)}</strong>
                </article>
                <article
                  className={
                    balance < 0
                      ? "finance-card finance-balance negative"
                      : "finance-card finance-balance"
                  }
                >
                  <div className="finance-icon finance-icon-balance"><Wallet size={22} /></div>
                  <p>Solde</p>
                  <strong>{money(balance)}</strong>
                </article>
              </div>

              <div className="card finance-chart-card">
                <div className="finance-chart-heading">
                  <div>
                    <h3 className="card-title">Évolution financière</h3>
                    <p className="card-subtitle">Recettes encaissées et dépenses — 6 derniers mois</p>
                  </div>
                  <span className="finance-chart-unit">FCFA</span>
                </div>
                <div className="finance-chart-legend">
                  <span><i className="legend-dot legend-revenue" /> Recettes</span>
                  <span><i className="legend-dot legend-expenses" /> Dépenses</span>
                </div>
                <div className="finance-chart" role="img" aria-label="Graphique comparant les recettes encaissées et les dépenses des six derniers mois">
                  {monthlyFinance.map((month) => (
                    <div className="finance-chart-month" key={month.key}>
                      <div className="finance-chart-bars">
                        <div className="finance-bar-slot">
                          <span className="finance-bar-value">{month.revenue > 0 ? new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(month.revenue) : ""}</span>
                          <div className="finance-bar finance-bar-revenue" style={{ height: `${month.revenue > 0 ? Math.max(5, (month.revenue / monthlyMax) * 100) : 2}%` }} />
                        </div>
                        <div className="finance-bar-slot">
                          <span className="finance-bar-value">{month.expenses > 0 ? new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(month.expenses) : ""}</span>
                          <div className="finance-bar finance-bar-expenses" style={{ height: `${month.expenses > 0 ? Math.max(5, (month.expenses / monthlyMax) * 100) : 2}%` }} />
                        </div>
                      </div>
                      <span className="finance-chart-label">{month.label}</span>
                    </div>
                  ))}
                </div>
                <p className="finance-chart-note">Les recettes sont calculées uniquement à partir des paiements confirmés.</p>
              </div>

              <h2 className="section-heading">Mon activité</h2>
              <div className="stats-grid">
                {[
                  { label: "Commandes", value: orders.length, icon: ShoppingBag },
                  { label: "Clients", value: clients.length, icon: Users },
                  { label: "Services actifs", value: services.filter((item) => item.is_active).length, icon: BriefcaseBusiness },
                  { label: "Paiements confirmés", value: confirmedPayments.length, icon: CheckCircle2 },
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
                  <button type="button" className="watch-item" onClick={() => navigate("orders")}>
                    <span>Commandes non payées</span>
                    <strong>{orders.filter((item) => item.statut_paiement === "impaye").length}</strong>
                  </button>
                  <button type="button" className="watch-item" onClick={() => navigate("payments")}>
                    <span>Paiements en attente</span>
                    <strong>{payments.filter((item) => item.statut === "en_attente").length}</strong>
                  </button>
                  <button type="button" className="watch-item" onClick={() => navigate("orders")}>
                    <span>Commandes en cours</span>
                    <strong>{orders.filter((item) => item.statut === "en_cours").length}</strong>
                  </button>
                </div>
              </div>
            </>
          )}

          {section === "messages" && (
            <section className="inbox-page" aria-label="Messagerie des clients">
              <div className="inbox-heading">
                <div><h2 className="section-heading">Boîte de réception</h2><p>Échange directement avec tes clients, comme dans une messagerie.</p></div>
                <span className="inbox-total">{inboxOrders.length} conversation{inboxOrders.length > 1 ? "s" : ""}</span>
              </div>
              <div className="inbox-layout">
                <aside className="inbox-list card">
                  <label className="inbox-search"><Search size={18}/><input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Rechercher un client…" /></label>
                  {inboxOrders.length === 0 ? <p className="empty-text inbox-empty">Aucune conversation pour le moment. Les messages des clients apparaîtront ici.</p> : inboxOrders.map(({ order, last, count }) => (
                    <button type="button" key={order.id} className={selectedOrderId === order.id ? "inbox-contact active" : "inbox-contact"} onClick={() => { openOrder(order); }}>
                      <span className="inbox-avatar">{order.nom_client.trim().charAt(0).toLocaleUpperCase() || "C"}</span>
                      <span className="inbox-contact-copy"><strong>{order.nom_client}</strong><small>{last.contenu || (last.chemin_audio ? "🎤 Message vocal" : "Pièce jointe")}</small><small>{order.reference}</small></span>
                      <span className="inbox-contact-meta"><small>{new Date(last.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}</small><i>{count}</i></span>
                    </button>
                  ))}
                </aside>
                <section className="inbox-thread card">
                  {!selectedOrder ? <div className="inbox-welcome"><MessageCircle size={42}/><h3>Ta messagerie CYBER</h3><p>Sélectionne une conversation à gauche pour lire les messages et répondre au client.</p></div> : <>
                    <header className="inbox-thread-head"><span className="inbox-avatar">{selectedOrder.nom_client.trim().charAt(0).toLocaleUpperCase() || "C"}</span><div><strong>{selectedOrder.nom_client}</strong><small>{selectedOrder.telephone_client} · Commande {selectedOrder.reference}</small></div><button type="button" className="btn btn-secondary btn-small" onClick={() => navigate("orders")}>Voir commande</button></header>
                    <div className="inbox-thread-body">
                      {orderMessages.length === 0 && !inboxFiles.some((file) => file.ordre_id === selectedOrderId && file.type_fichier !== "livrable") ? <p className="empty-text">Aucun message dans cette conversation.</p> : <>{orderMessages.map((item) => <div className={item.expediteur === "admin" ? "admin-chat-message admin" : "admin-chat-message client"} key={item.id}><small>{item.expediteur === "admin" ? "CYBER" : "Client"} · {dateText(item.created_at)}</small>{item.contenu && <p>{item.contenu}</p>}{item.chemin_audio && <button type="button" className="btn btn-secondary btn-small" onClick={() => openPrivateOrderFile(item.chemin_audio!)}>Écouter le vocal</button>}</div>)}{inboxFiles.filter((file) => file.ordre_id === selectedOrderId && file.type_fichier !== "livrable").map((file) => <div className="admin-chat-message client" key={"file-"+file.id}><small>Document envoyé · {dateText(file.created_at)}</small><p>📎 {file.nom_fichier}</p><button type="button" className="btn btn-secondary btn-small" onClick={() => openPrivateOrderFile(file.chemin_stockage)}>Ouvrir le document</button></div>)}</>}
                    </div>
                    <form className="inbox-compose" onSubmit={sendAdminOrderMessage}><textarea className="input" value={adminMessage} onChange={(event) => setAdminMessage(event.target.value)} placeholder="Écrire un message…" maxLength={2000}/><button className="btn btn-primary" disabled={saving || !adminMessage.trim()}><MessageCircle size={17}/> Envoyer</button></form>
                  </>}
                </section>
              </div>
            </section>
          )}

          {section === "orders" && (
            <>
              <h2 className="section-heading">Commandes des clients</h2>
              <form className="card section-gap" onSubmit={createManualOrder}>
                <h3 className="card-title"><Plus size={18} /> Créer une commande manuellement</h3>
                <div className="form-grid">
                  <Field label="Client">
                    <select className="input" value={newOrderClientId} onChange={(event) => setNewOrderClientId(event.target.value)} required>
                      <option value="">Choisir un client</option>
                      {clients.filter((client) => !client.archived_at).map((client) => (
                        <option key={client.id} value={client.id}>{client.nom_complet} — {client.telephone}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Message / consigne (facultatif)">
                    <input className="input" value={newOrderMessage} onChange={(event) => setNewOrderMessage(event.target.value)} placeholder="Précisions sur la demande" />
                  </Field>
                </div>
                <h4 className="sub-title">Prestations à inclure</h4>
                {services.filter((item) => item.is_active).length === 0 ? (
                  <p className="empty-text">Ajoute d'abord un service actif dans le menu Services.</p>
                ) : (
                  <div className="row-list">
                    {services.filter((item) => item.is_active).map((service) => {
                      const quantity = newOrderServices[service.id] ?? 0;
                      return (
                        <div className="row-item" key={service.id}>
                          <label className="checkbox-row service-choice-row">
                            {service.icon_url && <img className="service-thumb" src={service.icon_url} alt="" />}
                            <input type="checkbox" checked={quantity > 0} onChange={(event) => toggleNewOrderService(service.id, event.target.checked)} />
                            <span><strong>{service.name}</strong> — {money(service.indicative_price)}</span>
                          </label>
                          {quantity > 0 && (
                            <Field label="Quantité">
                              <input className="input" type="number" min="1" step="1" value={quantity} onChange={(event) => setNewOrderServices((previous) => ({ ...previous, [service.id]: Math.max(1, Math.floor(Number(event.target.value) || 1)) }))} />
                            </Field>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="help-text">Total calculé : <strong>{money(services.reduce((sum, service) => sum + service.indicative_price * (newOrderServices[service.id] ?? 0), 0))}</strong>. Le montant pourra être ajusté dans les détails après création, avant paiement.</p>
                <button className="btn btn-primary btn-large" disabled={saving || !clients.some((client) => !client.archived_at) || !services.some((item) => item.is_active)}>
                  <Plus size={18} /> Créer la commande
                </button>
                {!clients.some((client) => !client.archived_at) && <p className="help-text">Ajoute d'abord un client actif dans le menu Clients.</p>}
              </form>
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
                  <div className="card" id="order-list">
                    <h3 className="card-title">Liste des commandes ({filteredOrders.length})</h3>
                    <div className="order-list">
                      {filteredOrders.map((order) => (
                        <button
                          type="button"
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
                        <button
                          type="button"
                          className="btn btn-secondary btn-small back-to-list"
                          onClick={() =>
                            document
                              .getElementById("order-list")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }
                        >
                          ↑ Retour à la liste
                        </button>
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
                            <strong>Message initial du client</strong>
                            <p>{selectedOrder.message_client}</p>
                          </div>
                        )}

                        <hr />
                        <h4 className="sub-title">Fichiers du client et documents à livrer</h4>
                        <label className="btn btn-secondary btn-small admin-file-upload">
                          <Upload size={16} /> Ajouter un document final
                          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" disabled={saving} onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) void uploadOrderDeliverable(file);
                            event.currentTarget.value = "";
                          }} />
                        </label>
                        <p className="help-text">Les documents finaux restent privés et ne deviennent téléchargeables par le client qu'après confirmation du paiement intégral.</p>
                        {orderFiles.length === 0 ? <p className="empty-text">Aucun fichier joint à cette commande.</p> : (
                          <div className="admin-order-files">
                            {orderFiles.map((file) => (
                              <div className="admin-order-file" key={file.id}>
                                <span><strong>{file.nom_fichier}</strong><small>{file.type_fichier === "livrable" ? "Document final" : file.type_fichier === "preuve_paiement" ? "Preuve de paiement" : "Fichier original"}</small></span>
                                <button type="button" className="btn btn-secondary btn-small" onClick={() => openPrivateOrderFile(file.chemin_stockage)}><Download size={15} /> Ouvrir</button>
                              </div>
                            ))}
                          </div>
                        )}

                        <h4 className="sub-title"><MessageCircle size={16} /> Conversation avec le client</h4>
                        <div className="admin-order-chat">
                          {orderMessages.length === 0 ? <p className="empty-text">Aucun message pour le moment.</p> : orderMessages.map((item) => (
                            <div className={item.expediteur === "admin" ? "admin-chat-message admin" : "admin-chat-message client"} key={item.id}>
                              <small>{item.expediteur === "admin" ? "CYBER" : "Client"} · {dateText(item.created_at)}</small>
                              {item.contenu && <p>{item.contenu}</p>}
                              {item.chemin_audio && <button type="button" className="btn btn-secondary btn-small" onClick={() => openPrivateOrderFile(item.chemin_audio!)}>Écouter le vocal</button>}
                            </div>
                          ))}
                        </div>
                        <form className="admin-chat-form" onSubmit={sendAdminOrderMessage}>
                          <textarea className="input" value={adminMessage} onChange={(event) => setAdminMessage(event.target.value)} placeholder="Répondre au client…" maxLength={2000} />
                          <button className="btn btn-primary btn-small" disabled={saving || !adminMessage.trim()}><MessageCircle size={15} /> Envoyer</button>
                        </form>

                        <hr />
                        <Field label="Montant final (FCFA)">
                          <input
                            className="input"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={orderAmount}
                            onChange={(event) => setOrderAmount(event.target.value)}
                            disabled={selectedOrder.statut_paiement === "paye"}
                          />
                        </Field>
                        {selectedOrder.statut_paiement === "paye" && (
                          <p className="help-text">
                            Le montant final est verrouillé parce que cette commande est déjà payée.
                          </p>
                        )}

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
                          type="button"
                          className="btn btn-primary btn-block btn-large"
                          onClick={saveOrder}
                          disabled={saving}
                        >
                          <Save size={18} /> Enregistrer
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
              <div className="section-heading-row">
                <h2 className="section-heading">Liste des clients</h2>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setShowArchivedClients((value) => !value)}>
                  {showArchivedClients ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  {showArchivedClients ? "Voir les clients actifs" : "Voir les archives"}
                </button>
              </div>
              <div className="two-columns">
                <form className="card" onSubmit={saveClient}>
                  <h3 className="card-title">{clientFormId ? "Modifier le client" : "Ajouter un client"}</h3>
                  <Field label="Nom complet">
                    <input className="input" value={clientFormName} onChange={(event) => setClientFormName(event.target.value)} required minLength={2} />
                  </Field>
                  <Field label="Téléphone">
                    <input className="input" type="tel" inputMode="tel" value={clientFormPhone} onChange={(event) => setClientFormPhone(event.target.value)} required minLength={6} />
                  </Field>
                  <div className="btn-row">
                    <button className="btn btn-primary btn-large" disabled={saving}><Save size={18} /> {clientFormId ? "Enregistrer" : "Ajouter le client"}</button>
                    {clientFormId && <button type="button" className="btn btn-secondary btn-large" onClick={() => editClient()}>Annuler</button>}
                  </div>
                </form>
                <div className="card">
                  <p className="card-subtitle">
                    {showArchivedClients ? "Archives" : "Clients actifs"} : {visibleClients.length}
                    {" · "}{clients.filter((client) => Boolean(client.archived_at)).length} archivé(s)
                  </p>
                {visibleClients.length === 0 ? (
                  <p className="empty-text">{showArchivedClients ? "Aucun client archivé." : "Aucun client actif pour le moment."}</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Nom</th>
                          <th>Téléphone</th>
                          <th>Commandes</th>
                          <th>Inscription</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleClients.map((client) => (
                          <tr key={client.id}>
                            <td data-label="Nom"><strong>{client.nom_complet}</strong>{client.archived_at && <span className="badge badge-neutral">Archivé</span>}</td>
                            <td data-label="Téléphone">{client.telephone}</td>
                            <td data-label="Commandes">{orders.filter((order) => order.client_id === client.id).length}</td>
                            <td data-label="Inscription">{dateText(client.created_at)}</td>
                            <td data-label="Action"><div className="btn-row"><button type="button" className="btn btn-secondary btn-small" onClick={() => editClient(client)}>Modifier</button><button type="button" className={client.archived_at ? "btn btn-success btn-small" : "btn btn-danger btn-small"} onClick={() => toggleClientArchive(client)} disabled={saving}>{client.archived_at ? "Restaurer" : "Archiver"}</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
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
                  <Field label="Icône ou image du service (facultatif)">
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setServiceIconFile(file);
                        if (file) setServiceIconRemoved(false);
                      }}
                    />
                  </Field>
                  {(serviceIconPreview || (!serviceIconRemoved && serviceIconUrl)) && (
                    <div className="image-upload-preview">
                      <img src={serviceIconPreview || serviceIconUrl} alt="Aperçu de l'icône du service" />
                      <button type="button" className="btn btn-secondary btn-small" onClick={() => {
                        setServiceIconFile(null);
                        setServiceIconUrl("");
                        setServiceIconRemoved(true);
                      }}>Retirer l'image</button>
                    </div>
                  )}
                  <Field label="Tarif indicatif (FCFA)">
                    <input className="input" type="number" inputMode="numeric" min="0" step="1" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} required />
                  </Field>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={serviceActive} onChange={(event) => setServiceActive(event.target.checked)} />
                    Service actif
                  </label>
                  <div className="btn-row">
                    <button className="btn btn-primary btn-large" disabled={saving}><Save size={18} /> Enregistrer</button>
                    {serviceId && (
                      <button type="button" className="btn btn-secondary btn-large" onClick={() => editService()}>Annuler</button>
                    )}
                  </div>
                </form>

                <div className="card">
                  <h3 className="card-title">Services existants ({services.length})</h3>
                  <div className="row-list">
                    {services.map((service) => (
                      <div key={service.id} className="row-item">
                        <div className="row-main service-row-main">
                          {service.icon_url && <img className="service-thumb service-thumb-large" src={service.icon_url} alt="" />}
                          <div>
                            <strong>{service.name}</strong>
                            {service.description && <p>{service.description}</p>}
                          </div>
                          <div className="row-meta">
                            <span className="price">{money(service.indicative_price)}</span>
                            <span className={`badge ${service.is_active ? "badge-success" : "badge-neutral"}`}>
                              {service.is_active ? "Actif" : "Désactivé"}
                            </span>
                          </div>
                        </div>
                        <div className="btn-row">
                          <button type="button" className="btn btn-secondary btn-small" onClick={() => editService(service)}>Modifier</button>
                          <button
                            type="button"
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
                    <input className="input" type="number" inputMode="numeric" min="1" step="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} required />
                  </Field>

                  <Field label="Méthode">
                    <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                      <option value="especes">Espèces</option>
                      <option value="orange_money">Orange Money</option>
                      <option value="moov_money">Moov Money</option>
                      <option value="wave">Wave</option>
                      <option value="virement_bancaire">Virement bancaire</option>
                    </select>
                  </Field>

                  {paymentMethod !== "especes" && (
                    <Field label="Référence de transaction (facultative)">
                      <input
                        className="input"
                        value={transactionReference}
                        onChange={(event) => setTransactionReference(event.target.value)}
                        placeholder="Référence de transaction"
                      />
                    </Field>
                  )}
                </div>

                <button className="btn btn-primary btn-large" disabled={saving}>
                  <Plus size={18} /> Enregistrer le paiement
                </button>
                <p className="help-text">
                  Les espèces sont confirmées à l'enregistrement. Les paiements électroniques restent en attente : vérifie le crédit réel sur le compte avant de les confirmer. Une capture d'écran ou un SMS ne suffit pas à prouver le paiement.
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
                                {paymentMethodText(payment.methode)}
                              </span>
                              <span className={`badge ${paymentTone(payment.statut)}`}>
                                {payment.statut === "confirme"
                                  ? "Confirmé"
                                  : payment.statut === "refuse"
                                    ? "Refusé"
                                    : payment.statut === "echoue"
                                      ? "Échoué"
                                      : "En attente"}
                              </span>
                            </div>
                            {payment.reference_transaction && (
                              <p>Référence : {payment.reference_transaction}</p>
                            )}
                            {payment.statut === "refuse" && payment.motif_refus && (
                              <p className="error-message">Motif du refus : {payment.motif_refus}</p>
                            )}
                          </div>
                          <div className="btn-row">
                            {payment.statut === "en_attente" && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-success btn-small"
                                  onClick={() => confirmPayment(payment.id)}
                                  disabled={saving}
                                >
                                  <CheckCircle2 size={16} /> Confirmer
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger btn-small"
                                  onClick={() => {
                                    setRefusingPaymentId(payment.id);
                                    setRefusalReason("");
                                  }}
                                  disabled={saving}
                                >
                                  Refuser
                                </button>
                              </>
                            )}
                            {payment.statut === "confirme" && order && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-small"
                                onClick={() => printReceipt(payment, order)}
                              >
                                <Printer size={16} /> Imprimer le reçu
                              </button>
                            )}
                          </div>
                          {refusingPaymentId === payment.id && (
                            <div className="field">
                              <label htmlFor={`payment-refusal-${payment.id}`}>Motif du refus (obligatoire)</label>
                              <textarea
                                id={`payment-refusal-${payment.id}`}
                                className="input"
                                rows={2}
                                maxLength={500}
                                value={refusalReason}
                                onChange={(event) => setRefusalReason(event.target.value)}
                                placeholder="Ex. : transaction introuvable sur le compte."
                              />
                              <div className="btn-row">
                                <button
                                  type="button"
                                  className="btn btn-danger btn-small"
                                  onClick={() => refusePayment(payment.id)}
                                  disabled={saving || refusalReason.trim().length < 5}
                                >
                                  Confirmer le refus
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-small"
                                  onClick={() => {
                                    setRefusingPaymentId("");
                                    setRefusalReason("");
                                  }}
                                  disabled={saving}
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
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
                    <input className="input" type="number" inputMode="numeric" min="1" step="1" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required />
                  </Field>
                  <Field label="Date">
                    <input className="input" type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required />
                  </Field>
                </div>
                <button className="btn btn-primary btn-large" disabled={saving}><Plus size={18} /> Enregistrer la dépense</button>
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

          {section === "client_design" && <ClientAppearance />}

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
                <Field label="Importer le logo depuis le téléphone ou l'ordinateur">
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setBrandLogoFile(event.target.files?.[0] ?? null)}
                  />
                </Field>
                {(brandLogoPreview || brandLogo) && (
                  <div className="logo-preview">
                    <p>Aperçu du logo</p>
                    <img src={brandLogoPreview || brandLogo} alt="Logo CYBER" />
                  </div>
                )}
                <p className="help-text">L'image est automatiquement optimisée avant son enregistrement.</p>
                <button className="btn btn-primary btn-large" disabled={saving}>
                  <Save size={18} /> Enregistrer les paramètres
                </button>
              </form>
              <Notice>
                Formats acceptés selon la galerie : image. Le logo et les icônes sont optimisés puis enregistrés dans l'espace de stockage CYBER.
              </Notice>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
