# back-aurelienallenicfr

API Express (Node.js) : auth (email + Google OAuth), formulaire de contact (Brevo), gestion CV (Cloudinary, MongoDB). Sessions en MongoDB, CORS et rate limiting.

## Stack

- Node.js, Express 5
- MongoDB (Mongoose), sessions (connect-mongo)
- Passport (email/password, Google OAuth 2.0)
- Brevo (emails), Cloudinary (uploads CV), bcryptjs

## Prérequis

- Node.js 18+
- MongoDB
- Comptes Brevo, Cloudinary, Google Cloud (OAuth)

## Installation

```bash
npm install
```

Créer un fichier `.env` à la racine (voir section Variables d'environnement).

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| PORT | Port du serveur (défaut: 3000) |
| MONGO_SECRET_KEY | URI de connexion MongoDB |
| SESSION_SECRET | Secret pour les sessions |
| FRONTEND_URL | URL du front (redirections OAuth, CORS) |
| BACKEND_URL | URL du backend (prod, pour callback Google) |
| GOOGLE_CLIENT_ID | Client ID Google OAuth |
| GOOGLE_CLIENT_SECRET | Client secret Google OAuth |
| GOOGLE_CALLBACK_URL | (Optionnel) URL de callback Google complète |
| BREVO_API_KEY | Clé API Brevo |
| SENDER_EMAIL | Email expéditeur (contact) |
| ADMIN_EMAIL | Email destinataire des messages contact |
| SITE_NAME | Nom du site (emails) |
| SITE_URL | URL du site (liens dans les emails) |
| CLOUDINARY_CLOUD_NAME | Cloud name Cloudinary |
| CLOUDINARY_API_KEY | Clé API Cloudinary |
| CLOUDINARY_API_SECRET | Secret API Cloudinary |
| CLOUDINARY_CV_FOLDER | (Optionnel) Dossier Cloudinary pour les CV (défaut: cv) |

## Lancement

```bash
node index.js
```

Aucun script `start` dans `package.json` pour l'instant. Pour en ajouter : `"start": "node index.js"` puis `npm start`.

## Structure

```
config/       db, CORS, Passport, rate limiter
controllers/  auth, contact, cv, message
middlewares/  multer (Cloudinary), rateLimiter
models/       User, Cv, Message
routes/       authRoutes, routes (contact + cv)
index.js      point d'entrée
vercel.json   déploiement Vercel
```

## Schéma de base de données

![Schéma BDD](https://res.cloudinary.com/dwpbyyhoq/image/upload/f_auto,q_auto/db-schema_mm0qfe.webp)

## API

- **GET /** — Health / message de bienvenue

**Auth** (préfixe `/auth`)

- POST /auth/login — Connexion email/password
- GET /auth/google — Démarrage OAuth Google
- GET /auth/google/callback — Callback Google
- POST /auth/logout — Déconnexion
- GET /auth/check — Vérification session
- POST /auth/create-user — Création d'utilisateur (admin)

**Contact**

- POST /contact — Envoi formulaire de contact (Brevo + enregistrement en BDD)

**CV**

- GET /cv — Lecture CV (public)
- PUT /cv — Création/mise à jour CV (auth, multipart: imageWebpFr, imageWebpEn, pdfFr, pdfEn)
- DELETE /cv — Suppression CV (auth)

Les routes `/auth/*` et `/cv` (PUT/DELETE) utilisent des cookies de session (credentials). CORS est configuré dans `config/corsConfig.js`.

## Déploiement (Vercel)

Le projet est prévu pour Vercel (`vercel.json` : toutes les requêtes vers `index.js`). Définir les variables d'environnement dans le dashboard Vercel. En prod, `BACKEND_URL` et `FRONTEND_URL` doivent pointer vers les URLs réelles ; dans Google Cloud Console, l'URL de redirection autorisée doit être `https://<backend>/auth/google/callback`.
