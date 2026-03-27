# Assistant Bank Frontend

Frontend Next.js pour la plateforme BankIA Suite.

## 🚀 Technologies

- **Next.js 16** - Framework React avec App Router
- **TypeScript** - Typage statique
- **Tailwind CSS 4** - Framework CSS utilitaire
- **React 19** - Bibliothèque UI

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn
- Backend FastAPI en cours d'exécution sur `http://localhost:8000`

## 🔧 Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier .env.local (déjà créé)
# Vérifier que NEXT_PUBLIC_API_URL pointe vers votre backend

# Démarrer le serveur de développement
npm run dev
```

Le site sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du projet

```
assistant-bank-frontend/
├── app/                    # App Router (pages et layouts)
│   ├── layout.tsx         # Layout principal
│   └── page.tsx           # Page d'accueil
├── lib/                    # Utilitaires et helpers
│   └── api/               # Client API pour communiquer avec FastAPI
│       ├── client.ts       # Client HTTP générique
│       └── auth.ts         # API d'authentification
├── components/             # Composants React réutilisables
├── public/                 # Assets statiques
└── .env.local             # Variables d'environnement
```

## 🔌 Configuration API

Le frontend communique avec le backend FastAPI via le client API dans `lib/api/`.

**Variables d'environnement** (`.env.local`):
- `NEXT_PUBLIC_API_URL` - URL du backend FastAPI (défaut: `http://localhost:8000`)

## 🗄️ Base de données

**MongoDB est géré par le backend FastAPI**, pas directement depuis le frontend.

Le backend utilise:
- **Motor** (AsyncIOMotorClient) pour MongoDB
- Configuration dans `app/core/config.py`:
  - `MONGO_URI` - URI de connexion MongoDB
  - `MONGO_DB_NAME` - Nom de la base de données

Le frontend communique uniquement avec l'API REST du backend, qui gère toutes les opérations MongoDB.

## 📝 Scripts disponibles

- `npm run dev` - Démarrer le serveur de développement
- `npm run build` - Build de production
- `npm run start` - Démarrer le serveur de production
- `npm run lint` - Lancer ESLint

## 🔐 Authentification

L'authentification utilise JWT. Le token est stocké dans `localStorage` et automatiquement inclus dans les requêtes API.

## 🛠️ Développement

1. Démarrer le backend FastAPI:
   ```bash
   cd ../assistant-banque-backend
   uvicorn app.main:app --reload
   ```

2. Démarrer le frontend Next.js:
   ```bash
   npm run dev
   ```

3. Accéder à l'application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Documentation API: http://localhost:8000/docs

## 📚 Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
