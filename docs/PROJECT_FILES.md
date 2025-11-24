# Système de Gestion de Fichiers - Documentation

## Vue d'ensemble

Le système de gestion de fichiers permet d'uploader, stocker, et gérer des fichiers liés aux projets. Les fichiers peuvent également être assignés à des tâches spécifiques pour une meilleure organisation.

## Fonctionnalités

### ✅ Upload de fichiers
- Drag & drop ou sélection manuelle
- Upload multiple
- Limite de taille : 50 MB par fichier
- Tous types de fichiers acceptés

### ✅ Gestion des fichiers
- Visualisation avec icônes selon le type (image, PDF, vidéo, etc.)
- Téléchargement de fichiers
- Suppression de fichiers (seulement par l'uploader)
- Édition de description
- Assignation à une tâche

### ✅ Filtrage et recherche
- Filtrer par tâche
- Voir les fichiers non assignés
- Voir tous les fichiers du projet

### ✅ Métadonnées
- Nom du fichier
- Taille formatée
- Type MIME
- Date d'upload
- Uploader (nom et prénom)
- Tâche associée (si assigné)
- Description optionnelle

## Architecture Technique

### Base de données

**Table `project_files`**
```sql
- id (UUID, PK)
- project_id (UUID, FK → projects)
- task_id (UUID, FK → tasks, nullable)
- file_name (TEXT)
- file_size (BIGINT)
- file_type (TEXT)
- storage_path (TEXT)
- uploaded_by (UUID, FK → users)
- description (TEXT, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Politiques RLS**
- Les utilisateurs authentifiés peuvent voir tous les fichiers
- Seulement l'uploader peut modifier ou supprimer ses fichiers
- Tout utilisateur authentifié peut uploader des fichiers

### Supabase Storage

**Bucket : `project-files`**
- Type : Privé (non public)
- Limite de taille : 50 MB par fichier
- Structure : `{project_id}/{unique_filename}.{ext}`

### Composants React

1. **`useProjectFiles`** (Hook)
   - Gestion de l'état des fichiers
   - CRUD operations
   - Upload vers Storage + DB
   - Download avec création de blob

2. **`ProjectFilesManager`** (Composant)
   - Interface utilisateur complète
   - Upload drag & drop
   - Liste des fichiers avec cartes
   - Dialogs d'édition et suppression
   - Filtrage par tâche

3. **`FileUploader`** (Composant réutilisable)
   - Zone de drag & drop
   - Validation des fichiers
   - Feedback visuel pendant l'upload

## Configuration

### 1. Créer la table dans Supabase

Exécutez la migration SQL :
```bash
# Via Supabase CLI
supabase db push

# Ou manuellement dans le SQL Editor du dashboard
# Fichier: supabase/migrations/20250124_project_files.sql
```

### 2. Créer le bucket Storage

**Option A : Via le Dashboard Supabase**
1. Aller dans Storage
2. Créer un nouveau bucket nommé `project-files`
3. Décocher "Public bucket"
4. Définir la limite à 52428800 bytes (50 MB)

**Option B : Via le MCP Supabase**
```typescript
// Utiliser le MCP Supabase pour créer le bucket
// ou suivre les instructions dans scripts/setup-storage-bucket.md
```

### 3. Configurer les politiques Storage

Dans Storage > Policies, ajouter :

```sql
-- Upload
CREATE POLICY "Users can upload to project-files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files' AND auth.uid() = owner);

-- Read
CREATE POLICY "Users can view project-files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');

-- Delete
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files' AND auth.uid() = owner);
```

## Utilisation

### Dans l'interface

1. Aller sur un projet
2. Cliquer sur l'onglet **"Fichiers"**
3. Uploader des fichiers via drag & drop ou bouton
4. Cliquer sur un fichier pour :
   - ✏️ Éditer : Ajouter description ou assigner à une tâche
   - ⬇️ Télécharger : Download le fichier
   - 🗑️ Supprimer : Supprimer le fichier (seulement si vous l'avez uploadé)

### Filtrage

Utilisez le sélecteur "Filtrer par tâche" pour :
- Voir tous les fichiers
- Voir seulement les non-assignés
- Voir les fichiers d'une tâche spécifique

## Exemples de code

### Upload programmatique

```typescript
import { useProjectFiles } from '@/features/projects/hooks/use-project-files'

function MyComponent({ projectId }) {
  const { uploadFile } = useProjectFiles(projectId)

  const handleUpload = async (file: File) => {
    await uploadFile({
      file,
      project_id: projectId,
      task_id: 'optional-task-id',
      description: 'Mon fichier important'
    })
  }
}
```

### Assigner à une tâche

```typescript
const { updateFile } = useProjectFiles(projectId)

await updateFile(fileId, {
  task_id: taskId,
  description: 'Mise à jour'
})
```

## Limites et bonnes pratiques

### Limites
- **Taille max** : 50 MB par fichier
- **Types** : Tous types acceptés
- **Suppression** : Seulement par l'uploader

### Bonnes pratiques
- Ajouter des descriptions aux fichiers importants
- Assigner les fichiers aux tâches pertinentes
- Utiliser des noms de fichiers descriptifs
- Nettoyer régulièrement les fichiers obsolètes

## Sécurité

- ✅ Row Level Security (RLS) activé
- ✅ Bucket privé (pas d'accès public)
- ✅ Authentification requise
- ✅ Validation côté serveur
- ✅ Permissions granulaires (propriétaire uniquement pour suppression)

## Maintenance

### Nettoyage des fichiers orphelins

Si des fichiers restent dans Storage après suppression de la DB :

```sql
-- Trouver les fichiers orphelins
SELECT storage_path
FROM project_files
WHERE project_id NOT IN (SELECT id FROM projects);

-- Les supprimer via le dashboard Storage
```

### Statistiques d'utilisation

```sql
-- Taille totale par projet
SELECT
  p.name,
  COUNT(pf.id) as file_count,
  SUM(pf.file_size) / 1024 / 1024 as total_mb
FROM projects p
LEFT JOIN project_files pf ON p.id = pf.project_id
GROUP BY p.id, p.name
ORDER BY total_mb DESC;
```

## Dépannage

### Le bucket n'existe pas
**Erreur** : `Bucket not found`
**Solution** : Créer le bucket `project-files` dans Storage

### Erreur d'upload
**Erreur** : `Permission denied`
**Solution** : Vérifier les politiques RLS du bucket

### Fichier trop volumineux
**Erreur** : `File too large`
**Solution** : Réduire la taille ou augmenter la limite du bucket

## Migration depuis un système existant

Si vous avez déjà des fichiers ailleurs :

1. Créer les entrées DB avec `INSERT INTO project_files`
2. Uploader les fichiers vers le bucket avec le bon `storage_path`
3. Vérifier que les permissions correspondent

## Évolutions futures

- [ ] Prévisualisation d'images intégrée
- [ ] Édition de fichiers PDF
- [ ] Versioning des fichiers
- [ ] Dossiers/catégories
- [ ] Recherche full-text dans les fichiers
- [ ] Partage de fichiers avec liens externes
