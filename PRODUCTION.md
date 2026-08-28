# Jokko Business — procédure de mise en production

## Branches autorisées

Le backend doit être déployé depuis `roadmap-implementation` et le frontend depuis `roadmap-implementation-front`. Les branches `main`, `master` et `prod` restent hors périmètre.

## Variables backend

Configurer les variables dans le gestionnaire de secrets de l’hébergeur, jamais dans Git. Le fichier `.env.example` constitue le contrat de configuration non secret.

Variables obligatoires : `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `DIRECT_URL` si Prisma utilise une shadow database, `JWT_SECRET` aléatoire et différent de la valeur locale, `FRONTEND_URL` ou `CORS_ORIGINS`, `SUPABASE_URL` et `SUPABASE_SECRET_KEY`.

Les flux email nécessitent également `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` et `MAIL_FROM`. Si les emails ne sont pas activés au premier déploiement, les erreurs doivent être surveillées avant d’ouvrir les fonctions de réinitialisation par email.

## Variables frontend

Le frontend utilise `.env.example` comme modèle. En développement, `VITE_BASE_URL` pointe vers l’API locale. En production, `VITE_API_URL` doit pointer vers l’API publique complète, avec le préfixe `/api`. Aucun fichier `.env` local ne doit être versionné.

## Build et démarrage

Le backend se construit avec `npm ci` puis `npm run prod:build`. Les migrations sont exécutées au démarrage par `npm run post:deployment`, puis le serveur est lancé avec `npm start`. Cette séquence est définie dans `nixpacks.toml`.

Le frontend se construit avec `npm ci` puis `npm run build`. Le dossier `dist` doit être servi par l’hébergeur statique avec une réécriture SPA vers `index.html`, conformément à `netlify.toml`.

## Contrôles avant ouverture publique

Vérifier `GET /api/health`, puis `GET /` et un login de test. Contrôler le CORS depuis l’origine frontend publique et confirmer qu’une origine inconnue n’est pas autorisée. Vérifier les migrations Prisma, les logs de démarrage, les uploads Supabase, les notifications SSE et les erreurs 401/403/404.

La readiness production n’est acquise qu’après validation de la base de données de production, des secrets injectés par l’hébergeur, du domaine frontend réel dans CORS, des sauvegardes et d’un test manuel des parcours Free, Starter, Pro, Premium et Super Admin.
