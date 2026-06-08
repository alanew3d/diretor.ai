-- ═══════════════════════════════════════════════════════
-- diretor.ai — Supabase Setup Completo
-- Cole e execute no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════

-- 1. PERFIS DE USUÁRIO
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name          TEXT,
  email         TEXT,
  company       TEXT,
  plan          TEXT DEFAULT 'free',
  role          TEXT DEFAULT 'user',
  decisions_limit     INTEGER DEFAULT 3,
  decisions_used      INTEGER DEFAULT 0,
  decisions_month     INTEGER DEFAULT -1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. HISTÓRICO DE DECISÕES
CREATE TABLE IF NOT EXISTS public.decisions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT,
  mentor_name TEXT,
  area        TEXT,
  response    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TRIGGER: criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. TRIGGER: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS — Row Level Security (cada usuário só vê seus dados)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
DROP POLICY IF EXISTS "User can view own profile" ON public.profiles;
CREATE POLICY "User can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "User can update own profile" ON public.profiles;
CREATE POLICY "User can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para decisions
DROP POLICY IF EXISTS "User can view own decisions" ON public.decisions;
CREATE POLICY "User can view own decisions" ON public.decisions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "User can insert own decisions" ON public.decisions;
CREATE POLICY "User can insert own decisions" ON public.decisions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. PROMOVER PRIMEIRO ADMIN (substitua o email)
-- Execute após criar sua conta:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'seu@email.com';

-- 7. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_decisions_user ON public.decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created ON public.decisions(created_at DESC);
