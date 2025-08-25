import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClientComponentClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, role_id, team_id } = await request.json()

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Non autorisé - Token manquant' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClientComponentClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé - Token invalide' },
        { status: 401 }
      )
    }

    // Créer le client admin Supabase
    const adminClient = createAdminClient()

    console.log('Création invitation pour:', { email, role_id, team_id })

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Envoyer l'invitation via l'API native Supabase
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register`,
      data: {
        role_id,
        team_id,
        invited_by: user.id,
        email: email  // Passer l'email dans les métadonnées
      }
    })

    if (inviteError) {
      console.error('Erreur Supabase inviteUserByEmail:', inviteError)
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'invitation', details: inviteError.message },
        { status: 500 }
      )
    }

    console.log('Invitation Supabase envoyée avec succès:', inviteData)

    return NextResponse.json({
      success: true,
      message: 'Invitation créée avec succès',
      emailSent: true,
      data: {
        email: email,
        user: inviteData.user
      }
    })

  } catch (error) {
    console.error('Erreur API invite-user:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}