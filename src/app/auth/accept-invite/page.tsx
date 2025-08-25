"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { createClientComponentClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icons } from "@/components/ui/icons"
import { Loader2, Shield } from "lucide-react"

const acceptInviteSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
})

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>

interface InvitationData {
  id: string
  email: string
  role_id: string
  team_id: string | null
  token: string
  expires_at: string
  accepted_at: string | null
  role?: {
    name: string
    permissions: string[]
  }
}

function AcceptInviteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
  })
  
  // Valider le token et récupérer l'invitation
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Token d'invitation manquant")
        setLoading(false)
        return
      }
      
      try {
        // Récupérer l'invitation
        const { data: invitationData, error: inviteError } = await supabase
          .from("user_invitations")
          .select(`
            *,
            role:roles(name, permissions)
          `)
          .eq("token", token)
          .single()
        
        if (inviteError || !invitationData) {
          setError("Invitation invalide ou expirée")
          setLoading(false)
          return
        }
        
        // Vérifier si l'invitation n'est pas déjà acceptée
        if (invitationData.accepted_at) {
          setError("Cette invitation a déjà été utilisée")
          setLoading(false)
          return
        }
        
        // Vérifier si l'invitation n'est pas expirée
        if (new Date(invitationData.expires_at) < new Date()) {
          setError("Cette invitation a expiré")
          setLoading(false)
          return
        }
        
        setInvitation(invitationData)
        setLoading(false)
      } catch {
        setError("Erreur lors de la validation de l'invitation")
        setLoading(false)
      }
    }
    
    validateToken()
  }, [token, supabase])
  
  // Accepter l'invitation et créer le compte
  const acceptInvitation = async (data: AcceptInviteFormData) => {
    if (!invitation) return
    
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Créer le compte utilisateur
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            role_id: invitation.role_id,
          },
        },
      })
      
      if (authError) throw authError
      
      if (!authData.user) {
        throw new Error("Erreur lors de la création du compte")
      }
      
      // Marquer l'invitation comme acceptée
      const { error: updateError } = await supabase
        .from("user_invitations")
        .update({
          accepted_at: new Date().toISOString(),
        })
        .eq("id", invitation.id)
      
      if (updateError) throw updateError
      
      // Créer le profil utilisateur (sans team_id)
      const { error: profileError } = await supabase
        .from("users")
        .insert({
          id: authData.user.id,
          email: invitation.email,
          first_name: data.firstName,
          last_name: data.lastName,
          role_id: invitation.role_id,
        })
      
      if (profileError) {
        // Si le profil existe déjà, le mettre à jour
        const { error: updateProfileError } = await supabase
          .from("users")
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            role_id: invitation.role_id,
          })
          .eq("id", authData.user.id)
        
        if (updateProfileError) throw updateProfileError
      }

      // Si un team_id est fourni, ajouter l'utilisateur à l'équipe
      if (invitation.team_id) {
        const { error: teamError } = await supabase
          .from("team_members")
          .insert({
            team_id: invitation.team_id,
            user_id: authData.user.id,
            role: "member"
          })
        
        if (teamError) {
          console.error("Erreur ajout équipe:", teamError)
          // Ne pas faire échouer l'inscription si l'ajout à l'équipe échoue
        }
      }
      
      setSuccess("Compte créé avec succès ! Vous allez être redirigé vers la page de connexion...")
      
      // Rediriger vers la page de connexion
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err) {
      console.error("Erreur:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Validation de l'invitation...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="p-3 rounded-full bg-destructive/10 mb-4">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold">Invitation invalide</h1>
            </div>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => router.push("/login")}
            >
              Retour à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form onSubmit={handleSubmit(acceptInvitation)} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Bienvenue chez PopWork</h1>
                    <p className="text-muted-foreground text-balance">
                      Vous avez été invité à rejoindre l'équipe en tant que <strong>{invitation?.role?.name}</strong>
                    </p>
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

                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={invitation?.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-3">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        placeholder="Jean"
                        {...register("firstName")}
                        disabled={submitting}
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
                        disabled={submitting}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={submitting}
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
                      disabled={submitting}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Créer mon compte
                  </Button>

                  <div className="text-center text-sm">
                    Vous avez déjà un compte ?{" "}
                    <a
                      href="/login"
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Se connecter
                    </a>
                  </div>
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
              Conditions d'utilisation
            </a>{" "}
            et notre{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Politique de confidentialité
            </a>.
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}