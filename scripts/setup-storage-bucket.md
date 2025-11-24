# Configuration du bucket Supabase Storage

Pour que le système de gestion de fichiers fonctionne, vous devez créer un bucket dans Supabase Storage.

## Étapes dans le Dashboard Supabase

1. **Aller dans Storage** : Naviguez vers la section "Storage" dans le menu latéral de votre projet Supabase

2. **Créer un nouveau bucket** :
   - Cliquez sur "New Bucket"
   - Nom du bucket : `project-files`
   - Public bucket : **NON** (décoché)
   - File size limit : `52428800` (50 MB)
   - Allowed MIME types : laissez vide pour accepter tous les types

3. **Cliquer sur "Create bucket"**

## Configuration des politiques RLS (Row Level Security) pour Storage

Les politiques RLS sont déjà définies pour la table `project_files`, mais vous devez aussi ajouter des politiques pour le bucket Storage.

Allez dans **Storage > Policies** et créez les politiques suivantes pour le bucket `project-files` :

### Politique 1 : Upload de fichiers (INSERT)
```sql
CREATE POLICY "Users can upload files to project-files bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' AND
  auth.uid() = owner
);
```

### Politique 2 : Lecture de fichiers (SELECT)
```sql
CREATE POLICY "Users can view files in project-files bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');
```

### Politique 3 : Suppression de fichiers (DELETE)
```sql
CREATE POLICY "Users can delete their own files in project-files bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' AND
  auth.uid() = owner
);
```

## Via code (optionnel)

Si vous préférez créer le bucket via code, vous pouvez utiliser le service_role_key :

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Attention : côté serveur seulement
)

async function setupBucket() {
  const { data, error } = await supabase.storage.createBucket('project-files', {
    public: false,
    fileSizeLimit: 52428800, // 50 MB
  })

  if (error) {
    console.error('Erreur création bucket:', error)
  } else {
    console.log('Bucket créé avec succès!')
  }
}
```

## Vérification

Une fois le bucket créé, vous pouvez :
1. Aller sur un projet dans votre application
2. Cliquer sur l'onglet "Fichiers"
3. Uploader un fichier de test
4. Vérifier que le fichier apparaît dans Storage > project-files dans le dashboard Supabase
