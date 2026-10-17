-- Migration 009 : CVthèque (opt-in candidat) et notifications de statut de candidature
-- À exécuter dans Supabase → SQL Editor, après les migrations 001 à 008.

-- =====================================================
-- 1. Visibilité dans la CVthèque : le candidat choisit
-- =====================================================
ALTER TABLE public.candidate_profiles
  ADD COLUMN IF NOT EXISTS is_searchable BOOLEAN NOT NULL DEFAULT FALSE;

-- Un seul CV par défaut par candidat (permet l'enregistrement automatique)
CREATE UNIQUE INDEX IF NOT EXISTS cvs_one_default_per_candidate
  ON public.cvs (candidate_id) WHERE is_default;

-- Recherche de profils pour les entreprises.
-- Ne renvoie que les candidats qui ont accepté d'être visibles, et jamais
-- leur e-mail ni leur téléphone : le contact passe par une offre ou la plateforme.
CREATE OR REPLACE FUNCTION public.search_candidates(
  p_query TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  job_title TEXT,
  location TEXT,
  profile_summary TEXT,
  skills TEXT[],
  experience_count INT,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'company'
  ),
  base AS (
    SELECT
      cp.id,
      p.full_name,
      COALESCE(NULLIF(cp.job_title, ''), cv.content->>'jobTitle') AS job_title,
      COALESCE(NULLIF(cp.location, ''), cv.content->>'location') AS location,
      COALESCE(NULLIF(cp.profile_summary, ''), cv.content->>'profile') AS profile_summary,
      COALESCE(
        NULLIF(ARRAY(SELECT s.skill_name FROM public.skills s WHERE s.candidate_id = cp.id), '{}'),
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(cv.content->'skills', '[]'::jsonb)))
      ) AS skills,
      COALESCE(jsonb_array_length(cv.content->'experiences'), 0) AS experience_count,
      GREATEST(cp.updated_at, cv.updated_at) AS updated_at
    FROM public.candidate_profiles cp
    JOIN public.profiles p ON p.id = cp.id
    LEFT JOIN public.cvs cv ON cv.candidate_id = cp.id AND cv.is_default
    WHERE cp.is_searchable AND EXISTS (SELECT 1 FROM me)
  )
  SELECT b.id, b.full_name, b.job_title, b.location, b.profile_summary, b.skills,
         b.experience_count::INT, b.updated_at
  FROM base b
  WHERE (p_query IS NULL OR p_query = '' OR
         b.full_name ILIKE '%' || p_query || '%' OR
         b.job_title ILIKE '%' || p_query || '%' OR
         b.profile_summary ILIKE '%' || p_query || '%' OR
         array_to_string(b.skills, ' ') ILIKE '%' || p_query || '%')
    AND (p_location IS NULL OR p_location = '' OR b.location ILIKE '%' || p_location || '%')
  ORDER BY b.updated_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(p_limit, 1), 100);
$$;

REVOKE ALL ON FUNCTION public.search_candidates(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_candidates(TEXT, TEXT, INT) TO authenticated;

-- =====================================================
-- 2. Notifier le candidat quand le statut change
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_job TEXT;
  v_company TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT j.title, c.company_name INTO v_job, v_company
  FROM public.jobs j JOIN public.company_profiles c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  v_title := CASE NEW.status
    WHEN 'reviewed'    THEN 'Candidature consultée'
    WHEN 'shortlisted' THEN 'Vous êtes présélectionné'
    WHEN 'interview'   THEN 'Invitation à un entretien'
    WHEN 'accepted'    THEN 'Candidature retenue'
    WHEN 'rejected'    THEN 'Candidature non retenue'
    ELSE 'Mise à jour de votre candidature'
  END;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    NEW.candidate_id,
    CASE WHEN NEW.status = 'interview' THEN 'interview' ELSE 'application' END,
    v_title,
    format('%s · %s', COALESCE(v_job, 'Offre'), COALESCE(v_company, 'Entreprise')),
    '/dashboard'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_status ON public.applications;
CREATE TRIGGER trg_notify_application_status
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_status();
