
-- Fix existing auto-recusa observations: change tipo_observacao and message text
UPDATE public.observacao_historico
SET 
  tipo_observacao = 'externa',
  observacao = 'Solicitação enviada após o prazo de recebimento. Por gentileza seguir para a próxima data.'
WHERE tipo_observacao = 'sistema_auto_recusa_corte';

-- Fix solicitacoes.observacoes that contain bracketed auto-recusa messages
UPDATE public.solicitacoes
SET observacoes = 'Solicitação enviada após o prazo de recebimento. Por gentileza seguir para a próxima data.'
WHERE observacoes LIKE '%RECUSADO AUTOMATICAMENTE%'
   OR observacoes LIKE '%[RECUSADO%'
   OR observacoes LIKE '%recusado automaticamente%horário de corte%';

-- Also fix any that have the old edge function message format
UPDATE public.solicitacoes
SET observacoes = 'Solicitação enviada após o prazo de recebimento. Por gentileza seguir para a próxima data.'
WHERE observacoes = 'Pedido recusado automaticamente por envio após o horário de corte.';
