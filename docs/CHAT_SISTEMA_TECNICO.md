# 📚 Documentação Técnica - Sistema de Chat IA

## 1. Estrutura de Pastas Principais

```
meudahsboard/
├── app/
│   ├── api/
│   │   └── ai/
│   │       └── chat/
│   │           └── route.ts          # Handler principal do chat
│   └── tela/
│       └── [id]/
│           └── page.tsx              # Frontend do chat integrado
│
├── src/
│   └── lib/
│       ├── auth.ts                   # Autenticação e identificação de usuário
│       └── supabase/
│           └── admin.ts              # Cliente Supabase admin
│
└── lib/
    └── assistente-ia/
        └── documentation-parser.ts   # Parser de documentação (contexto)
```

---

## 2. Fluxo de Processamento de Mensagens

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO ENVIA MENSAGEM                                       │
│    POST /api/ai/chat                                            │
│    Body: { message, conversation_id?, screen_id? }             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AUTENTICAÇÃO E IDENTIFICAÇÃO                                │
│    - getAuthUser() → Verifica token JWT no cookie              │
│    - Busca user_id, is_master, is_developer                    │
│    - Busca company_group_id via membership                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. BUSCA CONTEXTO DA TELA                                       │
│    - Se screen_id fornecido:                                     │
│      • Busca powerbi_dashboard_screens                         │
│      • Obtém powerbi_reports (connection_id, dataset_id)       │
│      • Busca ai_model_contexts por connection_id              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDAÇÃO DE LIMITES                                         │
│    - Limite de mensagens diárias (developer):                  │
│      • Conta mensagens do grupo hoje                            │
│      • Compara com max_chat_messages_per_day                   │
│    - Limite de perguntas diárias (plano):                      │
│      • Busca ai_usage do dia                                    │
│      • Compara com max_ai_questions_per_day                    │
│    - Retorna HTTP 429 se excedido                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. GERENCIAMENTO DE CONVERSA                                    │
│    - Se conversation_id existe: usa existente                   │
│    - Se não: cria nova em ai_conversations                     │
│    - Busca histórico (últimas 20 mensagens)                     │
│      • ai_messages WHERE conversation_id                       │
│      • Ordena por created_at ASC                                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. PREPARAÇÃO DO CONTEXTO                                       │
│    - Busca contexto do modelo (ai_model_contexts)              │
│    - Identifica intenção da pergunta                           │
│    - Busca queries que funcionaram (ai_query_learning)         │
│    - Monta system prompt com:                                   │
│      • Personalidade do assistente                             │
│      • Regras de período padrão                                │
│      • Contexto do modelo                                      │
│      • Queries de aprendizado                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. CHAMADA AO CLAUDE AI                                         │
│    - Modelo: claude-sonnet-4-20250514 (com tools)              │
│              claude-haiku-3-5-20241022 (sem tools)             │
│    - Tools: execute_dax (se connection_id e dataset_id)        │
│    - Max tokens: 1024                                           │
│    - Retry: até 4 tentativas com backoff exponencial            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. PROCESSAMENTO DE TOOL CALLS                                  │
│    - Se stop_reason === 'tool_use':                            │
│      • Extrai query DAX do tool_use                            │
│      • Executa executeDaxQuery()                                │
│      • Salva resultado em ai_query_learning                    │
│      • Retorna resultados para Claude                          │
│      • Loop máximo 3 iterações                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. EXTRAÇÃO E FORMATAÇÃO                                       │
│    - Extrai texto da resposta (blocos type: 'text')            │
│    - Remove queries DAX expostas                                │
│    - Extrai sugestões do formato [SUGESTOES]...[/SUGESTOES]    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. PERSISTÊNCIA                                                │
│     - Salva mensagens em ai_messages:                          │
│       • role: 'user', content: message                         │
│       • role: 'assistant', content: assistantMessage           │
│     - Atualiza contador em ai_usage:                           │
│       • Incrementa questions_count do dia                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. RESPOSTA                                                   │
│     {                                                            │
│       message: string,                                          │
│       conversation_id: string                                   │
│     }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Schema do Banco de Dados

### 3.1 Tabelas de Usuários

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_master BOOLEAN DEFAULT false,
  is_developer BOOLEAN DEFAULT false,
  developer_id UUID,
  status TEXT CHECK (status IN ('active', 'suspended')),
  avatar_url TEXT,
  current_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_group_membership`
```sql
CREATE TABLE user_group_membership (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_group_id UUID REFERENCES company_groups(id),
  role TEXT CHECK (role IN ('admin', 'viewer', 'operator')),
  can_use_ai BOOLEAN DEFAULT false,
  can_refresh BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Tabelas de Datasets

#### `powerbi_connections`
```sql
CREATE TABLE powerbi_connections (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  workspace_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `powerbi_reports`
```sql
CREATE TABLE powerbi_reports (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `powerbi_dashboard_screens`
```sql
CREATE TABLE powerbi_dashboard_screens (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  report_id UUID REFERENCES powerbi_reports(id),
  title TEXT NOT NULL,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Tabelas de Sessões/Chat

#### `ai_conversations`
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  screen_id UUID REFERENCES powerbi_dashboard_screens(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_group ON ai_conversations(company_group_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_screen ON ai_conversations(screen_id);
```

#### `ai_messages`
```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);
```

#### `ai_model_contexts`
```sql
CREATE TABLE ai_model_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT,
  context_type VARCHAR(20) DEFAULT 'chat',
  context_name TEXT NOT NULL,
  context_content TEXT NOT NULL,
  section_base TEXT,
  section_medidas JSONB,
  section_tabelas JSONB,
  section_queries JSONB,
  section_exemplos JSONB,
  parsed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_model_contexts_group ON ai_model_contexts(company_group_id);
CREATE INDEX idx_ai_model_contexts_connection ON ai_model_contexts(connection_id);
CREATE INDEX idx_ai_model_contexts_dataset_type ON ai_model_contexts(dataset_id, context_type);
```

#### `ai_usage`
```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  user_id UUID REFERENCES users(id),
  usage_date DATE NOT NULL,
  questions_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_group_id, usage_date)
);

CREATE INDEX idx_ai_usage_group_date ON ai_usage(company_group_id, usage_date);
```

#### `ai_query_learning`
```sql
CREATE TABLE ai_query_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  dataset_id TEXT NOT NULL,
  user_question TEXT,
  question_intent TEXT,
  dax_query TEXT NOT NULL,
  dax_query_hash TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  execution_time_ms INTEGER,
  result_rows INTEGER,
  times_reused INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_query_learning_dataset ON ai_query_learning(dataset_id);
CREATE INDEX idx_ai_query_learning_intent ON ai_query_learning(question_intent);
CREATE INDEX idx_ai_query_learning_hash ON ai_query_learning(dax_query_hash);
```

---

## 4. Identificação do Usuário

### 4.1 Fluxo de Autenticação

```typescript
// 1. Verificação do Token JWT
getAuthUser() {
  // Lê cookie 'auth-token'
  // Verifica assinatura JWT com JWT_SECRET
  // Extrai payload: { id, session_id }
  // Busca usuário em users WHERE id = payload.id
  // Valida status !== 'suspended'
  // Retorna AuthUser
}

// 2. Identificação do Grupo
getUserGroupMembership() {
  // Se is_master: retorna primeiro grupo ativo
  // Se is_developer: busca grupos por developer_id
  // Se usuário comum: busca user_group_membership
  // Retorna { user_id, company_group_id, role }
}
```

### 4.2 Hierarquia de Identificação

```
1. Master (is_master = true)
   └─> Qualquer grupo ativo

2. Developer (is_developer = true OU developer_id existe)
   └─> Grupos onde developer_id = user.developer_id

3. Usuário Comum
   └─> user_group_membership WHERE user_id = user.id AND is_active = true
```

### 4.3 Permissões

```typescript
// Verificação de permissões no chat
if (user.is_master || user.is_developer) {
  can_use_ai = true;
  can_refresh = true;
} else {
  // Busca do membership
  can_use_ai = membership.can_use_ai ?? false;
  can_refresh = membership.can_refresh ?? false;
}
```

---

## 5. Código dos Arquivos Principais

### 5.1 Handler de Mensagens - `app/api/ai/chat/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-3-5-20241022';

// Função principal
export async function POST(request: Request) {
  try {
    // 1. Autenticação
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversation_id, screen_id } = body;

    const supabase = createAdminClient();

    // 2. Buscar contexto da tela
    let connectionId: string | null = null;
    let datasetId: string | null = null;
    
    if (screen_id) {
      const { data: screen } = await supabase
        .from('powerbi_dashboard_screens')
        .select(`
          report:powerbi_reports(
            connection_id,
            dataset_id
          )
        `)
        .eq('id', screen_id)
        .single();

      if (screen?.report) {
        connectionId = screen.report.connection_id;
        datasetId = screen.report.dataset_id;
      }
    }

    // 3. Buscar grupo do usuário
    let companyGroupId: string | null = null;
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    companyGroupId = membership?.company_group_id || null;

    // 4. Validar limites diários
    // ... (código de validação)

    // 5. Buscar ou criar conversa
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConversation } = await supabase
        .from('ai_conversations')
        .insert({
          company_group_id: companyGroupId,
          user_id: user.id,
          screen_id: screen_id || null,
          title: message.substring(0, 100)
        })
        .select()
        .single();
      
      conversationId = newConversation.id;
    }

    // 6. Buscar histórico
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // 7. Buscar contexto do modelo
    const modelContext = connectionId 
      ? await getModelContext(supabase, connectionId)
      : null;

    // 8. Construir mensagens para Claude
    const messages: Anthropic.MessageParam[] = [];
    previousMessages?.forEach((msg: any) => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      });
    });
    messages.push({ role: 'user', content: message });

    // 9. Chamar Claude
    const response = await callClaudeWithRetry({
      model: tools.length > 0 ? DEFAULT_MODEL : FAST_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined
    });

    // 10. Processar tool calls (loop)
    while (response.stop_reason === 'tool_use' && iterations < 3) {
      // Executa DAX e retorna resultados
    }

    // 11. Extrair resposta final
    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    // 12. Salvar mensagens
    await supabase.from('ai_messages').insert([
      { conversation_id: conversationId, role: 'user', content: message },
      { conversation_id: conversationId, role: 'assistant', content: assistantMessage }
    ]);

    // 13. Atualizar contador de uso
    // ... (código de atualização)

    return NextResponse.json({
      message: assistantMessage,
      conversation_id: conversationId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Função auxiliar: Executar DAX
async function executeDaxQuery(
  connectionId: string,
  datasetId: string,
  query: string,
  supabase: any
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  // 1. Buscar credenciais da conexão
  const { data: connection } = await supabase
    .from('powerbi_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  // 2. Obter token OAuth2
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  // 3. Executar query DAX
  const daxRes = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queries: [{ query }],
        serializerSettings: { includeNulls: true }
      })
    }
  );

  const daxData = await daxRes.json();
  return { success: true, results: daxData.results?.[0]?.tables?.[0]?.rows || [] };
}
```

### 5.2 Conexão com Banco - `src/lib/supabase/admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Cliente admin do Supabase (usa service role key)
// Usar apenas em operações server-side
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
```

### 5.3 Autenticação - `src/lib/auth.ts`

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createAdminClient } from './supabase/admin';

// Obter usuário autenticado
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;

    // Verificar JWT
    const payload = await verifyToken(token);
    if (!payload) return null;

    // Buscar usuário no banco
    const adminSupabase = createAdminClient();
    const { data: user } = await adminSupabase
      .from('users')
      .select('id, email, full_name, is_master, status, avatar_url')
      .eq('id', payload.id)
      .single();

    if (!user || user.status === 'suspended') return null;

    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      is_master: user.is_master || false,
      status: user.status,
    };
  } catch (error) {
    return null;
  }
}

// Obter membership do grupo
export async function getUserGroupMembership(): Promise<{
  user_id: string;
  company_group_id: string;
  role: string;
} | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const adminSupabase = createAdminClient();

  // Master: primeiro grupo ativo
  if (user.is_master) {
    const { data: firstGroup } = await adminSupabase
      .from('company_groups')
      .select('id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    
    return firstGroup ? {
      user_id: user.id,
      company_group_id: firstGroup.id,
      role: 'admin'
    } : null;
  }

  // Developer: grupos por developer_id
  const developerId = await getUserDeveloperId(user.id);
  if (developerId) {
    const { data: firstGroup } = await adminSupabase
      .from('company_groups')
      .select('id')
      .eq('developer_id', developerId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    
    return firstGroup ? {
      user_id: user.id,
      company_group_id: firstGroup.id,
      role: 'developer'
    } : null;
  }

  // Usuário comum: membership direto
  const { data: membership } = await adminSupabase
    .from('user_group_membership')
    .select('company_group_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  return membership ? {
    user_id: user.id,
    company_group_id: membership.company_group_id,
    role: membership.role
  } : null;
}
```

### 5.4 Frontend do Chat - `app/tela/[id]/page.tsx` (Resumo)

```typescript
'use client';

export default function TelaPage({ params }: { params: Promise<{ id: string }> }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function sendMessage(text: string) {
    setSending(true);
    
    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    }]);

    try {
      // Chama API
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          screen_id: id
        })
      });

      const data = await res.json();

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      // Extrai sugestões e adiciona resposta
      const { text: cleanText, suggestions } = extractSuggestions(data.message);
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanText,
        timestamp: new Date()
      }]);
      
      setSuggestions(suggestions);
    } catch (err) {
      // Trata erro
    } finally {
      setSending(false);
    }
  }

  function extractSuggestions(content: string) {
    const match = content.match(/\[SUGESTOES\]([\s\S]*?)\[\/SUGESTOES\]/);
    if (match) {
      const suggestions = match[1]
        .split('\n')
        .map(s => s.replace(/^-\s*/, '').trim())
        .filter(s => s.length > 0);
      const text = content.replace(/\[SUGESTOES\][\s\S]*?\[\/SUGESTOES\]/, '').trim();
      return { text, suggestions };
    }
    return { text: content, suggestions: [] };
  }

  return (
    <div>
      {/* Interface do chat */}
      <ChatPanel
        messages={messages}
        onSend={sendMessage}
        suggestions={suggestions}
        sending={sending}
      />
    </div>
  );
}
```

---

## 6. Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-xxx...

# JWT
JWT_SECRET=xxx...
```

---

## 7. Limites e Validações

### 7.1 Limite de Mensagens Diárias
- **Fonte**: `developers.max_chat_messages_per_day`
- **Padrão**: 1000 mensagens/dia
- **Contagem**: Todas as mensagens do grupo no dia atual
- **Resposta**: HTTP 429 com `limit_reached: true`

### 7.2 Limite de Perguntas Diárias
- **Fonte**: `powerbi_plans.max_ai_questions_per_day`
- **Padrão**: 50 perguntas/dia
- **Contagem**: `ai_usage.questions_count` do dia
- **Resposta**: HTTP 429

### 7.3 Timeout de Queries DAX
- **Timeout**: 15 segundos
- **Retry**: Até 4 tentativas com backoff exponencial
- **Erro**: Retorna mensagem de timeout ao usuário

---

## 8. Modelos de IA

| Modelo | Uso | Max Tokens |
|--------|-----|------------|
| `claude-sonnet-4-20250514` | Quando há tools/DAX | 1024 |
| `claude-haiku-3-5-20241022` | Quando não há tools | 1024 |

---

## 9. Estrutura de Resposta

```typescript
// Resposta da API
{
  message: string,           // Resposta formatada
  conversation_id: string    // ID da conversa (novo ou existente)
}

// Formato da mensagem com sugestões
"Resposta do assistente...

[SUGESTOES]
- Comparar com mês anterior
- Ver por filial
- Top 10 produtos
- Detalhes por vendedor
[/SUGESTOES]"
```

---

## 10. Índices do Banco de Dados

```sql
-- Conversas
CREATE INDEX idx_ai_conversations_group ON ai_conversations(company_group_id);
CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_screen ON ai_conversations(screen_id);

-- Mensagens
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);

-- Contextos
CREATE INDEX idx_ai_model_contexts_group ON ai_model_contexts(company_group_id);
CREATE INDEX idx_ai_model_contexts_connection ON ai_model_contexts(connection_id);
CREATE INDEX idx_ai_model_contexts_dataset_type ON ai_model_contexts(dataset_id, context_type);

-- Uso
CREATE INDEX idx_ai_usage_group_date ON ai_usage(company_group_id, usage_date);

-- Learning
CREATE INDEX idx_ai_query_learning_dataset ON ai_query_learning(dataset_id);
CREATE INDEX idx_ai_query_learning_intent ON ai_query_learning(question_intent);
CREATE INDEX idx_ai_query_learning_hash ON ai_query_learning(dax_query_hash);
```

---

## 11. Fluxo de Tool Calls (DAX)

```
1. Claude identifica necessidade de dados
   ↓
2. Gera tool_use com query DAX
   ↓
3. Sistema executa executeDaxQuery()
   ├─ Obtém token OAuth2 do Power BI
   ├─ POST /datasets/{id}/executeQueries
   └─ Retorna resultados JSON
   ↓
4. Salva em ai_query_learning (sucesso/erro)
   ↓
5. Retorna resultados para Claude
   ↓
6. Claude formata resposta final
```

---

## 12. Tratamento de Erros

```typescript
// Classificação de erros
function classifyError(error: any): {
  isTemporary: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  userMessage: string;
} {
  // 529, 503, 429 → Temporário, retry
  // Timeout → Temporário, retry
  // 401, 403, 400 → Permanente, não retry
  // Outros → Temporário, retry
}

// Retry com backoff exponencial
async function callClaudeWithRetry(params, maxRetries = 4) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await anthropic.messages.create(params);
    } catch (error) {
      if (attempt >= maxRetries) throw error;
      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 20000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

---

## 13. Aprendizado de Queries

O sistema aprende com queries que funcionaram:

```typescript
// Salva query após execução
await saveQueryResult(
  supabase,
  datasetId,
  companyGroupId,
  userQuestion,
  questionIntent,      // Ex: 'faturamento_total'
  daxQuery,
  success,
  errorMessage,
  executionTimeMs,
  resultRows
);

// Reutiliza queries similares
const workingQueries = await getWorkingQueries(
  supabase,
  datasetId,
  questionIntent
);
// Retorna top 3 queries mais reutilizadas
```

---

## 14. Resumo Técnico

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| **Backend** | Next.js API Routes | Handler em `/api/ai/chat` |
| **Banco** | Supabase (PostgreSQL) | Tabelas relacionais com índices |
| **IA** | Anthropic Claude API | Modelos Sonnet 4 e Haiku 3.5 |
| **Autenticação** | JWT + Cookies | Token assinado com HS256 |
| **Power BI** | REST API | OAuth2 + ExecuteQueries |
| **Frontend** | React + TypeScript | Componente integrado na tela |

---

**Última atualização**: 2025-01-24
