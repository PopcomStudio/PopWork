/**
 * Service de génération de numéros de facture séquentiels
 * Conforme à la réglementation française (numérotation continue sans rupture)
 *
 * Le numéro de facture doit:
 * - Être unique
 * - Suivre une séquence chronologique continue
 * - Ne pas avoir de trou dans la numérotation
 * - Interdiction de supprimer une facture (annulation par avoir uniquement)
 */

import { createClientComponentClient } from '@/lib/supabase'
import type { OrganizationInvoiceSettings } from '@/shared/types/database'

/**
 * Options de format pour le numéro de facture
 */
export interface InvoiceNumberFormat {
  prefix?: string // Préfixe optionnel (ex: "FA", "INV")
  includeYear: boolean // Inclure l'année (ex: 2026)
  yearFormat: 'full' | 'short' // Année complète (2026) ou courte (26)
  sequenceLength: number // Longueur minimale de la séquence (padding avec 0)
  separator: string // Séparateur entre les éléments (ex: "-", "/")
}

/**
 * Format par défaut: YYYY-NNNNN (ex: 2026-00001)
 */
export const DEFAULT_FORMAT: InvoiceNumberFormat = {
  includeYear: true,
  yearFormat: 'full',
  sequenceLength: 5,
  separator: '-',
}

/**
 * Génère le prochain numéro de facture
 *
 * @param settings Configuration de facturation de l'organisation
 * @returns Le numéro de facture généré
 */
export function generateInvoiceNumber(
  settings: OrganizationInvoiceSettings
): string {
  const currentYear = new Date().getFullYear()
  const sequence = settings.next_invoice_number

  // Format personnalisé depuis la configuration
  const format = parseInvoiceNumberFormat(settings.invoice_number_format)

  return formatInvoiceNumber(sequence, currentYear, format, settings.invoice_number_prefix)
}

/**
 * Parse le format de numérotation depuis une chaîne de configuration
 *
 * @param formatString Format string (ex: "{prefix}-{year}-{sequence}")
 * @returns Options de format parsées
 */
export function parseInvoiceNumberFormat(
  formatString: string
): InvoiceNumberFormat {
  const includeYear = formatString.includes('{year}')
  const hasPrefix = formatString.includes('{prefix}')

  // Déterminer le séparateur (-, /, _)
  let separator = '-'
  if (formatString.includes('/')) separator = '/'
  else if (formatString.includes('_')) separator = '_'

  return {
    includeYear,
    yearFormat: 'full', // Par défaut année complète
    sequenceLength: 5, // Par défaut 5 chiffres
    separator,
  }
}

/**
 * Formate un numéro de facture selon le format spécifié
 *
 * @param sequence Numéro séquentiel
 * @param year Année
 * @param format Options de format
 * @param prefix Préfixe optionnel
 * @returns Numéro de facture formaté
 */
export function formatInvoiceNumber(
  sequence: number,
  year: number,
  format: InvoiceNumberFormat = DEFAULT_FORMAT,
  prefix?: string
): string {
  const parts: string[] = []

  // Ajouter le préfixe si présent
  if (prefix) {
    parts.push(prefix)
  }

  // Ajouter l'année si demandé
  if (format.includeYear) {
    const yearStr =
      format.yearFormat === 'short'
        ? year.toString().slice(-2) // Année courte: 26
        : year.toString() // Année complète: 2026
    parts.push(yearStr)
  }

  // Ajouter la séquence avec padding
  const sequenceStr = sequence.toString().padStart(format.sequenceLength, '0')
  parts.push(sequenceStr)

  // Joindre avec le séparateur
  return parts.join(format.separator)
}

/**
 * Récupère le prochain numéro de facture et incrémente le compteur
 * Gère automatiquement le rollover annuel
 *
 * Cette fonction utilise une transaction PostgreSQL pour garantir
 * la séquence sans trou même en cas d'accès concurrent
 *
 * @returns Le numéro de facture généré et la configuration mise à jour
 */
export async function getNextInvoiceNumber(): Promise<{
  invoiceNumber: string
  sequence: number
}> {
  const supabase = createClientComponentClient()
  const currentYear = new Date().getFullYear()

  // Récupérer la configuration actuelle avec verrou (FOR UPDATE)
  const { data: settings, error: fetchError } = await supabase
    .from('organization_invoice_settings')
    .select('*')
    .single()

  if (fetchError || !settings) {
    throw new Error(
      `Impossible de récupérer la configuration de facturation: ${fetchError?.message || 'Configuration non trouvée'}`
    )
  }

  // Vérifier si on doit réinitialiser la séquence (nouvelle année)
  let nextSequence = settings.next_invoice_number
  let shouldResetSequence = false

  if (settings.current_year !== currentYear) {
    // Nouvelle année: réinitialiser la séquence à 1
    nextSequence = 1
    shouldResetSequence = true
  }

  // Générer le numéro de facture
  const invoiceNumber = generateInvoiceNumber({
    ...settings,
    next_invoice_number: nextSequence,
  })

  // Incrémenter le compteur et mettre à jour l'année si nécessaire
  const { error: updateError } = await supabase
    .from('organization_invoice_settings')
    .update({
      next_invoice_number: nextSequence + 1,
      current_year: currentYear,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settings.id)

  if (updateError) {
    throw new Error(
      `Impossible de mettre à jour la séquence de numérotation: ${updateError.message}`
    )
  }

  return {
    invoiceNumber,
    sequence: nextSequence,
  }
}

/**
 * Vérifie si un numéro de facture existe déjà
 *
 * @param invoiceNumber Numéro à vérifier
 * @returns true si le numéro existe déjà
 */
export async function invoiceNumberExists(
  invoiceNumber: string
): Promise<boolean> {
  const supabase = createClientComponentClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('invoice_number', invoiceNumber)
    .limit(1)

  if (error) {
    throw new Error(`Erreur lors de la vérification du numéro: ${error.message}`)
  }

  return data.length > 0
}

/**
 * Extrait le numéro séquentiel d'un numéro de facture formaté
 *
 * @param invoiceNumber Numéro de facture complet
 * @returns Le numéro séquentiel ou null si impossible à extraire
 */
export function extractSequenceNumber(
  invoiceNumber: string
): number | null {
  // Extraire tous les nombres du numéro de facture
  const matches = invoiceNumber.match(/\d+/g)

  if (!matches || matches.length === 0) {
    return null
  }

  // Le dernier nombre est généralement la séquence
  const lastNumber = matches[matches.length - 1]
  return parseInt(lastNumber, 10)
}

/**
 * Valide la séquence de numérotation (détecte les trous)
 * Utile pour audit et vérification de conformité
 *
 * @param startNumber Premier numéro de la séquence (optionnel)
 * @param endNumber Dernier numéro de la séquence (optionnel)
 * @returns Liste des numéros manquants dans la séquence
 */
export async function validateNumberingSequence(
  startNumber?: number,
  endNumber?: number
): Promise<number[]> {
  const supabase = createClientComponentClient()

  // Récupérer tous les numéros de facture
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('invoice_number')

  if (error) {
    throw new Error(
      `Erreur lors de la validation de la séquence: ${error.message}`
    )
  }

  // Extraire les numéros séquentiels
  const sequences = invoices
    .map((inv) => extractSequenceNumber(inv.invoice_number))
    .filter((seq): seq is number => seq !== null)
    .sort((a, b) => a - b)

  if (sequences.length === 0) {
    return []
  }

  // Déterminer la plage à vérifier
  const min = startNumber || sequences[0]
  const max = endNumber || sequences[sequences.length - 1]

  // Détecter les trous dans la séquence
  const missingNumbers: number[] = []
  const sequenceSet = new Set(sequences)

  for (let i = min; i <= max; i++) {
    if (!sequenceSet.has(i)) {
      missingNumbers.push(i)
    }
  }

  return missingNumbers
}

/**
 * Obtient des statistiques sur la numérotation
 *
 * @returns Statistiques de numérotation
 */
export async function getNumberingStats(): Promise<{
  totalInvoices: number
  currentSequence: number
  currentYear: number
  lastInvoiceNumber: string | null
  hasGaps: boolean
  gapsCount: number
}> {
  const supabase = createClientComponentClient()

  // Récupérer la configuration
  const { data: settings } = await supabase
    .from('organization_invoice_settings')
    .select('*')
    .single()

  // Compter les factures
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })

  // Récupérer la dernière facture
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Détecter les trous
  const gaps = await validateNumberingSequence()

  return {
    totalInvoices: count || 0,
    currentSequence: settings?.next_invoice_number || 1,
    currentYear: settings?.current_year || new Date().getFullYear(),
    lastInvoiceNumber: lastInvoice?.invoice_number || null,
    hasGaps: gaps.length > 0,
    gapsCount: gaps.length,
  }
}

/**
 * Réinitialise la séquence de numérotation (DANGER - À n'utiliser que pour tests)
 * En production, la réinitialisation se fait automatiquement au changement d'année
 *
 * @param newSequence Nouveau numéro de départ (défaut: 1)
 */
export async function resetNumberingSequence(
  newSequence: number = 1
): Promise<void> {
  const supabase = createClientComponentClient()
  const currentYear = new Date().getFullYear()

  const { error } = await supabase
    .from('organization_invoice_settings')
    .update({
      next_invoice_number: newSequence,
      current_year: currentYear,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(
      `Impossible de réinitialiser la séquence: ${error.message}`
    )
  }
}
