-- Migration 008 : entreprises peuvent voir les profils des candidats ayant postulé
-- Sans cela, la jointure profiles dans getApplications échoue (RLS) et aucune candidature n'apparaît.

CREATE OR REPLACE FUNCTION public.company_can_view_applicant_profile(p_candidate_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = p_candidate_id
      AND j.company_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.company_can_view_applicant_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_can_view_applicant_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS "Companies can view applicant profiles" ON profiles;
CREATE POLICY "Companies can view applicant profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.company_can_view_applicant_profile(id));
