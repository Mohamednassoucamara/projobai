-- Migration 006 : candidats — voir les offres auxquelles ils ont postulé (dashboard Mes candidatures)
-- Permet d'afficher titre/entreprise même si l'offre a été désactivée par l'entreprise

DROP POLICY IF EXISTS "Candidates can view jobs they applied to" ON jobs;
CREATE POLICY "Candidates can view jobs they applied to"
  ON jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      WHERE a.job_id = jobs.id
        AND a.candidate_id = auth.uid()
    )
  );
