# Documentação: Sistema de Treinamento do Assistente IA

## Índice
1. [Visão Geral](#visão-geral)
2. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
3. [Tipos TypeScript](#tipos-typescript)
4. [APIs Criadas](#apis-criadas)
5. [Componentes React](#componentes-react)
6. [Páginas do Sistema](#páginas-do-sistema)
7. [Integração com WhatsApp](#integração-com-whatsapp)
8. [Sistema de Menus](#sistema-de-menus)
9. [Sistema de Prompt Dinâmico](#sistema-de-prompt-dinâmico)
10. [Controle de Acesso](#controle-de-acesso)

---

## Visão Geral

Foi implementado um sistema completo de **Treinamento do Assistente IA** que permite:

- ✅ Treinar a IA com exemplos validados (pergunta → resposta em DAX → resposta formatada)
- ✅ Monitorar perguntas não respondidas pelo assistente
- ✅ Gerenciar contextos do modelo Power BI
- ✅ Visualizar estatísticas e evolução do assistente
- ✅ Integrar com WhatsApp para processar perguntas automaticamente
- ✅ Sistema de prompt dinâmico que adapta-se ao contexto e histórico

### Tecnologias Utilizadas
- **Next.js 16** (App Router)
- **TypeScript** (tipagem estrita)
- **Supabase** (banco de dados PostgreSQL)
- **Anthropic Claude API** (modelo de IA)
- **Tailwind CSS** (estilização)
- **React Hooks** (estado e efeitos)

---

## Estrutura do Banco de Dados

### Arquivo de Migração
**`supabase/migrations/20260107_assistente_ia.sql`**

### Tabelas Criadas

#### 1. `ai_training_examples`
Armazena exemplos de treinamento validados pelo usuário.

**Campos principais:**
- `id` - UUID (chave primária)
- `company_group_id` - UUID (referência ao grupo)
- `connection_id` - UUID (referência à conexão Power BI - opcional)
- `dataset_id` - TEXT (ID do dataset Power BI)
- `user_question` - TEXT (pergunta do usuário)
- `dax_query` - TEXT (consulta DAX gerada)
- `formatted_response` - TEXT (resposta formatada para o usuário)
- `category` - TEXT (categoria opcional: "faturamento", "vendas", etc.)
- `tags` - TEXT[] (array de tags para busca)
- `is_validated` - BOOLEAN (sempre TRUE para exemplos salvos)
- `validation_count` - INTEGER (quantidade de vezes confirmado)
- `last_used_at` - TIMESTAMPTZ (última vez que foi usado no prompt)
- `created_by` - UUID (usuário que criou)
- `created_at`, `updated_at` - TIMESTAMPTZ

**Índices criados:**
- `idx_training_company_group` - busca por grupo
- `idx_training_connection` - busca por conexão
- `idx_training_dataset` - busca por dataset
- `idx_training_validated` - filtro de validados
- `idx_training_question_search` - busca full-text na pergunta (GIN)

#### 2. `ai_unanswered_questions`
Armazena perguntas que o assistente não conseguiu responder.

**Campos principais:**
- `id` - UUID (chave primária)
- `company_group_id` - UUID (referência ao grupo)
- `connection_id` - UUID (referência à conexão Power BI - opcional)
- `dataset_id` - TEXT (ID do dataset Power BI)
- `user_question` - TEXT (pergunta do usuário)
- `phone_number` - TEXT (telefone de quem perguntou - WhatsApp)
- `attempted_dax` - TEXT (DAX que foi tentado - opcional)
- `error_message` - TEXT (mensagem de erro - opcional)
- `attempt_count` - INTEGER (quantidade de tentativas)
- `priority_score` - DECIMAL (score de prioridade calculado automaticamente)
- `user_count` - INTEGER (quantidade de usuários que fizeram a mesma pergunta)
- `status` - TEXT ('pending', 'in_progress', 'resolved', 'ignored')
- `resolved_at` - TIMESTAMPTZ (quando foi resolvida)
- `resolved_by` - UUID (quem resolveu)
- `training_example_id` - UUID (link para exemplo criado - opcional)
- `first_asked_at` - TIMESTAMPTZ (primeira vez que foi perguntada)
- `last_asked_at` - TIMESTAMPTZ (última vez que foi perguntada)
- `created_at` - TIMESTAMPTZ

**Índices criados:**
- `idx_unanswered_company_group` - busca por grupo
- `idx_unanswered_status` - filtro por status
- `idx_unanswered_priority` - ordenação por prioridade
- `idx_unanswered_phone` - busca por telefone

**Funções e Triggers:**
- `calculate_priority_score()` - função que calcula score de prioridade automaticamente
- `update_unanswered_priority()` - trigger que atualiza score ao inserir/atualizar
- `update_updated_at()` - trigger que atualiza `updated_at` automaticamente

#### 3. `ai_assistant_stats`
Armazena estatísticas diárias de uso do assistente.

**Campos principais:**
- `id` - UUID (chave primária)
- `company_group_id` - UUID (referência ao grupo)
- `stat_date` - DATE (data das estatísticas)
- `questions_asked` - INTEGER (total de perguntas feitas)
- `questions_answered` - INTEGER (total de perguntas respondidas)
- `questions_failed` - INTEGER (total de perguntas que falharam)
- `avg_response_time_ms` - INTEGER (tempo médio de resposta em milissegundos)
- `success_rate` - DECIMAL (taxa de sucesso: answered / asked)
- `created_at`, `updated_at` - TIMESTAMPTZ

**Constraint único:**
- `UNIQUE(company_group_id, stat_date)` - uma linha por grupo por dia

### Row Level Security (RLS)

Todas as tabelas possuem políticas RLS configuradas:

- **SELECT**: Usuários podem ver dados do seu `company_group_id`
- **INSERT**: Apenas usuários autenticados do grupo podem inserir
- **UPDATE**: Apenas usuários autenticados do grupo podem atualizar
- **DELETE**: Apenas master/developer/admin podem deletar

---

## Tipos TypeScript

### Arquivo: `src/types/assistente-ia.ts`

Principais interfaces criadas:

```typescript
// Exemplo de treinamento
interface TrainingExample {
  id: string;
  company_group_id: string;
  connection_id?: string;
  dataset_id?: string;
  user_question: string;
  dax_query: string;
  formatted_response: string;
  category?: string;
  tags?: string[];
  is_validated: boolean;
  validation_count: number;
  last_used_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Pergunta não respondida
interface UnansweredQuestion {
  id: string;
  company_group_id: string;
  connection_id?: string;
  dataset_id?: string;
  user_question: string;
  phone_number: string;
  attempted_dax?: string;
  error_message?: string;
  attempt_count: number;
  priority_score: number;
  user_count: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'ignored';
  resolved_at?: string;
  resolved_by?: string;
  training_example_id?: string;
  first_asked_at: string;
  last_asked_at: string;
  created_at: string;
}

// Estatísticas do assistente
interface AssistantStats {
  total_examples: number;
  pending_questions: number;
  success_rate_7d: number;
  success_rate_30d: number;
}

// Resultado de teste
interface TestResult {
  response: string;
  dax_query: string;
  execution_time_ms: number;
}
```

---

## APIs Criadas

### Base Path: `/api/assistente-ia`

#### 1. **Training API** - `POST /api/assistente-ia/training`

Gerenciamento de exemplos de treinamento.

**Métodos:**
- **GET**: Lista exemplos com filtros e paginação
  - Query params: `connection_id?`, `dataset_id?`, `category?`, `page?`, `limit?`
- **POST**: Cria novo exemplo de treinamento
  - Body: `user_question`, `dax_query`, `formatted_response`, `category?`, `dataset_id?`
- **PUT**: Atualiza exemplo existente
  - Body: `id`, `user_question?`, `dax_query?`, `formatted_response?`, `category?`
- **DELETE**: Remove exemplo
  - Query param: `id`

**Controle de acesso:** `master`, `developer`, `admin`

#### 2. **Test API** - `POST /api/assistente-ia/training/test`

Testa uma pergunta e retorna resposta gerada pela IA.

**Body:**
```json
{
  "question": "Quanto faturamos em dezembro?",
  "dataset_id": "dataset-id-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "📊 Faturamento em dezembro: R$ 150.000,00",
    "dax_query": "EVALUATE ROW(...)",
    "execution_time_ms": 2500
  }
}
```

**Funcionalidades:**
- Constrói prompt dinâmico com contexto do modelo
- Inclui exemplos de treinamento relevantes
- Inclui histórico de conversa (últimas 10 mensagens)
- Chama Anthropic Claude API
- Retorna resposta formatada e DAX gerado

**Controle de acesso:** `master`, `developer`, `admin`

#### 3. **Questions API** - `GET /api/assistente-ia/questions`

Lista perguntas não respondidas.

**Query params:**
- `status?` - Filtrar por status ('pending', 'in_progress', 'resolved', 'ignored')
- `connection_id?` - Filtrar por conexão
- `dataset_id?` - Filtrar por dataset
- `page?` - Página (padrão: 1)
- `limit?` - Itens por página (padrão: 20)
- `sort?` - Ordenação ('priority', 'recent', 'oldest')

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "total": 50,
    "page": 1,
    "limit": 20,
    "total_pages": 3
  }
}
```

**Controle de acesso:** `master`, `developer`, `admin`

#### 4. **Question Management API** - `POST /api/assistente-ia/questions/[id]`

Gerencia uma pergunta não respondida específica.

**Body:**
```json
{
  "action": "resolve" | "ignore" | "reopen",
  "training_example_id?" : "uuid-optional"
}
```

**Ações:**
- `resolve`: Marca como resolvida (opcionalmente linka a um exemplo de treinamento)
- `ignore`: Marca como ignorada
- `reopen`: Reabre uma pergunta resolvida/ignorada

**Controle de acesso:** `master`, `developer`, `admin`

#### 5. **Stats API** - `GET /api/assistente-ia/stats`

Retorna estatísticas do assistente.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_examples": 150,
    "pending_questions": 12,
    "success_rate_7d": 0.85,
    "success_rate_30d": 0.82
  }
}
```

**Controle de acesso:** `master`, `developer`, `admin`

---

## Componentes React

### 1. **PermissionGuard** - `src/components/assistente-ia/PermissionGuard.tsx`

Componente que bloqueia acesso baseado em role.

**Props:**
- `children` - Conteúdo a ser renderizado se autorizado

**Funcionalidades:**
- Verifica role do usuário (bloqueia `viewer` e `operator`)
- Mostra loading durante verificação
- Mostra mensagem de acesso negado se não autorizado
- Permite acesso para: `master`, `developer`, `admin`

### 2. **TestArea** - `src/components/assistente-ia/TestArea.tsx`

Componente para testar perguntas com a IA.

**Props:**
- `onTest: (question: string) => Promise<any>` - Callback ao testar
- `datasetId?: string` - ID do dataset selecionado

**Funcionalidades:**
- Input para pergunta do usuário
- Botão "Testar"
- Exibe resposta formatada retornada pela IA
- Exibe DAX query gerada (em bloco de código)
- Exibe tempo de execução
- Loading durante teste

### 3. **QuestionCard** - `src/components/assistente-ia/QuestionCard.tsx`

Card que exibe uma pergunta não respondida.

**Props:**
- `question: UnansweredQuestion` - Dados da pergunta
- `onTrain: (id: string) => void` - Callback ao treinar
- `onIgnore: (id: string) => void` - Callback ao ignorar

**Funcionalidades:**
- Exibe pergunta do usuário
- Exibe telefone (WhatsApp)
- Exibe score de prioridade com badge
- Exibe métricas (tentativas, usuários, datas)
- Botões de ação (Treinar / Ignorar)
- Badge de status colorido

### 4. **StatsCard** - `src/components/assistente-ia/StatsCard.tsx`

Card reutilizável para exibir estatísticas.

**Props:**
- `title: string` - Título do card
- `value: string | number` - Valor principal
- `subtitle?: string` - Subtítulo opcional
- `icon?: React.ReactNode` - Ícone opcional
- `color?: 'blue' | 'green' | 'yellow' | 'red'` - Cor do card

---

## Páginas do Sistema

### 1. **Treinar IA** - `/app/assistente-ia/treinar/page.tsx`

Página principal para treinar o assistente.

**Funcionalidades:**
- Seletor de Dataset Power BI (busca de todas as conexões disponíveis)
- Área de teste com componente `TestArea`
- Formulário para salvar exemplo:
  - Campo: Pergunta
  - Campo: Consulta DAX (textarea)
  - Campo: Resposta formatada (textarea)
  - Campo: Categoria (opcional)
- Botão "Salvar Exemplo"
- Notificações de sucesso/erro

**Fluxo:**
1. Usuário seleciona dataset
2. Usuário testa uma pergunta
3. IA gera resposta e DAX
4. Usuário revisa e ajusta se necessário
5. Usuário salva como exemplo de treinamento

### 2. **Perguntas Pendentes** - `/app/assistente-ia/pendentes/page.tsx`

Lista e gerencia perguntas não respondidas.

**Funcionalidades:**
- Cards de estatísticas no topo:
  - Total de pendentes
  - Em progresso
  - Resolvidas hoje
- Filtros:
  - Status (pending, in_progress, resolved, ignored)
  - Conexão Power BI
  - Dataset
- Lista de perguntas com componente `QuestionCard`
- Paginação
- Ações:
  - Treinar (cria exemplo a partir da pergunta)
  - Ignorar (marca como ignorada)

### 3. **Contextos** - `/app/assistente-ia/contextos/page.tsx`

Gerencia contextos do modelo Power BI.

**Funcionalidades:**
- Lista contextos salvos
- Criar novo contexto
- Editar contexto existente
- Visualizar contexto
- Deletar contexto
- Integração com API `/api/powerbi/contexts`

### 4. **Evolução** - `/app/assistente-ia/evolucao/page.tsx`

Visualiza estatísticas e evolução do assistente.

**Funcionalidades:**
- Cards de resumo:
  - Total de exemplos treinados
  - Perguntas pendentes
  - Taxa de sucesso (7 dias)
  - Taxa de sucesso (30 dias)
- Gráfico de histórico diário
- Insights inteligentes:
  - Tendências
  - Sugestões de melhorias
  - Alertas

---

## Integração com WhatsApp

### Arquivo: `app/api/whatsapp/webhook/messages-upsert/route.ts`

O webhook do WhatsApp foi atualizado para usar o novo sistema de prompt dinâmico.

**Funcionalidades adicionadas:**

1. **Prompt Dinâmico:**
   - Busca contexto do modelo automaticamente
   - Inclui exemplos de treinamento relevantes (até 20 mais recentes)
   - Inclui histórico de conversa (últimas 10 mensagens)
   - Adapta-se ao `connection_id` e `dataset_id` quando disponível

2. **Registro de Perguntas Não Respondidas:**
   - Se a IA não conseguir gerar resposta ou DAX inválido
   - Registra automaticamente em `ai_unanswered_questions`
   - Incrementa `attempt_count` se pergunta já existir
   - Incrementa `user_count` se novo usuário fizer mesma pergunta
   - Calcula `priority_score` automaticamente

3. **Atualização de Estatísticas:**
   - Atualiza `ai_assistant_stats` diariamente
   - Incrementa `questions_asked`
   - Incrementa `questions_answered` ou `questions_failed`
   - Calcula `avg_response_time_ms`
   - Calcula `success_rate`

4. **Tracking de Uso de Exemplos:**
   - Quando um exemplo de treinamento é usado no prompt
   - Atualiza `last_used_at` do exemplo

**Fluxo:**

```
1. Mensagem recebida no WhatsApp
   ↓
2. Identifica grupo/usuário
   ↓
3. Busca contexto do modelo (se dataset_id disponível)
   ↓
4. Busca exemplos de treinamento relevantes
   ↓
5. Busca histórico de conversa (últimas 10)
   ↓
6. Constrói prompt dinâmico
   ↓
7. Chama Anthropic Claude API
   ↓
8. Processa resposta
   ↓
9a. Se sucesso:
     - Envia resposta para WhatsApp
     - Atualiza estatísticas (answered)
     - Atualiza last_used_at dos exemplos usados
   ↓
9b. Se falha:
     - Registra em ai_unanswered_questions
     - Atualiza estatísticas (failed)
     - Envia mensagem genérica para usuário
```

---

## Sistema de Menus

### Sidebar - `src/components/layout/Sidebar.tsx`

Novo menu "Assistente IA" adicionado:

**Estrutura:**
```
📊 Assistente IA
  ├─ 🎓 Treinar IA (/assistente-ia/treinar)
  ├─ 📚 Contextos (/assistente-ia/contextos)
  ├─ ⚠️ Perguntas Pendentes (/assistente-ia/pendentes)
  └─ 📈 Evolução (/assistente-ia/evolucao)
```

**Controle de acesso:**
- Roles permitidas: `master`, `developer`, `admin`
- Bloqueado para: `viewer`, `operator`

### Header - `src/components/layout/Header.tsx`

Novo tab "Assistente IA" adicionado:

**Estrutura:**
```
[Desenvolvedor] [Power BI] [WhatsApp] [Assistente IA] [Dashboards]
```

**Controle de acesso:**
- Mesmo controle de acesso do menu lateral
- Highlight automático quando rota ativa

---

## Sistema de Prompt Dinâmico

### Arquivo: `src/lib/ai/system-prompt.ts`

Função principal: `buildSystemPrompt(options)`

**Estrutura do Prompt:**

1. **Regras Universais** (sempre incluídas):
   - Você é um assistente especializado em gerar consultas DAX para Power BI
   - Formate respostas de forma clara e visual
   - Use emojis apropriados
   - Sempre retorne DAX válido
   - Etc.

2. **Contexto do Modelo** (quando disponível):
   - Tabelas e colunas disponíveis
   - Relacionamentos
   - Medidas existentes
   - Formato fornecido pela API do Power BI

3. **Exemplos de Treinamento** (quando disponíveis):
   - Lista dos exemplos mais relevantes
   - Formato: "Pergunta → DAX → Resposta"
   - Ordenados por relevância e uso recente

4. **Histórico de Conversa** (quando disponível):
   - Últimas 10 mensagens da conversa
   - Formato: "Usuário: ... / Assistente: ..."
   - Usado para contexto conversacional

### Arquivo: `src/lib/ai/prompt-helpers.ts`

Funções auxiliares para buscar dados dinâmicos:

- `getModelContext(companyGroupId, connectionId?, datasetId?)` - Busca contexto do modelo Power BI
- `getTrainingExamples(companyGroupId, connectionId?, datasetId?, limit?)` - Busca exemplos de treinamento
- `getConversationHistory(companyGroupId, phoneNumber, limit?)` - Busca histórico de conversa

**Lógica de Relevância:**

Exemplos de treinamento são ordenados por:
1. Mesmo `dataset_id` (prioridade alta)
2. Mesma `category` (prioridade média)
3. `last_used_at` recente (prioridade média)
4. `validation_count` alto (prioridade baixa)

---

## Controle de Acesso

### Roles e Permissões

| Role | Treinar IA | Ver Pendentes | Ver Contextos | Ver Evolução |
|------|-----------|---------------|---------------|--------------|
| Master | ✅ | ✅ | ✅ | ✅ |
| Developer | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Viewer | ❌ | ❌ | ❌ | ❌ |
| Operator | ❌ | ❌ | ❌ | ❌ |

### Verificação de Permissão

Todas as APIs verificam permissões através de:

```typescript
import { getUserGroupMembership } from '@/lib/auth';

const membership = await getUserGroupMembership();
if (!membership) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}

const allowedRoles = ['master', 'developer', 'admin'];
if (!allowedRoles.includes(membership.role)) {
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
```

### Row Level Security (RLS)

No banco de dados, todas as tabelas têm RLS configurado:

- Usuários só veem dados do seu `company_group_id`
- Apenas roles autorizadas podem inserir/atualizar
- Apenas master/developer/admin podem deletar

---

## Fluxo Completo de Uso

### 1. Treinamento Inicial

```
1. Usuário acessa /assistente-ia/treinar
2. Seleciona um dataset Power BI
3. Testa uma pergunta: "Quanto faturamos em dezembro?"
4. IA gera resposta e DAX automaticamente
5. Usuário revisa e ajusta se necessário
6. Usuário salva como exemplo de treinamento
```

### 2. Pergunta via WhatsApp

```
1. Usuário envia mensagem no WhatsApp
2. Webhook recebe mensagem
3. Sistema identifica grupo e dataset (se configurado)
4. Busca contexto do modelo Power BI
5. Busca exemplos de treinamento relevantes
6. Busca histórico de conversa
7. Constrói prompt dinâmico
8. Chama Anthropic Claude API
9. Processa resposta
10a. Se sucesso: Envia resposta formatada
10b. Se falha: Registra como pergunta não respondida
```

### 3. Gerenciamento de Pendentes

```
1. Usuário acessa /assistente-ia/pendentes
2. Visualiza perguntas não respondidas ordenadas por prioridade
3. Clica em "Treinar" em uma pergunta
4. Sistema redireciona para /assistente-ia/treinar com pergunta pré-preenchida
5. Usuário testa e salva exemplo
6. Pergunta é marcada como resolvida automaticamente
```

### 4. Monitoramento

```
1. Usuário acessa /assistente-ia/evolucao
2. Visualiza estatísticas:
   - Total de exemplos treinados
   - Perguntas pendentes
   - Taxa de sucesso (7d e 30d)
3. Analisa histórico diário
4. Recebe insights e sugestões
```

---

## Próximos Passos Sugeridos

1. **Sistema de Validação Automática**
   - Testar DAX gerado antes de enviar resposta
   - Validar sintaxe automaticamente

2. **Aprendizado Contínuo**
   - Feedback do usuário sobre respostas (👍/👎)
   - Ajuste automático de exemplos baseado em feedback

3. **Categorização Automática**
   - ML para categorizar perguntas automaticamente
   - Sugestão de tags baseada em similaridade

4. **Multi-idioma**
   - Suporte para perguntas em diferentes idiomas
   - Tradução automática de contexto

5. **Analytics Avançado**
   - Dashboard de métricas detalhadas
   - Exportação de relatórios
   - Alertas quando taxa de sucesso cai

---

## Notas Técnicas

### Performance

- Índices criados para otimizar queries frequentes
- Paginação implementada em todas as listagens
- Cache de contexto do modelo (implementar no futuro)
- Limite de exemplos incluídos no prompt (20 máximo)

### Segurança

- RLS configurado em todas as tabelas
- Validação de permissões em todas as APIs
- Sanitização de inputs
- Rate limiting recomendado (implementar no futuro)

### Escalabilidade

- Arquitetura preparada para múltiplos grupos
- Sistema de priorização para perguntas pendentes
- Suporte a múltiplos datasets por grupo

---

## Conclusão

O sistema de Treinamento do Assistente IA foi implementado com sucesso, fornecendo:

- ✅ Interface completa para treinar a IA
- ✅ Monitoramento de perguntas não respondidas
- ✅ Integração com WhatsApp
- ✅ Sistema de prompt dinâmico inteligente
- ✅ Controle de acesso robusto
- ✅ Estatísticas e analytics

O sistema está pronto para uso em produção e pode ser expandido conforme necessário.

---

**Data de Criação:** Janeiro 2025  
**Versão:** 1.0.0  
**Autor:** Sistema de Documentação Automática
