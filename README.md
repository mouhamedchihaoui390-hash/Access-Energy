# Access ERP Commercial

Application de gestion commerciale et facturation (Devis, Bons de Livraison, Factures, Règlements, Clients, Catalogue) pour Access Energy.

## Stack
- Frontend : React 19 + Vite + TailwindCSS
- Backend : Express (server.ts) + TypeScript
- Base de données : Supabase (Postgres) — avec repli automatique sur un fichier local si Supabase n'est pas configuré

---

## 1. Installation (Windows PowerShell)

Prérequis : Node.js 18+ installé (vérifier avec `node -v` dans PowerShell).

```powershell
cd chemin\vers\access-erp-commercial
npm install
```

Copier le fichier d'exemple des variables d'environnement :

```powershell
Copy-Item .env.example .env
```

Puis ouvrir `.env` et renseigner vos clés Supabase (voir section 3).

## 2. Lancer le projet

```powershell
npm run dev
```

L'application est disponible sur http://localhost:3000

Autres commandes utiles :
```powershell
npm run build   # build de production (dist/)
npm run start   # lance le build de production
npm run clean   # supprime dist/
npm run lint    # vérification TypeScript
```

Toutes ces commandes fonctionnent nativement sous PowerShell (aucune dépendance à des commandes bash comme `rm -rf`).

## 3. Connecter Supabase

1. Créer un projet sur https://supabase.com
2. Dans le projet Supabase, aller dans **SQL Editor** et exécuter le contenu du fichier :
   `supabase/migrations/20260906_app_state.sql`
   (crée la table `app_state` qui stocke les données de l'application)
3. Dans Supabase, aller dans **Settings > API** et récupérer :
   - `Project URL` → à mettre dans `VITE_SUPABASE_URL`
   - `anon public key` → à mettre dans `VITE_SUPABASE_ANON_KEY`
   - `service_role key` (secret) → à mettre dans `SUPABASE_SERVICE_ROLE_KEY`
4. Coller ces valeurs dans le fichier `.env` (jamais dans `.env.example`, jamais commité sur GitHub)
5. Relancer `npm run dev` — le terminal doit afficher :
   `[db] Loaded application data from Supabase.` (ou "seeded it with initial data" au premier lancement)

Si aucune clé Supabase n'est renseignée, l'application continue de fonctionner normalement avec un fichier local `data/database.json` (pratique pour développer sans configurer Supabase tout de suite).

> Note technique : les données sont stockées comme un seul objet JSON dans la table `app_state`. Un schéma relationnel complet (tables séparées `clients`, `products`, `documents`, etc.) est déjà préparé dans `supabase/schema.sql` pour une migration future plus poussée, mais n'est pas requis pour que l'app fonctionne avec Supabase dès aujourd'hui.

## 4. Publier sur GitHub

```powershell
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<votre-utilisateur>/<votre-repo>.git
git push -u origin main
```

Le fichier `.gitignore` exclut déjà `node_modules/`, `dist/` et tous les fichiers `.env*` (sauf `.env.example`) — vos clés Supabase ne seront donc jamais publiées sur GitHub.


## GitHub Pages

This repository includes a GitHub Actions workflow for the static frontend at `/Access-Energy/`.
GitHub Pages cannot run the Express `server.ts` backend. The Pages build uses the browser/offline data layer; for shared Supabase data and server APIs, deploy the Node/Express backend separately and configure the frontend API URL accordingly.
