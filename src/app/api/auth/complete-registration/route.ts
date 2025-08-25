import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      roleId, 
      teamId 
    } = await request.json()

    console.log('🚀 API complete-registration called with:', { 
      email, 
      firstName, 
      lastName, 
      roleId, 
      teamId 
    })

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Données manquantes - email, password, firstName et lastName requis' },
        { status: 400 }
      )
    }

    // Créer le client admin Supabase
    const adminClient = createAdminClient()

    let finalUser
    
    // Essayer de créer l'utilisateur d'abord
    console.log('🔄 Tentative de création utilisateur...')
    const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        role_id: roleId,
      },
      email_confirm: true
    })
    
    if (signUpError) {
      // Si l'erreur est "email_exists", c'est qu'un utilisateur invité existe déjà
      if (signUpError.message?.includes('email_exists') || signUpError.message?.includes('already been registered')) {
        console.log('🔍 Email existe déjà, tentative de mise à jour directe par email...')
        
        // Nouvelle approche: utiliser getUserByEmail via une requête SQL directe
        // car listUsers() échoue avec des erreurs de base de données
        try {
          console.log('🔍 Tentative de récupération utilisateur par requête SQL...')
          
          // Utiliser une requête SQL pour trouver l'utilisateur dans auth.users
          const { data: sqlResult, error: sqlError } = await adminClient
            .rpc('get_user_by_email', { user_email: email })
          
          if (sqlError || !sqlResult || sqlResult.length === 0) {
            console.warn('⚠️ Requête SQL échouée ou utilisateur introuvable, essai via updateUserById avec ID généré...')
            
            // Dernière tentative: essayer de mettre à jour avec un ID généré à partir de l'email
            // Cette approche fonctionne parfois avec les utilisateurs invités de Supabase
            try {
              // Générer un UUID déterministe basé sur l'email pour les utilisateurs invités
              const crypto = require('crypto')
              const hash = crypto.createHash('sha256').update(email).digest('hex')
              const possibleUserId = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`
              
              console.log('🎯 Tentative mise à jour avec ID généré:', possibleUserId)
              
              const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
                possibleUserId,
                {
                  password,
                  user_metadata: {
                    first_name: firstName,
                    last_name: lastName,
                    role_id: roleId,
                  },
                  email_confirm: true
                }
              )
              
              if (updateError) {
                console.error('❌ Erreur mise à jour avec ID généré:', updateError)
                // Si ça ne marche pas non plus, on abandonne
                return NextResponse.json(
                  { error: 'Impossible de mettre à jour le compte invité', details: updateError.message },
                  { status: 500 }
                )
              }
              
              finalUser = updateData.user
              console.log('✅ Utilisateur mis à jour avec ID généré:', finalUser?.id)
              
            } catch (idError) {
              console.error('❌ Erreur avec approche ID généré:', idError)
              return NextResponse.json(
                { error: 'Impossible de finaliser l\'inscription du compte invité' },
                { status: 500 }
              )
            }
          } else {
            // Utilisateur trouvé via SQL
            const userId = sqlResult[0]?.id || sqlResult?.id
            console.log('✅ Utilisateur trouvé via SQL, mise à jour...', userId)
            
            const { data: updateData, error: updateError } = await adminClient.auth.admin.updateUserById(
              userId,
              {
                password,
                user_metadata: {
                  first_name: firstName,
                  last_name: lastName,
                  role_id: roleId,
                },
                email_confirm: true
              }
            )
            
            if (updateError) {
              console.error('❌ Erreur mise à jour utilisateur SQL:', updateError)
              return NextResponse.json(
                { error: 'Erreur lors de la mise à jour du compte', details: updateError.message },
                { status: 500 }
              )
            }
            
            finalUser = updateData.user
            console.log('✅ Utilisateur mis à jour avec succès:', finalUser?.id)
          }
        } catch (globalError) {
          console.error('❌ Erreur globale lors de la recherche utilisateur:', globalError)
          return NextResponse.json(
            { error: 'Erreur lors de la recherche du compte invité', details: globalError.message },
            { status: 500 }
          )
        }
      } else {
        // Autre erreur de création
        console.error('❌ Erreur création utilisateur:', signUpError)
        return NextResponse.json(
          { error: 'Erreur lors de la création du compte', details: signUpError?.message },
          { status: 500 }
        )
      }
    } else {
      // Création réussie (utilisateur pas encore invité)
      finalUser = signUpData.user
      console.log('✅ Utilisateur créé avec succès:', finalUser?.id)
    }

    // Insérer/mettre à jour l'utilisateur dans la table users
    const { error: insertUserError } = await adminClient
      .from('users')
      .upsert({
        id: finalUser!.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role_id: roleId
      }, {
        onConflict: 'id'
      })

    if (insertUserError) {
      console.error('❌ Erreur insertion utilisateur dans table users:', insertUserError)
      // Ne pas faire échouer complètement si c'est juste une erreur de doublon
      if (insertUserError.code !== '23505') {
        return NextResponse.json(
          { error: 'Erreur lors de la création du profil utilisateur', details: insertUserError.message },
          { status: 500 }
        )
      }
    } else {
      console.log('✅ Utilisateur inséré dans table users')
    }

    // Si une équipe est spécifiée, ajouter l'utilisateur à l'équipe
    if (teamId) {
      const { error: teamError } = await adminClient
        .from('team_members')
        .upsert({
          user_id: finalUser!.id,
          team_id: teamId,
          role: 'member'
        }, {
          onConflict: 'user_id,team_id'
        })

      if (teamError) {
        console.error('❌ Erreur ajout équipe:', teamError)
        // Ne pas faire échouer si c'est juste une erreur de doublon
        if (teamError.code !== '23505') {
          console.warn('⚠️ Utilisateur créé mais pas ajouté à l\'équipe:', teamError.message)
        }
      } else {
        console.log('✅ Utilisateur ajouté à l\'équipe')
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inscription complétée avec succès',
      user: {
        id: finalUser!.id,
        email: email,
        firstName,
        lastName
      }
    })

  } catch (error) {
    console.error('💥 Erreur API complete-registration:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}