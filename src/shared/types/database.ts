// Types de base pour la base de données Supabase

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  roleId: string
  createdAt: string
  updatedAt: string
  avatarUrl?: string
  workingHoursPerWeek?: number
  startDate?: string
  contractType?: 'full_time' | 'part_time' | 'intern' | 'freelance'
}

export interface Role {
  id: string
  name: string
  permissions: string[]
  createdAt: string
  updatedAt: string
}

export interface Company {
  id: string
  name: string
  address: string
  siret: string
  email: string
  phone: string
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  name: string
  address: string
  phone: string
  companyId: string
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  serviceId: string
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  companyId: string
  serviceId: string
  createdAt: string
  updatedAt: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project_id: string
  due_date?: string
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  id: string
  taskId: string
  userId: string
  assignedAt: string
}

export interface ProjectAssignee {
  id: string
  projectId: string
  userId: string
  assignedAt: string
}

export interface TaskTimer {
  id: string
  taskId: string
  userId: string
  startTime: string
  endTime?: string
  duration?: number
  createdAt: string
}

export interface TimeEntry {
  id: string
  task_id: string
  user_id: string
  start_time: string
  end_time?: string
  duration?: number
  description?: string
  created_at: string
  updated_at: string
}

export interface TaskTimeSummary {
  task_id: string
  unique_contributors: number
  total_duration: number
  first_entry: string
  last_entry: string
}

export interface UserTaskTimeSummary {
  task_id: string
  user_id: string
  entry_count: number
  total_duration: number
  avg_duration: number
  first_entry: string
  last_entry: string
}

export interface Tag {
  id: string
  name: string
  color: string
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface TaskTag {
  id: string
  taskId: string
  tagId: string
  createdAt: string
}

// ============================================
// FACTURATION ÉLECTRONIQUE FRANÇAISE (2026)
// Conforme réglementation française et EN-16931
// ============================================

/**
 * Type d'opération selon réglementation française 2026
 */
export type InvoiceOperationType =
  | 'goods' // Livraison de biens uniquement
  | 'services' // Prestation de services uniquement
  | 'mixed' // Mixte (biens + services)

/**
 * Statut du cycle de vie d'une facture
 */
export type InvoiceStatus =
  | 'draft' // Brouillon (modifiable)
  | 'validated' // Validée (numéro attribué, plus de modification)
  | 'sent' // Envoyée au client
  | 'paid' // Payée
  | 'partial_paid' // Partiellement payée
  | 'overdue' // En retard de paiement
  | 'cancelled' // Annulée (avec avoir)

/**
 * Conditions de paiement
 */
export type PaymentTerms =
  | 'immediate' // Paiement immédiat
  | 'net_15' // 15 jours nets
  | 'net_30' // 30 jours nets
  | 'net_45' // 45 jours nets
  | 'net_60' // 60 jours nets
  | 'end_of_month' // Fin de mois
  | 'custom' // Personnalisé

/**
 * Moyen de paiement accepté
 */
export type PaymentMethod =
  | 'bank_transfer' // Virement bancaire
  | 'check' // Chèque
  | 'credit_card' // Carte bancaire
  | 'direct_debit' // Prélèvement
  | 'cash' // Espèces (< 1000€)

/**
 * Facture conforme réglementation française
 * Toutes les mentions obligatoires selon CGI art. 242 nonies A
 */
export interface Invoice {
  // Identification
  id: string
  invoice_number: string // Format: YYYY-NNNNN (séquentiel strict)
  invoice_date: string // Date d'émission ISO 8601

  // Type et statut
  operation_type: InvoiceOperationType // Obligatoire depuis 2026
  status: InvoiceStatus
  is_credit_note: boolean // Avoir ou facture normale
  credit_note_reason?: string
  original_invoice_id?: string // Si avoir, référence à la facture d'origine

  // Parties (émetteur et destinataire)
  issuer_company_id: string // Entreprise émettrice (notre société)
  issuer_name: string
  issuer_address: string
  issuer_postal_code: string
  issuer_city: string
  issuer_country: string // Code ISO 3166-1 alpha-2 (FR)
  issuer_siret: string // 14 chiffres (obligatoire)
  issuer_vat_number?: string // TVA intracommunautaire (si applicable)
  issuer_legal_form?: string // SA, SARL, SAS, etc.
  issuer_share_capital?: number // Capital social (si société)
  issuer_rcs?: string // RCS + ville (ex: "RCS Paris 123 456 789")

  customer_company_id: string // ID client dans notre BDD
  customer_service_id?: string // Service du client (optionnel)
  customer_name: string
  customer_address: string
  customer_postal_code: string
  customer_city: string
  customer_country: string
  customer_siret?: string // Obligatoire depuis 01/07/2024 si B2B
  customer_vat_number?: string // Si client assujetti TVA

  // Montants
  subtotal_excluding_tax: number // Total HT
  total_vat_amount: number // Total TVA
  total_including_tax: number // Total TTC

  // Remises et escomptes
  discount_rate?: number // % de remise globale
  discount_amount?: number // Montant de remise en €
  early_payment_discount_rate?: number // Escompte pour paiement anticipé
  early_payment_discount_conditions?: string

  // Conditions de paiement
  payment_terms: PaymentTerms
  payment_terms_days?: number // Si custom
  payment_due_date: string // Date limite de paiement ISO 8601
  payment_method?: PaymentMethod
  late_payment_penalty_rate?: number // Pénalités de retard (légal: 3 x taux BCE + 10 points)
  late_payment_fixed_fee?: number // Indemnité forfaitaire (légal: 40€)

  // Références
  project_id?: string // Projet associé (optionnel)
  purchase_order_reference?: string // Bon de commande client
  contract_reference?: string // Référence contrat

  // Notes et commentaires
  notes?: string // Notes internes (non affichées sur facture)
  customer_notes?: string // Notes visibles par le client

  // Transmission et archivage (pour PDP post-2026)
  pdp_transmission_status?: 'pending' | 'sent' | 'received' | 'validated' | 'rejected' | 'error'
  pdp_transmission_date?: string
  pdp_acknowledgment_id?: string // ID de l'accusé de réception PDP

  // Format électronique
  facturx_generated: boolean // PDF/A-3 + XML généré
  facturx_profile?: 'MINIMUM' | 'BASIC_WL' | 'BASIC' | 'EN16931' | 'EXTENDED'
  facturx_file_path?: string // Chemin vers le fichier Factur-X
  xml_file_path?: string // Chemin vers le XML seul

  // Métadonnées système
  created_by: string // User ID
  created_at: string
  updated_at: string
  validated_at?: string // Date de validation (attribution numéro)
  cancelled_at?: string
  cancelled_by?: string
  cancellation_reason?: string
}

/**
 * Ligne de facture (détail des prestations/produits)
 */
export interface InvoiceLine {
  id: string
  invoice_id: string
  line_number: number // Numéro de ligne (ordre)

  // Description
  description: string // Désignation du produit/service
  product_code?: string // Code article/référence interne

  // Quantité et unité
  quantity: number
  unit: string // unité, heure, jour, forfait, etc.

  // Prix
  unit_price_excluding_tax: number // Prix unitaire HT
  subtotal_excluding_tax: number // Sous-total HT (quantity × unit_price)

  // Remise ligne
  discount_rate?: number // % remise sur cette ligne
  discount_amount?: number // Montant remise en €
  subtotal_after_discount: number // Sous-total après remise

  // TVA
  vat_rate: number // Taux de TVA (20, 10, 5.5, 2.1, 0)
  vat_amount: number // Montant TVA pour cette ligne

  // Total ligne TTC
  total_including_tax: number

  // Métadonnées
  created_at: string
  updated_at: string
}

/**
 * Ventilation de la TVA par taux
 * Obligatoire pour mentions légales
 */
export interface InvoiceVATBreakdown {
  id: string
  invoice_id: string
  vat_rate: number // Taux (ex: 20, 10, 5.5, 2.1, 0)
  taxable_base: number // Base HT soumise à ce taux
  vat_amount: number // Montant de TVA pour ce taux
  total_including_tax: number // Total TTC pour ce taux
  created_at: string
}

/**
 * Configuration de facturation de l'organisation
 * Paramètres par défaut pour l'émission des factures
 */
export interface OrganizationInvoiceSettings {
  id: string
  organization_id?: string // Si multi-société

  // Informations légales émetteur (valeurs par défaut)
  company_name: string
  address: string
  postal_code: string
  city: string
  country: string // Défaut: 'FR'
  siret: string
  vat_number?: string
  legal_form?: string
  share_capital?: number
  rcs?: string

  // Coordonnées bancaires (optionnel, pour affichage sur facture)
  bank_name?: string
  iban?: string
  bic?: string

  // Numérotation
  invoice_number_prefix?: string // Préfixe (ex: 'INV', 'FA')
  invoice_number_format: string // Format: {prefix}-{year}-{sequence}
  next_invoice_number: number // Prochain numéro séquentiel
  current_year: number // Année en cours pour réinitialisation séquence

  // Conditions de paiement par défaut
  default_payment_terms: PaymentTerms
  default_payment_terms_days?: number
  default_late_payment_penalty_rate: number
  default_late_payment_fixed_fee: number

  // TVA
  default_vat_rate: number // Taux par défaut (ex: 20)
  vat_regime: 'normal' | 'franchise' | 'margin' // Régime TVA

  // PDP (Plateformes de Dématérialisation Partenaires) - Post 2026
  pdp_enabled: boolean
  pdp_provider?: string
  pdp_api_key?: string

  // Archivage
  archive_retention_years: number // Défaut: 10 ans (commercial)

  created_at: string
  updated_at: string
}

/**
 * Archive à valeur probante (NF Z42-013)
 * Conservation légale 6 ans (fiscal) / 10 ans (commercial)
 */
export interface InvoiceArchive {
  id: string
  invoice_id: string
  invoice_number: string

  // Fichiers archivés
  facturx_file_path: string // PDF/A-3 avec XML embarqué
  facturx_file_size: number // Taille en octets
  xml_file_path?: string // XML seul (backup)

  // Intégrité et authenticité
  sha256_hash: string // Hash SHA-256 du fichier PDF/A-3
  timestamp: string // Horodatage qualifié (RFC 3161)
  timestamp_authority?: string // Autorité d'horodatage

  // Signature électronique (optionnel mais recommandé)
  digital_signature?: string // Signature électronique qualifiée
  signature_certificate?: string // Certificat de signature

  // Conservation
  archive_date: string // Date d'archivage
  retention_period_years: number // 6 ou 10 ans
  expiration_date: string // Date de fin de conservation légale
  is_archived: boolean

  // Métadonnées d'archivage
  archive_format: string // 'facturx', 'pdf_a3', etc.
  archive_metadata: Record<string, any> // JSON metadata

  created_at: string
  updated_at: string
}

/**
 * Piste d'audit fiable (PAF)
 * Traçabilité complète pour conformité réglementaire
 */
export interface InvoiceAuditTrail {
  id: string
  invoice_id: string
  invoice_number?: string

  // Événement
  event_type:
    | 'created' // Création brouillon
    | 'updated' // Modification
    | 'validated' // Validation (attribution numéro)
    | 'sent' // Envoi client
    | 'viewed' // Consultation
    | 'downloaded' // Téléchargement
    | 'pdp_sent' // Envoi PDP
    | 'pdp_received' // Accusé réception PDP
    | 'pdp_validated' // Validation PDP
    | 'pdp_rejected' // Rejet PDP
    | 'payment_received' // Paiement reçu
    | 'cancelled' // Annulation
    | 'archived' // Archivage

  event_description: string

  // Qui, quand, où
  user_id?: string // Utilisateur ayant déclenché l'événement
  user_email?: string
  user_ip_address?: string // IP de l'utilisateur
  timestamp: string // ISO 8601 avec timezone

  // Changements (pour événements 'updated')
  changes?: Record<string, { old: any; new: any }>

  // Données supplémentaires
  metadata?: Record<string, any> // JSON libre pour contexte additionnel

  created_at: string
}

/**
 * Configuration PDP (Plateformes de Dématérialisation Partenaires)
 * Pour transmission post septembre 2026
 */
export interface PDPConfiguration {
  id: string
  organization_id?: string

  // Identification PDP
  pdp_provider_name: string // Nom du PDP (ex: Chorus Pro, etc.)
  pdp_provider_code?: string // Code identifiant PDP

  // Connexion API
  api_endpoint: string
  api_key_encrypted: string // Clé API chiffrée
  api_environment: 'sandbox' | 'production'

  // Configuration
  is_active: boolean
  is_default: boolean // PDP par défaut pour les envois

  // Annuaire
  directory_sync_enabled: boolean // Synchronisation annuaire destinataires
  last_directory_sync?: string

  created_at: string
  updated_at: string
}

/**
 * Historique des transmissions PDP
 * Pour suivi et traçabilité des envois
 */
export interface PDPTransmission {
  id: string
  invoice_id: string
  invoice_number: string
  pdp_configuration_id: string

  // Statut transmission
  status: 'pending' | 'sent' | 'received' | 'validated' | 'rejected' | 'error'
  status_message?: string

  // Identifiants PDP
  pdp_transmission_id?: string // ID fourni par le PDP
  pdp_acknowledgment_id?: string // ID accusé de réception
  pdp_tracking_url?: string // URL de suivi sur le PDP

  // Dates
  sent_at?: string // Date d'envoi
  received_at?: string // Date de réception par PDP
  validated_at?: string // Date de validation par PDP
  rejected_at?: string // Date de rejet

  // Erreurs
  error_code?: string
  error_message?: string
  retry_count: number // Nombre de tentatives

  // Fichier transmis
  transmitted_file_path: string
  transmitted_file_hash: string // Hash du fichier transmis

  created_at: string
  updated_at: string
}

/**
 * Paiement de facture
 * Historique des paiements reçus
 */
export interface InvoicePayment {
  id: string
  invoice_id: string

  // Montant
  amount: number // Montant payé
  payment_method: PaymentMethod

  // Date et référence
  payment_date: string // Date du paiement
  payment_reference?: string // Référence bancaire / numéro chèque

  // Banque
  bank_name?: string
  transaction_id?: string // ID transaction bancaire

  // Rapprochement
  is_reconciled: boolean // Rapproché avec relevé bancaire
  reconciliation_date?: string

  // Notes
  notes?: string

  // Métadonnées
  created_by: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  read_at?: string
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  id: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  leave_requests: boolean
  project_updates: boolean
  task_assignments: boolean
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  changes: Record<string, unknown>
  createdAt: string
}

export interface Document {
  id: string
  name: string
  type: string
  url: string
  userId: string
  isPrivate: boolean
  createdAt: string
}

export interface Leave {
  id: string
  user_id: string
  start_date: string
  end_date: string
  type: 'conges_payes' | 'rtt' | 'sick' | 'maternity' | 'paternity' | 'other'
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  days_count: number
  attachment_url?: string
  attachment_name?: string
  created_at: string
  updated_at: string
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface LeaveBalance {
  id: string
  user_id: string
  year: number
  paid_leave_days: number
  used_paid_leave_days: number
  rtt_days: number
  used_rtt_days: number
  sick_days: number | null // No legal limit in France
  used_sick_days: number
  reference_period_start: string
  reference_period_end: string
  months_worked: number
  updated_at: string
  users?: {
    id: string
    first_name: string
    last_name: string
    email: string
    working_hours_per_week?: number
    contract_type?: 'full_time' | 'part_time' | 'intern' | 'freelance'
  }
}

export interface FrenchLeaveSettings {
  id: string
  company_id?: string
  legal_working_hours: number
  reference_period_start_month: number
  reference_period_start_day: number
  collective_agreement?: string
  rtt_calculation_method: 'automatic' | 'manual'
  created_at: string
  updated_at: string
}

export interface EmployeeLeaveProfile {
  id: string
  user_id: string
  hire_date: string
  working_hours_per_week: number
  contract_type: 'full_time' | 'part_time' | 'intern' | 'freelance'
  seniority_months: number
  current_year_earned_days: number
  created_at: string
  updated_at: string
}

export interface MagicLink {
  id: string
  token: string
  projectId: string
  contactId: string
  expiresAt: string
  isActive: boolean
  createdAt: string
}

export interface ClientFeedback {
  id: string
  magicLinkId: string
  rating: number
  comment: string
  createdAt: string
} 