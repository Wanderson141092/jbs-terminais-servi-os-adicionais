
-- Table for fixed field configuration (which fields appear in analysis, external page, per service)
CREATE TABLE public.campos_fixos_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campo_chave text NOT NULL UNIQUE,
  campo_label text NOT NULL,
  visivel_externo boolean NOT NULL DEFAULT false,
  visivel_analise boolean NOT NULL DEFAULT true,
  obrigatorio_analise boolean NOT NULL DEFAULT false,
  servico_ids uuid[] NOT NULL DEFAULT '{}',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campos_fixos_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view campos_fixos_config" ON public.campos_fixos_config FOR SELECT USING (true);
CREATE POLICY "Only admins can manage campos_fixos_config" ON public.campos_fixos_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default fixed fields
INSERT INTO public.campos_fixos_config (campo_chave, campo_label, visivel_externo, visivel_analise, ordem) VALUES
('protocolo', 'Protocolo', true, true, 1),
('cliente_nome', 'Nome da Empresa', false, true, 2),
('cnpj', 'CNPJ', false, true, 3),
('numero_conteiner', 'Contêiner', true, true, 4),
('lpco', 'LPCO', true, true, 5),
('tipo_operacao', 'Serviço Adicional', true, true, 6),
('tipo_carga', 'Tipo de Carga', true, true, 7),
('data_posicionamento', 'Data do Serviço', true, true, 8),
('data_agendamento', 'Data/Hora do Agendamento', false, true, 9),
('observacoes', 'Observações', false, true, 10),
('categoria', 'Categoria', false, true, 11);

-- Add visivel_externo to campos_analise for dynamic fields
ALTER TABLE public.campos_analise ADD COLUMN IF NOT EXISTS visivel_externo boolean NOT NULL DEFAULT false;

-- Table for form style presets (manageable CRUD)
CREATE TABLE public.estilos_formulario (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  features text[] NOT NULL DEFAULT '{}',
  config jsonb NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estilos_formulario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view estilos_formulario" ON public.estilos_formulario FOR SELECT USING (true);
CREATE POLICY "Only admins can manage estilos_formulario" ON public.estilos_formulario FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default styles
INSERT INTO public.estilos_formulario (chave, nome, descricao, features, ordem) VALUES
('jbs', 'JBS Terminais (Padrão)', 'Design institucional JBS com cores e tipografia padrão', ARRAY['Campos básicos', 'Upload de arquivos', 'Lógica condicional', 'Validação em tempo real'], 1),
('hashdata', 'Hashdata', 'Estilo inspirado no sistema Hashdata com layout corporativo', ARRAY['Layout em grid', 'Seções colapsáveis', 'Campos agrupados', 'Progresso visual'], 2),
('google', 'Google Forms', 'Design minimalista inspirado no Google Forms', ARRAY['Layout vertical', 'Respostas opcionais', 'Múltiplas seções', 'Tema claro/escuro'], 3),
('jotform', 'Jotform', 'Layout moderno com cards e animações suaves', ARRAY['Cards por campo', 'Animações', 'Temas personalizáveis', 'Progresso por etapas'], 4),
('formstack', 'Formstack', 'Formulário empresarial com layout profissional', ARRAY['Campos inline', 'Validação avançada', 'Integração de pagamentos', 'Assinaturas digitais'], 5);
