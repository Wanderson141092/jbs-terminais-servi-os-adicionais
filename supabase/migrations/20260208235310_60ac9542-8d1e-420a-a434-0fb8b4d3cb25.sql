-- Adicionar RLS policies para UPDATE e DELETE em setor_emails
CREATE POLICY "Only admin can update setor_emails"
ON public.setor_emails
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admin can delete setor_emails"
ON public.setor_emails
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar tipos de setor Master e ADM se não existirem
INSERT INTO public.tipos_setor (nome, descricao, pode_aprovar, pode_recusar, pode_editar_processo, pode_visualizar_todos)
SELECT 'MASTER', 'Administrador Master do sistema', true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_setor WHERE nome = 'MASTER');

INSERT INTO public.tipos_setor (nome, descricao, pode_aprovar, pode_recusar, pode_editar_processo, pode_visualizar_todos)
SELECT 'ADM', 'Administrador', true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM public.tipos_setor WHERE nome = 'ADM');

-- Adicionar RLS policy para DELETE em profiles (apenas admins podem deletar)
CREATE POLICY "Only admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));