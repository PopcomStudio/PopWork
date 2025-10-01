/**
 * Validateur de numéro de TVA intracommunautaire
 * Format par pays (principaux pays européens)
 */

interface VATCountryFormat {
  code: string
  name: string
  format: RegExp
  example: string
}

const VAT_FORMATS: Record<string, VATCountryFormat> = {
  FR: {
    code: 'FR',
    name: 'France',
    format: /^FR[A-Z0-9]{2}\d{9}$/,
    example: 'FR12345678901',
  },
  BE: {
    code: 'BE',
    name: 'Belgique',
    format: /^BE0\d{9}$/,
    example: 'BE0123456789',
  },
  DE: {
    code: 'DE',
    name: 'Allemagne',
    format: /^DE\d{9}$/,
    example: 'DE123456789',
  },
  ES: {
    code: 'ES',
    name: 'Espagne',
    format: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
    example: 'ESX12345678',
  },
  IT: {
    code: 'IT',
    name: 'Italie',
    format: /^IT\d{11}$/,
    example: 'IT12345678901',
  },
  LU: {
    code: 'LU',
    name: 'Luxembourg',
    format: /^LU\d{8}$/,
    example: 'LU12345678',
  },
  NL: {
    code: 'NL',
    name: 'Pays-Bas',
    format: /^NL\d{9}B\d{2}$/,
    example: 'NL123456789B01',
  },
  PT: {
    code: 'PT',
    name: 'Portugal',
    format: /^PT\d{9}$/,
    example: 'PT123456789',
  },
  GB: {
    code: 'GB',
    name: 'Royaume-Uni',
    format: /^GB\d{9}|\d{12}|GD\d{3}|HA\d{3}$/,
    example: 'GB123456789',
  },
  IE: {
    code: 'IE',
    name: 'Irlande',
    format: /^IE\d[A-Z0-9]\d{5}[A-Z]$/,
    example: 'IE1234567A',
  },
  AT: {
    code: 'AT',
    name: 'Autriche',
    format: /^ATU\d{8}$/,
    example: 'ATU12345678',
  },
  DK: {
    code: 'DK',
    name: 'Danemark',
    format: /^DK\d{8}$/,
    example: 'DK12345678',
  },
  FI: {
    code: 'FI',
    name: 'Finlande',
    format: /^FI\d{8}$/,
    example: 'FI12345678',
  },
  SE: {
    code: 'SE',
    name: 'Suède',
    format: /^SE\d{12}$/,
    example: 'SE123456789012',
  },
  PL: {
    code: 'PL',
    name: 'Pologne',
    format: /^PL\d{10}$/,
    example: 'PL1234567890',
  },
  CZ: {
    code: 'CZ',
    name: 'République Tchèque',
    format: /^CZ\d{8,10}$/,
    example: 'CZ12345678',
  },
  RO: {
    code: 'RO',
    name: 'Roumanie',
    format: /^RO\d{2,10}$/,
    example: 'RO1234567',
  },
  GR: {
    code: 'GR',
    name: 'Grèce',
    format: /^GR\d{9}$/,
    example: 'GR123456789',
  },
  HU: {
    code: 'HU',
    name: 'Hongrie',
    format: /^HU\d{8}$/,
    example: 'HU12345678',
  },
}

/**
 * Valide un numéro de TVA intracommunautaire
 * @param vat Le numéro de TVA à valider (avec préfixe pays)
 * @returns true si le numéro de TVA est valide, false sinon
 */
export function validateVAT(vat: string): boolean {
  if (!vat || vat.trim().length === 0) {
    return false
  }

  // Nettoyer le numéro (supprimer espaces, tirets, points)
  const cleanedVAT = vat.replace(/[\s.-]/g, '').toUpperCase()

  // Vérifier que le numéro commence par un code pays valide
  const countryCode = cleanedVAT.substring(0, 2)

  if (!VAT_FORMATS[countryCode]) {
    return false
  }

  // Vérifier le format spécifique au pays
  return VAT_FORMATS[countryCode].format.test(cleanedVAT)
}

/**
 * Extrait le code pays d'un numéro de TVA
 * @param vat Le numéro de TVA
 * @returns Le code pays (2 lettres) ou null si invalide
 */
export function extractVATCountryCode(vat: string): string | null {
  if (!vat || vat.length < 2) {
    return null
  }

  const countryCode = vat.substring(0, 2).toUpperCase()

  return VAT_FORMATS[countryCode] ? countryCode : null
}

/**
 * Génère un numéro de TVA français à partir d'un SIREN
 * Format français: FR + 2 caractères de clé + 9 chiffres du SIREN
 *
 * @param siren Le numéro SIREN (9 chiffres)
 * @returns Le numéro de TVA intracommunautaire français
 */
export function generateFrenchVAT(siren: string): string {
  const cleanedSIREN = siren.replace(/[\s-]/g, '')

  if (!/^\d{9}$/.test(cleanedSIREN)) {
    throw new Error('Le SIREN doit contenir exactement 9 chiffres')
  }

  // Calcul de la clé de TVA française
  const sirenNumber = parseInt(cleanedSIREN, 10)
  const key = (12 + 3 * (sirenNumber % 97)) % 97

  // Formater avec zéro si nécessaire
  const keyString = key.toString().padStart(2, '0')

  return `FR${keyString}${cleanedSIREN}`
}

/**
 * Formate un numéro de TVA pour l'affichage
 * @param vat Le numéro de TVA
 * @returns Le numéro de TVA formaté ou le numéro original si invalide
 */
export function formatVAT(vat: string): string {
  if (!vat) return ''

  const cleanedVAT = vat.replace(/[\s.-]/g, '').toUpperCase()
  const countryCode = cleanedVAT.substring(0, 2)

  if (!VAT_FORMATS[countryCode]) {
    return vat
  }

  // Format spécifique pour la France: FR XX XXX XXX XXX
  if (countryCode === 'FR') {
    if (cleanedVAT.length === 13) {
      return `${cleanedVAT.substring(0, 2)} ${cleanedVAT.substring(2, 4)} ${cleanedVAT.substring(4, 7)} ${cleanedVAT.substring(7, 10)} ${cleanedVAT.substring(10, 13)}`
    }
  }

  // Format générique: CODE PAYS + reste du numéro avec espaces tous les 3-4 caractères
  const countryPrefix = cleanedVAT.substring(0, 2)
  const number = cleanedVAT.substring(2)

  // Insérer un espace tous les 3-4 caractères
  const formatted = number.match(/.{1,4}/g)?.join(' ') || number

  return `${countryPrefix} ${formatted}`
}

/**
 * Génère un message d'erreur détaillé pour un numéro de TVA invalide
 * @param vat Le numéro de TVA à analyser
 * @returns Un message d'erreur détaillé ou null si valide
 */
export function getVATValidationError(vat: string): string | null {
  if (!vat || vat.trim().length === 0) {
    return 'Le numéro de TVA est requis'
  }

  const cleanedVAT = vat.replace(/[\s.-]/g, '').toUpperCase()

  if (cleanedVAT.length < 4) {
    return 'Le numéro de TVA est trop court'
  }

  const countryCode = cleanedVAT.substring(0, 2)

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return 'Le numéro de TVA doit commencer par un code pays à 2 lettres (ex: FR, BE, DE...)'
  }

  if (!VAT_FORMATS[countryCode]) {
    return `Le code pays "${countryCode}" n'est pas reconnu ou supporté`
  }

  if (!validateVAT(cleanedVAT)) {
    const format = VAT_FORMATS[countryCode]
    return `Le numéro de TVA ne correspond pas au format ${format.name} attendu (ex: ${format.example})`
  }

  return null
}

/**
 * Liste tous les pays supportés avec leurs formats
 * @returns Liste des pays supportés
 */
export function getSupportedVATCountries(): VATCountryFormat[] {
  return Object.values(VAT_FORMATS)
}

/**
 * Vérifie si un numéro de TVA est français
 * @param vat Le numéro de TVA
 * @returns true si le numéro est français
 */
export function isFrenchVAT(vat: string): boolean {
  const cleanedVAT = vat.replace(/[\s.-]/g, '').toUpperCase()
  return cleanedVAT.startsWith('FR')
}
