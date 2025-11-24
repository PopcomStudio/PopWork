"use client"

import { useState } from 'react'
import { FileText, Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectQuotes } from '../../hooks/use-project-quotes'
import type { QuoteStatus } from '@/shared/types/database'

interface ProjectQuotesProps {
  projectId: string
}

export function ProjectQuotes({ projectId }: ProjectQuotesProps) {
  const { quotes, loading, error } = useProjectQuotes(projectId)

  const getStatusBadge = (status: QuoteStatus) => {
    const variants: Record<QuoteStatus, { label: string; className: string }> = {
      draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
      submitted: { label: 'Soumis', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Accepté', className: 'bg-green-100 text-green-800' },
      rejected: { label: 'Refusé', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expiré', className: 'bg-gray-100 text-gray-700' },
    }

    return variants[status]
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Devis ({quotes.length})
        </CardTitle>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau devis
        </Button>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun devis pour ce projet</p>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier devis
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => {
              const statusInfo = getStatusBadge(quote.status)
              return (
                <div
                  key={quote.id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{quote.quote_number}</h3>
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Client: </span>
                          {quote.customer_name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date: </span>
                          {new Date(quote.quote_date).toLocaleDateString('fr-FR')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Montant: </span>
                          <span className="font-semibold">
                            {quote.total_including_tax.toLocaleString('fr-FR')} € TTC
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
