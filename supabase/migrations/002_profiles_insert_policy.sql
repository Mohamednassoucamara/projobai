-- Permet aux utilisateurs de créer leur ligne profiles à l'inscription
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
