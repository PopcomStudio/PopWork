-- Migration pour la gestion des fichiers de projets
-- Date: 2025-01-24

-- Table pour stocker les métadonnées des fichiers
CREATE TABLE IF NOT EXISTS project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- taille en octets
  file_type TEXT NOT NULL, -- MIME type
  storage_path TEXT NOT NULL, -- chemin dans le bucket Supabase Storage
  uploaded_by UUID NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_task_id ON project_files(task_id);
CREATE INDEX IF NOT EXISTS idx_project_files_uploaded_by ON project_files(uploaded_by);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_project_files_updated_at();

-- RLS (Row Level Security) policies
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Politique pour lire les fichiers : utilisateurs authentifiés
CREATE POLICY "Users can view project files"
  ON project_files FOR SELECT
  TO authenticated
  USING (true);

-- Politique pour uploader des fichiers : utilisateurs authentifiés
CREATE POLICY "Users can upload project files"
  ON project_files FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Politique pour modifier les fichiers : seulement le propriétaire
CREATE POLICY "Users can update their own files"
  ON project_files FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Politique pour supprimer les fichiers : seulement le propriétaire
CREATE POLICY "Users can delete their own files"
  ON project_files FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Configuration du bucket de storage (à exécuter dans Supabase Dashboard ou via code)
-- Le bucket 'project-files' doit être créé avec les paramètres suivants:
-- - Public: false
-- - File size limit: 50MB
-- - Allowed MIME types: tous
