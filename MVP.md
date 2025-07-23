# 📦 MVP Web App Interne - Gestion d’agence

## 🧱 Stack technique
- **Next.js** – Frontend & routing
- **ShadCN UI** – Composants UI modernes
- **Supabase** – Authentification, base de données, storage, realtime
- **Recharts** – Graphiques de performance
- **Resend / EmailJS** – Envoi d’e-mails automatiques

---

## ✅ Fonctionnalités principales

### 📁 Projets & Tâches
- Création de projets (sans date de fin obligatoire)
- Tâches avec : 
  - Statut (à faire, en cours, terminé…)
  - Priorité
  - Checklist, sous-tâches
  - Assignation multiple (par admin uniquement)
- Vue Kanban + liste
- Upload de documents

---

### 🕒 Time Tracking
- Timer individuel par tâche et utilisateur
- Démarrage manuel
- Historique des sessions
- Vue synthèse (par utilisateur, projet, jour)

---

### 🧾 Facturation
- Factures liées à une **entreprise** + **service**
- Génération PDF
- Envoi automatique par mail
- Relances automatiques
- Suivi des statuts : brouillon / envoyée / payée / en retard

---

### 👤 Gestion des Clients

#### Entreprises
- Nom, adresse siège, SIRET, email, téléphone

#### Services
- Nom, adresse, téléphone
- Lien avec une entreprise
- Utilisé pour la facturation

#### Contacts
- Prénom, nom, email, téléphone
- Lié à un service
- Permet d’envoyer un accès au projet

---

### ✉️ Accès client par lien magique
- Génération d’un lien unique (`/client/[token]`)
- Accès sécurisé au projet : avancement, tâches, documents
- Lecture seule
- Formulaire de feedback (avis libre)

---

### 👥 Équipe
- Rôles personnalisables (`admin`, `membre`, etc.)
- Permissions définies par rôle
- Fiches membres avec projets actifs et congés
- Empêche l’auto-assignation
- Affectation manuelle des tâches

---

### 📆 Calendrier
- Vue globale : tâches, congés, échéances factures
- Vue mensuelle/hebdomadaire (type agenda)

---

### 📂 Coffre-fort documentaire (RH)
- Stockage sécurisé des documents :
  - Fiches de paie
  - Contrats
  - Arrêts maladie
- Accès restreint à l’utilisateur concerné + admins

---

### 🌴 Congés
- Demande de congé (dates, motif)
- Validation par admin
- Suivi dans calendrier et dashboard RH

---

### 🔔 Notifications
- Toasts UI (nouvelle tâche, feedback, relance…)
- Emails automatiques (assignation, factures, relances)
- Optionnel : Slack integration

---

### 📜 Historique (Audit Log)
- Actions tracées : création/modification de tâches, projets, factures…
- Vue admin : qui a fait quoi et quand

---

## 📌 Modèles de données (principales tables Supabase)

- `users`, `roles`, `projects`, `tasks`, `task_assignees`, `task_timers`
- `companies`, `services`, `contacts`
- `invoices`, `notifications`, `activity_log`
- `documents` (RH), `leaves` (congés)
- `magic_links`, `client_feedbacks`

---

## 🎯 Prêt pour développement
- Priorisation possible par phase : MVP V1 → Automatisations → RH → Accès client
- Starter stack : `Next.js + Supabase + ShadCN UI + Auth + Layout + Routing`