/**
 * Calculateur de TVA conforme aux règles françaises
 * Gère les différents taux de TVA et les arrondis réglementaires
 */

/**
 * Taux de TVA applicables en France
 */
export const VAT_RATES = {
  STANDARD: 20.0, // Taux normal
  INTERMEDIATE: 10.0, // Taux intermédiaire (restauration, travaux rénovation, etc.)
  REDUCED: 5.5, // Taux réduit (produits alimentaires, livres, etc.)
  SUPER_REDUCED: 2.1, // Taux super réduit (médicaments remboursables, presse, etc.)
  ZERO: 0.0, // Taux zéro (exportations, certaines opérations)
} as const

export type VATRate = (typeof VAT_RATES)[keyof typeof VAT_RATES]

/**
 * Arrondit un montant selon les règles fiscales françaises
 * Arrondi au centime le plus proche (2 décimales)
 *
 * @param amount Montant à arrondir
 * @returns Montant arrondi à 2 décimales
 */
export function roundAmount(amount: number): number {
  return Math.round(amount * 100) / 100
}

/**
 * Calcule le montant TTC à partir du montant HT
 *
 * @param amountExcludingTax Montant HT
 * @param vatRate Taux de TVA (en %)
 * @returns Montant TTC arrondi
 */
export function calculateAmountIncludingTax(
  amountExcludingTax: number,
  vatRate: number
): number {
  const vatAmount = calculateVATAmount(amountExcludingTax, vatRate)
  return roundAmount(amountExcludingTax + vatAmount)
}

/**
 * Calcule le montant de TVA
 *
 * @param amountExcludingTax Montant HT
 * @param vatRate Taux de TVA (en %)
 * @returns Montant de TVA arrondi
 */
export function calculateVATAmount(
  amountExcludingTax: number,
  vatRate: number
): number {
  return roundAmount((amountExcludingTax * vatRate) / 100)
}

/**
 * Calcule le montant HT à partir du montant TTC
 *
 * @param amountIncludingTax Montant TTC
 * @param vatRate Taux de TVA (en %)
 * @returns Montant HT arrondi
 */
export function calculateAmountExcludingTax(
  amountIncludingTax: number,
  vatRate: number
): number {
  return roundAmount((amountIncludingTax * 100) / (100 + vatRate))
}

/**
 * Calcule le montant de TVA à partir du montant TTC
 *
 * @param amountIncludingTax Montant TTC
 * @param vatRate Taux de TVA (en %)
 * @returns Montant de TVA arrondi
 */
export function calculateVATAmountFromTTC(
  amountIncludingTax: number,
  vatRate: number
): number {
  const amountExcludingTax = calculateAmountExcludingTax(
    amountIncludingTax,
    vatRate
  )
  return roundAmount(amountIncludingTax - amountExcludingTax)
}

/**
 * Calcule une remise en montant à partir d'un pourcentage
 *
 * @param amount Montant de base
 * @param discountRate Taux de remise (en %)
 * @returns Montant de la remise arrondi
 */
export function calculateDiscountAmount(
  amount: number,
  discountRate: number
): number {
  return roundAmount((amount * discountRate) / 100)
}

/**
 * Applique une remise sur un montant
 *
 * @param amount Montant de base
 * @param discountRate Taux de remise (en %)
 * @returns Montant après remise arrondi
 */
export function applyDiscount(amount: number, discountRate: number): number {
  const discountAmount = calculateDiscountAmount(amount, discountRate)
  return roundAmount(amount - discountAmount)
}

/**
 * Structure pour la ventilation de TVA
 */
export interface VATBreakdown {
  vatRate: number
  taxableBase: number // Base HT
  vatAmount: number // Montant TVA
  totalIncludingTax: number // Total TTC
}

/**
 * Calcule la ventilation de TVA pour plusieurs lignes
 * Regroupe les montants par taux de TVA
 *
 * @param lines Lignes de facture avec montant HT et taux TVA
 * @returns Ventilation de TVA par taux
 */
export function calculateVATBreakdown(
  lines: Array<{ amountExcludingTax: number; vatRate: number }>
): VATBreakdown[] {
  // Regrouper par taux de TVA
  const breakdownMap = new Map<number, VATBreakdown>()

  lines.forEach((line) => {
    const existing = breakdownMap.get(line.vatRate)

    if (existing) {
      // Additionner les montants pour ce taux
      existing.taxableBase = roundAmount(
        existing.taxableBase + line.amountExcludingTax
      )
      existing.vatAmount = calculateVATAmount(existing.taxableBase, line.vatRate)
      existing.totalIncludingTax = roundAmount(
        existing.taxableBase + existing.vatAmount
      )
    } else {
      // Créer une nouvelle entrée
      const vatAmount = calculateVATAmount(
        line.amountExcludingTax,
        line.vatRate
      )
      breakdownMap.set(line.vatRate, {
        vatRate: line.vatRate,
        taxableBase: line.amountExcludingTax,
        vatAmount,
        totalIncludingTax: roundAmount(line.amountExcludingTax + vatAmount),
      })
    }
  })

  // Trier par taux de TVA décroissant
  return Array.from(breakdownMap.values()).sort((a, b) => b.vatRate - a.vatRate)
}

/**
 * Calcule les totaux d'une facture
 *
 * @param lines Lignes de facture
 * @returns Objet avec les totaux HT, TVA et TTC
 */
export function calculateInvoiceTotals(
  lines: Array<{ amountExcludingTax: number; vatRate: number }>
): {
  subtotalExcludingTax: number
  totalVATAmount: number
  totalIncludingTax: number
} {
  const breakdown = calculateVATBreakdown(lines)

  const subtotalExcludingTax = roundAmount(
    breakdown.reduce((sum, item) => sum + item.taxableBase, 0)
  )

  const totalVATAmount = roundAmount(
    breakdown.reduce((sum, item) => sum + item.vatAmount, 0)
  )

  const totalIncludingTax = roundAmount(
    breakdown.reduce((sum, item) => sum + item.totalIncludingTax, 0)
  )

  return {
    subtotalExcludingTax,
    totalVATAmount,
    totalIncludingTax,
  }
}

/**
 * Vérifie si un taux de TVA est valide en France
 *
 * @param vatRate Taux de TVA à vérifier
 * @returns true si le taux est valide
 */
export function isValidVATRate(vatRate: number): boolean {
  const validRates = Object.values(VAT_RATES)
  return validRates.includes(vatRate)
}

/**
 * Obtient le nom du taux de TVA
 *
 * @param vatRate Taux de TVA
 * @returns Nom du taux (ex: "Taux normal 20%")
 */
export function getVATRateName(vatRate: number): string {
  switch (vatRate) {
    case VAT_RATES.STANDARD:
      return `Taux normal ${vatRate}%`
    case VAT_RATES.INTERMEDIATE:
      return `Taux intermédiaire ${vatRate}%`
    case VAT_RATES.REDUCED:
      return `Taux réduit ${vatRate}%`
    case VAT_RATES.SUPER_REDUCED:
      return `Taux super réduit ${vatRate}%`
    case VAT_RATES.ZERO:
      return 'Exonéré de TVA'
    default:
      return `${vatRate}%`
  }
}

/**
 * Formate un montant en euros
 *
 * @param amount Montant à formater
 * @param locale Locale (défaut: 'fr-FR')
 * @returns Montant formaté avec le symbole € (ex: "1 234,56 €")
 */
export function formatAmount(amount: number, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formate un taux de TVA
 *
 * @param vatRate Taux de TVA
 * @param locale Locale (défaut: 'fr-FR')
 * @returns Taux formaté (ex: "20,00 %")
 */
export function formatVATRate(vatRate: number, locale: string = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(vatRate / 100)
}
