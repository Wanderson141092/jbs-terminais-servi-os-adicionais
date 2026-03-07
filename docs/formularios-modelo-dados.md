# Modelo de dados de formulários (padrão único)

## Objetivo
Consolidar o fluxo de formulários no padrão:

- `formularios` (metadados do formulário)
- `formulario_perguntas` (vínculo e ordenação das perguntas no formulário)
- `banco_perguntas` (metadados/catálogo das perguntas)
- `formulario_respostas` (payload bruto enviado pelo usuário)

> O uso de `formulario_campos` deve ser tratado como legado.

## Fluxo atual mapeado

### 1) Criação e configuração do formulário
1. A tela de administração cria/edita o registro base em `formularios` (título, descrição, estilo, serviço vinculado).
2. O construtor (`FormularioBuilder`) lista perguntas disponíveis em `banco_perguntas`.
3. Ao adicionar uma pergunta ao formulário, é criado um vínculo em `formulario_perguntas` com `formulario_id`, `pergunta_id`, `ordem` e `obrigatorio`.
4. Condicionais e mapeamentos são persistidos em tabelas auxiliares (`pergunta_condicionais` e `pergunta_mapeamento`) referenciando `pergunta_id`.

### 2) Renderização do formulário público
1. O `FormRenderer` carrega o formulário (`formularios`) e as perguntas via join `formulario_perguntas -> banco_perguntas`.
2. A estrutura renderizada usa o `id` da pergunta do banco (`banco_perguntas.id`) como chave do campo de resposta.
3. Condicionais são aplicadas antes de exibir/validar campos.

### 3) Envio e persistência da resposta
1. O frontend monta `respostas` como JSON no formato `{ [pergunta_id]: valor }`.
2. Arquivos são enviados com `pergunta_id`.
3. A Edge Function `enviar-formulario` grava em `formulario_respostas` (`respostas` + `arquivos`) e cria a solicitação operacional com base em `pergunta_mapeamento`.

### 4) Leitura e exibição de respostas
1. Admin e telas internas leem `formulario_respostas`.
2. A interpretação dos rótulos/tipos vem de `formulario_perguntas` + `banco_perguntas`.
3. Exportação deve usar as perguntas vinculadas ao formulário (não `formulario_campos`).

## Situação de `formulario_campos`

### Diagnóstico
- No código atual, `formulario_campos` aparece apenas como leitura legada em `AdminFormularios` (antes da adaptação).
- Não há escrita ativa (insert/update/delete) em `formulario_campos` no frontend atual nem nas Edge Functions.

### Plano de descontinuação gradual
1. **Fase 1 (já aplicada):** remover leituras de `formulario_campos` da UI principal de respostas/exportação.
2. **Fase 2:** monitorar por 1 ciclo de release se há consumidores externos (scripts SQL, BI, integrações diretas).
3. **Fase 3:** criar migration para:
   - revogar permissões/policies de escrita (se ainda existirem);
   - opcionalmente manter view de compatibilidade somente leitura.
4. **Fase 4:** remover tabela legada (`DROP TABLE`) quando não houver consumidores.

## Regra de ouro (padrão único)
- **Definição de perguntas:** `banco_perguntas`
- **Composição do formulário:** `formulario_perguntas`
- **Identidade do campo na resposta:** `pergunta_id` (id de `banco_perguntas`)
- **Payload submetido:** `formulario_respostas.respostas`

Esse padrão evita divergência entre o que é renderizado, o que é salvo e o que é exportado.
