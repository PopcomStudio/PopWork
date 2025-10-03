/**
 * Service de validation des factures
 * Vérifie la conformité des factures selon la réglementation française
 */

import { validateSIRET, getSIRETValidationError } from '../utils/siret-validator'
import { validateVAT, getVATValidationError } from '../utils/vat-validator'
import {
  isValidVATRate,
  calculateVATAmount,
  roundAmount,
} from '../utils/vat-calculator'

/**
 * Résultat de validation
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Erreur de validation
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Avertissement de validation
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
}

/**
 * Données minimales d'une facture pour validation
 */
export interface InvoiceValidationData {
  // Identification
  invoice_number?: string
  invoice_date: string

  // Type
  operation_type: 'goods' | 'services' | 'mixed'
  is_credit_note: boolean

  // Émetteur
  issuer_siret: string
  issuer_name: string
  issuer_address: string
  issuer_vat_number?: string

  // Client
  customer_name: string
  customer_address: string
  customer_siret?: string
  customer_vat_number?: string

  // Montants
  subtotal_excluding_tax: number
  total_vat_amount: number
  total_including_tax: number

  // Lignes (pour vérification cohérence)
  lines?: Array<{
    description: string
    quantity: number
    unit_price_excluding_tax: number
    vat_rate: number
    vat_amount: number
    total_including_tax: number
  }>

  // Paiement
  payment_due_date: string
}

/**
 * Valide une facture complète
 *
 * @param invoice Données de la facture à valider
 * @returns Résultat de validation avec erreurs et avertissements
 */
export function validateInvoice(
  invoice: InvoiceValidationData
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // 1. Validation des mentions obligatoires
  validateRequiredFields(invoice, errors)

  // 2. Validation du SIRET émetteur (obligatoire)
  validateIssuerSIRET(invoice.issuer_siret, errors)

  // 3. Validation du SIRET client (obligatoire depuis 01/07/2024 pour B2B)
  validateCustomerSIRET(invoice.customer_siret, errors, warnings)

  // 4. Validation des numéros de TVA (si fournis)
  if (invoice.issuer_vat_number) {
    validateIssuerVAT(invoice.issuer_vat_number, errors)
  }

  if (invoice.customer_vat_number) {
    validateCustomerVAT(invoice.customer_vat_number, errors)
  }

  // 5. Validation des dates
  validateDates(invoice.invoice_date, invoice.payment_due_date, errors)

  // 6. Validation des montants
  validateAmounts(invoice, errors)

  // 7. Validation de la cohérence des lignes (si fournies)
  if (invoice.lines && invoice.lines.length > 0) {
    validateLines(invoice, errors, warnings)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Valide les champs obligatoires
 */
function validateRequiredFields(
  invoice: InvoiceValidationData,
  errors: ValidationError[]
): void {
  if (!invoice.invoice_date) {
    errors.push({
      field: 'invoice_date',
      message: 'La date de facture est obligatoire',
      code: 'REQUIRED_INVOICE_DATE',
    })
  }

  if (!invoice.operation_type) {
    errors.push({
      field: 'operation_type',
      message:
        "Le type d'opération est obligatoire (livraison de biens, prestation de services ou mixte)",
      code: 'REQUIRED_OPERATION_TYPE',
    })
  }

  if (!invoice.issuer_name || invoice.issuer_name.trim().length === 0) {
    errors.push({
      field: 'issuer_name',
      message: "Le nom de l'émetteur est obligatoire",
      code: 'REQUIRED_ISSUER_NAME',
    })
  }

  if (!invoice.issuer_address || invoice.issuer_address.trim().length === 0) {
    errors.push({
      field: 'issuer_address',
      message: "L'adresse de l'émetteur est obligatoire",
      code: 'REQUIRED_ISSUER_ADDRESS',
    })
  }

  if (!invoice.customer_name || invoice.customer_name.trim().length === 0) {
    errors.push({
      field: 'customer_name',
      message: 'Le nom du client est obligatoire',
      code: 'REQUIRED_CUSTOMER_NAME',
    })
  }

  if (
    !invoice.customer_address ||
    invoice.customer_address.trim().length === 0
  ) {
    errors.push({
      field: 'customer_address',
      message: "L'adresse du client est obligatoire",
      code: 'REQUIRED_CUSTOMER_ADDRESS',
    })
  }

  if (!invoice.payment_due_date) {
    errors.push({
      field: 'payment_due_date',
      message: "La date d'échéance de paiement est obligatoire",
      code: 'REQUIRED_PAYMENT_DUE_DATE',
    })
  }
}

/**
 * Valide le SIRET émetteur
 */
function validateIssuerSIRET(
  siret: string,
  errors: ValidationError[]
): void {
  if (!siret || siret.trim().length === 0) {
    errors.push({
      field: 'issuer_siret',
      message: "Le numéro SIRET de l'émetteur est obligatoire",
      code: 'REQUIRED_ISSUER_SIRET',
    })
    return
  }

  const error = getSIRETValidationError(siret)
  if (error) {
    errors.push({
      field: 'issuer_siret',
      message: error,
      code: 'INVALID_ISSUER_SIRET',
    })
  }
}

/**
 * Valide le SIRET client
 * Obligatoire depuis 01/07/2024 pour les factures B2B
 */
function validateCustomerSIRET(
  siret: string | undefined,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // Si un SIRET est fourni, le valider
  if (siret && siret.trim().length > 0) {
    const error = getSIRETValidationError(siret)
    if (error) {
      errors.push({
        field: 'customer_siret',
        message: error,
        code: 'INVALID_CUSTOMER_SIRET',
      })
    }
  } else {
    // Avertissement si pas de SIRET client (obligatoire pour B2B depuis 01/07/2024)
    warnings.push({
      field: 'customer_siret',
      message:
        'Le SIRET du client est obligatoire pour les factures B2B depuis le 1er juillet 2024',
      code: 'MISSING_CUSTOMER_SIRET',
    })
  }
}

/**
 * Valide le numéro de TVA émetteur
 */
function validateIssuerVAT(
  vatNumber: string,
  errors: ValidationError[]
): void {
  const error = getVATValidationError(vatNumber)
  if (error) {
    errors.push({
      field: 'issuer_vat_number',
      message: error,
      code: 'INVALID_ISSUER_VAT',
    })
  }
}

/**
 * Valide le numéro de TVA client
 */
function validateCustomerVAT(
  vatNumber: string,
  errors: ValidationError[]
): void {
  const error = getVATValidationError(vatNumber)
  if (error) {
    errors.push({
      field: 'customer_vat_number',
      message: error,
      code: 'INVALID_CUSTOMER_VAT',
    })
  }
}

/**
 * Valide les dates
 */
function validateDates(
  invoiceDate: string,
  paymentDueDate: string,
  errors: ValidationError[]
): void {
  try {
    const invoice = new Date(invoiceDate)
    const dueDate = new Date(paymentDueDate)

    if (isNaN(invoice.getTime())) {
      errors.push({
        field: 'invoice_date',
        message: 'La date de facture est invalide',
        code: 'INVALID_INVOICE_DATE',
      })
    }

    if (isNaN(dueDate.getTime())) {
      errors.push({
        field: 'payment_due_date',
        message: "La date d'échéance est invalide",
        code: 'INVALID_PAYMENT_DUE_DATE',
      })
    }

    // La date d'échéance doit être >= date de facture
    if (dueDate < invoice) {
      errors.push({
        field: 'payment_due_date',
        message:
          "La date d'échéance ne peut pas être antérieure à la date de facture",
        code: 'INVALID_DUE_DATE_BEFORE_INVOICE',
      })
    }
  } catch (error) {
    errors.push({
      field: 'invoice_date',
      message: 'Erreur de validation des dates',
      code: 'DATE_VALIDATION_ERROR',
    })
  }
}

/**
 * Valide les montants
 */
function validateAmounts(
  invoice: InvoiceValidationData,
  errors: ValidationError[]
): void {
  if (
    invoice.subtotal_excluding_tax < 0 ||
    invoice.total_vat_amount < 0 ||
    invoice.total_including_tax < 0
  ) {
    errors.push({
      field: 'amounts',
      message: 'Les montants ne peuvent pas être négatifs',
      code: 'NEGATIVE_AMOUNTS',
    })
  }

  // Vérifier la cohérence: TTC = HT + TVA (avec tolérance d'arrondi de 0.01€)
  const expectedTTC = roundAmount(
    invoice.subtotal_excluding_tax + invoice.total_vat_amount
  )
  const difference = Math.abs(expectedTTC - invoice.total_including_tax)

  if (difference > 0.01) {
    errors.push({
      field: 'total_including_tax',
      message: `Incohérence des montants: TTC (${invoice.total_including_tax}€) ≠ HT (${invoice.subtotal_excluding_tax}€) + TVA (${invoice.total_vat_amount}€) = ${expectedTTC}€`,
      code: 'AMOUNT_MISMATCH',
    })
  }
}

/**
 * Valide la cohérence des lignes de facture
 */
function validateLines(
  invoice: InvoiceValidationData,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (!invoice.lines || invoice.lines.length === 0) {
    warnings.push({
      field: 'lines',
      message: 'Aucune ligne de facture trouvée',
      code: 'NO_LINES',
    })
    return
  }

  // Vérifier chaque ligne
  invoice.lines.forEach((line, index) => {
    // Description obligatoire
    if (!line.description || line.description.trim().length === 0) {
      errors.push({
        field: `lines[${index}].description`,
        message: `Ligne ${index + 1}: La description est obligatoire`,
        code: 'REQUIRED_LINE_DESCRIPTION',
      })
    }

    // Quantité > 0
    if (line.quantity <= 0) {
      errors.push({
        field: `lines[${index}].quantity`,
        message: `Ligne ${index + 1}: La quantité doit être supérieure à 0`,
        code: 'INVALID_LINE_QUANTITY',
      })
    }

    // Taux de TVA valide
    if (!isValidVATRate(line.vat_rate)) {
      warnings.push({
        field: `lines[${index}].vat_rate`,
        message: `Ligne ${index + 1}: Le taux de TVA ${line.vat_rate}% n'est pas un taux standard français (20%, 10%, 5.5%, 2.1%, 0%)`,
        code: 'NON_STANDARD_VAT_RATE',
      })
    }

    // Vérifier cohérence montant TVA
    const expectedVAT = calculateVATAmount(
      line.quantity * line.unit_price_excluding_tax,
      line.vat_rate
    )
    if (Math.abs(expectedVAT - line.vat_amount) > 0.01) {
      errors.push({
        field: `lines[${index}].vat_amount`,
        message: `Ligne ${index + 1}: Montant de TVA incohérent (attendu: ${expectedVAT}€, fourni: ${line.vat_amount}€)`,
        code: 'LINE_VAT_MISMATCH',
      })
    }
  })

  // Vérifier que la somme des lignes correspond aux totaux
  const linesTotal = invoice.lines.reduce(
    (sum, line) => sum + line.total_including_tax,
    0
  )
  const roundedLinesTotal = roundAmount(linesTotal)

  if (Math.abs(roundedLinesTotal - invoice.total_including_tax) > 0.01) {
    errors.push({
      field: 'total_including_tax',
      message: `La somme des lignes (${roundedLinesTotal}€) ne correspond pas au total TTC (${invoice.total_including_tax}€)`,
      code: 'LINES_TOTAL_MISMATCH',
    })
  }
}

/**
 * Valide un numéro de facture (format et unicité à vérifier côté applicatif)
 *
 * @param invoiceNumber Numéro de facture à valider
 * @returns Message d'erreur ou null si valide
 */
export function validateInvoiceNumber(
  invoiceNumber: string
): string | null {
  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    return 'Le numéro de facture est obligatoire'
  }

  // Vérifier que le numéro contient au moins un chiffre
  if (!/\d/.test(invoiceNumber)) {
    return 'Le numéro de facture doit contenir au moins un chiffre'
  }

  // Vérifier la longueur raisonnable (entre 3 et 50 caractères)
  if (invoiceNumber.length < 3 || invoiceNumber.length > 50) {
    return 'Le numéro de facture doit contenir entre 3 et 50 caractères'
  }

  return null
}

/**
 * Valide un brouillon de facture (validation allégée)
 * Seules les données critiques sont vérifiées
 *
 * @param invoice Données du brouillon
 * @returns Résultat de validation
 */
export function validateDraftInvoice(
  invoice: Partial<InvoiceValidationData>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Pour un brouillon, on vérifie seulement les SIRET s'ils sont fournis
  if (invoice.issuer_siret) {
    const error = getSIRETValidationError(invoice.issuer_siret)
    if (error) {
      errors.push({
        field: 'issuer_siret',
        message: error,
        code: 'INVALID_ISSUER_SIRET',
      })
    }
  }

  if (invoice.customer_siret) {
    const error = getSIRETValidationError(invoice.customer_siret)
    if (error) {
      errors.push({
        field: 'customer_siret',
        message: error,
        code: 'INVALID_CUSTOMER_SIRET',
      })
    }
  }

  // Avertissements pour les champs manquants
  if (!invoice.customer_name) {
    warnings.push({
      field: 'customer_name',
      message: 'Le nom du client devra être renseigné avant validation',
      code: 'MISSING_CUSTOMER_NAME',
    })
  }

  if (!invoice.lines || invoice.lines.length === 0) {
    warnings.push({
      field: 'lines',
      message: 'Aucune ligne de facture - ajoutez au moins une prestation',
      code: 'NO_LINES',
    })
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}
