-- Add flag for pending cancellation requests
ALTER TABLE public.solicitacoes 
ADD COLUMN cancelamento_solicitado boolean DEFAULT false;

-- Add timestamp for when cancellation was requested
ALTER TABLE public.solicitacoes 
ADD COLUMN cancelamento_solicitado_em timestamp with time zone DEFAULT null;