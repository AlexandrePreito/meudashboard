# Documentação: WhatsApp - Webhook, Instâncias e Chat

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Sistema de Instâncias](#sistema-de-instancias)
4. [Webhook do WhatsApp](#webhook-do-whatsapp)
5. [Chat com IA via WhatsApp](#chat-com-ia-via-whatsapp)
6. [Números Autorizados](#números-autorizados)
7. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
8. [APIs e Endpoints](#apis-e-endpoints)
9. [Páginas e Interfaces](#páginas-e-interfaces)
10. [Componentes](#componentes)

---

## 🎯 Visão Geral

O sistema de WhatsApp integra:
- **Instâncias WhatsApp**: Conexões com a Evolution API
- **Webhook**: Recebimento e processamento de mensagens
- **Chat com IA**: Respostas automáticas usando Claude (Anthropic)
- **Números Autorizados**: Controle de números que podem receber mensagens
- **Grupos WhatsApp**: Organização de números por grupos

---

## 📁 Estrutura de Arquivos

### APIs (Backend)

```
app/api/whatsapp/
├── webhook/
│   └── route.ts                    # Webhook principal - recebe mensagens do Evolution API
├── instances/
│   ├── route.ts                     # CRUD de instâncias WhatsApp
│   └── [id]/
│       └── route.ts                 # Operações específicas de uma instância
├── authorized-numbers/
│   └── route.ts                     # CRUD de números autorizados
├── groups/
│   └── route.ts                     # CRUD de grupos WhatsApp
├── messages/
│   └── route.ts                     # Listagem e busca de mensagens
└── usage/
    └── route.ts                     # Estatísticas de uso
```

### Páginas (Frontend)

```
app/whatsapp/
├── page.tsx                         # Dashboard principal do WhatsApp
├── instancias/
│   └── page.tsx                     # Gerenciamento de instâncias
├── numeros/
│   └── page.tsx                     # Gerenciamento de números autorizados
├── grupos/
│   └── page.tsx                     # Gerenciamento de grupos WhatsApp
├── mensagens/
│   └── page.tsx                     # Visualização de mensagens
└── webhook/
    └── page.tsx                     # Configuração e logs do webhook
```

### Componentes

```
src/components/whatsapp/
├── DatasetSelector.tsx              # Seletor de datasets Power BI
└── MessageEditor.tsx                # Editor de mensagens
```

---

## 🔌 Sistema de Instâncias

### Arquivo Principal
**`app/api/whatsapp/instances/route.ts`**

### Funcionalidades

#### GET - Listar Instâncias
- **Endpoint**: `GET /api/whatsapp/instances?group_id={groupId}`
- **Permissões**: 
  - Master: vê todas as instâncias
  - Developer: vê instâncias dos seus grupos
  - Admin: vê instâncias do grupo administrado
- **Retorna**: Lista de instâncias com grupos vinculados

#### POST - Criar Instância
- **Endpoint**: `POST /api/whatsapp/instances`
- **Body**:
  ```json
  {
    "name": "Nome da Instância",
    "api_url": "https://api.evolution.com",
    "api_key": "chave-api",
    "instance_name": "nome-instancia",
    "group_ids": ["uuid1", "uuid2"]
  }
  ```
- **Validações**:
  - ✅ Verifica se já existe instância com o mesmo `instance_name`
  - ✅ Testa conexão com Evolution API
  - ✅ Valida permissões do usuário
- **Ações**:
  - Verifica status de conexão
  - Obtém número de telefone
  - Cria registro no banco
  - Vincula grupos automaticamente

#### PUT - Atualizar Instância
- **Endpoint**: `PUT /api/whatsapp/instances`
- **Body**: Mesmos campos do POST (parciais permitidos)
- **Permissões**: Master, Developer (seus grupos), Admin (grupo administrado)

#### DELETE - Excluir Instância
- **Endpoint**: `DELETE /api/whatsapp/instances?id={id}`
- **Validações**: 
  - Admin/Developer só pode excluir se instância está vinculada exclusivamente ao seu grupo

### Estrutura de Dados

**Tabela: `whatsapp_instances`**
```typescript
{
  id: string;
  name: string;                    // Nome amigável
  api_url: string;                 // URL da Evolution API
  api_key: string;                 // Chave de API
  instance_name: string;           // Nome da instância na Evolution
  phone_number: string | null;     // Número vinculado
  is_connected: boolean;           // Status de conexão
  last_connected_at: string | null;
  created_by: string;              // ID do usuário criador
  created_at: string;
  updated_at: string;
}
```

**Tabela: `whatsapp_instance_groups`** (Relacionamento)
```typescript
{
  instance_id: string;
  company_group_id: string;
  created_by: string;
}
```

---

## 📨 Webhook do WhatsApp

### Arquivo Principal
**`app/api/whatsapp/webhook/route.ts`**

### Funcionalidade

O webhook é o ponto de entrada para todas as mensagens recebidas via WhatsApp. Ele:
1. Recebe mensagens do Evolution API
2. Valida e processa mensagens
3. Integra com IA para gerar respostas
4. Executa consultas DAX quando necessário
5. Envia respostas via Evolution API

### Endpoint
- **URL**: `POST /api/whatsapp/webhook`
- **Método**: POST
- **Autenticação**: Via Evolution API (webhook configurado)

### Fluxo de Processamento

```
1. Recebe mensagem do Evolution API
   ↓
2. Valida número autorizado
   ↓
3. Verifica duplicidade (external_id)
   ↓
4. Busca instância vinculada ao número
   ↓
5. Processa mensagem:
   - Texto simples → IA
   - Áudio → Transcreve → IA
   - Comando especial → Ação específica
   ↓
6. Gera resposta com IA (Claude)
   ↓
7. Executa consultas DAX se necessário
   ↓
8. Formata resposta
   ↓
9. Envia resposta via Evolution API
   ↓
10. Salva mensagens no banco
```

### Funções Principais

#### `getInstanceForAuthorizedNumber(authorizedNumber, supabase)`
- Busca instância vinculada ao número autorizado
- Fallback para qualquer instância conectada
- **Localização**: Linha ~300

#### `executeDaxQuery(connectionId, datasetId, query, supabase)`
- Executa consultas DAX no Power BI
- Autentica com Azure AD
- Retorna resultados formatados
- **Localização**: Linha ~15

#### `formatTextForSpeech(text)`
- Formata texto para conversão em áudio
- Remove emojis e caracteres especiais
- Formata valores monetários
- **Localização**: Linha ~75

#### `callClaudeWithRetry(params)`
- Chama API do Claude com retry automático
- Trata erros de rate limit
- **Localização**: Linha ~140

### Validações e Controles

#### Controle de Duplicidade
```typescript
// Verifica se mensagem já foi processada
const { data: existingMessage } = await supabase
  .from('whatsapp_messages')
  .select('id')
  .eq('external_id', externalId)
  .maybeSingle();
```

#### Validação de Número Autorizado
- Busca número na tabela `whatsapp_authorized_numbers`
- Verifica se está ativo
- Limita a 1 dataset por número (`.limit(1)`)

#### Limites e Quotas
- Verifica `max_chat_messages_per_day` do desenvolvedor
- Conta mensagens do dia atual
- Bloqueia se exceder limite

### Comandos Especiais

#### `/limpar`
- Limpa histórico de mensagens do usuário
- Filtra por `company_group_id` do número autorizado

#### Comandos de Dataset (Removidos)
- Sistema simplificado para 1 dataset por número
- Não há mais seleção de múltiplos agentes

### Integração com IA

#### System Prompt
O sistema usa um prompt elaborado que:
- Define o contexto do sistema
- Especifica regras para períodos e datas
- Instrui sobre formatação de respostas
- Define comportamento para consultas de dados

#### Regras de Período
- **Sempre usa mês/ano atual como padrão**
- **Informa o período no início da resposta**
- **Mantém contexto em perguntas de follow-up**

### Salvamento de Mensagens

#### Mensagem Incoming
```typescript
await supabase.from('whatsapp_messages').insert({
  company_group_id: authorizedNumber.company_group_id,
  phone_number: phone,
  message_content: messageText,
  direction: 'incoming',
  sender_name: authorizedNumber.name || phone,
  external_id: messageData?.key?.id || null,
  instance_id: authorizedNumber.instance_id || null,
  authorized_number_id: authorizedNumber.id
});
```

#### Mensagem Outgoing
```typescript
await supabase.from('whatsapp_messages').insert({
  company_group_id: authorizedNumber.company_group_id,
  phone_number: phone,
  message_content: responseText,
  direction: 'outgoing',
  sender_name: 'Sistema',
  instance_id: instance.id,
  authorized_number_id: authorizedNumber.id
});
```

---

## 💬 Chat com IA via WhatsApp

### Funcionalidades

1. **Respostas Automáticas**
   - Processa mensagens de texto
   - Transcreve áudios (OpenAI Whisper)
   - Gera respostas com Claude

2. **Consultas de Dados**
   - Executa consultas DAX no Power BI
   - Formata resultados em texto
   - Inclui contexto de negócio

3. **Respostas em Áudio**
   - Converte texto para áudio (OpenAI TTS)
   - Envia como mensagem de áudio
   - Formata texto para fala natural

4. **Histórico de Conversação**
   - Mantém contexto da conversa
   - Limita histórico (últimas 20 mensagens)
   - Filtra por grupo correto

### Fluxo de Resposta

```
Usuário envia mensagem
   ↓
Webhook recebe
   ↓
Valida e processa
   ↓
Busca contexto do grupo
   ↓
Prepara histórico
   ↓
Chama Claude com:
  - System prompt
  - Histórico
  - Mensagem atual
  - Ferramentas (DAX)
   ↓
Processa resposta
   ↓
Executa ações se necessário
   ↓
Formata resposta
   ↓
Envia via Evolution API
```

### Configuração de Contexto

O sistema busca contexto em:
- `ai_model_contexts`: Contextos configurados por grupo
- Dataset vinculado ao número autorizado
- Histórico de mensagens do grupo

---

## 📱 Números Autorizados

### Arquivo Principal
**`app/api/whatsapp/authorized-numbers/route.ts`**

### Funcionalidades

#### GET - Listar Números
- **Endpoint**: `GET /api/whatsapp/authorized-numbers?group_id={groupId}`
- **Filtros**: Por grupo, por desenvolvedor, por admin
- **Retorna**: Números com datasets vinculados

#### POST - Criar Número
- **Endpoint**: `POST /api/whatsapp/authorized-numbers`
- **Body**:
  ```json
  {
    "phone_number": "+5511999999999",
    "name": "Número Principal",
    "instance_id": "uuid-instance",
    "can_receive_alerts": true,
    "can_use_chat": true,
    "company_group_id": "uuid-group",
    "datasets": [
      {
        "connection_id": "uuid-conn",
        "dataset_id": "uuid-dataset",
        "dataset_name": "Dataset Name"
      }
    ]
  }
  ```
- **Validações**:
  - Número único por grupo
  - Permissões do usuário
  - Dataset deve estar autorizado em relatórios do grupo

#### PUT - Atualizar Número
- **Endpoint**: `PUT /api/whatsapp/authorized-numbers`
- **Permissões**: Master, Developer, Admin (grupo específico)

#### DELETE - Remover Número
- **Endpoint**: `DELETE /api/whatsapp/authorized-numbers?number_id={id}&group_id={groupId}`
- **Validações**: Permissões e vínculo com grupo

### Estrutura de Dados

**Tabela: `whatsapp_authorized_numbers`**
```typescript
{
  id: string;
  phone_number: string;
  name: string;
  instance_id: string;              // Instância vinculada
  company_group_id: string;          // Grupo do número
  can_receive_alerts: boolean;
  can_use_chat: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Tabela: `whatsapp_number_datasets`** (Relacionamento)
```typescript
{
  id: string;
  authorized_number_id: string;
  connection_id: string;
  dataset_id: string;
  dataset_name: string;
}
```

---

## 🔄 Fluxo de Funcionamento

### 1. Configuração Inicial

```
1. Criar Instância WhatsApp
   → app/api/whatsapp/instances (POST)
   → Vincula com Evolution API
   → Obtém número de telefone
   
2. Criar Número Autorizado
   → app/api/whatsapp/authorized-numbers (POST)
   → Vincula número à instância
   → Configura dataset Power BI
   
3. Configurar Webhook na Evolution API
   → URL: https://seu-dominio.com/api/whatsapp/webhook
   → Eventos: messages.upsert
```

### 2. Recebimento de Mensagem

```
Evolution API → Webhook
   ↓
app/api/whatsapp/webhook/route.ts
   ↓
Valida número autorizado
   ↓
Verifica duplicidade
   ↓
Busca instância vinculada
   ↓
Processa mensagem
```

### 3. Processamento e Resposta

```
Mensagem recebida
   ↓
Busca contexto do grupo
   ↓
Prepara histórico
   ↓
Chama IA (Claude)
   ↓
Executa consultas se necessário
   ↓
Formata resposta
   ↓
Envia via Evolution API
   ↓
Salva no banco
```

---

## 🔌 APIs e Endpoints

### Webhook

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/whatsapp/webhook` | Recebe mensagens do Evolution API |

### Instâncias

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/instances?group_id={id}` | Lista instâncias |
| POST | `/api/whatsapp/instances` | Cria instância |
| PUT | `/api/whatsapp/instances` | Atualiza instância |
| DELETE | `/api/whatsapp/instances?id={id}` | Exclui instância |

### Números Autorizados

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/authorized-numbers?group_id={id}` | Lista números |
| POST | `/api/whatsapp/authorized-numbers` | Cria número |
| PUT | `/api/whatsapp/authorized-numbers` | Atualiza número |
| DELETE | `/api/whatsapp/authorized-numbers?number_id={id}&group_id={id}` | Remove número |

### Grupos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/groups?group_id={id}` | Lista grupos |
| POST | `/api/whatsapp/groups` | Cria grupo |
| PUT | `/api/whatsapp/groups` | Atualiza grupo |
| DELETE | `/api/whatsapp/groups?group_id={id}` | Remove grupo |

### Mensagens

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/messages?group_id={id}&phone={phone}` | Lista mensagens |

### Uso

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/whatsapp/usage?group_id={id}` | Estatísticas de uso |

---

## 🖥️ Páginas e Interfaces

### Dashboard Principal
**`app/whatsapp/page.tsx`**

- Visão geral do sistema WhatsApp
- Estatísticas: instâncias, números, grupos, mensagens
- Mensagens recentes
- Informações de uso e quotas

### Gerenciamento de Instâncias
**`app/whatsapp/instancias/page.tsx`**

- Lista de instâncias
- Criar/editar/excluir instâncias
- Status de conexão
- Vincular grupos (Master)

### Números Autorizados
**`app/whatsapp/numeros/page.tsx`**

- Lista de números
- Criar/editar/excluir números
- Configurar datasets
- Ativar/desativar números

### Grupos WhatsApp
**`app/whatsapp/grupos/page.tsx`**

- Lista de grupos
- Criar/editar grupos
- Vincular datasets
- Configurar alertas

### Mensagens
**`app/whatsapp/mensagens/page.tsx`**

- Histórico de mensagens
- Filtros por número, data, direção
- Visualização detalhada

### Webhook
**`app/whatsapp/webhook/page.tsx`**

- Configuração do webhook
- Logs de eventos
- Testes de conexão

---

## 🧩 Componentes

### DatasetSelector
**`src/components/whatsapp/DatasetSelector.tsx`**

- Seletor de datasets Power BI
- Filtra apenas datasets usados em relatórios do grupo
- Exibe nomes amigáveis

### MessageEditor
**`src/components/whatsapp/MessageEditor.tsx`**

- Editor de mensagens
- Formatação de texto
- Preview de mensagem

---

## 🔐 Permissões e Acesso

### Master
- ✅ Acesso total
- ✅ Ver todas as instâncias
- ✅ Criar/editar/excluir qualquer instância
- ✅ Vincular grupos a instâncias

### Developer
- ✅ Ver instâncias dos seus grupos
- ✅ Criar instâncias (vincula aos seus grupos)
- ✅ Editar instâncias dos seus grupos
- ✅ Excluir apenas se vinculada exclusivamente aos seus grupos

### Admin
- ✅ Ver instâncias do grupo administrado
- ✅ Criar números autorizados
- ✅ Gerenciar números do grupo
- ❌ Não pode criar/editar instâncias

### User (Visualizador)
- ✅ Ver dashboard
- ✅ Ver mensagens do grupo
- ❌ Não pode criar/editar nada

---

## 📊 Tabelas do Banco de Dados

### `whatsapp_instances`
Armazena instâncias do Evolution API

### `whatsapp_instance_groups`
Relaciona instâncias com grupos de empresas

### `whatsapp_authorized_numbers`
Números autorizados para receber mensagens

### `whatsapp_number_datasets`
Datasets Power BI vinculados a números

### `whatsapp_messages`
Histórico de todas as mensagens

### `whatsapp_user_selections`
Seleções de usuários (depreciado - sistema simplificado)

### `whatsapp_authorized_groups`
Grupos WhatsApp autorizados (legado)

### `whatsapp_group_datasets`
Datasets vinculados a grupos (legado)

---

## 🔧 Variáveis de Ambiente

```env
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (Whisper + TTS)
OPENAI_API_KEY=sk-...

# Evolution API (configurado por instância)
# api_url e api_key armazenados no banco
```

---

## 🚀 Fluxo de Deploy

1. **Configurar Evolution API**
   - Instalar e configurar Evolution API
   - Criar instância
   - Obter API URL e Key

2. **Configurar Webhook**
   - URL: `https://seu-dominio.com/api/whatsapp/webhook`
   - Evento: `messages.upsert`

3. **Criar Instância no Sistema**
   - Acessar `/whatsapp/instancias`
   - Criar nova instância
   - Informar API URL, Key e Instance Name

4. **Autorizar Número**
   - Acessar `/whatsapp/numeros`
   - Criar número autorizado
   - Vincular dataset Power BI

5. **Testar**
   - Enviar mensagem para o número
   - Verificar resposta automática

---

## 📝 Notas Importantes

### Simplificações Recentes

1. **1 Dataset por Número**
   - Sistema simplificado para 1 dataset por número autorizado
   - Removida lógica de seleção múltipla de agentes
   - Removido comando `/trocar`

2. **Instância por Número**
   - Cada número autorizado tem `instance_id` vinculado
   - Webhook busca instância pelo número, não pelo nome do webhook

3. **Controle de Duplicidade**
   - Usa `external_id` da Evolution API
   - Salva mensagem incoming imediatamente após validação

4. **Contexto por Grupo**
   - Histórico filtrado por `company_group_id`
   - Contexto busca dados do grupo correto

### Validações Implementadas

- ✅ Duplicidade de instâncias (mesmo `instance_name`)
- ✅ Duplicidade de mensagens (`external_id`)
- ✅ Permissões por role
- ✅ Limites de quotas
- ✅ Validação de datasets (apenas os usados em relatórios)

---

## 🔍 Troubleshooting

### Mensagens não chegam
1. Verificar webhook configurado na Evolution API
2. Verificar se instância está conectada
3. Verificar logs do webhook

### Respostas não são enviadas
1. Verificar API key da Evolution API
2. Verificar se instância está conectada
3. Verificar quotas de mensagens

### IA não responde
1. Verificar `ANTHROPIC_API_KEY`
2. Verificar limites de mensagens do desenvolvedor
3. Verificar logs do webhook

### Dataset não encontrado
1. Verificar se dataset está autorizado em relatórios do grupo
2. Verificar vínculo número-dataset
3. Verificar conexão Power BI

---

## 📚 Referências

- [Documentação Evolution API](https://doc.evolution-api.com/)
- [Documentação Anthropic Claude](https://docs.anthropic.com/)
- [Documentação OpenAI](https://platform.openai.com/docs/)
- [Documentação Power BI REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/)

---

**Última atualização**: 2024
**Versão do Sistema**: 1.0
