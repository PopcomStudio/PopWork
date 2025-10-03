# Système de Facturation Électronique Française

Module de facturation conforme à la réglementation française 2026-2027 (EN-16931, Factur-X).

## 🎯 Conformité Réglementaire

✅ **Toutes les mentions obligatoires** selon CGI art. 242 nonies A
✅ **SIRET client obligatoire** depuis 01/07/2024 (B2B)
✅ **Type d'opération** (biens/services/mixte) - obligatoire 2026
✅ **Numérotation séquentielle** sans rupture
✅ **Piste d'audit fiable** (PAF) pour conformité fiscale
✅ **Préparation PDP** pour transmission 2026-2027
✅ **Archivage 6-10 ans** avec intégrité (SHA-256)

## 📁 Structure du Module

```
src/features/invoicing/
├── components/          # Composants React UI
│   ├── InvoiceManagement.tsx      # Composant principal de gestion
│   ├── InvoicesDataTable.tsx      # Tableau avec filtres et pagination
│   └── InvoiceDialog.tsx          # Dialog de création/édition
├── hooks/
│   └── use-invoices.ts            # Hook React pour CRUD factures
├── services/
│   ├── invoice-validation.service.ts    # Validation réglementaire
│   ├── invoice-numbering.service.ts     # Numérotation séquentielle
├── utils/
│   ├── siret-validator.ts         # Validation SIRET/SIREN (Luhn)
│   ├── vat-validator.ts           # Validation TVA EU
│   └── vat-calculator.ts          # Calcul TVA multi-taux
└── types/
    └── (voir shared/types/database.ts)
```

## 🗄️ Base de Données

### Tables Principales

#### `invoices`
Factures conformes EN-16931 avec toutes les mentions obligatoires:
- Numérotation séquentielle stricte (YYYY-NNNNN)
- Émetteur et client (SIRET, TVA, adresses)
- Type d'opération (goods/services/mixed)
- Montants HT, TVA, TTC
- Conditions de paiement
- Statuts: draft → validated → sent → paid

#### `invoice_lines`
Lignes de détail des factures:
- Description, quantité, unité
- Prix unitaire HT
- Remises ligne
- Taux TVA et montants
- Total TTC par ligne

#### `invoice_vat_breakdown`
Ventilation TVA par taux (mention obligatoire):
- Base HT par taux
- Montant TVA par taux
- Total TTC par taux

#### `invoice_archives`
Archives à valeur probante (NF Z42-013):
- Fichiers PDF/A-3 + XML
- Hash SHA-256 pour intégrité
- Horodatage qualifié
- Signature électronique (optionnel)
- Conservation 6-10 ans

#### `invoice_audit_trail`
Piste d'audit fiable (PAF):
- Tous les événements (création, validation, envoi, consultation)
- User, IP, timestamp
- Changements détaillés
- Métadonnées contextuelles

#### `pdp_configurations` & `pdp_transmissions`
Préparation pour PDP (Post 2026):
- Configuration des plateformes partenaires
- Historique des transmissions
- Accusés de réception
- Gestion des erreurs et relances

## 🛠️ Services et Utilitaires

### Validation

#### SIRET/SIREN (`siret-validator.ts`)
- Validation avec algorithme de Luhn
- Extraction SIREN depuis SIRET
- Formatage pour affichage
- Messages d'erreur détaillés

```typescript
import { validateSIRET, formatSIRET } from '@/features/invoicing/utils/siret-validator'

const isValid = validateSIRET('12345678901234')
const formatted = formatSIRET('12345678901234') // "123 456 789 01234"
```

#### TVA Intracommunautaire (`vat-validator.ts`)
- Validation tous pays EU (FR, BE, DE, ES, IT, etc.)
- Génération TVA française depuis SIREN
- Formatage par pays
- Support de 18 pays européens

```typescript
import { validateVAT, generateFrenchVAT } from '@/features/invoicing/utils/vat-validator'

const isValid = validateVAT('FR12345678901')
const vatNumber = generateFrenchVAT('123456789') // "FR12345678901"
```

#### Calculs TVA (`vat-calculator.ts`)
- Taux français: 20%, 10%, 5.5%, 2.1%, 0%
- Arrondis réglementaires (2 décimales)
- Calculs HT ↔ TTC
- Ventilation multi-taux
- Gestion des remises

```typescript
import {
  calculateAmountIncludingTax,
  calculateVATBreakdown,
  formatAmount
} from '@/features/invoicing/utils/vat-calculator'

const ttc = calculateAmountIncludingTax(100, 20) // 120.00€
const breakdown = calculateVATBreakdown(lines) // Ventilation par taux
```

### Numérotation (`invoice-numbering.service.ts`)

Génération de numéros séquentiels conformes:
- Format personnalisable: `{prefix}-{year}-{sequence}`
- Séquence sans trou (obligatoire)
- Rollover annuel automatique
- Thread-safe (transaction DB)
- Détection de rupture pour audit

```typescript
import { getNextInvoiceNumber } from '@/features/invoicing/services/invoice-numbering.service'

const { invoiceNumber, sequence } = await getNextInvoiceNumber()
// => { invoiceNumber: "2026-00001", sequence: 1 }
```

### Validation Factures (`invoice-validation.service.ts`)

Validation complète avant émission:
- Mentions obligatoires
- SIRET/SIREN émetteur et client
- Numéros de TVA
- Cohérence des montants
- Dates valides
- Conformité des lignes

```typescript
import { validateInvoice } from '@/features/invoicing/services/invoice-validation.service'

const result = validateInvoice(invoiceData)
if (!result.isValid) {
  console.log('Erreurs:', result.errors)
  console.log('Avertissements:', result.warnings)
}
```

## 🎨 Composants UI

### InvoiceManagement
Composant principal de gestion des factures:
- Liste/tableau avec filtres
- Recherche globale
- Actions (créer, éditer, voir)
- Gestion des erreurs

### InvoicesDataTable
Tableau avancé avec @tanstack/react-table:
- Tri par colonnes
- Filtres par statut
- Recherche full-text
- Pagination
- Actions contextuelles
- Badges de statut colorés
- Alertes échéances

### InvoiceDialog
Dialog de création/édition:
- Formulaire avec validation (zod + react-hook-form)
- Onglets: Général / Lignes / Notes
- Sélection client
- Type d'opération
- Conditions de paiement
- Notes publiques/privées

## 🔄 Hook React

### useInvoices

Hook principal pour la gestion des factures:

```typescript
const {
  invoices,              // Liste des factures
  loading,               // État de chargement
  error,                 // Erreurs
  fetchInvoices,         // Recharger les factures
  fetchInvoiceById,      // Charger une facture + lignes + TVA
  createDraft,           // Créer un brouillon
  updateDraft,           // Modifier un brouillon
  addLine,               // Ajouter une ligne
  deleteLine,            // Supprimer une ligne
  recalculateInvoiceTotals, // Recalculer les totaux
  validateInvoice,       // Valider (attribution numéro)
} = useInvoices()
```

## 📋 Statuts des Factures

| Statut | Description | Modifiable | Actions possibles |
|--------|-------------|------------|-------------------|
| `draft` | Brouillon | ✅ Oui | Éditer, Supprimer |
| `validated` | Validée (numéro attribué) | ❌ Non | Envoyer, Annuler (avoir) |
| `sent` | Envoyée au client | ❌ Non | Relancer, Encaisser |
| `paid` | Payée | ❌ Non | Archiver |
| `partial_paid` | Partiellement payée | ❌ Non | Relancer, Encaisser |
| `overdue` | En retard | ❌ Non | Relancer, Mise en demeure |
| `cancelled` | Annulée (avec avoir) | ❌ Non | - |

## 🚀 Prochaines Étapes

### Phase 2 - Génération Factur-X (à implémenter)
- [ ] Générateur PDF/A-3
- [ ] Générateur XML EN-16931
- [ ] Embedding XML dans PDF
- [ ] Validateur XSD
- [ ] Profils Factur-X (MINIMUM, BASIC, EN16931, EXTENDED)

### Phase 3 - Archivage (à implémenter)
- [ ] Système d'archivage automatique
- [ ] Calcul hash SHA-256
- [ ] Horodatage qualifié (RFC 3161)
- [ ] Signature électronique (optionnel)
- [ ] Export archives avec métadonnées

### Phase 4 - PDP Integration (Post 2026)
- [ ] Client API PDP
- [ ] Annuaire destinataires
- [ ] Gestion accusés réception
- [ ] File d'attente envois
- [ ] Relances automatiques

## 📖 Références Réglementaires

- **EN-16931**: Norme sémantique européenne pour facture électronique
- **Factur-X 1.07.3**: Standard franco-allemand (PDF/A-3 + XML)
- **CGI art. 242 nonies A**: Mentions obligatoires françaises
- **NF Z42-013**: Archivage à valeur probante
- **Délais**:
  - Réception obligatoire: 01/09/2026 (toutes entreprises)
  - Émission obligatoire: 01/09/2026 (grandes entreprises/ETI)
  - Émission obligatoire: 01/09/2027 (PME/TPE)

## 🧪 Tests

*À implémenter*

Couvrir:
- Validation SIRET/SIREN (cas limites)
- Validation TVA (tous pays EU)
- Calculs TVA multi-taux
- Numérotation séquentielle (concurrence)
- Validation factures (tous cas)
- Génération PDF/XML
- Archivage et intégrité

## 📝 Notes de Développement

### Sécurité
- RLS policies activées sur toutes les tables
- Clés API PDP chiffrées
- Audit trail complet (IP, user, timestamp)
- Validation stricte côté serveur

### Performance
- Index sur colonnes fréquemment filtrées
- Pagination côté serveur
- Chargement lazy des lignes de facture
- Cache pour configuration organisation

### Bonnes Pratiques
- Une facture validée ne peut être modifiée (annulation par avoir uniquement)
- Numérotation strictement séquentielle (aucune rupture autorisée)
- Tous les montants arrondis à 2 décimales
- Audit trail pour toutes les opérations critiques
- Préservation des preuves pour contrôles fiscaux
