# 📱 DOCUMENTAÇÃO COMPLETA DO SISTEMA WHATSAPP

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Banco de Dados](#estrutura-de-banco-de-dados)
4. [Módulos do Sistema](#módulos-do-sistema)
5. [Assistente de IA](#assistente-de-ia)
6. [Fluxo de Mensagens](#fluxo-de-mensagens)
7. [Alertas e Notificações](#alertas-e-notificações)
8. [Segurança e Permissões](#segurança-e-permissões)
9. [APIs e Endpoints](#apis-e-endpoints)
10. [Configuração e Setup](#configuração-e-setup)
11. [Troubleshooting](#troubleshooting)

---

## 📖 VISÃO GERAL

O sistema WhatsApp é uma plataforma completa de integração com WhatsApp Business via **Evolution API**, que inclui:

- 🤖 **Assistente de IA** com Claude Sonnet 4 para análise de dados Power BI
- 📊 **Alertas automáticos** baseados em queries DAX
- 💬 **Chat bidirecionado** com controle de permissões
- 📈 **Dashboard de métricas** e uso do sistema
- 🔔 **Notificações em tempo real** via webhook
- 👥 **Gestão de números e grupos** autorizados
- 🔐 **Controle de acesso por grupos de empresa**

---

## 🏗️ ARQUITETURA DO SISTEMA

### Stack Tecnológica

```
Frontend:
├── Next.js 16 (App Router)
├── TypeScript
├── Tailwind CSS
└── React Hooks

Backend:
├── Next.js API Routes
├── Supabase (PostgreSQL)
├── Evolution API v2
└── Anthropic Claude API (Sonnet 4)

Integrações:
├── Power BI REST API
├── Microsoft OAuth 2.0
└── Evolution API Webhooks
```

### Diagrama de Fluxo

```mermaid
┌─────────────┐
│ WhatsApp    │
│ (Usuário)   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│ Evolution API   │ ← Webhook configurado
│ (WhatsApp Web)  │
└──────┬──────────┘
       │
       ↓
┌──────────────────────────┐
│ Sistema (Webhook Endpoint)│
│ /api/whatsapp/webhook    │
└──────┬───────────────────┘
       │
       ├─→ Verifica autorização
       ├─→ Salva no banco
       ├─→ Processa com Claude IA
       ├─→ Executa query DAX (Power BI)
       └─→ Envia resposta
```

---

## 🗄️ ESTRUTURA DE BANCO DE DADOS

### Tabelas Principais

#### 1. `whatsapp_instances`
Armazena as instâncias conectadas à Evolution API

```sql
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  name TEXT NOT NULL,
  instance_name TEXT NOT NULL UNIQUE,
  api_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  phone_number TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos:**
- `instance_name`: Nome único na Evolution API
- `api_url`: URL base da Evolution API (ex: https://api.evolution.com)
- `api_key_encrypted`: API Key criptografada
- `phone_number`: Número do WhatsApp conectado
- `is_connected`: Status da conexão

#### 2. `whatsapp_authorized_numbers`
Números de WhatsApp autorizados a interagir

```sql
CREATE TABLE whatsapp_authorized_numbers (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  instance_id UUID REFERENCES whatsapp_instances(id),
  phone_number TEXT NOT NULL,
  name TEXT NOT NULL,
  can_receive_alerts BOOLEAN DEFAULT TRUE,
  can_use_chat BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Regras de Negócio:**
- `can_receive_alerts`: Permite receber alertas automáticos
- `can_use_chat`: Permite usar o assistente de IA
- `is_active`: Ativa/desativa temporariamente sem deletar

#### 3. `whatsapp_authorized_groups`
Grupos de WhatsApp autorizados

```sql
CREATE TABLE whatsapp_authorized_groups (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  instance_id UUID REFERENCES whatsapp_instances(id),
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  purpose TEXT,
  can_receive_alerts BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos:**
- `group_id`: ID do grupo no formato `120363123456789012@g.us`
- `purpose`: Finalidade do grupo (ex: "Alertas de vendas")

#### 4. `whatsapp_messages`
Histórico completo de mensagens

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  phone_number TEXT NOT NULL,
  message_content TEXT,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  sender_name TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tipos de Direção:**
- `incoming`: Mensagem recebida do usuário
- `outgoing`: Mensagem enviada pelo sistema

#### 5. `ai_alerts`
Configuração de alertas automáticos

```sql
CREATE TABLE ai_alerts (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT CHECK (alert_type IN ('warning', 'danger', 'success', 'info')),
  condition TEXT CHECK (condition IN ('greater_than', 'less_than', 'equals', ...)),
  threshold NUMERIC,
  dax_query TEXT NOT NULL,
  check_frequency TEXT CHECK (check_frequency IN ('daily', 'weekly', 'monthly')),
  check_times TEXT[],
  notify_whatsapp BOOLEAN DEFAULT TRUE,
  whatsapp_number TEXT[],
  whatsapp_group TEXT[],
  is_enabled BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos:**
- `dax_query`: Query DAX para buscar o valor
- `condition`: Condição de comparação
- `threshold`: Valor limite para disparar o alerta
- `check_times`: Horários específicos para verificação (ex: ["08:00", "12:00", "18:00"])
- `whatsapp_number`: Array de números para notificar
- `whatsapp_group`: Array de grupos para notificar

#### 6. `ai_alert_history`
Histórico de disparos de alertas

```sql
CREATE TABLE ai_alert_history (
  id UUID PRIMARY KEY,
  alert_id UUID REFERENCES ai_alerts(id),
  actual_value NUMERIC,
  threshold_value NUMERIC,
  message_sent TEXT,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `ai_model_contexts`
Contextos/documentação dos modelos Power BI

```sql
CREATE TABLE ai_model_contexts (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT,
  context_name TEXT NOT NULL,
  dataset_name TEXT,
  context_content TEXT NOT NULL,
  context_format TEXT DEFAULT 'markdown',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Uso:**
- Armazena a documentação das tabelas, medidas e colunas do modelo Power BI
- Usado pelo assistente de IA para gerar queries DAX corretas
- Suporta múltiplos modelos por grupo de empresa

---

## 📦 MÓDULOS DO SISTEMA

### 1. Dashboard (`/whatsapp`)

**Arquivo:** `app/whatsapp/page.tsx`

**Funcionalidades:**
- 📊 Cards com estatísticas gerais
- 📈 Uso do plano mensal (mensagens enviadas vs limite)
- 📋 Últimas mensagens (5 mais recentes)
- 🔗 Atalhos rápidos para módulos
- 💡 Painel lateral com detalhes de mensagem

**Métricas Exibidas:**
```javascript
{
  instances: { total, connected, disconnected },
  numbers: { total, active },
  groups: { total, active },
  messages: { total, sent, received, today }
}
```

---

### 2. Instâncias (`/whatsapp/instancias`)

**Arquivo:** `app/whatsapp/instancias/page.tsx`

**Funcionalidades:**
- ➕ Criar nova instância
- ✏️ Editar instância existente
- 🗑️ Excluir instância
- 🔄 Verificar status da conexão
- 📱 Gerar QR Code para conexão
- 🔌 Desconectar instância

**Campos do Formulário:**
```typescript
{
  name: string;           // Nome amigável
  api_url: string;        // URL da Evolution API
  api_key: string;        // API Key
  instance_name: string;  // Nome único na Evolution
}
```

**Ações Disponíveis:**

| Ação | Endpoint | Descrição |
|------|----------|-----------|
| Verificar Status | `GET /api/whatsapp/instances/{id}?action=status` | Atualiza status da conexão |
| Gerar QR Code | `GET /api/whatsapp/instances/{id}?action=qrcode` | Retorna QR Code + pairing code |
| Desconectar | `POST /api/whatsapp/instances/{id}` `{action: "logout"}` | Desconecta o WhatsApp |

**Indicadores Visuais:**
- 🟢 Verde: Conectado
- 🔴 Vermelho: Desconectado

---

### 3. Números Autorizados (`/whatsapp/numeros`)

**Arquivo:** `app/whatsapp/numeros/page.tsx`

**Funcionalidades:**
- ➕ Adicionar novo número
- ✏️ Editar permissões
- 🗑️ Remover autorização
- 🔍 Buscar por nome ou telefone
- 🔽 Filtrar por instância
- ✅/❌ Ativar/desativar número

**Permissões Configuráveis:**
- 🔔 **Pode receber alertas**: Número recebe alertas automáticos
- 💬 **Pode usar Chat IA**: Número pode conversar com o assistente

**Formato do Telefone:**
```
Formato esperado: [código país][DDD][número]
Exemplo: 5511999999999
         ^^  ^^  ^^^^^^^^^
         BR  SP  Número
```

**Estados:**
- ✅ Ativo: Número pode interagir normalmente
- ❌ Inativo: Número bloqueado temporariamente (sem deletar registro)

---

### 4. Grupos Autorizados (`/whatsapp/grupos`)

**Arquivo:** `app/whatsapp/grupos/page.tsx`

**Funcionalidades:**
- ➕ Adicionar novo grupo
- ✏️ Editar configurações
- 🗑️ Remover autorização
- 🔍 Buscar por nome ou ID
- ✅/❌ Ativar/desativar grupo

**Campos do Formulário:**
```typescript
{
  group_name: string;           // Nome do grupo
  group_id: string;             // ID formato: 120363...@g.us
  purpose: string;              // Finalidade (opcional)
  instance_id: string | null;   // Instância específica ou todas
  can_receive_alerts: boolean;  // Pode receber alertas
}
```

**Como Obter o ID do Grupo:**
1. Enviar uma mensagem de teste no grupo
2. Verificar o webhook recebido
3. Extrair o campo `remoteJid` (formato: `120363123456789012@g.us`)

---

### 5. Mensagens (`/whatsapp/mensagens`)

**Arquivo:** `app/whatsapp/mensagens/page.tsx`

**Funcionalidades:**
- 📋 Histórico completo de mensagens
- 🔍 Buscar por conteúdo ou remetente
- 🔽 Filtrar por direção (recebidas/enviadas)
- 📅 Filtrar por período
- 👁️ Ver detalhes completos da mensagem
- 📊 Paginação (50 mensagens por página)

**Indicadores:**
- ⬇️ **Azul**: Mensagem recebida (incoming)
- ⬆️ **Verde**: Mensagem enviada (outgoing)

**Informações Exibidas:**
- Nome do contato
- Telefone formatado
- Conteúdo da mensagem
- Data/hora relativa (ex: "5min atrás", "2h atrás")

---

### 6. Webhook (`/whatsapp/webhook`)

**Arquivo:** `app/whatsapp/webhook/page.tsx`

**Funcionalidades:**
- 📋 Exibir URL do webhook
- 📋 Copiar URL para clipboard
- 📖 Instruções passo a passo para configuração

**URL do Webhook:**
```
[domínio]/api/whatsapp/webhook
```

**Eventos Suportados:**
- ✅ `messages.upsert` (obrigatório)
- 🔄 `connection.update` (opcional)
- 📝 `messages.update` (opcional)

**Configuração na Evolution API:**

1. Acessar painel Evolution API (`:8080/manager`)
2. Selecionar instância
3. Ir em "Webhooks" ou "Settings" → "Webhooks"
4. Colar URL do webhook
5. Marcar evento `messages.upsert`
6. Salvar configurações

---

## 🤖 ASSISTENTE DE IA

### Overview

O assistente de IA utiliza **Claude Sonnet 4** (Anthropic) para responder perguntas sobre dados do Power BI via WhatsApp.

**Arquivo Principal:** `app/api/whatsapp/webhook/messages-upsert/route.ts`

### Fluxo de Funcionamento

```mermaid
1. Mensagem recebida
   ↓
2. Verifica autorização (número/grupo)
   ↓
3. Busca histórico de conversa (últimas 20 mensagens)
   ↓
4. Busca contexto do modelo Power BI
   ↓
5. Monta prompt dinâmico para Claude
   ↓
6. Claude analisa e gera query DAX
   ↓
7. Executa query no Power BI
   ↓
8. Claude formata resposta
   ↓
9. Envia via WhatsApp
   ↓
10. Salva no histórico
```

### System Prompt (Versão Atual)

```javascript
const systemPrompt = `Você é o Assistente Aquarius, um analista de BI via WhatsApp.

## REGRA MAIS IMPORTANTE
⚠️ NUNCA invente valores! Use SEMPRE a função execute_dax para buscar dados reais.
⚠️ Se não conseguir executar a query, diga que não encontrou os dados.
⚠️ SEMPRE consulte a seção "DOCUMENTAÇÃO DO MODELO" abaixo para saber os nomes EXATOS das tabelas, colunas e medidas. NUNCA adivinhe nomes.

## COMO USAR A DOCUMENTAÇÃO
1. Leia a documentação do modelo ANTES de criar qualquer query
2. Use EXATAMENTE os nomes de tabelas, colunas e medidas documentados
3. Aplique os filtros obrigatórios indicados (ex: Intercompany = "N")
4. Se uma coluna/medida não estiver na documentação, NÃO USE

## FORMATAÇÃO DAS MENSAGENS WHATSAPP
- NÃO use asteriscos (*) para negrito
- Use emojis de forma limpa e organizada
- Separe seções com linha: ━━━━━━━━━━━━━━━━━
- Seja conciso (máximo 1200 caracteres)

## FORMATO PARA VALORES/FATURAMENTO
📊 [Título do que foi pedido]

💰 R$ X.XXX.XXX,XX

📈 Comparativo se relevante

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ Opção 1
2️⃣ Opção 2
3️⃣ Opção 3

## FORMATO PARA RANKINGS/TOP N
🏆 [Título]

🥇 Primeiro: R$ X.XXX,XX
🥈 Segundo: R$ X.XXX,XX
🥉 Terceiro: R$ X.XXX,XX
4️⃣ Quarto: R$ X.XXX,XX
5️⃣ Quinto: R$ X.XXX,XX

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ Opção 1
2️⃣ Opção 2

## INTERPRETAÇÃO DE NÚMEROS
Se usuário digitar apenas 1, 2, 3 ou 4, interprete como a opção sugerida anteriormente.

## HISTÓRICO DA CONVERSA
${conversationContext}

${modelContext ? `## DOCUMENTAÇÃO DO MODELO (USE EXATAMENTE COMO ESTÁ AQUI)
${modelContext}
` : `## SEM DOCUMENTAÇÃO
Não há documentação do modelo disponível. Informe ao usuário que não foi possível acessar os dados.`}

## DATA ATUAL
${dataBR}
Mês atual: ${mesAtual}
Mês número: ${mesNumero}
Ano: ${ano}
`;
```

### Tool: execute_dax

**Descrição:** Executa queries DAX no Power BI e retorna os resultados

**Schema:**
```typescript
{
  name: 'execute_dax',
  description: 'Executa uma query DAX no Power BI para buscar dados.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A query DAX a ser executada'
      }
    },
    required: ['query']
  }
}
```

**Exemplo de Uso:**
```javascript
// Usuário: "Quanto faturamos em dezembro?"
// Claude gera:
{
  "query": "EVALUATE ROW(\"Valor\", CALCULATE([sReceitaBruta], Calendario[Mes] = 12, Calendario[Ano] = 2025))"
}
// Sistema executa e retorna: [{ "Valor": 2432919.67 }]
// Claude formata: "💰 R$ 2.432.919,67"
```

### Histórico de Conversa

**Limite:** 20 mensagens mais recentes
**Formato:**
```
Usuário: Quanto faturamos em dezembro?
Assistente: 💰 R$ 2.432.919,67
Usuário: E por filial?
Assistente: [resposta com breakdown por filial]
```

**Uso:** Mantém contexto para perguntas subsequentes

### Contexto do Modelo

**Origem:** Tabela `ai_model_contexts`
**Limite:** 12.000 caracteres
**Formato:** Markdown

**Exemplo de Contexto:**
```markdown
# Modelo: Hospcom

## Tabelas

### Calendario
- Mes (número 1-12)
- Ano (número)
- Data (date)

### Filial
- CodFilial (text)
- NomeFilial (text)

### Faturamento
- **FILTRO OBRIGATÓRIO:** Intercompany = "N"

## Medidas

### [sReceitaBruta]
**Descrição:** Receita bruta total
**Tipo:** Moeda (BRL)
**Uso:** CALCULATE([sReceitaBruta], [filtros])

### [sQtdConvenio]
**Descrição:** Quantidade de convênios
**Tipo:** Inteiro
```

### Lógica de Seleção de Dataset

```javascript
// Prioridade:
// 1. Dataset do último alerta disparado para o número (últimas 24h)
// 2. Dataset da primeira conexão Power BI ativa
// 3. Dataset do primeiro relatório ativo
// 4. Dataset do primeiro alerta cadastrado
```

### Filtros e Limpeza da Resposta

**Antes de enviar ao WhatsApp, o sistema remove:**
- Blocos de código DAX
- Tags XML
- Queries DAX expostas
- Mensagens de erro técnicas
- Informações de debug

**Regex aplicados:**
```javascript
.replace(/```dax[\s\S]*?```/gi, '')
.replace(/```[\s\S]*?```/g, '')
.replace(/<execute_dax>[\s\S]*?<\/execute_dax>/gi, '')
.replace(/<[^>]+>/g, '')
.replace(/EVALUATE[\s\S]*?(?=\n\n|\n📊|$)/gi, '')
.replace(/DAX\([^)]+\)/gi, '')
.replace(/Error:.*?(?=\n|$)/gi, '')
```

### Fallbacks

**Se não houver contexto do modelo:**
```
⚠️ Não foi possível acessar os dados. Por favor, verifique se o contexto do modelo está configurado.
```

**Se a resposta ficar muito curta (< 20 caracteres):**
```
📊 Não consegui processar essa consulta. Pode reformular a pergunta?
```

### Limitações

| Limitação | Valor |
|-----------|-------|
| Caracteres por mensagem | 1.200 |
| Tokens por resposta Claude | 800 |
| Iterações de tool calls | 2 |
| Mensagens no histórico | 20 |
| Caracteres do contexto | 12.000 |

---

## 📬 FLUXO DE MENSAGENS

### 1. Recebimento (Incoming)

```mermaid
WhatsApp Usuário
     ↓
Evolution API
     ↓
POST /api/whatsapp/webhook
     ↓
Validações:
 ├─ Evento é messages.upsert?
 ├─ Não é mensagem própria (fromMe)?
 ├─ Tem conteúdo de texto?
 └─ Número está autorizado?
     ↓
Salva em whatsapp_messages
     ↓
Busca histórico de conversa
     ↓
Processa com Claude IA
     ↓
Envia resposta
     ↓
Salva resposta no banco
```

### 2. Envio (Outgoing)

**Via Assistente de IA:**
```javascript
await sendWhatsAppMessage(instance, phone, assistantMessage);

// Chamada à Evolution API:
POST [api_url]/message/sendText/[instance_name]
Headers: { apikey: api_key }
Body: {
  number: "5511999999999",
  text: "💰 R$ 2.432.919,67"
}
```

**Via Alertas:**
```javascript
// Para cada número/grupo configurado no alerta
for (const phone of alert.whatsapp_number) {
  await sendWhatsAppMessage(instance, phone, alertMessage);
}

for (const groupId of alert.whatsapp_group) {
  await sendWhatsAppMessage(instance, groupId, alertMessage);
}
```

### 3. Formato de Dados do Webhook

**Evolution API v2 - messages.upsert:**
```json
{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0C43..."
    },
    "message": {
      "conversation": "Quanto faturamos em dezembro?"
    },
    "messageTimestamp": 1704672000
  }
}
```

**Extração de Dados:**
```javascript
const remoteJid = data?.key?.remoteJid;  // "5511999999999@s.whatsapp.net"
const fromMe = data?.key?.fromMe;        // false
const messageText = data?.message?.conversation || 
                    data?.message?.extendedTextMessage?.text;
const phone = remoteJid?.replace('@s.whatsapp.net', '')
                       .replace('@g.us', '');
```

---

## 🔔 ALERTAS E NOTIFICAÇÕES

### Configuração de Alertas (`/alertas`)

**Arquivo:** `app/alertas/page.tsx`

**Tipos de Alerta:**
- ⚠️ **Warning** (Aviso)
- 🔴 **Danger** (Perigo)
- ✅ **Success** (Sucesso)
- ℹ️ **Info** (Informação)

**Condições Suportadas:**
- `greater_than`: Maior que
- `less_than`: Menor que
- `equals`: Igual a
- `not_equals`: Diferente de
- `greater_or_equal`: Maior ou igual
- `less_or_equal`: Menor ou igual

**Frequências:**
- 📅 **daily**: Diário
- 📆 **weekly**: Semanal
- 📅 **monthly**: Mensal

**Horários:**
- Array de horários (formato: `["08:00", "12:00", "18:00"]`)
- Verificação automática nos horários definidos

**Exemplo de Configuração:**
```json
{
  "name": "Alerta de Faturamento Baixo",
  "description": "Notifica quando faturamento diário < R$ 50k",
  "alert_type": "danger",
  "condition": "less_than",
  "threshold": 50000,
  "dax_query": "EVALUATE ROW(\"Valor\", CALCULATE([sReceitaBruta], Calendario[Data] = TODAY()))",
  "check_frequency": "daily",
  "check_times": ["09:00", "14:00", "18:00"],
  "notify_whatsapp": true,
  "whatsapp_number": ["5511999999999"],
  "whatsapp_group": [],
  "is_enabled": true
}
```

### Trigger Manual

**Endpoint:** `POST /api/alertas/{id}/trigger`

**Ação:** Dispara o alerta imediatamente, ignorando schedule

**Uso:** Botão "⚡ Disparar Agora" na interface

### Lógica de Verificação

```javascript
// 1. Buscar alertas habilitados (is_enabled = true)
// 2. Filtrar por horário (se check_times definido)
// 3. Para cada alerta:
//    a. Executar dax_query no Power BI
//    b. Comparar resultado com threshold usando condition
//    c. Se condição atendida:
//       - Salvar em ai_alert_history
//       - Enviar notificações WhatsApp
//       - Atualizar last_triggered_at
```

### Formato da Notificação

```
🔴 ALERTA: Faturamento Baixo

📊 Valor Atual: R$ 42.350,00
⚠️ Limite: R$ 50.000,00

📅 Verificado em: 07/01/2026 às 14:00

━━━━━━━━━━━━━━━━━
Para mais detalhes, acesse o dashboard.
```

### Histórico (`/alertas/historico`)

**Arquivo:** `app/alertas/historico/page.tsx`

**Informações Registradas:**
- Data/hora do disparo
- Nome do alerta
- Valor encontrado
- Valor limite (threshold)
- Mensagem enviada
- Destinatários

**Paginação:** 50 registros por página

---

## 🔐 SEGURANÇA E PERMISSÕES

### Níveis de Autorização

#### 1. Instância
- Cada grupo de empresa pode ter múltiplas instâncias
- Instância pertence a um único grupo

#### 2. Número/Grupo WhatsApp
- Deve estar cadastrado em `whatsapp_authorized_numbers` ou `whatsapp_authorized_groups`
- `is_active = true`
- Pode estar vinculado a uma instância específica ou todas

#### 3. Permissões Específicas
- `can_receive_alerts`: Recebe notificações de alertas
- `can_use_chat`: Pode conversar com assistente de IA

### Validação no Webhook

```javascript
// 1. Buscar número autorizado
const { data: authorizedNumber } = await supabase
  .from('whatsapp_authorized_numbers')
  .select('*, company_group_id')
  .eq('phone_number', phone)
  .eq('is_active', true)
  .maybeSingle();

if (!authorizedNumber) {
  return NextResponse.json({ 
    status: 'ignored', 
    reason: 'unauthorized number' 
  });
}

// 2. Verificar permissão de chat
if (!authorizedNumber.can_use_chat) {
  // Ignora mensagem
}

// 3. Usar company_group_id para filtrar dados
```

### Criptografia

**API Keys:**
- Armazenadas criptografadas no banco (`api_key_encrypted`)
- Descriptografadas apenas em tempo de execução
- Nunca expostas em logs ou respostas

**Senhas:**
- Hashing com `bcrypt` (10 rounds)
- Nunca armazenadas em texto plano

### Rate Limiting

**Por Grupo de Empresa:**
- Limite mensal de mensagens configurável
- Verificado em cada envio
- Endpoint: `GET /api/whatsapp/usage`

```javascript
{
  "used_this_month": 245,
  "monthly_limit": 1000,
  "percentage": 24.5
}
```

**Alertas de Uso:**
- 🟢 < 50%: Verde
- 🟡 50-80%: Amarelo
- 🔴 > 80%: Vermelho

---

## 🛠️ APIS E ENDPOINTS

### Instâncias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/instances` | Lista todas as instâncias |
| POST | `/api/whatsapp/instances` | Cria nova instância |
| PUT | `/api/whatsapp/instances` | Atualiza instância |
| DELETE | `/api/whatsapp/instances?id={id}` | Exclui instância |
| GET | `/api/whatsapp/instances/{id}?action=status` | Verifica status |
| GET | `/api/whatsapp/instances/{id}?action=qrcode` | Gera QR Code |
| POST | `/api/whatsapp/instances/{id}` | Ações (logout, etc) |

### Números Autorizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/authorized-numbers` | Lista números |
| POST | `/api/whatsapp/authorized-numbers` | Adiciona número |
| PUT | `/api/whatsapp/authorized-numbers` | Atualiza número |
| DELETE | `/api/whatsapp/authorized-numbers?id={id}` | Remove número |

### Grupos Autorizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/groups` | Lista grupos |
| POST | `/api/whatsapp/groups` | Adiciona grupo |
| PUT | `/api/whatsapp/groups` | Atualiza grupo |
| DELETE | `/api/whatsapp/groups?id={id}` | Remove grupo |

### Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/messages` | Lista mensagens |
| GET | `/api/whatsapp/messages?limit=50&offset=0` | Com paginação |
| GET | `/api/whatsapp/messages?direction=incoming` | Filtra por direção |
| GET | `/api/whatsapp/messages?search=termo` | Busca por conteúdo |

### Webhook

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/whatsapp/webhook` | Recebe eventos da Evolution API |
| POST | `/api/whatsapp/webhook/messages-upsert` | Processa mensagens |
| GET | `/api/whatsapp/webhook` | Verificação de saúde |

### Alertas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/alertas` | Lista alertas |
| POST | `/api/alertas` | Cria alerta |
| PUT | `/api/alertas` | Atualiza alerta |
| DELETE | `/api/alertas?id={id}` | Exclui alerta |
| POST | `/api/alertas/{id}/trigger` | Dispara manualmente |
| GET | `/api/alertas/historico` | Histórico de disparos |

### Uso

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/usage` | Uso mensal do grupo |

---

## ⚙️ CONFIGURAÇÃO E SETUP

### 1. Variáveis de Ambiente

```env
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# Criptografia
ENCRYPTION_KEY=chave-secreta-32-caracteres
```

### 2. Configurar Evolution API

**Requisitos:**
- Evolution API v2 instalada e rodando
- Acesso ao manager (porta :8080)

**Passos:**
1. Criar instância na Evolution API
2. Anotar `instance_name` e `api_key`
3. Configurar webhook para `[seu-dominio]/api/whatsapp/webhook`
4. Marcar evento `messages.upsert`
5. Escanear QR Code para conectar WhatsApp

### 3. Cadastrar Instância no Sistema

1. Acessar `/whatsapp/instancias`
2. Clicar em "Nova Instância"
3. Preencher:
   - Nome: "WhatsApp Principal"
   - URL da API: "https://evolution.seu-dominio.com"
   - Nome da Instância: "nome-instancia"
   - API Key: "chave-da-evolution"
4. Salvar

### 4. Autorizar Números

1. Acessar `/whatsapp/numeros`
2. Clicar em "Novo Número"
3. Preencher:
   - Nome: "João Silva"
   - Telefone: "5511999999999"
   - Instância: Selecionar ou deixar "Todas"
   - ✅ Pode receber alertas
   - ✅ Pode usar Chat IA
4. Salvar

### 5. Criar Contexto do Modelo

1. Acessar `/powerbi/contextos`
2. Criar novo contexto
3. Documentar:
   - Tabelas e colunas
   - Medidas principais
   - Filtros obrigatórios
   - Tipos de dados
4. Formato Markdown
5. Salvar

**Exemplo de Documentação:**
```markdown
# Modelo: Hospcom

## Tabelas

### Calendario
- Mes: Número do mês (1-12)
- Ano: Ano (ex: 2025)
- Data: Data completa

## Medidas

### [sReceitaBruta]
**Tipo:** Moeda (BRL)
**Descrição:** Receita bruta total
**Uso:** `CALCULATE([sReceitaBruta], filtros)`
**Nota:** Sempre filtrar por Intercompany = "N"
```

### 6. Configurar Alerta

1. Acessar `/alertas`
2. Clicar em "Novo Alerta"
3. Preencher:
   - Nome: "Alerta Faturamento Baixo"
   - Tipo: Danger
   - Query DAX: `EVALUATE ROW("Valor", CALCULATE([sReceitaBruta], ...))`
   - Condição: Menor que
   - Valor limite: 50000
   - Frequência: Diário
   - Horários: ["09:00", "14:00", "18:00"]
   - Números WhatsApp: Selecionar
4. Salvar

---

## 🐛 TROUBLESHOOTING

### Mensagens não são recebidas

**Verificar:**
1. ✅ Instância está conectada (`is_connected = true`)
2. ✅ Webhook configurado na Evolution API
3. ✅ Evento `messages.upsert` está marcado
4. ✅ Número está autorizado (`is_active = true`)
5. ✅ Permissão `can_use_chat = true`
6. ✅ URL do webhook está acessível

**Logs:**
```javascript
// No webhook, adicionar:
console.log('Webhook recebido:', JSON.stringify(body).substring(0, 500));
console.log('Número extraído:', phone);
console.log('Número autorizado:', authorizedNumber ? 'SIM' : 'NÃO');
```

### Assistente não responde

**Verificar:**
1. ✅ `ANTHROPIC_API_KEY` configurada
2. ✅ Conexão Power BI ativa
3. ✅ Dataset ID correto
4. ✅ Contexto do modelo cadastrado
5. ✅ Query DAX válida
6. ✅ Instância WhatsApp conectada

**Debug:**
```javascript
console.log('connectionId:', connectionId || 'NENHUM');
console.log('datasetId:', datasetId || 'NENHUM');
console.log('modelContext:', modelContext ? 'SIM' : 'NÃO');
console.log('Tools configuradas:', tools.length);
```

### Alertas não disparam

**Verificar:**
1. ✅ Alerta habilitado (`is_enabled = true`)
2. ✅ Horário atual está em `check_times`
3. ✅ Query DAX válida e retorna valor
4. ✅ Condição configurada corretamente
5. ✅ Números/grupos configurados
6. ✅ `notify_whatsapp = true`

**Testar:**
- Usar botão "⚡ Disparar Agora" para teste manual
- Verificar em `/alertas/historico` se foi registrado

### QR Code não aparece

**Verificar:**
1. ✅ Instância está desconectada (`is_connected = false`)
2. ✅ API URL e API Key corretos
3. ✅ Evolution API está online
4. ✅ Nome da instância correto

**Teste manual:**
```bash
curl -X GET "https://evolution.dominio.com/instance/qrcode/nome-instancia" \
  -H "apikey: sua-api-key"
```

### Erro "Sem permissão para acessar esta conexão"

**Causa:** Usuário/grupo não tem acesso ao `company_group_id` da conexão Power BI

**Solução:**
1. Verificar `company_group_id` da conexão
2. Verificar `company_group_id` do número autorizado
3. Devem ser iguais

### Contexto do modelo não carrega

**Verificar:**
1. ✅ Contexto cadastrado em `/powerbi/contextos`
2. ✅ `is_active = true`
3. ✅ `connection_id` corresponde à conexão usada
4. ✅ `dataset_id` correto (pode ser null)

**Logs:**
```javascript
console.log('Contexto do modelo carregado:', modelContext.substring(0, 200));
// Ou
console.log('⚠️ AVISO: Nenhum contexto encontrado para connectionId:', connectionId);
```

---

## 📊 MÉTRICAS E MONITORAMENTO

### Dashboard de Uso

**Endpoint:** `GET /api/whatsapp/usage`

**Retorno:**
```json
{
  "used_this_month": 245,
  "monthly_limit": 1000,
  "percentage": 24.5,
  "remaining": 755
}
```

### Logs de Atividade

**Tabela:** `activity_logs`

**Ações Registradas:**
- `login`: Login de usuário
- `create`: Criação de recursos
- `update`: Atualização de recursos
- `delete`: Exclusão de recursos
- `view`: Visualização de dados
- `query`: Execução de queries
- `alert`: Disparo de alertas
- `message`: Envio de mensagens

**Módulos:**
- `auth`: Autenticação
- `powerbi`: Power BI
- `whatsapp`: WhatsApp
- `alertas`: Alertas
- `chat_ia`: Chat IA
- `config`: Configurações

---

## 🔄 MANUTENÇÃO

### Limpeza de Dados

**Mensagens antigas (> 90 dias):**
```sql
DELETE FROM whatsapp_messages 
WHERE created_at < NOW() - INTERVAL '90 days';
```

**Histórico de alertas (> 180 dias):**
```sql
DELETE FROM ai_alert_history 
WHERE triggered_at < NOW() - INTERVAL '180 days';
```

### Backup

**Tabelas Críticas:**
- `whatsapp_instances`
- `whatsapp_authorized_numbers`
- `whatsapp_authorized_groups`
- `ai_alerts`
- `ai_model_contexts`

**Comando:**
```bash
pg_dump -h host -U user -d database \
  -t whatsapp_instances \
  -t whatsapp_authorized_numbers \
  -t whatsapp_authorized_groups \
  -t ai_alerts \
  -t ai_model_contexts \
  > backup_whatsapp.sql
```

---

## 📝 CHANGELOG

### Versão Atual (2026-01-07)

**✨ Novidades:**
- ✅ Prompt dinâmico usando contexto do banco
- ✅ Suporte multi-cliente (Aquarius, Hospcom, etc.)
- ✅ Limite de contexto aumentado para 12.000 caracteres
- ✅ Logs de debug melhorados
- ✅ Mensagens de fallback contextuais

**🔧 Correções:**
- ✅ Removidas queries DAX hardcoded
- ✅ Corrigido conflito entre prompt e documentação
- ✅ Melhorada seleção de dataset

**📚 Documentação:**
- ✅ Documentação completa do sistema criada

---

## 📞 SUPORTE

**Em caso de dúvidas ou problemas:**

1. 📖 Consultar esta documentação
2. 🔍 Verificar logs no terminal
3. 🐛 Verificar seção Troubleshooting
4. 💬 Contatar o administrador do sistema

---

## 🎯 ROADMAP FUTURO

**Funcionalidades Planejadas:**
- [ ] Suporte a múltiplos idiomas
- [ ] Envio de imagens e arquivos
- [ ] Chatbot com fluxos personalizados
- [ ] Dashboard de métricas em tempo real
- [ ] Integração com outros LLMs (GPT-4, Gemini)
- [ ] Agendamento de mensagens
- [ ] Templates de mensagens
- [ ] Relatórios automatizados
- [ ] Integração com CRM
- [ ] API pública para integrações

---

**Documentação criada em:** 07/01/2026  
**Versão:** 1.0  
**Sistema:** MeuDashboard WhatsApp Integration  
**Autor:** Sistema de IA

---

**FIM DA DOCUMENTAÇÃO** 📱✨
