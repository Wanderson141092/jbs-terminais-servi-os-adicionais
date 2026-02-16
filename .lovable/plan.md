

# Plano: Submenu "Modelos de Relatorios" com Dialogos Flutuantes

## Resumo
Transformar a pagina separada de Relatorios em dois dialogos flutuantes acessiveis diretamente do menu "Relatorios" no dashboard, eliminando a navegacao para outra pagina.

## Alteracoes

### 1. Menu do Dashboard (InternoDashboard.tsx)
Substituir o item "Modelos de Relatorio" (que navega para `/interno/relatorios`) por um submenu com duas opcoes:

```text
Relatorios (dropdown)
  |-- Modelos de Relatorios (submenu)
  |     |-- Extrair Relatorio    (abre dialog flutuante)
  |     |-- Modelos Excel        (abre dialog flutuante)
  |-- Relatorio Personalizado
  |-- Programacao - Navis N4
```

Adicionar dois novos estados:
- `showExtrairRelatorio` (boolean)
- `showModelosExcel` (boolean)

### 2. Novo Componente: ExtrairRelatorioDialog
Extrair o conteudo da aba "Exportar Dados" do `Relatorios.tsx` para um componente dialog independente (`src/components/ExtrairRelatorioDialog.tsx`).
- Recebe `open` e `onClose` como props
- Contem a logica de fetch dos modelos com mapeamento e os cards de download
- Inclui o `ReportDownloadDialog` internamente
- Renomear titulo para "Extrair Relatorio"

### 3. Novo Componente: ModelosExcelDialog
Extrair o conteudo da aba "Modelos Importados" para um componente dialog independente (`src/components/ModelosExcelDialog.tsx`).
- Recebe `open` e `onClose` como props
- Contem a tabela de modelos, upload, mapeamento de colunas
- Inclui `ReportColumnMappingDialog` internamente
- Renomear titulo para "Modelos Excel"

### 4. Integrar Dialogos no Dashboard
Em `InternoDashboard.tsx`:
- Importar os dois novos componentes
- Renderizar ambos os dialogos (controlados pelos novos estados)
- Remover a navegacao para `/interno/relatorios`

### 5. Pagina Relatorios.tsx
Manter o arquivo por compatibilidade (a rota ainda existira), mas a interacao principal sera via dialogos no dashboard.

## Detalhes Tecnicos

Arquivos criados:
- `src/components/ExtrairRelatorioDialog.tsx` -- dialog com grid de modelos mapeados para download
- `src/components/ModelosExcelDialog.tsx` -- dialog com tabela de modelos, upload e mapeamento

Arquivos editados:
- `src/pages/InternoDashboard.tsx` -- submenu + estados + renderizacao dos dialogos

A logica de dados (fetch de `modelos_relatorio`, `modelo_relatorio_colunas`, upload, delete) sera movida do `Relatorios.tsx` para os respectivos dialogos, cada um sendo autonomo.

