'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClientComponentClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClientComponentClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      )

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSuccess(true)
    } catch {
      setError('Une erreur est survenue lors de la demande de réinitialisation')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Email envoyé</CardTitle>
            <CardDescription>
              Vérifiez votre boîte de réception
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
            </p>
            <Button
              className="w-full"
              variant="outline"
              asChild
            >
              <Link href="/auth/signin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            Entrez votre email pour recevoir un lien de réinitialisation
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer le lien
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              asChild
            >
              <Link href="/auth/signin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la connexion
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
