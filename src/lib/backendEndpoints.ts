import { supabase } from "@/integrations/supabase/client";

type EndpointKey = "consultaPublica" | "enviarFormulario" | "uploadPublico" | "notificarStatus";

const endpointMap: Record<EndpointKey, { legacy: string; next: string }> = {
  consultaPublica: { legacy: "consulta-publica", next: "consulta-publica-v2" },
  enviarFormulario: { legacy: "enviar-formulario", next: "enviar-formulario-v2" },
  uploadPublico: { legacy: "upload-publico", next: "upload-publico-v2" },
  notificarStatus: { legacy: "notificar-status", next: "notificar-status-v2" },
};

const parseFlag = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined || value === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const envName = (import.meta.env.VITE_API_ENV || import.meta.env.MODE || "development").toLowerCase();

const envDefaults: Record<string, Partial<Record<EndpointKey, boolean>>> = {
  development: {
    consultaPublica: false,
    enviarFormulario: false,
    uploadPublico: false,
    notificarStatus: false,
  },
  staging: {
    consultaPublica: true,
    enviarFormulario: true,
    uploadPublico: true,
    notificarStatus: true,
  },
  production: {
    consultaPublica: false,
    enviarFormulario: false,
    uploadPublico: false,
    notificarStatus: false,
  },
};

const shouldUseNextEndpoint = (endpoint: EndpointKey): boolean => {
  const globalDefault = parseFlag(import.meta.env.VITE_USE_NEXT_ENDPOINTS, false);
  const endpointDefault = envDefaults[envName]?.[endpoint] ?? globalDefault;
  const perEndpointFlag = (import.meta.env as Record<string, string | undefined>)[
    `VITE_USE_NEXT_${endpoint.toUpperCase()}`
  ];

  return parseFlag(perEndpointFlag, endpointDefault);
};

export const resolveEndpointName = (endpoint: EndpointKey): string => {
  const map = endpointMap[endpoint];
  return shouldUseNextEndpoint(endpoint) ? map.next : map.legacy;
};

export const invokeBackendEndpoint = async (
  endpoint: EndpointKey,
  options: Parameters<typeof supabase.functions.invoke>[1]
) => {
  return supabase.functions.invoke(resolveEndpointName(endpoint), options);
};
