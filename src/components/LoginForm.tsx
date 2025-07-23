"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

const loginFormSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginFormSchema>

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (signInError) {
        throw new Error(signInError.message)
      }

      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion Google")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Bienvenue sur PopWork</h1>
                <p className="text-muted-foreground text-balance">
                  Connectez-vous à votre espace de travail collaboratif
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Mot de passe</Label>
                  <button
                    type="button"
                    className="ml-auto text-sm underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                    onClick={() => {
                      // TODO: Implémenter reset password
                      setError("Fonctionnalité de récupération bientôt disponible")
                    }}
                    aria-label="Récupérer le mot de passe oublié"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Se connecter
              </Button>

              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  Ou continuer avec
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Button 
                  variant="outline" 
                  type="button" 
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  Se connecter avec Google
                </Button>
              </div>

              <div className="text-center text-sm">
                Pas encore de compte ?{" "}
                <a
                  href="/register"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Créer un compte
                </a>
              </div>
            </div>
          </form>
          <div className="bg-muted relative hidden md:block">
            <Image
              src="/login-image.jpg"
              alt="PopWork Dashboard Interface"
              fill
              className="object-cover"
              priority
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        En continuant, vous acceptez nos{" "}
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
