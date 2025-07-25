'use client'

import React from 'react'
import { EmojiReaction } from '../../types/kanban'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ReactionBarProps {
  reactions: EmojiReaction[]
  onReactionClick?: (emoji: string) => void
}

export function ReactionBar({ reactions, onReactionClick }: ReactionBarProps) {
  if (reactions.length === 0) return null

  const formatUsersList = (users: EmojiReaction['users']) => {
    if (users.length === 0) return ''
    if (users.length === 1) {
      return `${users[0].firstName} ${users[0].lastName}`
    }
    if (users.length === 2) {
      return `${users[0].firstName} ${users[0].lastName} et ${users[1].firstName} ${users[1].lastName}`
    }
    const others = users.length - 2
    return `${users[0].firstName} ${users[0].lastName}, ${users[1].firstName} ${users[1].lastName} et ${others} autre${others > 1 ? 's' : ''}`
  }

  return (
    <div className="flex items-center gap-1 mt-2 mb-1">
      <TooltipProvider>
        {reactions.map((reaction) => (
          <Tooltip key={reaction.emoji}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 px-2 py-1 text-xs rounded-full border transition-colors ${
                  reaction.hasUserReacted
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => onReactionClick?.(reaction.emoji)}
              >
                <span className="mr-1 text-sm">{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">
                {formatUsersList(reaction.users)} {reaction.count === 1 ? 'a réagi' : 'ont réagi'} avec {reaction.emoji}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  )
}