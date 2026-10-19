-- Migration 010 : règles d'accès des compétences d'offres (job_skills)
-- La table avait la sécurité RLS activée sans aucune règle : les compétences saisies
-- à la publication n'étaient jamais enregistrées ni lisibles.
-- Prérequis : migration 007 (fonction public.job_owned_by_company).

-- Lecture : compétences des offres actives (tout le monde) et de ses propres offres
DROP POLICY IF EXISTS "Anyone can view skills of active jobs" ON public.job_skills;
CREATE POLICY "Anyone can view skills of active jobs"
  ON public.job_skills FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_skills.job_id AND j.is_active));

DROP POLICY IF EXISTS "Companies can view skills of their jobs" ON public.job_skills;
CREATE POLICY "Companies can view skills of their jobs"
  ON public.job_skills FOR SELECT
  TO authenticated
  USING (public.job_owned_by_company(job_id));

-- Écriture : uniquement l'entreprise propriétaire de l'offre
DROP POLICY IF EXISTS "Companies can add skills to their jobs" ON public.job_skills;
CREATE POLICY "Companies can add skills to their jobs"
  ON public.job_skills FOR INSERT
  TO authenticated
  WITH CHECK (public.job_owned_by_company(job_id));

DROP POLICY IF EXISTS "Companies can update skills of their jobs" ON public.job_skills;
CREATE POLICY "Companies can update skills of their jobs"
  ON public.job_skills FOR UPDATE
  TO authenticated
  USING (public.job_owned_by_company(job_id));

DROP POLICY IF EXISTS "Companies can delete skills of their jobs" ON public.job_skills;
CREATE POLICY "Companies can delete skills of their jobs"
  ON public.job_skills FOR DELETE
  TO authenticated
  USING (public.job_owned_by_company(job_id));
