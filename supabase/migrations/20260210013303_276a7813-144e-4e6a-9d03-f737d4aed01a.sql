
-- 1. Add UPDATE policy on deferimento_documents for authenticated users (admins)
CREATE POLICY "Admins can update deferimento docs"
ON public.deferimento_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add DELETE policy on deferimento_documents for admins
CREATE POLICY "Admins can delete deferimento docs"
ON public.deferimento_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
