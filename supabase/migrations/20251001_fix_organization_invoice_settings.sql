-- ============================================================================
-- FIX: Ajouter organization_id aux settings existants
-- ============================================================================
-- Créé le: 2025-10-01
-- Description: Corrige les données seed en ajoutant un organization_id valide
-- ============================================================================

-- Mettre à jour l'enregistrement existant pour ajouter un organization_id
UPDATE organization_invoice_settings
SET organization_id = gen_random_uuid()
WHERE organization_id IS NULL;

-- Commentaire pour documentation
COMMENT ON COLUMN organization_invoice_settings.organization_id IS
'UUID de l''organisation - généré automatiquement si non fourni';
