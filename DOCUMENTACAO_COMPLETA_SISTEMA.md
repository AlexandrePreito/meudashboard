# 📚 Documentação Completa do Sistema MeuDashboard

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Pastas e Hierarquia](#estrutura-de-pastas-e-hierarquia)
3. [Chat do WhatsApp](#chat-do-whatsapp)
4. [Chat do Dashboard (Site)](#chat-do-dashboard-site)
5. [Sistema de Planos e Módulos](#sistema-de-planos-e-módulos)
6. [APIs do Sistema](#apis-do-sistema)
7. [Páginas e Rotas](#páginas-e-rotas)
8. [Fluxos de Dados](#fluxos-de-dados)

---

## 🎯 Visão Geral

**MeuDashboard** é uma plataforma completa de Business Intelligence que integra:
- 📊 **Power BI Embedded** para visualização de dashboards
- 🤖 **Claude AI (Anthropic)** para análise inteligente de dados
- 📱 **WhatsApp** via Evolution API para comunicação
- 🔔 **Sistema de Alertas** automáticos baseados em dados
- 👥 **Multi-tenant** com controle de planos e módulos

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
├── Anthropic Claude API
└── Evolution API (WhatsApp)

Integrações:
├── Power BI REST API
├── Microsoft OAuth 2.0
└── WhatsApp Webhooks
```

---

## 📁 Estrutura de Pastas e Hierarquia

### Estrutura Completa do Projeto

```
meudahsboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── ai/                   # APIs de IA
│   │   │   ├── chat/            # Chat IA do dashboard
│   │   │   ├── contexts/        # Contextos de modelos
│   │   │   ├── generate-dax/   # Geração de DAX
│   │   │   └── usage/           # Uso de tokens
│   │   ├── whatsapp/            # APIs WhatsApp
│   │   │   ├── webhook/         # Webhook principal
│   │   │   ├── instances/       # Instâncias WhatsApp
│   │   │   ├── authorized-numbers/ # Números autorizados
│   │   │   ├── groups/          # Grupos autorizados
│   │   │   └── messages/        # Histórico de mensagens
│   │   ├── powerbi/             # APIs Power BI
│   │   │   ├── connections/     # Conexões Power BI
│   │   │   ├── datasets/        # Datasets
│   │   │   ├── screens/         # Telas/Dashboards
│   │   │   ├── embed/           # Tokens de embed
│   │   │   └── refresh/         # Atualização de dados
│   │   ├── alertas/             # APIs de Alertas
│   │   ├── plans/               # APIs de Planos
│   │   ├── modules/             # APIs de Módulos
│   │   └── auth/                # Autenticação
│   ├── dashboard/               # Página inicial (redireciona)
│   ├── tela/[id]/               # Visualização de dashboard com chat
│   ├── whatsapp/                # Módulo WhatsApp
│   │   ├── page.tsx             # Dashboard WhatsApp
│   │   ├── instancias/         # Gestão de instâncias
│   │   ├── numeros/            # Números autorizados
│   │   ├── grupos/              # Grupos autorizados
│   │   ├── mensagens/           # Histórico de mensagens
│   │   └── webhook/             # Configuração webhook
│   ├── powerbi/                 # Módulo Power BI
│   ├── alertas/                 # Módulo Alertas
│   ├── configuracoes/           # Configurações
│   │   ├── planos/              # Gestão de planos
│   │   ├── modulos/             # Gestão de módulos
│   │   └── grupos/              # Gestão de grupos
│   ├── admin/                   # Painel Master
│   └── dev/                     # Painel Developer
├── src/
│   ├── components/              # Componentes React
│   │   ├── layout/              # Layout (Sidebar, Header)
│   │   ├── whatsapp/            # Componentes WhatsApp
│   │   └── ui/                  # Componentes UI
│   ├── lib/                     # Bibliotecas e utilitários
│   │   ├── supabase/            # Cliente Supabase
│   │   └── encryption/         # Criptografia
│   ├── hooks/                   # Hooks customizados
│   ├── contexts/               # Contextos React
│   ├── types/                   # Tipagens TypeScript
│   └── services/               # Serviços externos
├── sql/                         # Migrations SQL
│   ├── modules.sql             # Tabela de módulos
│   ├── plans.sql                # Tabela de planos
│   └── create_whatsapp_user_selections.sql
└── public/                      # Arquivos estáticos
```

### Hierarquia de Acesso

```
┌─────────────────────────────────────────┐
│           MASTER (is_master)            │
│  - Acesso total ao sistema              │
│  - Gerencia todos os grupos              │
│  - Cria planos e módulos                 │
│  - Painel: /admin                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│        DEVELOPER (is_developer)         │
│  - Gerencia grupos atribuídos            │
│  - Distribui cotas                      │
│  - Painel: /dev                         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│         ADMIN (role: admin)             │
│  - Gerencia grupo específico            │
│  - Configura módulos                    │
│  - Gerencia usuários do grupo           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│      MANAGER/OPERATOR/VIEWER            │
│  - Acesso limitado por permissões       │
│  - Visualiza dashboards                 │
│  - Usa chat IA (se habilitado)          │
└─────────────────────────────────────────┘
```

---

## 📱 Chat do WhatsApp

### Visão Geral

O chat do WhatsApp permite que usuários conversem com um assistente de IA via WhatsApp para obter análises de dados em tempo real.

**Arquivo Principal:** `app/api/whatsapp/webhook/route.ts`

### Fluxo Completo

```
1. Usuário envia mensagem no WhatsApp
   ↓
2. Evolution API recebe e envia webhook
   ↓
3. POST /api/whatsapp/webhook
   ├─ Valida número autorizado
   ├─ Extrai texto da mensagem
   ├─ Busca histórico de conversa (últimas 10)
   ├─ Busca contexto do modelo Power BI
   ├─ Processa com Claude AI
   ├─ Executa queries DAX (se necessário)
   ├─ Formata resposta
   ├─ Envia via WhatsApp
   └─ Salva no histórico
```

### Funcionalidades Principais

#### 1. Seleção de Dataset Múltiplo

Quando um número está vinculado a múltiplos grupos (cada um com seu dataset):

```typescript
// Busca TODOS os contextos dos grupos do número
const { data: allContexts } = await supabase
  .from('ai_model_contexts')
  .select('id, connection_id, dataset_id, context_content, context_name, dataset_name, company_group_id')
  .in('company_group_id', allGroupIds)
  .eq('is_active', true);

// Se múltiplos datasets, mostra lista para escolher
if (allContexts && allContexts.length > 1) {
  // Mostra lista numerada
  // Usuário escolhe digitando o número
  // Salva escolha em whatsapp_user_selections
}
```

**Tabela:** `whatsapp_user_selections`
- Armazena seleção temporária (24h)
- Vincula número → dataset escolhido

#### 2. Histórico de Conversa

```typescript
// Busca últimas 10 mensagens não arquivadas
const { data: recentMessages } = await supabase
  .from('whatsapp_messages')
  .select('message_content, direction, created_at')
  .eq('phone_number', phone)
  .in('company_group_id', allGroupIds)
  .eq('archived', false)
  .order('created_at', { ascending: false })
  .limit(10);

// Constrói histórico para Claude
const conversationHistory = recentMessages
  .reverse()
  .map(msg => ({
    role: msg.direction === 'incoming' ? 'user' : 'assistant',
    content: msg.message_content
  }));
```

#### 3. System Prompt Inteligente

O prompt inclui:
- Personalidade do assistente
- Regras de formatação WhatsApp
- Contexto do modelo Power BI
- Histórico de conversa
- Regras de interpretação de datas
- Sugestões contextuais

#### 4. Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `/ajuda` ou `ajuda` | Mostra ajuda e exemplos |
| `/limpar` ou `limpar` | Arquiva histórico e remove seleção de dataset |
| `/status` ou `status` | Mostra status da conexão e dataset |
| `trocar` | Reseta seleção e mostra lista de datasets novamente |

#### 5. Divisão de Mensagens Longas

Mensagens > 2000 caracteres são automaticamente divididas:
- Divisão por parágrafos primeiro
- Cada parte prefixada com "📄 *Parte X/Y*"
- Delay de 1.5s entre envios

### Estrutura de Dados

#### Tabela: `whatsapp_messages`

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  phone_number TEXT NOT NULL,
  message_content TEXT,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  sender_name TEXT,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `whatsapp_user_selections`

```sql
CREATE TABLE whatsapp_user_selections (
  id UUID PRIMARY KEY,
  phone_number TEXT NOT NULL,
  company_group_id UUID NOT NULL,
  selected_connection_id UUID NOT NULL,
  selected_dataset_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Limpeza automática:** Seleções > 24h são removidas

### APIs Relacionadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/whatsapp/webhook` | POST | Recebe webhooks da Evolution API |
| `/api/whatsapp/messages` | GET | Lista mensagens (com filtros) |
| `/api/whatsapp/authorized-numbers` | GET/POST | Gerencia números autorizados |
| `/api/whatsapp/instances` | GET/POST | Gerencia instâncias WhatsApp |

### Páginas Relacionadas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/whatsapp` | `app/whatsapp/page.tsx` | Dashboard com estatísticas |
| `/whatsapp/instancias` | `app/whatsapp/instancias/page.tsx` | Gestão de instâncias |
| `/whatsapp/numeros` | `app/whatsapp/numeros/page.tsx` | Números autorizados |
| `/whatsapp/mensagens` | `app/whatsapp/mensagens/page.tsx` | Histórico de mensagens |
| `/whatsapp/webhook` | `app/whatsapp/webhook/page.tsx` | Configuração webhook |

---

## 💬 Chat do Dashboard (Site)

### Visão Geral

O chat do dashboard permite que usuários conversem com IA diretamente nas telas Power BI para obter análises contextuais dos dados exibidos.

**Arquivo Principal:** `app/api/ai/chat/route.ts`  
**Página:** `app/tela/[id]/page.tsx`

### Fluxo Completo

```
1. Usuário abre tela Power BI (/tela/[id])
   ↓
2. Clica no botão de chat (se habilitado)
   ↓
3. Digita pergunta
   ↓
4. POST /api/ai/chat
   ├─ Valida autenticação
   ├─ Busca tela e relatório associado
   ├─ Busca contexto do modelo
   ├─ Busca histórico da conversa (conversation_id)
   ├─ Processa com Claude AI
   ├─ Executa queries DAX (se necessário)
   ├─ Formata resposta
   └─ Retorna JSON
   ↓
5. Exibe resposta no chat
   ↓
6. Salva mensagem no histórico
```

### Funcionalidades Principais

#### 1. Contexto da Tela

O chat usa o contexto do relatório Power BI associado à tela:

```typescript
// Busca tela e relatório
const { data: screen } = await supabase
  .from('powerbi_dashboard_screens')
  .select(`
    id,
    title,
    report:powerbi_reports(
      id,
      name,
      dataset_id,
      connection_id
    )
  `)
  .eq('id', screen_id)
  .single();

// Usa connection_id e dataset_id do relatório
```

#### 2. Histórico de Conversa

```typescript
// Busca conversa existente ou cria nova
let conversationId: string | null = null;

if (conversation_id) {
  conversationId = conversation_id;
} else {
  // Cria nova conversa
  const { data: newConv } = await supabase
    .from('ai_conversations')
    .insert({
      company_group_id,
      screen_id,
      user_id: user.id
    })
    .select('id')
    .single();
  
  conversationId = newConv.id;
}

// Busca mensagens anteriores
const { data: messages } = await supabase
  .from('ai_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });
```

#### 3. Permissões

O chat verifica permissões do usuário:

```typescript
// Master/Developer: sempre pode usar
if (user.is_master || user.is_developer) {
  canUseAI = true;
} else {
  // Verifica permissão no membership
  canUseAI = membership.can_use_ai ?? false;
}
```

#### 4. Sugestões Inteligentes

Após cada resposta, o sistema extrai sugestões:

```typescript
function extractSuggestions(content: string): { text: string; suggestions: string[] } {
  const match = content.match(/\[SUGESTOES\]([\s\S]*?)\[\/SUGESTOES\]/);
  if (match) {
    const suggestionsText = match[1];
    const suggestionsList = suggestionsText
      .split('\n')
      .map(s => s.replace(/^-\s*/, '').trim())
      .filter(s => s.length > 0);
    const cleanText = content.replace(/\[SUGESTOES\][\s\S]*?\[\/SUGESTOES\]/, '').trim();
    return { text: cleanText, suggestions: suggestionsList };
  }
  return { text: content, suggestions: [] };
}
```

### Estrutura de Dados

#### Tabela: `ai_conversations`

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  screen_id UUID REFERENCES powerbi_dashboard_screens(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Tabela: `ai_messages`

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Interface do Chat

**Componente:** Integrado em `app/tela/[id]/page.tsx`

**Características:**
- Botão flutuante no canto inferior direito
- Painel deslizante lateral
- Histórico de mensagens
- Campo de input com botão enviar
- Indicador de processamento
- Sugestões clicáveis

**Estados:**
- `chatOpen`: Chat aberto/fechado
- `messages`: Array de mensagens
- `sending`: Enviando mensagem
- `processingStatus`: Status do processamento
- `suggestions`: Sugestões extraídas

### APIs Relacionadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/ai/chat` | POST | Processa mensagem do chat |
| `/api/ai/contexts` | GET | Lista contextos disponíveis |
| `/api/ai/usage` | GET | Uso de tokens da API |

### Páginas Relacionadas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/tela/[id]` | `app/tela/[id]/page.tsx` | Tela Power BI com chat integrado |
| `/dashboard` | `app/dashboard/page.tsx` | Redireciona para primeira tela |

---

## 📦 Sistema de Planos e Módulos

### Visão Geral

O sistema usa **Planos** para definir limites quantitativos e **Módulos** para definir funcionalidades disponíveis.

### Planos

**Tabela:** `powerbi_plans`

```sql
CREATE TABLE powerbi_plans (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_daily_refreshes INTEGER DEFAULT 1,
  max_powerbi_screens INTEGER DEFAULT 3,
  max_users INTEGER DEFAULT 10,
  max_companies INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);
```

**Planos Padrão:**

| Plano | Atualizações/dia | Telas | Usuários | Empresas |
|-------|------------------|-------|----------|----------|
| Básico | 5 | 3 | 5 | 1 |
| Profissional | 20 | 10 | 20 | 5 |
| Enterprise | 999 (ilimitado) | 999 | 999 | 999 |

### Módulos

**Tabela:** `modules`

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,        -- 'powerbi', 'whatsapp', 'alertas', 'ia'
  display_name TEXT NOT NULL,        -- 'Power BI', 'WhatsApp', etc
  description TEXT,
  icon TEXT DEFAULT 'Package',       -- Ícone Lucide React
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);
```

**Módulos Disponíveis:**

| Módulo | Nome Técnico | Ícone | Descrição |
|--------|--------------|-------|-----------|
| Power BI | `powerbi` | BarChart3 | Dashboards e relatórios |
| WhatsApp | `whatsapp` | MessageCircle | Integração WhatsApp |
| Alertas | `alertas` | Bell | Alertas automáticos |
| IA | `ia` | Bot | Inteligência Artificial |

**Tabela de Associação:** `module_groups`

```sql
CREATE TABLE module_groups (
  id UUID PRIMARY KEY,
  module_id UUID REFERENCES modules(id),
  company_group_id UUID REFERENCES company_groups(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, company_group_id)
);
```

### Como Funciona

```
┌─────────────────────────────────────┐
│         COMPANY_GROUP                │
│  ├─ plan_id → POWERBI_PLAN          │
│  │   └─ Define LIMITES (quantidade) │
│  │                                    │
│  └─ module_groups → MODULES          │
│      └─ Define FUNCIONALIDADES       │
│         (habilitado/não)             │
└─────────────────────────────────────┘
```

**Exemplo:**

```
Empresa XYZ
├─ Plano: Profissional
│   └─ Limites: 10 telas, 20 usuários
│
└─ Módulos Habilitados:
    ├─ ✅ Power BI
    ├─ ✅ WhatsApp
    ├─ ✅ Alertas
    └─ ❌ IA (não habilitado)

Resultado:
- Pode criar até 10 telas
- Pode ter até 20 usuários
- Vê menu: Power BI, WhatsApp, Alertas
- Não vê menu: IA
```

### APIs Relacionadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/plans` | GET/POST | Lista/cria planos |
| `/api/plans/[id]` | PUT/DELETE | Atualiza/deleta plano |
| `/api/modules` | GET | Lista módulos |
| `/api/modules/groups` | GET/POST | Gerencia associações módulo-grupo |

### Páginas Relacionadas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/configuracoes/planos` | `app/configuracoes/planos/page.tsx` | Gestão de planos |
| `/configuracoes/modulos` | `app/configuracoes/modulos/page.tsx` | Gestão de módulos |

---

## 🔌 APIs do Sistema

### Estrutura de APIs

```
app/api/
├── ai/                          # Inteligência Artificial
│   ├── chat/                    # Chat do dashboard
│   ├── contexts/                 # Contextos de modelos
│   ├── generate-dax/            # Geração de queries DAX
│   ├── generate-alert/          # Geração de alertas
│   └── usage/                    # Uso de tokens
│
├── whatsapp/                    # WhatsApp
│   ├── webhook/                 # Webhook principal
│   ├── instances/                # Instâncias
│   ├── authorized-numbers/       # Números autorizados
│   ├── groups/                   # Grupos autorizados
│   ├── messages/                 # Histórico de mensagens
│   └── usage/                    # Uso mensal
│
├── powerbi/                      # Power BI
│   ├── connections/              # Conexões
│   ├── datasets/                 # Datasets
│   ├── screens/                  # Telas/Dashboards
│   ├── embed/                    # Tokens de embed
│   ├── refresh/                  # Atualização de dados
│   └── reports/                  # Relatórios
│
├── alertas/                      # Alertas
│   ├── route.ts                  # CRUD de alertas
│   ├── [id]/route.ts            # Detalhes do alerta
│   ├── [id]/trigger/            # Disparo manual
│   ├── historico/                # Histórico de disparos
│   └── cron/                    # Job CRON
│
├── plans/                        # Planos
│   ├── route.ts                  # CRUD de planos
│   └── [id]/route.ts            # Detalhes do plano
│
├── modules/                      # Módulos
│   ├── route.ts                  # Lista módulos
│   └── groups/                   # Associações módulo-grupo
│
├── auth/                         # Autenticação
│   ├── login/                    # Login
│   ├── logout/                  # Logout
│   ├── me/                       # Usuário atual
│   └── verify-password/         # Verificação de senha
│
└── admin/                        # Painel Master
    ├── developers/               # Desenvolvedores
    ├── groups/                  # Grupos
    ├── users/                    # Usuários
    └── stats/                    # Estatísticas
```

### Principais Endpoints

#### Chat IA (Dashboard)

**POST** `/api/ai/chat`

```typescript
Request: {
  message: string;
  conversation_id?: string;
  screen_id: string;
}

Response: {
  response: string;
  conversation_id: string;
  suggestions?: string[];
  usage?: { tokens: number };
}
```

#### Webhook WhatsApp

**POST** `/api/whatsapp/webhook`

```typescript
Request: {
  event: 'messages.upsert';
  data: {
    key: { remoteJid: string; fromMe: boolean };
    message: { conversation?: string; ... };
  };
}

Response: {
  status: 'success' | 'ignored' | 'error';
  reason?: string;
}
```

#### Planos

**GET** `/api/plans`

```typescript
Response: {
  plans: Array<{
    id: string;
    name: string;
    max_daily_refreshes: number;
    max_powerbi_screens: number;
    max_users: number;
    max_companies: number;
  }>;
}
```

#### Módulos

**GET** `/api/modules`

```typescript
Response: {
  modules: Array<{
    id: string;
    name: string;
    display_name: string;
    icon: string;
    is_enabled: boolean;
  }>;
}
```

---

## 📄 Páginas e Rotas

### Estrutura de Páginas

```
app/
├── page.tsx                      # Página inicial (login/redirect)
├── login/                        # Login
├── dashboard/                     # Dashboard (redireciona)
├── tela/[id]/                     # Visualização de tela Power BI + Chat
│
├── whatsapp/                      # Módulo WhatsApp
│   ├── page.tsx                   # Dashboard WhatsApp
│   ├── instancias/                # Gestão de instâncias
│   ├── numeros/                   # Números autorizados
│   ├── grupos/                    # Grupos autorizados
│   ├── mensagens/                 # Histórico de mensagens
│   └── webhook/                   # Configuração webhook
│
├── powerbi/                       # Módulo Power BI
│   ├── page.tsx                   # Hub Power BI
│   ├── conexoes/                  # Gestão de conexões
│   ├── telas/                     # Gestão de telas
│   ├── relatorios/                # Gestão de relatórios
│   ├── datasets/                  # Gestão de datasets
│   ├── contextos/                 # Contextos de IA
│   └── gateways/                  # Gateways on-premise
│
├── alertas/                       # Módulo Alertas
│   ├── page.tsx                   # Lista de alertas
│   ├── novo/                       # Criar alerta
│   ├── [id]/                       # Editar alerta
│   └── historico/                  # Histórico de disparos
│
├── configuracoes/                 # Configurações
│   ├── page.tsx                   # Hub de configurações
│   ├── planos/                     # Gestão de planos
│   ├── modulos/                    # Gestão de módulos
│   ├── grupos/                     # Gestão de grupos
│   └── logs/                       # Logs do sistema
│
├── admin/                         # Painel Master
│   ├── page.tsx                   # Dashboard Master
│   ├── desenvolvedores/            # Gestão de developers
│   ├── grupos/                     # Gestão de grupos
│   ├── usuarios/                   # Gestão de usuários
│   └── relatorios/                 # Relatórios de acesso
│
└── dev/                           # Painel Developer
    ├── page.tsx                   # Dashboard Developer
    ├── groups/                     # Grupos atribuídos
    ├── usuarios/                   # Usuários dos grupos
    ├── quotas/                     # Distribuição de cotas
    └── relatorios/                 # Relatórios
```

### Rotas Principais

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Página inicial (redireciona para login ou dashboard) |
| `/login` | Público | Login |
| `/dashboard` | Autenticado | Redireciona para primeira tela ativa |
| `/tela/[id]` | Autenticado | Visualização de tela Power BI + Chat |
| `/whatsapp` | Módulo WhatsApp | Dashboard WhatsApp |
| `/powerbi` | Módulo Power BI | Hub Power BI |
| `/alertas` | Módulo Alertas | Lista de alertas |
| `/configuracoes` | Admin/Master | Configurações do sistema |
| `/admin` | Master | Painel Master |
| `/dev` | Developer | Painel Developer |

---

## 🔄 Fluxos de Dados

### Fluxo: Mensagem WhatsApp → Resposta IA

```
1. Usuário envia mensagem no WhatsApp
   ↓
2. Evolution API → Webhook POST /api/whatsapp/webhook
   ↓
3. Valida número autorizado
   ├─ Busca em whatsapp_authorized_numbers
   └─ Verifica is_active e can_use_chat
   ↓
4. Busca seleção de dataset (se houver)
   ├─ whatsapp_user_selections (últimas 24h)
   └─ Se múltiplos datasets e sem seleção → mostra lista
   ↓
5. Busca contexto do modelo Power BI
   ├─ ai_model_contexts
   └─ Filtra por company_group_id e is_active
   ↓
6. Busca histórico de conversa
   ├─ whatsapp_messages (últimas 10, não arquivadas)
   └─ Constrói array de mensagens
   ↓
7. Monta system prompt
   ├─ Personalidade do assistente
   ├─ Contexto do modelo
   ├─ Histórico de conversa
   └─ Regras de formatação
   ↓
8. Chama Claude AI
   ├─ Anthropic API
   ├─ Model: claude-sonnet-4-20250514
   └─ Tools: execute_dax (se necessário)
   ↓
9. Processa tool calls (se houver)
   ├─ Executa query DAX no Power BI
   └─ Retorna resultados para Claude
   ↓
10. Formata resposta
    ├─ Remove queries DAX expostas
    ├─ Formata valores monetários
    └─ Adiciona emojis e formatação WhatsApp
    ↓
11. Divide mensagem (se > 2000 chars)
    ├─ Divide por parágrafos
    └─ Prefixa cada parte
    ↓
12. Envia via Evolution API
    ├─ POST /message/sendText/[instance_name]
    └─ Salva em whatsapp_messages
    ↓
13. Retorna sucesso
```

### Fluxo: Chat Dashboard → Resposta IA

```
1. Usuário abre tela Power BI (/tela/[id])
   ↓
2. Clica no botão de chat
   ↓
3. Digita pergunta e envia
   ↓
4. POST /api/ai/chat
   ├─ Valida autenticação
   ├─ Verifica permissão can_use_ai
   └─ Valida screen_id
   ↓
5. Busca tela e relatório
   ├─ powerbi_dashboard_screens
   └─ powerbi_reports (connection_id, dataset_id)
   ↓
6. Busca ou cria conversa
   ├─ ai_conversations
   └─ Se nova, cria registro
   ↓
7. Busca histórico da conversa
   ├─ ai_messages
   └─ Ordena por created_at
   ↓
8. Busca contexto do modelo
   ├─ ai_model_contexts
   └─ Filtra por connection_id
   ↓
9. Monta system prompt
   ├─ Contexto do modelo
   ├─ Histórico de conversa
   └─ Regras de formatação
   ↓
10. Chama Claude AI
    ├─ Anthropic API
    ├─ Model: claude-sonnet-4-20250514
    └─ Tools: execute_dax (se necessário)
    ↓
11. Processa tool calls (se houver)
    ├─ Executa query DAX no Power BI
    └─ Retorna resultados para Claude
    ↓
12. Extrai sugestões (se houver)
    ├─ Regex: [SUGESTOES]...[/SUGESTOES]
    └─ Remove do texto principal
    ↓
13. Salva mensagens
    ├─ ai_messages (user)
    └─ ai_messages (assistant)
    ↓
14. Retorna resposta JSON
    ├─ response: string
    ├─ conversation_id: string
    └─ suggestions: string[]
    ↓
15. Exibe no chat
    ├─ Adiciona mensagem do assistente
    └─ Mostra sugestões (se houver)
```

### Fluxo: Criação de Alerta → Disparo Automático

```
1. Admin cria alerta (/alertas/novo)
   ↓
2. POST /api/alertas
   ├─ Valida módulo Alertas habilitado
   ├─ Valida limites do plano
   └─ Salva em ai_alerts
   ↓
3. CRON Job (Vercel Cron)
   ├─ GET /api/alertas/cron (a cada hora)
   └─ Verifica alertas habilitados
   ↓
4. Para cada alerta:
   ├─ Verifica horário (check_times)
   ├─ Executa dax_query no Power BI
   ├─ Compara resultado com threshold
   └─ Se condição atendida:
       ├─ Salva em ai_alert_history
       ├─ Envia notificações WhatsApp
       └─ Atualiza last_triggered_at
```

---

## 📊 Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│                    MEUDASHBOARD                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📱 WHATSAPP CHAT                                        │
│  ├─ Webhook: /api/whatsapp/webhook                      │
│  ├─ Assistente IA com Claude                            │
│  ├─ Seleção múltipla de datasets                        │
│  ├─ Histórico de conversa (10 mensagens)                │
│  └─ Comandos: /ajuda, /limpar, /status                  │
│                                                          │
│  💬 DASHBOARD CHAT                                       │
│  ├─ API: /api/ai/chat                                   │
│  ├─ Integrado em /tela/[id]                             │
│  ├─ Contexto da tela Power BI                           │
│  ├─ Histórico por conversa                              │
│  └─ Sugestões inteligentes                             │
│                                                          │
│  📦 PLANOS E MÓDULOS                                     │
│  ├─ Planos: Limites quantitativos                       │
│  ├─ Módulos: Funcionalidades habilitadas                │
│  └─ Combinação define experiência do grupo              │
│                                                          │
│  🔌 APIS                                                 │
│  ├─ /api/ai/* - Inteligência Artificial                 │
│  ├─ /api/whatsapp/* - WhatsApp                          │
│  ├─ /api/powerbi/* - Power BI                           │
│  ├─ /api/alertas/* - Alertas                            │
│  ├─ /api/plans/* - Planos                               │
│  └─ /api/modules/* - Módulos                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Notas Finais

### Diferenças entre Chats

| Característica | WhatsApp Chat | Dashboard Chat |
|----------------|---------------|----------------|
| **Interface** | WhatsApp | Web (React) |
| **Contexto** | Dataset selecionado | Tela/Relatório específico |
| **Histórico** | Por número de telefone | Por conversa (conversation_id) |
| **Persistência** | whatsapp_messages | ai_messages |
| **Comandos** | /ajuda, /limpar, /status | Não tem comandos |
| **Divisão de mensagens** | Automática (>2000 chars) | Não divide |
| **Sugestões** | Não | Sim (extraídas da resposta) |

### Arquivos Principais

**WhatsApp:**
- `app/api/whatsapp/webhook/route.ts` - Webhook principal
- `app/whatsapp/page.tsx` - Dashboard WhatsApp

**Dashboard Chat:**
- `app/api/ai/chat/route.ts` - API do chat
- `app/tela/[id]/page.tsx` - Interface do chat

**Planos e Módulos:**
- `app/api/plans/route.ts` - APIs de planos
- `app/api/modules/route.ts` - APIs de módulos
- `app/configuracoes/planos/page.tsx` - UI de planos
- `app/configuracoes/modulos/page.tsx` - UI de módulos

---

**Documentação criada em:** Janeiro 2026  
**Versão:** 1.0.0  
**Sistema:** MeuDashboard  
**Última atualização:** 09/01/2026

---

**FIM DA DOCUMENTAÇÃO** 📚✨
