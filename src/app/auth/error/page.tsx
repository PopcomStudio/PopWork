'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { XCircle } from 'lucide-react'

export default function AuthErrorPage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger automatiquement après 5 secondes
    const timeout = setTimeout(() => {
      router.push('/auth/signin')
    }, 5000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Erreur d'authentification</CardTitle>
          <CardDescription>
            Une erreur s'est produite lors de votre connexion. Veuillez réessayer.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Vous serez redirigé vers la page de connexion dans 5 secondes...
          </p>
          <Button 
            className="w-full" 
            onClick={() => router.push('/auth/signin')}
          >
            Retour à la connexion
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}