'use client'

import React, { useState } from 'react'
import { TaskAttachmentExtended } from '../../types/kanban'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  IconDownload, 
  IconTrash, 
  IconMessage, 
  IconEye,
  IconDots
} from '@tabler/icons-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AttachmentCardProps {
  attachment: TaskAttachmentExtended
  currentUserId?: string
  onDownload?: (attachment: TaskAttachmentExtended) => void
  onDelete?: (attachmentId: string) => void
  onPreview?: (attachment: TaskAttachmentExtended) => void
  onComment?: (attachmentId: string) => void
  formatFileSize?: (bytes: number) => string
  getFileIcon?: (mimeType: string) => string
}

export function AttachmentCard({
  attachment,
  currentUserId,
  onDownload,
  onDelete,
  onPreview,
  onComment,
  formatFileSize = (bytes) => `${Math.round(bytes / 1024)} KB`,
  getFileIcon = () => '📎'
}: AttachmentCardProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const isOwner = currentUserId === attachment.uploadedBy
  const hasComments = attachment.commentsCount > 0
  const isImage = attachment.mimeType.startsWith('image/')
  const fileIcon = getFileIcon(attachment.mimeType)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const truncateFileName = (fileName: string, maxLength: number = 25) => {
    if (fileName.length <= maxLength) return fileName
    const extension = fileName.split('.').pop()
    const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4)
    return `${truncatedName}...${extension}`
  }

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header avec informations du fichier */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Prévisualisation ou icône */}
            <div className="relative shrink-0">
              {isImage && attachment.preview?.thumbnailUrl ? (
                <div 
                  className="h-12 w-12 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => onPreview?.(attachment)}
                >
                  <img
                    src={attachment.preview.thumbnailUrl}
                    alt={attachment.fileName}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                  {fileIcon}
                </div>
              )}
              
              {/* Badge du type de fichier */}
              <div className="absolute -top-1 -right-1">
                <Badge variant="secondary" className="text-xs h-5 px-1">
                  {attachment.fileName.split('.').pop()?.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Informations du fichier */}
            <div className="flex-1 min-w-0">
              <h4 
                className="font-medium text-sm text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                title={attachment.fileName}
                onClick={() => onPreview?.(attachment)}
              >
                {truncateFileName(attachment.fileName)}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatFileSize(attachment.fileSize)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {formatDate(attachment.uploadedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Menu actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isImage && (
                <>
                  <DropdownMenuItem onClick={() => onPreview?.(attachment)}>
                    <IconEye className="h-4 w-4 mr-2" />
                    Prévisualiser
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onDownload?.(attachment)}>
                <IconDownload className="h-4 w-4 mr-2" />
                Télécharger
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onComment?.(attachment.id)}>
                <IconMessage className="h-4 w-4 mr-2" />
                Commenter
              </DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(attachment.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <IconTrash className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Informations utilisateur et commentaires */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">
                {attachment.user.firstName[0]}{attachment.user.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-gray-600">
              {attachment.user.firstName} {attachment.user.lastName}
            </span>
          </div>

          {hasComments && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => onComment?.(attachment.id)}
            >
              <IconMessage className="h-3 w-3 mr-1" />
              {attachment.commentsCount}
            </Button>
          )}
        </div>

        {/* Actions rapides */}
        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onDownload?.(attachment)}
          >
            <IconDownload className="h-3 w-3 mr-1" />
            Télécharger
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => onComment?.(attachment.id)}
          >
            <IconMessage className="h-3 w-3 mr-1" />
            Commenter
          </Button>
          {isImage && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onPreview?.(attachment)}
            >
              <IconEye className="h-3 w-3 mr-1" />
              Voir
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}