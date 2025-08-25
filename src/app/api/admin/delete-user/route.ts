import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'ID utilisateur manquant' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    console.log('🗑️ Suppression utilisateur avec fonction sécurisée:', userId)

    // Utiliser la fonction PostgreSQL personnalisée pour gérer les triggers
    console.log('🗑️ Appel de la fonction safe_delete_user...')
    const { data: deleteSuccess, error: deleteUserError } = await adminClient
      .rpc('safe_delete_user', { user_id_param: userId })

    if (deleteUserError) {
      console.error('❌ Erreur fonction safe_delete_user:', deleteUserError)
      return NextResponse.json(
        { error: 'Erreur lors de la suppression de l\'utilisateur', details: deleteUserError.message },
        { status: 500 }
      )
    }

    if (!deleteSuccess) {
      console.error('❌ Fonction safe_delete_user a retourné false')
      return NextResponse.json(
        { error: 'Échec de la suppression de l\'utilisateur' },
        { status: 500 }
      )
    }

    console.log('✅ Utilisateur supprimé de la base de données')

    // Maintenant supprimer l'utilisateur de Supabase Auth
    console.log('🗑️ Suppression de Supabase Auth...')
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('❌ Erreur suppression Auth:', deleteAuthError)
      // Ne pas faire échouer complètement si l'utilisateur n'existe plus dans Auth
      if (!deleteAuthError.message?.includes('User not found')) {
        console.warn('⚠️ Utilisateur supprimé de la base mais pas de Auth - continuons...')
      }
    } else {
      console.log('✅ Utilisateur supprimé de Auth')
    }

    console.log('✅ Utilisateur et toutes ses données supprimés avec succès')

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    })

  } catch (error) {
    console.error('💥 Erreur API delete-user:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}