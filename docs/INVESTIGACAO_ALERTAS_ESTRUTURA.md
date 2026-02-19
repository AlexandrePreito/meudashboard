# Investigação: Alertas sem estrutura por filial

## Problema reportado

- **Cliente**: Recebe mensagem com apenas um valor total (ex: R$ 173.989,19 ou R$ 38.200,37), sem lista por filial
- **Usuário (teste)**: Recebe mensagem correta com estrutura: Jd. da Luz, Marista, Alto da Glória, Quintal + TOTAL

## Causa raiz identificada

Existem **dois fluxos diferentes** para disparar alertas:

| Fluxo | Rota | Quando executa | Formatação do `{{valor}}` |
|-------|------|----------------|---------------------------|
| **Manual** | `/api/alertas/[id]/trigger` | Usuário clica em "Disparar" | `formatDaxResult()` formata **todas as linhas** → estrutura por filial |
| **Agendado (Cron)** | `/api/alertas/cron` | Execução automática (ex: 08:00) | Usa **apenas a primeira linha** `results[0]` → só um valor |

### Detalhamento

1. **Trigger (manual)** – `app/api/alertas/[id]/trigger/route.ts`:
   - Linha 212: `valorReal = formatDaxResult(daxResult.results)`
   - `formatDaxResult()` percorre **todas as linhas** e monta: `Filial1: R$ X\nFilial2: R$ Y\n...\n*TOTAL*: R$ Z`

2. **Cron (agendado)** – `app/api/alertas/cron/route.ts`:
   - Linha 217: `const row = daxResult.results[0];` — usa **só a primeira linha**
   - Linhas 218–246: extrai variáveis apenas dessa linha
   - Linha 244: `variables['{{valor}}']` = primeiro valor numérico da primeira linha

### Por que o usuário vê certo e o cliente não

- **Usuário**: testa clicando em "Disparar" → fluxo manual → mensagem estruturada
- **Cliente**: recebe alertas nos horários programados → fluxo cron → mensagem com valor único

## Correção recomendada

Replicar a lógica de `formatDaxResult()` no fluxo do cron para que `{{valor}}` seja formatado com **todas as linhas** quando a query DAX retornar múltiplas linhas (ex.: faturamento por filial).
