
# Plano: Opcoes avancadas para campos Numero, Selecao Unica e Multipla Escolha

## Resumo

### 1. Campo tipo "Numero" - novas opcoes de configuracao
Adicionar no painel admin (BancoPerguntasManager) campos de configuracao quando o tipo "numero" for selecionado:
- **Prefixo**: texto exibido antes do input (ex: "R$", "US$")
- **Sufixo**: texto exibido apos o input (ex: "kg", "un", "%")
- **Permitir negativos**: toggle que controla se numeros negativos sao aceitos
- **Numero minimo**: valor minimo permitido
- **Numero maximo**: valor maximo permitido

No formulario publico (FormFieldRenderer), renderizar o input com prefixo/sufixo visuais e aplicar validacao de min/max/negativo.

### 2. Campo tipo "Selecao Unica" (select) - sub-opcao de apresentacao
Adicionar no admin uma configuracao "Modo de exibicao" com 3 opcoes:
- **Menu (dropdown)**: comportamento atual com Select/dropdown
- **Botoes**: renderiza como ToggleGroup de botoes
- **Radio**: renderiza como RadioGroup (botoes circulares)

### 3. Campo tipo "Multipla Escolha" - sub-opcao de apresentacao
Adicionar no admin uma configuracao "Modo de exibicao" com 3 opcoes:
- **Check (checkbox)**: comportamento atual com checkboxes
- **Menu (dropdown multi)**: renderiza como select com multi-selecao
- **Botoes**: renderiza como ToggleGroup multi-selecao

---

## Detalhes Tecnicos

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`

**Estado do formulario** - adicionar campos ao `formData`:
```text
numero_prefixo: ""
numero_sufixo: ""
numero_permitir_negativo: true
numero_min: ""
numero_max: ""
selecao_modo: "menu"        // "menu" | "botoes" | "radio"
multipla_modo: "check"      // "check" | "menu" | "botoes"
```

**Secao de config para tipo "numero"** (apos o bloco de texto_formatado):
- Bloco com borda similar ao de texto_formatado
- Campos: Prefixo (Input), Sufixo (Input), Min (Input number), Max (Input number), Permitir negativos (Checkbox)

**Secao de config para tipo "select"** (dentro do bloco de opcoes):
- Select com 3 opcoes: Menu, Botoes, Radio

**Secao de config para tipo "multipla_escolha"**:
- Select com 3 opcoes: Check, Menu, Botoes

**Funcao `save()`**: serializar os novos campos no objeto `config` do banco_perguntas:
```text
config.prefixo = formData.numero_prefixo
config.sufixo = formData.numero_sufixo
config.permitir_negativo = formData.numero_permitir_negativo
config.min = numero_min (parsed int)
config.max = numero_max (parsed int)
config.modo_exibicao = formData.selecao_modo ou formData.multipla_modo
```

**Funcao `openDialog()`**: ao editar, ler esses valores do config existente.

### Arquivo: `src/components/form-renderer/FormFieldRenderer.tsx`

**Campo "numero"**: Ler config para prefixo, sufixo, min, max, permitir_negativo.
- Renderizar com wrapper flex contendo prefixo (span), input, sufixo (span)
- Aplicar `min`, `max` e `step` no input HTML
- Se `permitir_negativo === false`, aplicar `min={config.min ?? 0}`

**Campo "select"**: Ler `config.modo_exibicao`:
- `"menu"` (padrao): renderiza Select/dropdown (comportamento atual)
- `"botoes"`: renderiza ToggleGroup com ToggleGroupItem para cada opcao
- `"radio"`: renderiza RadioGroup com RadioGroupItem

**Campo "multipla_escolha"**: Ler `config.modo_exibicao`:
- `"check"` (padrao): renderiza checkboxes (comportamento atual)
- `"botoes"`: renderiza ToggleGroup type="multiple"
- `"menu"`: renderiza checkboxes dentro de um Popover/dropdown com lista

### Arquivos modificados
- `src/components/admin/BancoPerguntasManager.tsx` - UI de configuracao admin
- `src/components/form-renderer/FormFieldRenderer.tsx` - Renderizacao no formulario publico

### Nenhuma alteracao de banco de dados necessaria
Todas as configuracoes serao salvas no campo JSONB `config` da tabela `banco_perguntas`, que ja existe e comporta qualquer estrutura.
