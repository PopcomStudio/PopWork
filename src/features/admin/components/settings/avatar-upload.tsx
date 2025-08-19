"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ImageIcon, Upload, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AvatarUploadProps {
  currentAvatar?: string
  onAvatarChange: (file: File | null) => void
  error?: string
  loading?: boolean
  size?: "sm" | "md" | "lg"
}

export function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  error,
  loading = false,
  size = "md"
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32"
  }

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      onAvatarChange(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleRemove = () => {
    setPreview(null)
    onAvatarChange(null)
  }

  const displayAvatar = preview || currentAvatar

  return (
    <div className="space-y-4">
      <Label>Photo de profil</Label>
      
      <div className="flex items-center gap-6">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={displayAvatar} />
          <AvatarFallback>
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-3">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Glissez une image ici ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG jusqu'à 10MB
              </p>
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.querySelector('input[type="file"]')?.click?.()}
              disabled={loading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner
            </Button>
            
            {displayAvatar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
