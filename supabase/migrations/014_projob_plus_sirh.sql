-- Migration 014 : ProJob+ (SIRH) — étape 1
-- Dossiers employés, services, contrats, congés et absences, jours fériés, équipe RH,
-- embauche depuis une candidature, espace employé.
-- À exécuter dans Supabase → SQL Editor, après la migration 013. Peut être relancée sans risque.
--
-- Rôles dans une entreprise (fonction hr_role) :
--   admin    le compte entreprise lui-même (company_profiles.id)
--   rh       un gestionnaire RH ajouté par l'entreprise (table hr_members)
--   manager  un employé qui a au moins une personne sous sa responsabilité
--   employee un employé relié à un compte ProJob
-- Les écritures sensibles (congés, embauche) passent par des fonctions qui contrôlent ces rôles.

-- =====================================================
-- 1. Formule ProJob+
-- =====================================================
INSERT INTO public.plans (id, audience, name, tagline, price_month_gnf, price_year_gnf, perks, features, rank) VALUES
  ('entreprise_plus', 'company', 'ProJob+', 'Recrutement et gestion RH dans un seul outil', 150000, 1500000,
   '["Tout le Premium", "Dossiers employés et contrats", "Organigramme par service", "Congés et absences avec validation en deux niveaux", "Espace employé et demandes par WhatsApp", "Embauche en un clic depuis une candidature", "Jusqu''à 10 employés inclus (au-delà : nous contacter)"]',
   '{interviews,hr_stats,share_links,ats_history,ai_ranking,sirh}', 20)
ON CONFLICT (id) DO NOTHING;

-- L'essai de 7 jours des entreprises donne accès à ProJob+ (qui inclut le Premium).
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
    RETURN QUERY SELECT CASE WHEN v_type = 'company' THEN 'entreprise_plus' ELSE 'candidat_premium' END, 'essai'::TEXT, v_trial_end;
    RETURN;
  END IF;
  RETURN QUERY SELECT CASE WHEN v_type = 'company' THEN 'entreprise_gratuit' ELSE 'candidat_gratuit' END, 'gratuit'::TEXT, NULL::TIMESTAMPTZ;
END;
$$;
REVOKE ALL ON FUNCTION public.user_plan(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_plan(UUID) TO service_role;

-- =====================================================
-- 2. Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.hr_members (
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'rh' CHECK (role IN ('rh')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.hr_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  parent_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,      -- compte ProJob de l'employé (espace employé, WhatsApp)
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  matricule TEXT,
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) > 0),
  last_name TEXT NOT NULL CHECK (length(trim(last_name)) > 0),
  email TEXT,
  phone TEXT,
  gender TEXT CHECK (gender IN ('F', 'M')),
  birth_date DATE,
  address TEXT,
  job_title TEXT,
  department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  manager_id UUID REFERENCES public.hr_employees(id) ON DELETE SET NULL,
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'essai', 'suspendu', 'sorti')),
  exit_date DATE,
  exit_reason TEXT,
  emergency_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (manager_id IS NULL OR manager_id <> id)
);
CREATE INDEX IF NOT EXISTS idx_hr_employees_company ON public.hr_employees (company_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON public.hr_employees (user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_manager ON public.hr_employees (manager_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employees_user ON public.hr_employees (company_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_employees_matricule ON public.hr_employees (company_id, matricule) WHERE matricule IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.hr_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('CDI', 'CDD', 'Stage', 'Prestation', 'Apprentissage')),
  job_title TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  trial_end_date DATE,
  base_salary_gnf NUMERIC(14, 0) CHECK (base_salary_gnf IS NULL OR base_salary_gnf >= 0),
  weekly_hours NUMERIC(4, 1) DEFAULT 40,
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_hr_contracts_employee ON public.hr_contracts (employee_id, start_date DESC);

CREATE TABLE IF NOT EXISTS public.hr_leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  deducts_balance BOOLEAN NOT NULL DEFAULT FALSE,      -- vrai pour le congé annuel
  monthly_accrual NUMERIC(5, 2) NOT NULL DEFAULT 0,    -- jours acquis par mois de service
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort INT NOT NULL DEFAULT 0,
  UNIQUE (company_id, code)
);

-- Jours fériés : company_id NULL = jour férié national commun à toutes les entreprises
CREATE TABLE IF NOT EXISTS public.hr_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  name TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_holidays ON public.hr_holidays (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), day);

CREATE TABLE IF NOT EXISTS public.hr_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(5, 1) NOT NULL CHECK (days > 0),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente', 'validee_responsable', 'approuvee', 'refusee', 'annulee')),
  manager_decided_by UUID REFERENCES public.profiles(id),
  manager_decided_at TIMESTAMPTZ,
  hr_decided_by UUID REFERENCES public.profiles(id),
  hr_decided_at TIMESTAMPTZ,
  decision_note TEXT,
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'whatsapp', 'rh')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_hr_leave_company ON public.hr_leave_requests (company_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_employee ON public.hr_leave_requests (employee_id, start_date DESC);

-- Ajustements de solde (reprise d'un solde existant, report, correction)
CREATE TABLE IF NOT EXISTS public.hr_leave_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  leave_type_id UUID NOT NULL REFERENCES public.hr_leave_types(id) ON DELETE CASCADE,
  days NUMERIC(5, 1) NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal des actions RH
CREATE TABLE IF NOT EXISTS public.hr_audit_log (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL,
  actor UUID,
  table_name TEXT NOT NULL,
  row_id UUID,
  action TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hr_audit_company ON public.hr_audit_log (company_id, at DESC);

-- =====================================================
-- 3. Fonctions d'accès (SECURITY DEFINER : pas de récursion RLS)
-- =====================================================
CREATE OR REPLACE FUNCTION public.hr_enabled(p_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_feature(p_company, 'sirh'); $$;

-- Admin ou gestionnaire RH de l'entreprise, avec ProJob+ actif
CREATE OR REPLACE FUNCTION public.hr_is_staff(p_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND (auth.uid() = p_company OR EXISTS (SELECT 1 FROM public.hr_members m WHERE m.company_id = p_company AND m.user_id = auth.uid()))
     AND public.hr_enabled(p_company);
$$;

-- Fiche employé de l'utilisateur connecté dans cette entreprise
CREATE OR REPLACE FUNCTION public.hr_my_employee_id(p_company UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id FROM public.hr_employees e
  WHERE e.company_id = p_company AND e.user_id = auth.uid() AND e.status <> 'sorti'
  LIMIT 1;
$$;

-- L'utilisateur connecté est le responsable direct de cet employé
CREATE OR REPLACE FUNCTION public.hr_is_manager_of(p_employee UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.hr_employees e JOIN public.hr_employees m ON m.id = e.manager_id
    WHERE e.id = p_employee AND m.user_id = auth.uid() AND m.status <> 'sorti'
  ) AND public.hr_enabled((SELECT company_id FROM public.hr_employees WHERE id = p_employee));
$$;

-- Toute personne de l'entreprise (staff ou employé) : lecture des référentiels
CREATE OR REPLACE FUNCTION public.hr_is_member(p_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.hr_is_staff(p_company) OR (public.hr_my_employee_id(p_company) IS NOT NULL AND public.hr_enabled(p_company)); $$;

CREATE OR REPLACE FUNCTION public.hr_role(p_company UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN auth.uid() = p_company THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.hr_members m WHERE m.company_id = p_company AND m.user_id = auth.uid()) THEN 'rh'
    WHEN EXISTS (SELECT 1 FROM public.hr_employees r JOIN public.hr_employees me ON me.id = r.manager_id
                 WHERE me.company_id = p_company AND me.user_id = auth.uid() AND r.status <> 'sorti') THEN 'manager'
    WHEN public.hr_my_employee_id(p_company) IS NOT NULL THEN 'employee'
  END;
$$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['hr_enabled(uuid)', 'hr_is_staff(uuid)', 'hr_my_employee_id(uuid)', 'hr_is_manager_of(uuid)', 'hr_is_member(uuid)', 'hr_role(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
  END LOOP;
END $$;

-- =====================================================
-- 4. Sécurité des lignes (RLS)
-- =====================================================
ALTER TABLE public.hr_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_leave_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_audit_log ENABLE ROW LEVEL SECURITY;

-- Équipe RH : gérée par le compte entreprise uniquement
DROP POLICY IF EXISTS "hr_members read" ON public.hr_members;
CREATE POLICY "hr_members read" ON public.hr_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.hr_is_staff(company_id));
DROP POLICY IF EXISTS "hr_members admin" ON public.hr_members;
CREATE POLICY "hr_members admin" ON public.hr_members FOR ALL TO authenticated
  USING (company_id = auth.uid() AND public.hr_enabled(company_id))
  WITH CHECK (company_id = auth.uid() AND public.hr_enabled(company_id));

-- Services
DROP POLICY IF EXISTS "hr_departments read" ON public.hr_departments;
CREATE POLICY "hr_departments read" ON public.hr_departments FOR SELECT TO authenticated USING (public.hr_is_member(company_id));
DROP POLICY IF EXISTS "hr_departments write" ON public.hr_departments;
CREATE POLICY "hr_departments write" ON public.hr_departments FOR ALL TO authenticated
  USING (public.hr_is_staff(company_id)) WITH CHECK (public.hr_is_staff(company_id));

-- Employés : le staff voit et gère tout ; l'employé voit sa fiche ; le responsable voit son équipe
DROP POLICY IF EXISTS "hr_employees read" ON public.hr_employees;
CREATE POLICY "hr_employees read" ON public.hr_employees FOR SELECT TO authenticated
  USING (public.hr_is_staff(company_id) OR (user_id = auth.uid() AND public.hr_enabled(company_id)) OR public.hr_is_manager_of(id));
DROP POLICY IF EXISTS "hr_employees write" ON public.hr_employees;
CREATE POLICY "hr_employees write" ON public.hr_employees FOR ALL TO authenticated
  USING (public.hr_is_staff(company_id)) WITH CHECK (public.hr_is_staff(company_id));

-- Contrats (salaire) : staff, et l'employé pour ses propres contrats
DROP POLICY IF EXISTS "hr_contracts read" ON public.hr_contracts;
CREATE POLICY "hr_contracts read" ON public.hr_contracts FOR SELECT TO authenticated
  USING (public.hr_is_staff(company_id)
         OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));
DROP POLICY IF EXISTS "hr_contracts write" ON public.hr_contracts;
CREATE POLICY "hr_contracts write" ON public.hr_contracts FOR ALL TO authenticated
  USING (public.hr_is_staff(company_id))
  WITH CHECK (public.hr_is_staff(company_id) AND EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.company_id = hr_contracts.company_id));

-- Types de congé
DROP POLICY IF EXISTS "hr_leave_types read" ON public.hr_leave_types;
CREATE POLICY "hr_leave_types read" ON public.hr_leave_types FOR SELECT TO authenticated USING (public.hr_is_member(company_id));
DROP POLICY IF EXISTS "hr_leave_types write" ON public.hr_leave_types;
CREATE POLICY "hr_leave_types write" ON public.hr_leave_types FOR ALL TO authenticated
  USING (public.hr_is_staff(company_id)) WITH CHECK (public.hr_is_staff(company_id));

-- Jours fériés : les nationaux sont lisibles par tous les connectés
DROP POLICY IF EXISTS "hr_holidays read" ON public.hr_holidays;
CREATE POLICY "hr_holidays read" ON public.hr_holidays FOR SELECT TO authenticated
  USING (company_id IS NULL OR public.hr_is_member(company_id));
DROP POLICY IF EXISTS "hr_holidays write" ON public.hr_holidays;
CREATE POLICY "hr_holidays write" ON public.hr_holidays FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.hr_is_staff(company_id))
  WITH CHECK (company_id IS NOT NULL AND public.hr_is_staff(company_id));

-- Demandes de congé : lecture seule en direct, écritures par les fonctions hr_*_leave
DROP POLICY IF EXISTS "hr_leave_requests read" ON public.hr_leave_requests;
CREATE POLICY "hr_leave_requests read" ON public.hr_leave_requests FOR SELECT TO authenticated
  USING (public.hr_is_staff(company_id) OR public.hr_is_manager_of(employee_id)
         OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.hr_leave_requests FROM anon, authenticated;

DROP POLICY IF EXISTS "hr_leave_adjustments read" ON public.hr_leave_adjustments;
CREATE POLICY "hr_leave_adjustments read" ON public.hr_leave_adjustments FOR SELECT TO authenticated
  USING (public.hr_is_staff(company_id) OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));
DROP POLICY IF EXISTS "hr_leave_adjustments write" ON public.hr_leave_adjustments;
CREATE POLICY "hr_leave_adjustments write" ON public.hr_leave_adjustments FOR INSERT TO authenticated
  WITH CHECK (public.hr_is_staff(company_id) AND created_by = auth.uid()
              AND EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.company_id = hr_leave_adjustments.company_id));

DROP POLICY IF EXISTS "hr_audit read" ON public.hr_audit_log;
CREATE POLICY "hr_audit read" ON public.hr_audit_log FOR SELECT TO authenticated USING (company_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.hr_audit_log FROM anon, authenticated;

-- =====================================================
-- 5. Déclencheurs : dates, liaison des comptes, journal
-- =====================================================
DROP TRIGGER IF EXISTS trg_hr_employees_updated ON public.hr_employees;
CREATE TRIGGER trg_hr_employees_updated BEFORE UPDATE ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Un employé saisi avec l'e-mail d'un compte ProJob existant est relié à ce compte.
CREATE OR REPLACE FUNCTION public.hr_link_employee_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.email := NULLIF(lower(trim(NEW.email)), '');
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT p.id INTO NEW.user_id FROM public.profiles p
    WHERE lower(p.email) = NEW.email AND p.user_type = 'candidate'
      AND NOT EXISTS (SELECT 1 FROM public.hr_employees x WHERE x.company_id = NEW.company_id AND x.user_id = p.id AND x.id <> NEW.id)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hr_link_employee ON public.hr_employees;
CREATE TRIGGER trg_hr_link_employee BEFORE INSERT OR UPDATE OF email ON public.hr_employees
  FOR EACH ROW EXECUTE FUNCTION public.hr_link_employee_account();

-- Un compte candidat créé plus tard avec cet e-mail est relié aux fiches qui l'attendent.
CREATE OR REPLACE FUNCTION public.hr_link_new_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.user_type = 'candidate' THEN
    UPDATE public.hr_employees e SET user_id = NEW.id
    WHERE e.user_id IS NULL AND e.email = lower(NEW.email)
      AND NOT EXISTS (SELECT 1 FROM public.hr_employees x WHERE x.company_id = e.company_id AND x.user_id = NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_hr_link_new_profile ON public.profiles;
CREATE TRIGGER trg_hr_link_new_profile AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.hr_link_new_profile();

CREATE OR REPLACE FUNCTION public.hr_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  INSERT INTO public.hr_audit_log (company_id, actor, table_name, row_id, action)
  VALUES (r.company_id, auth.uid(), TG_TABLE_NAME, r.id, lower(TG_OP));
  RETURN NULL;
END;
$$;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['hr_employees', 'hr_contracts', 'hr_leave_requests', 'hr_leave_adjustments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.hr_audit()', t, t);
  END LOOP;
END $$;

-- =====================================================
-- 6. Paramètres par défaut (types de congé, jours fériés nationaux)
-- =====================================================
-- Valeurs issues du Code du travail (L/2014/072/CNT) telles que publiées ; modifiables par l'entreprise.
CREATE OR REPLACE FUNCTION public.hr_ensure_setup(p_company UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (auth.uid() IS NULL OR public.hr_is_staff(p_company)) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  INSERT INTO public.hr_leave_types (company_id, code, name, is_paid, deducts_balance, monthly_accrual, requires_document, sort) VALUES
    (p_company, 'annuel', 'Congé annuel', TRUE, TRUE, 2.5, FALSE, 0),
    (p_company, 'maladie', 'Congé maladie', TRUE, FALSE, 0, TRUE, 1),
    (p_company, 'maternite', 'Congé de maternité', TRUE, FALSE, 0, TRUE, 2),
    (p_company, 'familial', 'Événement familial', TRUE, FALSE, 0, FALSE, 3),
    (p_company, 'sans_solde', 'Congé sans solde', FALSE, FALSE, 0, FALSE, 4),
    (p_company, 'absence', 'Absence autorisée', TRUE, FALSE, 0, FALSE, 5)
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.hr_ensure_setup(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_ensure_setup(UUID) TO authenticated;

-- Fêtes à date fixe pour 2026 et 2027 ; les fêtes religieuses (dates variables) s'ajoutent dans Paramètres.
INSERT INTO public.hr_holidays (company_id, day, name)
SELECT NULL, make_date(y, m, d), n
FROM (VALUES (1, 1, 'Jour de l''an'), (5, 1, 'Fête du Travail'), (8, 15, 'Assomption'),
             (10, 2, 'Fête de l''Indépendance'), (11, 1, 'Toussaint'), (12, 25, 'Noël')) AS f(m, d, n),
     (VALUES (2026), (2027)) AS yrs(y)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. Calculs : jours ouvrés et soldes
-- =====================================================
-- Jours ouvrés (lundi à vendredi) entre deux dates, hors jours fériés nationaux et de l'entreprise
CREATE OR REPLACE FUNCTION public.hr_working_days(p_company UUID, p_start DATE, p_end DATE)
RETURNS NUMERIC LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::NUMERIC FROM generate_series(p_start, p_end, INTERVAL '1 day') g(d)
  WHERE EXTRACT(ISODOW FROM g.d) < 6
    AND NOT EXISTS (SELECT 1 FROM public.hr_holidays h
                    WHERE h.day = g.d::date AND (h.company_id IS NULL OR h.company_id = p_company));
$$;
REVOKE ALL ON FUNCTION public.hr_working_days(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_working_days(UUID, DATE, DATE) TO authenticated;

-- Solde d'un type de congé : acquis (mois de service complets × taux) + ajustements − pris ou demandé
CREATE OR REPLACE FUNCTION public.hr_leave_balance_of(p_employee UUID, p_type UUID, p_exclude UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  e public.hr_employees%ROWTYPE;
  t public.hr_leave_types%ROWTYPE;
  v_months INT;
  v_acquired NUMERIC := 0;
  v_adjust NUMERIC := 0;
  v_taken NUMERIC := 0;
  v_pending NUMERIC := 0;
BEGIN
  SELECT * INTO e FROM public.hr_employees WHERE id = p_employee;
  SELECT * INTO t FROM public.hr_leave_types WHERE id = p_type AND company_id = e.company_id;
  IF e.id IS NULL OR t.id IS NULL THEN RETURN NULL; END IF;
  v_months := GREATEST(0, (EXTRACT(YEAR FROM age(LEAST(CURRENT_DATE, COALESCE(e.exit_date, CURRENT_DATE)), e.hire_date)) * 12
                          + EXTRACT(MONTH FROM age(LEAST(CURRENT_DATE, COALESCE(e.exit_date, CURRENT_DATE)), e.hire_date)))::INT);
  v_acquired := v_months * t.monthly_accrual;
  SELECT COALESCE(SUM(days), 0) INTO v_adjust FROM public.hr_leave_adjustments WHERE employee_id = p_employee AND leave_type_id = p_type;
  SELECT COALESCE(SUM(days) FILTER (WHERE status = 'approuvee'), 0),
         COALESCE(SUM(days) FILTER (WHERE status IN ('en_attente', 'validee_responsable')), 0)
    INTO v_taken, v_pending
  FROM public.hr_leave_requests
  WHERE employee_id = p_employee AND leave_type_id = p_type AND (p_exclude IS NULL OR id <> p_exclude);
  RETURN jsonb_build_object(
    'leave_type_id', t.id, 'code', t.code, 'name', t.name, 'deducts_balance', t.deducts_balance,
    'months', v_months, 'acquired', v_acquired, 'adjustments', v_adjust, 'taken', v_taken, 'pending', v_pending,
    'available', CASE WHEN t.deducts_balance THEN v_acquired + v_adjust - v_taken - v_pending END);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_leave_balance_of(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;

-- Soldes d'un employé (lui-même, son responsable ou le staff)
CREATE OR REPLACE FUNCTION public.hr_leave_balances(p_employee UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company UUID; v_user UUID;
BEGIN
  SELECT company_id, user_id INTO v_company, v_user FROM public.hr_employees WHERE id = p_employee;
  IF v_company IS NULL THEN RETURN '[]'::jsonb; END IF;
  IF NOT (public.hr_is_staff(v_company) OR public.hr_is_manager_of(p_employee) OR (v_user = auth.uid() AND public.hr_enabled(v_company))) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  RETURN COALESCE((SELECT jsonb_agg(public.hr_leave_balance_of(p_employee, t.id) ORDER BY t.sort)
                   FROM public.hr_leave_types t WHERE t.company_id = v_company AND t.is_active), '[]'::jsonb);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_leave_balances(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_leave_balances(UUID) TO authenticated;

-- =====================================================
-- 8. Demandes de congé : dépôt, décision, annulation
-- =====================================================
CREATE OR REPLACE FUNCTION public.hr_notify(p_user UUID, p_title TEXT, p_message TEXT, p_link TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT p_user, 'system', p_title, p_message, p_link WHERE p_user IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.hr_notify(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- Prévient le compte entreprise et tous les gestionnaires RH
CREATE OR REPLACE FUNCTION public.hr_notify_staff(p_company UUID, p_title TEXT, p_message TEXT, p_link TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT u, 'system', p_title, p_message, p_link
  FROM (SELECT p_company AS u UNION SELECT m.user_id FROM public.hr_members m WHERE m.company_id = p_company) x
  WHERE u IS DISTINCT FROM auth.uid();
$$;
REVOKE ALL ON FUNCTION public.hr_notify_staff(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hr_fmt_period(p_start DATE, p_end DATE)
RETURNS TEXT LANGUAGE sql IMMUTABLE
AS $$ SELECT CASE WHEN p_start = p_end THEN 'le ' || to_char(p_start, 'DD/MM/YYYY')
                  ELSE 'du ' || to_char(p_start, 'DD/MM/YYYY') || ' au ' || to_char(p_end, 'DD/MM/YYYY') END; $$;

-- Dépôt : par l'employé pour lui-même (p_employee NULL), ou par le staff pour un employé (approuvé d'office)
CREATE OR REPLACE FUNCTION public.hr_request_leave(
  p_company UUID, p_leave_type UUID, p_start DATE, p_end DATE,
  p_reason TEXT DEFAULT NULL, p_employee UUID DEFAULT NULL, p_source TEXT DEFAULT 'web')
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_staff BOOLEAN := public.hr_is_staff(p_company);
  v_emp public.hr_employees%ROWTYPE;
  v_type public.hr_leave_types%ROWTYPE;
  v_days NUMERIC;
  v_bal JSONB;
  v_status TEXT;
  v_id UUID;
  v_manager_user UUID;
  v_name TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.hr_enabled(p_company) THEN RAISE EXCEPTION 'sirh_disabled'; END IF;
  IF p_employee IS NOT NULL AND v_staff THEN
    SELECT * INTO v_emp FROM public.hr_employees WHERE id = p_employee AND company_id = p_company;
  ELSE
    SELECT * INTO v_emp FROM public.hr_employees WHERE id = public.hr_my_employee_id(p_company);
  END IF;
  IF v_emp.id IS NULL THEN RAISE EXCEPTION 'employee_not_found'; END IF;
  IF v_emp.status = 'sorti' THEN RAISE EXCEPTION 'employee_left'; END IF;

  SELECT * INTO v_type FROM public.hr_leave_types WHERE id = p_leave_type AND company_id = p_company AND is_active;
  IF v_type.id IS NULL THEN RAISE EXCEPTION 'leave_type_not_found'; END IF;
  IF p_end < p_start THEN RAISE EXCEPTION 'invalid_dates'; END IF;
  IF p_end - p_start > 366 THEN RAISE EXCEPTION 'too_long'; END IF;
  IF p_start < CURRENT_DATE - 60 AND NOT v_staff THEN RAISE EXCEPTION 'too_old'; END IF;

  v_days := public.hr_working_days(p_company, p_start, p_end);
  IF v_days <= 0 THEN RAISE EXCEPTION 'no_working_day'; END IF;

  IF EXISTS (SELECT 1 FROM public.hr_leave_requests r
             WHERE r.employee_id = v_emp.id AND r.status IN ('en_attente', 'validee_responsable', 'approuvee')
               AND r.start_date <= p_end AND r.end_date >= p_start) THEN
    RAISE EXCEPTION 'overlap';
  END IF;

  IF v_type.deducts_balance THEN
    v_bal := public.hr_leave_balance_of(v_emp.id, v_type.id);
    IF (v_bal->>'available')::NUMERIC < v_days THEN
      RAISE EXCEPTION 'insufficient_balance:%', (v_bal->>'available');
    END IF;
  END IF;

  SELECT m.user_id INTO v_manager_user FROM public.hr_employees m WHERE m.id = v_emp.manager_id AND m.status <> 'sorti';
  v_status := CASE WHEN v_staff AND p_employee IS NOT NULL THEN 'approuvee'
                   WHEN v_manager_user IS NOT NULL AND v_manager_user <> auth.uid() THEN 'en_attente'
                   ELSE 'validee_responsable' END;

  INSERT INTO public.hr_leave_requests (company_id, employee_id, leave_type_id, start_date, end_date, days, reason, status, source, created_by,
                                        hr_decided_by, hr_decided_at)
  VALUES (p_company, v_emp.id, v_type.id, p_start, p_end, v_days, NULLIF(trim(p_reason), ''), v_status,
          CASE WHEN v_staff AND p_employee IS NOT NULL THEN 'rh' ELSE COALESCE(NULLIF(p_source, ''), 'web') END, auth.uid(),
          CASE WHEN v_status = 'approuvee' THEN auth.uid() END, CASE WHEN v_status = 'approuvee' THEN NOW() END)
  RETURNING id INTO v_id;

  v_name := v_emp.first_name || ' ' || v_emp.last_name;
  IF v_status = 'en_attente' THEN
    PERFORM public.hr_notify(v_manager_user, 'Demande de congé à valider',
      format('%s demande %s (%s jour%s ouvré%s, %s).', v_name, lower(v_type.name), v_days, CASE WHEN v_days > 1 THEN 's' ELSE '' END,
             CASE WHEN v_days > 1 THEN 's' ELSE '' END, public.hr_fmt_period(p_start, p_end)), '/mon-espace-rh');
  ELSIF v_status = 'validee_responsable' THEN
    PERFORM public.hr_notify_staff(p_company, 'Demande de congé à approuver',
      format('%s demande %s (%s jour%s ouvré%s, %s).', v_name, lower(v_type.name), v_days, CASE WHEN v_days > 1 THEN 's' ELSE '' END,
             CASE WHEN v_days > 1 THEN 's' ELSE '' END, public.hr_fmt_period(p_start, p_end)), '/rh/conges');
  ELSIF v_emp.user_id IS NOT NULL THEN
    PERFORM public.hr_notify(v_emp.user_id, 'Congé enregistré',
      format('%s enregistré %s par les RH.', v_type.name, public.hr_fmt_period(p_start, p_end)), '/mon-espace-rh');
  END IF;

  RETURN jsonb_build_object('id', v_id, 'status', v_status, 'days', v_days);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_request_leave(UUID, UUID, DATE, DATE, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_request_leave(UUID, UUID, DATE, DATE, TEXT, UUID, TEXT) TO authenticated;

-- Décision : le responsable fait le 1er niveau, le staff valide le 2e (ou les deux d'un coup)
CREATE OR REPLACE FUNCTION public.hr_decide_leave(p_request UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.hr_leave_requests%ROWTYPE;
  v_emp public.hr_employees%ROWTYPE;
  v_type TEXT;
  v_staff BOOLEAN;
  v_manager BOOLEAN;
  v_new TEXT;
  v_bal JSONB;
BEGIN
  SELECT * INTO r FROM public.hr_leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'request_not_found'; END IF;
  SELECT * INTO v_emp FROM public.hr_employees WHERE id = r.employee_id;
  SELECT name INTO v_type FROM public.hr_leave_types WHERE id = r.leave_type_id;
  v_staff := public.hr_is_staff(r.company_id);
  v_manager := public.hr_is_manager_of(r.employee_id);
  IF v_emp.user_id = auth.uid() AND NOT v_staff THEN RAISE EXCEPTION 'not_allowed'; END IF;

  IF r.status = 'en_attente' AND (v_manager OR v_staff) THEN
    v_new := CASE WHEN NOT p_approve THEN 'refusee' WHEN v_staff THEN 'approuvee' ELSE 'validee_responsable' END;
  ELSIF r.status = 'validee_responsable' AND v_staff THEN
    v_new := CASE WHEN p_approve THEN 'approuvee' ELSE 'refusee' END;
  ELSE
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF v_new = 'approuvee' AND EXISTS (SELECT 1 FROM public.hr_leave_types t WHERE t.id = r.leave_type_id AND t.deducts_balance) THEN
    v_bal := public.hr_leave_balance_of(r.employee_id, r.leave_type_id, r.id);
    IF (v_bal->>'available')::NUMERIC < r.days THEN RAISE EXCEPTION 'insufficient_balance:%', (v_bal->>'available'); END IF;
  END IF;

  UPDATE public.hr_leave_requests SET
    status = v_new,
    decision_note = COALESCE(NULLIF(trim(p_note), ''), decision_note),
    manager_decided_by = CASE WHEN r.status = 'en_attente' AND NOT v_staff THEN auth.uid() ELSE manager_decided_by END,
    manager_decided_at = CASE WHEN r.status = 'en_attente' AND NOT v_staff THEN NOW() ELSE manager_decided_at END,
    hr_decided_by = CASE WHEN v_staff THEN auth.uid() ELSE hr_decided_by END,
    hr_decided_at = CASE WHEN v_staff THEN NOW() ELSE hr_decided_at END
  WHERE id = r.id;

  IF v_new = 'validee_responsable' THEN
    PERFORM public.hr_notify_staff(r.company_id, 'Congé validé par le responsable',
      format('%s %s : %s, à approuver par les RH.', v_emp.first_name, v_emp.last_name, public.hr_fmt_period(r.start_date, r.end_date)), '/rh/conges');
  ELSE
    PERFORM public.hr_notify(v_emp.user_id,
      CASE WHEN v_new = 'approuvee' THEN 'Congé approuvé' ELSE 'Congé refusé' END,
      format('%s %s %s.%s', v_type, public.hr_fmt_period(r.start_date, r.end_date),
             CASE WHEN v_new = 'approuvee' THEN 'est approuvé' ELSE 'n''a pas été accepté' END,
             CASE WHEN NULLIF(trim(p_note), '') IS NOT NULL THEN ' Motif : ' || trim(p_note) ELSE '' END), '/mon-espace-rh');
  END IF;
  RETURN jsonb_build_object('id', r.id, 'status', v_new);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_decide_leave(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_decide_leave(UUID, BOOLEAN, TEXT) TO authenticated;

-- Annulation : l'employé tant que ce n'est pas commencé, le staff à tout moment
CREATE OR REPLACE FUNCTION public.hr_cancel_leave(p_request UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.hr_leave_requests%ROWTYPE; v_own BOOLEAN; v_staff BOOLEAN;
BEGIN
  SELECT * INTO r FROM public.hr_leave_requests WHERE id = p_request FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'request_not_found'; END IF;
  v_staff := public.hr_is_staff(r.company_id);
  v_own := EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = r.employee_id AND e.user_id = auth.uid());
  IF r.status IN ('refusee', 'annulee') THEN RAISE EXCEPTION 'already_closed'; END IF;
  IF NOT (v_staff OR (v_own AND (r.status <> 'approuvee' OR r.start_date > CURRENT_DATE))) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE public.hr_leave_requests SET status = 'annulee' WHERE id = r.id;
  IF v_own AND r.status = 'approuvee' THEN
    PERFORM public.hr_notify_staff(r.company_id, 'Congé annulé par l''employé',
      format('Un congé approuvé %s a été annulé.', public.hr_fmt_period(r.start_date, r.end_date)), '/rh/conges');
  END IF;
  RETURN jsonb_build_object('id', r.id, 'status', 'annulee');
END;
$$;
REVOKE ALL ON FUNCTION public.hr_cancel_leave(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_cancel_leave(UUID) TO authenticated;

-- =====================================================
-- 9. Embauche depuis une candidature ProJob
-- =====================================================
CREATE OR REPLACE FUNCTION public.hr_hire_from_application(
  p_application UUID, p_hire_date DATE DEFAULT CURRENT_DATE, p_contract_type TEXT DEFAULT 'CDI',
  p_salary NUMERIC DEFAULT NULL, p_department UUID DEFAULT NULL, p_trial_end DATE DEFAULT NULL, p_end_date DATE DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  a RECORD;
  v_emp UUID;
  v_first TEXT;
  v_last TEXT;
BEGIN
  SELECT ap.id, ap.candidate_id, j.company_id, j.title, j.job_type, p.full_name, p.email, p.phone, cp.location, c.company_name
    INTO a
  FROM public.applications ap
  JOIN public.jobs j ON j.id = ap.job_id
  JOIN public.profiles p ON p.id = ap.candidate_id
  LEFT JOIN public.candidate_profiles cp ON cp.id = ap.candidate_id
  LEFT JOIN public.company_profiles c ON c.id = j.company_id
  WHERE ap.id = p_application;
  IF a.id IS NULL THEN RAISE EXCEPTION 'application_not_found'; END IF;
  IF NOT public.hr_is_staff(a.company_id) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.company_id = a.company_id AND e.user_id = a.candidate_id AND e.status <> 'sorti') THEN
    RAISE EXCEPTION 'already_employee';
  END IF;
  IF p_department IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.hr_departments d WHERE d.id = p_department AND d.company_id = a.company_id) THEN
    RAISE EXCEPTION 'department_not_found';
  END IF;

  v_first := split_part(trim(a.full_name), ' ', 1);
  v_last := NULLIF(trim(substr(trim(a.full_name), length(v_first) + 1)), '');

  INSERT INTO public.hr_employees (company_id, user_id, application_id, first_name, last_name, email, phone, address, job_title,
                                   department_id, hire_date, status)
  VALUES (a.company_id, a.candidate_id, a.id, v_first, COALESCE(v_last, '-'), lower(a.email), a.phone, a.location, a.title,
          p_department, COALESCE(p_hire_date, CURRENT_DATE), CASE WHEN p_trial_end IS NOT NULL THEN 'essai' ELSE 'actif' END)
  RETURNING id INTO v_emp;

  INSERT INTO public.hr_contracts (company_id, employee_id, contract_type, job_title, start_date, end_date, trial_end_date, base_salary_gnf)
  VALUES (a.company_id, v_emp, COALESCE(p_contract_type, 'CDI'), a.title, COALESCE(p_hire_date, CURRENT_DATE), p_end_date, p_trial_end, p_salary);

  UPDATE public.applications SET status = 'accepted', updated_at = NOW() WHERE id = a.id AND status <> 'accepted';

  PERFORM public.hr_ensure_setup(a.company_id);
  PERFORM public.hr_notify(a.candidate_id, 'Bienvenue dans l''équipe !',
    format('%s vous a ajouté à son équipe au poste de %s. Retrouvez vos congés et votre dossier dans votre espace employé.',
           COALESCE(a.company_name, 'L''entreprise'), a.title), '/mon-espace-rh');
  RETURN jsonb_build_object('employee_id', v_emp);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_hire_from_application(UUID, DATE, TEXT, NUMERIC, UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_hire_from_application(UUID, DATE, TEXT, NUMERIC, UUID, DATE, DATE) TO authenticated;

-- =====================================================
-- 10. Équipe RH : ajouter un gestionnaire par e-mail
-- =====================================================
CREATE OR REPLACE FUNCTION public.hr_add_member(p_email TEXT)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user UUID; v_name TEXT; v_company TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.hr_enabled(auth.uid()) OR NOT EXISTS (SELECT 1 FROM public.company_profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;
  SELECT id, full_name INTO v_user, v_name FROM public.profiles WHERE lower(email) = lower(trim(p_email)) AND user_type = 'candidate';
  IF v_user IS NULL THEN RAISE EXCEPTION 'account_not_found'; END IF;
  INSERT INTO public.hr_members (company_id, user_id) VALUES (auth.uid(), v_user) ON CONFLICT DO NOTHING;
  SELECT company_name INTO v_company FROM public.company_profiles WHERE id = auth.uid();
  PERFORM public.hr_notify(v_user, 'Accès RH ProJob+',
    format('%s vous a donné accès à sa gestion RH sur ProJob+.', COALESCE(v_company, 'Une entreprise')), '/mon-espace-rh');
  RETURN jsonb_build_object('user_id', v_user, 'full_name', v_name);
END;
$$;
REVOKE ALL ON FUNCTION public.hr_add_member(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_add_member(TEXT) TO authenticated;

-- Liste de l'équipe RH avec noms (le staff ne peut pas lire les profils des autres directement)
CREATE OR REPLACE FUNCTION public.hr_list_members(p_company UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, email TEXT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.user_id, p.full_name, p.email, m.role, m.created_at
  FROM public.hr_members m JOIN public.profiles p ON p.id = m.user_id
  WHERE m.company_id = p_company AND public.hr_is_staff(p_company)
  ORDER BY m.created_at;
$$;
REVOKE ALL ON FUNCTION public.hr_list_members(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_list_members(UUID) TO authenticated;

-- =====================================================
-- 11. Espaces de l'utilisateur connecté (pour l'interface)
-- =====================================================
-- Entreprises où l'utilisateur est staff ou employé, avec son rôle
CREATE OR REPLACE FUNCTION public.hr_my_workspaces()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'company_id', c.id, 'company_name', c.company_name, 'logo_url', c.logo_url,
           'role', public.hr_role(c.id), 'employee_id', public.hr_my_employee_id(c.id),
           'enabled', public.hr_enabled(c.id)) ORDER BY c.company_name), '[]'::jsonb)
  FROM public.company_profiles c
  WHERE auth.uid() IS NOT NULL AND (
    c.id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.hr_members m WHERE m.company_id = c.id AND m.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.company_id = c.id AND e.user_id = auth.uid() AND e.status <> 'sorti'));
$$;
REVOKE ALL ON FUNCTION public.hr_my_workspaces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_my_workspaces() TO authenticated;

-- Tableau de bord RH : chiffres du jour
CREATE OR REPLACE FUNCTION public.hr_dashboard(p_company UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.hr_is_staff(p_company) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  RETURN jsonb_build_object(
    'headcount', (SELECT COUNT(*) FROM public.hr_employees WHERE company_id = p_company AND status IN ('actif', 'essai')),
    'on_trial', (SELECT COUNT(*) FROM public.hr_employees WHERE company_id = p_company AND status = 'essai'),
    'with_account', (SELECT COUNT(*) FROM public.hr_employees WHERE company_id = p_company AND status <> 'sorti' AND user_id IS NOT NULL),
    'on_leave_today', (SELECT COUNT(DISTINCT employee_id) FROM public.hr_leave_requests
                       WHERE company_id = p_company AND status = 'approuvee' AND CURRENT_DATE BETWEEN start_date AND end_date),
    'pending_requests', (SELECT COUNT(*) FROM public.hr_leave_requests WHERE company_id = p_company AND status IN ('en_attente', 'validee_responsable')),
    'to_approve', (SELECT COUNT(*) FROM public.hr_leave_requests WHERE company_id = p_company AND status = 'validee_responsable'),
    'contracts_ending', (SELECT COALESCE(jsonb_agg(jsonb_build_object('employee_id', e.id, 'name', e.first_name || ' ' || e.last_name,
                                  'contract_type', k.contract_type, 'end_date', k.end_date) ORDER BY k.end_date), '[]'::jsonb)
                         FROM public.hr_contracts k JOIN public.hr_employees e ON e.id = k.employee_id
                         WHERE k.company_id = p_company AND k.is_current AND e.status <> 'sorti'
                           AND k.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),
    'trials_ending', (SELECT COALESCE(jsonb_agg(jsonb_build_object('employee_id', e.id, 'name', e.first_name || ' ' || e.last_name,
                                  'trial_end_date', k.trial_end_date) ORDER BY k.trial_end_date), '[]'::jsonb)
                      FROM public.hr_contracts k JOIN public.hr_employees e ON e.id = k.employee_id
                      WHERE k.company_id = p_company AND k.is_current AND e.status <> 'sorti'
                        AND k.trial_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30),
    'absent_today', (SELECT COALESCE(jsonb_agg(jsonb_build_object('employee_id', e.id, 'name', e.first_name || ' ' || e.last_name,
                                  'type', t.name, 'end_date', r.end_date) ORDER BY e.last_name), '[]'::jsonb)
                     FROM public.hr_leave_requests r JOIN public.hr_employees e ON e.id = r.employee_id
                     JOIN public.hr_leave_types t ON t.id = r.leave_type_id
                     WHERE r.company_id = p_company AND r.status = 'approuvee' AND CURRENT_DATE BETWEEN r.start_date AND r.end_date)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.hr_dashboard(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hr_dashboard(UUID) TO authenticated;

-- =====================================================
-- 12. Bot WhatsApp (fonction bot-api, clé service_role uniquement)
-- =====================================================
-- Le bot agit au nom de l'utilisateur relié à son numéro : on fixe auth.uid() pour la transaction,
-- puis on appelle les mêmes fonctions que le site (mêmes contrôles de rôle et de solde).
CREATE OR REPLACE FUNCTION public.hr_bot_act_as(p_user UUID)
RETURNS VOID LANGUAGE sql VOLATILE
AS $$ SELECT set_config('request.jwt.claim.sub', p_user::text, true); $$;
REVOKE ALL ON FUNCTION public.hr_bot_act_as(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hr_bot_summary(p_user UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  w JSONB;
  v_out JSONB := '[]'::jsonb;
  v_company UUID;
  v_emp UUID;
  v_staff BOOLEAN;
BEGIN
  PERFORM public.hr_bot_act_as(p_user);
  FOR w IN SELECT * FROM jsonb_array_elements(public.hr_my_workspaces()) LOOP
    v_company := (w->>'company_id')::uuid;
    v_emp := NULLIF(w->>'employee_id', '')::uuid;
    v_staff := w->>'role' IN ('admin', 'rh');
    IF NOT (w->>'enabled')::boolean OR (v_emp IS NULL AND NOT v_staff) THEN CONTINUE; END IF;
    v_out := v_out || jsonb_build_object(
      'company_id', v_company, 'company_name', w->>'company_name', 'role', w->>'role',
      'leave_types', (SELECT COALESCE(jsonb_agg(jsonb_build_object('code', t.code, 'name', t.name, 'paid', t.is_paid) ORDER BY t.sort), '[]'::jsonb)
                      FROM public.hr_leave_types t WHERE t.company_id = v_company AND t.is_active),
      'balances', CASE WHEN v_emp IS NULL THEN '[]'::jsonb ELSE
                    (SELECT COALESCE(jsonb_agg(jsonb_build_object('type', b->>'name', 'available_days', (b->>'available')::numeric,
                                                                  'pending_days', (b->>'pending')::numeric)), '[]'::jsonb)
                     FROM jsonb_array_elements(public.hr_leave_balances(v_emp)) b WHERE (b->>'deducts_balance')::boolean) END,
      'my_requests', CASE WHEN v_emp IS NULL THEN '[]'::jsonb ELSE
                    (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'start'), '[]'::jsonb) FROM (
                       SELECT jsonb_build_object('request_id', r.id, 'type', t.name, 'start', r.start_date, 'end', r.end_date, 'days', r.days,
                                                 'status', r.status, 'note', r.decision_note) x
                       FROM public.hr_leave_requests r JOIN public.hr_leave_types t ON t.id = r.leave_type_id
                       WHERE r.employee_id = v_emp AND (r.end_date >= CURRENT_DATE - 30 OR r.status IN ('en_attente', 'validee_responsable'))
                       ORDER BY r.start_date DESC LIMIT 6) s) END,
      'to_decide', (SELECT COALESCE(jsonb_agg(jsonb_build_object('request_id', r.id, 'employee', e.first_name || ' ' || e.last_name,
                                  'type', t.name, 'start', r.start_date, 'end', r.end_date, 'days', r.days, 'reason', r.reason, 'status', r.status)
                                  ORDER BY r.start_date), '[]'::jsonb)
                    FROM public.hr_leave_requests r JOIN public.hr_employees e ON e.id = r.employee_id JOIN public.hr_leave_types t ON t.id = r.leave_type_id
                    WHERE r.company_id = v_company AND r.employee_id IS DISTINCT FROM v_emp
                      AND ((r.status = 'en_attente' AND (v_staff OR public.hr_is_manager_of(r.employee_id)))
                        OR (r.status = 'validee_responsable' AND v_staff)))
    );
  END LOOP;
  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_bot_request_leave(p_user UUID, p_company UUID, p_type_code TEXT, p_start DATE, p_end DATE, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_type UUID;
BEGIN
  PERFORM public.hr_bot_act_as(p_user);
  SELECT id INTO v_type FROM public.hr_leave_types WHERE company_id = p_company AND is_active
    AND (code = lower(trim(p_type_code)) OR lower(name) = lower(trim(p_type_code))) LIMIT 1;
  IF v_type IS NULL THEN RAISE EXCEPTION 'leave_type_not_found'; END IF;
  RETURN public.hr_request_leave(p_company, v_type, p_start, p_end, p_reason, NULL, 'whatsapp');
END;
$$;

CREATE OR REPLACE FUNCTION public.hr_bot_decide(p_user UUID, p_request UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public.hr_bot_act_as(p_user); RETURN public.hr_decide_leave(p_request, p_approve, p_note); END; $$;

CREATE OR REPLACE FUNCTION public.hr_bot_cancel(p_user UUID, p_request UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$ BEGIN PERFORM public.hr_bot_act_as(p_user); RETURN public.hr_cancel_leave(p_request); END; $$;

DO $$
DECLARE f TEXT;
BEGIN
  FOREACH f IN ARRAY ARRAY['hr_bot_summary(uuid)', 'hr_bot_request_leave(uuid, uuid, text, date, date, text)',
                           'hr_bot_decide(uuid, uuid, boolean, text)', 'hr_bot_cancel(uuid, uuid)', 'hr_bot_act_as(uuid)'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;
