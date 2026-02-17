
# Novo Caracter de Mascara "X" (Letra ou Numero) + Correcoes

## O que sera feito
1. Adicionar o caracter **"X"** na mascara do texto formatado, que aceita **letra OU numero** naquela posicao
2. Atualizar a descricao e exemplos no painel admin para incluir o novo caracter
3. Corrigir a renderizacao do tipo `texto_formatado` como pergunta standalone (atualmente so funciona dentro de `resposta_conjunta`) implementando aplicacao real da mascara caracter a caracter

## Regras da mascara (atualizado)
- **A** = aceita apenas letras (A-Z)
- **9** = aceita apenas numeros (0-9)
- **X** = aceita letra OU numero (A-Z, 0-9)
- Qualquer outro caracter = literal fixo (inserido automaticamente)

## Exemplo no admin
```
Exemplos: Container = AAAU9999999 | CPF = 999.999.999-99 | Codigo Misto = XXX-9999
```

## Detalhes Tecnicos

### Arquivo: `src/components/form-renderer/FormFieldRenderer.tsx`

**1. Criar funcao `applyMask(rawValue, mascara)`:**
- Percorre a mascara caracter a caracter
- Para cada posicao: se "A", aceita so letra; se "9", so numero; se "X", aceita ambos; caso contrario, insere o literal fixo automaticamente
- Forca uppercase
- Retorna o valor formatado

**2. Adicionar bloco de renderizacao para `pergunta.tipo === "texto_formatado"`:**
- Ler `config.mascara`, `config.min_chars`, `config.max_chars`
- Usar a funcao `applyMask` no `onChange`
- Se nao houver mascara, aplicar apenas uppercase + max_chars (comportamento atual)

**3. Atualizar o bloco `texto_formatado` dentro de `resposta_conjunta`:**
- Usar a mesma funcao `applyMask` quando `campo.mascara` estiver definida

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`

**1. Atualizar texto de ajuda (linha 513-516):**
Adicionar "X" na descricao:
```
Use "A" para letras, "9" para numeros, "X" para letra ou numero,
e qualquer outro caracter sera fixo (separador).
```

**2. Atualizar placeholder e exemplos (linhas 523, 527):**
```
placeholder: "Ex: AAAU9999999 ou XXX-9999"
Exemplos: Container = AAAU9999999 | CPF = 999.999.999-99 | Codigo Misto = XXX-9999
```

### Nenhuma alteracao de banco de dados necessaria
