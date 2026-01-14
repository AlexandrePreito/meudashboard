# 🔔 Documentação: Sistema de Alertas e Envio via WhatsApp

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Tipos de Alertas](#tipos-de-alertas)
3. [Estrutura de um Alerta](#estrutura-de-um-alerta)
4. [Criação e Configuração](#criação-e-configuração)
5. [Execução Automática (Cron)](#execução-automática-cron)
6. [Envio via WhatsApp](#envio-via-whatsapp)
7. [Variáveis de Template](#variáveis-de-template)
8. [Condições de Disparo](#condições-de-disparo)
9. [Agendamento](#agendamento)
10. [Permissões e Acesso](#permissões-e-acesso)
11. [Limites e Quotas](#limites-e-quotas)
12. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

O sistema de alertas permite monitorar dados do Power BI através de queries DAX e enviar notificações automáticas via WhatsApp quando condições específicas forem atendidas.

### Principais Características

- ✅ **Monitoramento automático** de métricas do Power BI
- ✅ **Envio via WhatsApp** para números individuais ou grupos
- ✅ **Execução de queries DAX** para obter dados em tempo real
- ✅ **Agendamento flexível** (horários, dias da semana, dias do mês)
- ✅ **Templates de mensagem** personalizáveis com variáveis dinâmicas
- ✅ **Histórico completo** de execuções e disparos
- ✅ **Geração de queries DAX com IA** (opcional)

---

## 📊 Tipos de Alertas

O sistema suporta 5 tipos de alertas:

### 1. ⚠️ Limite (Threshold)
Alerta quando um valor ultrapassa um limite configurado.

**Uso:** Monitorar quando vendas excedem meta, quando estoque está baixo, etc.

### 2. 🚨 Anomalia (Anomaly)
Detecta valores fora do padrão esperado.

**Uso:** Identificar picos ou quedas anômalas em métricas.

### 3. 📊 Comparação (Comparison)
Compara períodos ou valores diferentes.

**Uso:** Comparar vendas do mês atual vs mês anterior, etc.

### 4. 🎯 Meta (Goal)
Acompanha o atingimento de metas.

**Uso:** Monitorar progresso em direção a objetivos definidos.

### 5. 📋 Relatório (Scheduled Report)
Envia relatórios programados regularmente.

**Uso:** Enviar resumo diário, semanal ou mensal de métricas.

---

## 🏗️ Estrutura de um Alerta

Um alerta possui as seguintes propriedades principais:

```typescript
{
  id: string;                    // ID único do alerta
  name: string;                  // Nome do alerta
  description?: string;          // Descrição opcional
  is_enabled: boolean;           // Ativo/Inativo
  alert_type: string;            // Tipo do alerta (threshold, anomaly, etc.)
  company_group_id: string;      // Grupo ao qual pertence
  
  // Query e Dados
  connection_id: string;         // Conexão Power BI
  dataset_id: string;            // Dataset do Power BI
  dax_query: string;             // Query DAX a executar
  
  // Condições
  condition: string;             // Condição (greater_than, less_than, etc.)
  threshold: number;             // Valor limite para comparação
  
  // Agendamento
  check_frequency: string;       // Frequência (daily, weekly, monthly)
  check_times: string[];         // Horários de verificação (ex: ['08:00', '18:00'])
  check_days_of_week: number[];  // Dias da semana (0=Dom, 1=Seg, ..., 6=Sáb)
  check_days_of_month: number[]; // Dias do mês (1-31)
  
  // Notificações WhatsApp
  notify_whatsapp: boolean;      // Habilitar envio via WhatsApp
  whatsapp_number: string;       // Números separados por vírgula
  whatsapp_group_id: string;     // IDs de grupos separados por vírgula
  message_template: string;      // Template da mensagem
  
  // Metadados
  last_checked_at: string;       // Última verificação
  last_triggered_at: string;     // Último disparo
  created_at: string;            // Data de criação
  created_by: string;            // ID do usuário criador
}
```

---

## 🛠️ Criação e Configuração

### Acesso

Apenas usuários com as seguintes roles podem criar e gerenciar alertas:
- **Master**: Acesso total a todos os alertas
- **Developer**: Acesso aos alertas dos grupos que criou
- **Admin**: Acesso aos alertas dos grupos onde é administrador

### Passo a Passo

1. **Acesse** `/alertas` no sistema
2. **Clique** em "Novo Alerta"
3. **Preencha** as abas na ordem:

#### Aba "Geral"
- **Nome**: Nome descritivo do alerta
- **Tipo**: Selecione o tipo de alerta
- **Descrição**: (Opcional) Descrição detalhada

#### Aba "Dados"
- **Conexão Power BI**: Selecione a conexão
- **Dataset**: Selecione o dataset
- **Query DAX**: 
  - Digite manualmente, OU
  - Use a IA para gerar a query descrevendo o que você precisa monitorar

#### Aba "Condição"
- **Condição**: Selecione a operação (maior que, menor que, etc.)
- **Valor Limite**: Defina o valor para comparação
- **Teste a Query**: Use o botão para verificar se a query funciona

#### Aba "Agendamento"
- **Frequência**: Diário, Semanal ou Mensal
- **Horários**: Defina os horários de verificação (formato HH:MM)
- **Dias da Semana**: (Opcional) Selecione dias específicos
- **Dias do Mês**: (Opcional) Selecione dias específicos do mês

#### Aba "Template"
- **Habilitar WhatsApp**: Marque para ativar envio
- **Números**: Selecione números autorizados
- **Grupos**: (Opcional) Selecione grupos WhatsApp
- **Template de Mensagem**: 
  - Edite o template usando as variáveis disponíveis
  - Use o botão "Gerar com IA" para criar um template personalizado

---

## ⏰ Execução Automática (Cron)

Os alertas são verificados automaticamente através de um **cron job** executado a cada minuto.

### Configuração do Cron

O cron está configurado no arquivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/alertas/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

### ⚠️ Importante sobre Crons

- **Plano Hobby (Gratuito)**: Crons limitados a **1x por dia**
- **Plano Pro**: Permite crons a cada minuto (`* * * * *`)
- Para usar crons a cada minuto, é necessário o plano Pro da Vercel

### Autenticação do Cron

O endpoint `/api/alertas/cron` aceita autenticação via:
- Query parameter: `?key=CRON_SECRET`
- Header Authorization: `Bearer CRON_SECRET`
- Teste manual: `?key=manual-trigger`

### Variável de Ambiente

Certifique-se de definir `CRON_SECRET` nas variáveis de ambiente da Vercel.

### Teste Manual

Para testar o cron manualmente:
```
GET https://seu-dominio.vercel.app/api/alertas/cron?key=manual-trigger
```

### Processo de Execução

1. **Busca alertas ativos** (`is_enabled = true` e `notify_whatsapp = true`)
2. **Para cada alerta:**
   - Verifica se está no horário configurado
   - Verifica se é o dia da semana/mês correto
   - Evita disparos duplicados (não dispara se já disparou no último minuto)
3. **Executa a query DAX** para obter dados atualizados
4. **Avalia a condição** (maior que, menor que, etc.)
5. **Se a condição for verdadeira:**
   - Substitui variáveis no template
   - Envia mensagens via WhatsApp
   - Registra no histórico
   - Atualiza `last_triggered_at` e `last_checked_at`

### Fuso Horário

⚠️ **Importante**: O cron usa horário de **Brasília (America/Sao_Paulo, UTC-3)** para todas as verificações de horário e data.

---

## 📱 Envio via WhatsApp

### Requisitos

1. **Instância WhatsApp conectada**: Deve haver pelo menos uma instância ativa e conectada
2. **Números autorizados**: Os números devem estar cadastrados na seção "Números Autorizados"
3. **Alerta habilitado**: O campo `notify_whatsapp` deve ser `true`

### Configuração

#### Envio para Números Individuais

No template do alerta, selecione os números autorizados que devem receber as notificações.

Múltiplos números podem ser configurados (separados por vírgula).

#### Envio para Grupos

Além de números, você pode configurar o envio para grupos do WhatsApp.

Configure os IDs dos grupos no campo `whatsapp_group_id` (separados por vírgula).

### API de Envio

O sistema usa a **Evolution API** para enviar mensagens:

```typescript
POST {instance.api_url}/message/sendText/{instance.instance_name}
Headers:
  Content-Type: application/json
  apikey: {instance.api_key}
Body:
  {
    number: "5511999999999",  // Número sem formatação
    text: "Mensagem formatada"
  }
```

### Formatação de Números

- Os números são automaticamente limpos (removendo caracteres não numéricos)
- Formato esperado: código do país + DDD + número (ex: `5511999999999`)
- O sistema remove espaços, parênteses, hífens, etc.

---

## 🔤 Variáveis de Template

Os templates de mensagem suportam variáveis dinâmicas que são substituídas pelos valores reais no momento do disparo.

### Variáveis Padrão

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `{{nome_alerta}}` | Nome do alerta | "Vendas do Dia" |
| `{{data}}` | Data atual (formato brasileiro) | "15/01/2024" |
| `{{hora}}` | Hora atual (formato brasileiro) | "14:30" |
| `{{condicao}}` | Tipo de condição | "Maior que" |
| `{{threshold}}` | Valor limite configurado | "10.000,00" |

### Variáveis do Resultado DAX

As colunas retornadas pela query DAX são automaticamente disponibilizadas como variáveis:

- **Formato original**: `{{NomeDaColuna}}` (mantém colchetes e espaços)
- **Formato limpo**: `{{nome_da_coluna}}` (minúsculas, underscores, sem colchetes)
- **Primeiro valor numérico**: `{{valor}}` (formatado como moeda brasileira)

#### Exemplo de Query DAX

```dax
EVALUATE
SUMMARIZE(
    Sales,
    "TotalVendas", SUM(Sales[Amount])
)
```

#### Variáveis Disponíveis

- `{{TotalVendas}}` ou `{{total_vendas}}`
- `{{valor}}` (será o valor de TotalVendas formatado)

### Formatação Automática

- **Valores numéricos ≥ 100**: Formatados como moeda brasileira (R$ 1.234,56)
- **Valores numéricos < 100**: Formatados como número (1.234,56)
- **Strings**: Mantidas como estão
- **Null/undefined**: Substituídos por string vazia

### Exemplo de Template

```
🔔 *{{nome_alerta}}*

📊 Valor atual: *{{valor}}*
📈 Meta: {{threshold}}
📅 {{data}} às {{hora}}

Condição: {{condicao}} {{threshold}}
```

**Resultado:**

```
🔔 *Vendas do Dia*

📊 Valor atual: *R$ 15.432,50*
📈 Meta: 10.000,00
📅 15/01/2024 às 14:30

Condição: Maior que 10.000,00
```

---

## 🎚️ Condições de Disparo

O sistema suporta 6 tipos de condições:

| Condição | Operador | Descrição |
|----------|----------|-----------|
| `greater_than` | `>` | Valor é maior que o limite |
| `less_than` | `<` | Valor é menor que o limite |
| `equals` | `==` | Valor é igual ao limite |
| `not_equals` | `!=` | Valor é diferente do limite |
| `greater_or_equal` | `>=` | Valor é maior ou igual ao limite |
| `less_or_equal` | `<=` | Valor é menor ou igual ao limite |

### Lógica de Disparo

1. **Executa a query DAX** e obtém o resultado
2. **Extrai o primeiro valor numérico** do resultado
3. **Compara com o threshold** usando a condição configurada
4. **Se verdadeiro**: Dispara o alerta
5. **Se falso**: Não dispara, apenas registra `last_checked_at`

### Exemplo Prático

**Query DAX:**
```dax
EVALUATE { SUM(Sales[Amount]) }
```

**Condição:** `greater_than`  
**Threshold:** `10000`

**Resultado da Query:** `15320`

**Avaliação:** `15320 > 10000` = `true` ✅ **Alerta disparado!**

---

## 📅 Agendamento

### Frequências Disponíveis

- **Diário (daily)**: Verifica todos os dias
- **Semanal (weekly)**: Verifica em dias específicos da semana
- **Mensal (monthly)**: Verifica em dias específicos do mês

### Horários de Verificação

- **Formato**: `HH:MM` (24 horas)
- **Múltiplos horários**: Você pode configurar vários horários (ex: `['08:00', '12:00', '18:00']`)
- **Fuso horário**: Todos os horários são em **Brasília (UTC-3)**

### Dias da Semana

- **Valores**: `0` (Domingo) até `6` (Sábado)
- **Opcional**: Se vazio, verifica em todos os dias
- **Exemplo**: `[1, 2, 3, 4, 5]` = Segunda a Sexta

### Dias do Mês

- **Valores**: `1` até `31`
- **Opcional**: Se vazio, verifica em todos os dias
- **Exemplo**: `[1, 15, 30]` = Dias 1, 15 e 30 de cada mês

### Exemplos de Configuração

#### Alerta Diário às 9h
```
Frequência: Diário
Horários: ['09:00']
Dias da Semana: [] (todos)
Dias do Mês: [] (todos)
```

#### Alerta Semanal (Segunda a Sexta, às 8h e 18h)
```
Frequência: Semanal
Horários: ['08:00', '18:00']
Dias da Semana: [1, 2, 3, 4, 5]
Dias do Mês: [] (todos)
```

#### Alerta Mensal (Dias 1 e 15, às 10h)
```
Frequência: Mensal
Horários: ['10:00']
Dias da Semana: [] (todos)
Dias do Mês: [1, 15]
```

### Proteção contra Duplicação

O sistema previne disparos duplicados verificando se o alerta já disparou no último minuto. Se `last_triggered_at` for há menos de 1 minuto, o alerta não dispara novamente.

---

## 🔐 Permissões e Acesso

### Hierarquia de Acesso

1. **Master**: Acesso total a todos os alertas de todos os grupos
2. **Developer**: Acesso apenas aos alertas dos grupos que criou (`developer_id`)
3. **Admin**: Acesso aos alertas dos grupos onde tem role `admin` na tabela `user_group_membership`
4. **User comum**: **Sem acesso** à funcionalidade de alertas

### Validações

- Ao criar um alerta, o sistema automaticamente associa ao grupo do usuário
- Ao listar alertas, apenas os alertas dos grupos permitidos são retornados
- Ao editar/excluir, verifica se o alerta pertence a um grupo do usuário

---

## 📊 Limites e Quotas

### Limite Mensal de Alertas

Cada grupo possui um limite mensal de alertas que podem ser criados, definido pelo plano do grupo.

- **Padrão**: 10 alertas por mês (se não houver plano configurado)
- **Por Plano**: Configurável no campo `max_ai_alerts_per_month` da tabela `powerbi_plans`
- **Ilimitado**: Valor `999999` indica sem limite

### Verificação de Limite

Ao criar um novo alerta, o sistema:
1. Conta quantos alertas foram criados no mês atual
2. Compara com o limite do plano
3. Se excedido, retorna erro `429` (Too Many Requests)

### Mensagem de Erro

```json
{
  "error": "Limite mensal de 50 alertas atingido. Aguarde o próximo mês.",
  "limit_reached": true
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Alerta de Vendas Diárias

**Objetivo**: Receber notificação quando vendas do dia ultrapassarem R$ 50.000

**Configuração:**
- **Nome**: "Vendas Diárias - Meta R$ 50k"
- **Tipo**: Limite
- **Query DAX**:
  ```dax
  EVALUATE {
    SUM(Sales[Amount])
  }
  ```
- **Condição**: `greater_than`
- **Threshold**: `50000`
- **Agendamento**: Diário às 18:00
- **Template**:
  ```
  🎉 *Vendas do Dia*
  
  Total: *{{valor}}*
  Meta: R$ 50.000,00
  Status: ✅ Meta atingida!
  
  📅 {{data}} às {{hora}}
  ```
- **WhatsApp**: Enviar para número do gerente

### Exemplo 2: Alerta de Estoque Baixo

**Objetivo**: Alertar quando estoque de produto estiver abaixo de 100 unidades

**Configuração:**
- **Nome**: "Estoque Crítico"
- **Tipo**: Limite
- **Query DAX**:
  ```dax
  EVALUATE {
    SUM(Inventory[Quantity])
  }
  ```
- **Condição**: `less_than`
- **Threshold**: `100`
- **Agendamento**: Diário às 08:00, 14:00 e 20:00
- **Template**:
  ```
  ⚠️ *ALERTA: Estoque Baixo*
  
  Quantidade atual: *{{valor}}* unidades
  Limite mínimo: 100 unidades
  
  Ação necessária: Repor estoque!
  ```
- **WhatsApp**: Enviar para grupo de logística

### Exemplo 3: Relatório Semanal de Performance

**Objetivo**: Enviar relatório semanal toda segunda-feira às 9h

**Configuração:**
- **Nome**: "Relatório Semanal"
- **Tipo**: Relatório
- **Query DAX**:
  ```dax
  EVALUATE
  SUMMARIZE(
      Sales,
      "TotalVendas", SUM(Sales[Amount]),
      "NumPedidos", COUNTROWS(Sales),
      "TicketMedio", AVERAGE(Sales[Amount])
  )
  ```
- **Condição**: (sem condição, sempre dispara)
- **Agendamento**: Semanal, Segunda-feira às 09:00
- **Template**:
  ```
  📊 *Relatório Semanal*
  
  Total de Vendas: *{{total_vendas}}*
  Número de Pedidos: {{num_pedidos}}
  Ticket Médio: {{ticket_medio}}
  
  Período: Semana passada
  📅 {{data}}
  ```
- **WhatsApp**: Enviar para grupo de gestão

---

## 🔍 Histórico e Monitoramento

### Tabela de Histórico

Todos os disparos são registrados na tabela `ai_alert_history`:

```typescript
{
  id: string;
  alert_id: string;
  triggered_at: string;        // Data/hora do disparo
  trigger_type: string;        // 'scheduled' ou 'manual'
  value_at_trigger: string;    // Valor no momento do disparo
  notification_sent: boolean;  // Se enviou via WhatsApp
  notification_details: string; // JSON com detalhes do envio
}
```

### Acesso ao Histórico

Acesse `/alertas/historico` para ver todos os disparos realizados.

### Campos de Rastreamento

- **last_checked_at**: Última vez que o alerta foi verificado pelo cron
- **last_triggered_at**: Última vez que o alerta disparou (condição verdadeira)

---

## 🛡️ Boas Práticas

### Queries DAX

1. ✅ **Otimize queries**: Queries muito complexas podem demorar
2. ✅ **Teste antes**: Use o botão "Testar Query" antes de salvar
3. ✅ **Retorne valores numéricos**: Para condições, retorne números simples
4. ✅ **Evite queries que retornam muitas linhas**: O sistema usa apenas a primeira linha

### Templates de Mensagem

1. ✅ **Use variáveis dinâmicas**: Aproveite `{{valor}}`, `{{data}}`, etc.
2. ✅ **Formato para WhatsApp**: Use `*negrito*` e `_itálico_`
3. ✅ **Seja conciso**: Mensagens longas podem ser cortadas
4. ✅ **Use emojis moderadamente**: Facilita a leitura

### Agendamento

1. ✅ **Evite horários de pico**: Se tiver muitos alertas, distribua os horários
2. ✅ **Configure dias específicos**: Para relatórios semanais/mensais, use filtros de dia
3. ✅ **Considere o fuso horário**: Todos os horários são em Brasília

### Performance

1. ✅ **Não crie alertas desnecessários**: Cada alerta é verificado a cada minuto
2. ✅ **Desative alertas temporariamente**: Use `is_enabled = false` em vez de deletar
3. ✅ **Monitore o histórico**: Verifique se os alertas estão disparando corretamente

---

## 🚨 Troubleshooting

### Alerta não está disparando

**Verifique:**
1. ✅ Alerta está `is_enabled = true`?
2. ✅ `notify_whatsapp = true`?
3. ✅ Horário está correto? (lembre-se: horário de Brasília)
4. ✅ Dia da semana/mês está correto?
5. ✅ A condição está sendo atendida?
6. ✅ Query DAX retorna valores corretos?
7. ✅ Instância WhatsApp está conectada?

### Mensagens não estão sendo enviadas

**Verifique:**
1. ✅ Há instância WhatsApp ativa e conectada?
2. ✅ Números estão cadastrados como "Números Autorizados"?
3. ✅ Números estão no formato correto?
4. ✅ API do WhatsApp está respondendo?
5. ✅ Verifique os logs do cron para erros

### Query DAX retorna erro

**Verifique:**
1. ✅ Conexão Power BI está válida?
2. ✅ Dataset existe e está acessível?
3. ✅ Query está sintaticamente correta?
4. ✅ Medidas/tabelas referenciadas existem?
5. ✅ Teste a query no Power BI Desktop primeiro

### Cron não está executando

**Verifique:**
1. ✅ Plano da Vercel permite crons a cada minuto? (precisa ser Pro)
2. ✅ `CRON_SECRET` está definido nas variáveis de ambiente?
3. ✅ Arquivo `vercel.json` está configurado corretamente?
4. ✅ Teste manualmente: `?key=manual-trigger`

---

## 📚 Referências Técnicas

### APIs Relacionadas

- `GET /api/alertas` - Listar alertas
- `POST /api/alertas` - Criar alerta
- `PUT /api/alertas` - Atualizar alerta
- `DELETE /api/alertas` - Excluir alerta
- `GET /api/alertas/cron` - Executar verificação (cron)
- `POST /api/alertas/[id]/trigger` - Disparar alerta manualmente
- `GET /api/alertas/historico` - Obter histórico de disparos

### Tabelas do Banco de Dados

- `ai_alerts` - Tabela principal de alertas
- `ai_alert_history` - Histórico de disparos
- `powerbi_connections` - Conexões Power BI
- `company_groups` - Grupos/empresas
- `whatsapp_instances` - Instâncias WhatsApp
- `whatsapp_authorized_numbers` - Números autorizados

---

## 📝 Conclusão

O sistema de alertas fornece uma solução completa para monitoramento automático de dados do Power BI com notificações via WhatsApp. Com configuração flexível, agendamento preciso e templates personalizáveis, é possível criar alertas poderosos que mantêm sua equipe informada sobre métricas importantes em tempo real.

Para dúvidas ou problemas, consulte a seção de Troubleshooting ou entre em contato com o suporte técnico.

---

**Última atualização**: Janeiro 2024  
**Versão do documento**: 1.0
