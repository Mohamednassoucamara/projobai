-- Migration 007 : corriger la récursion infinie jobs <-> applications (migration 006)
-- Les politiques RLS ne doivent pas faire de sous-requête croisée entre tables liées.
-- On utilise des fonctions SECURITY DEFINER pour évaluer l'accès sans re-déclencher le RLS.

-- =====================================================
-- Fonctions helper (bypass RLS, search_path fixe)
-- =====================================================
CREATE OR REPLACE FUNCTION public.candidate_applied_to_job(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    WHERE a.job_id = p_job_id
      AND a.candidate_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.job_owned_by_company(p_job_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = p_job_id
      AND j.company_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.candidate_applied_to_job(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.job_owned_by_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_applied_to_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.job_owned_by_company(uuid) TO authenticated;

-- =====================================================
-- jobs : candidats ayant postulé (remplace politique 006)
-- =====================================================
DROP POLICY IF EXISTS "Candidates can view jobs they applied to" ON jobs;
CREATE POLICY "Candidates can view jobs they applied to"
  ON jobs FOR SELECT
  TO authenticated
  USING (public.candidate_applied_to_job(id));

-- =====================================================
-- applications : entreprises (évite sous-requête directe sur jobs)
-- =====================================================
DROP POLICY IF EXISTS "Companies can view applications to their jobs" ON applications;
CREATE POLICY "Companies can view applications to their jobs"
  ON applications FOR SELECT
  TO authenticated
  USING (public.job_owned_by_company(job_id));

DROP POLICY IF EXISTS "Companies can update applications to their jobs" ON applications;
CREATE POLICY "Companies can update applications to their jobs"
  ON applications FOR UPDATE
  TO authenticated
  USING (public.job_owned_by_company(job_id));
