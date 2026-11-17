# Activation du formulaire public BAOBAB DIGITAL

Le formulaire public est accessible à l'adresse :

- `/demande` sur le site BAOBAB DIGITAL GESTION.

## 1. Préparer Cloudflare Turnstile

1. Dans le tableau de bord Cloudflare, ouvre Turnstile et crée un widget.
2. Autorise le domaine utilisé pour tester le formulaire, puis le domaine public final lorsqu'il sera choisi.
3. Récupère la **Site Key** et la **Secret Key**.

La Site Key est publique. Le formulaire la récupère à l'exécution via `/api/config`.
La Secret Key reste confidentielle et n'est utilisée que par la fonction serveur.

## 2. Ajouter les variables dans Cloudflare Pages

Dans le projet `baobab-digital-gestion`, ouvre **Settings > Variables and Secrets > Preview**.

Ajoute ou vérifie ces variables pour Preview :

- `VITE_TURNSTILE_SITE_KEY` : Site Key Turnstile, type **Text**.
- `SUPABASE_URL` : URL du projet Supabase, type **Secret** ou Text.
- `SUPABASE_SERVICE_ROLE_KEY` : clé service_role Supabase, type **Secret**.
- `TURNSTILE_SECRET_KEY` : Secret Key Turnstile, type **Secret**.
- `PUBLIC_SITE_HOSTNAME` : nom d'hôte exact du site testé, si la vérification d'hôte est activée.

La route `/api/config` ne renvoie que la Site Key publique. Elle ne renvoie jamais les secrets serveur.

Les variables de Production doivent être configurées séparément uniquement au moment de préparer la mise en ligne. Ne pas modifier Production pendant les tests Preview.

## 3. Installer la migration Supabase

Ouvre le fichier :

`supabase/migrations/20261117180000_public_customer_requests.sql`

Lis-le, puis exécute son contenu dans le SQL Editor du bon projet Supabase. La fonction SQL est volontairement exécutable uniquement par le rôle `service_role`, appelé depuis la fonction Cloudflare après vérification Turnstile.

Ne donne jamais la clé `service_role` au navigateur et ne crée pas de politique RLS d'insertion publique sur les tables clients, commandes ou détails.

## 4. Vérification obligatoire avant mise en ligne

Après configuration :
- lancer un nouveau déploiement Preview depuis `feat/payment-security` ;
- vérifier que le widget Turnstile s'affiche ;
- tester une demande de test ;
- vérifier que le client, la commande, les prestations et l'historique sont enregistrés ;
- vérifier que les tables privées restent inaccessibles aux visiteurs anonymes ;
- supprimer les données de test si nécessaire.

Ne pas fusionner vers `main` ni publier en production sans validation explicite.
