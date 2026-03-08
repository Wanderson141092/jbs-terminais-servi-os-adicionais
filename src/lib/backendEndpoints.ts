import { supabase } from "@/integrations/supabase/client";

type EndpointKey = "consultaPublica" | "enviarFormulario" | "uploadPublico" | "notificarStatus";

const endpointMap: Record<EndpointKey, string> = {
  consultaPublica: "consulta-publica",
  enviarFormulario: "enviar-formulario",
  uploadPublico: "upload-publico",
  notificarStatus: "notificar-status",
};

export const resolveEndpointName = (endpoint: EndpointKey): string => {
  return endpointMap[endpoint];
};

export const invokeBackendEndpoint = async (
  endpoint: EndpointKey,
  options: Parameters<typeof supabase.functions.invoke>[1]
) => {
  return supabase.functions.invoke(resolveEndpointName(endpoint), options);
};
