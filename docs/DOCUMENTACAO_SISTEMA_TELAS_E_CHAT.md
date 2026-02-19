# Documentação do Sistema – Telas, Caminhos e Chat (IA + WhatsApp)

## Índice

1. [Visão geral](#1-visão-geral)
2. [Estrutura de pastas e localização de arquivos](#2-estrutura-de-pastas-e-localização-de-arquivos)
3. [Rotas das telas (frontend)](#3-rotas-das-telas-frontend)
4. [Chat IA no sistema (interno)](#4-chat-ia-no-sistema-interno)
5. [Chat WhatsApp (Evolution API + IA)](#5-chat-whatsapp-evolution-api--ia)
6. [APIs relacionadas ao chat e à IA](#6-apis-relacionadas-ao-chat-e-à-ia)
7. [Fluxo resumido: onde cada chat é usado](#7-fluxo-resumido-onde-cada-chat-é-usado)

---

## 1. Visão geral

O sistema oferece **dois canais de conversa com IA**:

| Canal | Onde aparece | Autenticação | Contexto de dados |
|-------|--------------|--------------|--------------------|
| **Chat interno (IA)** | Dentro do dashboard, na tela do Power BI (`/tela/[id]`) | Usuário logado (JWT/sessão) | Relatório/dataset da tela atual |
| **WhatsApp** | Mensagens enviadas/recebidas no WhatsApp | Número autorizado + instância Evolution API | Dataset configurado por número/instância |

Ambos usam **Claude (Anthropic)** para interpretar perguntas, **DAX** para consultar o Power BI quando aplicável, e compartilham lógica de **contexto do modelo** (medidas, tabelas, exemplos) e **treinamento** (exemplos, pendentes, aprendizado).

---

## 2. Estrutura de pastas e localização de arquivos

O alias `@/*` no projeto aponta para `./src/*` (definido em `tsconfig.json`).

### 2.1 Frontend (páginas e componentes)

```
app/
├── layout.tsx                    # Layout raiz
├── page.tsx                      # Página inicial (landing)
├── login/page.tsx                # Login
├── dashboard/page.tsx            # Dashboard (redireciona para primeira tela do usuário)
├── tela/[id]/page.tsx            # Tela do Power BI + CHAT IA (painel lateral)
├── trocar-senha/page.tsx         # Troca de senha
│
├── assistente-ia/                # Módulo Assistente IA (treino, pendentes, contexto)
│   ├── page.tsx                  # Redireciona para /assistente-ia/evolucao
│   ├── evolucao/page.tsx         # Estatísticas de uso da IA
│   ├── pendentes/page.tsx        # Perguntas não respondidas (para treinar)
│   ├── treinar/
│   │   ├── page.tsx              # Lista de exemplos de treinamento
│   │   ├── novo/page.tsx         # Criar novo exemplo (DAX, pergunta, resposta)
│   │   └── [id]/page.tsx        # Editar exemplo
│   ├── contextos/page.tsx       # Importar/atualizar contexto (chat + DAX)
│   └── modelo/page.tsx          # Redireciona para contextos
│
├── whatsapp/                     # Módulo WhatsApp
│   ├── page.tsx                  # Dashboard WhatsApp
│   ├── instancias/page.tsx       # Instâncias Evolution API
│   ├── numeros/page.tsx         # Números autorizados (por grupo)
│   ├── grupos/page.tsx          # Grupos autorizados
│   ├── mensagens/page.tsx       # Histórico de mensagens
│   └── webhook/page.tsx         # Configuração/URL do webhook
│
├── alertas/                      # Alertas (podem notificar via WhatsApp)
│   ├── page.tsx
│   ├── novo/page.tsx
│   └── historico/page.tsx
│
├── powerbi/                      # Configuração Power BI
│   ├── page.tsx
│   ├── conexoes/page.tsx
│   ├── relatorios/page.tsx
│   ├── telas/page.tsx
│   └── ordem-atualizacao/page.tsx
│
├── dev/                          # Área do desenvolvedor
│   ├── page.tsx
│   ├── groups/[id]/page.tsx
│   ├── usuarios/page.tsx         # Ordem de telas por usuário
│   ├── quotas/page.tsx
│   ├── perfil/page.tsx
│   └── ...
│
├── admin/                        # Área master
├── administrador/                # Área administrador de grupo
├── configuracoes/                # Usuários, grupos, planos, logs
└── ...
```

### 2.2 Componentes relacionados ao chat e à IA

```
src/components/
├── layout/
│   ├── MainLayout.tsx            # Layout principal (header + sidebar + conteúdo)
│   ├── Header.tsx
│   └── Sidebar.tsx               # Menu: Power BI, WhatsApp, Assistente IA, Telas
├── assistente-ia/
│   ├── PermissionGuard.tsx        # Controle de acesso ao módulo IA
│   ├── QuestionCard.tsx          # Card de pergunta (pendentes)
│   ├── StatsCard.tsx
│   ├── TestArea.tsx
│   └── TrainingFieldSelector.tsx # Seletor de campos no treinamento
├── whatsapp/
│   ├── DatasetSelector.tsx       # Seletor de dataset (WhatsApp)
│   └── MessageEditor.tsx         # Editor de mensagens (alertas)
└── PasswordChangeModal.tsx       # Modal troca de senha obrigatória
```

### 2.3 APIs (backend)

```
app/api/
├── ai/
│   ├── chat/route.ts             # POST – Chat IA do sistema (tela Power BI)
│   ├── context/parse/route.ts
│   ├── context/upload/route.ts
│   ├── contexts/route.ts
│   ├── feedback/route.ts
│   ├── generate-dax/route.ts
│   └── usage/route.ts
│
├── assistente-ia/                 # Treinamento, contexto, execução DAX
│   ├── context/route.ts          # GET/POST – Contexto do modelo (por dataset/grupo)
│   ├── datasets/route.ts         # Datasets disponíveis por grupo
│   ├── model-metadata/route.ts   # Metadados do modelo (medidas, etc.) para IA
│   ├── model-structure/route.ts
│   ├── execute-dax/route.ts      # Executar DAX (treinamento/teste)
│   ├── pending/route.ts         # GET/PATCH/DELETE – Perguntas pendentes
│   ├── training/route.ts        # CRUD exemplos de treinamento
│   ├── training/test/route.ts
│   ├── questions/route.ts
│   └── stats/route.ts
│
├── whatsapp/
│   ├── webhook/route.ts          # POST – Recebe mensagens da Evolution API (CHAT WHATSAPP)
│   ├── authorized-numbers/route.ts
│   ├── instances/route.ts
│   ├── instances/[id]/route.ts
│   ├── groups/route.ts
│   ├── messages/route.ts
│   └── webhook/
│       ├── chats-update/route.ts
│       ├── contacts-update/route.ts
│       ├── messages-upsert/route.ts
│       └── process-queue/route.ts
│
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── me/route.ts               # Dados do usuário logado (incl. needsPasswordChange)
│   └── change-password/route.ts
│
├── powerbi/
│   ├── embed/route.ts            # Token de embed (telas)
│   ├── screens/route.ts
│   ├── screens/[id]/route.ts
│   └── ...
│
└── user/
    └── first-screen/route.ts     # Primeira tela do usuário (ordem personalizada)
```

### 2.4 Bibliotecas compartilhadas (IA, prompts, WhatsApp)

```
src/lib/
├── auth.ts                       # getAuthUser, etc.
├── prompts/
│   └── system-prompt.ts          # generateSystemPrompt, generateWhatsAppPrompt
├── query-learning.ts            # getQueryContext, findTrainingExamples, saveQueryLearning
├── whatsapp-session.ts          # resolveSession, generateFooter (WhatsApp)
├── assistente-ia/
│   └── documentation-parser.ts  # parseDocumentation, generateOptimizedContext
├── ai/
│   └── prompt-helpers.ts
├── supabase/
│   ├── server.ts                 # createClient (server)
│   └── admin.ts                  # createAdminClient
└── supabase.ts
```

Existe também `lib/assistente-ia/documentation-parser.ts` na raiz; o código ativo usa o de `src/lib/` via `@/lib/...`.

### 2.5 Middleware e rotas públicas

- **middleware.ts** (raiz): protege rotas; libera sem auth, entre outras:
  - `/api/whatsapp/webhook`
  - `/api/whatsapp/webhook/messages-upsert`
  - `/api/whatsapp/webhook/contacts-update`
  - `/api/whatsapp/webhook/chats-update`

---

## 3. Rotas das telas (frontend)

| Rota | Descrição | Quem acessa |
|------|------------|-------------|
| `/` | Landing | Público |
| `/login` | Login | Público |
| `/dashboard` | Entrada pós-login; redireciona para primeira tela | Logado |
| `/tela/[id]` | Tela Power BI + **chat IA** no painel lateral | Logado (com permissão na tela) |
| `/trocar-senha` | Troca de senha | Logado |
| `/assistente-ia/evolucao` | Evolução/estatísticas da IA | Master, Developer, Admin (conforme PermissionGuard) |
| `/assistente-ia/pendentes` | Perguntas não respondidas (treinar) | Idem |
| `/assistente-ia/treinar` | Lista de exemplos de treinamento | Idem |
| `/assistente-ia/treinar/novo` | Novo exemplo (pergunta, DAX, resposta) | Idem |
| `/assistente-ia/treinar/[id]` | Editar exemplo | Idem |
| `/assistente-ia/contextos` | Contexto do modelo (chat + DAX) | Idem |
| `/assistente-ia/modelo` | Redireciona para contextos | Idem |
| `/whatsapp` | Dashboard WhatsApp | Conforme permissão WhatsApp |
| `/whatsapp/instancias` | Instâncias Evolution API | Idem |
| `/whatsapp/numeros` | Números autorizados | Idem |
| `/whatsapp/grupos` | Grupos autorizados | Idem |
| `/whatsapp/mensagens` | Histórico de mensagens | Idem |
| `/whatsapp/webhook` | Página de configuração do webhook | Idem |
| `/alertas` | Alertas | Conforme permissão alertas |
| `/alertas/novo` | Novo alerta | Idem |
| `/alertas/historico` | Histórico de alertas | Idem |
| `/powerbi` | Dashboard Power BI | Conforme perfil |
| `/powerbi/conexoes` | Conexões Power BI | Idem |
| `/powerbi/relatorios` | Relatórios | Idem |
| `/powerbi/telas` | Telas de dashboard | Idem |
| `/powerbi/ordem-atualizacao` | Ordem de atualização | Idem |
| `/dev` | Área desenvolvedor | Developer |
| `/dev/usuarios` | Usuários e **ordem de telas** | Idem |
| `/dev/groups/[id]` | Grupo (quotas, etc.) | Idem |
| `/configuracoes/*` | Usuários, grupos, planos, logs | Master/Admin conforme item |

A primeira tela após o login é definida por **ordem personalizada** em `/dev/usuarios` e resolvida pela API **`/api/user/first-screen`** (usada por `/dashboard` e por `/tela/[id]` em caso de redirecionamento).

---

## 4. Chat IA no sistema (interno)

### 4.1 Onde fica

- **Tela:** `app/tela/[id]/page.tsx`
- **API:** `app/api/ai/chat/route.ts` (POST)
- **Rota do usuário:** acessar uma tela, ex.: `/tela/3946f83e-8402-4ef1-a768-3c935a6cabef`

O chat aparece como **painel lateral** na mesma página da tela (`/tela/[id]`). O usuário envia mensagens no campo de texto; a resposta é exibida no histórico do chat e pode incluir sugestões de perguntas.

### 4.2 Fluxo do chat interno

1. **Frontend** (`app/tela/[id]/page.tsx`):
   - Estado: `messages`, `conversationId`, `chatOpen`, `sending`, `processingStatus`.
   - Ao enviar: `POST /api/ai/chat` com `{ message, conversation_id, screen_id }`.
   - `screen_id` = `id` da rota (UUID da tela).
   - Resposta: `{ message, conversation_id }`. O texto pode conter bloco `[SUGESTOES]...[/SUGESTOES]`, parseado em `extractSuggestions`.
   - Ações: exportar chat (txt), limpar histórico (local + nova conversa).

2. **Backend** (`app/api/ai/chat/route.ts`):
   - Autenticação: `getAuthUser()` (cookie/JWT). Sem usuário → 401.
   - Obtém `screen_id` do body, busca em `powerbi_dashboard_screens` o relatório (e assim `connection_id`, `dataset_id`).
   - Contexto do modelo: `getModelContext(supabase, connectionId, message)` em `ai_model_contexts` (por `connection_id`; otimizado por pergunta se houver seções).
   - Grupo: `user_group_membership` ou conexão; valida limite diário do developer (`max_chat_messages_per_day`) e do plano (`max_ai_questions_per_day`).
   - Conversa: cria ou reutiliza `ai_conversations` (company_group_id, user_id, screen_id). Histórico em `ai_messages` (últimas 20).
   - Se houver `connection_id` e `dataset_id`, define tool `execute_dax` para o Claude. Claude pode chamar a tool; a API executa DAX via Power BI e devolve o resultado. Resultados bem-sucedidos são salvos em `ai_query_learning`.
   - System prompt: período padrão (mês atual), formato de resposta, contexto do modelo, sugestões obrigatórias.
   - Resposta final: texto extraído do Claude; mensagens salvas em `ai_messages`; contador em `ai_usage`; retorno JSON com `message` e `conversation_id`.

### 4.3 Arquivos envolvidos no chat interno

| Arquivo | Função |
|---------|--------|
| `app/tela/[id]/page.tsx` | UI do chat, chamada a `/api/ai/chat`, sugestões, exportar/limpar |
| `app/api/ai/chat/route.ts` | Autenticação, tela/relatório, contexto, limites, Claude, DAX, histórico |
| `src/lib/assistente-ia/documentation-parser.ts` | Usado pela API para contexto otimizado (generateOptimizedContext) |
| Tabelas: `ai_conversations`, `ai_messages`, `ai_usage`, `ai_model_contexts`, `ai_query_learning`, `powerbi_dashboard_screens`, `powerbi_reports` |

---

## 5. Chat WhatsApp (Evolution API + IA)

### 5.1 Onde fica

- **Webhook (entrada de mensagens):** `app/api/whatsapp/webhook/route.ts` — **POST** recebido pela Evolution API.
- **URL do webhook:** configurada na Evolution API; no código aparece como `${baseUrl}/api/whatsapp/webhook` (ex.: `https://www.meudashboard.org/api/whatsapp/webhook`).
- **Telas de configuração:** `/whatsapp`, `/whatsapp/instancias`, `/whatsapp/numeros`, `/whatsapp/mensagens`, `/whatsapp/webhook`.

O “chat” WhatsApp é a conversa que o usuário faz pelo celular com um número vinculado a uma instância; o sistema responde com IA (e opcionalmente áudio).

### 5.2 Fluxo do chat WhatsApp

1. **Entrada**
   - Evolution API envia evento de mensagem recebida para `POST /api/whatsapp/webhook`.
   - Middleware deixa essa rota sem autenticação.

2. **Webhook** (`app/api/whatsapp/webhook/route.ts`):
   - Identifica a instância e o número; valida se o número está autorizado (`whatsapp_authorized_numbers`).
   - Se for áudio: baixa mídia (`downloadWhatsAppAudio`), transcreve com **OpenAI Whisper** (`transcribeAudio`), e usa o texto transcrito como mensagem.
   - Ignora mensagens enviadas pelo próprio sistema ou mensagens vazias que não são áudio.
   - Resolve sessão: `resolveSession()` (`src/lib/whatsapp-session.ts`) — dataset ativo, `company_group_id`, conexão.
   - Salva mensagem recebida em `whatsapp_messages` e envia indicador “digitando” (`sendTypingIndicator`).

3. **IA e DAX**
   - Monta contexto: `ai_model_contexts` por `dataset_id` + `company_group_id` (não por `connection_id`); exemplos de treinamento via `getQueryContext` / `findTrainingExamples` (`src/lib/query-learning.ts`).
   - System prompt: `generateWhatsAppPrompt` (`src/lib/prompts/system-prompt.ts`) + instruções adaptativas + exemplos + chain of thought.
   - Chama Claude; se a resposta incluir bloco de código DAX, executa com `executeDaxQuery` (Power BI) e formata o resultado. Pode marcar exemplo usado (`markTrainingExampleUsed`) e salvar em `ai_query_learning` / `saveQueryLearning`.
   - Se a resposta for considerada falha/evasiva (`isFailureResponse`), salva em `ai_pending_questions` (com `company_group_id` vindo de `whatsapp_available_datasets` por dataset + número).

4. **Resposta ao usuário**
   - Formata texto (incl. rodapé sem duplicar: `generateFooter` em `src/lib/whatsapp-session.ts`).
   - Se a sessão permitir e o usuário tiver pedido áudio antes, pode enviar áudio (TTS OpenAI `tts-1-hd`) e depois o rodapé em texto.
   - Envia mensagem (e opcionalmente áudio) pela Evolution API; grava em `whatsapp_messages`.

### 5.3 Arquivos envolvidos no chat WhatsApp

| Arquivo | Função |
|---------|--------|
| `app/api/whatsapp/webhook/route.ts` | Receber mensagens, áudio, sessão, IA, DAX, pendentes, envio de resposta/áudio |
| `src/lib/whatsapp-session.ts` | resolveSession, generateFooter |
| `src/lib/prompts/system-prompt.ts` | generateWhatsAppPrompt, instruções adaptativas |
| `src/lib/query-learning.ts` | getQueryContext, findTrainingExamples, formatQueryContextForPrompt, saveQueryLearning, markTrainingExampleUsed |
| `src/lib/assistente-ia/documentation-parser.ts` | parseDocumentation, generateOptimizedContext (usado no contexto do modelo) |
| Telas: `app/whatsapp/*.tsx`, `app/whatsapp/webhook/page.tsx` | Configuração de instâncias, números, mensagens, URL do webhook |

---

## 6. APIs relacionadas ao chat e à IA

| Método | Rota | Uso |
|--------|------|-----|
| POST | `/api/ai/chat` | Chat interno (tela Power BI). Body: `{ message, conversation_id?, screen_id }`. Requer auth. |
| GET  | `/api/ai/usage/*` | Uso da IA (dashboard, limites). |
| GET  | `/api/assistente-ia/datasets` | Lista datasets por grupo (`group_id`). Usado em treinar/novo, contextos. |
| GET  | `/api/assistente-ia/model-metadata` | Metadados do modelo (medidas, etc.) por `dataset_id` e `group_id`. Usado no treinamento e no webhook. |
| POST | `/api/assistente-ia/execute-dax` | Executar DAX (treinamento/teste). |
| GET/POST | `/api/assistente-ia/context` | Contexto do modelo (chat/DAX). |
| GET/PATCH/DELETE | `/api/assistente-ia/pending` | Pendentes (perguntas não respondidas). Filtro por `group_id`. |
| GET/POST/PUT/DELETE | `/api/assistente-ia/training` | CRUD exemplos de treinamento. |
| POST | `/api/whatsapp/webhook` | Webhook Evolution API (mensagens WhatsApp). Sem auth. |
| GET  | `/api/whatsapp/webhook` | Verificação do webhook (ex.: status ok). |
| GET  | `/api/whatsapp/authorized-numbers` | Números autorizados (opcional `group_id`). |
| GET  | `/api/whatsapp/instances` | Instâncias WhatsApp. |
| GET  | `/api/whatsapp/messages` | Histórico de mensagens. |

---

## 7. Fluxo resumido: onde cada chat é usado

- **Chat IA (sistema)**  
  - Acesso: usuário logado abre uma tela em **`/tela/[id]`**.  
  - Envio: frontend em `app/tela/[id]/page.tsx` → **POST /api/ai/chat** com `screen_id` e `message`.  
  - Backend: `app/api/ai/chat/route.ts` (contexto por tela/relatório, DAX quando há conexão/dataset, histórico em `ai_conversations` / `ai_messages`).

- **Chat WhatsApp**  
  - Acesso: usuário envia mensagem no WhatsApp para o número conectado à Evolution API.  
  - Entrada: Evolution API chama **POST /api/whatsapp/webhook**.  
  - Backend: `app/api/whatsapp/webhook/route.ts` (sessão por número, contexto por dataset/grupo, exemplos e pendentes, resposta por texto e/ou áudio).

Ambos usam o mesmo ecossistema de IA (Claude, DAX, contexto do modelo, treinamento e pendentes), com diferença de canal (navegador vs WhatsApp) e de autenticação (sessão web vs número autorizado + instância).

---

*Documento gerado para o projeto MeuDashboard – telas, caminhos e chat (IA interno + WhatsApp).*
