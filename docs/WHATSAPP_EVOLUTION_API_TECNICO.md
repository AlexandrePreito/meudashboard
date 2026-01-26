# 📱 Documentação Técnica - Integração WhatsApp/Evolution API

## 1. Localização do Webhook

### Endpoint Principal
**Arquivo**: `app/api/whatsapp/webhook/route.ts`  
**Endpoint**: `POST /api/whatsapp/webhook`  
**Método**: `POST` (recebe mensagens) e `GET` (verificação de status)

### Configuração na Evolution API

A Evolution API deve ser configurada para enviar webhooks para:
```
https://seu-dominio.com/api/whatsapp/webhook
```

**Eventos suportados:**
- `messages.upsert` - Nova mensagem recebida
- `message` - Mensagem recebida (formato alternativo)

---

## 2. Identificação do Usuário pelo Telefone

### Fluxo de Identificação

```typescript
// 1. Extrair número do webhook
const remoteJid = keyData.remoteJid || messageData.remoteJid || '';
phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';

// 2. Buscar número autorizado
const { data: authRecords } = await supabase
  .from('whatsapp_authorized_numbers')
  .select('id, name, phone_number, company_group_id, instance_id, is_active')
  .eq('phone_number', phone)
  .eq('is_active', true)
  .limit(1);

authorizedNumber = authRecords?.[0] || null;

// 3. Se não encontrado, mensagem é ignorada
if (!authorizedNumber) {
  return NextResponse.json({ status: 'ignored', reason: 'unauthorized' });
}
```

### Tabela de Autorização

O sistema **NÃO** usa a coluna `phone` na tabela `users`. Em vez disso, usa a tabela `whatsapp_authorized_numbers` que vincula:
- `phone_number` → Número do WhatsApp
- `company_group_id` → Grupo da empresa
- `name` → Nome do usuário/contato
- `instance_id` → Instância WhatsApp conectada

---

## 3. Schema da Tabela `users`

### Verificação

A tabela `users` **NÃO possui** coluna `phone`. A identificação é feita exclusivamente através de `whatsapp_authorized_numbers`.

### Estrutura da Tabela `users` (relevante)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  is_master BOOLEAN DEFAULT false,
  is_developer BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('active', 'suspended')),
  -- NÃO possui coluna phone
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Tabela de Vinculação Telefone → Usuário

### Tabela: `whatsapp_authorized_numbers`

Esta é a tabela principal que vincula telefones a grupos/usuários:

```sql
CREATE TABLE whatsapp_authorized_numbers (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  
  -- Dados do número
  phone_number TEXT NOT NULL,  -- Formato: 5511999999999 (sem +, sem espaços)
  name TEXT NOT NULL,          -- Nome do contato/usuário
  
  -- Permissões
  can_receive_alerts BOOLEAN DEFAULT TRUE,
  can_use_chat BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(instance_id, phone_number)
);

-- Índices
CREATE INDEX idx_whatsapp_authorized_numbers_group_id 
  ON whatsapp_authorized_numbers(company_group_id);
CREATE INDEX idx_whatsapp_authorized_numbers_instance_id 
  ON whatsapp_authorized_numbers(instance_id);
CREATE INDEX idx_whatsapp_authorized_numbers_phone 
  ON whatsapp_authorized_numbers(phone_number);
```

### Formato do `phone_number`

- **Formato**: Apenas dígitos, sem `+`, sem espaços, sem `-`
- **Exemplo**: `5511999999999` (Brasil: 55 + DDD + número)
- **Normalização**: O sistema remove caracteres não numéricos antes de salvar

```typescript
// Normalização no código
phone_number: phone_number.replace(/\D/g, '')
```

### Tabela Relacionada: `whatsapp_number_datasets`

Vincula números autorizados a datasets do Power BI:

```sql
CREATE TABLE whatsapp_number_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorized_number_id UUID NOT NULL REFERENCES whatsapp_authorized_numbers(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES powerbi_connections(id),
  dataset_id TEXT NOT NULL,
  dataset_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(authorized_number_id, connection_id, dataset_id)
);
```

---

## 5. Fluxo Completo de Mensagem WhatsApp

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. EVOLUTION API ENVIA WEBHOOK                                  │
│    POST /api/whatsapp/webhook                                   │
│    Body: { event: 'messages.upsert', data: {...} }             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EXTRAIR DADOS DA MENSAGEM                                    │
│    - remoteJid: "5511999999999@s.whatsapp.net"                 │
│    - messageText: Texto da mensagem                             │
│    - fromMe: false (mensagem recebida)                         │
│    - externalId: ID único da mensagem                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. NORMALIZAR NÚMERO                                            │
│    phone = remoteJid.replace('@s.whatsapp.net', '')            │
│    Resultado: "5511999999999"                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VERIFICAR AUTORIZAÇÃO                                        │
│    SELECT * FROM whatsapp_authorized_numbers                    │
│    WHERE phone_number = '5511999999999'                        │
│    AND is_active = true                                         │
│    → Se não encontrado: IGNORA mensagem                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. CONTROLE DE DUPLICIDADE                                      │
│    SELECT * FROM whatsapp_messages                              │
│    WHERE external_id = messageData.key.id                      │
│    → Se existe: IGNORA (mensagem já processada)                │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. BUSCAR CONTEXTO E INSTÂNCIA                                 │
│    - ai_model_contexts (contexto do modelo)                     │
│    - whatsapp_instances (instância conectada)                   │
│    - whatsapp_number_datasets (datasets vinculados)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. SALVAR MENSAGEM INCOMING                                    │
│    INSERT INTO whatsapp_messages:                               │
│    - phone_number, message_content, direction='incoming'        │
│    - company_group_id, external_id                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. PROCESSAR COMANDOS ESPECIAIS                                │
│    - /ajuda → Retorna lista de comandos                        │
│    - /limpar → Arquiva histórico                                │
│    - /status → Mostra status                                    │
│    - Saudações → Mensagem de boas-vindas                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. BUSCAR HISTÓRICO DE CONVERSA                                │
│    SELECT * FROM whatsapp_messages                             │
│    WHERE phone_number = phone                                  │
│    AND company_group_id = authorizedNumber.company_group_id    │
│    AND archived = false                                        │
│    ORDER BY created_at DESC                                    │
│    LIMIT 10                                                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. CONSTRUIR SYSTEM PROMPT                                    │
│     - Personalidade do assistente                              │
│     - Regras de período padrão (mês atual)                     │
│     - Contexto do modelo de dados                              │
│     - Queries que funcionaram (aprendizado)                    │
│     - Exemplos de treinamento                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. CHAMAR CLAUDE AI                                            │
│     - Modelo: claude-sonnet-4-20250514                         │
│     - Tools: execute_dax (se dataset disponível)               │
│     - Max tokens: 1000                                          │
│     - Retry: até 4 tentativas                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. PROCESSAR TOOL CALLS (DAX)                                  │
│     - Se stop_reason === 'tool_use':                           │
│       • Extrai query DAX                                        │
│       • Executa executeDaxQuery()                               │
│       • Salva em ai_query_learning                             │
│       • Retorna resultados para Claude                         │
│       • Loop máximo 1 iteração                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. EXTRAIR RESPOSTA                                            │
│     - Extrai texto dos blocos type: 'text'                     │
│     - Remove queries DAX expostas                               │
│     - Detecta sugestões (1️⃣, 2️⃣, 3️⃣)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 14. DETECTAR PERGUNTAS NÃO RESPONDIDAS                         │
│     - Padrões evasivos: "não encontrei", "não consegui"        │
│     - Salva em ai_unanswered_questions                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 15. VERIFICAR SE DEVE RESPONDER COM ÁUDIO                      │
│     - Se mensagem original era áudio: respondWithAudio = true  │
│     - Gera áudio via OpenAI TTS                                │
│     - Envia via sendWhatsAppAudio()                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 16. ENVIAR RESPOSTA                                             │
│     - Se áudio: sendWhatsAppAudio()                            │
│     - Se texto: sendWhatsAppMessage()                          │
│     - Divide mensagem se > 2000 caracteres                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 17. SALVAR MENSAGEM OUTGOING                                   │
│     INSERT INTO whatsapp_messages:                             │
│     - phone_number, message_content, direction='outgoing'      │
│     - company_group_id, instance_id                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Envio de Mensagens pelo WhatsApp

### 6.1 Função: Enviar Texto

```typescript
export async function sendWhatsAppMessage(
  instance: any, 
  phone: string, 
  message: string
): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const url = `${apiUrl}/message/sendText/${instance.instance_name}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendWhatsAppMessage] Erro:', errorText);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[sendWhatsAppMessage] Erro:', error.message);
    return false;
  }
}
```

**Endpoint Evolution API:**
```
POST {api_url}/message/sendText/{instance_name}
Headers: { apikey: {api_key} }
Body: { number: "5511999999999", text: "Mensagem" }
```

### 6.2 Função: Enviar Áudio

```typescript
export async function sendWhatsAppAudio(
  instance: any, 
  phone: string, 
  audioBase64: string
): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Tentativa 1: sendWhatsAppAudio
    const url = `${apiUrl}/message/sendWhatsAppAudio/${instance.instance_name}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        audio: audioBase64
      }),
    });
    
    if (response.ok) {
      return true;
    }
    
    // Tentativa 2: sendMedia (fallback)
    const mediaUrl = `${apiUrl}/message/sendMedia/${instance.instance_name}`;
    
    const mediaResponse = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'audio',
        mimetype: 'audio/mp3',
        media: `data:audio/mp3;base64,${audioBase64}`,
        fileName: 'audio.mp3'
      }),
    });
    
    return mediaResponse.ok;
  } catch (error: any) {
    console.error('[sendWhatsAppAudio] Erro:', error.message);
    return false;
  }
}
```

**Endpoints Evolution API:**
1. `POST {api_url}/message/sendWhatsAppAudio/{instance_name}`
2. `POST {api_url}/message/sendMedia/{instance_name}` (fallback)

### 6.3 Geração de Áudio (OpenAI TTS)

```typescript
export async function generateAudio(text: string): Promise<string | null> {
  try {
    const speechText = formatTextForSpeech(text);
    const limitedText = speechText.slice(0, 4000);
    
    if (!process.env.OPENAI_API_KEY) {
      return null;
    }
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'shimmer',
      input: limitedText,
      response_format: 'mp3',
      speed: 1.0
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error: any) {
    console.error('[generateAudio] Erro:', error.message);
    return null;
  }
}
```

### 6.4 Divisão de Mensagens Longas

Mensagens > 2000 caracteres são automaticamente divididas:

```typescript
// Lógica de divisão (implementada no frontend ou backend)
if (message.length > 2000) {
  const parts = splitMessageByParagraphs(message);
  for (let i = 0; i < parts.length; i++) {
    const prefix = `📄 *Parte ${i + 1}/${parts.length}*\n\n`;
    await sendWhatsAppMessage(instance, phone, prefix + parts[i]);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Delay 1.5s
  }
}
```

---

## 7. Variáveis de Ambiente

### 7.1 Variáveis Obrigatórias

```env
# Anthropic Claude (IA)
ANTHROPIC_API_KEY=sk-ant-xxx...

# OpenAI (TTS para áudio)
OPENAI_API_KEY=sk-xxx...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### 7.2 Variáveis Opcionais

```env
# JWT (autenticação)
JWT_SECRET=xxx...

# Ambiente
NODE_ENV=production
```

### 7.3 Configuração por Instância

As instâncias WhatsApp armazenam suas próprias configurações:

```typescript
// Tabela whatsapp_instances
{
  api_url: string;        // URL da Evolution API
  api_key: string;        // API Key (criptografada)
  instance_name: string;  // Nome único da instância
}
```

**Não há variáveis de ambiente globais para Evolution API** - cada instância tem sua própria configuração.

---

## 8. Código Completo dos Arquivos Relacionados

### 8.1 Webhook Principal - `app/api/whatsapp/webhook/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Função para executar DAX
export async function executeDaxQuery(
  connectionId: string, 
  datasetId: string, 
  query: string, 
  supabase: any
): Promise<{ success: boolean; results?: any[]; error?: string }> {
  // ... (código completo no arquivo)
}

// Função para enviar mensagem WhatsApp
export async function sendWhatsAppMessage(
  instance: any, 
  phone: string, 
  message: string
): Promise<boolean> {
  // ... (código completo acima)
}

// Função para enviar áudio WhatsApp
export async function sendWhatsAppAudio(
  instance: any, 
  phone: string, 
  audioBase64: string
): Promise<boolean> {
  // ... (código completo acima)
}

// Função para gerar áudio
export async function generateAudio(text: string): Promise<string | null> {
  // ... (código completo acima)
}

// Função para buscar instância
export async function getInstanceForAuthorizedNumber(
  authorizedNumber: any, 
  supabase: any
): Promise<any> {
  if (authorizedNumber?.instance_id) {
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', authorizedNumber.instance_id)
      .eq('is_connected', true)
      .maybeSingle();
    
    if (instance) return instance;
  }

  const { data: anyInstance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('is_connected', true)
    .limit(1)
    .maybeSingle();
  
  return anyInstance;
}

// POST - Webhook do Evolution API
export async function POST(request: Request) {
  const startTime = Date.now();
  let instance: any = null;
  let phone: string = '';
  let authorizedNumber: any = null;
  
  const supabase = createAdminClient();
  
  try {
    const body = await request.json();
    
    // Extrair dados
    const event = body.event || body.type;
    const messageData = body.data || body;
    
    if (event !== 'messages.upsert' && event !== 'message') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

    const keyData = messageData.key || {};
    const messageContent = messageData.message || {};
    const remoteJid = keyData.remoteJid || messageData.remoteJid || '';
    const fromMe = keyData.fromMe || false;
    
    const messageText = messageContent.conversation ||
                        messageContent.extendedTextMessage?.text ||
                        messageContent.imageMessage?.caption ||
                        messageContent.videoMessage?.caption ||
                        messageContent.documentMessage?.caption ||
                        messageContent.audioMessage?.caption ||
                        messageContent.audioMessage?.text ||
                        messageData.body ||
                        '';

    if (fromMe || !messageText.trim()) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe or empty' });
    }

    // Normalizar número
    phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';

    // Buscar número autorizado
    const { data: authRecords } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('id, name, phone_number, company_group_id, instance_id, is_active')
      .eq('phone_number', phone)
      .eq('is_active', true)
      .limit(1);
    
    authorizedNumber = authRecords?.[0] || null;

    if (!authorizedNumber) {
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized' });
    }

    // Controle de duplicidade
    const externalId = messageData?.key?.id;
    if (externalId) {
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle();
      
      if (existingMessage) {
        return NextResponse.json({ status: 'ignored', reason: 'duplicate' });
      }
    }

    // Buscar contexto e instância
    const [allContextsResult, instanceResult] = await Promise.all([
      supabase
        .from('ai_model_contexts')
        .select('id, connection_id, dataset_id, context_content, context_name, dataset_name, company_group_id')
        .eq('company_group_id', authorizedNumber.company_group_id)
        .eq('is_active', true),
      getInstanceForAuthorizedNumber(authorizedNumber, supabase)
    ]);

    const allContexts = allContextsResult.data || [];
    const aiContext = allContexts[0] || null;
    instance = instanceResult;

    let connectionId = aiContext?.connection_id || null;
    let datasetId = aiContext?.dataset_id || null;

    // Salvar mensagem incoming
    await supabase.from('whatsapp_messages').insert({
      company_group_id: authorizedNumber.company_group_id,
      phone_number: phone,
      message_content: messageText,
      direction: 'incoming',
      sender_name: authorizedNumber.name || phone,
      external_id: externalId || null,
      instance_id: authorizedNumber.instance_id || null,
      authorized_number_id: authorizedNumber.id
    });

    if (!instance) {
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    // ... (resto do processamento: comandos, histórico, Claude, etc.)
    
    // Enviar resposta
    const sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
    
    // Salvar mensagem outgoing
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
    }

    return NextResponse.json({ 
      status: 'success', 
      sent,
      time_ms: Date.now() - startTime
    });

  } catch (error: any) {
    console.error('[Webhook] ❌ ERRO GERAL:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Verificação do webhook
export async function GET(request: Request) {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook WhatsApp ativo',
    timestamp: new Date().toISOString()
  });
}
```

### 8.2 API de Números Autorizados - `app/api/whatsapp/authorized-numbers/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar números autorizados
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar números com datasets vinculados
    let query = supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_number_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .order('name', { ascending: true });

    // Filtrar por grupo
    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data: numbers, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ numbers: numbers || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar número autorizado
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { phone_number, name, instance_id, can_receive_alerts, can_use_chat, company_group_id, datasets } = body;

    if (!phone_number || !name) {
      return NextResponse.json({ error: 'Telefone e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Normalizar número (remover caracteres não numéricos)
    const normalizedPhone = phone_number.replace(/\D/g, '');

    // Criar número autorizado
    const { data: newNumber, error: insertError } = await supabase
      .from('whatsapp_authorized_numbers')
      .insert({
        phone_number: normalizedPhone,
        name,
        instance_id: instance_id || null,
        can_receive_alerts: can_receive_alerts ?? true,
        can_use_chat: can_use_chat ?? true,
        company_group_id,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Vincular datasets
    if (datasets && Array.isArray(datasets) && datasets.length > 0) {
      const datasetInserts = datasets.map((ds: any) => ({
        authorized_number_id: newNumber.id,
        connection_id: ds.connection_id,
        dataset_id: ds.dataset_id,
        dataset_name: ds.dataset_name
      }));

      await supabase
        .from('whatsapp_number_datasets')
        .insert(datasetInserts);
    }

    return NextResponse.json({ number: newNumber });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar número autorizado
export async function PUT(request: Request) {
  // ... (implementação similar ao POST)
}

// DELETE - Remover número autorizado
export async function DELETE(request: Request) {
  // ... (implementação)
}
```

### 8.3 API de Instâncias - `app/api/whatsapp/instances/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar instâncias
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar instâncias
    let query = supabase
      .from('whatsapp_instances')
      .select('*')
      .order('name', { ascending: true });

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data: instances, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verificar status de conexão com Evolution API
    const instancesWithStatus = await Promise.all(
      (instances || []).map(async (instance: any) => {
        try {
          const statusUrl = `${instance.api_url}/instance/connectionState/${instance.instance_name}`;
          const response = await fetch(statusUrl, {
            headers: { 'apikey': instance.api_key }
          });

          if (response.ok) {
            const status = await response.json();
            return {
              ...instance,
              is_connected: status.state === 'open',
              connection_state: status.state
            };
          }
        } catch (e) {
          // Ignorar erro
        }

        return {
          ...instance,
          is_connected: false,
          connection_state: 'unknown'
        };
      })
    );

    return NextResponse.json({ instances: instancesWithStatus });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar instância
export async function POST(request: Request) {
  // ... (implementação)
}
```

### 8.4 Processamento de Fila - `app/api/whatsapp/webhook/process-queue/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  getInstanceForAuthorizedNumber, 
  sendWhatsAppMessage, 
  sendWhatsAppAudio,
  generateAudio,
  executeDaxQuery, 
  identifyQuestionIntent, 
  getWorkingQueries, 
  saveQueryResult 
} from '../route';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  
  try {
    // Buscar mensagens pendentes
    const now = new Date().toISOString();
    const { data: pendingMessages } = await supabase
      .from('whatsapp_message_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(10);
    
    const validMessages = pendingMessages?.filter(msg => 
      msg.attempt_count < msg.max_attempts
    ) || [];
    
    if (validMessages.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nenhuma mensagem pendente' });
    }
    
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    for (const queueItem of validMessages) {
      try {
        // Marcar como processando
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: 'processing',
            attempt_count: queueItem.attempt_count + 1
          })
          .eq('id', queueItem.id);
        
        // Buscar número autorizado e instância
        const { data: authorizedNumber } = await supabase
          .from('whatsapp_authorized_numbers')
          .select('*')
          .eq('phone_number', queueItem.phone_number)
          .eq('company_group_id', queueItem.company_group_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!authorizedNumber) {
          throw new Error('Número autorizado não encontrado');
        }
        
        const instance = await getInstanceForAuthorizedNumber(authorizedNumber, supabase);
        if (!instance) {
          throw new Error('Instância não encontrada');
        }
        
        // Processar mensagem (similar ao webhook principal)
        // ... (código de processamento)
        
        // Marcar como sucesso
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', queueItem.id);
        
        succeeded++;
      } catch (error: any) {
        // Marcar como falha ou pendente para retry
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: queueItem.attempt_count >= queueItem.max_attempts ? 'failed' : 'pending',
            error_message: error.message,
            next_retry_at: new Date(Date.now() + 5000).toISOString()
          })
          .eq('id', queueItem.id);
        
        failed++;
      }
      
      processed++;
    }
    
    return NextResponse.json({ 
      processed, 
      succeeded, 
      failed 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## 9. Estrutura de Dados do Webhook

### 9.1 Formato Recebido da Evolution API

```typescript
// Formato 1: messages.upsert
{
  event: 'messages.upsert',
  data: {
    key: {
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: false,
      id: '3EB0C767F26B8A4A'
    },
    message: {
      conversation: 'Qual o faturamento?',
      // ou
      extendedTextMessage: { text: '...' },
      // ou
      audioMessage: { caption: '...', text: '...' }
    },
    messageTimestamp: 1234567890
  }
}

// Formato 2: message (alternativo)
{
  type: 'message',
  remoteJid: '5511999999999@s.whatsapp.net',
  body: 'Qual o faturamento?',
  fromMe: false
}
```

### 9.2 Formato de Resposta

```typescript
// Sucesso
{
  status: 'success',
  sent: true,
  time_ms: 1234
}

// Ignorado
{
  status: 'ignored',
  reason: 'unauthorized' | 'duplicate' | 'fromMe or empty' | 'not a message event'
}

// Erro
{
  status: 'error',
  reason: 'no instance' | 'temporary_error' | 'permanent_error'
}

// Enfileirado
{
  status: 'queued',
  queue_id: 'uuid',
  reason: 'temporary_error' | 'second_call_error'
}
```

---

## 10. Tabelas do Banco de Dados

### 10.1 `whatsapp_instances`

```sql
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

### 10.2 `whatsapp_authorized_numbers`

```sql
-- (Já mostrado acima na seção 4)
```

### 10.3 `whatsapp_messages`

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  authorized_number_id UUID REFERENCES whatsapp_authorized_numbers(id),
  
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  sender_name TEXT,
  
  external_id TEXT,  -- ID da mensagem do WhatsApp
  archived BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_group ON whatsapp_messages(company_group_id);
CREATE INDEX idx_whatsapp_messages_external_id ON whatsapp_messages(external_id);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
```

### 10.4 `whatsapp_message_queue`

```sql
CREATE TABLE whatsapp_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  message_content TEXT NOT NULL,
  conversation_history JSONB,
  system_prompt TEXT,
  connection_id UUID,
  dataset_id TEXT,
  
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  error_type TEXT CHECK (error_type IN ('temporary', 'permanent')),
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_message_queue_status ON whatsapp_message_queue(status, next_retry_at);
```

---

## 11. Resumo Técnico

| Componente | Tecnologia | Descrição |
|------------|------------|-----------|
| **Webhook** | Next.js API Route | `POST /api/whatsapp/webhook` |
| **Evolution API** | REST API | Envio/recebimento de mensagens |
| **Banco** | Supabase (PostgreSQL) | Armazenamento de mensagens e configurações |
| **IA** | Anthropic Claude | Processamento de perguntas |
| **TTS** | OpenAI TTS | Geração de áudio |
| **Identificação** | `whatsapp_authorized_numbers` | Vinculação telefone → grupo |
| **Formato Telefone** | Apenas dígitos | `5511999999999` (sem +, sem espaços) |

---

**Última atualização**: 2025-01-24
