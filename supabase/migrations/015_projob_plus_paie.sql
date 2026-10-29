-- Migration 015 : ProJob+ (SIRH) — étape 2 : la paie
-- Paramètres de paie par entreprise, paies mensuelles, bulletins, états CNSS et impôt.
-- À exécuter dans Supabase → SQL Editor, après la migration 014. Peut être relancée sans risque.
--
-- Taux par défaut validés par le comptable (octobre 2026), tous modifiables dans ProJob+ → Paie → Paramètres :
--   CNSS salarié 5 %, CNSS employeur 18 %, plafond 2 500 000 GNF/mois, plancher 550 000 GNF/mois
--   Retenue sur salaire (RTS), barème mensuel : 0 % jusqu'à 1 000 000 ; 5 % jusqu'à 5 M ; 10 % jusqu'à 10 M ; 15 % jusqu'à 20 M ; 20 % au-delà
--   Taxe d'apprentissage 2 % (employeur), heures supplémentaires +15 % / +25 % (dimanche, nuit) / +50 % (férié)

-- La paie fait partie de ProJob+
UPDATE public.plans SET features = array_append(features, 'payroll')
WHERE id = 'entreprise_plus' AND NOT ('payroll' = ANY (features));
UPDATE public.plans SET perks = perks || '["Paie : bulletins, CNSS, retenue sur salaire, états mensuels"]'::jsonb
WHERE id = 'entreprise_plus' AND NOT perks @> '["Paie : bulletins, CNSS, retenue sur salaire, états mensuels"]'::jsonb;

-- =====================================================
-- 1. Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  company_id UUID PRIMARY KEY REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  cnss_employee_rate NUMERIC(5, 2) NOT NULL DEFAULT 5,
  cnss_employer_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
  cnss_ceiling NUMERIC(14, 0) NOT NULL DEFAULT 2500000,
  cnss_floor NUMERIC(14, 0) NOT NULL DEFAULT 550000,
  rts_brackets JSONB NOT NULL DEFAULT '[{"upto":1000000,"rate":0},{"upto":5000000,"rate":5},{"upto":10000000,"rate":10},{"upto":20000000,"rate":15},{"upto":null,"rate":20}]',
  rts_deduct_cnss BOOLEAN NOT NULL DEFAULT TRUE,      -- la part salariale CNSS est retirée de la base imposable
  apprenticeship_rate NUMERIC(5, 2) NOT NULL DEFAULT 2,
  other_employer_rate NUMERIC(5, 2) NOT NULL DEFAULT 0, -- autre taxe patronale éventuelle (ex. versement forfaitaire)
  overtime_weekday_rate NUMERIC(5, 2) NOT NULL DEFAULT 15,
  overtime_sunday_rate NUMERIC(5, 2) NOT NULL DEFAULT 25,
  overtime_night_rate NUMERIC(5, 2) NOT NULL DEFAULT 25,
  overtime_holiday_rate NUMERIC(5, 2) NOT NULL DEFAULT 50,
  monthly_hours NUMERIC(6, 2) NOT NULL DEFAULT 173.33,   -- 40 h × 52 semaines ÷ 12
  cnss_number TEXT,                                     -- numéro d'immatriculation employeur
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS cnss_number TEXT;
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS payment_method TEXT;  -- virement, Orange Money, espèces…
ALTER TABLE public.hr_employees ADD COLUMN IF NOT EXISTS payment_account TEXT;

CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  period DATE NOT NULL CHECK (EXTRACT(DAY FROM period) = 1),  -- premier jour du mois
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'cloturee')),
  settings JSONB,                                           -- taux figés à la clôture
  created_by UUID REFERENCES public.profiles(id),
  closed_by UUID REFERENCES public.profiles(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, period)
);

CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.hr_employees(id) ON DELETE CASCADE,
  -- Saisies
  base_salary NUMERIC(14, 0) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  unpaid_days NUMERIC(5, 1) NOT NULL DEFAULT 0 CHECK (unpaid_days >= 0),
  month_working_days NUMERIC(5, 1) NOT NULL DEFAULT 22 CHECK (month_working_days > 0),
  ot_weekday_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (ot_weekday_hours >= 0),
  ot_sunday_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (ot_sunday_hours >= 0),
  ot_night_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (ot_night_hours >= 0),
  ot_holiday_hours NUMERIC(6, 2) NOT NULL DEFAULT 0 CHECK (ot_holiday_hours >= 0),
  bonuses JSONB NOT NULL DEFAULT '[]',     -- [{label, amount, taxable, cnss}] : primes et indemnités
  deductions JSONB NOT NULL DEFAULT '[]',  -- [{label, amount}] : avances, prêts… (après impôt)
  note TEXT,
  -- Calculs (remplis par le déclencheur payroll_compute)
  absence_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  overtime_amount NUMERIC(14, 0) NOT NULL DEFAULT 0,
  bonuses_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  gross NUMERIC(14, 0) NOT NULL DEFAULT 0,
  cnss_base NUMERIC(14, 0) NOT NULL DEFAULT 0,
  cnss_employee NUMERIC(14, 0) NOT NULL DEFAULT 0,
  cnss_employer NUMERIC(14, 0) NOT NULL DEFAULT 0,
  taxable NUMERIC(14, 0) NOT NULL DEFAULT 0,
  rts NUMERIC(14, 0) NOT NULL DEFAULT 0,
  deductions_total NUMERIC(14, 0) NOT NULL DEFAULT 0,
  net NUMERIC(14, 0) NOT NULL DEFAULT 0,
  apprenticeship NUMERIC(14, 0) NOT NULL DEFAULT 0,
  other_employer NUMERIC(14, 0) NOT NULL DEFAULT 0,
  employer_cost NUMERIC(14, 0) NOT NULL DEFAULT 0,
  -- Copie des informations de l'employé au moment de la paie
  snapshot JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON public.payslips (employee_id);

-- =====================================================
-- 2. Accès
-- =====================================================
CREATE OR REPLACE FUNCTION public.payroll_enabled(p_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_feature(p_company, 'payroll'); $$;

-- Staff RH avec la paie active
CREATE OR REPLACE FUNCTION public.payroll_is_staff(p_company UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.hr_is_staff(p_company) AND public.payroll_enabled(p_company); $$;

REVOKE ALL ON FUNCTION public.payroll_enabled(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.payroll_is_staff(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_enabled(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_is_staff(UUID) TO authenticated;

-- Fonctions sans RLS pour éviter la récursion entre les règles des paies et des bulletins
CREATE OR REPLACE FUNCTION public.payroll_run_closed(p_run UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.payroll_runs WHERE id = p_run AND status = 'cloturee'); $$;
CREATE OR REPLACE FUNCTION public.payroll_run_has_my_slip(p_run UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.payslips s JOIN public.hr_employees e ON e.id = s.employee_id
                 WHERE s.run_id = p_run AND e.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.payroll_run_closed(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.payroll_run_has_my_slip(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_run_closed(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.payroll_run_has_my_slip(UUID) TO authenticated;

ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_settings staff" ON public.payroll_settings;
CREATE POLICY "payroll_settings staff" ON public.payroll_settings FOR ALL TO authenticated
  USING (public.payroll_is_staff(company_id)) WITH CHECK (public.payroll_is_staff(company_id));

DROP POLICY IF EXISTS "payroll_runs read" ON public.payroll_runs;
CREATE POLICY "payroll_runs read" ON public.payroll_runs FOR SELECT TO authenticated
  USING (public.payroll_is_staff(company_id) OR (status = 'cloturee' AND public.payroll_run_has_my_slip(id)));
REVOKE INSERT, UPDATE, DELETE ON public.payroll_runs FROM anon, authenticated;
GRANT DELETE ON public.payroll_runs TO authenticated;
DROP POLICY IF EXISTS "payroll_runs delete draft" ON public.payroll_runs;
CREATE POLICY "payroll_runs delete draft" ON public.payroll_runs FOR DELETE TO authenticated
  USING (status = 'brouillon' AND public.payroll_is_staff(company_id));

-- Bulletins : le staff voit et modifie (tant que la paie n'est pas clôturée) ; l'employé voit ses bulletins clôturés
DROP POLICY IF EXISTS "payslips read" ON public.payslips;
CREATE POLICY "payslips read" ON public.payslips FOR SELECT TO authenticated
  USING (public.payroll_is_staff(company_id)
         OR (EXISTS (SELECT 1 FROM public.hr_employees e WHERE e.id = employee_id AND e.user_id = auth.uid())
             AND public.payroll_run_closed(run_id)));
DROP POLICY IF EXISTS "payslips update" ON public.payslips;
CREATE POLICY "payslips update" ON public.payslips FOR UPDATE TO authenticated
  USING (public.payroll_is_staff(company_id)) WITH CHECK (public.payroll_is_staff(company_id));
REVOKE INSERT, DELETE ON public.payslips FROM anon, authenticated;
-- Les montants calculés ne sont jamais écrits par le navigateur : seules les saisies sont modifiables
REVOKE UPDATE ON public.payslips FROM anon, authenticated;
GRANT UPDATE (base_salary, unpaid_days, ot_weekday_hours, ot_sunday_hours, ot_night_hours, ot_holiday_hours, bonuses, deductions, note)
  ON public.payslips TO authenticated;

-- =====================================================
-- 3. Calcul d'un bulletin
-- =====================================================
CREATE OR REPLACE FUNCTION public.payroll_settings_of(p_company UUID)
RETURNS public.payroll_settings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.payroll_settings%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.payroll_settings WHERE company_id = p_company;
  IF s.company_id IS NULL THEN
    INSERT INTO public.payroll_settings (company_id) VALUES (p_company) ON CONFLICT DO NOTHING;
    SELECT * INTO s FROM public.payroll_settings WHERE company_id = p_company;
  END IF;
  RETURN s;
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_settings_of(UUID) FROM PUBLIC, anon, authenticated;

-- Retenue sur salaire selon le barème progressif mensuel
CREATE OR REPLACE FUNCTION public.payroll_rts(p_taxable NUMERIC, p_brackets JSONB)
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE b JSONB; v_low NUMERIC := 0; v_up NUMERIC; v_tax NUMERIC := 0;
BEGIN
  IF p_taxable <= 0 THEN RETURN 0; END IF;
  FOR b IN SELECT * FROM jsonb_array_elements(p_brackets) LOOP
    v_up := NULLIF(b->>'upto', '')::NUMERIC;
    IF v_up IS NULL OR p_taxable < v_up THEN
      v_tax := v_tax + (p_taxable - v_low) * (b->>'rate')::NUMERIC / 100;
      RETURN round(v_tax);
    END IF;
    v_tax := v_tax + (v_up - v_low) * (b->>'rate')::NUMERIC / 100;
    v_low := v_up;
  END LOOP;
  RETURN round(v_tax);
END;
$$;

CREATE OR REPLACE FUNCTION public.payroll_compute()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.payroll_runs%ROWTYPE;
  s public.payroll_settings%ROWTYPE;
  v_hourly NUMERIC;
  v_bonus_cnss NUMERIC := 0;
  v_bonus_nontax NUMERIC := 0;
  v_cnss_gross NUMERIC;
  b JSONB;
BEGIN
  SELECT * INTO r FROM public.payroll_runs WHERE id = NEW.run_id;
  IF r.status = 'cloturee' THEN RAISE EXCEPTION 'payroll_closed'; END IF;
  s := public.payroll_settings_of(NEW.company_id);

  NEW.absence_amount := round(NEW.base_salary * LEAST(NEW.unpaid_days, NEW.month_working_days) / NEW.month_working_days);
  v_hourly := NEW.base_salary / NULLIF(s.monthly_hours, 0);
  NEW.overtime_amount := round(COALESCE(v_hourly, 0) * (
      NEW.ot_weekday_hours * (1 + s.overtime_weekday_rate / 100)
    + NEW.ot_sunday_hours * (1 + s.overtime_sunday_rate / 100)
    + NEW.ot_night_hours * (1 + s.overtime_night_rate / 100)
    + NEW.ot_holiday_hours * (1 + s.overtime_holiday_rate / 100)));

  NEW.bonuses_total := 0;
  FOR b IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.bonuses, '[]')) LOOP
    NEW.bonuses_total := NEW.bonuses_total + COALESCE((b->>'amount')::NUMERIC, 0);
    IF COALESCE((b->>'cnss')::BOOLEAN, TRUE) THEN v_bonus_cnss := v_bonus_cnss + COALESCE((b->>'amount')::NUMERIC, 0); END IF;
    IF NOT COALESCE((b->>'taxable')::BOOLEAN, TRUE) THEN v_bonus_nontax := v_bonus_nontax + COALESCE((b->>'amount')::NUMERIC, 0); END IF;
  END LOOP;

  NEW.gross := GREATEST(0, NEW.base_salary - NEW.absence_amount + NEW.overtime_amount + NEW.bonuses_total);

  -- Assiette CNSS : brut hors éléments non soumis, ramené entre le plancher et le plafond
  v_cnss_gross := GREATEST(0, NEW.base_salary - NEW.absence_amount + NEW.overtime_amount + v_bonus_cnss);
  NEW.cnss_base := CASE WHEN v_cnss_gross <= 0 THEN 0 ELSE LEAST(GREATEST(v_cnss_gross, s.cnss_floor), s.cnss_ceiling) END;
  NEW.cnss_employee := round(NEW.cnss_base * s.cnss_employee_rate / 100);
  NEW.cnss_employer := round(NEW.cnss_base * s.cnss_employer_rate / 100);

  NEW.taxable := GREATEST(0, NEW.gross - v_bonus_nontax - CASE WHEN s.rts_deduct_cnss THEN NEW.cnss_employee ELSE 0 END);
  NEW.rts := public.payroll_rts(NEW.taxable, s.rts_brackets);

  NEW.deductions_total := COALESCE((SELECT SUM(COALESCE((d->>'amount')::NUMERIC, 0)) FROM jsonb_array_elements(COALESCE(NEW.deductions, '[]')) d), 0);
  NEW.net := NEW.gross - NEW.cnss_employee - NEW.rts - NEW.deductions_total;

  NEW.apprenticeship := round(NEW.gross * s.apprenticeship_rate / 100);
  NEW.other_employer := round(NEW.gross * s.other_employer_rate / 100);
  NEW.employer_cost := NEW.gross + NEW.cnss_employer + NEW.apprenticeship + NEW.other_employer;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_payroll_compute ON public.payslips;
CREATE TRIGGER trg_payroll_compute BEFORE INSERT OR UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.payroll_compute();

-- Paie clôturée : plus aucune suppression de bulletin
CREATE OR REPLACE FUNCTION public.payroll_protect_closed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payroll_runs r WHERE r.id = OLD.run_id AND r.status = 'cloturee') THEN
    RAISE EXCEPTION 'payroll_closed';
  END IF;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS trg_payroll_protect ON public.payslips;
CREATE TRIGGER trg_payroll_protect BEFORE DELETE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.payroll_protect_closed();

-- Les taux modifiés recalculent les bulletins des paies en brouillon
CREATE OR REPLACE FUNCTION public.payroll_settings_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_payroll_settings_changed ON public.payroll_settings;
CREATE TRIGGER trg_payroll_settings_changed BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW EXECUTE FUNCTION public.payroll_settings_changed();

CREATE OR REPLACE FUNCTION public.payroll_recompute_drafts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.payslips p SET updated_at = NOW()
  FROM public.payroll_runs r
  WHERE r.id = p.run_id AND r.company_id = NEW.company_id AND r.status = 'brouillon';
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_payroll_recompute ON public.payroll_settings;
CREATE TRIGGER trg_payroll_recompute AFTER UPDATE ON public.payroll_settings
  FOR EACH ROW EXECUTE FUNCTION public.payroll_recompute_drafts();

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['payroll_runs', 'payslips'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.hr_audit()', t, t);
  END LOOP;
END $$;

-- =====================================================
-- 4. Préparer, recalculer, clôturer une paie
-- =====================================================
-- Crée la paie du mois et un bulletin par employé en poste (salaire du contrat en cours,
-- jours non payés tirés des congés sans solde approuvés). Relancer ajoute les nouveaux employés.
CREATE OR REPLACE FUNCTION public.payroll_prepare(p_company UUID, p_period DATE)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_period DATE := date_trunc('month', p_period)::date;
  v_end DATE := (date_trunc('month', p_period) + INTERVAL '1 month - 1 day')::date;
  v_run UUID;
  v_status TEXT;
  v_wd NUMERIC;
  v_added INT := 0;
BEGIN
  IF NOT public.payroll_is_staff(p_company) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  PERFORM public.payroll_settings_of(p_company);
  INSERT INTO public.payroll_runs (company_id, period, created_by) VALUES (p_company, v_period, auth.uid())
  ON CONFLICT (company_id, period) DO NOTHING;
  SELECT id, status INTO v_run, v_status FROM public.payroll_runs WHERE company_id = p_company AND period = v_period;
  IF v_status = 'cloturee' THEN RAISE EXCEPTION 'payroll_closed'; END IF;
  v_wd := GREATEST(public.hr_working_days(p_company, v_period, v_end), 1);

  INSERT INTO public.payslips (run_id, company_id, employee_id, base_salary, unpaid_days, month_working_days, snapshot)
  SELECT v_run, p_company, e.id,
         COALESCE(k.base_salary_gnf, 0),
         COALESCE((SELECT SUM(public.hr_working_days(p_company, GREATEST(r.start_date, v_period), LEAST(r.end_date, v_end)))
                   FROM public.hr_leave_requests r JOIN public.hr_leave_types t ON t.id = r.leave_type_id
                   WHERE r.employee_id = e.id AND r.status = 'approuvee' AND NOT t.is_paid
                     AND r.start_date <= v_end AND r.end_date >= v_period), 0),
         v_wd,
         jsonb_build_object('name', e.first_name || ' ' || e.last_name, 'matricule', e.matricule, 'job_title', COALESCE(k.job_title, e.job_title),
                            'contract_type', k.contract_type, 'hire_date', e.hire_date, 'cnss_number', e.cnss_number,
                            'department', (SELECT d.name FROM public.hr_departments d WHERE d.id = e.department_id),
                            'payment_method', e.payment_method, 'payment_account', e.payment_account)
  FROM public.hr_employees e
  LEFT JOIN LATERAL (SELECT * FROM public.hr_contracts c WHERE c.employee_id = e.id AND c.is_current ORDER BY c.start_date DESC LIMIT 1) k ON TRUE
  WHERE e.company_id = p_company
    AND e.hire_date <= v_end
    AND (e.status <> 'sorti' OR e.exit_date >= v_period)
    AND NOT EXISTS (SELECT 1 FROM public.payslips p WHERE p.run_id = v_run AND p.employee_id = e.id);
  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN jsonb_build_object('run_id', v_run, 'added', v_added, 'working_days', v_wd);
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_prepare(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_prepare(UUID, DATE) TO authenticated;

-- Retire un employé d'une paie en brouillon (ex. absent tout le mois, payé ailleurs)
CREATE OR REPLACE FUNCTION public.payroll_remove_payslip(p_payslip UUID)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_company UUID;
BEGIN
  SELECT company_id INTO v_company FROM public.payslips WHERE id = p_payslip;
  IF v_company IS NULL OR NOT public.payroll_is_staff(v_company) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  DELETE FROM public.payslips WHERE id = p_payslip;
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_remove_payslip(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_remove_payslip(UUID) TO authenticated;

-- Clôture : fige les taux, verrouille les bulletins, prévient les employés
CREATE OR REPLACE FUNCTION public.payroll_close(p_run UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.payroll_runs%ROWTYPE; v_count INT; v_month TEXT;
BEGIN
  SELECT * INTO r FROM public.payroll_runs WHERE id = p_run FOR UPDATE;
  IF r.id IS NULL OR NOT public.payroll_is_staff(r.company_id) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  IF r.status = 'cloturee' THEN RAISE EXCEPTION 'payroll_closed'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.payslips WHERE run_id = r.id;
  IF v_count = 0 THEN RAISE EXCEPTION 'payroll_empty'; END IF;
  IF EXISTS (SELECT 1 FROM public.payslips WHERE run_id = r.id AND net < 0) THEN RAISE EXCEPTION 'negative_net'; END IF;
  IF EXISTS (SELECT 1 FROM public.payslips WHERE run_id = r.id AND gross <= 0) THEN
    RAISE EXCEPTION 'missing_salary:%', (SELECT string_agg(snapshot->>'name', ', ') FROM public.payslips WHERE run_id = r.id AND gross <= 0);
  END IF;

  UPDATE public.payroll_runs SET status = 'cloturee', closed_by = auth.uid(), closed_at = NOW(),
         settings = to_jsonb(public.payroll_settings_of(r.company_id))
  WHERE id = r.id;

  v_month := to_char(r.period, 'MM/YYYY');
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT e.user_id, 'system', 'Bulletin de paie disponible',
         format('Votre bulletin de paie de %s est disponible. Net à payer : %s GNF.', v_month,
                replace(to_char(p.net, 'FM999G999G999G999'), ',', ' ')), '/mon-espace-rh'
  FROM public.payslips p JOIN public.hr_employees e ON e.id = p.employee_id
  WHERE p.run_id = r.id AND e.user_id IS NOT NULL;
  RETURN jsonb_build_object('run_id', r.id, 'payslips', v_count);
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_close(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_close(UUID) TO authenticated;

-- Réouverture (correction d'une erreur avant déclaration) : réservée au compte entreprise
CREATE OR REPLACE FUNCTION public.payroll_reopen(p_run UUID)
RETURNS VOID LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE r public.payroll_runs%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.payroll_runs WHERE id = p_run FOR UPDATE;
  IF r.id IS NULL OR auth.uid() IS DISTINCT FROM r.company_id OR NOT public.payroll_enabled(r.company_id) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  UPDATE public.payroll_runs SET status = 'brouillon', closed_by = NULL, closed_at = NULL WHERE id = r.id;
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_reopen(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_reopen(UUID) TO authenticated;

-- Paramètres de paie (lecture avec création des valeurs par défaut)
CREATE OR REPLACE FUNCTION public.payroll_get_settings(p_company UUID)
RETURNS JSONB LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.payroll_is_staff(p_company) THEN RAISE EXCEPTION 'not_allowed'; END IF;
  RETURN to_jsonb(public.payroll_settings_of(p_company));
END;
$$;
REVOKE ALL ON FUNCTION public.payroll_get_settings(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.payroll_get_settings(UUID) TO authenticated;
