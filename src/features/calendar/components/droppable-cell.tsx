"use client"

import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"

interface DroppableCellProps {
  id: string
  date: Date
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function DroppableCell({
  id,
  date,
  onClick,
  children,
  className,
}: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      date,
      type: "cell",
    },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full p-1 transition-colors",
        isOver && "bg-primary/10",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}