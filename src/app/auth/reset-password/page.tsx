'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    // Vérifier les erreurs dans l'URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const errorCode = hashParams.get('error_code')
    const errorDescription = hashParams.get('error_description')

    if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
      toast.error('Le lien de réinitialisation a expiré')
      setTimeout(() => {
        router.push('/auth/forgot-password')
      }, 2000)
      return
    }

    // Vérifier que l'utilisateur vient bien d'un lien de réinitialisation
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Lien de réinitialisation invalide ou expiré')
        setTimeout(() => {
          router.push('/auth/forgot-password')
        }, 2000)
        return
      }

      setIsReady(true)
    }

    // Écouter l'événement PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsReady(true)
        }
      }
    )

    checkAuthState()

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      })

      if (updateError) {
        setError(updateError.message)
        return
      }

      setSuccess(true)
      toast.success('Mot de passe mis à jour avec succès!')

      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch {
      setError('Une erreur est survenue lors de la réinitialisation du mot de passe')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Mot de passe modifié</CardTitle>
            <CardDescription>
              Votre mot de passe a été mis à jour avec succès
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground">
              Redirection vers le dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>
            Choisissez un nouveau mot de passe sécurisé
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Réinitialisation...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Réinitialiser le mot de passe
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
