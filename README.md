# 📦 PopWork - Gestion d'agence web interne

Application web de gestion d'agence construite avec Next.js 15, TypeScript, ShadCN UI et Supabase.

## 🚀 État du projet

✅ **Phase 1 - Fondations (En cours)**
- [x] Initialisation Next.js 15.4 avec TypeScript
- [x] Configuration ShadCN UI avec Tailwind CSS v4
- [x] Structure feature-based pour l'architecture frontend
- [x] Types de base de données définis
- [x] Layout dashboard principal créé
- [x] Page d'accueil du dashboard avec statistiques
- [x] Page projets de base
- [x] Configuration Supabase de base
- [ ] Authentification Supabase Auth
- [ ] Schéma de base de données complet
- [ ] Système de permissions et rôles

## 🛠 Stack Technique

- **Frontend:** Next.js 15.4, TypeScript, React 19
- **UI:** ShadCN UI, Tailwind CSS v4, Lucide Icons
- **Backend:** Supabase (Auth, Database, Storage, Realtime)
- **État:** Zustand (prévu)
- **Graphiques:** Recharts
- **Email:** Resend
- **Validation:** Zod + React Hook Form

## 📁 Structure du projet

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── dashboard/         # Pages du dashboard
│   └── layout.tsx         # Layout racine
├── components/            # Composants UI (ShadCN)
├── features/             # Architecture feature-based
│   ├── auth/             # Authentification
│   ├── projects/         # Gestion projets
│   ├── tasks/            # Gestion tâches
│   ├── time-tracking/    # Suivi du temps
│   ├── invoicing/        # Facturation
│   ├── clients/          # Gestion clients
│   ├── team/             # Gestion équipe
│   ├── calendar/         # Calendrier
│   ├── documents/        # Coffre-fort RH
│   ├── notifications/    # System de notifications
│   └── admin/            # Administration
├── layouts/              # Layouts réutilisables
├── lib/                  # Utilitaires et configuration
└── shared/               # Code partagé
    ├── hooks/            # Hooks personnalisés
    ├── types/            # Types TypeScript
    ├── utils/            # Fonctions utilitaires
    └── constants/        # Constantes
```

## 🚀 Installation et démarrage

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd popwork
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configuration environnement**
   Créer un fichier `.env.local` avec :
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Resend (pour l'envoi d'emails)
   RESEND_API_KEY=your_resend_api_key_here

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Lancer en développement**
   ```bash
   npm run dev
   ```

   L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 📋 Fonctionnalités prévues

### ✅ Implémenté (MVP de base)
- Dashboard principal avec statistiques
- Navigation latérale complète
- Layout responsive
- Page projets avec données mockées

### 🔄 En cours (Phase 1)
- Authentification Supabase
- Schéma de base de données
- Système de rôles et permissions

### 📋 Prochaines phases
- **Phase 2:** Gestion clients, projets, tâches
- **Phase 3:** Time tracking, équipe
- **Phase 4:** Facturation, calendrier
- **Phase 5:** Coffre-fort documentaire, congés
- **Phase 6:** Notifications, historique
- **Phase 7:** Accès client par liens magiques
- **Phase 8:** Tests
- **Phase 9:** Déploiement

## 🎯 Prochaines étapes

1. **Configurer Supabase:**
   - Créer un projet Supabase
   - Configurer l'authentification
   - Créer le schéma de base de données

2. **Implémenter l'authentification:**
   - Pages login/register
   - Protection des routes
   - Gestion des sessions

3. **Base de données:**
   - Créer toutes les tables selon `src/shared/types/database.ts`
   - Configurer les RLS (Row Level Security)
   - Créer les relations entre tables

## 📝 Documentation

- [MVP.md](./MVP.md) - Spécifications détaillées du MVP
- [TODO.md](./TODO.md) - Liste complète des tâches et suivi d'avancement

## 🤝 Développement

Le projet suit les principes de Clean Architecture et une organisation feature-based pour maintenir la scalabilité et la maintenabilité du code.

**Standards de code :**
- TypeScript strict
- Architecture feature-based
- Max 30 lignes par fonction
- Max 300 lignes par fichier
- Nomenclature claire et descriptive
- Pas de commentaires (code auto-documenté)
