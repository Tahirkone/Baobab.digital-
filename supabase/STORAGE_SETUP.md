# Configuration du stockage des images BAOBAB DIGITAL

L'application utilise le bucket Supabase Storage public `baobab-assets` uniquement pour le logo de la marque et les icônes des prestations. Ne pas y déposer de documents clients ou de fichiers privés.

Dans Supabase Dashboard > Storage > New bucket, créer :

- Nom : `baobab-assets`
- Public bucket : activé (les images doivent être visibles sur le formulaire public)
- Limite de taille : 2 MB
- Types MIME autorisés : `image/webp`

Les fichiers envoyés par l'application sont automatiquement redimensionnés et convertis en WebP. Les politiques RLS définies dans la migration `20261118143000_service_icons_and_storage.sql` limitent l'envoi, le remplacement et la suppression aux administrateurs BAOBAB DIGITAL.

Chemins utilisés :
- `brand/logo.webp`
- `services/<id-du-service>.webp`
