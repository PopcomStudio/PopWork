"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  UserPlus, 
  UserMinus, 
  FolderPlus, 
  FolderEdit,
  Settings,
  MessageSquare
} from "lucide-react";
import { useState, useEffect } from "react";

interface TeamActivityProps {
  teamId: string;
}

interface ActivityItem {
  id: string;
  type: 'member_added' | 'member_removed' | 'project_created' | 'project_updated' | 'settings_changed' | 'comment';
  description: string;
  user: {
    name: string;
    avatar?: string;
  };
  timestamp: string;
}

export function TeamActivity({ teamId }: TeamActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching activities
    setTimeout(() => {
      setActivities([
        {
          id: '1',
          type: 'member_added',
          description: 'a ajouté Marie Dupont à l&apos;équipe',
          user: { name: 'Jean Martin', avatar: '/avatars/jean.jpg' },
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'project_created',
          description: 'a créé le projet "Refonte Site Web"',
          user: { name: 'Sophie Bernard', avatar: '/avatars/sophie.jpg' },
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'settings_changed',
          description: 'a modifié les paramètres de l&apos;équipe',
          user: { name: 'Pierre Durand' },
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [teamId]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'member_added':
        return <UserPlus className="h-4 w-4 text-green-600" />;
      case 'member_removed':
        return <UserMinus className="h-4 w-4 text-red-600" />;
      case 'project_created':
        return <FolderPlus className="h-4 w-4 text-blue-600" />;
      case 'project_updated':
        return <FolderEdit className="h-4 w-4 text-orange-600" />;
      case 'settings_changed':
        return <Settings className="h-4 w-4 text-gray-600" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-purple-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Il y a moins d&apos;une heure';
    } else if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Aucune activité récente</p>
          <p className="text-sm text-muted-foreground mt-1">
            L&apos;historique des activités de l&apos;équipe apparaîtra ici
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                {activity.user.avatar ? (
                  <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                ) : (
                  <AvatarFallback>
                    {activity.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getActivityIcon(activity.type)}
                  <p className="text-sm">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    <span className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: activity.description }} />
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span dangerouslySetInnerHTML={{ __html: formatTimestamp(activity.timestamp) }} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}