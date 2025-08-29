'use client'

import React, { useState, useRef } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { useLeaves } from '../hooks/use-leaves'
import { Leave } from '@/shared/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Palmtree,
  Plus,
  Edit,
  Trash2,
  Clock,
  Check,
  X,
  AlertCircle,
  Paperclip,
  CalendarIcon,
  Upload,
  Download,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClientComponentClient } from '@/lib/supabase'

const leaveTypeLabels = {
  vacation: 'Congés payés',
  sick: 'Congé maladie',
  other: 'Autre'
}

const statusLabels = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté'
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

export function LeavesManagement() {
  const {
    leaves,
    leaveBalance,
    loading,
    error,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest
  } = useLeaves()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLeave, setEditingLeave] = useState<Leave | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    type: '' as Leave['type'] | '',
    reason: '',
    attachment_file: null as File | null,
    attachment_name: ''
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [attachmentViewerOpen, setAttachmentViewerOpen] = useState(false)
  const [viewingAttachment, setViewingAttachment] = useState<{url: string, name: string} | null>(null)

  const resetForm = () => {
    setFormData({
      type: '',
      reason: '',
      attachment_file: null,
      attachment_name: ''
    })
    setDateRange(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const calculateDays = () => {
    if (!dateRange?.from) return 0
    const to = dateRange.to || dateRange.from
    return Math.ceil((to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }


  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        attachment_file: file,
        attachment_name: file.name
      }))
    }
  }

  const handleCreateLeave = async () => {
    if (!isFormValid()) {
      return
    }

    setIsSubmitting(true)

    const to = dateRange.to || dateRange.from

    // Upload du fichier si présent
    let attachmentUrl = ''
    if (formData.attachment_file) {
      attachmentUrl = await uploadAttachment(formData.attachment_file) || ''
      
      if (!attachmentUrl) {
        alert('Erreur lors de l\'upload du fichier. Veuillez réessayer.')
        setIsSubmitting(false)
        return
      }
    }

    const leaveData = {
      type: formData.type,
      start_date: dateRange?.from?.toISOString() || '',
      end_date: to.toISOString(),
      reason: formData.reason,
      attachment_url: attachmentUrl || undefined,
      attachment_name: formData.attachment_name || undefined
    }

    const result = await createLeaveRequest(leaveData)
    
    if (result) {
      setIsCreateDialogOpen(false)
      resetForm()
    }

    setIsSubmitting(false)
  }

  const handleUpdateLeave = async () => {
    if (!editingLeave || !isFormValid()) {
      return
    }

    setIsSubmitting(true)

    const to = dateRange.to || dateRange.from
    const days_count = calculateDays()

    // Gérer l'upload de fichier si un nouveau fichier est sélectionné
    let attachmentUrl = editingLeave.attachment_url
    let attachmentName = editingLeave.attachment_name
    
    if (formData.attachment_file) {
      const uploadedUrl = await uploadAttachment(formData.attachment_file)
      
      if (!uploadedUrl) {
        alert('Erreur lors de l\'upload du fichier. Veuillez réessayer.')
        setIsSubmitting(false)
        return
      }
      
      attachmentUrl = uploadedUrl
      attachmentName = formData.attachment_name
    }

    const updates = {
      type: formData.type,
      start_date: dateRange?.from?.toISOString() || '',
      end_date: to.toISOString(),
      reason: formData.reason,
      days_count,
      attachment_url: attachmentUrl || undefined,
      attachment_name: attachmentName || undefined
    }

    const result = await updateLeaveRequest(editingLeave.id, updates)
    
    if (result) {
      setEditingLeave(null)
      resetForm()
    }

    setIsSubmitting(false)
  }

  const handleEditLeave = (leave: Leave) => {
    setEditingLeave(leave)
    setFormData({
      type: leave.type,
      reason: leave.reason,
      attachment_file: null,
      attachment_name: leave.attachment_name || ''
    })
    
    // Convertir les dates du leave en DateRange
    const from = new Date(leave.start_date)
    const to = new Date(leave.end_date)
    
    setDateRange({
      from,
      to: from.toDateString() === to.toDateString() ? undefined : to
    })
  }

  const handleDeleteLeave = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette demande de congé ?')) {
      await deleteLeaveRequest(id)
    }
  }

  const handleCancelLeave = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir annuler cette demande de congé ?')) {
      await deleteLeaveRequest(id)
    }
  }

  const handleViewAttachment = (url: string, name: string) => {
    setViewingAttachment({ url, name })
    setAttachmentViewerOpen(true)
  }

  const uploadAttachment = async (file: File): Promise<string | null> => {
    const supabase = createClientComponentClient()
    
    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    try {
      const { data, error } = await supabase.storage
        .from('leave-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('Upload error:', error)
        return null
      }
      
      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('leave-attachments')
        .getPublicUrl(data.path)
      
      return publicUrl
    } catch (error) {
      console.error('Upload failed:', error)
      return null
    }
  }

  const canEdit = (leave: Leave) => {
    return leave.status === 'pending'
  }

  const canDelete = (leave: Leave) => {
    return leave.status === 'pending'
  }

  const isFormValid = () => {
    if (!formData.type || !dateRange?.from) return false
    // Motif obligatoire seulement pour congé maladie et autre
    if ((formData.type === 'sick' || formData.type === 'other') && !formData.reason) return false
    return true
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      {leaveBalance && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Congés payés</CardTitle>
              <Palmtree className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leaveBalance.paid_leave_days - leaveBalance.used_paid_leave_days}/{leaveBalance.paid_leave_days}
              </div>
              <p className="text-xs text-muted-foreground">jours disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Congés maladie</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leaveBalance.used_sick_days}
              </div>
              <p className="text-xs text-muted-foreground">jours utilisés cette année</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaves List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes demandes de congés</CardTitle>
              <CardDescription>Gérez vos demandes de congés et consultez leur statut</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle demande
              </Button>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvelle demande de congé</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations pour votre demande de congé
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type">Type de congé</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: Leave['type']) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Congés payés</SelectItem>
                        <SelectItem value="sick">Congé maladie</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Période</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateRange?.from ? (
                            dateRange.to && dateRange.from.toDateString() !== dateRange.to.toDateString() ? (
                              <>
                                Du {format(dateRange.from, "dd MMM yyyy", { locale: fr })} au{" "}
                                {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                              </>
                            ) : (
                              `Le ${format(dateRange.from, "dd MMM yyyy", { locale: fr })}`
                            )
                          ) : (
                            <span>Choisir les dates</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                          pagedNavigation
                          showOutsideDays={false}
                          locale={fr}
                          classNames={{
                            months: "gap-8",
                            month:
                              "relative first-of-type:before:hidden before:absolute max-sm:before:inset-x-2 max-sm:before:h-px max-sm:before:-top-2 sm:before:inset-y-2 sm:before:w-px before:bg-border sm:before:-left-4",
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {dateRange?.from && (
                    <div className="text-sm text-muted-foreground">
                      Durée: {calculateDays()} jour{calculateDays() > 1 ? 's' : ''}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="reason">
                      Motif {formData.type === 'vacation' ? '(optionnel)' : '*'}
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder={
                        formData.type === 'vacation'
                          ? "Motif optionnel..."
                          : "Décrivez la raison de votre demande..."
                      }
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Pièce jointe (optionnel)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Joindre un fichier
                      </Button>
                      {formData.attachment_name && (
                        <span className="text-sm text-muted-foreground truncate">
                          {formData.attachment_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false)
                      resetForm()
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateLeave}
                    disabled={!isFormValid() || isSubmitting}
                  >
                    {isSubmitting ? 'Création...' : 'Créer la demande'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune demande de congé trouvée
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Pièce jointe</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {leaveTypeLabels[leave.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(leave.start_date), 'dd MMM yyyy', { locale: fr })} -{' '}
                      {format(new Date(leave.end_date), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {leave.days_count} jour{leave.days_count > 1 ? 's' : ''}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          statusColors[leave.status],
                          "text-xs"
                        )}
                      >
                        {statusLabels[leave.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {leave.reason}
                    </TableCell>
                    <TableCell>
                      {leave.attachment_name ? (
                        <button
                          onClick={() => leave.attachment_url && handleViewAttachment(leave.attachment_url, leave.attachment_name!)}
                          className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors"
                          title="Voir la pièce jointe"
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm truncate max-w-[100px]">
                            {leave.attachment_name}
                          </span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit(leave) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLeave(leave)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(leave) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelLeave(leave.id)}
                            title="Annuler la demande"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete(leave) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLeave(leave.id)}
                            title="Supprimer la demande"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingLeave} onOpenChange={() => setEditingLeave(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la demande de congé</DialogTitle>
            <DialogDescription>
              Modifiez les informations de votre demande
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-type">Type de congé</Label>
              <Select
                value={formData.type}
                onValueChange={(value: Leave['type']) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Congés payés</SelectItem>
                  <SelectItem value="sick">Congé maladie</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Période</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to && dateRange.from.toDateString() !== dateRange.to.toDateString() ? (
                        <>
                          Du {format(dateRange.from, "dd MMM yyyy", { locale: fr })} au{" "}
                          {format(dateRange.to, "dd MMM yyyy", { locale: fr })}
                        </>
                      ) : (
                        `Le ${format(dateRange.from, "dd MMM yyyy", { locale: fr })}`
                      )
                    ) : (
                      <span>Choisir les dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    pagedNavigation
                    showOutsideDays={false}
                    locale={fr}
                    classNames={{
                      months: "gap-8",
                      month:
                        "relative first-of-type:before:hidden before:absolute max-sm:before:inset-x-2 max-sm:before:h-px max-sm:before:-top-2 sm:before:inset-y-2 sm:before:w-px before:bg-border sm:before:-left-4",
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {dateRange?.from && (
              <div className="text-sm text-muted-foreground">
                Durée: {calculateDays()} jour{calculateDays() > 1 ? 's' : ''}
              </div>
            )}

            <div>
              <Label htmlFor="edit-reason">
                Motif {formData.type === 'vacation' ? '(optionnel)' : '*'}
              </Label>
              <Textarea
                id="edit-reason"
                placeholder={
                  formData.type === 'vacation'
                    ? "Motif optionnel..."
                    : "Décrivez la raison de votre demande..."
                }
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Pièce jointe</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {formData.attachment_name || editingLeave?.attachment_name ? 'Changer' : 'Joindre'}
                </Button>
                {(formData.attachment_name || editingLeave?.attachment_name) && (
                  <span className="text-sm text-muted-foreground truncate">
                    {formData.attachment_name || editingLeave?.attachment_name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingLeave(null)
                resetForm()
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateLeave}
              disabled={!isFormValid() || isSubmitting}
            >
              {isSubmitting ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachment Viewer Dialog */}
      <Dialog open={attachmentViewerOpen} onOpenChange={setAttachmentViewerOpen}>
        <DialogContent 
          className="!max-w-[85vw] max-h-[95vh] !w-[85vw]" 
          style={{ width: '85vw', maxWidth: '85vw', minWidth: '85vw' }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {viewingAttachment?.name}
            </DialogTitle>
            <DialogDescription>
              Prévisualisation de la pièce jointe
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {viewingAttachment?.url && (
              <div className="w-full h-[80vh] border rounded-lg overflow-hidden">
                {viewingAttachment.name.toLowerCase().endsWith('.pdf') ? (
                  <iframe
                    src={viewingAttachment.url}
                    className="w-full h-full border-0"
                    title={viewingAttachment.name}
                  />
                ) : viewingAttachment.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img
                    src={viewingAttachment.url}
                    alt={viewingAttachment.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Paperclip className="h-12 w-12 mb-4" />
                    <p className="text-lg font-medium">Aperçu non disponible</p>
                    <p className="text-sm">Utilisez le bouton de téléchargement pour ouvrir le fichier</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {viewingAttachment && (
              <Button
                variant="outline"
                onClick={() => viewingAttachment?.url && window.open(viewingAttachment.url, '_blank')}
              >
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            )}
            <Button onClick={() => setAttachmentViewerOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}