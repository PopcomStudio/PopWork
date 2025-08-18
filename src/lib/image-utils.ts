/**
 * Utilitaires pour la compression et le redimensionnement d'images
 */

export interface CompressImageOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

/**
 * Compresse une image en WebP avec redimensionnement automatique
 */
export const compressImage = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<File> => {
  const {
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8,
    format = 'webp'
  } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculer les nouvelles dimensions en gardant le ratio
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        // Configurer le canvas
        canvas.width = width
        canvas.height = height

        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'))
          return
        }

        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height)

        // Convertir en blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Impossible de compresser l\'image'))
              return
            }

            // Créer un nouveau fichier avec le nom correct
            const compressedFile = new File(
              [blob],
              `avatar-${Date.now()}.${format}`,
              {
                type: `image/${format}`,
                lastModified: Date.now()
              }
            )

            resolve(compressedFile)
          },
          `image/${format}`,
          quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Impossible de charger l\'image'))
    }

    // Charger l'image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Valide si un fichier est une image acceptée
 */
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  // Vérifier le type MIME
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Type de fichier non supporté. Utilisez JPG, PNG ou WebP.'
    }
  }

  // Vérifier la taille (10MB max avant compression)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Fichier trop volumineux. Maximum 10MB avant compression.'
    }
  }

  return { valid: true }
}

/**
 * Génère un nom de fichier unique pour un avatar
 */
export const generateAvatarFileName = (userId: string, format: string = 'webp'): string => {
  return `${userId}/avatar-${Date.now()}.${format}`
}