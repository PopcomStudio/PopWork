# Plan de Complétion UI - Système de Facturation Électronique

## 📊 Analyse de l'Existant (État Actuel)

### ✅ Déjà Implémenté

#### Backend (Hook `use-invoices.ts`)
- ✅ `fetchInvoices()` - Charger toutes les factures
- ✅ `fetchInvoiceById()` - Charger une facture avec lignes et ventilation TVA
- ✅ `createDraft()` - Créer un brouillon de facture
- ✅ `updateDraft()` - Modifier un brouillon (avec protection sur factures validées)
- ✅ `addLine()` - Ajouter une ligne de facture
- ✅ `deleteLine()` - Supprimer une ligne de facture
- ✅ `recalculateInvoiceTotals()` - Recalculer totaux HT/TVA/TTC + ventilation TVA
- ✅ `validateInvoice()` - Valider une facture (attribution numéro définitif)
- ✅ `createAuditEntry()` - Créer entrée dans piste d'audit (PAF)

#### Frontend (Composants UI)
- ✅ `InvoiceManagement.tsx` - Container principal avec state management
- ✅ `InvoicesDataTable.tsx` - Tableau avancé avec:
  - Tri par colonnes
  - Recherche globale
  - Filtres par statut
  - Pagination
  - Badges colorés par statut
  - Actions de base (Edit via dropdown menu)
- ✅ `InvoiceDialog.tsx` - Dialog de création/édition avec:
  - Onglets (Général/Lignes/Notes)
  - Formulaire avec validation (react-hook-form + zod)
  - Sélection client
  - Type d'opération
  - Conditions de paiement

### ❌ Manquant (Gaps Identifiés)

#### 1. **Workflow Actions** (Priorité HAUTE)
Le cycle de vie complet d'une facture n'est pas géré:
- ❌ `markAsSent()` - Marquer comme envoyée (draft → validated → **sent**)
- ❌ `recordPayment()` - Enregistrer un paiement (sent → paid/partial_paid)
- ❌ `createCreditNote()` - Créer un avoir (annulation)
- ❌ `cancelInvoice()` - Annuler une facture (avec raison)

**Problème:** Actuellement, une facture peut être créée et validée, mais ensuite elle reste bloquée. Pas de moyen de:
- L'envoyer au client
- Enregistrer un paiement
- L'annuler si erreur

#### 2. **Vue Détaillée** (Priorité HAUTE)
Aucun composant pour visualiser une facture complète en lecture seule:
- ❌ Affichage formaté comme une vraie facture
- ❌ Historique des événements (audit trail)
- ❌ Historique des paiements
- ❌ Statut PDP (futur)
- ❌ Téléchargement PDF (prévu Phase 4)

**Problème:** Les utilisateurs ne peuvent que voir les factures dans un tableau, pas les consulter en détail.

#### 3. **Gestion Complète des Lignes** (Priorité MOYENNE)
Le `InvoiceDialog` a les onglets mais ne gère pas réellement les lignes:
- ❌ Onglet "Lignes" non implémenté (vide actuellement)
- ❌ Pas de formulaire pour ajouter/éditer des lignes
- ❌ Pas de calcul automatique (quantité × prix × TVA)
- ❌ Pas de gestion des remises ligne par ligne

**Problème:** Impossible de créer une facture avec des lignes via l'UI.

#### 4. **Gestion des Paiements** (Priorité HAUTE)
Aucun composant pour enregistrer les paiements:
- ❌ Dialog d'enregistrement de paiement
- ❌ Choix du montant (partiel/total)
- ❌ Choix du mode de paiement
- ❌ Date et référence de paiement
- ❌ Mise à jour automatique du statut (paid/partial_paid)

**Problème:** Table `invoice_payments` existe mais aucun moyen de l'utiliser.

#### 5. **Statistiques & Dashboard** (Priorité BASSE)
Aucune vue d'ensemble:
- ❌ Chiffre d'affaires total
- ❌ Montant des impayés
- ❌ Factures en retard
- ❌ Graphiques d'évolution

**Note:** Non critique pour le MVP, mais important pour l'expérience utilisateur.

---

## 🎯 Plan d'Implémentation (Option 1 - Compléter l'UI)

### Phase 3.1 - Extension du Hook `use-invoices` (1-2h)

**Objectif:** Ajouter toutes les actions de workflow manquantes

#### Nouvelles Fonctions à Implémenter

1. **`markAsSent(invoiceId: string, sentDate?: string)`**
   - Change status: `validated` → `sent`
   - Enregistre la date d'envoi
   - Crée audit trail entry
   - Utilisation: Après envoi email/courrier au client

2. **`recordPayment(invoiceId: string, payment: PaymentInput)`**
   ```typescript
   interface PaymentInput {
     amount: number
     payment_method: 'bank_transfer' | 'check' | 'credit_card' | 'direct_debit' | 'cash'
     payment_date: string
     payment_reference?: string
     transaction_id?: string
     notes?: string
   }
   ```
   - Insère dans `invoice_payments`
   - Calcule total payé
   - Met à jour status: `sent` → `paid` ou `partial_paid`
   - Crée audit trail entry

3. **`createCreditNote(originalInvoiceId: string, reason: string)`**
   - Clone la facture originale
   - Inverse les montants (négatifs)
   - Set `is_credit_note: true`
   - Set `original_invoice_id`
   - Génère nouveau numéro (AV-YYYY-NNNNN)
   - Annule la facture originale (status → `cancelled`)
   - Double audit trail (original + avoir)

4. **`cancelInvoice(invoiceId: string, reason: string)`**
   - Vérifie qu'aucun paiement n'est enregistré
   - Change status → `cancelled`
   - Enregistre raison et date
   - Crée audit trail entry

5. **`fetchPayments(invoiceId: string)`**
   - Charge tous les paiements d'une facture
   - Pour affichage dans vue détaillée

6. **`fetchAuditTrail(invoiceId: string)`**
   - Charge l'historique complet des événements
   - Pour affichage dans vue détaillée

#### Fichiers à Modifier
- `src/features/invoicing/hooks/use-invoices.ts` (+200 lignes)

---

### Phase 3.2 - Vue Détaillée Facture (2-3h)

**Objectif:** Créer un composant pour visualiser une facture complète

#### Composant `InvoiceView.tsx`

**Sections du composant:**

1. **Header**
   - Numéro de facture (grand, gras)
   - Badge de statut
   - Date de facturation
   - Date d'échéance
   - Actions rapides (selon statut)

2. **Section Émetteur/Client** (2 colonnes)
   - Émetteur (gauche):
     - Nom entreprise
     - Adresse complète
     - SIRET
     - TVA
   - Client (droite):
     - Nom entreprise/service
     - Adresse complète
     - SIRET (si B2B)
     - TVA (si applicable)

3. **Section Lignes de Facture** (Tableau)
   | Description | Qté | Unité | PU HT | Remise | Total HT | TVA | Total TTC |
   |-------------|-----|-------|-------|---------|----------|-----|-----------|
   | ...         | ... | ...   | ...   | ...     | ...      | ... | ...       |

4. **Section Totaux** (Alignée à droite)
   - Sous-total HT
   - Ventilation TVA par taux:
     - Base HT à 20%: XXX €
     - TVA 20%: XXX €
     - Base HT à 10%: XXX €
     - TVA 10%: XXX €
   - **Total TTC**
   - Remise globale (si applicable)

5. **Section Conditions de Paiement**
   - Modalités (net 30, etc.)
   - Date d'échéance
   - Pénalités de retard
   - Indemnité forfaitaire

6. **Section Paiements** (Si paiements enregistrés)
   | Date | Montant | Mode | Référence | Statut |
   |------|---------|------|-----------|--------|
   | ...  | ...     | ...  | ...       | ...    |
   - Reste à payer (si partial_paid)

7. **Section Historique** (Accordéon)
   | Date/Heure | Événement | Utilisateur | Détails |
   |------------|-----------|-------------|---------|
   | ...        | ...       | ...         | ...     |

8. **Section Notes**
   - Notes client (visibles sur facture)
   - Notes internes (admin only)

#### Actions Contextuelles (selon statut)

```
draft:
  → [Éditer] [Valider] [Supprimer]

validated:
  → [Marquer comme envoyée] [Annuler]

sent:
  → [Enregistrer paiement] [Relancer] [Créer avoir]

paid:
  → [Télécharger PDF] [Archiver]

partial_paid:
  → [Enregistrer paiement] [Relancer]

overdue:
  → [Enregistrer paiement] [Mise en demeure] [Créer avoir]

cancelled:
  → [Voir l'avoir]
```

#### Fichiers à Créer
- `src/features/invoicing/components/InvoiceView.tsx` (+400 lignes)
- Utilise `Sheet` ou `Dialog` plein écran de ShadCN

---

### Phase 3.3 - Actions de Workflow (1-2h)

**Objectif:** Créer les composants pour les actions principales

#### Composant `InvoiceActions.tsx`

Menu déroulant contextuel avec actions selon statut:

```typescript
interface InvoiceActionsProps {
  invoice: Invoice
  onAction: (action: string) => void
}
```

**Actions disponibles:**
- Voir (tous statuts)
- Éditer (draft uniquement)
- Valider (draft)
- Marquer comme envoyée (validated)
- Enregistrer paiement (sent, partial_paid, overdue)
- Créer avoir (validated, sent, paid, partial_paid, overdue)
- Annuler (validated, sent)
- Supprimer (draft uniquement)

#### Confirmation Dialogs

1. **`ConfirmValidateDialog.tsx`**
   - Affiche résumé de la facture
   - Affiche warnings de validation (si présents)
   - Confirme attribution du numéro définitif
   - **Important:** Action irréversible

2. **`ConfirmSendDialog.tsx`**
   - Date d'envoi (défaut: aujourd'hui)
   - Moyen d'envoi (email/courrier)
   - Adresse email destinataire (si email)

3. **`ConfirmCancelDialog.tsx`**
   - Raison obligatoire (textarea)
   - Avertissement sur création d'avoir

#### Fichiers à Créer
- `src/features/invoicing/components/InvoiceActions.tsx` (+200 lignes)
- `src/features/invoicing/components/dialogs/ConfirmValidateDialog.tsx` (+100 lignes)
- `src/features/invoicing/components/dialogs/ConfirmSendDialog.tsx` (+100 lignes)
- `src/features/invoicing/components/dialogs/ConfirmCancelDialog.tsx` (+100 lignes)

---

### Phase 3.4 - Gestion des Paiements (1-2h)

**Objectif:** Permettre l'enregistrement des paiements

#### Composant `PaymentDialog.tsx`

**Formulaire:**
- Montant (number, max = reste à payer)
  - Bouton "Solde complet" pour remplir automatiquement
- Mode de paiement (select)
  - Virement bancaire
  - Chèque
  - Carte de crédit
  - Prélèvement automatique
  - Espèces
- Date de paiement (date picker)
- Référence de paiement (text, optionnel)
- Transaction ID (text, optionnel - pour CB)
- Notes (textarea, optionnel)

**Validation:**
- Montant > 0
- Montant <= reste à payer
- Date <= aujourd'hui
- Si chèque: référence requise

**Actions:**
- Enregistrer
- Annuler

**Après enregistrement:**
- Mise à jour automatique du statut facture
- Affichage toast de confirmation
- Recharge de la facture

#### Affichage des Paiements

Dans `InvoiceView.tsx`, section Paiements:
- Liste tous les paiements avec détails
- Affiche total payé
- Affiche reste à payer (si partiel)
- Bouton "Enregistrer un paiement" si pas complètement payée

#### Fichiers à Créer
- `src/features/invoicing/components/dialogs/PaymentDialog.tsx` (+300 lignes)

---

### Phase 3.5 - Amélioration Gestion des Lignes (2-3h)

**Objectif:** Rendre l'onglet "Lignes" du `InvoiceDialog` fonctionnel

#### Onglet "Lignes" du `InvoiceDialog`

**Structure:**
1. **Tableau des lignes existantes**
   - Affichage éditable ou non selon statut
   - Colonnes: Description, Qté, Unité, PU HT, Remise %, TVA %, Total HT, Total TTC
   - Actions: Éditer, Supprimer (si draft)

2. **Formulaire d'ajout de ligne**
   - Description (textarea)
   - Code produit (text, optionnel)
   - Quantité (number, min 0.001)
   - Unité (select: unité, heure, jour, kg, m², forfait, etc.)
   - Prix unitaire HT (number)
   - Remise ligne (%, optionnel)
   - Taux TVA (select: 20%, 10%, 5.5%, 2.1%, 0%)
   - **Calculs automatiques affichés:**
     - Sous-total HT = quantité × PU
     - Après remise = sous-total × (1 - remise%)
     - TVA = après remise × taux TVA
     - Total TTC = après remise + TVA

3. **Totaux dynamiques** (bas de page)
   - Total lignes HT
   - Total TVA
   - Total TTC
   - **Se met à jour en temps réel**

#### Composant `InvoiceLineForm.tsx`

Formulaire réutilisable pour ajouter/éditer une ligne:
- Mode: 'add' | 'edit'
- Valeurs initiales (si edit)
- Validation Zod
- Calculs automatiques
- Callbacks: onSubmit, onCancel

#### Fichiers à Modifier/Créer
- `src/features/invoicing/components/InvoiceDialog.tsx` (modification majeure onglet Lignes)
- `src/features/invoicing/components/forms/InvoiceLineForm.tsx` (+250 lignes)

---

### Phase 3.6 - Intégration & Navigation (1h)

**Objectif:** Connecter tous les composants

#### Modifications `InvoiceManagement.tsx`

1. **Ajouter état pour vue détaillée:**
   ```typescript
   const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
   ```

2. **Ajouter handlers:**
   - `handleView(invoice)` - Ouvre InvoiceView
   - `handleValidate(invoice)` - Ouvre ConfirmValidateDialog
   - `handleSend(invoice)` - Ouvre ConfirmSendDialog
   - `handlePayment(invoice)` - Ouvre PaymentDialog
   - `handleCancel(invoice)` - Ouvre ConfirmCancelDialog
   - `handleCreditNote(invoice)` - Crée avoir

3. **Passer les props:**
   - À `InvoicesDataTable`: ajouter `onView`
   - À `InvoiceActions`: passer tous les handlers

#### Modifications `InvoicesDataTable.tsx`

1. **Ajouter colonne Actions:**
   - Utilise `InvoiceActions` component
   - Remplace l'actuel DropdownMenu basique

2. **Ajouter double-clic:**
   - Sur une ligne → ouvre vue détaillée

#### Fichiers à Modifier
- `src/features/invoicing/components/InvoiceManagement.tsx` (refactoring majeur)
- `src/features/invoicing/components/InvoicesDataTable.tsx` (ajout colonne Actions)

---

### Phase 3.7 - Gestion des Avoirs (1-2h)

**Objectif:** Permettre l'annulation de factures par avoir

#### Composant `CreditNoteDialog.tsx`

**Formulaire:**
- Facture originale (affichage read-only):
  - Numéro
  - Client
  - Montant TTC
  - Date
- Raison d'annulation (textarea, requis)
  - Erreur de facturation
  - Retour de marchandise
  - Remise commerciale
  - Autre (préciser)
- Choix:
  - [ ] Avoir total (tous les montants inversés)
  - [ ] Avoir partiel (sélectionner lignes à annuler)

**Si avoir partiel:**
- Checkbox sur chaque ligne de la facture originale
- Possibilité d'ajuster quantités

**Validation:**
- Raison obligatoire
- Au moins une ligne sélectionnée (si partiel)

**Après création:**
- Crée un nouvel invoice avec:
  - `is_credit_note: true`
  - `original_invoice_id: originalId`
  - `credit_note_reason: reason`
  - Numéro format: AV-YYYY-NNNNN
  - Montants négatifs
  - Lignes clonées avec quantités négatives
- Facture originale → status `cancelled`
- Audit trail sur les deux factures

#### Fichiers à Créer
- `src/features/invoicing/components/dialogs/CreditNoteDialog.tsx` (+350 lignes)

---

### Phase 3.8 - Feedback & UX (1h)

**Objectif:** Améliorer l'expérience utilisateur

#### Toasts & Notifications

Ajouter notifications pour chaque action:
- ✅ Facture créée
- ✅ Facture mise à jour
- ✅ Facture validée (avec numéro)
- ✅ Facture envoyée
- ✅ Paiement enregistré
- ✅ Avoir créé
- ✅ Facture annulée
- ❌ Erreurs avec détails

#### Loading States

- Skeleton loaders pendant chargement
- Spinners sur les boutons d'action
- Disabled states pendant traitement

#### Empty States

- Message quand aucune facture
- Bouton "Créer votre première facture"
- Illustration (optionnel)

#### Confirmations Visuelles

- Animations subtiles sur changements de statut
- Highlighting temporaire après action

#### Fichiers à Modifier
- Tous les composants créés/modifiés
- Utilisation de `@/components/ui/toast` (ShadCN)

---

## 📦 Résumé des Livrables

### Nouveaux Fichiers (13 fichiers)

**Composants principaux:**
1. `src/features/invoicing/components/InvoiceView.tsx`
2. `src/features/invoicing/components/InvoiceActions.tsx`
3. `src/features/invoicing/components/forms/InvoiceLineForm.tsx`

**Dialogs:**
4. `src/features/invoicing/components/dialogs/PaymentDialog.tsx`
5. `src/features/invoicing/components/dialogs/CreditNoteDialog.tsx`
6. `src/features/invoicing/components/dialogs/ConfirmValidateDialog.tsx`
7. `src/features/invoicing/components/dialogs/ConfirmSendDialog.tsx`
8. `src/features/invoicing/components/dialogs/ConfirmCancelDialog.tsx`

### Fichiers Modifiés (3 fichiers)

1. `src/features/invoicing/hooks/use-invoices.ts`
   - +6 nouvelles fonctions
   - +200 lignes environ

2. `src/features/invoicing/components/InvoiceManagement.tsx`
   - Refactoring pour gérer toutes les actions
   - +150 lignes environ

3. `src/features/invoicing/components/InvoicesDataTable.tsx`
   - Ajout colonne Actions
   - +50 lignes environ

4. `src/features/invoicing/components/InvoiceDialog.tsx`
   - Implémentation complète onglet Lignes
   - +300 lignes environ

### Estimation Temps Total

- Phase 3.1 (Hook): 1-2h
- Phase 3.2 (Vue détaillée): 2-3h
- Phase 3.3 (Actions): 1-2h
- Phase 3.4 (Paiements): 1-2h
- Phase 3.5 (Lignes): 2-3h
- Phase 3.6 (Intégration): 1h
- Phase 3.7 (Avoirs): 1-2h
- Phase 3.8 (UX): 1h

**Total: 10-16 heures de développement**

---

## 🎯 Ordre d'Implémentation Recommandé

### Sprint 1 (Fonctionnalités Critiques) - 5-7h
1. Phase 3.1 - Extension Hook (actions de base)
2. Phase 3.5 - Gestion des Lignes (pour pouvoir créer des factures réelles)
3. Phase 3.2 - Vue Détaillée (visualisation)

**Après ce sprint:** On peut créer des factures complètes et les visualiser.

### Sprint 2 (Workflow Complet) - 3-5h
4. Phase 3.3 - Actions de Workflow
5. Phase 3.4 - Gestion des Paiements
6. Phase 3.6 - Intégration

**Après ce sprint:** Cycle de vie complet opérationnel.

### Sprint 3 (Fonctionnalités Avancées) - 2-4h
7. Phase 3.7 - Gestion des Avoirs
8. Phase 3.8 - Feedback & UX

**Après ce sprint:** Système complet et poli.

---

## ✅ Critères de Succès

Une UI est considérée "complète" quand:
- [ ] On peut créer une facture avec lignes depuis l'UI
- [ ] On peut voir une facture complète (vue détaillée)
- [ ] On peut valider une facture (draft → validated)
- [ ] On peut marquer comme envoyée (validated → sent)
- [ ] On peut enregistrer un paiement (sent → paid)
- [ ] On peut créer un avoir
- [ ] On peut voir l'historique des événements (audit trail)
- [ ] On peut voir l'historique des paiements
- [ ] Les calculs TVA se font automatiquement
- [ ] Le workflow est guidé et intuitif
- [ ] Les actions impossibles sont désactivées (selon statut)
- [ ] Les erreurs sont claires et exploitables

---

## 📝 Notes Techniques

### Sécurité
- Toutes les actions critiques (valider, annuler) doivent avoir confirmation
- Validation côté serveur en plus de la validation côté client
- Vérifier les permissions avant chaque action

### Performance
- Lazy loading des composants lourds (InvoiceView)
- Optimistic updates pour meilleure UX
- Cache des données fréquentes (liste entreprises)

### Accessibilité
- Tous les dialogs doivent être accessibles au clavier
- Labels ARIA sur tous les contrôles
- Messages d'erreur lisibles par screen readers

### Tests
- Tests unitaires pour chaque nouvelle fonction du hook
- Tests d'intégration pour les workflows complets
- Tests E2E pour les parcours utilisateur critiques

---

**Document créé:** 1er octobre 2025
**Auteur:** Claude (Assistant IA)
**Version:** 1.0
