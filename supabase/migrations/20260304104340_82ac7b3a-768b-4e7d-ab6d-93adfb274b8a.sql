-- Permitir que usuários autenticados da página interna visualizem respostas/anexos do formulário
-- (necessário para tela de Visualização/Análise)
DROP POLICY IF EXISTS "Authenticated can view form responses" ON public.formulario_respostas;

CREATE POLICY "Authenticated can view form responses"
ON public.formulario_respostas
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);