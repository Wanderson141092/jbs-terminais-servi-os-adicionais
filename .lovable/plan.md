

# Novo Tipo de Pergunta: Pergunta Condicional

## O que sera feito
Criar um novo tipo de pergunta chamado **"Pergunta Condicional"** que permite agrupar **duas ou mais perguntas** dentro de um unico campo no formulario. Cada sub-pergunta tera uma **condicao obrigatoria** que define quando ela sera exibida (baseada na resposta de outra pergunta do formulario). Apenas a sub-pergunta cuja condicao for satisfeita sera renderizada.

## Exemplo de uso
Um campo "Pergunta Condicional" com:
- Sub-pergunta 1: "Qual o numero do container?" (tipo texto formatado) -- exibida quando "Tipo de Operacao" = "Importacao"
- Sub-pergunta 2: "Informe o booking" (tipo texto) -- exibida quando "Tipo de Operacao" = "Exportacao"
- Sub-pergunta 3: "Codigo de referencia" (tipo numero) -- exibida quando "Tipo de Operacao" = "Cabotagem"

## Diferenca do sistema condicional atual
O sistema atual de condicionais (no FormularioBuilder) mostra/esconde perguntas inteiras da lista. Este novo tipo agrupa varias perguntas em **uma unica posicao** do formulario, onde apenas uma aparece por vez conforme a condicao.

---

## Detalhes Tecnicos

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`

**1. Adicionar tipo na lista QUESTION_TYPES:**
```
{ value: "pergunta_condicional", label: "Pergunta Condicional" }
```

**2. Novos campos no formData:**
```
condicional_subperguntas: [
  {
    tipo: "texto",
    rotulo: "",
    placeholder: "",
    opcoes: "",
    mascara: "",
    max_chars: "",
    modo: "menu",
    condicao_pergunta_rotulo: "",  // rotulo da pergunta pai (para referencia visual)
    condicao_valor: "",            // valor que ativa esta sub-pergunta
    condicao_operador: "igual"     // igual, diferente, contem
  }
]
```
Iniciar com 2 sub-perguntas. Botao "Adicionar Sub-pergunta" para incluir mais.

**3. UI no dialog (quando tipo = "pergunta_condicional"):**
- Lista de blocos com borda, cada um representando uma sub-pergunta
- Cada bloco contem:
  - Secao "Condicao" (obrigatoria): campo texto para o rotulo da pergunta-gatilho, operador (igual/diferente/contem), valor gatilho
  - Secao "Pergunta": tipo (mesmos tipos do SUBCAMPO_TYPES), rotulo, placeholder, opcoes (se select), mascara (se texto_formatado)
- Botao para adicionar mais sub-perguntas
- Botao X para remover sub-pergunta (minimo 2)

**4. Serializacao no save():**
Salvar no campo `config` JSONB:
```json
{
  "subperguntas": [
    {
      "tipo": "texto_formatado",
      "rotulo": "Numero do Container",
      "placeholder": "",
      "opcoes": null,
      "mascara": "AAAU9999999",
      "max_chars": null,
      "modo_exibicao": null,
      "condicao": {
        "pergunta_rotulo": "Tipo de Operacao",
        "valor_gatilho": "Importacao",
        "operador": "igual"
      }
    },
    {
      "tipo": "texto",
      "rotulo": "Informe o Booking",
      "placeholder": "",
      "opcoes": null,
      "mascara": null,
      "max_chars": null,
      "modo_exibicao": null,
      "condicao": {
        "pergunta_rotulo": "Exportacao",
        "valor_gatilho": "Exportacao",
        "operador": "igual"
      }
    }
  ]
}
```

**5. Leitura no openDialog():**
Ler `config.subperguntas` para preencher o array de sub-perguntas.

### Arquivo: `src/components/form-renderer/FormFieldRenderer.tsx`

**1. Novo bloco para tipo "pergunta_condicional":**
- Recebe as `subperguntas` do config
- Para cada sub-pergunta, avalia a condicao comparando com os valores atuais do formulario (passados via props)
- Renderiza apenas a primeira sub-pergunta cuja condicao seja satisfeita
- Reutiliza a logica existente de renderizacao por tipo (Input, Select, texto_formatado com mascara, etc.)

**2. Novo prop necessario no FormFieldRenderer:**
- `allValues: Record<string, any>` -- para avaliar as condicoes (precisa acessar valores de outras perguntas)
- `allPerguntas: PerguntaComCondicao[]` -- para encontrar a pergunta pai pelo rotulo

### Arquivo: `src/components/form-renderer/FormRendererBody.tsx`

**1. Passar `allValues` e `allPerguntas` ao FormFieldRenderer:**
- Adicionar `values` e `perguntas` como props do FormFieldRenderer quando o tipo for "pergunta_condicional"

### Arquivo: `src/components/FormRenderer.tsx`

**1. Validacao no handleSubmit:**
- Para tipo "pergunta_condicional", verificar se alguma sub-pergunta esta visivel (condicao satisfeita) e se o campo esta preenchido quando obrigatorio

### Nenhuma alteracao de banco de dados necessaria
Toda configuracao sera armazenada no campo JSONB `config` existente na tabela `banco_perguntas`.

