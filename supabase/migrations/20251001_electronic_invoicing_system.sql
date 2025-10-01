-- ============================================================================
-- MIGRATION: Système de Facturation Électronique Française (2026-2027)
-- Conforme réglementation française et EN-16931 / Factur-X
-- Date: 2025-10-01
-- ============================================================================

-- ============================================================================
-- 1. CONFIGURATION DE FACTURATION DE L'ORGANISATION
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,

  -- Informations légales émetteur
  company_name TEXT NOT NULL,
  address TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'FR',
  siret TEXT NOT NULL CHECK (length(siret) = 14 AND siret ~ '^\d{14}$'),
  vat_number TEXT,
  legal_form TEXT,
  share_capital NUMERIC(12, 2),
  rcs TEXT,

  -- Coordonnées bancaires (optionnel)
  bank_name TEXT,
  iban TEXT,
  bic TEXT,

  -- Numérotation
  invoice_number_prefix TEXT,
  invoice_number_format TEXT NOT NULL DEFAULT '{year}-{sequence}',
  next_invoice_number INTEGER NOT NULL DEFAULT 1,
  current_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),

  -- Conditions de paiement par défaut
  default_payment_terms TEXT NOT NULL DEFAULT 'net_30'
    CHECK (default_payment_terms IN ('immediate', 'net_15', 'net_30', 'net_45', 'net_60', 'end_of_month', 'custom')),
  default_payment_terms_days INTEGER,
  default_late_payment_penalty_rate NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  default_late_payment_fixed_fee NUMERIC(10, 2) NOT NULL DEFAULT 40.00,

  -- TVA
  default_vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 20.00,
  vat_regime TEXT NOT NULL DEFAULT 'normal'
    CHECK (vat_regime IN ('normal', 'franchise', 'margin')),

  -- PDP (Post 2026)
  pdp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  pdp_provider TEXT,
  pdp_api_key TEXT,

  -- Archivage
  archive_retention_years INTEGER NOT NULL DEFAULT 10,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organization_invoice_settings IS 'Configuration de facturation par défaut de l''organisation';

-- ============================================================================
-- 2. FACTURES (INVOICES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Type et statut
  operation_type TEXT NOT NULL
    CHECK (operation_type IN ('goods', 'services', 'mixed')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'validated', 'sent', 'paid', 'partial_paid', 'overdue', 'cancelled')),
  is_credit_note BOOLEAN NOT NULL DEFAULT FALSE,
  credit_note_reason TEXT,
  original_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,

  -- Émetteur (issuer)
  issuer_company_id UUID NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_address TEXT NOT NULL,
  issuer_postal_code TEXT NOT NULL,
  issuer_city TEXT NOT NULL,
  issuer_country TEXT NOT NULL DEFAULT 'FR',
  issuer_siret TEXT NOT NULL CHECK (length(issuer_siret) = 14 AND issuer_siret ~ '^\d{14}$'),
  issuer_vat_number TEXT,
  issuer_legal_form TEXT,
  issuer_share_capital NUMERIC(12, 2),
  issuer_rcs TEXT,

  -- Client (customer)
  customer_company_id UUID NOT NULL,
  customer_service_id UUID,
  customer_name TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_postal_code TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  customer_country TEXT NOT NULL DEFAULT 'FR',
  customer_siret TEXT,
  customer_vat_number TEXT,

  -- Montants
  subtotal_excluding_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_vat_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_including_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,

  -- Remises et escomptes
  discount_rate NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  early_payment_discount_rate NUMERIC(5, 2),
  early_payment_discount_conditions TEXT,

  -- Conditions de paiement
  payment_terms TEXT NOT NULL DEFAULT 'net_30'
    CHECK (payment_terms IN ('immediate', 'net_15', 'net_30', 'net_45', 'net_60', 'end_of_month', 'custom')),
  payment_terms_days INTEGER,
  payment_due_date DATE NOT NULL,
  payment_method TEXT
    CHECK (payment_method IN ('bank_transfer', 'check', 'credit_card', 'direct_debit', 'cash')),
  late_payment_penalty_rate NUMERIC(5, 2),
  late_payment_fixed_fee NUMERIC(10, 2),

  -- Références
  project_id UUID,
  purchase_order_reference TEXT,
  contract_reference TEXT,

  -- Notes
  notes TEXT,
  customer_notes TEXT,

  -- Transmission PDP (Post 2026)
  pdp_transmission_status TEXT
    CHECK (pdp_transmission_status IN ('pending', 'sent', 'received', 'validated', 'rejected', 'error')),
  pdp_transmission_date TIMESTAMPTZ,
  pdp_acknowledgment_id TEXT,

  -- Format électronique
  facturx_generated BOOLEAN NOT NULL DEFAULT FALSE,
  facturx_profile TEXT
    CHECK (facturx_profile IN ('MINIMUM', 'BASIC_WL', 'BASIC', 'EN16931', 'EXTENDED')),
  facturx_file_path TEXT,
  xml_file_path TEXT,

  -- Métadonnées système
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT
);

COMMENT ON TABLE invoices IS 'Factures conformes réglementation française 2026 (EN-16931)';

-- Index pour performances
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_customer_company_id ON invoices(customer_company_id);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date DESC);
CREATE INDEX idx_invoices_payment_due_date ON invoices(payment_due_date);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

-- ============================================================================
-- 3. LIGNES DE FACTURE (INVOICE LINES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- Description
  description TEXT NOT NULL,
  product_code TEXT,

  -- Quantité et unité
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
  unit TEXT NOT NULL DEFAULT 'unité',

  -- Prix
  unit_price_excluding_tax NUMERIC(12, 2) NOT NULL,
  subtotal_excluding_tax NUMERIC(12, 2) NOT NULL,

  -- Remise ligne
  discount_rate NUMERIC(5, 2),
  discount_amount NUMERIC(12, 2),
  subtotal_after_discount NUMERIC(12, 2) NOT NULL,

  -- TVA
  vat_rate NUMERIC(5, 2) NOT NULL,
  vat_amount NUMERIC(12, 2) NOT NULL,

  -- Total ligne TTC
  total_including_tax NUMERIC(12, 2) NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_invoice_line_number UNIQUE (invoice_id, line_number)
);

COMMENT ON TABLE invoice_lines IS 'Lignes de détail des factures (prestations/produits)';

CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);

-- ============================================================================
-- 4. VENTILATION TVA (VAT BREAKDOWN)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_vat_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vat_rate NUMERIC(5, 2) NOT NULL,
  taxable_base NUMERIC(12, 2) NOT NULL,
  vat_amount NUMERIC(12, 2) NOT NULL,
  total_including_tax NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_invoice_vat_rate UNIQUE (invoice_id, vat_rate)
);

COMMENT ON TABLE invoice_vat_breakdown IS 'Ventilation de la TVA par taux (mention obligatoire)';

CREATE INDEX idx_invoice_vat_breakdown_invoice_id ON invoice_vat_breakdown(invoice_id);

-- ============================================================================
-- 5. ARCHIVES À VALEUR PROBANTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,

  -- Fichiers archivés
  facturx_file_path TEXT NOT NULL,
  facturx_file_size BIGINT NOT NULL,
  xml_file_path TEXT,

  -- Intégrité et authenticité
  sha256_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  timestamp_authority TEXT,

  -- Signature électronique (optionnel)
  digital_signature TEXT,
  signature_certificate TEXT,

  -- Conservation
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  retention_period_years INTEGER NOT NULL DEFAULT 10,
  expiration_date DATE NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT TRUE,

  -- Métadonnées
  archive_format TEXT NOT NULL DEFAULT 'facturx',
  archive_metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoice_archives IS 'Archives à valeur probante (NF Z42-013) - Conservation 6-10 ans';

CREATE INDEX idx_invoice_archives_invoice_id ON invoice_archives(invoice_id);
CREATE INDEX idx_invoice_archives_invoice_number ON invoice_archives(invoice_number);
CREATE INDEX idx_invoice_archives_expiration_date ON invoice_archives(expiration_date);

-- ============================================================================
-- 6. PISTE D'AUDIT FIABLE (AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number TEXT,

  -- Événement
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'created', 'updated', 'validated', 'sent', 'viewed', 'downloaded',
      'pdp_sent', 'pdp_received', 'pdp_validated', 'pdp_rejected',
      'payment_received', 'cancelled', 'archived'
    )),
  event_description TEXT NOT NULL,

  -- Qui, quand, où
  user_id UUID,
  user_email TEXT,
  user_ip_address INET,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Changements
  changes JSONB,

  -- Métadonnées
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoice_audit_trail IS 'Piste d''audit fiable (PAF) - Traçabilité complète';

CREATE INDEX idx_invoice_audit_trail_invoice_id ON invoice_audit_trail(invoice_id);
CREATE INDEX idx_invoice_audit_trail_event_type ON invoice_audit_trail(event_type);
CREATE INDEX idx_invoice_audit_trail_timestamp ON invoice_audit_trail(timestamp DESC);
CREATE INDEX idx_invoice_audit_trail_user_id ON invoice_audit_trail(user_id);

-- ============================================================================
-- 7. CONFIGURATION PDP (PLATEFORMES DE DÉMATÉRIALISATION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pdp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,

  -- Identification PDP
  pdp_provider_name TEXT NOT NULL,
  pdp_provider_code TEXT,

  -- Connexion API
  api_endpoint TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_environment TEXT NOT NULL DEFAULT 'production'
    CHECK (api_environment IN ('sandbox', 'production')),

  -- Configuration
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- Annuaire
  directory_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_directory_sync TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdp_configurations IS 'Configuration des Plateformes de Dématérialisation Partenaires (Post 2026)';

CREATE INDEX idx_pdp_configurations_is_active ON pdp_configurations(is_active);
CREATE INDEX idx_pdp_configurations_is_default ON pdp_configurations(is_default);

-- ============================================================================
-- 8. TRANSMISSIONS PDP
-- ============================================================================
CREATE TABLE IF NOT EXISTS pdp_transmissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  pdp_configuration_id UUID NOT NULL REFERENCES pdp_configurations(id) ON DELETE CASCADE,

  -- Statut transmission
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'received', 'validated', 'rejected', 'error')),
  status_message TEXT,

  -- Identifiants PDP
  pdp_transmission_id TEXT,
  pdp_acknowledgment_id TEXT,
  pdp_tracking_url TEXT,

  -- Dates
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  -- Erreurs
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Fichier transmis
  transmitted_file_path TEXT NOT NULL,
  transmitted_file_hash TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pdp_transmissions IS 'Historique des transmissions aux PDP (Post 2026)';

CREATE INDEX idx_pdp_transmissions_invoice_id ON pdp_transmissions(invoice_id);
CREATE INDEX idx_pdp_transmissions_status ON pdp_transmissions(status);
CREATE INDEX idx_pdp_transmissions_sent_at ON pdp_transmissions(sent_at DESC);

-- ============================================================================
-- 9. PAIEMENTS DE FACTURES
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Montant
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('bank_transfer', 'check', 'credit_card', 'direct_debit', 'cash')),

  -- Date et référence
  payment_date DATE NOT NULL,
  payment_reference TEXT,

  -- Banque
  bank_name TEXT,
  transaction_id TEXT,

  -- Rapprochement
  is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_date DATE,

  -- Notes
  notes TEXT,

  -- Métadonnées
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE invoice_payments IS 'Historique des paiements de factures';

CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date DESC);
CREATE INDEX idx_invoice_payments_is_reconciled ON invoice_payments(is_reconciled);

-- ============================================================================
-- FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_organization_invoice_settings_updated_at
  BEFORE UPDATE ON organization_invoice_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_lines_updated_at
  BEFORE UPDATE ON invoice_lines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_archives_updated_at
  BEFORE UPDATE ON invoice_archives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdp_configurations_updated_at
  BEFORE UPDATE ON pdp_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdp_transmissions_updated_at
  BEFORE UPDATE ON pdp_transmissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_payments_updated_at
  BEFORE UPDATE ON invoice_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- À adapter selon les besoins de sécurité de l'application
-- ============================================================================

ALTER TABLE organization_invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_vat_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdp_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdp_transmissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- Politique de base: les utilisateurs authentifiés peuvent tout voir
-- IMPORTANT: À personnaliser selon les besoins réels de l'application

CREATE POLICY "Users can view all invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create invoices" ON invoices
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update invoices" ON invoices
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view invoice lines" ON invoice_lines
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage invoice lines" ON invoice_lines
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- DONNÉES INITIALES (SEED)
-- ============================================================================

-- Créer une configuration par défaut si elle n'existe pas
INSERT INTO organization_invoice_settings (
  company_name,
  address,
  postal_code,
  city,
  country,
  siret,
  invoice_number_format,
  next_invoice_number,
  current_year,
  default_payment_terms,
  default_late_payment_penalty_rate,
  default_late_payment_fixed_fee,
  default_vat_rate,
  vat_regime,
  archive_retention_years
) VALUES (
  'Votre Entreprise',
  'Adresse à compléter',
  '75001',
  'Paris',
  'FR',
  '12345678901234', -- SIRET fictif, à remplacer
  '{year}-{sequence}',
  1,
  EXTRACT(YEAR FROM CURRENT_DATE),
  'net_30',
  10.00,
  40.00,
  20.00,
  'normal',
  10
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

COMMENT ON SCHEMA public IS 'Système de facturation électronique conforme France 2026-2027';
