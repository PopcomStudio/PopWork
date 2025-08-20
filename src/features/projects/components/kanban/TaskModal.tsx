'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TaskExtended, TaskStatus, UpdateTaskData } from '../../types/kanban';
import { Task, Tag, User } from '@/shared/types/database';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  IconCalendar, 
  IconUser, 
  IconTag,
  IconFlag,
  IconMessage,
  IconPaperclip,
  IconPlus
} from '@tabler/icons-react';
import { createClientComponentClient } from '@/lib/supabase';
import { CommentItem } from '../discussion/CommentItem';
import { CommentEditor } from '../discussion/CommentEditor';
import { AttachmentCard } from '../attachments/AttachmentCard';
import { FileUploader } from '../attachments/FileUploader';
import { useTaskComments } from '../../hooks/useTaskComments';
import { useTaskAttachments } from '../../hooks/useTaskAttachments';

interface TaskModalProps {
  task?: TaskExtended; // Optionnel pour gérer les cas où task peut être undefined
  isOpen: boolean;
  onClose: () => void;
  updateTask?: (data: UpdateTaskData) => Promise<TaskExtended>; // Pour l'auto-sauvegarde sans fermer
  projectId: string;
}


export function TaskModal({ task, isOpen, onClose, updateTask, projectId }: TaskModalProps) {
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo' as TaskStatus,
    priority: task?.priority || 'medium' as Task['priority'],
    due_date: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    assignee_ids: task?.assignees?.map(a => a.id) || [],
    tag_ids: task?.tags?.map(t => t.id) || []
  });

  const [activeTab, setActiveTab] = useState('description');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdatingFromRealTime, setIsUpdatingFromRealTime] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Hooks pour les commentaires et pièces jointes
  const {
    comments,
    loading: commentsLoading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    removeReaction,
    getReactionsSummary
  } = useTaskComments(task?.id || '');

  const {
    attachments,
    loading: attachmentsLoading,
    uploadFile,
    deleteAttachment,
    downloadAttachment,
    previewAttachment,
    commentOnAttachment
  } = useTaskAttachments(task?.id || '');

  const supabase = createClientComponentClient();

  // Gestionnaire des mises à jour temps réel de la tâche (simplifié)
  const handleRealTimeTaskUpdate = useCallback((payload: { eventType: string; new: any }) => {
    const { eventType, new: newRecord } = payload;
    
    if (eventType === 'UPDATE' && newRecord && !isUpdatingFromRealTime) {
      setIsUpdatingFromRealTime(true);
      
      setFormData(prev => ({
        ...prev,
        title: newRecord.title || prev.title,
        description: newRecord.description || prev.description,
        status: newRecord.status || prev.status,
        priority: newRecord.priority || prev.priority,
        due_date: newRecord.due_date ? new Date(newRecord.due_date).toISOString().split('T')[0] : prev.due_date
      }));
      
      setTimeout(() => setIsUpdatingFromRealTime(false), 200);
    }
  }, [isUpdatingFromRealTime]);

  // Gestionnaire simplifié des relations temps réel
  const handleRealTimeRelationsUpdate = useCallback(async (relationType: 'assignees' | 'tags') => {
    if (!task?.id || isUpdatingFromRealTime) return;
    
    setIsUpdatingFromRealTime(true);
    
    try {
      if (relationType === 'assignees') {
        const { data } = await supabase
          .from('task_assignees')
          .select('user_id')
          .eq('task_id', task.id);
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            assignee_ids: data.map(a => a.user_id)
          }));
        }
      } else if (relationType === 'tags') {
        const { data } = await supabase
          .from('task_tags')
          .select('tag_id')
          .eq('task_id', task.id);
        
        if (data) {
          setFormData(prev => ({
            ...prev,
            tag_ids: data.map(t => t.tag_id)
          }));
        }
      }
    } catch (err) {
      console.error('Erreur relation update:', err);
    } finally {
      setTimeout(() => setIsUpdatingFromRealTime(false), 200);
    }
  }, [task?.id, supabase, isUpdatingFromRealTime]);

  // Charger les données nécessaires
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les tags du projet
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .eq('project_id', projectId);

      if (tagsError) throw tagsError;
      setAvailableTags(tagsData || []);

      // Charger les utilisateurs (pour les assignés)
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role_id, created_at, updated_at, avatar_url');

      if (usersError) throw usersError;
      
      // Transformer les données pour correspondre au type User
      const transformedUsers: User[] = (usersData || []).map(user => ({
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        roleId: user.role_id || '',
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString(),
        avatarUrl: user.avatar_url
      }));
      
      setAvailableUsers(transformedUsers);

      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Référence des valeurs précédentes pour détecter les changements
  const prevFormData = useRef(formData)
  
  // Auto-sauvegarde avec debounce pour éviter les conflits
  useEffect(() => {
    if (isOpen && task?.id && updateTask && !isUpdatingFromRealTime) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(prevFormData.current)
      
      if (hasChanged) {
        const timeoutId = setTimeout(async () => {
          try {
            await updateTask({
              id: task.id,
              title: formData.title,
              description: formData.description,
              priority: formData.priority,
              status: formData.status,
              dueDate: formData.due_date || null,
              assigneeIds: formData.assignee_ids,
              tagIds: formData.tag_ids
            })
            prevFormData.current = formData
          } catch (err) {
            console.error('Erreur auto-sauvegarde:', err)
          }
        }, 300) // Délai de 300ms pour éviter les saves trop fréquentes
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [formData, isOpen, task?.id, updateTask, isUpdatingFromRealTime])

  // Écouter les changements temps réel (version stable)
  useEffect(() => {
    if (!isOpen || !task?.id) return

    const channel = supabase
      .channel(`task-modal-${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`
        },
        handleRealTimeTaskUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignees',
          filter: `task_id=eq.${task.id}`
        },
        () => handleRealTimeRelationsUpdate('assignees')
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_tags',
          filter: `task_id=eq.${task.id}`
        },
        () => handleRealTimeRelationsUpdate('tags')
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [isOpen, task?.id, handleRealTimeTaskUpdate, handleRealTimeRelationsUpdate])

  const handleCreateComment = useCallback(async (content: string, mentions: any[]) => {
    if (!task?.id) return;
    try {
      await createComment({ content, mentions });
    } catch (error) {
      console.error('Erreur lors de la création du commentaire:', error);
    }
  }, [task?.id, createComment]);

  const handleReplyToComment = useCallback(async (parentCommentId: string, content: string, mentions: any[]) => {
    if (!task?.id) return;
    try {
      // Pour créer une réponse, on utilise createComment avec parentCommentId
      await createComment({ content, mentions, parentCommentId });
      // Pas besoin de gérer replyingTo ici car c'est géré dans CommentItem
    } catch (error) {
      console.error('Erreur lors de la réponse:', error);
    }
  }, [task?.id, createComment]);

  const handleEditComment = useCallback(async (commentId: string, content: string, mentions: any[]) => {
    try {
      await updateComment(commentId, content, mentions);
      // Pas besoin de gérer editingComment ici car c'est géré dans CommentItem
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
    }
  }, [updateComment]);

  const handleToggleReaction = useCallback(async (commentId: string, emoji: string) => {
    try {
      const reactions = getReactionsSummary(commentId);
      const existingReaction = reactions.find(r => r.emoji === emoji);
      
      if (existingReaction?.hasUserReacted) {
        await removeReaction(commentId, emoji);
      } else {
        await addReaction(commentId, emoji);
      }
    } catch (error) {
      console.error('Erreur lors de la réaction:', error);
    }
  }, [addReaction, removeReaction, getReactionsSummary]);

  const handleUploadFiles = useCallback(async (files: File[]) => {
    if (!task?.id) return;
    try {
      for (const file of files) {
        await uploadFile(file);
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
    }
  }, [task?.id, uploadFile]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(id => id !== userId)
        : [...prev.assignee_ids, userId]
    }));
  };

  // Utilisateurs assignés pour affichage
  const assignedUsers = useMemo(() => {
    return availableUsers.filter(user => formData.assignee_ids.includes(user.id));
  }, [availableUsers, formData.assignee_ids]);

  // Utilisateurs filtrés par recherche
  const filteredUsers = useMemo(() => {
    return availableUsers
      .filter(user => !formData.assignee_ids.includes(user.id))
      .filter(user => {
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        return fullName.includes(assigneeSearch.toLowerCase());
      });
  }, [availableUsers, formData.assignee_ids, assigneeSearch]);

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId]
    }));
  };

  const getTagStyle = (color: string) => {
    return {
      backgroundColor: color + '20',
      borderColor: color,
      color: color
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[70vw] w-[70vw] h-[90vh] p-0 sm:max-w-[90vw] flex flex-col">
        <VisuallyHidden>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </VisuallyHidden>

        {loading ? (
          <div className="flex-1 p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Layout en 2 colonnes */}
            <div className="flex flex-1 overflow-hidden">
              {/* Colonne gauche - Contenu principal */}
              <div className="flex-[2] space-y-4 p-6 pr-3">
                {/* Titre de la tâche */}
                <div className="space-y-2">
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nom de la tâche"
                    className="text-xl font-semibold focus-visible:ring-0 bg-transparent"
                    required
                  />
                </div>

                {/* Tabs pour contenu */}
                <div className="flex-1">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="description" className="flex items-center gap-2">
                        <IconMessage className="h-4 w-4" />
                        Description
                      </TabsTrigger>
                      <TabsTrigger value="discussion" className="flex items-center gap-2">
                        <IconMessage className="h-4 w-4" />
                        Discussion ({comments?.length || 0})
                      </TabsTrigger>
                      <TabsTrigger value="attachments" className="flex items-center gap-2">
                        <IconPaperclip className="h-4 w-4" />
                        Pièces jointes ({attachments?.length || 0})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="description" className="mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Description de la tâche</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Décrivez les détails de cette tâche..."
                          rows={12}
                          className="resize-none"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="discussion" className="mt-4 flex flex-col h-96">
                      {commentsLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 space-y-4 overflow-y-auto mb-4">
                            {(comments?.length || 0) === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                Aucun commentaire pour le moment
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {(comments || []).map((comment) => (
                                  <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    currentUserId={currentUserId}
                                    onReply={handleReplyToComment}
                                    onEdit={handleEditComment}
                                    onDelete={() => deleteComment(comment.id)}
                                    onReaction={(emoji) => handleToggleReaction(comment.id, emoji)}
                                    onRemoveReaction={(emoji) => handleToggleReaction(comment.id, emoji)}
                                    getReactionsSummary={getReactionsSummary}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="border-t pt-4">
                            <CommentEditor
                              placeholder="Ajouter un commentaire..."
                              onSubmit={handleCreateComment}
                              availableUsers={availableUsers}
                              availableAttachments={attachments}
                            />
                          </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="attachments" className="mt-4 flex flex-col h-96">
                      {attachmentsLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <FileUploader
                              onFilesSelected={handleUploadFiles}
                              uploading={attachmentsLoading}
                              accept="*/*"
                              multiple={true}
                              maxSize={50}
                            />
                          </div>
                          
                          <div className="flex-1 overflow-y-auto">
                            {(attachments?.length || 0) === 0 ? (
                              <div className="text-center text-gray-500 py-8">
                                <IconPaperclip className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <p>Aucune pièce jointe pour le moment</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-4">
                                {(attachments || []).map((attachment) => (
                                  <AttachmentCard
                                    key={attachment.id}
                                    attachment={attachment}
                                    currentUserId={currentUserId}
                                    onDownload={() => downloadAttachment(attachment.id)}
                                    onDelete={() => deleteAttachment(attachment.id)}
                                    onPreview={() => previewAttachment(attachment.id)}
                                    onComment={() => commentOnAttachment(attachment.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {/* Colonne droite - Métadonnées */}
              <div className="flex-1 max-w-sm border-l bg-gray-50 overflow-y-auto rounded-r-lg">
                <div className="space-y-6 p-6">
                {/* Assignés */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <IconUser className="h-4 w-4" />
                    Assignés
                  </Label>
                  
                  {/* Assignés sélectionnés en badges */}
                  {assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedUsers.map((user) => (
                        <Badge key={user.id} variant="secondary" className="inline-flex items-center gap-1.5 pr-1">
                          <Avatar className="h-4 w-4">
                            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                            <AvatarFallback className="text-[10px]">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{user.firstName} {user.lastName}</span>
                          <button
                            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => toggleAssignee(user.id)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Sélecteur avec recherche pour ajouter des assignés */}
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      if (value && !formData.assignee_ids.includes(value)) {
                        toggleAssignee(value);
                        setAssigneeSearch(''); // Reset search after selection
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center">
                        <IconPlus className="h-4 w-4 mr-2" />
                        <span className="text-gray-500">Ajouter un assigné</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-3 py-2 border-b">
                        <Input
                          placeholder="Rechercher un utilisateur..."
                          value={assigneeSearch}
                          onChange={(e) => setAssigneeSearch(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center">
                            {assigneeSearch ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                                  <AvatarFallback className="text-xs">
                                    {user.firstName?.[0]}{user.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                {user.firstName} {user.lastName}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Date d'échéance */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <IconCalendar className="h-4 w-4" />
                    Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>

                <Separator />

                {/* Statut */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: TaskStatus) => setFormData(prev => ({ ...prev, status: value as any }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">À faire</SelectItem>
                      <SelectItem value="in_progress">En cours</SelectItem>
                      <SelectItem value="review">En révision</SelectItem>
                      <SelectItem value="done">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Priorité */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <IconFlag className="h-4 w-4" />
                    Priorité
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Task['priority']) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Faible</SelectItem>
                      <SelectItem value="medium">Moyenne</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Tags */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <IconTag className="h-4 w-4" />
                    Tags
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={formData.tag_ids.includes(tag.id) ? "default" : "outline"}
                        className="cursor-pointer transition-all text-xs"
                        style={formData.tag_ids.includes(tag.id) ? getTagStyle(tag.color) : {}}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <div 
                          className="w-2 h-2 rounded-full mr-1" 
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Créé par (si tâche existante) */}
                {task && task.createdAt && (
                  <>
                    <Separator />
                    <div className="text-xs text-gray-500">
                      <div className="font-medium mb-1">Créé par</div>
                      <div>Utilisateur</div>
                      <div>{formatDate(task.createdAt)}</div>
                    </div>
                  </>
                )}
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}