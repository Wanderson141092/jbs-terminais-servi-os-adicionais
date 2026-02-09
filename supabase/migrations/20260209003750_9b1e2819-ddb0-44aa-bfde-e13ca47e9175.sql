-- 1. Atualizar o enum setor_tipo para incluir os novos valores
-- Primeiro precisamos criar um novo enum e migrar os dados

-- Adicionar novos valores ao enum existente
ALTER TYPE setor_tipo ADD VALUE IF NOT EXISTS 'ADMINISTRATIVO';
ALTER TYPE setor_tipo ADD VALUE IF NOT EXISTS 'OPERACIONAL';
ALTER TYPE setor_tipo ADD VALUE IF NOT EXISTS 'MASTER';

-- 2. Atualizar tipos_setor existentes e inserir os novos
-- Remover tipos antigos que não são mais necessários (ADM separado)
DELETE FROM tipos_setor WHERE nome = 'ADM';

-- Atualizar MASTER com permissões totais
UPDATE tipos_setor 
SET 
  descricao = 'Tipo exclusivo para administradores do sistema - acesso total',
  pode_aprovar = true,
  pode_recusar = true,
  pode_visualizar_todos = true,
  pode_editar_processo = true,
  ativo = true
WHERE nome = 'MASTER';

-- Inserir ou atualizar ADMINISTRATIVO (substitui COMEX)
INSERT INTO tipos_setor (nome, descricao, pode_aprovar, pode_recusar, pode_visualizar_todos, pode_editar_processo, ativo)
VALUES ('ADMINISTRATIVO', 'Setor Administrativo - substitui COMEX no fluxo de aprovação', true, true, true, true, true)
ON CONFLICT DO NOTHING;

-- Inserir ou atualizar OPERACIONAL (substitui ARMAZEM)
INSERT INTO tipos_setor (nome, descricao, pode_aprovar, pode_recusar, pode_visualizar_todos, pode_editar_processo, ativo)
VALUES ('OPERACIONAL', 'Setor Operacional - substitui ARMAZÉM no fluxo de aprovação', true, true, true, true, true)
ON CONFLICT DO NOTHING;