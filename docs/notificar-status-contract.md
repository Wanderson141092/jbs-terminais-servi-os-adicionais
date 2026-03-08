# Contrato da Edge Function `notificar-status`

## Objetivo
Endpoint consolidado para ações relacionadas a notificações com:

- `action` para roteamento de comportamento;
- `payload_version` para versionamento de contrato;
- validação de schema no backend;
- resposta padronizada (`code`, `message`, `details`);
- idempotência por `solicitacao_id + action + timestamp`.

## Endpoint
- `POST /functions/v1/notificar-status`

## Request (v2026-03-07)

```json
{
  "payload_version": "2026-03-07",
  "action": "notificar_status",
  "solicitacao_id": "uuid",
  "timestamp": "2026-03-07T09:30:00.000Z",
  "usuario_id": "uuid",
  "novo_status": "cancelado"
}
```

### Campos obrigatórios
Base (todas as ações):
- `payload_version`: deve ser `2026-03-07`;
- `action`: `notificar_status` ou `reenviar_chave`;
- `solicitacao_id`: UUID válido;
- `timestamp`: string ISO-8601.

Por ação:
- `notificar_status`: exige `usuario_id` (UUID) e `novo_status` (string não vazia);
- `reenviar_chave`: `usuario_id` é opcional.

## Idempotência
A função salva a execução na tabela `public.edge_function_idempotency` com chave única:

- `function_name`
- `solicitacao_id`
- `action`
- `request_timestamp`

Quando o mesmo payload (mesma chave de idempotência) é reenviado, a função retorna a mesma resposta registrada, evitando dupla execução por clique/retry.

## Response padrão

```json
{
  "code": "SUCCESS",
  "message": "Notificações processadas com sucesso.",
  "details": {
    "solicitacao_id": "uuid",
    "action": "notificar_status",
    "notifications_sent": 3,
    "email_sent": true
  }
}
```

## Códigos de retorno usuais
- `SUCCESS` (200)
- `UNAUTHORIZED` (401)
- `VALIDATION_ERROR` (400)
- `VERSION_NOT_SUPPORTED` (400)
- `NOT_FOUND` (404)
- `PROCESSING` (202, para tentativa concorrente)
- `INTERNAL_ERROR` (500)

## Alinhamento no frontend
O frontend passou a montar o payload pelo helper `buildNotificarStatusPayload` (`src/lib/edgePayload.ts`).

- inclui `payload_version` automaticamente;
- inclui `timestamp` com cache de 15s por chave lógica (`solicitacao_id + action + novo_status`), reduzindo risco de dupla execução em clique/retry rápido;
- mantém o envio padronizado para todas as chamadas de `notificar-status`.
