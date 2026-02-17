
# Importar Opcoes via Area de Transferencia

## O que sera feito
Adicionar um botao "Importar Opcoes" ao lado do campo de opcoes (Textarea) nas perguntas do tipo Selecao Unica e Multipla Escolha. Ao clicar, abre um dialog (tela suspensa) com uma area de texto onde o usuario pode colar valores copiados de qualquer fonte (Excel, bloco de notas, etc.). O usuario pode revisar e editar os valores antes de clicar em "Importar", que adiciona todos os valores ao campo de opcoes da pergunta.

## Fluxo do usuario
1. No editor da pergunta (select ou multipla_escolha), clicar no botao "Importar Opcoes"
2. Um dialog abre com um Textarea grande e instrucoes
3. O usuario cola os dados (uma opcao por linha, ou separados por ponto-e-virgula)
4. O usuario pode editar/remover linhas antes de confirmar
5. Ao clicar "Importar", os valores sao adicionados (append) ao campo de opcoes existente
6. O dialog fecha e o Textarea principal mostra todas as opcoes

## Detalhes Tecnicos

### Arquivo: `src/components/admin/BancoPerguntasManager.tsx`

**1. Novo estado**
- `showImportDialog` (boolean) - controla visibilidade do dialog de importacao
- `importText` (string) - conteudo da area de transferencia

**2. Funcao de importacao**
- Recebe o texto colado, faz split por `\n` e por `;` (para suportar ambos separadores)
- Remove linhas vazias e espacos extras com `.trim()`
- Remove duplicatas
- Faz append ao `formData.opcoes` existente (adiciona novas linhas ao final)

**3. Botao "Importar Opcoes"**
- Posicionado ao lado do Label "Opcoes (uma por linha)", na linha 368
- Icone ClipboardPaste (lucide-react) + texto "Importar"
- Variante outline, tamanho pequeno

**4. Dialog de importacao**
- Titulo: "Importar Opcoes"
- Descricao: "Cole as opcoes abaixo (uma por linha ou separadas por ponto-e-virgula). Voce pode editar antes de importar."
- Textarea com 10 linhas, placeholder orientativo
- Preview da quantidade de opcoes detectadas
- Botoes: "Cancelar" e "Importar (X opcoes)"

### Nenhuma alteracao de banco de dados necessaria
A funcionalidade e puramente de interface -- os valores importados sao inseridos no mesmo campo `opcoes` que ja existe.
