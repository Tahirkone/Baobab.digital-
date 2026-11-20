import { useEffect, useState } from "react";
import { ImagePlus, MonitorSmartphone, Save, Sparkles } from "lucide-react";
import { supabase } from "./lib/supabase";

type Appearance = {
  id: number;
  hero_title: string;
  hero_highlight: string;
  hero_description: string;
  hero_image_url: string | null;
  hero_image_alt: string;
  cta_label: string;
  primary_color: string;
  accent_color: string;
  page_background: string;
  card_style: "rounded" | "soft" | "square";
  layout_variant: "split" | "centered" | "minimal";
  show_services: boolean;
  show_process: boolean;
  show_contact: boolean;
};

const defaults: Appearance = {
  id: 1,
  hero_title: "Vos démarches,",
  hero_highlight: "plus simples.",
  hero_description: "Commande tes documents et prestations en quelques étapes, directement depuis ton téléphone.",
  hero_image_url: null,
  hero_image_alt: "Présentation des services SUGUMA",
  cta_label: "Découvrir nos services",
  primary_color: "#075B3B",
  accent_color: "#F59A19",
  page_background: "#F7F8F5",
  card_style: "rounded",
  layout_variant: "split",
  show_services: true,
  show_process: true,
  show_contact: true,
};

const fieldStyle: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1px solid #dce5dd", borderRadius: 9, background: "#fff", color: "#203027", font: "inherit" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#33443a", fontSize: 13, fontWeight: 600 };

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Choisis un fichier image.");
  if (file.size > 12 * 1024 * 1024) throw new Error("Image trop lourde : maximum 12 Mo.");
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Optimisation impossible.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image illisible.")), "image/webp", 0.84));
    return new File([blob], "suguma-client-hero.webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export default function ClientAppearance() {
  const [value, setValue] = useState<Appearance>(defaults);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("suguma_client_appearance").select("*").eq("id", 1).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (data) setValue({ ...defaults, ...data } as Appearance);
      if (error) setFeedback("Chargement des réglages impossible : " + error.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function change<K extends keyof Appearance>(key: K, next: Appearance[K]) {
    setValue(current => ({ ...current, [key]: next }));
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      let imageUrl = value.hero_image_url;
      if (file) {
        const optimized = await optimizeImage(file);
        const extension = optimized.type === "image/webp" ? "webp" : (optimized.name.split(".").pop() || "img");
        const path = "client/hero-" + Date.now() + "." + extension;
        const { error: uploadError } = await supabase.storage.from("baobab-assets").upload(path, optimized, { contentType: optimized.type, cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        imageUrl = supabase.storage.from("baobab-assets").getPublicUrl(path).data.publicUrl;
      }
      const payload = { ...value, hero_image_url: imageUrl, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("suguma_client_appearance").upsert(payload, { onConflict: "id" });
      if (error) throw error;
      setValue(payload);
      setFile(null);
      setFeedback("Les réglages de SUGUMA CLIENT ont été enregistrés.");
    } catch (error) {
      setFeedback("Enregistrement impossible : " + (error instanceof Error ? error.message : "erreur inconnue"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card section-gap"><p>Chargement des réglages de l'application Client…</p></div>;

  return (
    <div className="section-gap" style={{ display: "grid", gap: 18 }}>
      <div>
        <h2 className="section-heading">Personnaliser SUGUMA CLIENT</h2>
        <p className="help-text">Modifie l'accueil, les images, les couleurs et la présentation. Les changements seront visibles dans l'application Client après actualisation.</p>
      </div>
      <form className="card" onSubmit={save} style={{ display: "grid", gap: 18 }}>
        <h3 className="card-title"><Sparkles size={18} /> Contenu de l'accueil</h3>
        <label style={labelStyle}>Titre principal<input style={fieldStyle} value={value.hero_title} maxLength={90} onChange={e => change("hero_title", e.target.value)} required /></label>
        <label style={labelStyle}>Texte mis en évidence<input style={fieldStyle} value={value.hero_highlight} maxLength={90} onChange={e => change("hero_highlight", e.target.value)} required /></label>
        <label style={labelStyle}>Description<textarea style={{ ...fieldStyle, minHeight: 90, resize: "vertical" }} value={value.hero_description} maxLength={500} onChange={e => change("hero_description", e.target.value)} /></label>
        <label style={labelStyle}>Texte du bouton principal<input style={fieldStyle} value={value.cta_label} maxLength={50} onChange={e => change("cta_label", e.target.value)} /></label>
        <label style={labelStyle}>Texte alternatif de l'image<input style={fieldStyle} value={value.hero_image_alt} maxLength={160} onChange={e => change("hero_image_alt", e.target.value)} /></label>
        <label style={labelStyle}><span><ImagePlus size={16} style={{ verticalAlign: "middle" }} /> Image principale de l'accueil</span><input style={fieldStyle} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>
        {(preview || value.hero_image_url) && <div style={{ display: "grid", gap: 8 }}><span className="help-text">Aperçu de l'image</span><img src={preview || value.hero_image_url || ""} alt="Aperçu de l'accueil Client" style={{ width: "100%", maxHeight: 260, objectFit: "cover", borderRadius: 12 }} /><button type="button" className="btn btn-secondary btn-small" onClick={() => { setFile(null); change("hero_image_url", null); }}>Retirer l'image (après enregistrement)</button></div>}
        <h3 className="card-title"><MonitorSmartphone size={18} /> Apparence et couleurs</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
          <label style={labelStyle}>Couleur principale<input style={{ ...fieldStyle, height: 46, padding: 4 }} type="color" value={value.primary_color} onChange={e => change("primary_color", e.target.value)} /></label>
          <label style={labelStyle}>Couleur d'accent<input style={{ ...fieldStyle, height: 46, padding: 4 }} type="color" value={value.accent_color} onChange={e => change("accent_color", e.target.value)} /></label>
          <label style={labelStyle}>Fond de l'application<input style={{ ...fieldStyle, height: 46, padding: 4 }} type="color" value={value.page_background} onChange={e => change("page_background", e.target.value)} /></label>
        </div>
        <label style={labelStyle}>Disposition de l'accueil<select style={fieldStyle} value={value.layout_variant} onChange={e => change("layout_variant", e.target.value as Appearance["layout_variant"])}><option value="split">Image à côté du texte</option><option value="centered">Contenu centré</option><option value="minimal">Présentation épurée</option></select></label>
        <label style={labelStyle}>Forme des cartes<select style={fieldStyle} value={value.card_style} onChange={e => change("card_style", e.target.value as Appearance["card_style"])}><option value="rounded">Arrondies</option><option value="soft">Douces</option><option value="square">Carrées</option></select></label>
        <h3 className="card-title">Sections visibles</h3>
        {([
          ["show_services", "Afficher les services"],
          ["show_process", "Afficher les étapes de commande"],
          ["show_contact", "Afficher la section de contact"],
        ] as const).map(([key, label]) => <label key={key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}><input type="checkbox" checked={value[key]} onChange={e => change(key, e.target.checked)} />{label}</label>)}
        <div style={{ border: "1px solid #e5ebe5", borderRadius: 12, padding: 14, background: value.page_background }}>
          <span className="help-text">Aperçu des couleurs</span>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}><span style={{ background: value.primary_color, color: "#fff", padding: "9px 14px", borderRadius: value.card_style === "square" ? 0 : 10 }}>Bouton principal</span><span style={{ background: value.accent_color, color: "#fff", padding: "9px 14px", borderRadius: value.card_style === "square" ? 0 : 10 }}>Accent</span></div>
        </div>
        {feedback && <p className={feedback.startsWith("Enregistrement impossible") || feedback.startsWith("Chargement") ? "error-message" : "notice"}>{feedback}</p>}
        <button className="btn btn-primary btn-large" disabled={saving}><Save size={18} /> {saving ? "Enregistrement…" : "Enregistrer les modifications"}</button>
      </form>
    </div>
  );
}
