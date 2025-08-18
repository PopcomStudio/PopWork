"use client"

import React, { useState, useRef, useCallback } from "react"
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import "react-image-crop/dist/ReactCrop.css"

interface ImageCropModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageFile: File | null
  onCropComplete: (croppedFile: File) => void
  onCancel: () => void
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

export function ImageCropModal({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [imageUrl, setImageUrl] = useState<string>("")
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, 1)) // Ratio 1:1 pour avatar carré
  }, [])

  // Créer l'URL de l'image quand le fichier change
  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile])

  const getCroppedImage = useCallback(
    async (image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
      const canvas = canvasRef.current
      if (!canvas || !crop) {
        throw new Error("Canvas ou crop non disponible")
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        throw new Error("Impossible de créer le contexte canvas")
      }

      const pixelRatio = window.devicePixelRatio
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
      canvas.height = Math.floor(crop.height * scaleY * pixelRatio)

      ctx.scale(pixelRatio, pixelRatio)
      ctx.imageSmoothingQuality = "high"

      const cropX = crop.x * scaleX
      const cropY = crop.y * scaleY

      ctx.drawImage(
        image,
        cropX,
        cropY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width * scaleX,
        crop.height * scaleY,
      )

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              throw new Error("Échec de la création du blob")
            }
            const file = new File([blob], imageFile?.name || "avatar.jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
            resolve(file)
          },
          "image/jpeg",
          0.9,
        )
      })
    },
    [imageFile],
  )

  const handleCropConfirm = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return

    try {
      const croppedFile = await getCroppedImage(imgRef.current, completedCrop)
      onCropComplete(croppedFile)
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur lors du crop:", error)
    }
  }, [completedCrop, getCroppedImage, onCropComplete, onOpenChange])

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Recadrer votre photo de profil</DialogTitle>
          <DialogDescription>
            Déplacez et redimensionnez le cadre pour choisir la partie de l'image à utiliser comme avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {imageUrl && (
            <div className="max-w-full overflow-hidden">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={imgRef}
                  alt="Crop"
                  src={imageUrl}
                  style={{ maxHeight: "400px", maxWidth: "100%" }}
                  onLoad={onImageLoad}
                />
              </ReactCrop>
            </div>
          )}

          {/* Canvas caché pour le crop */}
          <canvas
            ref={canvasRef}
            style={{ display: "none" }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button 
            onClick={handleCropConfirm}
            disabled={!completedCrop}
          >
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}