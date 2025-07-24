'use client';

import React, { useState, useEffect } from 'react';
import { TaskExtended, TaskStatus } from '../../types/kanban';
import { Task, Tag, User } from '@/shared/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  IconCalendar, 
  IconUser, 
  IconTag,
  IconFlag,
  IconMessage,
  IconPaperclip,
  IconSend,
  IconPlus
} from '@tabler/icons-react';
import { createClientComponentClient } from '@/lib/supabase';

interface TaskModalProps {
  task?: TaskExtended; // Optionnel pour gérer les cas où task peut être undefined
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<TaskExtended>) => void;
  projectId: string;
}

interface Comment {
  id: string;
  content: string;
  user_name: string;
  created_at: string;
}

export function TaskModal({ task, isOpen, onClose, onSave, projectId }: TaskModalProps) {
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient();

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
        .select('id, first_name, last_name, email, role_id, created_at, updated_at');

      if (usersError) throw usersError;
      
      // Transformer les données pour correspondre au type User
      const transformedUsers: User[] = (usersData || []).map(user => ({
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email,
        roleId: user.role_id || '',
        createdAt: user.created_at || new Date().toISOString(),
        updatedAt: user.updated_at || new Date().toISOString()
      }));
      
      setAvailableUsers(transformedUsers);

      // Charger les commentaires si on modifie une tâche existante
      if (task && task.id) {
        // TODO: Implémenter la récupération des commentaires
        setComments([
          {
            id: '1',
            content: 'Great progress on this task!',
            user_name: 'John Doe',
            created_at: new Date().toISOString()
          }
        ]);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-sauvegarde quand les données changent
  useEffect(() => {
    if (isOpen && task) {
      const timeoutId = setTimeout(() => {
        onSave({
          ...task,
          ...formData,
          dueDate: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
        });
      }, 500); // Délai de 500ms pour éviter trop de sauvegardes

      return () => clearTimeout(timeoutId);
    }
  }, [formData, isOpen, onSave, task]);

  const addComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        content: newComment.trim(),
        user_name: 'Current User', // TODO: Récupérer le vrai nom de l'utilisateur
        created_at: new Date().toISOString()
      };
      setComments([...comments, comment]);
      setNewComment('');
    }
  };

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
                        Discussion ({comments.length})
                      </TabsTrigger>
                      <TabsTrigger value="attachments" className="flex items-center gap-2">
                        <IconPaperclip className="h-4 w-4" />
                        Pièces jointes
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

                    <TabsContent value="discussion" className="mt-4">
                      <div className="space-y-4 h-80 overflow-y-auto">
                        {comments.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            Aucun commentaire pour le moment
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {comments.map((comment) => (
                              <div key={comment.id} className="flex gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {comment.user_name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{comment.user_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Ajouter un commentaire..."
                          onKeyDown={(e) => e.key === 'Enter' && addComment()}
                        />
                        <Button onClick={addComment} size="sm">
                          <IconSend className="h-4 w-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="attachments" className="mt-4">
                      <div className="text-center py-12">
                        <IconPaperclip className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Aucune pièce jointe</p>
                        <Button variant="outline">
                          <IconPlus className="h-4 w-4 mr-2" />
                          Ajouter des fichiers
                        </Button>
                      </div>
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
                  <div className="space-y-2">
                    {availableUsers.slice(0, 4).map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={formData.assignee_ids.includes(user.id)}
                          onChange={() => toggleAssignee(user.id)}
                          className="rounded"
                        />
                        <label htmlFor={`user-${user.id}`} className="text-sm flex items-center gap-2 cursor-pointer">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          {user.firstName} {user.lastName}
                        </label>
                      </div>
                    ))}
                  </div>
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