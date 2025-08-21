# 📦 PopWork - Gestion d'agence web interne

Application web de gestion d'agence construite avec Next.js 15, TypeScript, ShadCN UI et Supabase.

## 🚀 État du projet

✅ **Phase 1 - Fondations (TERMINÉE)**
- [x] Initialisation Next.js 15 avec TypeScript
- [x] Configuration ShadCN UI avec Tailwind CSS v4
- [x] Structure feature-based pour l'architecture frontend
- [x] Types de base de données définis
- [x] Layout dashboard principal créé avec PageLayout component
- [x] Page d'accueil du dashboard avec statistiques
- [x] Navigation responsive avec AppSidebar
- [x] Configuration Supabase complète
- [x] Authentification Supabase Auth avec hooks custom (`useAuth`)
- [x] Schéma de base de données complet (toutes tables créées)
- [x] Système de permissions et rôles configurables

🔄 **Phase 2 - Cœur Métier (EN COURS)**
- [x] Interface de gestion des clients/entreprises/services/contacts
- [x] Système de projets avec Kanban et assignation d'utilisateurs  
- [x] Custom hooks pour data fetching (`use-projects.ts`, `use-dashboard-data.ts`)
- [x] Améliorations récentes : CMD+K optimisé et résolution problèmes d'assignation
- [ ] Finalisation système complet de tâches (CRUD complet)
- [ ] Gestion avancée des statuts et priorités des tâches

## 🛠 Stack Technique

- **Frontend:** Next.js 15, TypeScript, React 19
- **UI:** ShadCN UI, Tailwind CSS v4, Lucide Icons, Radix UI primitives
- **Backend:** Supabase (Auth, Database, Storage, Realtime)
- **Architecture:** Feature-based avec PageLayout component
- **Hooks:** Custom hooks pour authentification et data fetching  
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

### ✅ Implémenté (Phase 1 complète)
- Dashboard principal avec statistiques et custom hooks
- Navigation latérale complète avec AppSidebar
- Layout responsive avec PageLayout component
- Authentification Supabase avec hooks custom (`useAuth`)
- Schéma de base de données complet (toutes tables)
- Système de rôles et permissions configurables
- Interface Kanban pour projets avec assignation utilisateurs
- Gestion complète clients/entreprises/services/contacts

### 🔄 En cours (Phase 2)
- Finalisation du système de tâches (CRUD complet)
- Gestion avancée des statuts et priorités
- Optimisations d'interface utilisateur

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

1. **Phase 2 - Finalisation Cœur Métier:**
   - Finaliser le CRUD complet des tâches
   - Optimiser les interactions Kanban 
   - Améliorer l'UX des assignations d'utilisateurs

2. **Améliorations continues:**
   - Tests et validation des nouvelles fonctionnalités
   - Optimisation des performances
   - Amélioration de l'accessibilité

3. **Phase 3 - Préparation:**
   - Conception du système de time tracking
   - Architecture de gestion d'équipe

## 📝 Documentation

- [MVP.md](./MVP.md) - Spécifications détaillées du MVP
- [TODO.md](./TODO.md) - Liste complète des tâches et suivi d'avancement

## 🤝 Développement

Le projet suit les principes de Clean Architecture et une organisation feature-based pour maintenir la scalabilité et la maintenabilité du code.

**Standards de code :**
- TypeScript strict mode activé
- Architecture feature-based avec PageLayout obligatoire pour nouvelles pages
- Max 30 lignes par fonction
- Max 300 lignes par fichier
- Nomenclature claire et descriptive avec préfixes feature
- Pas de commentaires (code auto-documenté)
- Custom hooks pour data fetching et business logic
- ShadCN UI avec Radix UI primitives pour tous composants

**Dernière mise à jour :** 21 août 2025
