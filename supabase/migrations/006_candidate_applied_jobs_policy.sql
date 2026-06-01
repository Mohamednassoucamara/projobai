-- Migration 006 : candidats — voir les offres auxquelles ils ont postulé (dashboard Mes candidatures)
-- Utilise une fonction SECURITY DEFINER pour éviter la récursion RLS jobs <-> applications.
-- (Voir migration 007 si la politique avec sous-requête directe a déjà été appliquée.)

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

REVOKE ALL ON FUNCTION public.candidate_applied_to_job(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_applied_to_job(uuid) TO authenticated;

DROP POLICY IF EXISTS "Candidates can view jobs they applied to" ON jobs;
CREATE POLICY "Candidates can view jobs they applied to"
  ON jobs FOR SELECT
  TO authenticated
  USING (public.candidate_applied_to_job(id));
