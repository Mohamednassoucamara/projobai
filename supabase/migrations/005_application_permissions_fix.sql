-- Migration 005 : corriger les permissions de candidature (storage + notifications + profils)

-- =====================================================
-- PROFILES : politique UPDATE complète
-- =====================================================
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- NOTIFICATIONS : permettre la création lors d'une candidature
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can create application notifications" ON notifications;
CREATE POLICY "Authenticated can create application notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    type = 'application'
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_id AND p.user_type = 'company'
    )
  );

-- Trigger serveur : notification entreprise à chaque candidature (contourne RLS côté client)
CREATE OR REPLACE FUNCTION notify_company_on_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_job_title TEXT;
  v_candidate_name TEXT;
BEGIN
  SELECT j.company_id, j.title
  INTO v_company_id, v_job_title
  FROM jobs j
  WHERE j.id = NEW.job_id;

  SELECT p.full_name
  INTO v_candidate_name
  FROM profiles p
  WHERE p.id = NEW.candidate_id;

  IF v_company_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      v_company_id,
      'application',
      'Nouvelle candidature',
      COALESCE(v_candidate_name, 'Un candidat') || ' a postulé pour le poste « ' || COALESCE(v_job_title, '') || ' ».',
      '/#mes-offres-publiees',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_created_notify_company ON applications;
CREATE TRIGGER on_application_created_notify_company
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_company_on_application();

-- =====================================================
-- STORAGE : chemins application-documents (userId/jobId/fichier)
-- split_part est plus fiable que storage.foldername pour les chemins imbriqués
-- =====================================================
DROP POLICY IF EXISTS "Users can upload application documents" ON storage.objects;
CREATE POLICY "Users can upload application documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'application-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own application documents" ON storage.objects;
CREATE POLICY "Users can view their own application documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their application documents" ON storage.objects;
CREATE POLICY "Users can update their application documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their application documents" ON storage.objects;
CREATE POLICY "Users can delete their application documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "Companies can view application documents" ON storage.objects;
CREATE POLICY "Companies can view application documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'application-documents'
    AND EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = auth.uid()
        AND (a.cv_url = name OR a.cover_letter = name)
    )
  );
