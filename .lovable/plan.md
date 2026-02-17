
# Plano: Icones individuais na coluna $ com icone customizado para Lacre

## Resumo
Substituir os icones genericos atuais na coluna `$` por dois botoes distintos e identificaveis:
- **Lanc. Posicionamento** (servico principal): icone `DollarSign` padrao
- **Custo Posic. Lacre** (pendencia): icone composto de `DollarSign` + `Lock` (cadeado) unidos

Cada botao respondera individualmente ao seu registro de cobranca, permitindo confirmar/visualizar o status de cada um separadamente.

## Detalhes Tecnicos

### Arquivo: `src/pages/InternoDashboard.tsx` (linhas ~905-925)

Refatorar o bloco que renderiza os icones dentro do `.map(applicableConfigs)`:

1. **Icone para tipo "pendencia" (Custo Posic. Lacre)**:
   - Renderizar um icone composto: `DollarSign` e `Lock` sobrepostos/unidos num container pequeno
   - Quando pendente: cor vermelha (`text-destructive`)
   - Quando confirmado: `Check` cinza claro (mantido)

2. **Icone para tipo "servico" (Lanc. Posicionamento)**:
   - Manter o `DollarSign` simples
   - Quando pendente: cor vermelha
   - Quando confirmado: `Check` cinza claro

3. **Tooltips**: Cada botao mantem tooltip com `rotulo_analise` + status

### Implementacao do icone composto (DollarSign + Lock)
Criar um componente inline ou span com posicionamento relativo:
```text
<span className="relative inline-flex items-center">
  <DollarSign className="h-3.5 w-3.5" />
  <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-1" />
</span>
```

Isso cria visualmente um "$" com um pequeno cadeado no canto inferior direito, formando um icone unico e reconhecivel.

### Logica de clique
Cada botao ao ser clicado abrira o dialog de analise (`setSelectedSolicitacao(s)`) onde o usuario pode confirmar o lancamento especifico. Nao muda a logica atual de abertura.

### Arquivos modificados
- **`src/pages/InternoDashboard.tsx`**: Adicionar import do `Lock`, refatorar renderizacao dos icones na coluna $ para diferenciar visualmente por `cfg.tipo`
