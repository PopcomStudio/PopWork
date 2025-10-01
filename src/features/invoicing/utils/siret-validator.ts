/**
 * Validateur de numéro SIRET français
 * Le SIRET est un identifiant de 14 chiffres composé de:
 * - 9 chiffres du SIREN (identifiant de l'entreprise)
 * - 5 chiffres du NIC (identifiant de l'établissement)
 *
 * Validation selon l'algorithme de Luhn modifié pour SIRET
 */

/**
 * Valide un numéro SIRET
 * @param siret Le numéro SIRET à valider (14 chiffres)
 * @returns true si le SIRET est valide, false sinon
 */
export function validateSIRET(siret: string): boolean {
  // Supprimer les espaces et tirets
  const cleanedSIRET = siret.replace(/[\s-]/g, '')

  // Vérifier que le SIRET a exactement 14 chiffres
  if (!/^\d{14}$/.test(cleanedSIRET)) {
    return false
  }

  // Calculer la clé de contrôle avec l'algorithme de Luhn
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(cleanedSIRET[i], 10)

    // Pour les positions impaires (index pair en partant de 0), doubler le chiffre
    if (i % 2 === 0) {
      digit *= 2
      // Si le résultat est supérieur à 9, soustraire 9
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  // Le SIRET est valide si la somme est un multiple de 10
  return sum % 10 === 0
}

/**
 * Extrait le SIREN (9 premiers chiffres) d'un SIRET
 * @param siret Le numéro SIRET (14 chiffres)
 * @returns Le numéro SIREN (9 chiffres) ou null si invalide
 */
export function extractSIREN(siret: string): string | null {
  const cleanedSIRET = siret.replace(/[\s-]/g, '')

  if (!/^\d{14}$/.test(cleanedSIRET)) {
    return null
  }

  return cleanedSIRET.substring(0, 9)
}

/**
 * Formate un numéro SIRET pour l'affichage
 * @param siret Le numéro SIRET (14 chiffres)
 * @returns Le SIRET formaté (XXX XXX XXX XXXXX) ou le SIRET non formaté si invalide
 */
export function formatSIRET(siret: string): string {
  const cleanedSIRET = siret.replace(/[\s-]/g, '')

  if (!/^\d{14}$/.test(cleanedSIRET)) {
    return siret
  }

  // Format: XXX XXX XXX XXXXX
  return `${cleanedSIRET.substring(0, 3)} ${cleanedSIRET.substring(3, 6)} ${cleanedSIRET.substring(6, 9)} ${cleanedSIRET.substring(9, 14)}`
}

/**
 * Valide un numéro SIREN (9 chiffres)
 * @param siren Le numéro SIREN à valider
 * @returns true si le SIREN est valide, false sinon
 */
export function validateSIREN(siren: string): boolean {
  const cleanedSIREN = siren.replace(/[\s-]/g, '')

  if (!/^\d{9}$/.test(cleanedSIREN)) {
    return false
  }

  // Algorithme de Luhn pour SIREN
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let digit = parseInt(cleanedSIREN[i], 10)

    if (i % 2 === 0) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
  }

  return sum % 10 === 0
}

/**
 * Formate un numéro SIREN pour l'affichage
 * @param siren Le numéro SIREN (9 chiffres)
 * @returns Le SIREN formaté (XXX XXX XXX) ou le SIREN non formaté si invalide
 */
export function formatSIREN(siren: string): string {
  const cleanedSIREN = siren.replace(/[\s-]/g, '')

  if (!/^\d{9}$/.test(cleanedSIREN)) {
    return siren
  }

  // Format: XXX XXX XXX
  return `${cleanedSIREN.substring(0, 3)} ${cleanedSIREN.substring(3, 6)} ${cleanedSIREN.substring(6, 9)}`
}

/**
 * Génère un message d'erreur détaillé pour un SIRET invalide
 * @param siret Le numéro SIRET à analyser
 * @returns Un message d'erreur détaillé ou null si valide
 */
export function getSIRETValidationError(siret: string): string | null {
  if (!siret || siret.trim().length === 0) {
    return 'Le numéro SIRET est requis'
  }

  const cleanedSIRET = siret.replace(/[\s-]/g, '')

  if (!/^\d+$/.test(cleanedSIRET)) {
    return 'Le SIRET doit contenir uniquement des chiffres'
  }

  if (cleanedSIRET.length !== 14) {
    return `Le SIRET doit contenir exactement 14 chiffres (${cleanedSIRET.length} fournis)`
  }

  if (!validateSIRET(cleanedSIRET)) {
    return 'Le numéro SIRET est invalide (erreur de clé de contrôle)'
  }

  return null
}
