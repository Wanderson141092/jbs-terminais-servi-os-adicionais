
# Novo Tipo de Pergunta: Resposta Conjunta

## O que sera feito
Criar um novo tipo de pergunta chamado **"Resposta Conjunta"** que permite ao administrador definir **dois subcampos** dentro de uma unica pergunta. Cada subcampo pode ter seu proprio tipo (texto, texto formatado, numero, selecao unica, etc.), rotulo e configuracoes independentes. Na renderizacao do formulario publico, os dois campos aparecem lado a lado numa unica linha.

## Exemplo de uso
Uma pergunta "Codigo do Produto" com:
- 1o campo: Selecao Unica (dropdown com prefixos como "BR", "US", "EU")
- 2o campo: Texto Formatado com limite de 4 digitos

## Como funciona

### No painel admin (editor da pergunta)
Ao selecionar o tipo "Resposta Conjunta", aparece uma secao com dois blocos de configuracao:

**Subcampo 1:**
- Tipo (select entre: texto, texto_formatado, numero, select, email, data)
- Rotulo (label do subcampo)
- Placeholder
- Opcoes (se for select)
- Configuracoes especificas do tipo (mascara, min/max, etc.)

**Subcampo 2:**
- Mesmas opcoes acima

### No formulario publico
Os dois campos aparecem lado a lado (grid 2 colunas) sob um unico rotulo principal. O valor salvo e um objeto JSON com as duas respostas: `{ campo1: "valor1", campo2: "valor2" }`.

---

## Detalhes Tecnicos

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`

**1. Adicionar tipo na lista QUESTION_TYPES:**
```
{ value: "resposta_conjunta", label: "Resposta Conjunta" }
```

**2. Novos campos no formData:**
```
conjunta_campo1_tipo: "texto"
conjunta_campo1_rotulo: ""
conjunta_campo1_placeholder: ""
conjunta_campo1_opcoes: ""
conjunta_campo1_mascara: ""
conjunta_campo1_max_chars: ""
conjunta_campo2_tipo: "texto"
conjunta_campo2_rotulo: ""
conjunta_campo2_placeholder: ""
conjunta_campo2_opcoes: ""
conjunta_campo2_mascara: ""
conjunta_campo2_max_chars: ""
```

**3. UI no dialog** (quando tipo = "resposta_conjunta"):
- Dois blocos com borda (similar ao bloco de "numero"), cada um com:
  - Select para escolher o tipo do subcampo (opcoes reduzidas: texto, texto_formatado, numero, select, email, data)
  - Input para rotulo
  - Input para placeholder
  - Textarea para opcoes (se tipo = select)
  - Campos de mascara/max_chars (se tipo = texto_formatado)

**4. Serializacao no save():**
Salvar tudo no campo `config` JSONB:
```
config.campos = [
  { tipo, rotulo, placeholder, opcoes: [...], mascara, max_chars },
  { tipo, rotulo, placeholder, opcoes: [...], mascara, max_chars }
]
```

**5. Leitura no openDialog():**
Ler `config.campos[0]` e `config.campos[1]` para preencher os campos do formulario.

### Arquivo: `src/components/form-renderer/FormFieldRenderer.tsx`

**1. Novo bloco para tipo "resposta_conjunta":**
- Ler `config.campos` (array de 2 objetos)
- Renderizar em grid de 2 colunas
- Cada subcampo renderiza de acordo com seu tipo (reutilizando a logica existente de Input, Select com busca, texto formatado, etc.)
- O valor e armazenado como objeto `{ campo1: valor, campo2: valor }`

### Arquivo: `src/components/form-renderer/types.ts`
Nenhuma alteracao necessaria - o campo `config` ja e do tipo `unknown` e comporta a nova estrutura.

### Arquivo: `src/components/FormRenderer.tsx`
Na validacao de campos obrigatorios no `handleSubmit`, tratar o tipo "resposta_conjunta" verificando se ambos os subcampos foram preenchidos.

### Nenhuma alteracao de banco de dados
Toda a configuracao sera armazenada no campo JSONB `config` existente na tabela `banco_perguntas`.
