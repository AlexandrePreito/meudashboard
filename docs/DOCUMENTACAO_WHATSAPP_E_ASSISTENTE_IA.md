# Documentação Completa – Menu WhatsApp e Assistente IA

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Menu WhatsApp](#2-menu-whatsapp)
3. [Assistente IA](#3-assistente-ia)
4. [Integrações e Fluxos](#4-integrações-e-fluxos)
5. [Segurança e Permissões](#5-segurança-e-permissões)

---

## 1. Visão Geral

O sistema integra **WhatsApp** (Evolution API) com um **Assistente de IA** (Claude + Power BI/DAX). O menu WhatsApp gerencia instâncias, números e grupos; o Assistente IA configura contextos, treina exemplos e processa perguntas. Ambos compartilham a infraestrutura de IA e banco de dados.

---

## 2. Menu WhatsApp

### 2.1 Estrutura de Telas e Rotas

| Rota | URL | Descrição | Arquivo |
|------|-----|-----------|---------|
| Dashboard | `/whatsapp` | Visão geral, estatísticas | `app/whatsapp/page.tsx` |
| Instâncias | `/whatsapp/instancias` | CRUD de instâncias Evolution API | `app/whatsapp/instancias/page.tsx` |
| Números | `/whatsapp/numeros` | Números autorizados por grupo | `app/whatsapp/numeros/page.tsx` |
| Grupos | `/whatsapp/grupos` | Grupos autorizados | `app/whatsapp/grupos/page.tsx` |
| Mensagens | `/whatsapp/mensagens` | Histórico de mensagens | `app/whatsapp/mensagens/page.tsx` |
| Webhook | `/whatsapp/webhook` | Configuração e URL do webhook | `app/whatsapp/webhook/page.tsx` |

### 2.2 APIs do WhatsApp

| Endpoint | Método | Descrição | Arquivo |
|----------|--------|-----------|---------|
| `/api/whatsapp/instances` | GET, POST | Listar e criar instâncias | `app/api/whatsapp/instances/route.ts` |
| `/api/whatsapp/instances/[id]` | GET, DELETE | Obter status, QR code, logout | `app/api/whatsapp/instances/[id]/route.ts` |
| `/api/whatsapp/authorized-numbers` | GET, POST, PUT, DELETE | CRUD números autorizados | `app/api/whatsapp/authorized-numbers/route.ts` |
| `/api/whatsapp/groups` | GET, POST, PUT, DELETE | CRUD grupos autorizados | `app/api/whatsapp/groups/route.ts` |
| `/api/whatsapp/messages` | GET | Listar mensagens com filtros | `app/api/whatsapp/messages/route.ts` |
| `/api/whatsapp/usage` | GET | Uso mensal de mensagens | `app/api/whatsapp/usage/route.ts` |
| `/api/whatsapp/webhook` | POST, GET | Webhook Evolution API (recebe eventos) | `app/api/whatsapp/webhook/route.ts` |
| `/api/whatsapp/webhook/process-queue` | POST | Processar fila de retry | `app/api/whatsapp/webhook/process-queue/route.ts` |
| `/api/whatsapp/webhook/messages-upsert` | POST | Upsert de mensagens | `app/api/whatsapp/webhook/messages-upsert/route.ts` |
| `/api/whatsapp/webhook/contacts-update` | POST | Atualizar contatos | `app/api/whatsapp/webhook/contacts-update/route.ts` |
| `/api/whatsapp/webhook/chats-update` | POST | Atualizar chats | `app/api/whatsapp/webhook/chats-update/route.ts` |

### 2.3 Tabelas do Banco – WhatsApp

#### `whatsapp_instances`

Instâncias da Evolution API conectadas ao sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| name | TEXT | Nome da instância |
| instance_name | TEXT | Nome na Evolution API |
| api_url | TEXT | URL base da API |
| api_key | TEXT | Chave de autenticação |
| phone_number | TEXT | Número conectado (quando autenticado) |
| is_connected | BOOLEAN | Status de conexão |
| last_connected_at | TIMESTAMPTZ | Última conexão |
| created_at | TIMESTAMPTZ | Data de criação |
| created_by | UUID | Usuário criador |

#### `whatsapp_instance_groups`

Vinculação N:N entre instâncias e grupos de empresas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| instance_id | UUID | Referência a whatsapp_instances |
| company_group_id | UUID | Referência a company_groups |
| created_by | UUID | Usuário |
| created_at | TIMESTAMPTZ | Data |

#### `whatsapp_authorized_numbers`

Números de telefone autorizados a usar o chat e receber alertas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo da empresa |
| instance_id | UUID | Instância vinculada |
| phone_number | TEXT | Número (5511999999999) |
| name | TEXT | Nome do contato |
| can_receive_alerts | BOOLEAN | Recebe alertas |
| can_use_chat | BOOLEAN | Pode usar IA |
| is_active | BOOLEAN | Ativo |
| created_at, updated_at | TIMESTAMPTZ | Auditoria |

#### `whatsapp_number_datasets`

Vincula números autorizados a datasets do Power BI.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| authorized_number_id | UUID | Número autorizado |
| connection_id | UUID | Conexão Power BI |
| dataset_id | TEXT | ID do dataset |
| dataset_name | TEXT | Nome do dataset |
| created_at | TIMESTAMPTZ | Data de criação |

**Nota:** A consulta por `phone_number` e `company_group_id` usa `whatsapp_available_datasets`, que é uma view (ou join) que combina `whatsapp_number_datasets` com `whatsapp_authorized_numbers` para expor: `phone_number`, `dataset_id`, `company_group_id`, `option_number`.

#### `whatsapp_active_sessions`

Sessão ativa do usuário no WhatsApp (dataset selecionado para conversa).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| phone_number | TEXT | Número do usuário |
| authorized_number_id | UUID | Número autorizado |
| connection_id | UUID | Conexão Power BI |
| dataset_id | TEXT | Dataset selecionado |
| expires_at | TIMESTAMPTZ | Expiração da sessão |
| last_activity_at | TIMESTAMPTZ | Última atividade |

#### `whatsapp_authorized_groups`

Grupos do WhatsApp autorizados (para alertas e uso em massa).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo da empresa |
| instance_id | UUID | Instância |
| group_id | TEXT | ID do grupo no WhatsApp |
| group_name | TEXT | Nome do grupo |
| purpose | TEXT | Finalidade |
| can_receive_alerts | BOOLEAN | Recebe alertas |
| is_active | BOOLEAN | Ativo |

#### `whatsapp_messages`

Histórico de mensagens enviadas e recebidas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo |
| instance_id | UUID | Instância |
| phone_number | TEXT | Número ou ID do grupo |
| message_content | TEXT | Conteúdo da mensagem |
| direction | TEXT | incoming / outgoing |
| sender_name | TEXT | Nome do remetente |
| message_type | TEXT | Tipo (text, audio, etc.) |
| archived | BOOLEAN | Arquivada |
| created_at | TIMESTAMPTZ | Data/hora |

#### `whatsapp_message_queue`

Fila de retry para mensagens com erro temporário (ex.: rate limit Claude).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| phone_number | TEXT | Número |
| company_group_id | UUID | Grupo |
| message_content | TEXT | Mensagem original |
| conversation_history | JSONB | Histórico para retry |
| system_prompt | TEXT | Prompt do sistema |
| connection_id | UUID | Conexão Power BI |
| dataset_id | TEXT | Dataset |
| attempt_count | INTEGER | Tentativas |
| max_attempts | INTEGER | Máximo de tentativas |
| next_retry_at | TIMESTAMPTZ | Próximo retry |
| status | TEXT | pending / processing / completed / failed |

### 2.4 Componentes WhatsApp

| Componente | Caminho | Uso |
|------------|---------|-----|
| DatasetSelector | `src/components/whatsapp/DatasetSelector.tsx` | Seleção de datasets por número/grupo |
| MessageEditor | `src/components/whatsapp/MessageEditor.tsx` | Editor de templates (alertas) |

### 2.5 Fluxo de Mensagem WhatsApp

```
1. Usuário envia mensagem no WhatsApp
2. Evolution API chama POST /api/whatsapp/webhook
3. Sistema valida número em whatsapp_authorized_numbers
4. Resolve dataset (whatsapp_active_sessions ou whatsapp_available_datasets)
5. Carrega contexto de ai_model_contexts
6. Carrega exemplos de ai_training_examples
7. Chama Claude com tool execute_dax
8. Executa DAX no Power BI
9. Formata resposta e envia via Evolution API
10. Salva em whatsapp_messages
11. Se falhar (evasiva/erro) → salva em ai_unanswered_questions
```

---

## 3. Assistente IA

### 3.1 Estrutura de Telas e Rotas

| Rota | URL | Descrição | Arquivo |
|------|-----|-----------|---------|
| Dashboard | `/assistente-ia` | Redireciona para evolucao | `app/assistente-ia/page.tsx` |
| Evolução | `/assistente-ia/evolucao` | Estatísticas de desempenho | `app/assistente-ia/evolucao/page.tsx` |
| Contextos | `/assistente-ia/contextos` | Importar doc Chat e base DAX | `app/assistente-ia/contextos/page.tsx` |
| Treinar | `/assistente-ia/treinar` | Lista de exemplos | `app/assistente-ia/treinar/page.tsx` |
| Novo Treinamento | `/assistente-ia/treinar/novo` | Criar exemplo | `app/assistente-ia/treinar/novo/page.tsx` |
| Editar Treinamento | `/assistente-ia/treinar/[id]` | Editar exemplo | `app/assistente-ia/treinar/[id]/page.tsx` |
| Pendentes | `/assistente-ia/pendentes` | Perguntas não respondidas | `app/assistente-ia/pendentes/page.tsx` |
| Treinamento | `/assistente-ia/treinamento` | Visualizar conhecimento | `app/assistente-ia/treinamento/page.tsx` |
| Modelo | `/assistente-ia/modelo` | Redireciona para contextos | `app/assistente-ia/modelo/page.tsx` |

### 3.2 APIs do Assistente IA

| Endpoint | Método | Descrição | Arquivo |
|----------|--------|-----------|---------|
| `/api/assistente-ia/context` | GET, POST, DELETE | CRUD contextos (chat/DAX) | `app/api/assistente-ia/context/route.ts` |
| `/api/assistente-ia/datasets` | GET | Listar datasets do grupo | `app/api/assistente-ia/datasets/route.ts` |
| `/api/assistente-ia/training` | GET, POST, PUT, DELETE | CRUD exemplos de treinamento | `app/api/assistente-ia/training/route.ts` |
| `/api/assistente-ia/training/test` | POST | Testar pergunta e gerar resposta | `app/api/assistente-ia/training/test/route.ts` |
| `/api/assistente-ia/pending` | GET, PATCH, DELETE | Pendentes (ai_unanswered_questions) | `app/api/assistente-ia/pending/route.ts` |
| `/api/assistente-ia/stats` | GET | Estatísticas de evolução | `app/api/assistente-ia/stats/route.ts` |
| `/api/assistente-ia/model-metadata` | GET | Medidas, colunas, queries | `app/api/assistente-ia/model-metadata/route.ts` |
| `/api/assistente-ia/execute-dax` | POST | Executar DAX no Power BI | `app/api/assistente-ia/execute-dax/route.ts` |
| `/api/assistente-ia/questions` | GET | Listar perguntas (legado) | `app/api/assistente-ia/questions/route.ts` |
| `/api/assistente-ia/questions/[id]` | GET, PATCH | Pergunta específica | `app/api/assistente-ia/questions/[id]/route.ts` |
| `/api/assistente-ia/model-structure` | GET | Estrutura do modelo | `app/api/assistente-ia/model-structure/route.ts` |
| `/api/assistente-ia/column-values` | GET | Valores de colunas | `app/api/assistente-ia/column-values/route.ts` |
| `/api/ai/chat` | POST | Chat IA (web e WhatsApp) | `app/api/ai/chat/route.ts` |
| `/api/ai/generate-alert` | POST | Gerar alerta (IA) | `app/api/ai/generate-alert/route.ts` |

### 3.3 Tabelas do Banco – Assistente IA

#### `ai_model_contexts`

Contextos de documentação do modelo (Chat e base DAX).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo |
| connection_id | UUID | Conexão Power BI (opcional) |
| dataset_id | TEXT | Dataset |
| context_type | TEXT | chat / dax |
| context_name | TEXT | Nome do contexto |
| context_content | TEXT | Conteúdo bruto (MD ou JSON) |
| section_base | JSONB | Seção base parseada |
| section_medidas | JSONB | Medidas |
| section_tabelas | JSONB | Tabelas e colunas |
| section_queries | JSONB | Queries pré-configuradas |
| section_exemplos | JSONB | Exemplos |
| is_active | BOOLEAN | Ativo |
| parsed_at | TIMESTAMPTZ | Data do parse |
| created_at, updated_at | TIMESTAMPTZ | Auditoria |

#### `ai_training_examples`

Exemplos de treinamento (pergunta → DAX → resposta).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo |
| connection_id | UUID | Conexão Power BI |
| dataset_id | TEXT | Dataset |
| user_question | TEXT | Pergunta do usuário |
| dax_query | TEXT | Query DAX |
| formatted_response | TEXT | Resposta formatada |
| category | TEXT | Categoria (faturamento, vendas, etc.) |
| tags | TEXT[] | Tags |
| is_validated | BOOLEAN | Validado |
| validation_count | INTEGER | Vezes confirmado |
| last_used_at | TIMESTAMPTZ | Último uso |
| created_by | UUID | Criador |
| created_at, updated_at | TIMESTAMPTZ | Auditoria |

#### `ai_unanswered_questions`

Perguntas não respondidas pela IA (para treinamento).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo |
| connection_id | UUID | Conexão |
| dataset_id | TEXT | Dataset |
| user_question | TEXT | Pergunta |
| phone_number | TEXT | Quem perguntou (chat_web ou número) |
| attempted_dax | TEXT | DAX tentado |
| error_message | TEXT | Mensagem de erro |
| attempt_count | INTEGER | Tentativas |
| user_count | INTEGER | Usuários que perguntaram |
| priority_score | DECIMAL | Prioridade (calculada) |
| status | TEXT | pending / trained / ignored (resolved no schema original) |
| training_example_id | UUID | Exemplo criado após treino |
| first_asked_at | TIMESTAMPTZ | Primeira vez |
| last_asked_at | TIMESTAMPTZ | Última vez |
| created_at | TIMESTAMPTZ | Criação |

#### `ai_assistant_stats`

Estatísticas diárias de uso do assistente.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Chave primária |
| company_group_id | UUID | Grupo |
| stat_date | DATE | Data |
| questions_asked | INTEGER | Perguntas feitas |
| questions_answered | INTEGER | Respondidas |
| questions_failed | INTEGER | Falhas |
| success_rate | DECIMAL | Taxa de sucesso |

#### `ai_conversations` e `ai_messages`

Usadas pelo chat interno (tela Power BI).

| Tabela | Colunas principais |
|--------|---------------------|
| ai_conversations | id, company_group_id, user_id, screen_id, title |
| ai_messages | id, conversation_id, role, content |

#### `ai_usage`

Controle de uso diário por grupo.

| Coluna | Descrição |
|--------|-----------|
| company_group_id | Grupo |
| user_id | Usuário |
| usage_date | Data |
| questions_count | Quantidade de perguntas |

### 3.4 Componentes Assistente IA

| Componente | Caminho | Uso |
|------------|---------|-----|
| PermissionGuard | `src/components/assistente-ia/PermissionGuard.tsx` | Bloqueia viewer/operator |
| QuestionCard | `src/components/assistente-ia/QuestionCard.tsx` | Card de pergunta pendente |
| StatsCard | `src/components/assistente-ia/StatsCard.tsx` | Card de estatísticas |
| TestArea | `src/components/assistente-ia/TestArea.tsx` | Teste de perguntas |
| TrainingFieldSelector | `src/components/assistente-ia/TrainingFieldSelector.tsx` | Seletor de medidas/filtros |

### 3.5 Bibliotecas e Utilitários

| Módulo | Caminho | Função |
|--------|---------|--------|
| Claude Client | `src/lib/ai/claude-client.ts` | Chamadas à API Anthropic |
| DAX Engine | `src/lib/ai/dax-engine.ts` | Execução de queries DAX |
| Learning | `src/lib/ai/learning.ts` | isFailureResponse, saveQueryResult |
| Query Learning | `src/lib/query-learning.ts` | Contexto, exemplos, findTrainingExamples |
| Documentation Parser | `src/lib/assistente-ia/documentation-parser.ts` | Parse de documentação MD |

### 3.6 Fluxo de Treinamento

```
1. Acessar /assistente-ia/treinar/novo
2. Selecionar dataset
3. Digitar pergunta do usuário
4. Selecionar medidas, agrupadores, filtros (TrainingFieldSelector)
5. Sistema gera DAX automaticamente
6. Executar DAX via /api/assistente-ia/execute-dax
7. Editar resposta formatada
8. Salvar em ai_training_examples
```

### 3.7 Fluxo de Pendentes

```
1. IA não responde (isFailureResponse) → salva em ai_unanswered_questions
2. Acessar /assistente-ia/pendentes
3. Listar perguntas com status pending
4. Clicar "Treinar" → /assistente-ia/treinar/novo?question=...&unanswered_id=...
5. Criar exemplo em ai_training_examples
6. PATCH /api/assistente-ia/pending → status: trained
```

---

## 4. Integrações e Fluxos

### 4.1 WhatsApp ↔ Assistente IA

- **Contextos**: `ai_model_contexts` usados no webhook para responder perguntas.
- **Exemplos**: `ai_training_examples` melhoram as respostas via `findTrainingExamples`.
- **Pendentes**: Perguntas não respondidas no WhatsApp são salvas em `ai_unanswered_questions`.

### 4.2 Alertas ↔ WhatsApp

- Alertas (`ai_alerts`) podem enviar via WhatsApp usando números e grupos autorizados.
- Mensagens de alerta são registradas em `whatsapp_messages`.

### 4.3 Diagrama de Dependências

```
[Evolution API] → /api/whatsapp/webhook
                        ↓
            whatsapp_authorized_numbers
            whatsapp_available_datasets
                        ↓
            ai_model_contexts (contexto)
            ai_training_examples (exemplos)
                        ↓
            Claude + execute_dax (Power BI)
                        ↓
            Resposta → Evolution API
            Salva → whatsapp_messages
            Falha → ai_unanswered_questions
```

---

## 5. Segurança e Permissões

### 5.1 Níveis de Acesso

| Função | WhatsApp | Assistente IA |
|--------|----------|---------------|
| Master | Total | Total |
| Developer | Grupos do developer | Grupos do developer |
| Admin | Grupo admin | Grupo admin |
| Viewer/Operator | Bloqueado em algumas ações | Bloqueado (PermissionGuard) |

### 5.2 Validações

- APIs validam `company_group_id` do usuário.
- Webhook usa `createAdminClient()` para bypass de RLS em operações sem sessão.
- RLS no Supabase para isolamento por grupo.

### 5.3 Webhook (sem autenticação)

O endpoint `/api/whatsapp/webhook` **não requer autenticação** (é chamado pela Evolution API). A validação é feita por `whatsapp_authorized_numbers`: só processa mensagens de números autorizados.

---

## Referências

- `docs/DOCUMENTACAO_SISTEMA_TELAS_E_CHAT.md` – Visão geral de chat e telas
- `docs/WHATSAPP_EVOLUTION_API_TECNICO.md` – Detalhes técnicos da integração WhatsApp
- `supabase/migrations/20260107_assistente_ia.sql` – Schema Assistente IA
