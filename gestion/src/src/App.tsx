import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { LockKeyhole, LogOut, Leaf, LoaderCircle } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session);

      if (data.session) {
        await verifyAdmin();
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
      setMessage("Adresse e-mail ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    setSession(data.session);
    await verifyAdmin();
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setPassword("");
  }

  if (loading) {
    return <div className="loading">Chargement de BAOBAB DIGITAL...</div>;
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
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>BAOBAB DIGITAL</h1>
          <p>Espace de gestion</p>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} />
          Déconnexion
        </button>
      </header>

      <section className="welcome-card">
        <Leaf size={32} />
        <h2>Bienvenue dans ton espace de gestion !</h2>
        <p>Ton accès administrateur est confirmé.</p>
      </section>

      <p className="coming-soon">
        Le tableau de bord sera construit progressivement.
      </p>
    </main>
  );
}
