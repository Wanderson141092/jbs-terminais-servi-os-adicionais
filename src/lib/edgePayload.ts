export const NOTIFICAR_STATUS_PAYLOAD_VERSION = "2026-03-07";

const IDEMPOTENCY_WINDOW_MS = 15000;
const idempotencyCache = new Map<string, { timestamp: string; createdAt: number }>();

const resolveTimestamp = (cacheKey: string) => {
  const now = Date.now();
  const cached = idempotencyCache.get(cacheKey);

  if (cached && now - cached.createdAt <= IDEMPOTENCY_WINDOW_MS) {
    return cached.timestamp;
  }

  const timestamp = new Date(now).toISOString();
  idempotencyCache.set(cacheKey, { timestamp, createdAt: now });
  return timestamp;
};

export const buildNotificarStatusPayload = (payload: {
  action: "notificar_status" | "reenviar_chave";
  solicitacao_id: string;
  usuario_id?: string;
  novo_status?: string;
}) => {
  const cacheKey = `${payload.solicitacao_id}:${payload.action}:${payload.novo_status ?? "-"}`;

  return {
    ...payload,
    payload_version: NOTIFICAR_STATUS_PAYLOAD_VERSION,
    timestamp: resolveTimestamp(cacheKey),
  };
};
