import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, CheckCircle2, CircleUserRound, Download, FileText, Headphones, Home, LogOut, MessageCircle, MessagesSquare, Mic, Paperclip, Plus, Minus, Search, Send, ShieldCheck, ShoppingBag, Trash2, TreeDeciduous, Upload, UserRound, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Service={id:string;name:string;description:string|null;indicative_price:number;icon_url:string|null};
type Brand={nom_marque:string;slogan:string|null;chemin_logo:string|null};
type Appearance={hero_title:string;hero_highlight:string;hero_description:string;hero_image_url:string|null;hero_image_alt:string;cta_label:string;primary_color:string;accent_color:string;page_background:string;card_style:"rounded"|"soft"|"square";layout_variant:"split"|"centered"|"minimal";show_hero:boolean;show_services:boolean;show_process:boolean;show_contact:boolean;show_search:boolean};
const defaultAppearance:Appearance={hero_title:"Vos démarches,",hero_highlight:"plus simples.",hero_description:"Commande tes documents et prestations en quelques étapes, directement depuis ton téléphone.",hero_image_url:null,hero_image_alt:"Présentation des services CYBER",cta_label:"Découvrir nos services",primary_color:"#000000",accent_color:"#777777",page_background:"#FFFFFF",card_style:"rounded",layout_variant:"split",show_hero:true,show_services:true,show_process:true,show_contact:true,show_search:true};
const defaultHeroImage="https://greentickfoodsandfarms.com/assets/amara-CEzczK0S.png";
type Order={id:string;reference:string;nom_client:string;telephone_client:string;montant_final:number|null;statut:string;statut_paiement:string;message_client:string|null;created_at:string;option_paiement_espece:string|null};
type Detail={id:string;nom_service:string;prix_indicatif:number;quantite:number};
type Message={id:string;expediteur:string;contenu:string|null;chemin_audio:string|null;created_at:string};
type OrderFile={id:string;nom_fichier:string;chemin_stockage:string;type_fichier:string;type_mime:string|null;created_at:string};
type Payment={id:string;methode:string;montant:number;statut:string;reference_transaction:string|null;created_at:string};
const BUCKET="baobab-client-files";
const money=(n:number)=>new Intl.NumberFormat("fr-FR").format(n)+" FCFA";
const date=(v:string)=>new Date(v).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"});
const statusLabel=(s:string)=>({nouveau:"Nouvelle demande",a_clarifier:"À clarifier",attente_validation_prix:"Prix à confirmer",attente_paiement:"En attente de paiement",paye:"Payée",en_cours:"En cours",attente_validation_client:"À valider",termine:"Terminée",livre:"Livrée",annule:"Annulée"}[s]||s);
const statusClass=(s:string)=>["paye","livre","termine"].includes(s)?"good":["annule"].includes(s)?"bad":"pending";
function browserNotify(title:string,body:string){if(typeof window==="undefined"||!("Notification" in window)||Notification.permission!=="granted")return;new Notification(title,{body,icon:"/icon.svg"});}

export default function App(){
 const [session,setSession]=useState<Session|null>(null);
 const [services,setServices]=useState<Service[]>([]);
 const [brand,setBrand]=useState<Brand>({nom_marque:"CYBER",slogan:"Vos documents, notre expertise digitale.",chemin_logo:null});
 const [appearance,setAppearance]=useState<Appearance>(defaultAppearance);
 const [loading,setLoading]=useState(true);
 const [authOpen,setAuthOpen]=useState(false);
 const [authMode,setAuthMode]=useState<"login"|"signup">("signup");
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [fullName,setFullName]=useState("");const [phone,setPhone]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [notificationPermission,setNotificationPermission]=useState<NotificationPermission>(typeof Notification!=="undefined"?Notification.permission:"default");
 const [notice,setNotice]=useState("");
 const [cart,setCart]=useState<Record<string,number>>({});
 const [page,setPage]=useState<"home"|"orders"|"messages"|"profile">("home");
 const [mobileTab,setMobileTab]=useState<"home"|"services"|"orders"|"messages"|"profile">("home");
 const [serviceQuery,setServiceQuery]=useState("");
 const [orders,setOrders]=useState<Order[]>([]);
 const [selected,setSelected]=useState<Order|null>(null);
 const [details,setDetails]=useState<Detail[]>([]);
 const [messages,setMessages]=useState<Message[]>([]);
 const [files,setFiles]=useState<OrderFile[]>([]);
 const [payments,setPayments]=useState<Payment[]>([]);
 const [messageText,setMessageText]=useState("");
 const [busy,setBusy]=useState(false);
 const [profileName,setProfileName]=useState("");const [profilePhone,setProfilePhone]=useState("");
 const [orderMessage,setOrderMessage]=useState("");
 const [paymentMethod,setPaymentMethod]=useState<"orange_money"|"especes">("orange_money");
 const [cashOption,setCashOption]=useState<"avant_livraison"|"au_retrait">("avant_livraison");
 const [transactionRef,setTransactionRef]=useState("");
 const [recording,setRecording]=useState(false);
 const recorder=useRef<MediaRecorder|null>(null);
 const audioChunks=useRef<Blob[]>([]);
 const count=useMemo(()=>Object.values(cart).reduce((a,b)=>a+b,0),[cart]);
 const indicative=useMemo(()=>services.reduce((a,s)=>a+s.indicative_price*(cart[s.id]||0),0),[services,cart]);
 const visibleServices=useMemo(()=>{const query=serviceQuery.trim().toLocaleLowerCase("fr");const excluded=/photocopie|photocopies|impression|impressions|imprimer|imprimante|imprimantes/i;return services.filter(s=>!excluded.test(`${s.name} ${s.description||""}`)&&`${s.name} ${s.description||""}`.toLocaleLowerCase("fr").includes(query))},[services,serviceQuery]);
 async function enableNotifications(){if(!("Notification" in window)){setNotice("Les notifications ne sont pas prises en charge par ce navigateur.");return;}const permission=await Notification.requestPermission();setNotificationPermission(permission);setNotice(permission==="granted"?"Notifications activées sur cet appareil.":permission==="denied"?"Notifications bloquées. Autorise-les dans les réglages du navigateur.":"Autorisation des notifications non accordée.");}

 const loadServices=useCallback(async()=>{const {data,error}=await supabase.from("services").select("id,name,description,indicative_price,icon_url").eq("is_active",true).order("created_at");if(error)throw error;setServices((data||[]) as Service[])},[]);
 const loadOrders=useCallback(async()=>{if(!session)return;const {data,error}=await supabase.from("ordres").select("id,reference,nom_client,telephone_client,montant_final,statut,statut_paiement,message_client,created_at,option_paiement_espece").order("created_at",{ascending:false});if(error)throw error;setOrders((data||[]) as Order[])},[session]);
 const loadOrder=useCallback(async(order:Order)=>{
  setSelected(order);
  const [d,m,f,p]=await Promise.all([
   supabase.from("details_commandes").select("id,nom_service,prix_indicatif,quantite").eq("ordre_id",order.id).order("created_at"),
   supabase.from("messages").select("id,expediteur,contenu,chemin_audio,created_at").eq("ordre_id",order.id).order("created_at"),
   supabase.from("fichiers_commandes").select("id,nom_fichier,chemin_stockage,type_fichier,type_mime,created_at").eq("ordre_id",order.id).order("created_at"),
   supabase.from("paiements").select("id,methode,montant,statut,reference_transaction,created_at").eq("ordre_id",order.id).order("created_at",{ascending:false})
  ]);
  if(d.error||m.error||f.error||p.error)throw d.error||m.error||f.error||p.error;
  setDetails((d.data||[]) as Detail[]);setMessages((m.data||[]) as Message[]);setFiles((f.data||[]) as OrderFile[]);setPayments((p.data||[]) as Payment[]);
 },[]);
 const refresh=useCallback(async()=>{await loadOrders();if(selected){const fresh=await supabase.from("ordres").select("id,reference,nom_client,telephone_client,montant_final,statut,statut_paiement,message_client,created_at,option_paiement_espece").eq("id",selected.id).single();if(!fresh.error)await loadOrder(fresh.data as Order)}},[loadOrders,loadOrder,selected]);

 useEffect(()=>{
  let active=true;
  Promise.all([supabase.auth.getSession(),loadServices(),supabase.from("parametres_marque").select("nom_marque,slogan,chemin_logo").limit(1).maybeSingle()])
   .then(([auth,_services,b])=>{if(!active)return;setSession(auth.data.session);if(b.data)setBrand(b.data as Brand);setLoading(false)})
   .catch(e=>{if(active){setNotice(e instanceof Error?e.message:"Connexion temporairement indisponible.");setLoading(false)}});
  const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);if(!next){setOrders([]);setSelected(null);setPage("home");setMobileTab("home")}});
  return()=>{active=false;data.subscription.unsubscribe()};
 },[loadServices]);
 useEffect(()=>{
  const iconUrl=supabase.storage.from("baobab-assets").getPublicUrl("brand/app-icon.png").data.publicUrl+"?v="+Date.now();
  const appleIcon=document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')??document.createElement("link");
  appleIcon.rel="apple-touch-icon";
  appleIcon.href=iconUrl;
  if(!appleIcon.parentNode)document.head.appendChild(appleIcon);
  const manifest={
   name:brand.nom_marque||"CYBER CLIENT",
   short_name:"CYBER CLIENT",
   start_url:"/",
   scope:"/",
   display:"standalone",
   background_color:"#ffffff",
   theme_color:"#0F3D2E",
   icons:[{src:iconUrl,sizes:"512x512",type:"image/png",purpose:"any maskable"}]
  };
  const blobUrl=URL.createObjectURL(new Blob([JSON.stringify(manifest)],{type:"application/manifest+json"}));
  const manifestLink=document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const previousHref=manifestLink?.href;
  if(manifestLink)manifestLink.href=blobUrl;
  return()=>{
   URL.revokeObjectURL(blobUrl);
   if(manifestLink&&previousHref)manifestLink.href=previousHref;
  };
 },[brand.nom_marque,brand.chemin_logo]);
 useEffect(()=>{let active=true;supabase.from("suguma_client_appearance").select("*").eq("id",1).maybeSingle().then(({data,error})=>{if(!active)return;if(data)setAppearance({...defaultAppearance,...data} as Appearance);if(error)console.warn("Réglages CYBER CLIENT indisponibles",error.message)});return()=>{active=false}},[]);
 useEffect(()=>{if(session){setProfileName(String(session.user.user_metadata.full_name||""));setProfilePhone(String(session.user.user_metadata.phone||""));loadOrders().catch(e=>setNotice(e instanceof Error?e.message:"Impossible de charger les commandes."))}},[session,loadOrders]);
 useEffect(()=>{if(!session)return;const channel=supabase.channel("client-notifications-"+session.user.id)
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},payload=>{const row=payload.new as Message;if(row.expediteur==="admin"){browserNotify("Nouveau message de CYBER",row.contenu||"Tu as reçu un nouveau message.");setNotice("Nouveau message reçu de CYBER.");if(selected?.id)loadOrder(selected).catch(()=>{})}})
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"ordres"},payload=>{const row=payload.new as Order;const old=payload.old as Partial<Order>;if(row.statut&&row.statut!==old.statut){browserNotify("Mise à jour de commande",row.reference+" : "+statusLabel(row.statut));setNotice("Ta commande "+row.reference+" a été mise à jour : "+statusLabel(row.statut)+".");loadOrders().catch(()=>{})}})
  .subscribe();return()=>{void supabase.removeChannel(channel)}},[session,selected,loadOrder,loadOrders]);
 useEffect(()=>{if(!session||!selected)return;const channel=supabase.channel("client-order-"+selected.id).on("postgres_changes",{event:"*",schema:"public",table:"messages",filter:"ordre_id=eq."+selected.id},()=>{loadOrder(selected).catch(()=>{})}).on("postgres_changes",{event:"*",schema:"public",table:"ordres",filter:"id=eq."+selected.id},()=>{refresh().catch(()=>{})}).on("postgres_changes",{event:"*",schema:"public",table:"paiements",filter:"ordre_id=eq."+selected.id},()=>{refresh().catch(()=>{})}).subscribe();return()=>{void supabase.removeChannel(channel)}},[session,selected,loadOrder,refresh]);

 function add(service:Service){setCart(c=>{const alreadySelected=Boolean(c[service.id]);const distinctCount=Object.values(c).filter(q=>q>0).length;if(!alreadySelected&&distinctCount>=8){setNotice("Maximum 8 prestations différentes par commande.");return c;}return {...c,[service.id]:Math.min(20,(c[service.id]||0)+1)};});if((cart[service.id]||0)<20)setNotice(service.name+" ajouté au panier.");}
 function decrease(service:Service){setCart(c=>{const next={...c};const quantity=(next[service.id]||0)-1;if(quantity<=0)delete next[service.id];else next[service.id]=quantity;return next;});}
 function removeFromCart(service:Service){setCart(c=>{const next={...c};delete next[service.id];return next;});setNotice(service.name+" retiré du panier.");}
 function normalizeClientPhone(value:string){const digits=value.replace(/\D/g,"");if(digits.length===8)return "+226"+digits;if(digits.length===11&&digits.startsWith("226"))return "+"+digits;return "";}
 async function submitAuth(e:FormEvent){e.preventDefault();setAuthBusy(true);setNotice("");try{
  if(authMode==="signup"){
   const normalizedPhone=normalizeClientPhone(phone);
   if(!fullName.trim())throw new Error("Saisis ton nom complet.");
   if(!normalizedPhone)throw new Error("Saisis un numéro valide à 8 chiffres ou au format +226.");
   const {data,error}=await supabase.auth.signUp({phone:normalizedPhone,password,options:{data:{full_name:fullName.trim(),phone:normalizedPhone,email_contact:email.trim()||null}}});
   if(error)throw error;
   if(data.session){setSession(data.session);setNotice("Compte créé. Bienvenue sur CYBER !");setAuthOpen(false);setPage("home");setMobileTab("home");}
   else throw new Error("Compte créé sans session active. Vérifie que la confirmation téléphonique est bien désactivée dans Supabase, puis réessaie.");
  }else{
   const normalizedPhone=normalizeClientPhone(email);
   if(!normalizedPhone)throw new Error("Saisis un numéro de téléphone valide à 8 chiffres ou au format +226.");
   const {error}=await supabase.auth.signInWithPassword({phone:normalizedPhone,password});
   if(error)throw error;
   setNotice("Connexion réussie.");setAuthOpen(false);setPage("home");setMobileTab("home");
  }
  setPassword("");
 }catch(e){setNotice(e instanceof Error?e.message:"Une erreur est survenue.")}finally{setAuthBusy(false)}}
 async function signOut(){await supabase.auth.signOut();setNotice("Tu es déconnecté.");}
 async function submitOrder(e:FormEvent){e.preventDefault();if(!session){setAuthMode("signup");setAuthOpen(true);return}setBusy(true);try{
  const items=services.filter(s=>(cart[s.id]||0)>0).map(s=>({service_id:s.id,quantity:cart[s.id]}));
  const {data,error}=await supabase.rpc("creer_commande_client",{p_items:items,p_message:orderMessage});
  if(error)throw error;setCart({});setOrderMessage("");setNotice("Demande envoyée ! Référence : "+data.reference);await loadOrders();const {data:o,error:oe}=await supabase.from("ordres").select("id,reference,nom_client,telephone_client,montant_final,statut,statut_paiement,message_client,created_at,option_paiement_espece").eq("id",data.id).single();if(!oe){await loadOrder(o as Order);setPage("orders")}
 }catch(e){setNotice(e instanceof Error?e.message:"Impossible d'envoyer la demande.")}finally{setBusy(false)}}
 async function sendMessage(e:FormEvent){e.preventDefault();if(!selected||!messageText.trim())return;setBusy(true);try{const {error}=await supabase.rpc("client_envoyer_message",{p_ordre_id:selected.id,p_contenu:messageText.trim(),p_chemin_audio:null});if(error)throw error;setMessageText("");await loadOrder(selected)}catch(e){setNotice(e instanceof Error?e.message:"Message non envoyé.")}finally{setBusy(false)}}
 async function uploadFile(file:File,kind:"original"|"preuve_paiement"="original"){
  if(!selected)throw new Error("Aucune commande sélectionnée.");if(file.size>10*1024*1024)throw new Error("Fichier trop volumineux : maximum 10 Mo.");
  const allowed=["image/jpeg","image/png","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if(kind==="original"&&!allowed.includes(file.type))throw new Error("Format non accepté. Utilise une image, un PDF ou un document Word.");
  const folder=kind==="original"?"originals":"payment-proofs";const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=selected.id+"/"+folder+"/"+Date.now()+"-"+safe;
  const {error}=await supabase.storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
  const {error:metaError}=await supabase.rpc("client_ajouter_fichier",{p_ordre_id:selected.id,p_nom:file.name,p_chemin:path,p_type_mime:file.type,p_type:kind});if(metaError){await supabase.storage.from(BUCKET).remove([path]);throw metaError}
  const {error:messageError}=await supabase.rpc("client_envoyer_message",{p_ordre_id:selected.id,p_contenu:"📎 Document envoyé : "+file.name,p_chemin_audio:null});if(messageError)throw messageError;
  await loadOrder(selected);setNotice("Document envoyé dans la conversation.");
 }
 async function choosePayment(e:FormEvent){e.preventDefault();if(!selected)return;setBusy(true);try{
  const {error}=await supabase.rpc("client_choisir_paiement",{p_ordre_id:selected.id,p_methode:paymentMethod,p_option_espece:paymentMethod==="especes"?cashOption:null,p_reference_transaction:paymentMethod==="orange_money"?transactionRef:null});if(error)throw error;
  setNotice(paymentMethod==="orange_money"?"Demande de paiement Orange Money enregistrée. Notre équipe vérifiera le règlement.":"Ton choix de paiement en espèces a été enregistré.");setTransactionRef("");await refresh();
 }catch(e){setNotice(e instanceof Error?e.message:"Impossible d'enregistrer le choix.")}finally{setBusy(false)}}
 async function sendAudio(blob:Blob){if(!selected) return;setBusy(true);try{const path=selected.id+"/messages/"+Date.now()+".webm";const {error}=await supabase.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||"audio/webm"});if(error)throw error;const {error:msgError}=await supabase.rpc("client_envoyer_message",{p_ordre_id:selected.id,p_contenu:null,p_chemin_audio:path});if(msgError)throw msgError;await loadOrder(selected);setNotice("Message vocal envoyé.")}catch(e){setNotice(e instanceof Error?e.message:"Envoi vocal impossible.")}finally{setBusy(false)}}
 async function toggleRecording(){if(recording){recorder.current?.stop();setRecording(false);return}try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});const r=new MediaRecorder(stream);recorder.current=r;audioChunks.current=[];r.ondataavailable=e=>{if(e.data.size)audioChunks.current.push(e.data)};r.onstop=()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(audioChunks.current,{type:r.mimeType||"audio/webm"});if(blob.size)sendAudio(blob)};r.start();setRecording(true)}catch{setNotice("Autorise le micro dans les réglages du navigateur pour envoyer un vocal.")}}
 async function signedUrl(path:string){const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(path,300);if(error)throw error;return data.signedUrl}
 async function downloadFile(f:OrderFile){try{const url=await signedUrl(f.chemin_stockage);window.open(url,"_blank","noopener,noreferrer")}catch(e){setNotice(e instanceof Error?e.message:"Téléchargement indisponible.")}}
 async function downloadAudio(path:string){try{const url=await signedUrl(path);window.open(url,"_blank","noopener,noreferrer")}catch(e){setNotice(e instanceof Error?e.message:"Audio indisponible.")}}
 async function saveProfile(e:FormEvent){e.preventDefault();setBusy(true);try{const {error}=await supabase.from("clients").update({nom_complet:profileName,telephone:profilePhone,updated_at:new Date().toISOString()}).eq("user_id",session?.user.id);if(error)throw error;const {error:authError}=await supabase.auth.updateUser({data:{full_name:profileName,phone:profilePhone}});if(authError)throw authError;setNotice("Profil mis à jour.")}catch(e){setNotice(e instanceof Error?e.message:"Profil non modifié.")}finally{setBusy(false)}}

 function navigateClient(tab:"home"|"services"|"orders"|"messages"|"profile"){
  setMobileTab(tab);
  if(tab==="home"||tab==="services"){
   setPage("home");setSelected(null);
   if(tab==="services")window.setTimeout(()=>document.getElementById("services")?.scrollIntoView({behavior:"smooth",block:"start"}),40);
   else window.scrollTo({top:0,behavior:"smooth"});
   return;
  }
  if(!session){setAuthMode("signup");setAuthOpen(true);return;}
  setSelected(null);setPage(tab);
 }
 return <div className="cy-app">
<header className="cy-header"><button className="cy-brand" onClick={()=>navigateClient("home")}>{brand.chemin_logo?<img src={brand.chemin_logo} alt=""/>:<span className="cy-logo"><TreeDeciduous/></span>}<span><b>{brand.nom_marque}</b><small>{brand.slogan||"Vos documents, notre expertise digitale."}</small></span></button><nav><button onClick={()=>navigateClient("home")}>Accueil</button><button onClick={()=>navigateClient("services")}>Services</button>{session&&<><button onClick={()=>navigateClient("orders")}>Commandes</button><button onClick={()=>navigateClient("messages")}>Messages</button></>}</nav><div className="cy-actions"><button className="cy-icon" onClick={enableNotifications} aria-label="Notifications"><Bell/>{notificationPermission==="granted"&&<i/>}</button><button className="cy-cart" onClick={()=>{navigateClient("services");window.setTimeout(()=>document.getElementById("cy-cart-panel")?.scrollIntoView({behavior:"smooth",block:"center"}),120)}} aria-label={"Ouvrir le panier, "+count+" article(s)"}><ShoppingBag/> {count}</button>{session?<button className="cy-account" onClick={()=>navigateClient("profile")}><CircleUserRound/> Mon espace</button>:<button className="cy-account" onClick={()=>{setAuthMode("login");setAuthOpen(true)}}><CircleUserRound/> Connexion</button>}</div></header>
{notice&&<div className="cy-notice" role="status">{notice}<button onClick={()=>setNotice("")}><X/></button></div>}
<main className="cy-main">
{page==="home"&&!selected&&<><section className="cy-hero"><div><span className="cy-pill"><ShieldCheck size={15}/> SERVICES NUMÉRIQUES</span><h1>{appearance.hero_title} <em>{appearance.hero_highlight}</em></h1><p>{appearance.hero_description}</p><div className="cy-hero-actions"><button className="cy-primary" onClick={()=>navigateClient("services")}>{appearance.cta_label}<ArrowRight/></button>{session?<button className="cy-outline" onClick={()=>navigateClient("orders")}>Suivre mes commandes</button>:<button className="cy-outline" onClick={()=>{setAuthMode("signup");setAuthOpen(true)}}>Créer mon compte</button>}</div><small className="cy-trust"><ShieldCheck size={16}/> Vos commandes et documents restent privés</small></div><div className="cy-hero-art" role="img" aria-label={appearance.hero_image_alt||"Une conseillère souriante vous accueille dans un bureau"} style={{backgroundImage:'linear-gradient(90deg,rgba(15,61,46,.05),rgba(15,61,46,.08)),url("'+(appearance.hero_image_url||defaultHeroImage)+'")'}}><div className="cy-welcome-note"><span><MessageCircle/></span><div><b>Nous sommes à votre écoute</b><small>Un accompagnement simple et chaleureux</small></div></div></div></section>
<section className="cy-section" id="services"><div className="cy-heading"><div><label>NOTRE CATALOGUE</label><h2>De quoi avez-vous besoin ?</h2><p>Choisissez une ou plusieurs prestations. Le prix final est confirmé par notre équipe.</p></div><b>{visibleServices.length} service(s)</b></div><label className="cy-search"><Search/><input value={serviceQuery} onChange={e=>setServiceQuery(e.target.value)} placeholder="Rechercher une prestation…"/></label>
{loading?<div className="cy-empty">Chargement du catalogue…</div>:services.length===0?<div className="cy-empty">Nos prestations seront bientôt disponibles.</div>:visibleServices.length===0?<div className="cy-empty">Aucun résultat. <button className="cy-link" onClick={()=>setServiceQuery("")}>Effacer</button></div>:<div className="cy-services">{visibleServices.map((s,i)=><article className="cy-service" key={s.id}><div className={"cy-service-icon t"+(i%4)}>{s.icon_url?<img src={s.icon_url} alt={s.name}/>:<FileText size={28}/>}</div><div className="cy-service-body"><small>PRESTATION</small><h3>{s.name}</h3><p>{s.description||"Une prestation réalisée avec soin par notre équipe."}</p><div className="cy-service-foot"><span><small>Prix indicatif</small><b>{money(s.indicative_price)}</b></span><button onClick={()=>add(s)} aria-label={"Ajouter "+s.name}><Plus/></button></div></div>{cart[s.id]>0&&<i className="cy-qty">{cart[s.id]} dans le panier</i>}</article>)}</div>}
<div className="cy-cart-panel" id="cy-cart-panel"><span className="cy-cart-symbol"><ShoppingBag/></span><div><b>Votre panier</b><span>{count} prestation(s) · {money(indicative)}</span><small>Le prix définitif sera confirmé avant réalisation.</small></div><button className="cy-primary" onClick={()=>{if(!count){setNotice("Ajoutez une prestation au panier.");return}document.getElementById("cy-order")?.scrollIntoView({behavior:"smooth"})}}>Continuer <ArrowRight/></button></div>{count>0&&<div className="cy-cart-items" aria-label="Contenu du panier">{services.filter(s=>(cart[s.id]||0)>0).map(s=><div className="cy-cart-item" key={s.id}><div className="cy-cart-item-copy"><b>{s.name}</b><small>{money(s.indicative_price)} l’unité</small></div><div className="cy-cart-controls"><button type="button" aria-label={"Retirer une unité de "+s.name} onClick={()=>decrease(s)}><Minus/></button><strong>{cart[s.id]}</strong><button type="button" aria-label={"Ajouter une unité de "+s.name} onClick={()=>add(s)} disabled={cart[s.id]>=20}><Plus/></button></div><b className="cy-cart-subtotal">{money(s.indicative_price*cart[s.id])}</b><button type="button" className="cy-cart-remove" aria-label={"Supprimer "+s.name+" du panier"} onClick={()=>removeFromCart(s)}><Trash2/></button></div>)}</div>}
{count>0&&<form className="cy-order-form" id="cy-order" onSubmit={submitOrder}><div><label>FINALISER LA DEMANDE</label><h3>Quelques précisions</h3><p>Ajoutez les informations utiles à votre commande.</p></div><label>Votre message<textarea value={orderMessage} onChange={e=>setOrderMessage(e.target.value)} maxLength={2000} placeholder="Décrivez votre besoin…"/></label><button className="cy-primary" disabled={busy}>{busy?"Envoi…":"Envoyer ma demande"}<ArrowRight/></button></form>}</section>
<section className="cy-process"><label>UN PARCOURS SIMPLE</label><h2>Comment ça marche ?</h2><div className="cy-steps"><div><b>01</b><ShoppingBag/><strong>Choisissez</strong><span>Sélectionnez vos services.</span></div><div><b>02</b><Send/><strong>Envoyez</strong><span>Transmettez votre demande.</span></div><div><b>03</b><MessageCircle/><strong>Échangez</strong><span>Confirmez les détails avec nous.</span></div><div><b>04</b><CheckCircle2/><strong>Récupérez</strong><span>Suivez vos documents.</span></div></div></section></>}
{page==="orders"&&!selected&&<section className="cy-workspace"><div className="cy-page-heading"><div><label>VOTRE ESPACE</label><h1>Mes commandes</h1><p>Retrouvez vos demandes et leur avancement.</p></div><button className="cy-primary" onClick={()=>navigateClient("services")}><Plus/> Nouvelle demande</button></div>{orders.length===0?<div className="cy-empty"><ShoppingBag/><b>Aucune commande pour le moment</b><button className="cy-primary" onClick={()=>navigateClient("services")}>Découvrir les services</button></div>:<div className="cy-list">{orders.map(o=><button className="cy-row" key={o.id} onClick={()=>loadOrder(o)}><span className="cy-row-icon"><FileText/></span><span className="cy-row-copy"><b>{o.reference}</b><small>{date(o.created_at)}</small></span><strong>{o.montant_final?money(o.montant_final):"Prix à confirmer"}</strong><span className={"cy-status "+statusClass(o.statut)}>{statusLabel(o.statut)}</span><ArrowRight/></button>)}</div>}</section>}
{page==="messages"&&<section className="cy-workspace"><div className="cy-page-heading"><div><label>ASSISTANCE CLIENT</label><h1>Mes messages</h1><p>Vos conversations avec notre équipe.</p></div></div>{orders.length===0?<div className="cy-empty">Aucune conversation pour le moment.</div>:<div className="cy-list">{orders.map(o=><article className="cy-row" key={o.id}><span className="cy-row-icon"><MessageCircle/></span><span className="cy-row-copy"><b>{o.reference}</b><small>{date(o.created_at)}</small></span><button className="cy-secondary" onClick={()=>{setMobileTab("messages");setPage("orders");loadOrder(o).catch(e=>setNotice(e instanceof Error?e.message:"Conversation indisponible."))}}>Ouvrir <ArrowRight/></button></article>)}</div>}</section>}
{page==="orders"&&selected&&<section className="cy-workspace"><button className="cy-link" onClick={()=>{setSelected(null);setPage(mobileTab==="messages"?"messages":"orders")}}><ArrowLeft/> Retour</button><div className="cy-page-heading"><div><label>SUIVI DE COMMANDE</label><h1>{selected.reference}</h1><p>Créée le {date(selected.created_at)}</p></div><span className={"cy-status "+statusClass(selected.statut)}>{statusLabel(selected.statut)}</span></div><div className="cy-detail-grid"><div className="cy-detail-main">
<section className="cy-panel"><h2>Détails de la demande</h2>{details.map(d=><div className="cy-line" key={d.id}><span>{d.nom_service} × {d.quantite}</span><b>{money(d.prix_indicatif*d.quantite)}</b></div>)}<div className="cy-line total"><b>Prix définitif</b><b>{selected.montant_final?money(selected.montant_final):"En attente"}</b></div>{selected.message_client&&<p>{selected.message_client}</p>}</section>
<section className="cy-panel"><div className="cy-panel-head"><h2>Documents et fichiers</h2><label className="cy-upload"><Upload/> Ajouter<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={async e=>{const f=e.target.files?.[0];if(f)try{await uploadFile(f)}catch(err){setNotice(err instanceof Error?err.message:"Envoi impossible")}e.currentTarget.value=""}}/></label></div><p className="cy-muted">PDF, Word ou image · 10 Mo maximum.</p>{files.map(f=><div className="cy-file" key={f.id}><FileText/><span><b>{f.nom_fichier}</b><small>{f.type_fichier==="livrable"?"Document final":"Fichier envoyé"} · {date(f.created_at)}</small></span><button className="cy-icon" onClick={()=>downloadFile(f)}><Download/></button></div>)}{files.length===0&&<p className="cy-muted">Aucun fichier pour cette commande.</p>}</section>
<section className="cy-panel"><h2>Conversation</h2><div className="cy-chat">{messages.map(m=><div className={"cy-message "+(m.expediteur==="client"?"mine":"theirs")} key={m.id}><small>{m.expediteur==="client"?"Vous":"Notre équipe"} · {date(m.created_at)}</small>{m.contenu&&<p>{m.contenu}</p>}{m.chemin_audio&&<button className="cy-link" onClick={()=>downloadAudio(m.chemin_audio!)}><Headphones/> Écouter le vocal</button>}</div>)}{files.filter(f=>f.type_fichier!=="livrable").map(f=><div className="cy-message mine" key={"f"+f.id}><small>Document envoyé · {date(f.created_at)}</small><p>📎 {f.nom_fichier}</p><button className="cy-link" onClick={()=>downloadFile(f)}><Download/> Ouvrir</button></div>)}</div><form className="cy-chat-form" onSubmit={sendMessage}><textarea value={messageText} onChange={e=>setMessageText(e.target.value)} placeholder="Écrire un message…" maxLength={2000}/><label className="cy-icon"><Paperclip/><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={async e=>{const f=e.target.files?.[0];if(f)try{await uploadFile(f)}catch(err){setNotice(err instanceof Error?err.message:"Envoi impossible")}e.currentTarget.value=""}}/></label><button className="cy-icon" type="button" onClick={toggleRecording}><Mic/></button><button className="cy-primary" disabled={busy||!messageText.trim()}><Send/></button></form>{recording&&<p className="cy-muted">Enregistrement en cours…</p>}</section></div>
<aside className="cy-panel"><h2>Paiement</h2><div className="cy-payment-total">{selected.montant_final?money(selected.montant_final):"Prix en attente"}</div><span className={"cy-status "+(selected.statut_paiement==="paye"?"good":"pending")}>{selected.statut_paiement==="paye"?"Paiement confirmé":"Paiement non confirmé"}</span>{payments.map(p=><div className="cy-payment-line" key={p.id}><b>{p.methode==="orange_money"?"Orange Money":"Espèces"} · {money(p.montant)}</b><small>{p.statut==="confirme"?"Confirmé":p.statut==="en_attente"?"En attente de vérification":p.statut}</small>{p.reference_transaction&&<small>Référence : {p.reference_transaction}</small>}</div>)}{selected.statut_paiement!=="paye"&&selected.montant_final&&selected.montant_final>0&&<form className="cy-payment-form" onSubmit={choosePayment}><label>Moyen de paiement<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as "orange_money"|"especes")}><option value="orange_money">Orange Money</option><option value="especes">Espèces</option></select></label>{paymentMethod==="orange_money"?<><label>Référence (facultatif)<input value={transactionRef} onChange={e=>setTransactionRef(e.target.value)} placeholder="Référence de transaction"/></label><p className="cy-muted">Effectuez le transfert après réception des coordonnées officielles.</p><label className="cy-upload"><Paperclip/> Joindre la preuve<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={async e=>{const f=e.target.files?.[0];if(f)try{await uploadFile(f,"preuve_paiement")}catch(err){setNotice(err instanceof Error?err.message:"Envoi impossible")}e.currentTarget.value=""}}/></label></>:<label>Quand payer ?<select value={cashOption} onChange={e=>setCashOption(e.target.value as "avant_livraison"|"au_retrait")}><option value="avant_livraison">Avant livraison</option><option value="au_retrait">Au retrait</option></select></label>}<button className="cy-primary" disabled={busy}>{busy?"Enregistrement…":"Confirmer mon choix"}</button></form>}{selected.statut_paiement==="paye"&&<><p className="cy-paid"><CheckCircle2/> Paiement intégral confirmé. Téléchargez vos documents finaux.</p><button className="cy-secondary" onClick={()=>window.print()}><FileText/> Imprimer mon reçu</button><div className="cy-receipt"><h3>{brand.nom_marque} — REÇU DE PAIEMENT</h3><p>Référence : {selected.reference}</p><p>Client : {selected.nom_client}</p>{details.map(d=><p key={d.id}>{d.nom_service} × {d.quantite} — {money(d.prix_indicatif*d.quantite)}</p>)}<b>Montant payé : {money(selected.montant_final||0)}</b><p>Merci pour votre confiance.</p></div></>}</aside></div></section>}
{page==="profile"&&<section className="cy-workspace"><button className="cy-link" onClick={()=>navigateClient("home")}><ArrowLeft/> Accueil</button><div className="cy-page-heading"><div><label>VOTRE COMPTE</label><h1>Mon profil</h1><p>Gérez vos coordonnées personnelles.</p></div></div><form className="cy-panel cy-profile" onSubmit={saveProfile}><label>Nom complet<input value={profileName} onChange={e=>setProfileName(e.target.value)} required/></label><label>Téléphone<input value={profilePhone} onChange={e=>setProfilePhone(e.target.value)} required/></label><label>E-mail<input value={session?.user.email||String(session?.user.user_metadata?.email_contact||"")} disabled/></label><button className="cy-primary" disabled={busy}>Enregistrer les modifications</button><button type="button" className="cy-link" onClick={signOut}><LogOut/> Me déconnecter</button></form></section>}
</main>
<nav className="cy-mobile-nav"><button onClick={()=>navigateClient("home")} className={mobileTab==="home"?"active":""}><Home/><span>Accueil</span></button><button onClick={()=>navigateClient("services")} className={mobileTab==="services"?"active":""}><BriefcaseBusiness/><span>Services</span></button><button onClick={()=>navigateClient("orders")} className={mobileTab==="orders"?"active":""}><ShoppingBag/><span>Commandes</span></button><button onClick={()=>navigateClient("messages")} className={mobileTab==="messages"?"active":""}><MessagesSquare/><span>Messages</span></button><button onClick={()=>navigateClient("profile")} className={mobileTab==="profile"?"active":""}><UserRound/><span>Profil</span></button></nav>
<footer className="cy-footer">© {new Date().getFullYear()} {brand.nom_marque} · Burkina Faso · Tous droits réservés</footer>
{authOpen&&<div className="cy-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setAuthOpen(false)}}><section className="cy-modal"><button className="cy-close" onClick={()=>setAuthOpen(false)}><X/></button><span className="cy-auth-avatar"><CircleUserRound size={30}/></span><label>ESPACE CLIENT</label><h2>{authMode==="signup"?"Créer votre compte":"Heureux de vous revoir"}</h2><p>{authMode==="signup"?"Inscrivez-vous avec votre nom et votre numéro pour commander et suivre vos documents.":"Connectez-vous avec le numéro de téléphone utilisé lors de votre inscription."}</p><form onSubmit={submitAuth}>{authMode==="signup"&&<><label>Nom complet<input value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name" required placeholder="Votre nom et prénom"/></label><label>Téléphone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" required placeholder="70 00 00 00 ou +226…"/></label><label>E-mail de contact (facultatif)<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="exemple@email.com"/></label></>}{authMode==="login"&&<label>Téléphone<input type="tel" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="70 00 00 00 ou +226…"/></label>}<label>Mot de passe<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required placeholder="8 caractères minimum"/></label><button className="cy-primary" disabled={authBusy}>{authBusy?"Patientez…":authMode==="signup"?"Créer mon compte":"Me connecter"}<ArrowRight/></button></form><div className="cy-switch">{authMode==="signup"?"Vous avez déjà un compte ?":"Vous n'avez pas encore de compte ?"} <button onClick={()=>setAuthMode(authMode==="signup"?"login":"signup")}>{authMode==="signup"?"Se connecter":"Créer un compte"}</button></div></section></div>}
</div>
}
