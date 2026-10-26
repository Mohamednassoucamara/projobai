-- Migration 013 : bot WhatsApp (Botpress) relié aux comptes ProJob.
-- À exécuter dans Supabase → SQL Editor, après la migration 012. Peut être relancée sans risque.
-- Ces tables ne sont lues et écrites que par la fonction bot-api (clé service_role).

-- Numéro WhatsApp vérifié → compte ProJob
CREATE TABLE IF NOT EXISTS public.bot_links (
  phone TEXT PRIMARY KEY,                       -- format international sans « + » (ex. 224622112233)
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bot_links_user ON public.bot_links (user_id);
ALTER TABLE public.bot_links ENABLE ROW LEVEL SECURITY;
-- L'utilisateur voit (et peut supprimer) les numéros reliés à son compte
DROP POLICY IF EXISTS "Users see their bot links" ON public.bot_links;
CREATE POLICY "Users see their bot links" ON public.bot_links FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users remove their bot links" ON public.bot_links;
CREATE POLICY "Users remove their bot links" ON public.bot_links FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Codes de vérification envoyés par e-mail pour relier un numéro (ou créer un compte)
CREATE TABLE IF NOT EXISTS public.bot_codes (
  phone TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.bot_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bot_codes FROM anon, authenticated;
GRANT ALL ON public.bot_links, public.bot_codes TO service_role;
