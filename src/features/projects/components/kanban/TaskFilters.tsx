'use client';

import React from 'react';
import { TaskFilters as FilterType, TaskPriority } from '../../types/kanban';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, X, Plus } from 'lucide-react';

interface TaskFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  availableTags: string[];
}

export function TaskFilters({ filters, onFiltersChange, availableTags }: TaskFiltersProps) {
  const updateFilters = (updates: Partial<FilterType>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priority: undefined,
      assignee: undefined,
      tags: [],
      hasTimer: false,
      overdue: false
    });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const hasActiveFilters = filters.search || filters.priority || filters.assignee || 
                          filters.tags.length > 0 || filters.hasTimer || filters.overdue;

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <Input
          placeholder="Rechercher des tâches..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
        />
      </div>

      {/* Priority Filter */}
      <Select
        value={filters.priority || ''}
        onValueChange={(value: TaskPriority | '') => 
          updateFilters({ priority: value || undefined })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Toutes</SelectItem>
          <SelectItem value="low">Faible</SelectItem>
          <SelectItem value="medium">Moyenne</SelectItem>
          <SelectItem value="high">Haute</SelectItem>
          <SelectItem value="urgent">Urgente</SelectItem>
        </SelectContent>
      </Select>

      {/* Tags Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Tags
            {filters.tags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filters.tags.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <div className="space-y-3 p-3">
            <h4 className="font-medium text-sm">Filtrer par tags</h4>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={filters.tags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  {filters.tags.includes(tag) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Quick Filters */}
      <div className="flex gap-2">
        <Button
          variant={filters.hasTimer ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ hasTimer: !filters.hasTimer })}
        >
          Timer actif
        </Button>
        <Button
          variant={filters.overdue ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateFilters({ overdue: !filters.overdue })}
        >
          En retard
        </Button>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="w-4 h-4 mr-1" />
          Effacer
        </Button>
      )}

      {/* Add Task Button */}
      <Button className="ml-auto">
        <Plus className="w-4 h-4 mr-1" />
        Nouvelle tâche
      </Button>
    </div>
  );
}