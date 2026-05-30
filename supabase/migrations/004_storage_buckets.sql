-- Migration 004 : buckets Storage + politiques (candidatures, CV, avatars)
-- Idempotent : peut être exécutée via Supabase CLI (db push) ou SQL Editor

-- =====================================================
-- BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('cvs', 'cvs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- POLITIQUES STORAGE (storage.objects)
-- =====================================================

-- Avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- CVs (bucket cvs)
DROP POLICY IF EXISTS "Users can view their own CVs" ON storage.objects;
CREATE POLICY "Users can view their own CVs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Companies can view CVs from applications" ON storage.objects;
CREATE POLICY "Companies can view CVs from applications"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cvs' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = auth.uid()
        AND (a.cv_url = name OR a.cv_url LIKE '%' || name)
    )
  );

DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;
CREATE POLICY "Users can upload their own CVs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own CVs" ON storage.objects;
CREATE POLICY "Users can update their own CVs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own CVs" ON storage.objects;
CREATE POLICY "Users can delete their own CVs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cvs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Logos entreprise
DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
CREATE POLICY "Company logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Companies can upload their own logo" ON storage.objects;
CREATE POLICY "Companies can upload their own logo"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Companies can update their own logo" ON storage.objects;
CREATE POLICY "Companies can update their own logo"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Companies can delete their own logo" ON storage.objects;
CREATE POLICY "Companies can delete their own logo"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-logos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Documents de candidature (CV + lettre lors du postulé)
DROP POLICY IF EXISTS "Users can view their own application documents" ON storage.objects;
CREATE POLICY "Users can view their own application documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Companies can view application documents" ON storage.objects;
CREATE POLICY "Companies can view application documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'application-documents' AND
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = auth.uid()
        AND (a.cv_url = name OR a.cover_letter = name OR a.cv_url LIKE '%' || name OR a.cover_letter LIKE '%' || name)
    )
  );

DROP POLICY IF EXISTS "Users can upload application documents" ON storage.objects;
CREATE POLICY "Users can upload application documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their application documents" ON storage.objects;
CREATE POLICY "Users can update their application documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their application documents" ON storage.objects;
CREATE POLICY "Users can delete their application documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'application-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
