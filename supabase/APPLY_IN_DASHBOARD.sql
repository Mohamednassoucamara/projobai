-- ============================================================
-- ProJob AI — SQL complet à coller dans Supabase SQL Editor
-- Dashboard → SQL Editor → New query → Coller → Run
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('candidate', 'company')),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidate_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  job_title TEXT,
  location TEXT,
  profile_summary TEXT,
  avatar_url TEXT,
  profile_completion INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  degree TEXT NOT NULL,
  institution TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  language_name TEXT NOT NULL,
  level TEXT NOT NULL,
  proficiency_percentage INT CHECK (proficiency_percentage >= 0 AND proficiency_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT,
  company_size TEXT,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('CDI', 'CDD', 'Stage', 'Freelance', 'Temps partiel')),
  experience_level TEXT,
  education_level TEXT,
  salary_min DECIMAL(12, 2),
  salary_max DECIMAL(12, 2),
  salary_currency TEXT DEFAULT 'GNF',
  requirements TEXT[],
  responsibilities TEXT[],
  benefits TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  views_count INT DEFAULT 0,
  applications_count INT DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected')),
  cover_letter TEXT,
  cv_url TEXT,
  motivation_message TEXT,
  notes TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS cvs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_type TEXT DEFAULT 'modern',
  content JSONB NOT NULL,
  pdf_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  content TEXT NOT NULL,
  template_type TEXT DEFAULT 'modern',
  tone TEXT DEFAULT 'professional',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  completed_questions INT NOT NULL DEFAULT 0,
  average_score DECIMAL(3, 1),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id INT NOT NULL,
  answer TEXT NOT NULL,
  score INT CHECK (score >= 0 AND score <= 10),
  feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorite_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE TABLE IF NOT EXISTS favorite_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('application', 'job_match', 'interview', 'message', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_published_at ON jobs(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(location);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_experiences_candidate_id ON experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_education_candidate_id ON education(candidate_id);
CREATE INDEX IF NOT EXISTS idx_skills_candidate_id ON skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ============================================================
-- FONCTIONS ET TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_candidate_profiles_updated_at ON candidate_profiles;
CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_profiles_updated_at ON company_profiles;
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION calculate_profile_completion(candidate_uuid UUID)
RETURNS INT AS $$
DECLARE
  completion INT := 0;
  total_fields INT := 10;
BEGIN
  SELECT
    CASE WHEN cp.job_title IS NOT NULL AND cp.job_title != '' THEN 1 ELSE 0 END +
    CASE WHEN cp.location IS NOT NULL AND cp.location != '' THEN 1 ELSE 0 END +
    CASE WHEN cp.profile_summary IS NOT NULL AND cp.profile_summary != '' THEN 1 ELSE 0 END +
    CASE WHEN p.phone IS NOT NULL AND p.phone != '' THEN 1 ELSE 0 END +
    CASE WHEN p.email IS NOT NULL AND p.email != '' THEN 1 ELSE 0 END +
    CASE WHEN p.full_name IS NOT NULL AND p.full_name != '' THEN 1 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM experiences WHERE candidate_id = candidate_uuid) THEN 1 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM education WHERE candidate_id = candidate_uuid) THEN 1 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM skills WHERE candidate_id = candidate_uuid) THEN 1 ELSE 0 END +
    CASE WHEN EXISTS(SELECT 1 FROM languages WHERE candidate_id = candidate_uuid) THEN 1 ELSE 0 END
  INTO completion
  FROM candidate_profiles cp
  JOIN profiles p ON p.id = cp.id
  WHERE cp.id = candidate_uuid;

  RETURN ROUND((completion::DECIMAL / total_fields) * 100);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_applications_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE jobs SET applications_count = applications_count - 1 WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_applications_count ON applications;
CREATE TRIGGER update_job_applications_count
  AFTER INSERT OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_applications_count();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- candidate_profiles
DROP POLICY IF EXISTS "Candidates can view their own profile" ON candidate_profiles;
CREATE POLICY "Candidates can view their own profile" ON candidate_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Companies can view candidate profiles" ON candidate_profiles;
CREATE POLICY "Companies can view candidate profiles" ON candidate_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_type = 'company'));

DROP POLICY IF EXISTS "Candidates can update their own profile" ON candidate_profiles;
CREATE POLICY "Candidates can update their own profile" ON candidate_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Candidates can insert their own profile" ON candidate_profiles;
CREATE POLICY "Candidates can insert their own profile" ON candidate_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- experiences, education, skills, languages
DROP POLICY IF EXISTS "Candidates can manage their experiences" ON experiences;
CREATE POLICY "Candidates can manage their experiences" ON experiences FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their education" ON education;
CREATE POLICY "Candidates can manage their education" ON education FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their skills" ON skills;
CREATE POLICY "Candidates can manage their skills" ON skills FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their languages" ON languages;
CREATE POLICY "Candidates can manage their languages" ON languages FOR ALL USING (candidate_id = auth.uid());

-- company_profiles
DROP POLICY IF EXISTS "Everyone can view company profiles" ON company_profiles;
CREATE POLICY "Everyone can view company profiles" ON company_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Companies can update their own profile" ON company_profiles;
CREATE POLICY "Companies can update their own profile" ON company_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Companies can insert their own profile" ON company_profiles;
CREATE POLICY "Companies can insert their own profile" ON company_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- jobs
DROP POLICY IF EXISTS "Everyone can view active jobs" ON jobs;
CREATE POLICY "Everyone can view active jobs" ON jobs FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Companies can view their own jobs" ON jobs;
CREATE POLICY "Companies can view their own jobs" ON jobs FOR SELECT USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can create jobs" ON jobs;
CREATE POLICY "Companies can create jobs" ON jobs FOR INSERT WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can update their own jobs" ON jobs;
CREATE POLICY "Companies can update their own jobs" ON jobs FOR UPDATE USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Companies can delete their own jobs" ON jobs;
CREATE POLICY "Companies can delete their own jobs" ON jobs FOR DELETE USING (company_id = auth.uid());

-- job_skills
DROP POLICY IF EXISTS "Everyone can view job skills" ON job_skills;
CREATE POLICY "Everyone can view job skills" ON job_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS "Companies can manage job skills" ON job_skills;
CREATE POLICY "Companies can manage job skills" ON job_skills FOR ALL
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_skills.job_id AND jobs.company_id = auth.uid()));

-- applications
DROP POLICY IF EXISTS "Candidates can view their own applications" ON applications;
CREATE POLICY "Candidates can view their own applications" ON applications FOR SELECT USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Companies can view applications to their jobs" ON applications;
CREATE POLICY "Companies can view applications to their jobs" ON applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = applications.job_id AND jobs.company_id = auth.uid()));

DROP POLICY IF EXISTS "Candidates can create applications" ON applications;
CREATE POLICY "Candidates can create applications" ON applications FOR INSERT WITH CHECK (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can update their own applications" ON applications;
CREATE POLICY "Candidates can update their own applications" ON applications FOR UPDATE USING (candidate_id = auth.uid());

-- cvs, cover_letters, interview_sessions, interview_answers
DROP POLICY IF EXISTS "Candidates can manage their CVs" ON cvs;
CREATE POLICY "Candidates can manage their CVs" ON cvs FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their cover letters" ON cover_letters;
CREATE POLICY "Candidates can manage their cover letters" ON cover_letters FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their interview sessions" ON interview_sessions;
CREATE POLICY "Candidates can manage their interview sessions" ON interview_sessions FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Candidates can manage their interview answers" ON interview_answers;
CREATE POLICY "Candidates can manage their interview answers" ON interview_answers FOR ALL
  USING (EXISTS (SELECT 1 FROM interview_sessions WHERE interview_sessions.id = interview_answers.session_id AND interview_sessions.candidate_id = auth.uid()));

-- favorites
DROP POLICY IF EXISTS "Candidates can manage their favorite jobs" ON favorite_jobs;
CREATE POLICY "Candidates can manage their favorite jobs" ON favorite_jobs FOR ALL USING (candidate_id = auth.uid());

DROP POLICY IF EXISTS "Companies can manage their favorite candidates" ON favorite_candidates;
CREATE POLICY "Companies can manage their favorite candidates" ON favorite_candidates FOR ALL USING (company_id = auth.uid());

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('application-documents', 'application-documents', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own CVs" ON storage.objects;
CREATE POLICY "Users can upload their own CVs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view their own CVs" ON storage.objects;
CREATE POLICY "Users can view their own CVs" ON storage.objects FOR SELECT
  USING (bucket_id = 'cvs' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Company logos are publicly accessible" ON storage.objects;
CREATE POLICY "Company logos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');

DROP POLICY IF EXISTS "Companies can upload their own logo" ON storage.objects;
CREATE POLICY "Companies can upload their own logo" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
