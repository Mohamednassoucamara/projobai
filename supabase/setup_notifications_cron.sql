-- Planification de l'envoi des notifications (e-mail / WhatsApp) et des rappels d'entretien.
-- À exécuter UNE FOIS dans Supabase → SQL Editor, APRÈS :
--   1. la migration 011 ;
--   2. le déploiement de la fonction : supabase functions deploy notify-dispatch --no-verify-jwt
--   3. la création du secret CRON_SECRET : supabase secrets set CRON_SECRET=<votre mot de passe>
--
-- Remplacez ci-dessous REMPLACER_PAR_CRON_SECRET par la même valeur que CRON_SECRET.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Secrets stockés dans le coffre-fort Supabase (Vault), pas en clair dans la tâche.
DO $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'projob_functions_url';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret('https://zafrxknqtkzermookggk.supabase.co/functions/v1', 'projob_functions_url');
  ELSE
    PERFORM vault.update_secret(v_id, 'https://zafrxknqtkzermookggk.supabase.co/functions/v1');
  END IF;

  SELECT id INTO v_id FROM vault.secrets WHERE name = 'projob_cron_secret';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret('REMPLACER_PAR_CRON_SECRET', 'projob_cron_secret');
  ELSE
    PERFORM vault.update_secret(v_id, 'REMPLACER_PAR_CRON_SECRET');
  END IF;
END $$;

-- Toutes les minutes : rappels d'entretien + envoi des nouvelles notifications.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'projob-notifications';
SELECT cron.schedule(
  'projob-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'projob_functions_url') || '/notify-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'projob_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Vérification : la tâche doit apparaître ici, et ses exécutions dans cron.job_run_details.
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'projob-notifications';
