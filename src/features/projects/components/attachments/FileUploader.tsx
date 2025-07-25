'use client'

import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconUpload, IconX } from '@tabler/icons-react'

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void
  uploading?: boolean
  accept?: string
  multiple?: boolean
  maxSize?: number // en MB
}

export function FileUploader({ 
  onFilesSelected, 
  uploading = false,
  accept = "*/*",
  multiple = true,
  maxSize = 10
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validateFiles = useCallback((files: File[]): { valid: File[], errors: string[] } => {
    const valid: File[] = []
    const errors: string[] = []

    files.forEach(file => {
      if (file.size > maxSize * 1024 * 1024) {
        errors.push(`${file.name}: Fichier trop volumineux (max ${maxSize}MB)`)
      } else {
        valid.push(file)
      }
    })

    return { valid, errors }
  }, [maxSize])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const { valid, errors } = validateFiles(fileArray)
    
    setErrors(errors)
    
    if (valid.length > 0) {
      onFilesSelected(valid)
    }
  }, [onFilesSelected, validateFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    handleFiles(files)
  }, [handleFiles])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
    e.target.value = '' // Reset input
  }, [handleFiles])

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <IconUpload className="h-full w-full" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragging ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos fichiers'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              ou cliquez pour sélectionner (max {maxSize}MB par fichier)
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              variant="outline" 
              disabled={uploading}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              {uploading ? 'Upload en cours...' : 'Sélectionner des fichiers'}
            </Button>
          </div>
        </div>
      </div>

      {/* Input caché */}
      <input
        id="file-input"
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              <IconX className="h-4 w-4" />
              {error}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}