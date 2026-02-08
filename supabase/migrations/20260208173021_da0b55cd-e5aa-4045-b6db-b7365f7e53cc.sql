
-- Enum for status
CREATE TYPE public.status_solicitacao AS ENUM (
  'aguardando_confirmacao',
  'cancelado',
  'recusado',
  'confirmado_aguardando_vistoria',
  'vistoria_finalizada',
  'vistoriado_com_pendencia',
  'nao_vistoriado'
);

-- Enum for sector
CREATE TYPE public.setor_tipo AS ENUM ('COMEX', 'ARMAZEM');

-- Profiles table (internal users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  setor public.setor_tipo,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Solicitacoes table
CREATE TABLE public.solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo TEXT NOT NULL UNIQUE,
  lpco TEXT,
  numero_conteiner TEXT,
  cliente_nome TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  data_posicionamento DATE,
  tipo_carga TEXT,
  observacoes TEXT,
  status public.status_solicitacao NOT NULL DEFAULT 'aguardando_confirmacao',
  comex_aprovado BOOLEAN,
  comex_usuario_id UUID REFERENCES auth.users(id),
  comex_justificativa TEXT,
  comex_data TIMESTAMPTZ,
  armazem_aprovado BOOLEAN,
  armazem_usuario_id UUID REFERENCES auth.users(id),
  armazem_justificativa TEXT,
  armazem_data TIMESTAMPTZ,
  status_vistoria TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all solicitacoes
CREATE POLICY "Authenticated users can view solicitacoes" ON public.solicitacoes FOR SELECT TO authenticated USING (true);
-- Authenticated users can update solicitacoes
CREATE POLICY "Authenticated users can update solicitacoes" ON public.solicitacoes FOR UPDATE TO authenticated USING (true);
-- Authenticated users can insert solicitacoes
CREATE POLICY "Authenticated users can insert solicitacoes" ON public.solicitacoes FOR INSERT TO authenticated WITH CHECK (true);
-- Anonymous users can read solicitacoes (for external consultation)
CREATE POLICY "Anon can read solicitacoes" ON public.solicitacoes FOR SELECT TO anon USING (true);
-- Anonymous users can update solicitacoes (for upload deferimento)
CREATE POLICY "Anon can update solicitacoes" ON public.solicitacoes FOR UPDATE TO anon USING (true);

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  acao TEXT NOT NULL,
  detalhes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = usuario_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  solicitacao_id UUID REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT false,
  tipo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = usuario_id OR usuario_id IS NULL);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = usuario_id);

-- Deferimento documents metadata
CREATE TABLE public.deferimento_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deferimento_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deferimento docs" ON public.deferimento_documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert deferimento docs" ON public.deferimento_documents FOR INSERT WITH CHECK (true);

-- Storage bucket for deferimento documents
INSERT INTO storage.buckets (id, name, public) VALUES ('deferimento', 'deferimento', true);

CREATE POLICY "Anyone can upload deferimento files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'deferimento');
CREATE POLICY "Anyone can view deferimento files" ON storage.objects FOR SELECT USING (bucket_id = 'deferimento');

-- Trigger for auto-updating status based on approvals
CREATE OR REPLACE FUNCTION public.update_solicitacao_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If either sector refused
  IF NEW.comex_aprovado = false OR NEW.armazem_aprovado = false THEN
    NEW.status = 'recusado';
  -- If both approved
  ELSIF NEW.comex_aprovado = true AND NEW.armazem_aprovado = true THEN
    NEW.status = 'confirmado_aguardando_vistoria';
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trigger_update_solicitacao_status
BEFORE UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_solicitacao_status();

-- Helper function to get user sector
CREATE OR REPLACE FUNCTION public.get_user_sector(user_id UUID)
RETURNS public.setor_tipo
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor FROM public.profiles WHERE id = user_id;
$$;

-- Indexes
CREATE INDEX idx_solicitacoes_protocolo ON public.solicitacoes(protocolo);
CREATE INDEX idx_solicitacoes_lpco ON public.solicitacoes(lpco);
CREATE INDEX idx_solicitacoes_conteiner ON public.solicitacoes(numero_conteiner);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes(status);
CREATE INDEX idx_notifications_usuario ON public.notifications(usuario_id);
CREATE INDEX idx_audit_solicitacao ON public.audit_log(solicitacao_id);
