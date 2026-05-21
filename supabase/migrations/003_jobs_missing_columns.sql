-- Colonnes manquantes sur jobs (alignement avec PostJob / APPLY_IN_DASHBOARD)

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS education_level TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applications_count INT DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW();

-- Autoriser les libellés du formulaire (ex. « Débutant accepté », « 1-2 ans »)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_experience_level_check;
