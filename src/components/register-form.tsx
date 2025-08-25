"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { supabase } from "@/lib/supabase"

const registerFormSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerFormSchema>

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<{
    email: string
    role_id?: string
    team_id?: string
    invited_by?: string
  } | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
  })

  // Cette page est exclusivement pour les invitations
  useEffect(() => {
    console.log('🚀 RegisterForm useEffect triggered')
    
    // Lire les paramètres depuis le hash (#) au lieu des query params (?)
    const hash = window.location.hash
    console.log('🔗 URL hash:', hash)
    
    if (!hash) {
      console.log('❌ Pas d\'invitation valide (pas de hash), redirection dans 3s...')
      setError("Accès non autorisé. L'inscription n'est possible que sur invitation.")
      setTimeout(() => {
        console.log('🔄 Redirection vers /login...')
        router.push('/login')
      }, 3000)
      return
    }

    // Parser les paramètres du hash
    const hashParams = new URLSearchParams(hash.substring(1)) // Enlever le # du début
    const accessToken = hashParams.get('access_token')
    const type = hashParams.get('type')
    
    console.log('📝 Access token:', accessToken ? 'Présent' : 'Absent')
    console.log('📝 Type:', type)
    
    if (!accessToken || type !== 'invite') {
      console.log('❌ Paramètres d\'invitation invalides, redirection dans 3s...')
      setError("Accès non autorisé. L'inscription n'est possible que sur invitation.")
      setTimeout(() => {
        console.log('🔄 Redirection vers /login...')
        router.push('/login')
      }, 3000)
      return
    }

    console.log('✅ Invitation détectée, traitement...')
    handleInvitationFromToken(accessToken)
  }, [router])

  const handleInvitationFromToken = async (accessToken: string) => {
    try {
      setIsLoading(true)
      
      console.log('🔧 Décodage du token d\'accès...')
      
      // Décoder le JWT pour extraire les métadonnées (sans vérification pour lecture seulement)
      const tokenParts = accessToken.split('.')
      if (tokenParts.length !== 3) {
        throw new Error('Token JWT invalide')
      }
      
      const payload = JSON.parse(atob(tokenParts[1]))
      console.log('📦 Payload JWT décodé:', payload)
      
      // Vérifier si l'utilisateur est déjà confirmé
      if (payload.email_verified) {
        console.log('✅ Utilisateur déjà confirmé, redirection dashboard')
        router.push('/dashboard')
        return
      }

      // Récupérer les métadonnées de l'invitation depuis le JWT
      const userMetadata = payload.user_metadata || {}
      console.log('📝 Métadonnées utilisateur:', userMetadata)
      
      const inviteData = {
        email: payload.email || userMetadata.email || '',
        role_id: userMetadata.role_id || null,
        team_id: userMetadata.team_id || null,
        invited_by: userMetadata.invited_by || null
      }
      
      console.log('🎯 Données d\'invitation finales:', inviteData)
      setInvitationData(inviteData)
      
      // Pré-remplir l'email si disponible
      if (inviteData.email) {
        console.log('📧 Pré-remplissage de l\'email:', inviteData.email)
        setValue('email', inviteData.email)
      }
    } catch (err) {
      console.error('💥 Erreur traitement invitation:', err)
      setError(err instanceof Error ? err.message : "Erreur lors du traitement de l'invitation")
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    if (!invitationData) {
      setError("Données d'invitation manquantes")
      setIsLoading(false)
      return
    }

    try {
      console.log('🚀 Envoi des données d\'inscription à l\'API...')
      
      // Appeler notre API server-side pour gérer l'inscription
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          roleId: invitationData.role_id,
          teamId: invitationData.team_id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'inscription')
      }

      console.log('✅ Inscription réussie:', result)
      
      // Maintenant se connecter avec les credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        console.error('❌ Erreur connexion après inscription:', signInError)
        setSuccess("Compte créé avec succès ! Veuillez vous reconnecter.")
        setTimeout(() => router.push("/login"), 2000)
      } else {
        console.log('✅ Connexion automatique réussie')
        router.push("/dashboard")
      }

    } catch (err) {
      console.error('💥 Erreur inscription:', err)
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  // Affichage si pas d'invitation valide
  if (!invitationData && !error) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card className="overflow-hidden p-0">
          <CardContent className="p-6 md:p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Icons.spinner className="h-8 w-8 animate-spin" />
              <p>Vérification de votre invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Accepter l'invitation</h1>
                <p className="text-muted-foreground text-balance">
                  Créez votre mot de passe pour rejoindre l'équipe
                </p>
                {invitationData?.email && (
                  <p className="text-sm text-green-600 mt-2">
                    Invitation pour : {invitationData.email}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    {...register("firstName")}
                    disabled={isLoading}
                  />
                  {errors.firstName && (
                    <p className="text-sm text-destructive">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="grid gap-3">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    {...register("lastName")}
                    disabled={isLoading}
                  />
                  {errors.lastName && (
                    <p className="text-sm text-destructive">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  {...register("email")}
                  disabled={true}
                  readOnly={true}
                  className="bg-muted"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="password">Mot de passe</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  {...register("password")}
                  disabled={isLoading}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Accepter l'invitation
              </Button>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/login-image.jpg"
              alt="PopWork Registration"
              fill
              className="object-cover"
              priority
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        En créant un compte, vous acceptez nos{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Conditions d&apos;utilisation
        </a>{" "}
        et notre{" "}
        <a href="#" className="underline underline-offset-4 hover:text-primary">
          Politique de confidentialité
        </a>.
      </div>
    </div>
  )
}