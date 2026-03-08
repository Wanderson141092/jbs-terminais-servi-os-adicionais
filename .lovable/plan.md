

## Plano: Remover seção "Cobrança: ações rápidas"

### O que será feito
Remover o bloco "Cobrança: ações rápidas" (linhas 1536-1589) do `AnaliseDialog.tsx`. Este bloco renderiza ícones de `DollarSign` como atalhos para lançamentos de cobrança. A funcionalidade de cobrança permanecerá disponível apenas pela seção de "Ações" já existente no dialog.

### Arquivo modificado
| Arquivo | Ação |
|---|---|
| `src/components/AnaliseDialog.tsx` | Remover o IIFE das linhas 1536-1589 (bloco `applicableCobrancas` + Separator) |

### Escopo
- Remover apenas o bloco visual "Cobrança: ações rápidas"
- Manter toda a lógica de cobrança (estados, handlers, dialogs de confirmação) intacta, pois é usada pela seção de ações principal

