-- Migration 011 : suivi des candidatures (ATS), entretiens, statistiques RH
-- et envoi des notifications par e-mail / WhatsApp.
-- À exécuter dans Supabase → SQL Editor, après les migrations 001 à 010.
-- Le script peut être relancé sans risque.

-- =====================================================
-- 0. Fonctions d'accès (SECURITY DEFINER : évitent la récursion RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.application_owned_by_company(p_application_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = p_application_id AND j.company_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.application_of_candidate(p_application_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applications a
    WHERE a.id = p_application_id AND a.candidate_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.application_owned_by_company(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.application_of_candidate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.application_owned_by_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.application_of_candidate(uuid) TO authenticated;

-- =====================================================
-- 1. Nouvelles colonnes
-- =====================================================
-- Provenance de la candidature (lien partagé sur WhatsApp, Facebook, LinkedIn…)
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'projob';

-- Budget de recrutement de l'offre (facultatif) : sert au coût par recrutement.
-- Table séparée pour que ce montant interne ne soit jamais lisible par les candidats.
CREATE TABLE IF NOT EXISTS public.job_budgets (
  job_id UUID PRIMARY KEY REFERENCES public.jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.job_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Companies manage their job budgets" ON public.job_budgets;
CREATE POLICY "Companies manage their job budgets"
  ON public.job_budgets FOR ALL TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid() AND public.job_owned_by_company(job_id));

-- Préférences de notification (le WhatsApp demande l'accord explicite de l'utilisateur)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN NOT NULL DEFAULT FALSE;

-- Suivi de l'envoi e-mail / WhatsApp de chaque notification
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS delivery JSONB;
CREATE INDEX IF NOT EXISTS idx_notifications_to_dispatch
  ON public.notifications (created_at) WHERE dispatched_at IS NULL;

-- Les anciennes notifications ne doivent pas être envoyées par e-mail
UPDATE public.notifications SET dispatched_at = created_at
WHERE dispatched_at IS NULL AND created_at < NOW() - INTERVAL '1 hour';

-- =====================================================
-- 2. Historique des candidatures et commentaires des recruteurs
-- =====================================================
CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('status', 'comment', 'interview')),
  from_status TEXT,
  to_status TEXT,
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_application_events_app ON public.application_events (application_id, created_at);

ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies can view events of their applications" ON public.application_events;
CREATE POLICY "Companies can view events of their applications"
  ON public.application_events FOR SELECT TO authenticated
  USING (public.application_owned_by_company(application_id));

-- Le candidat voit l'historique de ses étapes, jamais les commentaires internes
DROP POLICY IF EXISTS "Candidates can view status history" ON public.application_events;
CREATE POLICY "Candidates can view status history"
  ON public.application_events FOR SELECT TO authenticated
  USING (kind <> 'comment' AND public.application_of_candidate(application_id));

DROP POLICY IF EXISTS "Companies can comment their applications" ON public.application_events;
CREATE POLICY "Companies can comment their applications"
  ON public.application_events FOR INSERT TO authenticated
  WITH CHECK (kind = 'comment' AND actor_id = auth.uid() AND public.application_owned_by_company(application_id));

DROP POLICY IF EXISTS "Companies can delete their comments" ON public.application_events;
CREATE POLICY "Companies can delete their comments"
  ON public.application_events FOR DELETE TO authenticated
  USING (kind = 'comment' AND actor_id = auth.uid());

-- Étapes enregistrées automatiquement (réception + chaque changement de statut)
CREATE OR REPLACE FUNCTION public.log_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_events (application_id, actor_id, kind, to_status, created_at)
    VALUES (NEW.id, NEW.candidate_id, 'status', NEW.status, COALESCE(NEW.applied_at, NOW()));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_events (application_id, actor_id, kind, from_status, to_status)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_application_status ON public.applications;
CREATE TRIGGER trg_log_application_status
  AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_application_status();

-- Reprise des candidatures existantes (étape « reçue », et l'étape actuelle)
INSERT INTO public.application_events (application_id, actor_id, kind, to_status, created_at)
SELECT a.id, a.candidate_id, 'status', 'pending', a.applied_at
FROM public.applications a
WHERE NOT EXISTS (SELECT 1 FROM public.application_events e WHERE e.application_id = a.id);

INSERT INTO public.application_events (application_id, kind, from_status, to_status, created_at)
SELECT a.id, 'status', 'pending', a.status, COALESCE(a.updated_at, a.applied_at)
FROM public.applications a
WHERE a.status <> 'pending'
  AND NOT EXISTS (SELECT 1 FROM public.application_events e
                  WHERE e.application_id = a.id AND e.to_status = a.status);

-- =====================================================
-- 3. Accusé de réception au candidat + notification entreprise (lien corrigé)
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_company_on_application()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_job_title TEXT;
  v_company_name TEXT;
  v_candidate_name TEXT;
BEGIN
  SELECT j.company_id, j.title, c.company_name
  INTO v_company_id, v_job_title, v_company_name
  FROM public.jobs j LEFT JOIN public.company_profiles c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  SELECT p.full_name INTO v_candidate_name FROM public.profiles p WHERE p.id = NEW.candidate_id;

  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
    VALUES (v_company_id, 'application', 'Nouvelle candidature',
            COALESCE(v_candidate_name, 'Un candidat') || ' a postulé pour le poste « ' || COALESCE(v_job_title, '') || ' ».',
            '/company/applications/' || NEW.id, false);
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, is_read)
  VALUES (NEW.candidate_id, 'application', 'Candidature bien reçue',
          format('Votre candidature au poste « %s » chez %s a bien été envoyée. Vous serez informé(e) de chaque étape.',
                 COALESCE(v_job_title, 'Offre'), COALESCE(v_company_name, 'l''entreprise')),
          '/dashboard#mes-candidatures', false);
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. Entretiens
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 10 AND 480),
  mode TEXT NOT NULL DEFAULT 'visio' CHECK (mode IN ('visio', 'presentiel', 'telephone')),
  location TEXT,
  meeting_url TEXT,
  interviewer TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'cancelled')),
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON public.interviews (company_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON public.interviews (candidate_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON public.interviews (application_id);

DROP TRIGGER IF EXISTS update_interviews_updated_at ON public.interviews;
CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage their interviews" ON public.interviews;
CREATE POLICY "Companies manage their interviews"
  ON public.interviews FOR ALL TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid() AND public.application_owned_by_company(application_id));

DROP POLICY IF EXISTS "Candidates view their interviews" ON public.interviews;
CREATE POLICY "Candidates view their interviews"
  ON public.interviews FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

-- Grille d'évaluation et compte rendu : réservés à l'entreprise
CREATE TABLE IF NOT EXISTS public.interview_evaluations (
  interview_id UUID PRIMARY KEY REFERENCES public.interviews(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation TEXT CHECK (recommendation IN ('retenir', 'a_revoir', 'refuser')),
  report TEXT CHECK (report IS NULL OR char_length(report) <= 10000),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies manage their evaluations" ON public.interview_evaluations;
CREATE POLICY "Companies manage their evaluations"
  ON public.interview_evaluations FOR ALL TO authenticated
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid()
              AND EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_id AND i.company_id = auth.uid()));

-- Convocation, report et annulation : le candidat est prévenu automatiquement
CREATE OR REPLACE FUNCTION public.notify_interview_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_job TEXT;
  v_company TEXT;
  v_when TEXT;
  v_where TEXT;
  v_title TEXT;
BEGIN
  SELECT j.title, c.company_name INTO v_job, v_company
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  JOIN public.company_profiles c ON c.id = j.company_id
  WHERE a.id = NEW.application_id;

  v_when := to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY "à" HH24"h"MI');
  v_where := CASE NEW.mode
    WHEN 'visio' THEN 'en visioconférence'
    WHEN 'telephone' THEN 'par téléphone'
    ELSE 'en présentiel' || COALESCE(' — ' || NULLIF(NEW.location, ''), '')
  END;

  IF TG_OP = 'INSERT' THEN
    v_title := 'Convocation à un entretien';
    -- La candidature passe à l'étape « Entretien »
    UPDATE public.applications SET status = 'interview'
    WHERE id = NEW.application_id AND status IN ('pending', 'reviewed', 'shortlisted');
  ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    v_title := 'Entretien annulé';
  ELSIF NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at OR NEW.mode IS DISTINCT FROM OLD.mode
        OR NEW.location IS DISTINCT FROM OLD.location OR NEW.meeting_url IS DISTINCT FROM OLD.meeting_url THEN
    v_title := 'Entretien modifié';
    NEW.reminder_sent_at := NULL;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (NEW.candidate_id, 'interview', v_title,
          CASE WHEN v_title = 'Entretien annulé'
               THEN format('L''entretien pour le poste « %s » chez %s prévu le %s est annulé.', COALESCE(v_job, ''), COALESCE(v_company, ''), v_when)
               ELSE format('Poste « %s » chez %s : le %s (heure de Conakry), %s.', COALESCE(v_job, ''), COALESCE(v_company, ''), v_when, v_where)
          END,
          '/dashboard#mes-entretiens');

  INSERT INTO public.application_events (application_id, actor_id, kind, comment)
  VALUES (NEW.application_id, auth.uid(), 'interview', v_title || ' — ' || v_when || ', ' || v_where);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_interview_insert ON public.interviews;
CREATE TRIGGER trg_notify_interview_insert
  AFTER INSERT ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_interview_change();

DROP TRIGGER IF EXISTS trg_notify_interview_update ON public.interviews;
CREATE TRIGGER trg_notify_interview_update
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.notify_interview_change();

-- Rappels : 24 h avant l'entretien, au candidat et à l'entreprise.
-- Appelée chaque minute par la fonction notify-dispatch (voir setup_notifications_cron.sql).
CREATE OR REPLACE FUNCTION public.queue_interview_reminders()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  n INT := 0;
  v_when TEXT;
BEGIN
  FOR r IN
    SELECT i.*, j.title AS job_title, c.company_name, p.full_name AS candidate_name
    FROM public.interviews i
    JOIN public.applications a ON a.id = i.application_id
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.company_profiles c ON c.id = i.company_id
    LEFT JOIN public.profiles p ON p.id = i.candidate_id
    WHERE i.status = 'planned' AND i.reminder_sent_at IS NULL
      AND i.scheduled_at > NOW() AND i.scheduled_at <= NOW() + INTERVAL '24 hours'
    FOR UPDATE OF i SKIP LOCKED
  LOOP
    v_when := to_char(r.scheduled_at AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY "à" HH24"h"MI');
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (r.candidate_id, 'interview', 'Rappel : entretien demain',
            format('Poste « %s » chez %s, le %s.%s', r.job_title, r.company_name, v_when,
                   CASE WHEN r.meeting_url IS NOT NULL AND r.meeting_url <> '' THEN ' Lien : ' || r.meeting_url ELSE '' END),
            '/dashboard#mes-entretiens');
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (r.company_id, 'interview', 'Rappel : entretien demain',
            format('%s — poste « %s », le %s.', COALESCE(r.candidate_name, 'Candidat'), r.job_title, v_when),
            '/company/interviews');
    UPDATE public.interviews SET reminder_sent_at = NOW() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_interview_reminders() FROM PUBLIC, anon, authenticated;

-- =====================================================
-- 5. Données de CV des candidats ayant postulé (pour le score de compatibilité)
-- =====================================================
CREATE OR REPLACE FUNCTION public.company_applicant_cvs()
RETURNS TABLE (application_id UUID, cv JSONB)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, (cv.content - 'photo')
  FROM public.applications a
  JOIN public.jobs j ON j.id = a.job_id
  LEFT JOIN public.cvs cv ON cv.candidate_id = a.candidate_id AND cv.is_default
  WHERE j.company_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.company_applicant_cvs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_applicant_cvs() TO authenticated;

-- =====================================================
-- 6. Statut « Entretien » : pas de double notification quand un entretien est planifié
-- =====================================================
CREATE OR REPLACE FUNCTION public.notify_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_title TEXT;
  v_job TEXT;
  v_company TEXT;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  -- La convocation détaillée est déjà envoyée par l'entretien planifié
  IF NEW.status = 'interview' AND EXISTS (
    SELECT 1 FROM public.interviews i WHERE i.application_id = NEW.id AND i.status = 'planned'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT j.title, c.company_name INTO v_job, v_company
  FROM public.jobs j JOIN public.company_profiles c ON c.id = j.company_id
  WHERE j.id = NEW.job_id;

  v_title := CASE NEW.status
    WHEN 'reviewed'    THEN 'Candidature consultée'
    WHEN 'shortlisted' THEN 'Vous êtes présélectionné(e)'
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
    '/dashboard#mes-candidatures'
  );
  RETURN NEW;
END;
$$;
