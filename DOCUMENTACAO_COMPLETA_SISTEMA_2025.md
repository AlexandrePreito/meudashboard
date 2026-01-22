# MeuDashboard - Documentação Completa do Sistema

**Versão:** 3.0  
**Data:** Janeiro 2025  
**Última Atualização:** Janeiro 2025

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Arquitetura e Stack Tecnológica](#arquitetura-e-stack-tecnológica)
3. [Estrutura do Projeto](#estrutura-do-projeto)
4. [🚀 Módulo: Assistente IA e Chat](#módulo-assistente-ia-e-chat) ⭐ **DESTAQUE**
   - [Sistema de Treinamento](#sistema-de-treinamento)
   - [Chat via WhatsApp](#chat-via-whatsapp)
   - [Sistema de Prompt Dinâmico](#sistema-de-prompt-dinâmico)
   - [Gerenciamento de Perguntas Pendentes](#gerenciamento-de-perguntas-pendentes)
   - [Dashboard de Evolução](#dashboard-de-evolução)
5. [Módulos do Sistema](#módulos-do-sistema)
6. [Banco de Dados](#banco-de-dados)
7. [Sistema de Autenticação e Permissões](#sistema-de-autenticação-e-permissões)
8. [APIs e Integrações](#apis-e-integrações)
9. [Interface do Usuário](#interface-do-usuário)
10. [Deploy e Configuração](#deploy-e-configuração)

---

## 🎯 Visão Geral do Sistema

**MeuDashboard** é uma plataforma multi-tenant de Business Intelligence que integra Power BI, Inteligência Artificial (Claude AI) e WhatsApp para fornecer insights de dados empresariais através de uma interface web e mensagens automatizadas.

### Principais Funcionalidades

- ✅ **Dashboards Power BI** integrados e embarcados
- ✅ **Assistente IA com Chat via WhatsApp** - Responde perguntas sobre dados em tempo real
- ✅ **Sistema de Treinamento** - Melhora respostas da IA com exemplos validados
- ✅ **Gerenciamento Multi-tenant** com grupos e permissões granulares
- ✅ **Alertas Automatizados** via WhatsApp
- ✅ **Gestão de Usuários** hierárquica (Master → Developer → Admin)
- ✅ **Planos e Módulos** configuráveis por grupo

---

## 🏗️ Arquitetura e Stack Tecnológica

### Frontend
- **Next.js 16** (App Router)
- **TypeScript** (tipagem estrita)
- **Tailwind CSS** (estilização)
- **React Hooks** (estado e efeitos)
- **Lucide Icons** (ícones)

### Backend
- **Next.js API Routes** (API REST)
- **Supabase** (PostgreSQL + Auth + Storage)
- **Anthropic Claude API** (modelo: `claude-sonnet-4-20250514`)
- **Power BI REST API** (OAuth 2.0 Client Credentials)

### Integrações Externas
- **Power BI Embedded** (visualização de relatórios)
- **Evolution API** (WhatsApp)
- **Supabase Auth** (autenticação JWT)

### Ferramentas de Desenvolvimento
- **Turbopack** (bundler Next.js)
- **ESLint** (linting)
- **PostgreSQL** (banco de dados)

---

## 📁 Estrutura do Projeto

```
meudahsboard/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── assistente-ia/        # APIs do Assistente IA ⭐
│   │   │   ├── training/         # CRUD de exemplos de treinamento
│   │   │   │   ├── route.ts      # GET/POST/PUT/DELETE exemplos
│   │   │   │   └── test/         # POST - Testar pergunta
│   │   │   ├── questions/        # Gerenciar perguntas pendentes
│   │   │   │   ├── route.ts      # GET - Listar perguntas
│   │   │   │   └── [id]/route.ts # POST - Resolver/Ignorar
│   │   │   ├── stats/            # GET - Estatísticas
│   │   │   └── datasets/         # GET - Listar datasets
│   │   ├── ai/                   # API de Chat ⭐
│   │   │   └── chat/route.ts     # POST - Chat com IA
│   │   ├── whatsapp/             # APIs WhatsApp
│   │   │   └── webhook/          # Webhook de mensagens
│   │   │       └── messages-upsert/route.ts # Processar mensagens ⭐
│   │   ├── powerbi/              # APIs Power BI
│   │   └── auth/                 # APIs de autenticação
│   ├── assistente-ia/            # Páginas do Assistente IA ⭐
│   │   ├── treinar/              # Sistema de Treinamento
│   │   │   ├── page.tsx          # Listagem de exemplos (tabela)
│   │   │   ├── novo/             # Criar novo exemplo
│   │   │   │   └── page.tsx      # Formulário de criação
│   │   │   └── [id]/             # Editar exemplo
│   │   │       └── page.tsx      # Formulário de edição
│   │   ├── contextos/            # Gerenciar contextos do modelo
│   │   │   └── page.tsx          # Listagem e CRUD de contextos
│   │   ├── pendentes/            # Perguntas não respondidas
│   │   │   └── page.tsx          # Dashboard de pendentes
│   │   └── evolucao/             # Estatísticas e evolução
│   │       └── page.tsx          # Dashboard de evolução
│   ├── powerbi/                  # Páginas Power BI
│   ├── whatsapp/                 # Páginas WhatsApp
│   └── admin/                    # Páginas administrativas
├── src/
│   ├── components/               # Componentes React reutilizáveis
│   │   ├── layout/               # Layout (Sidebar, Header, MainLayout)
│   │   └── assistente-ia/        # Componentes específicos ⭐
│   │       ├── PermissionGuard.tsx
│   │       ├── TestArea.tsx
│   │       ├── QuestionCard.tsx
│   │       └── StatsCard.tsx
│   ├── lib/                      # Configurações e utilitários
│   │   ├── supabase/             # Clientes Supabase
│   │   │   ├── server.ts         # Cliente server-side
│   │   │   └── admin.ts          # Cliente admin (bypass RLS)
│   │   ├── ai/                   # Utilitários de IA ⭐
│   │   │   ├── system-prompt.ts  # Construção de prompts
│   │   │   └── prompt-helpers.ts # Helpers para buscar dados
│   │   ├── auth.ts               # Autenticação
│   │   └── powerbi/              # Utilitários Power BI
│   ├── types/                    # Tipagens TypeScript
│   │   └── assistente-ia.ts      # Tipos do Assistente IA ⭐
│   ├── contexts/                 # Contextos React
│   │   ├── MenuContext.tsx       # Contexto de menu/grupos
│   │   └── ThemeContext.tsx      # Contexto de tema
│   └── hooks/                    # Hooks customizados
├── sql/                          # Scripts SQL
├── supabase/                     # Migrações Supabase
│   └── migrations/
│       └── 20260107_assistente_ia.sql
└── public/                       # Arquivos estáticos
```

---

## 🚀 Módulo: Assistente IA e Chat ⭐ **DESTAQUE**

### Visão Geral

O **Assistente IA** é o módulo central do sistema, permitindo que usuários façam perguntas sobre dados Power BI via WhatsApp e recebam respostas inteligentes em tempo real. O sistema inclui um mecanismo completo de treinamento que melhora progressivamente a qualidade das respostas.

### Objetivo Principal

Fornecer uma interface conversacional via WhatsApp onde usuários podem:
- Fazer perguntas sobre dados Power BI em linguagem natural
- Receber respostas formatadas com valores reais
- Ter uma experiência fluida e contextualizada
- Melhorar continuamente através do sistema de treinamento

---

## 💬 Chat via WhatsApp

### Como Funciona

O chat funciona através de um webhook que recebe mensagens do WhatsApp e processa com a IA.

#### Fluxo Completo

```
1. Usuário envia mensagem no WhatsApp
   ↓
2. Evolution API envia webhook para /api/whatsapp/webhook/messages-upsert
   ↓
3. Sistema valida autorização (número/grupo autorizado)
   ↓
4. Sistema identifica grupo e conexão Power BI
   ↓
5. Sistema busca contexto do modelo Power BI
   ↓
6. Sistema busca exemplos de treinamento relevantes (top 20)
   ↓
7. Sistema busca histórico de conversa (últimas 10 mensagens)
   ↓
8. Sistema constrói prompt dinâmico com todos os contextos
   ↓
9. Sistema chama Anthropic Claude API com ferramenta execute_dax
   ↓
10. IA gera query DAX e resposta formatada
   ↓
11. Sistema executa DAX no Power BI (se necessário)
   ↓
12a. Se sucesso:
     - Limpa resposta (remove markdown, DAX, etc)
     - Envia resposta formatada via WhatsApp
     - Salva mensagem no banco
     - Atualiza last_used_at dos exemplos usados
     - Atualiza estatísticas (questions_answered)
   ↓
12b. Se falha:
     - Registra pergunta em ai_unanswered_questions
     - Envia mensagem genérica ao usuário
     - Atualiza estatísticas (questions_failed)
```

### Arquivo Principal

**`app/api/whatsapp/webhook/messages-upsert/route.ts`**

#### Funcionalidades Implementadas

1. **Validação de Autorização**
   - Verifica se número/grupo está autorizado
   - Verifica permissão de chat (`can_use_chat`)
   - Ignora mensagens próprias ou de grupos não autorizados

2. **Busca de Contexto Inteligente**
   ```typescript
   // Busca contexto do modelo Power BI
   const modelContext = await getModelContext(
     companyGroupId,
     connection.id,
     connection.dataset_id
   );
   
   // Busca exemplos de treinamento (top 20)
   const examples = await getTrainingExamples(
     companyGroupId,
     connection.id,
     connection.dataset_id,
     20
   );
   
   // Busca histórico de conversa (últimas 10)
   const history = await getConversationHistory(
     companyGroupId,
     phone,
     10
   );
   ```

3. **Construção de Prompt Dinâmico**
   ```typescript
   const systemPrompt = buildSystemPrompt({
     modelContext: modelContext || '',
     trainingExamples: formatTrainingExamples(examples),
     conversationHistory: formatConversationHistory(history)
   });
   ```

4. **Chamada à IA com Ferramentas**
   ```typescript
   const response = await anthropic.messages.create({
     model: 'claude-sonnet-4-20250514',
     max_tokens: 1000,
     system: systemPrompt,
     messages: [{ role: 'user', content: messageText }],
     tools: [{
       name: 'execute_dax',
       description: 'Executa uma query DAX no Power BI',
       input_schema: {
         type: 'object',
         properties: {
           query: { type: 'string' }
         }
       }
     }]
   });
   ```

5. **Registro de Perguntas Não Respondidas**
   - Se resposta muito curta (< 20 caracteres)
   - Se erro ao processar
   - Se DAX inválido
   - Incrementa `attempt_count` e `user_count` se pergunta já existe

6. **Atualização de Estatísticas**
   - Atualiza `ai_assistant_stats` diariamente
   - Incrementa `questions_asked`
   - Incrementa `questions_answered` ou `questions_failed`
   - Calcula `success_rate`

7. **Tracking de Uso de Exemplos**
   - Atualiza `last_used_at` dos exemplos usados
   - Prioriza exemplos mais usados recentemente

### Limpeza de Resposta

O sistema remove automaticamente:
- Blocos de código markdown (```dax```)
- Tags XML (`<execute_dax>`)
- Queries DAX soltas
- Mensagens de erro
- Markdown em geral

```typescript
const cleanResponse = assistantMessage
  .replace(/```dax[\s\S]*?```/gi, '')
  .replace(/```[\s\S]*?```/g, '')
  .replace(/<execute_dax>[\s\S]*?<\/execute_dax>/gi, '')
  .replace(/<[^>]+>/g, '')
  .replace(/EVALUATE[\s\S]*?(?=\n\n|\n📊|$)/gi, '')
  .trim();
```

### Formato de Resposta para WhatsApp

O sistema formata respostas seguindo padrões específicos:

#### Para Valores Únicos
```
📊 Faturamento em Dezembro

💰 R$ 2.432.919,67

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ Por filial
2️⃣ Por vendedor
3️⃣ Comparar com novembro
```

#### Para Rankings/Listas
```
🏆 Top 5 Vendedores

🥇 João Silva: R$ 45.230,00
🥈 Maria Santos: R$ 38.910,00
🥉 Pedro Costa: R$ 32.450,00
4️⃣ Ana Lima: R$ 28.670,00
5️⃣ Carlos Souza: R$ 25.340,00

━━━━━━━━━━━━━━━━━
💡 Posso ajudar com:
1️⃣ Detalhes de um vendedor
2️⃣ Comparar períodos
```

#### Para Comparações
```
📈 Comparativo Mensal

📅 Dezembro: R$ 2.432.919,67
📅 Novembro: R$ 2.150.340,22
📊 Variação: +13,1% (↗️)

━━━━━━━━━━━━━━━━━
💡 Outras análises:
1️⃣ Por categoria
2️⃣ Por região
```

---

## 🎓 Sistema de Treinamento

### Visão Geral

O sistema de treinamento permite que administradores criem exemplos validados (pergunta → DAX → resposta formatada) para ensinar a IA a responder perguntas específicas do negócio.

### Páginas do Sistema

#### 1. **Listagem de Exemplos** (`/assistente-ia/treinar`)

**Arquivo:** `app/assistente-ia/treinar/page.tsx`

**Funcionalidades:**
- ✅ Tabela responsiva com todos os exemplos
- ✅ Busca por texto (pergunta ou resposta)
- ✅ Filtro por tags (categorias)
- ✅ Coluna "Grupo" mostrando grupo do exemplo
- ✅ Visualização de tags coloridas
- ✅ Contador de validações
- ✅ Ações: Editar / Excluir
- ✅ Botão "Adicionar Novo Exemplo"

**Layout:**
- Header com título e botão de ação
- Barra de busca e filtros
- Tabela com colunas: Pergunta, Tags, Grupo, Validações, Ações
- Estados: Loading, Empty, Error

**Sistema de Tags:**
- 24 tags pré-definidas
- Múltiplas tags por exemplo
- Badges coloridos para identificação visual
- Filtro dropdown de tags

#### 2. **Criar Novo Exemplo** (`/assistente-ia/treinar/novo`)

**Arquivo:** `app/assistente-ia/treinar/novo/page.tsx`

**Funcionalidades:**
- ✅ Selecionar dataset Power BI (filtrado por grupo ativo)
- ✅ Testar pergunta com IA antes de salvar
- ✅ Visualizar DAX gerado automaticamente
- ✅ Visualizar resposta formatada
- ✅ Preencher formulário automaticamente após teste
- ✅ Selecionar múltiplas tags
- ✅ Validações antes de salvar
- ✅ Suporte a perguntas pendentes (via URL params)

**Layout:**
- Duas colunas (desktop) / Uma coluna (mobile)
- **Coluna Esquerda:** Teste com IA
  - Seletor de dataset
  - Input de pergunta
  - Botão "Testar com IA"
  - Visualização de resposta e DAX gerados
- **Coluna Direita:** Formulário
  - Pergunta do usuário (textarea)
  - Consulta DAX (textarea, monospace)
  - Resposta formatada (textarea) ← **CAMPO PRINCIPAL**
  - Tags (dropdown + badges)
  - Botões: Cancelar / Salvar

**Integração com Perguntas Pendentes:**
- Lê `unanswered_id` e `question` da URL
- Pré-preenche pergunta automaticamente
- Ao salvar, marca pergunta pendente como resolvida
- Linka exemplo criado à pergunta pendente

**Validações:**
- Dataset obrigatório
- Pergunta obrigatória
- DAX obrigatório
- Resposta formatada obrigatória
- Pelo menos uma tag obrigatória

#### 3. **Editar Exemplo** (`/assistente-ia/treinar/[id]`)

**Arquivo:** `app/assistente-ia/treinar/[id]/page.tsx`

**Funcionalidades:**
- ✅ Carregar dados do exemplo
- ✅ Editar todos os campos
- ✅ Selecionar múltiplas tags
- ✅ Salvar alterações
- ✅ Cancelar e voltar
- ✅ Botão desabilitado quando campos vazios

**Diferenças do Criar:**
- Não tem área de teste (já foi validado)
- Campos pré-preenchidos
- Botão "Salvar" ao invés de "Salvar Exemplo"
- Validação de campos obrigatórios

---

## 📊 Dashboard de Evolução

### Página: `/assistente-ia/evolucao`

**Arquivo:** `app/assistente-ia/evolucao/page.tsx`

**Funcionalidades:**
- ✅ 4 Cards de resumo:
  - Total de perguntas
  - Perguntas respondidas
  - Taxa de sucesso (7 dias)
  - Taxa de sucesso (30 dias)
- ✅ Gráfico de evolução diária (1-31 dias)
- ✅ Seletor de mês e ano
- ✅ Toggle para alternar entre vista "Dia" e "Mês"
- ✅ 3 Cards de métricas adicionais:
  - Tempo médio de resposta
  - Perguntas por dia
  - Taxa de erro

**Layout:**
- Header padronizado com título
- Grid de cards no topo
- Gráfico de barras dinâmico
- Cards de métricas abaixo
- Filtros de mês/ano e toggle de vista

**API:** `GET /api/assistente-ia/stats?month=X&year=Y&view=day|month`

---

## ❓ Gerenciamento de Perguntas Pendentes

### Página: `/assistente-ia/pendentes`

**Arquivo:** `app/assistente-ia/pendentes/page.tsx`

**Funcionalidades:**
- ✅ 4 Cards de estatísticas:
  - Total de perguntas
  - Pendentes (amarelo)
  - Resolvidas (verde)
  - Ignoradas (vermelho)
- ✅ Busca por texto (pergunta)
- ✅ Filtro por status (sem ícones)
- ✅ Lista de perguntas com cards
- ✅ Ações: Treinar / Ignorar / Reabrir
- ✅ Badge de "Resolvida" quando status = 'resolved'

**Fluxo de Resolução:**
1. Usuário clica em "Treinar" em uma pergunta pendente
2. Sistema redireciona para `/assistente-ia/treinar/novo?unanswered_id=XXX&question=YYY`
3. Formulário pré-preenche a pergunta
4. Usuário testa e salva exemplo
5. Sistema marca pergunta como resolvida automaticamente
6. Linka exemplo criado à pergunta pendente

**Status Possíveis:**
- `pending` - Aguardando resolução
- `in_progress` - Em trabalho
- `resolved` - Resolvida (com exemplo de treinamento)
- `ignored` - Ignorada

---

## 🧠 Sistema de Prompt Dinâmico

### Arquivo: `src/lib/ai/system-prompt.ts`

O sistema constrói prompts dinâmicos em 3 camadas:

#### Camada 1: Regras Universais (Sempre Iguais)

```typescript
const universalRules = `
Você é um Assistente de Análise de Dados via WhatsApp.

# REGRAS FUNDAMENTAIS
1. ⚠️ NUNCA invente valores ou dados
2. ⚠️ SEMPRE use a ferramenta execute_dax
3. ⚠️ Use EXATAMENTE os nomes documentados
4. ⚠️ Se não souber, admita claramente

# PROCESSO DE RESPOSTA
1. Entender a Pergunta
2. Buscar Exemplo Similar
3. Criar Query DAX
4. Executar e Validar
5. Formatar Resposta

# FORMATAÇÃO PARA WHATSAPP
- Use emojis apropriados
- Máximo 1200 caracteres
- Sempre ofereça próximos passos
`;
```

#### Camada 2: Contexto do Dataset (Dinâmico)

Injetado quando disponível:
- Tabelas e colunas disponíveis
- Relacionamentos
- Medidas existentes
- Formato fornecido pela API do Power BI

#### Camada 3: Exemplos Validados (Dinâmico)

Injetado quando disponível:
- Lista dos exemplos mais relevantes
- Formato: "Pergunta → DAX → Resposta"
- Ordenados por relevância e uso recente

#### Camada 4: Histórico de Conversa (Dinâmico)

Injetado quando disponível:
- Últimas 10 mensagens da conversa
- Formato: "Usuário: ... / Assistente: ..."
- Usado para contexto conversacional

### Função Principal

```typescript
export function buildSystemPrompt(options: PromptOptions = {}): string {
  const {
    modelContext = '',
    trainingExamples = '',
    conversationHistory = '',
    currentDate = new Date().toLocaleDateString('pt-BR'),
    userName = ''
  } = options;

  // Monta prompt em 3 camadas
  return `${universalRules}
${contextSection}
${examplesSection}
${historySection}`;
}
```

### Helpers

**Arquivo:** `src/lib/ai/prompt-helpers.ts`

```typescript
// Buscar contexto do modelo
export async function getModelContext(
  companyGroupId: string,
  connectionId?: string,
  datasetId?: string
): Promise<string | null>

// Buscar exemplos de treinamento
export async function getTrainingExamples(
  companyGroupId: string,
  connectionId?: string,
  datasetId?: string,
  limit: number = 20
): Promise<any[]>

// Buscar histórico de conversa
export async function getConversationHistory(
  companyGroupId: string,
  phoneNumber: string,
  limit: number = 10
): Promise<any[]>
```

**Lógica de Relevância:**
- Exemplos ordenados por:
  1. Mesmo `dataset_id` (prioridade alta)
  2. Mesma `category` (prioridade média)
  3. `last_used_at` recente (prioridade média)
  4. `validation_count` alto (prioridade baixa)

---

## 🗄️ Estrutura de Banco de Dados - Assistente IA

### Tabelas Principais

#### 1. `ai_training_examples`

Armazena exemplos de treinamento validados.

```sql
CREATE TABLE ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT NOT NULL,
  user_question TEXT NOT NULL,
  dax_query TEXT NOT NULL,
  formatted_response TEXT NOT NULL,
  category TEXT,                    -- Primeira tag (compatibilidade)
  tags TEXT[],                       -- Array de tags múltiplas
  is_validated BOOLEAN DEFAULT true,
  validation_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ,          -- Última vez usado no prompt
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_training_company_group` - Busca por grupo
- `idx_training_dataset` - Busca por dataset
- `idx_training_validated` - Filtro de validados
- `idx_training_question_search` - Busca full-text (GIN)

#### 2. `ai_unanswered_questions`

Armazena perguntas que o assistente não conseguiu responder.

```sql
CREATE TABLE ai_unanswered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT,
  user_question TEXT NOT NULL,
  phone_number TEXT,
  attempted_dax TEXT,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  priority_score DECIMAL DEFAULT 0,
  user_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',     -- pending, in_progress, resolved, ignored
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  training_example_id UUID REFERENCES ai_training_examples(id),
  first_asked_at TIMESTAMPTZ DEFAULT NOW(),
  last_asked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_unanswered_company_group` - Busca por grupo
- `idx_unanswered_status` - Filtro por status
- `idx_unanswered_priority` - Ordenação por prioridade
- `idx_unanswered_phone` - Busca por telefone

**Funções e Triggers:**
- `calculate_priority_score()` - Calcula score automaticamente
- `update_unanswered_priority()` - Trigger que atualiza score
- `update_updated_at()` - Trigger que atualiza `updated_at`

#### 3. `ai_assistant_stats`

Armazena estatísticas diárias de uso do assistente.

```sql
CREATE TABLE ai_assistant_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  stat_date DATE NOT NULL,
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  questions_failed INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  success_rate DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_group_id, stat_date)
);
```

#### 4. `ai_model_contexts`

Armazena contextos do modelo Power BI.

```sql
CREATE TABLE ai_model_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT,
  context_name TEXT NOT NULL,
  context_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `whatsapp_messages`

Armazena todas as mensagens enviadas/recebidas via WhatsApp.

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  direction TEXT NOT NULL,           -- 'incoming' ou 'outgoing'
  sender_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Uso no Histórico:**
- Últimas 10 mensagens são usadas como contexto conversacional
- Ordenadas por `created_at` DESC
- Mapeadas para formato `{ role: 'user'|'assistant', content: string }`

---

## 🔌 APIs do Assistente IA

### Base Path: `/api/assistente-ia`

#### 1. **Training API** - `/api/assistente-ia/training`

**GET** - Listar exemplos de treinamento
```typescript
// Query params opcionais:
?search=texto          // Buscar por pergunta
?tags=vendas,faturamento  // Filtrar por tags
?dataset_id=id        // Filtrar por dataset
?validated_only=true  // Apenas validados
?limit=50             // Limite de resultados
?offset=0             // Paginação

// Resposta:
{
  success: true,
  data: TrainingExample[],
  total: number
}
```

**POST** - Criar novo exemplo
```typescript
// Body:
{
  user_question: string,
  dax_query: string,
  formatted_response: string,
  tags?: string[],
  dataset_id: string,
  unanswered_question_id?: string  // Opcional: linkar pergunta pendente
}

// Resposta:
{
  success: true,
  data: TrainingExample
}

// Se unanswered_question_id fornecido:
// - Marca pergunta como 'resolved'
// - Define resolved_at e resolved_by
// - Linka training_example_id
```

**PUT** - Atualizar exemplo existente
```typescript
// Body:
{
  id: string,
  user_question: string,
  dax_query: string,
  formatted_response: string,
  tags?: string[]
}

// Resposta:
{
  success: true,
  data: TrainingExample
}
```

**DELETE** - Excluir exemplo
```typescript
// Query params:
?id=uuid

// Resposta:
{
  success: true
}
```

#### 2. **Test API** - `/api/assistente-ia/training/test`

**POST** - Testar pergunta sem salvar
```typescript
// Body:
{
  question: string,
  dataset_id: string,
  company_group_id?: string
}

// Resposta:
{
  success: true,
  data: {
    response: string,           // Resposta formatada
    dax_query: string,          // Query DAX gerada
    dax_result: any,            // Resultado da execução
    execution_time_ms: number   // Tempo de execução
  }
}
```

**Fluxo Interno:**
1. Busca contexto do modelo Power BI
2. Busca exemplos de treinamento validados (top 5)
3. **Fase 1:** Gera query DAX usando Claude AI
4. Limpa markdown do DAX gerado
5. Garante que DAX começa com `EVALUATE`
6. Executa query no Power BI
7. **Fase 2:** Formata resposta com valores reais
8. Retorna resultado completo

**Tratamento de Erros:**
- Conexão Power BI não encontrada → Erro específico
- Dataset não encontrado → Erro específico
- Erro ao executar DAX → Mensagem de erro clara
- DAX vazio ou inválido → Erro específico

#### 3. **Questions API** - `/api/assistente-ia/questions`

**GET** - Listar perguntas não respondidas
```typescript
// Query params:
?status=pending        // Filtrar por status
?connection_id=id     // Filtrar por conexão
?dataset_id=id        // Filtrar por dataset
?page=1               // Página
?limit=20             // Itens por página
?sort=priority        // Ordenação (priority, recent, oldest)

// Resposta:
{
  success: true,
  data: {
    questions: UnansweredQuestion[],
    total: number,
    page: number,
    limit: number,
    total_pages: number
  }
}
```

#### 4. **Question Management API** - `/api/assistente-ia/questions/[id]`

**POST** - Gerenciar pergunta específica
```typescript
// Body:
{
  action: "resolve" | "ignore" | "reopen",
  training_example_id?: string  // Opcional: linkar exemplo
}

// Ações:
// - resolve: Marca como resolvida (opcionalmente linka exemplo)
// - ignore: Marca como ignorada
// - reopen: Reabre pergunta resolvida/ignorada

// Resposta:
{
  success: true,
  message: string,
  data: UnansweredQuestion
}
```

#### 5. **Stats API** - `/api/assistente-ia/stats`

**GET** - Estatísticas do assistente
```typescript
// Query params:
?month=1              // Mês (1-12)
?year=2025            // Ano
?view=day             // Vista: 'day' ou 'month'

// Resposta (view=day):
{
  success: true,
  data: {
    total_examples: number,
    pending_questions: number,
    success_rate_7d: number,
    success_rate_30d: number,
    daily: [
      {
        stat_date: string,
        questions_asked: number,
        questions_answered: number,
        questions_failed: number
      }
    ]
  }
}

// Resposta (view=month):
{
  success: true,
  data: {
    monthly: [
      {
        stat_date: string,
        questions_asked: number,
        questions_answered: number,
        questions_failed: number
      }
    ]
  }
}
```

#### 6. **Datasets API** - `/api/assistente-ia/datasets`

**GET** - Listar datasets disponíveis
```typescript
// Query params:
?group_id=uuid        // Filtrar por grupo

// Resposta:
{
  success: true,
  data: [
    {
      id: string,
      name: string,
      connection_id: string,
      connection_name: string
    }
  ]
}
```

---

## 🔐 Controle de Acesso - Assistente IA

### Permissões por Role

| Role | Treinar IA | Ver Pendentes | Ver Contextos | Ver Evolução | Chat WhatsApp |
|------|-----------|---------------|---------------|--------------|---------------|
| Master | ✅ | ✅ | ✅ | ✅ | ✅ |
| Developer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Viewer | ❌ | ❌ | ❌ | ❌ | ✅* |
| Operator | ❌ | ❌ | ❌ | ❌ | ✅* |

*Viewer e Operator podem usar o chat, mas não gerenciar treinamento.

### Verificação nas APIs

```typescript
import { getUserGroupMembership } from '@/lib/auth';

const membership = await getUserGroupMembership();
if (!membership) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}

const allowedRoles = ['master', 'developer', 'admin'];
if (!allowedRoles.includes(membership.role)) {
  return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
}
```

### Componente de Proteção

**`src/components/assistente-ia/PermissionGuard.tsx`**

```typescript
export default function PermissionGuard({ children }: { children: React.ReactNode }) {
  // Verifica role do usuário
  // Bloqueia viewer e operator
  // Mostra loading durante verificação
  // Mostra mensagem de acesso negado se não autorizado
}
```

### Row Level Security (RLS)

Todas as tabelas do Assistente IA possuem RLS configurado:

- **SELECT:** Usuários podem ver dados do seu `company_group_id`
- **INSERT:** Apenas usuários autenticados do grupo podem inserir
- **UPDATE:** Apenas usuários autenticados do grupo podem atualizar
- **DELETE:** Apenas master/developer/admin podem deletar

---

## 🎨 Interface do Usuário - Assistente IA

### Design System

#### Cores Padrão
- **Primário:** `bg-blue-500` / `hover:bg-blue-600`
- **Secundário:** `bg-gray-100` / `hover:bg-gray-200`
- **Perigo:** `bg-red-50 text-red-600` / `hover:bg-red-100`
- **Sucesso:** `bg-green-100 text-green-800`
- **Aviso:** `bg-yellow-100 text-yellow-800`

#### Componentes Reutilizáveis

**PermissionGuard**
- Protege rotas baseado em role
- Mostra loading durante verificação
- Mostra mensagem de acesso negado

**MainLayout**
- Layout padronizado com Sidebar e Header
- Responsivo (mobile/tablet/desktop)
- Suporte a tema

### Menu Lateral

**Estrutura do Menu "Assistente IA":**
```
📈 Assistente IA
  ├─ 📈 Evolução (/assistente-ia/evolucao)
  ├─ 🎓 Treinar IA (/assistente-ia/treinar)
  ├─ ⏰ Perguntas Pendentes (/assistente-ia/pendentes)
  └─ 🧠 Contextos (/assistente-ia/contextos)
```

**Controle de Acesso no Menu:**
- Função `canAccessAssistenteIA()` verifica:
  - Visualizador/Operator: SEM acesso
  - Master: acesso sempre
  - Developer: acesso se tiver grupo ativo
  - Admin: acesso se tiver grupo ativo

**Logo no Sidebar:**
- Master: Logo animado do MeuDashboard
- Developer: Logo do desenvolvedor (`developer.logo_url`)
- Admin/Visualizador: Logo do grupo ou desenvolvedor (respeita `use_developer_logo`)

---

## 🔄 Fluxo Completo de Uso

### 1. Treinamento Inicial

```
1. Admin acessa /assistente-ia/treinar
2. Clica em "Adicionar Novo Exemplo"
3. Seleciona dataset Power BI
4. Testa pergunta: "Quanto faturamos em dezembro?"
5. IA gera resposta e DAX automaticamente
6. Admin revisa e ajusta se necessário
7. Seleciona tags (ex: "faturamento", "periodo")
8. Salva como exemplo de treinamento
9. Exemplo fica disponível para uso no chat
```

### 2. Pergunta via WhatsApp

```
1. Usuário envia: "Quanto faturamos em dezembro?"
2. Webhook recebe mensagem
3. Sistema identifica grupo e dataset
4. Busca contexto do modelo Power BI
5. Busca exemplos de treinamento relevantes (top 20)
6. Busca histórico de conversa (últimas 10)
7. Constrói prompt dinâmico
8. Chama Anthropic Claude API
9. IA gera query DAX baseada nos exemplos
10. Sistema executa DAX no Power BI
11. IA formata resposta com valores reais
12. Resposta é enviada via WhatsApp
13. Sistema atualiza estatísticas
14. Sistema atualiza last_used_at dos exemplos usados
```

### 3. Gerenciamento de Pendentes

```
1. Admin acessa /assistente-ia/pendentes
2. Visualiza perguntas não respondidas ordenadas por prioridade
3. Clica em "Treinar" em uma pergunta
4. Sistema redireciona para /assistente-ia/treinar/novo?unanswered_id=XXX&question=YYY
5. Formulário pré-preenche a pergunta
6. Admin testa e salva exemplo
7. Pergunta é marcada como resolvida automaticamente
8. Exemplo criado é linkado à pergunta pendente
9. Próxima vez que pergunta similar for feita, IA já sabe responder
```

### 4. Monitoramento

```
1. Admin acessa /assistente-ia/evolucao
2. Visualiza estatísticas:
   - Total de perguntas
   - Perguntas respondidas
   - Taxa de sucesso (7d e 30d)
3. Analisa gráfico de evolução diária
4. Alterna entre vista "Dia" e "Mês"
5. Recebe insights sobre performance
```

---

## 📊 Sistema de Tags

### 24 Tags Pré-definidas

```typescript
const TAGS_DISPONIVEIS = [
  { value: 'vendas', label: 'Vendas', color: 'bg-blue-100 text-blue-800' },
  { value: 'faturamento', label: 'Faturamento', color: 'bg-green-100 text-green-800' },
  { value: 'compras', label: 'Compras', color: 'bg-purple-100 text-purple-800' },
  { value: 'estoque', label: 'Estoque', color: 'bg-orange-100 text-orange-800' },
  { value: 'financeiro', label: 'Financeiro', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'contas_pagar', label: 'Contas a Pagar', color: 'bg-red-100 text-red-800' },
  { value: 'contas_receber', label: 'Contas a Receber', color: 'bg-teal-100 text-teal-800' },
  { value: 'inadimplencia', label: 'Inadimplência', color: 'bg-rose-100 text-rose-800' },
  { value: 'clientes', label: 'Clientes', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'produtos', label: 'Produtos', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'fornecedores', label: 'Fornecedores', color: 'bg-violet-100 text-violet-800' },
  { value: 'custos', label: 'Custos', color: 'bg-amber-100 text-amber-800' },
  { value: 'despesas', label: 'Despesas', color: 'bg-red-100 text-red-800' },
  { value: 'receitas', label: 'Receitas', color: 'bg-green-100 text-green-800' },
  { value: 'lucro', label: 'Lucro/Margem', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'nfe', label: 'Notas Fiscais', color: 'bg-slate-100 text-slate-800' },
  { value: 'pedidos', label: 'Pedidos', color: 'bg-blue-100 text-blue-800' },
  { value: 'producao', label: 'Produção', color: 'bg-orange-100 text-orange-800' },
  { value: 'logistica', label: 'Logística', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rh', label: 'RH', color: 'bg-pink-100 text-pink-800' },
  { value: 'metas', label: 'Metas/KPIs', color: 'bg-purple-100 text-purple-800' },
  { value: 'ranking', label: 'Ranking/Top', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'comparativo', label: 'Comparativo', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'periodo', label: 'Período', color: 'bg-indigo-100 text-indigo-800' },
];
```

**Características:**
- Múltiplas tags por exemplo
- Badges coloridos para identificação visual
- Filtro por tag na listagem
- Busca por tag na listagem
- Remoção individual de tags

---

## 🔧 Configuração e Variáveis de Ambiente

### Variáveis Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxx...

# Next.js
NEXT_PUBLIC_SITE_URL=https://meudashboard.org
# ou para localhost:
# NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Vercel (automático)
VERCEL_URL=xxx.vercel.app
```

### Configuração do Power BI

1. Criar conexão em `/powerbi/conexoes`
2. Configurar credenciais (Client ID, Secret, Tenant ID)
3. Ativar conexão
4. Configurar contexto do modelo em `/assistente-ia/contextos`

### Configuração do WhatsApp

1. Criar instância em `/whatsapp/instancias`
2. Configurar API URL e API Key
3. Autorizar números/grupos em `/whatsapp/numeros` ou `/whatsapp/grupos`
4. Habilitar chat (`can_use_chat = true`) para números individuais

---

## 📈 Métricas e Analytics

### Estatísticas Coletadas

**Por Dia (`ai_assistant_stats`):**
- `questions_asked` - Total de perguntas feitas
- `questions_answered` - Total respondidas com sucesso
- `questions_failed` - Total que falharam
- `avg_response_time_ms` - Tempo médio de resposta
- `success_rate` - Taxa de sucesso (answered / asked)

**Por Exemplo (`ai_training_examples`):**
- `validation_count` - Quantas vezes foi confirmado
- `last_used_at` - Última vez usado no prompt

**Por Pergunta Pendente (`ai_unanswered_questions`):**
- `attempt_count` - Quantas vezes foi tentada
- `user_count` - Quantos usuários fizeram a mesma pergunta
- `priority_score` - Score calculado automaticamente

### Cálculo de Prioridade

```sql
priority_score = (
  attempt_count * 2 +      -- Peso 2x para tentativas
  user_count * 3 +         -- Peso 3x para usuários diferentes
  EXTRACT(EPOCH FROM (NOW() - first_asked_at)) / 86400  -- Dias desde primeira pergunta
) / 10
```

---

## 🚀 Melhorias Futuras Sugeridas

### Curto Prazo
1. **Validação Automática de DAX**
   - Testar sintaxe antes de executar
   - Validar estrutura básica

2. **Feedback do Usuário**
   - Botões 👍/👎 nas respostas
   - Ajuste automático de exemplos baseado em feedback

3. **Categorização Automática**
   - ML para categorizar perguntas
   - Sugestão de tags baseada em similaridade

### Médio Prazo
1. **Multi-idioma**
   - Suporte para perguntas em diferentes idiomas
   - Tradução automática de contexto

2. **Analytics Avançado**
   - Dashboard de métricas detalhadas
   - Exportação de relatórios
   - Alertas quando taxa de sucesso cai

3. **Versões de Exemplos**
   - Histórico de alterações
   - Rollback para versões anteriores

### Longo Prazo
1. **Aprendizado Contínuo**
   - Auto-aprendizado baseado em respostas bem-sucedidas
   - Sugestão automática de novos exemplos

2. **Validação em Lote**
   - Testar múltiplos exemplos de uma vez
   - Relatório de quais exemplos precisam atualização

3. **Integração com Outros Sistemas**
   - Chat via web (não apenas WhatsApp)
   - API pública para integração com outros sistemas

---

## 🔒 Segurança

### Medidas Implementadas

1. **Autenticação**
   - JWT tokens via Supabase Auth
   - Verificação de permissões em todas as APIs
   - Row Level Security (RLS) no banco

2. **Validação de Entrada**
   - Sanitização de inputs
   - Validação de tipos TypeScript
   - Limites de tamanho (ex: resposta max 1200 caracteres)

3. **Rate Limiting**
   - Limite diário de mensagens por developer
   - Limite de perguntas por dia
   - Timeout de 15s para execução de DAX

4. **Isolamento de Dados**
   - Cada grupo vê apenas seus dados
   - RLS garante isolamento no banco
   - Verificação de `company_group_id` em todas as queries

---

## 📝 Notas Técnicas

### Performance

- Índices criados para otimizar queries frequentes
- Paginação implementada em todas as listagens
- Limite de exemplos incluídos no prompt (20 máximo)
- Limite de histórico de conversa (10 mensagens)
- Cache de contexto do modelo (implementar no futuro)

### Escalabilidade

- Arquitetura preparada para múltiplos grupos
- Sistema de priorização para perguntas pendentes
- Suporte a múltiplos datasets por grupo
- Suporte a múltiplas conexões Power BI por grupo

### Tratamento de Erros

- Logs detalhados em todas as APIs
- Mensagens de erro claras para o usuário
- Fallbacks quando contexto não disponível
- Retry automático em caso de erro temporário

---

## 📞 Suporte e Documentação Adicional

### Arquivos de Documentação

- `DOCUMENTACAO_ASSISTENTE_IA.md` - Detalhes técnicos do Assistente IA
- `DOCUMENTACAO_WHATSAPP.md` - Detalhes do WhatsApp
- `DOCUMENTACAO_COMPLETA.md` - Documentação geral
- `DOCUMENTACAO_BANCO_DADOS.md` - Estrutura do banco

### Troubleshooting

**Problema:** Chat não responde
- Verificar se conexão Power BI está ativa
- Verificar se número está autorizado
- Verificar se `can_use_chat = true`
- Verificar logs em `/api/whatsapp/webhook/messages-upsert`

**Problema:** IA não gera DAX correto
- Verificar se contexto do modelo está configurado
- Verificar se há exemplos de treinamento
- Verificar se dataset_id está correto

**Problema:** Resposta muito genérica
- Criar mais exemplos de treinamento
- Melhorar contexto do modelo
- Revisar exemplos existentes

---

## 📅 Changelog

### Versão 3.0 - Janeiro 2025 ⭐
- ✅ **NOVO:** Sistema completo de Treinamento do Assistente IA
- ✅ **NOVO:** Chat via WhatsApp com prompt dinâmico
- ✅ **NOVO:** Sistema de tags múltiplas (hashtags)
- ✅ **NOVO:** Dashboard de Evolução com gráficos
- ✅ **NOVO:** Gerenciamento de Perguntas Pendentes
- ✅ **NOVO:** Integração automática entre pendentes e treinamento
- ✅ **NOVO:** Sistema de contexto conversacional
- ✅ **MELHORIA:** Controle de acesso granular por role
- ✅ **MELHORIA:** Interface padronizada com MainLayout
- ✅ **MELHORIA:** Logo do desenvolvedor no Sidebar

### Versão 2.0 - Janeiro 2025
- Sistema base com Power BI, WhatsApp e Assistente IA básico

---

**Fim da Documentação**

*Documentação gerada em: Janeiro 2025*  
*Sistema: MeuDashboard v3.0*  
*Foco: Assistente IA e Chat via WhatsApp*
