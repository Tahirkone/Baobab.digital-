# Activation du formulaire public BAOBAB DIGITAL

Le formulaire public est accessible à l'adresse :

- \`/demande\` sur le site BAOBAB DIGITAL GESTION.

Il ne doit pas être activé avant les trois étapes ci-dessous.

## 1. Préparer Cloudflare Turnstile

1. Dans le tableau de bord Cloudflare, ouvre **Turnstile** et crée un widget.
2. Autorise le domaine de prévisualisation Cloudflare Pages, puis le domaine public final lorsqu'il sera choisi.
3. Récupère la **Site Key** et la **Secret Key**.

La Site Key est publique et sera utilisée au moment de la compilation. La Secret Key reste confidentielle.

## 2. Ajouter les variables dans Cloudflare Pages

Dans le projet \`baobab-digital-gestion\`, ouvre **Settings > Variables and Secrets**.

Variables de build (Production et Preview) :
- \`VITE_TURNSTILE_SITE_KEY\` : la Site Key Turnstile.

Variables secrètes d'exécution (Production et Preview) :
- \`SUPABASE_URL\` : URL du projet Supabase.
- \`SUPABASE_SERVICE_ROLE_KEY\` : clé service_role Supabase. **Ne jamais mettre cette clé dans le code Vite, dans GitHub ou dans une variable commençant par VITE_.**
- \`TURNSTILE_SECRET_KEY\` : Secret Key Turnstile.
- \`PUBLIC_SITE_HOSTNAME\` : nom d'hôte exact autorisé, par exemple \`2d10049c.baobab-digital-gestion.pages.dev\` pour un déploiement de prévisualisation. Adapter cette valeur au vrai domaine testé.

Les variables de Preview et de Production doivent être définies séparément si leurs domaines diffèrent.

## 3. Installer la migration Supabase

Ouvre le fichier :

\`supabase/migrations/20261117180000_public_customer_requests.sql\`

Lis-le, puis exécute son contenu dans le SQL Editor du bon projet Supabase. La fonction SQL est volontairement exécutable uniquement par le rôle \`service_role\`, appelé depuis la fonction Cloudflare après vérification Turnstile.

Ne donne jamais la clé \`service_role\` au navigateur et ne crée pas de politique RLS d'insertion publique sur les tables clients, commandes ou détails.

## 4. Vérification obligatoire avant mise en ligne

Après configuration :
- lancer un nouveau déploiement Preview depuis \`feat/payment-security\` ;
- tester le formulaire avec une demande réelle de test ;
- vérifier que le client, la commande, les prestations et l'historique sont enregistrés ;
- vérifier que les tables privées restent inaccessibles aux visiteurs anonymes ;
- supprimer les données de test si nécessaire.

Ne pas fusionner vers \`main\` ni publier en production sans validation explicite.
