import { createServerComponentClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = await createServerComponentClient(cookieStore)
    
    // Échanger le code pour une session
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Erreur lors de l\'échange du code:', error)
      return NextResponse.redirect(new URL('/auth/error', requestUrl.origin))
    }

    if (session?.user) {
      // Si c'est une nouvelle invitation, créer le profil utilisateur
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existingProfile) {
        // Créer le profil utilisateur avec les métadonnées de l'invitation
        const metadata = session.user.user_metadata || {}
        
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email!,
            first_name: metadata.first_name || session.user.email?.split('@')[0] || '',
            last_name: metadata.last_name || '',
            role_id: metadata.role_id || null
          })

        if (profileError) {
          console.error('Erreur création profil:', profileError)
          // Continuer même si le profil n'est pas créé, il sera créé plus tard
        }

        // Si un team_id était fourni, ajouter l'utilisateur à l'équipe
        if (metadata.team_id) {
          await supabase
            .from('team_members')
            .insert({
              team_id: metadata.team_id,
              user_id: session.user.id,
              role: 'member'
            })
        }

        // Marquer l'invitation comme acceptée
        if (metadata.invitation_token) {
          await supabase
            .from('user_invitations')
            .update({ accepted_at: new Date().toISOString() })
            .eq('token', metadata.invitation_token)
        }
      }
    }

    // Rediriger vers la page demandée ou le dashboard
    return NextResponse.redirect(new URL(next, requestUrl.origin))
  }

  // Si pas de code, rediriger vers la page de connexion
  return NextResponse.redirect(new URL('/auth/signin', requestUrl.origin))
}