-- Configuration Supabase Storage pour ProJob AI
-- À exécuter après la création des tables principales

-- =====================================================
-- CRÉATION DES BUCKETS DE STOCKAGE
-- =====================================================

-- Bucket pour les avatars des utilisateurs
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les CV au format PDF
INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les logos d'entreprises
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket pour les documents de candidature
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POLITIQUES DE STOCKAGE (STORAGE POLICIES)
-- =====================================================

-- Politiques pour les avatars
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politiques pour les CV
CREATE POLICY "Users can view their own CVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Companies can view CVs from applications"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = auth.uid()
      AND a.cv_url LIKE '%' || name
    )
  );

CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own CVs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own CVs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politiques pour les logos d'entreprises
CREATE POLICY "Company logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Companies can upload their own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Companies can update their own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Companies can delete their own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Politiques pour les documents de candidature
CREATE POLICY "Users can view their own application documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Companies can view application documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-documents' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = auth.uid()
      AND (
        a.cv_url LIKE '%' || name OR
        a.cover_letter LIKE '%' || name
      )
    )
  );

CREATE POLICY "Users can upload application documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their application documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their application documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
