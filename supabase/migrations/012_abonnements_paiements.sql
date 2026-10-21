-- Migration 012 : formules Gratuit / Premium, essai de 7 jours, paiements Djomy.
-- À exécuter dans Supabase → SQL Editor, après la migration 011. Peut être relancée sans risque.
--
-- Les prix, textes et fonctionnalités des formules sont des DONNÉES (table plans) :
-- pour les changer, modifiez la table dans Supabase (Table Editor → plans), sans toucher au code.
--
-- Fonctionnalités Premium (colonne features) :
--   Candidats   ai_cv            amélioration du CV par l'IA + adaptation du CV à une offre
--               career_coach     orientation professionnelle (coaching carrière)
--               interview_coach  coach d'entretien IA
--   Entreprises interviews       planification, agenda, évaluation des entretiens
--               hr_stats         statistiques RH
--               share_links      partage des offres avec suivi de la source
--               ats_history      historique et commentaires internes des candidatures
--               ai_ranking       extraction IA des CV et classement des meilleurs profils

-- =====================================================
-- 1. Formules
-- =====================================================
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  audience TEXT NOT NULL CHECK (audience IN ('candidate', 'company')),
  name TEXT NOT NULL,
  tagline TEXT,
  price_month_gnf INT NOT NULL DEFAULT 0 CHECK (price_month_gnf >= 0),
  price_year_gnf INT NOT NULL DEFAULT 0 CHECK (price_year_gnf >= 0),
  perks JSONB NOT NULL DEFAULT '[]'::jsonb,       -- textes affichés sur la page des tarifs
  features TEXT[] NOT NULL DEFAULT '{}',          -- fonctionnalités débloquées
  rank INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read plans" ON public.plans;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (TRUE);

INSERT INTO public.plans (id, audience, name, tagline, price_month_gnf, price_year_gnf, perks, features, rank) VALUES
  ('candidat_gratuit', 'candidate', 'Gratuit', 'Pour commencer votre recherche', 0, 0,
   '["Création de CV professionnel (PDF, photo, couleurs)", "Lettre de motivation", "Import de votre CV existant", "Toutes les offres d''emploi et candidatures", "Score de compatibilité avec chaque offre", "Suivi de vos candidatures et convocations"]',
   '{}', 0),
  ('candidat_premium', 'candidate', 'Premium', 'Pour décrocher le poste', 20000, 200000,
   '["Tout le Gratuit", "CV optimisé par l''IA", "CV adapté à chaque offre", "Coaching carrière (orientation professionnelle)", "Coach d''entretien IA avec notes et conseils"]',
   '{ai_cv,career_coach,interview_coach}', 10),
  ('entreprise_gratuit', 'company', 'Gratuit', 'Pour publier vos offres', 0, 0,
   '["Publication d''offres d''emploi", "Réception et suivi des candidatures", "Étapes du recrutement et notifications aux candidats", "CVthèque"]',
   '{}', 0),
  ('entreprise_premium', 'company', 'Premium', 'Pour recruter mieux et plus vite', 50000, 500000,
   '["Tout le Gratuit", "IA : extraction des CV et classement des meilleurs profils", "Entretiens : planification, agenda, évaluation", "Statistiques RH", "Partage des offres (WhatsApp, Facebook, LinkedIn…) avec suivi des sources", "Historique et commentaires internes"]',
   '{interviews,hr_stats,share_links,ats_history,ai_ranking}', 10)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.billing_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  trial_days INT NOT NULL DEFAULT 7 CHECK (trial_days >= 0),
  -- Les comptes créés avant le lancement ont leur essai compté à partir de cette date
  launched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.billing_settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read billing settings" ON public.billing_settings;
CREATE POLICY "Anyone can read billing settings" ON public.billing_settings FOR SELECT USING (TRUE);

-- =====================================================
-- 2. Abonnements et paiements
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'djomy' CHECK (source IN ('djomy', 'manuel', 'offert')),
  payment_id UUID,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id, ends_at DESC);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their subscriptions" ON public.subscriptions;
CREATE POLICY "Users read their subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL UNIQUE,                -- merchantPaymentReference envoyé à Djomy
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  period TEXT NOT NULL CHECK (period IN ('month', 'year')),
  amount_gnf INT NOT NULL CHECK (amount_gnf > 0),
  provider TEXT NOT NULL DEFAULT 'djomy',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'success', 'failed', 'cancelled', 'timeout')),
  transaction_id TEXT,                          -- identifiant Djomy
  payment_method TEXT,                          -- OM, MOMO, CARD…
  redirect_url TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_txn ON public.payments (transaction_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their payments" ON public.payments;
CREATE POLICY "Users read their payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.payments FROM anon, authenticated;
GRANT SELECT (id, order_id, plan_id, period, amount_gnf, provider, status, payment_method, created_at, paid_at)
  ON public.payments TO authenticated;

-- =====================================================
-- 3. Formule en vigueur
-- =====================================================
-- Abonnement payé en cours > essai de 7 jours après l'inscription > formule gratuite.
CREATE OR REPLACE FUNCTION public.user_plan(p_user UUID)
RETURNS TABLE (plan_id TEXT, source TEXT, ends_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_type TEXT;
  v_created TIMESTAMPTZ;
  v_trial_end TIMESTAMPTZ;
  s public.billing_settings%ROWTYPE;
BEGIN
  SELECT user_type, created_at INTO v_type, v_created FROM public.profiles WHERE id = p_user;
  SELECT * INTO s FROM public.billing_settings LIMIT 1;

  RETURN QUERY
    SELECT sub.plan_id, 'abonnement'::TEXT, sub.ends_at
    FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id
    WHERE sub.user_id = p_user AND sub.starts_at <= NOW() AND sub.ends_at > NOW()
    ORDER BY pl.rank DESC, sub.ends_at DESC
    LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  v_trial_end := GREATEST(COALESCE(v_created, NOW()), s.launched_at) + make_interval(days => COALESCE(s.trial_days, 0));
  IF COALESCE(s.trial_days, 0) > 0 AND v_trial_end > NOW() THEN
    RETURN QUERY SELECT CASE WHEN v_type = 'company' THEN 'entreprise_premium' ELSE 'candidat_premium' END, 'essai'::TEXT, v_trial_end;
    RETURN;
  END IF;
  RETURN QUERY SELECT CASE WHEN v_type = 'company' THEN 'entreprise_gratuit' ELSE 'candidat_gratuit' END, 'gratuit'::TEXT, NULL::TIMESTAMPTZ;
END;
$$;
REVOKE ALL ON FUNCTION public.user_plan(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_feature(p_user UUID, p_feature TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT p_feature = ANY (pl.features) FROM public.user_plan(p_user) up JOIN public.plans pl ON pl.id = up.plan_id), FALSE);
$$;
REVOKE ALL ON FUNCTION public.has_feature(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_feature(UUID, TEXT) TO authenticated;

-- Utilisé par la fonction ai-assistant (avec le jeton de l'utilisateur)
CREATE OR REPLACE FUNCTION public.check_feature(p_feature TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_feature(auth.uid(), p_feature); $$;
REVOKE ALL ON FUNCTION public.check_feature(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_feature(TEXT) TO authenticated;

-- Pour l'interface : formule, échéance et fonctionnalités de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.my_entitlements()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT up.plan_id, up.source, up.ends_at, pl.name, pl.audience, pl.features
  INTO v FROM public.user_plan(auth.uid()) up JOIN public.plans pl ON pl.id = up.plan_id;
  RETURN jsonb_build_object('plan_id', v.plan_id, 'plan_name', v.name, 'audience', v.audience,
                            'source', v.source, 'ends_at', v.ends_at, 'features', to_jsonb(v.features));
END;
$$;
REVOKE ALL ON FUNCTION public.my_entitlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_entitlements() TO authenticated;

-- =====================================================
-- 4. Fonctionnalités entreprise réservées au Premium (contrôlées dans la base)
-- =====================================================
-- Entretiens : consultation toujours possible, création/modification en Premium
DROP POLICY IF EXISTS "Companies manage their interviews" ON public.interviews;
DROP POLICY IF EXISTS "Companies view their interviews" ON public.interviews;
CREATE POLICY "Companies view their interviews" ON public.interviews FOR SELECT TO authenticated
  USING (company_id = auth.uid());
DROP POLICY IF EXISTS "Premium companies create interviews" ON public.interviews;
CREATE POLICY "Premium companies create interviews" ON public.interviews FOR INSERT TO authenticated
  WITH CHECK (company_id = auth.uid() AND public.application_owned_by_company(application_id) AND public.has_feature(auth.uid(), 'interviews'));
DROP POLICY IF EXISTS "Premium companies update interviews" ON public.interviews;
CREATE POLICY "Premium companies update interviews" ON public.interviews FOR UPDATE TO authenticated
  USING (company_id = auth.uid() AND public.has_feature(auth.uid(), 'interviews'))
  WITH CHECK (company_id = auth.uid());
DROP POLICY IF EXISTS "Companies delete interviews" ON public.interviews;
CREATE POLICY "Companies delete interviews" ON public.interviews FOR DELETE TO authenticated
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies manage their evaluations" ON public.interview_evaluations;
CREATE POLICY "Companies manage their evaluations" ON public.interview_evaluations FOR ALL TO authenticated
  USING (company_id = auth.uid() AND public.has_feature(auth.uid(), 'interviews'))
  WITH CHECK (company_id = auth.uid() AND public.has_feature(auth.uid(), 'interviews')
              AND EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_id AND i.company_id = auth.uid()));

-- Historique et commentaires internes
DROP POLICY IF EXISTS "Companies can view events of their applications" ON public.application_events;
CREATE POLICY "Companies can view events of their applications" ON public.application_events FOR SELECT TO authenticated
  USING (public.application_owned_by_company(application_id)
         AND (public.has_feature(auth.uid(), 'ats_history') OR public.has_feature(auth.uid(), 'hr_stats')));
DROP POLICY IF EXISTS "Companies can comment their applications" ON public.application_events;
CREATE POLICY "Companies can comment their applications" ON public.application_events FOR INSERT TO authenticated
  WITH CHECK (kind = 'comment' AND actor_id = auth.uid() AND public.application_owned_by_company(application_id)
              AND public.has_feature(auth.uid(), 'ats_history'));

-- Extraction IA des CV et classement des candidats
CREATE OR REPLACE FUNCTION public.company_applicant_cvs()
RETURNS TABLE (application_id UUID, cv JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_feature(auth.uid(), 'ai_ranking') THEN
    RAISE EXCEPTION 'PREMIUM_REQUIRED' USING DETAIL = 'ai_ranking';
  END IF;
  RETURN QUERY
    SELECT a.id, (cv.content - 'photo')
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    LEFT JOIN public.cvs cv ON cv.candidate_id = a.candidate_id AND cv.is_default
    WHERE j.company_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.company_applicant_cvs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_applicant_cvs() TO authenticated;

-- =====================================================
-- 5. Activation après paiement (appelée uniquement par les fonctions Djomy, clé service_role)
-- =====================================================
CREATE OR REPLACE FUNCTION public.activate_payment(p_order_id TEXT, p_transaction_id TEXT, p_method TEXT DEFAULT NULL, p_raw JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_name TEXT;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE order_id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
  IF v_pay.status = 'success' THEN RETURN jsonb_build_object('already', TRUE); END IF;

  -- Renouvellement : prolongé à partir de l'échéance de l'abonnement en cours
  SELECT GREATEST(NOW(), COALESCE(MAX(ends_at), NOW())) INTO v_start
  FROM public.subscriptions WHERE user_id = v_pay.user_id AND plan_id = v_pay.plan_id AND ends_at > NOW();
  v_end := v_start + CASE WHEN v_pay.period = 'year' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;

  UPDATE public.payments
  SET status = 'success', paid_at = NOW(), transaction_id = COALESCE(p_transaction_id, transaction_id),
      payment_method = COALESCE(p_method, payment_method), raw = COALESCE(p_raw, raw)
  WHERE id = v_pay.id;

  INSERT INTO public.subscriptions (user_id, plan_id, starts_at, ends_at, source, payment_id)
  VALUES (v_pay.user_id, v_pay.plan_id, v_start, v_end, 'djomy', v_pay.id);

  SELECT name INTO v_name FROM public.plans WHERE id = v_pay.plan_id;
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (v_pay.user_id, 'system', 'Abonnement Premium activé',
          format('Paiement de %s GNF reçu. Formule %s active jusqu''au %s.',
                 replace(to_char(v_pay.amount_gnf, 'FM999,999,999'), ',', ' '), v_name,
                 to_char(v_end AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY')),
          '/abonnement');
  RETURN jsonb_build_object('ends_at', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.activate_payment(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

-- Activation manuelle (espèces, virement…) — à lancer dans le SQL Editor, par exemple :
--   SELECT public.grant_subscription('email@exemple.gn', 'entreprise_premium', 'year');
CREATE OR REPLACE FUNCTION public.grant_subscription(p_email TEXT, p_plan TEXT, p_period TEXT DEFAULT 'month')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_user FROM public.profiles WHERE lower(email) = lower(p_email);
  IF v_user IS NULL THEN RAISE EXCEPTION 'Aucun compte avec l''adresse %', p_email; END IF;
  SELECT GREATEST(NOW(), COALESCE(MAX(ends_at), NOW())) INTO v_start
  FROM public.subscriptions WHERE user_id = v_user AND plan_id = p_plan AND ends_at > NOW();
  v_end := v_start + CASE WHEN p_period = 'year' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END;
  INSERT INTO public.subscriptions (user_id, plan_id, starts_at, ends_at, source) VALUES (v_user, p_plan, v_start, v_end, 'manuel');
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT v_user, 'system', 'Abonnement Premium activé',
         format('Formule %s active jusqu''au %s.', name, to_char(v_end AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY')), '/abonnement'
  FROM public.plans WHERE id = p_plan;
  RETURN jsonb_build_object('user', v_user, 'ends_at', v_end);
END;
$$;
REVOKE ALL ON FUNCTION public.grant_subscription(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Rappels : fin d'abonnement dans 3 jours, fin d'essai dans 2 jours (appelé par notify-dispatch)
CREATE OR REPLACE FUNCTION public.queue_subscription_reminders()
RETURNS INT LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r RECORD;
  n INT := 0;
  s public.billing_settings%ROWTYPE;
BEGIN
  FOR r IN
    SELECT sub.id, sub.user_id, sub.ends_at, pl.name
    FROM public.subscriptions sub JOIN public.plans pl ON pl.id = sub.plan_id
    WHERE sub.reminder_sent_at IS NULL AND sub.ends_at > NOW() AND sub.ends_at <= NOW() + INTERVAL '3 days'
      AND NOT EXISTS (SELECT 1 FROM public.subscriptions s2 WHERE s2.user_id = sub.user_id AND s2.plan_id = sub.plan_id AND s2.ends_at > sub.ends_at)
    FOR UPDATE OF sub SKIP LOCKED
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (r.user_id, 'system', 'Votre abonnement se termine bientôt',
            format('La formule %s se termine le %s. Renouvelez-la pour garder vos avantages.', r.name,
                   to_char(r.ends_at AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY')), '/abonnement');
    UPDATE public.subscriptions SET reminder_sent_at = NOW() WHERE id = r.id;
    n := n + 1;
  END LOOP;

  -- Fin d'essai : une seule fois par compte
  SELECT * INTO s FROM public.billing_settings LIMIT 1;
  IF COALESCE(s.trial_days, 0) > 0 THEN
    FOR r IN
      SELECT p.id, GREATEST(p.created_at, s.launched_at) + make_interval(days => s.trial_days) AS trial_end
      FROM public.profiles p
      WHERE GREATEST(p.created_at, s.launched_at) + make_interval(days => s.trial_days) BETWEEN NOW() AND NOW() + INTERVAL '2 days'
        AND NOT EXISTS (SELECT 1 FROM public.subscriptions sub WHERE sub.user_id = p.id AND sub.ends_at > NOW())
        AND NOT EXISTS (SELECT 1 FROM public.notifications nn WHERE nn.user_id = p.id AND nn.title = 'Votre essai Premium se termine bientôt')
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (r.id, 'system', 'Votre essai Premium se termine bientôt',
              format('Votre essai gratuit se termine le %s. Passez au Premium pour garder toutes les fonctionnalités.',
                     to_char(r.trial_end AT TIME ZONE 'Africa/Conakry', 'DD/MM/YYYY')), '/abonnement');
      n := n + 1;
    END LOOP;
  END IF;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_subscription_reminders() FROM PUBLIC, anon, authenticated;

-- Les fonctions serveur (clé service_role) doivent pouvoir les appeler
GRANT EXECUTE ON FUNCTION public.activate_payment(TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_subscription_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_subscription(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.queue_interview_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.user_plan(UUID) TO service_role;
GRANT ALL ON public.payments, public.subscriptions TO service_role;
