# Documentação Completa do Sistema – MeuDashboard

Documento central que descreve a arquitetura, módulos, APIs, autenticação, sistema de cotas, banco de dados e **todas as funcionalidades** do **MeuDashboard**.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Funcionalidades detalhadas](#2-funcionalidades-detalhadas)
3. [Stack e arquitetura](#3-stack-e-arquitetura)
4. [Estrutura do projeto](#4-estrutura-do-projeto)
5. [Autenticação e perfis de usuário](#5-autenticação-e-perfis-de-usuário)
6. [Banco de dados](#6-banco-de-dados)
7. [Módulos funcionais](#7-módulos-funcionais)
8. [Sistema de cotas (Master + Developer)](#8-sistema-de-cotas-master--developer)
9. [Menu e sidebar por perfil](#9-menu-e-sidebar-por-perfil)
10. [APIs – índice por área](#10-apis--índice-por-área)
11. [Principais rotas da aplicação](#11-principais-rotas-da-aplicação)
12. [Como executar o projeto](#12-como-executar-o-projeto)
13. [Documentação complementar](#13-documentação-complementar)

---

## 1. Visão geral

O **MeuDashboard** é uma aplicação web multi-tenant que integra:

- **Power BI** – Conexões (Service Principal), workspaces, datasets, relatórios, telas (dashboards) por grupo de empresa, embed e refresh.
- **WhatsApp** – Evolution API: instâncias, números e grupos autorizados, histórico de mensagens, webhook para receber mensagens.
- **Assistente de IA** – Respostas em linguagem natural usando Claude + consultas DAX ao Power BI; contextos por dataset (documentação + base DAX), treinamento com exemplos e perguntas pendentes.
- **Alertas** – Regras baseadas em consultas DAX (Power BI), disparo manual ou agendado (cron), notificação via WhatsApp.
- **Sistema de cotas** – Master define limites por developer; developer distribui cotas entre seus grupos (usuários, telas, alertas, WhatsApp/dia, créditos IA/dia).

**Hierarquia de acesso:**

| Perfil | Descrição | Área principal |
|--------|-----------|----------------|
| **Master** | Administrador global: desenvolvedores, grupos, usuários, cotas, planos | `/admin` |
| **Desenvolvedor** | Gerencia seus grupos, usuários, cotas e recursos | `/dev` |
| **Administrador de grupo** | Gerencia usuários e telas do seu grupo | `/administrador/[id]` |
| **Usuário** | Acesso ao dashboard (telas Power BI), chat IA, WhatsApp e alertas conforme permissões | `/dashboard`, `/tela/[id]` |

**Multi-tenancy:** Os dados são filtrados por **grupo de empresa** (`company_group_id`). Um usuário pode pertencer a vários grupos; o grupo ativo (selecionado no header) define o contexto das telas, conexões, WhatsApp e IA.

---

## 2. Funcionalidades detalhadas

### 2.1 Autenticação e acesso

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Login** | Autenticação por email e senha. JWT armazenado em cookie HttpOnly (7 dias). | `/login` |
| **Cadastro** | Registro de novos usuários (quando habilitado). | `/cadastro` |
| **Troca de senha** | Alteração de senha (senha atual + nova + confirmação). | `/trocar-senha` |
| **Modal troca obrigatória** | Se `needsPasswordChange=true`, modal aparece no login. Usuário pode pular (sessionStorage); volta no próximo login. | MainLayout |
| **Redirecionamento pós-login** | Master → `/admin`, Desenvolvedor → `/dev`, demais → `/dashboard`. | - |

---

### 2.2 Dashboard e telas Power BI

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Dashboard** | Página inicial com cards das telas Power BI do grupo, estatísticas (usuários, telas, relatórios) e atalhos. Exige grupo selecionado. | `/dashboard` |
| **Tela Power BI** | Embed do relatório Power BI em tela cheia. Suporta refresh manual, fullscreen, navegação entre páginas. | `/tela/[id]` |
| **Chat IA na tela** | Painel lateral para perguntas em linguagem natural sobre os dados. Respostas via Claude + DAX. Permissão `can_use_ai`. | `/tela/[id]` |
| **Refresh na tela** | Botão para atualizar dados do relatório. Permissão `can_refresh`. | `/tela/[id]` |
| **Primeira tela** | Usuário pode ter tela padrão; dashboard redireciona para ela. | `/dashboard` |

---

### 2.3 Power BI – Configuração

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Conexões** | CRUD de conexões Power BI (Service Principal): tenant_id, client_id, client_secret, workspace_id. | `/powerbi/conexoes` |
| **Relatórios** | Lista de relatórios e datasets das conexões do grupo. | `/powerbi/relatorios` |
| **Telas** | CRUD de telas (dashboards): título, ícone, relatório vinculado, ordem, usuários com acesso. | `/powerbi/telas` |
| **Ordem de atualização** | Define sequência de refresh de datasets/dataflows. Arrastar para reordenar. Atualizar um ou todos. | `/powerbi/ordem-atualizacao` |
| **Alertas de refresh** | Monitoramento por item: alerta via WhatsApp em caso de erro, atraso ou relatório diário. Limite 10 disparos/dia por grupo. | `/powerbi/ordem-atualizacao` (ícone 🔔) |
| **Agendamento de refresh** | Agendar horários e dias para refresh automático de cada item. | `/powerbi/ordem-atualizacao` (ícone ⏰) |
| **Gateways** | Status de gateways e datasources Power BI. | `/powerbi/gateways` |

---

### 2.4 WhatsApp

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Instâncias** | CRUD de instâncias Evolution API: nome, URL, API key. Conexão via QR Code. | `/whatsapp/instancias` |
| **Números autorizados** | CRUD de números que podem receber alertas e usar chat IA. Vinculação a instância e datasets. | `/whatsapp/numeros` |
| **Grupos autorizados** | Grupos WhatsApp que podem receber alertas. | `/whatsapp/grupos` |
| **Mensagens** | Histórico de mensagens enviadas e recebidas. | `/whatsapp/mensagens` |
| **Webhook** | URL e instruções para configurar webhook na Evolution API. Recebe mensagens e aciona IA. | `/whatsapp/webhook` |

---

### 2.5 Alertas

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Lista de alertas** | Alertas baseados em consultas DAX: limite, anomalia, meta. Ativar/pausar. | `/alertas` |
| **Novo alerta** | Criar alerta: condição (>, <, =), dataset, query DAX, horários, notificação WhatsApp. | `/alertas/novo` |
| **Editar alerta** | Editar alerta existente. | `/alertas/[id]` |
| **Disparo manual** | Botão para disparar alerta manualmente. | `/alertas/[id]` |
| **Histórico** | Histórico de disparos com detalhes. | `/alertas/historico` |
| **Cron** | Job que roda a cada minuto; verifica condições e envia WhatsApp. | `/api/alertas/cron` |

---

### 2.6 Assistente de IA

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Contextos** | Documentação e base DAX por dataset para treinar a IA. Upload de arquivos, parsing automático. | `/assistente-ia/contextos` |
| **Treinamento** | Exemplos pergunta → query DAX → resposta. Melhora respostas do chat. | `/assistente-ia/treinar` |
| **Novo exemplo** | Adicionar exemplo de treinamento. | `/assistente-ia/treinar/novo` |
| **Editar exemplo** | Editar exemplo existente. | `/assistente-ia/treinar/[id]` |
| **Perguntas pendentes** | Perguntas não respondidas; aprovar, ignorar ou treinar. | `/assistente-ia/pendentes` |
| **Modelo** | Metadados e estrutura do modelo de IA. | `/assistente-ia/modelo` |

---

### 2.7 Área Master (Admin)

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Dashboard admin** | Estatísticas: desenvolvedores, grupos, usuários, telas, planos. | `/admin` |
| **Desenvolvedores** | CRUD de desenvolvedores. Modal de plano e cotas (Free/Pro). | `/admin/desenvolvedores` |
| **Cotas** | Lista de developers com cotas. Modal para ajustar limites. | `/admin/cotas` |
| **Grupos** | CRUD de grupos/empresas. | `/admin/grupos` |
| **Usuários** | CRUD de usuários do sistema (master, developer, admin, user). | `/admin/usuarios` |
| **Logs** | Logs de atividades com filtros. | `/configuracoes/logs` |

---

### 2.8 Área Desenvolvedor

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Dashboard dev** | Estatísticas dos grupos: usuários, telas, conexões. | `/dev` |
| **Grupos** | CRUD de grupos do developer. | `/dev/groups` |
| **Detalhes do grupo** | Dados, quotas, usuários, telas, alertas, WhatsApp do grupo. | `/dev/groups/[id]` |
| **Usuários** | Usuários dos grupos com permissões e telas. | `/dev/usuarios` |
| **Cotas** | Distribuir cotas entre grupos (usuários, telas, alertas, WhatsApp/dia, IA/dia, atualizações). | `/dev/quotas` |
| **Relatórios** | Relatórios de acesso por dia, grupo, sessões. | `/dev/relatorios` |
| **Recursos** | Conexões Power BI, instâncias WhatsApp, treinamentos de IA compartilhados. | `/dev/recursos` |
| **Perfil** | Perfil do developer, subdomínio, segurança, plano. | `/dev/perfil` |

---

### 2.9 Administrador de grupo

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Detalhes do grupo** | Dados do grupo, quotas, usuários, telas, alertas, WhatsApp. | `/administrador/[id]` |
| **Usuários do grupo** | CRUD de usuários com permissões (admin, manager, operator, viewer). Ordem de telas, ativação. | `/administrador/[id]/usuarios` |
| **Logs do grupo** | Logs de atividades do grupo com filtros. | `/administrador/[id]/logs` |

---

### 2.10 Perfil e conta

| Funcionalidade | Descrição | Rota |
|----------------|-----------|------|
| **Perfil** | Nome, telefone, uso de IA, alertas, WhatsApp. | `/perfil` |
| **Meus logs** | Logs de atividades do usuário (login, visualizações, consultas). | `/meus-logs` |
| **Planos** | Página de planos e preços (pública). | `/planos` |

---

### 2.11 Alertas de refresh Power BI

| Funcionalidade | Descrição | Detalhes |
|----------------|-----------|----------|
| **Monitoramento** | Ícone 🔔 em cada item da ordem de atualização. Configura alertas via WhatsApp. | Modal na `/powerbi/ordem-atualizacao` |
| **Tipos de alerta** | Erro na atualização; não atualizou no horário esperado; relatório diário. | - |
| **Números WhatsApp** | Lista de números para receber alertas (adicionar/remover). | - |
| **Limite diário** | 10 disparos/dia por grupo. Badge no modal mostra uso. | `refresh_alert_daily_log` |
| **CRON** | Job a cada 10 min verifica status via Power BI API e envia WhatsApp. | `/api/powerbi/refresh-alerts/cron` |

---

### 2.12 Seleção de grupo

| Funcionalidade | Descrição | Onde |
|----------------|-----------|------|
| **Seletor de grupo** | Dropdown no header para escolher grupo ativo. | Header |
| **Sem grupo** | Páginas que exigem grupo mostram mensagem "Selecione um grupo". Ex.: ordem-atualizacao. | Várias telas |
| **Todos** | Opção "Todos" não é válida para telas que exigem grupo específico. | - |

---

## 3. Stack e arquitetura

| Camada | Tecnologia |
|----------|------------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| Backend  | Next.js Route Handlers (`app/api/*`) |
| Banco    | PostgreSQL (Supabase) |
| Auth     | JWT em cookie `auth-token` (HttpOnly, 7 dias), bcrypt para senha |
| IA       | Anthropic (Claude), OpenAI (opcional) |
| WhatsApp | Evolution API (self-hosted ou externa) |
| Power BI | REST API (Service Principal), embed |

**Fluxo geral:**

1. Usuário faz login → API gera JWT e define cookie → middleware protege rotas.
2. Após login, redirecionamento por perfil: Master → `/admin`, Desenvolvedor → `/dev`, demais → `/dashboard`.
3. APIs usam `getAuthUser()` e `getUserGroupMembership()` (ou `group_id` em query/body) para filtrar dados por grupo.

---

## 4. Estrutura do projeto

```
meudahsboard/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing
│   ├── login/                        # Login
│   ├── planos/                       # Página de planos (pública)
│   ├── dashboard/                    # Dashboard (redireciona para primeira tela)
│   ├── tela/[id]/                    # Tela Power BI + Chat IA
│   ├── admin/                        # Área Master
│   │   ├── page.tsx                  # Dashboard admin
│   │   ├── desenvolvedores/          # CRUD desenvolvedores
│   │   ├── cotas/                    # Lista developers + cotas (modal plano/cotas)
│   │   ├── grupos/                   # Grupos
│   │   ├── usuarios/                 # Usuários
│   │   └── relatorios/
│   ├── dev/                          # Área Desenvolvedor
│   │   ├── page.tsx                  # Dashboard dev
│   │   ├── groups/                   # Grupos do developer
│   │   ├── usuarios/                 # Usuários e telas
│   │   ├── quotas/                   # Distribuir cotas entre grupos
│   │   ├── plano/                    # Meu plano (informativo)
│   │   └── perfil/
│   ├── administrador/[id]/           # Admin do grupo
│   ├── powerbi/                      # Conexões, relatórios, telas, ordem-atualização
│   ├── whatsapp/                     # Instâncias, números, grupos, mensagens, webhook
│   ├── alertas/                      # Lista, novo, [id], histórico
│   ├── assistente-ia/                # Contextos, treinar, pendentes, evolução, modelo
│   ├── configuracoes/                # Usuários, grupos, planos, módulos, logs
│   ├── perfil/                       # Perfil do usuário
│   ├── trocar-senha/
│   └── api/                          # Rotas API (ver seção 9)
├── src/
│   ├── lib/                          # Lógica compartilhada
│   │   ├── auth.ts                   # getAuthUser, getUserDeveloperId, login
│   │   ├── supabase/                 # Cliente server e admin
│   │   ├── ai/                       # Claude, DAX engine, learning, prompts
│   │   ├── assistente-ia/            # Parser de documentação
│   │   ├── whatsapp/                 # Messaging, áudio
│   │   └── ...
│   ├── components/
│   │   ├── layout/                   # MainLayout, Sidebar, Header
│   │   ├── ui/                       # LoadingSpinner, Pagination, etc.
│   │   └── ...
│   ├── contexts/                     # Toast, Menu
│   ├── hooks/                        # useFeatures, usePlanPermissions
│   └── types/
├── public/prompts/                   # Prompts para IA (documentação, DAX)
├── docs/                             # Documentação técnica
├── migrations/                       # SQL (ex.: 004_developer_quotas_columns.sql)
├── middleware.ts                     # Proteção de rotas, JWT
└── package.json
```

---

## 5. Autenticação e perfis de usuário

### 5.1 Login

- **Endpoint:** `POST /api/auth/login` (body: `email`, `password`).
- **Fluxo:** Busca usuário em `users` por email, valida `password_hash` (bcrypt), verifica `status = 'active'`. Gera JWT com `id`, `email`, `name`, `role`, `developerId`, `isDeveloperUser`, `groupIds`, `is_master` e grava em cookie `auth-token`.

### 5.2 Redirecionamento pós-login

| Condição                    | Destino      |
|----------------------------|-------------|
| `is_master`                | `/admin`    |
| `is_developer_user` + `developer_id` | `/dev`      |
| Demais                     | `/dashboard`|

### 5.3 Middleware

- **Arquivo:** `middleware.ts` (raiz).
- **Rotas públicas:** `/`, `/login`, `/planos`, `/cadastro`, `/api/auth/login`, `/api/auth/logout`, `/api/whatsapp/webhook*`, `/api/alertas/cron`.
- Demais rotas exigem JWT válido no cookie.

### 5.4 Perfis e tabelas

- **Master:** `users.is_master = true`. Acesso a todos os grupos ativos e às telas de admin (desenvolvedores, cotas, grupos, usuários, planos, logs).
- **Desenvolvedor:** `users.is_developer_user` e `users.developer_id`. Grupos vinculados ao `developer_id` em `company_groups`. Acesso a `/dev/*` (grupos, usuários, cotas, Power BI, WhatsApp, alertas, assistente IA).
- **Usuário comum:** Membros em `user_group_membership` (`user_id`, `company_group_id`, `role`: admin | manager | operator | viewer, `can_use_ai`, `can_refresh`).

**Documentação detalhada:** `DOCS_AUTH_MENU.md`, `DOCUMENTACAO_ACESSOS_SISTEMA.md`.

---

## 6. Banco de dados

- **SGBD:** PostgreSQL (Supabase).
- **IDs:** UUID.
- **Segurança:** Row Level Security (RLS) onde aplicável.

### Principais tabelas

| Área       | Tabelas principais |
|------------|---------------------|
| Core       | `users`, `company_groups`, `companies`, `user_group_membership` |
| Developers | `developers`, `developer_plans` (planos Free/Pro; cotas em `developers`) |
| Planos     | `modules`, `module_groups`, `powerbi_plans` |
| Power BI   | `powerbi_connections`, `powerbi_reports`, `powerbi_screens`, `powerbi_screen_users`, `powerbi_refresh_order`, `powerbi_refresh_schedules`, `refresh_alerts`, `refresh_alert_daily_log` |
| WhatsApp   | `whatsapp_instances`, `whatsapp_instance_groups`, `whatsapp_authorized_numbers`, `whatsapp_authorized_groups`, `whatsapp_messages`, `whatsapp_message_queue` |
| Alertas    | `ai_alerts`, `ai_alert_history` |
| IA         | `ai_model_contexts`, `ai_conversations`, `ai_messages`, `ai_usage`, `ai_training_examples`, `ai_unanswered_questions`, `ai_query_learning` |
| Auditoria  | `activity_logs` |

### Cotas (developers e company_groups)

- **developers:** `max_companies`, `max_users`, `max_powerbi_screens`, `max_alerts`, `max_whatsapp_messages_per_day`, `max_chat_messages_per_day`, `max_ai_credits_per_day`, `max_daily_refreshes` (definidos pelo Master).
- **company_groups:** `quota_users`, `quota_screens`, `quota_alerts`, `quota_whatsapp_per_day`, `quota_ai_credits_per_day`, `quota_refreshes` (distribuídos pelo developer; soma ≤ limites do developer).

**Documentação detalhada:** `DOCUMENTACAO_BANCO_DADOS.md`.

---

## 7. Módulos funcionais

### 7.1 Power BI

- **Função:** Conexões (Service Principal), workspaces, datasets, relatórios, telas (dashboards) por grupo; geração de embed token; refresh e ordem de atualização; dataflows; gateways.
- **Telas:** `/powerbi`, `/powerbi/conexoes`, `/powerbi/relatorios`, `/powerbi/telas`, `/powerbi/ordem-atualizacao`, `/powerbi/gateways`.
- **Embed:** `/tela/[id]` usa `GET /api/powerbi/embed` para obter token e exibir o relatório; na mesma tela há o **Chat IA** (painel lateral).
- **Docs:** `docs/DOCUMENTACAO_POWERBI_CONEXOES.md`, `docs/POWERBI_DOCUMENTACAO.md`.

### 7.2 WhatsApp

- **Função:** Integração com Evolution API: instâncias, números e grupos autorizados, histórico de mensagens, webhook para receber mensagens; envio de respostas (incl. IA) e áudio (transcrição).
- **Telas:** `/whatsapp`, `/whatsapp/instancias`, `/whatsapp/numeros`, `/whatsapp/grupos`, `/whatsapp/mensagens`, `/whatsapp/webhook`.
- **Webhook:** `POST /api/whatsapp/webhook` recebe eventos da Evolution API; processa mensagens, identifica número/grupo, contexto (dataset) e aciona o motor de IA quando aplicável.
- **Docs:** `docs/DOCUMENTACAO_WHATSAPP_E_ASSISTENTE_IA.md`, `docs/WHATSAPP_EVOLUTION_API_TECNICO.md`.

### 7.3 Alertas

- **Função:** Alertas baseados em consultas DAX ao Power BI; disparo manual (`POST /api/alertas/[id]/trigger`) e agendado (cron em `GET /api/alertas/cron`); notificação por WhatsApp.
- **Telas:** `/alertas`, `/alertas/novo`, `/alertas/[id]`, `/alertas/historico`.
- **Entidades:** `ai_alerts`, `ai_alert_history`.

### 7.4 Assistente de IA

- **Função:** Respostas em linguagem natural sobre os dados (Power BI). Contextos do modelo (documentação + base DAX), exemplos de treinamento, perguntas pendentes, aprendizado de queries.
- **Canais:** (1) Chat na tela Power BI (`/tela/[id]`), via `POST /api/ai/chat`. (2) WhatsApp – mesmo motor no webhook.
- **Telas:** `/assistente-ia`, `/assistente-ia/contextos`, `/assistente-ia/treinar`, `/assistente-ia/pendentes`, `/assistente-ia/evolucao`, `/assistente-ia/modelo`.
- **Docs:** `docs/ASSISTENTE_IA_ANALISE.md`, `docs/CHAT_SISTEMA_TECNICO.md`.

### 7.5 Telas (dashboards)

- **Função:** Definir quais relatórios Power BI são “telas” do grupo; associar usuários a telas (`powerbi_screen_users`); primeira tela do usuário; embed em `/tela/[id]`.
- **APIs:** `GET|POST /api/powerbi/screens`, `GET|PATCH /api/powerbi/screens/[id]`, `GET|PATCH /api/powerbi/screens/[id]/users`, `GET /api/user/first-screen`.

### 7.6 Configurações

- **Função:** Master: usuários globais, desenvolvedores, grupos, planos, módulos, logs. Admin de grupo: usuários do grupo, personalização, logs. Desenvolvedor: grupos, cotas, uso. Usuário: perfil, troca de senha.
- **Telas:** `/configuracoes` (e subpáginas), `/config`, `/admin/*`, `/administrador/[id]/*`, `/dev/*`.

---

## 8. Sistema de cotas (Master + Developer)

### Visão geral

```
MASTER (admin)                         DEVELOPER (dev)
┌────────────────────────────┐         ┌──────────────────────────────┐
│ Define TOTAL do developer:  │         │ Distribui entre grupos:       │
│ • Grupos (máx)              │ ──────▶│ • Grupo A: 300 msg WhatsApp   │
│ • Usuários (máx)            │         │ • Grupo B: 200 msg            │
│ • Telas (máx)               │         │ Soma ≤ Total do Master        │
│ • Alertas                   │         │ Cards mostram uso vs máximo   │
│ • WhatsApp/dia              │         └──────────────────────────────┘
│ • Créditos IA/dia           │
│ • Atualizações/dia          │
└────────────────────────────┘
```

### Onde configurar

- **Master:** Em `/admin/desenvolvedores` (botão ⚙️ no developer) ou em `/admin/cotas` (lista de developers com cotas e ⚙️). Modal: plano (Free/Pro) + cotas totais do developer. Salva via `PUT /api/admin/developers/[id]`.
- **Developer:** Em `/dev/quotas`. Distribui as cotas entre os grupos (usuários, telas, alertas, WhatsApp/dia, IA/dia, atualizações). Validação: soma por recurso ≤ limite do developer. Salva via `PUT /api/dev/quotas`.

### Planos Free e Pro

- **Free:** Alertas, WhatsApp e IA ficam zerados e bloqueados (inputs desabilitados em `/dev/quotas`; Master pode definir 0 no modal).
- **Pro:** Todos os campos editáveis; limites definidos pelo Master no developer.

### APIs do sistema de cotas

- `GET /api/admin/developers/[id]` – Developer com cotas atuais, contagem de grupos/usuários, lista de planos.
- `PUT /api/admin/developers/[id]` – Atualiza `plan_id` e cotas totais (`max_companies`, `max_users`, `max_powerbi_screens`, `max_alerts`, `max_whatsapp_messages_per_day`, `max_ai_credits_per_day`, `max_daily_refreshes`).
- `GET /api/dev/quotas` – Grupos do developer com quotas atuais e uso; limites efetivos (developer sobrepõe plano).
- `PUT /api/dev/quotas` – Atualiza quotas por grupo (`quota_users`, `quota_screens`, `quota_alerts`, `quota_whatsapp_per_day`, `quota_ai_credits_per_day`, `quota_refreshes`); valida contra limites do developer.

### Migrations SQL

- `migrations/004_developer_quotas_columns.sql`: colunas em `company_groups` (`quota_ai_credits_per_day`) e em `developers` (`max_ai_credits_per_day`, `max_whatsapp_messages_per_day`, `max_alerts`, `max_chat_messages_per_day`).

---

## 9. Menu e sidebar por perfil

- **Arquivo:** `src/components/layout/Sidebar.tsx`.

### Desenvolvedor – grupo "Meus grupos"

- Grupos → `/dev/groups`
- Usuários & Telas → `/dev/usuarios`
- **Cotas** → `/dev/quotas` (substitui "Meu Plano" no menu)

### Master – grupo "Admin"

- Desenvolvedores → `/admin/desenvolvedores`
- Grupos → `/admin/grupos`
- Usuários → `/admin/usuarios`
- Planos → `/configuracoes/planos`
- **Cotas** → `/admin/cotas`
- Logs → `/configuracoes/logs`

### Outros grupos (Power BI, WhatsApp, Assistente IA, Minha conta)

- Conforme perfil (Master vs Developer vs usuário) e features (WhatsApp, IA) habilitadas no plano.
- **Documentação detalhada:** `DOCS_AUTH_MENU.md`.

---

## 10. APIs – índice por área

### Auth

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, `POST /api/auth/verify-password`, `GET /api/auth/features`

### Usuário / grupo

- `GET /api/user/groups`, `GET /api/user/first-screen`, `GET /api/user/plan-quotas`

### Power BI

- `GET|POST /api/powerbi/connections`, `GET|PATCH|DELETE /api/powerbi/connections/[id]`
- `GET /api/powerbi/reports`, `GET /api/powerbi/reports/[id]`, `GET /api/powerbi/reports/[id]/pages`
- `GET /api/powerbi/datasets`, `GET /api/powerbi/datasets/status`, `POST /api/powerbi/datasets/execute-dax`
- `GET|POST /api/powerbi/screens`, `GET|PATCH|DELETE /api/powerbi/screens/[id]`, `GET|PATCH /api/powerbi/screens/[id]/users`
- `GET /api/powerbi/embed`, `GET /api/powerbi/health`, `GET /api/powerbi/refresh`, `GET /api/powerbi/refresh-schedules`, `GET /api/powerbi/refresh-order/*`, `GET|POST|DELETE /api/powerbi/refresh-alerts`, `GET /api/powerbi/refresh-alerts/cron`, `GET /api/powerbi/dataflows/status`, `GET /api/powerbi/gateways`

### WhatsApp

- `GET|POST /api/whatsapp/instances`, `GET|DELETE /api/whatsapp/instances/[id]`
- `GET|POST|PUT|DELETE /api/whatsapp/authorized-numbers`, `GET|POST|PUT|DELETE /api/whatsapp/groups`
- `GET /api/whatsapp/messages`, `GET /api/whatsapp/usage`, `POST|GET /api/whatsapp/webhook`, `POST /api/whatsapp/webhook/process-queue`, etc.

### Alertas

- `GET|POST /api/alertas`, `GET|PATCH|DELETE /api/alertas/[id]`, `POST /api/alertas/[id]/trigger`, `GET /api/alertas/[id]/clone`, `GET /api/alertas/historico`, `GET /api/alertas/cron` (público)

### Assistente IA / AI

- `GET|POST|DELETE /api/assistente-ia/context`, `GET /api/assistente-ia/datasets`, `GET|POST /api/assistente-ia/pending`, `GET|POST /api/assistente-ia/training`, `POST /api/assistente-ia/training/test`, `GET|POST /api/assistente-ia/questions`, `GET|PATCH|DELETE /api/assistente-ia/questions/[id]`, `GET /api/assistente-ia/model-metadata`, `GET /api/assistente-ia/model-structure`, `GET /api/assistente-ia/stats`, `POST /api/assistente-ia/execute-dax`, `GET /api/assistente-ia/column-values`
- `POST /api/ai/chat`, `GET /api/ai/contexts`, `GET /api/ai/usage`, `POST /api/ai/feedback`, `POST /api/ai/generate-dax`, `POST /api/ai/generate-alert`, `POST /api/ai/generate-alert-template`, `POST /api/ai/context/upload`, `POST /api/ai/context/parse`

### Admin (Master)

- `GET /api/admin/stats`, `GET /api/admin/reports`, `GET /api/admin/groups`, `GET|POST /api/admin/users`, `GET|PATCH|DELETE /api/admin/users/[id]`
- `GET|POST /api/admin/developers`, `GET|PUT|DELETE /api/admin/developers/[id]` (GET retorna developer com cotas, contagens e planos; PUT atualiza plano e cotas totais)
- `GET|PUT /api/admin/developers/[id]/quotas` (legado: cotas aplicadas a todos os grupos do developer)
- `GET|PUT /api/admin/developers/[id]/limits` (limites do developer)

### Config / Admin de grupo

- `GET|POST /api/config/users`, `GET|POST|PATCH /api/config/groups`, `GET /api/config/logs`, `GET /api/config/logs/summary`
- `GET /api/modules`, `GET /api/modules/groups`
- `GET|PATCH /api/admin-group`, `GET|POST /api/admin-group/usuarios`, `GET /api/admin-group/relatorios`, `GET /api/admin-group/logs`, `GET|PATCH /api/admin-group/screen-order`
- `GET|PATCH /api/administrador/[id]`, `GET|POST /api/administrador/[id]/usuarios`, `GET|POST /api/administrador/[id]/screens`

### Dev (Desenvolvedor)

- `GET /api/dev/dashboard`, `GET /api/dev/profile`, `GET /api/dev/groups`, `GET|PATCH /api/dev/groups/[id]`, `GET /api/dev/groups/[id]/screens`, `GET /api/dev/groups/[id]/users`, `GET|POST /api/dev/usuarios`
- `GET|PUT /api/dev/quotas` (grupos com quotas; validação contra limites do developer)
- `GET /api/dev/usage`, `GET /api/dev/access-logs`, etc.
- `GET /api/plans`, `GET /api/plans/[id]`, `GET /api/plans/developer`

### Outros

- `GET /api/company-groups`, `POST /api/upload`, `POST /api/upload/logo`, `GET /api/usage/dashboard`

---

## 11. Principais rotas da aplicação

| Rota | Descrição | Perfil |
|------|-----------|--------|
| `/` | Landing | Público |
| `/login` | Login | Público |
| `/planos` | Página de planos | Público |
| `/dashboard` | Dashboard (redireciona para primeira tela) | Autenticado |
| `/tela/[id]` | Tela Power BI + Chat IA | Autenticado |
| `/admin` | Dashboard Master | Master |
| `/admin/desenvolvedores` | CRUD desenvolvedores | Master |
| `/admin/cotas` | Lista developers e cotas (modal plano/cotas) | Master |
| `/admin/grupos` | Grupos | Master |
| `/admin/usuarios` | Usuários | Master |
| `/dev` | Dashboard Desenvolvedor | Desenvolvedor |
| `/dev/groups` | Grupos do developer | Desenvolvedor |
| `/dev/usuarios` | Usuários e telas | Desenvolvedor |
| `/dev/quotas` | Distribuir cotas entre grupos | Desenvolvedor |
| `/dev/plano` | Meu plano (informativo) | Desenvolvedor |
| `/dev/perfil` | Configurações do developer | Desenvolvedor |
| `/administrador/[id]` | Área do admin do grupo | Admin grupo |
| `/powerbi/*` | Conexões, relatórios, telas, ordem-atualização (com alertas de refresh via WhatsApp), gateways | Conforme perfil |
| `/whatsapp/*` | Instâncias, números, grupos, mensagens, webhook | Conforme perfil + plano |
| `/alertas/*` | Lista, novo, editar, histórico | Conforme perfil + plano |
| `/assistente-ia/*` | Contextos, treinar, pendentes, evolução, modelo | Conforme perfil + plano |
| `/configuracoes/*` | Usuários, grupos, planos, módulos, logs | Conforme perfil |
| `/perfil`, `/trocar-senha` | Perfil e senha | Autenticado |

---

## 12. Como executar o projeto

### Pré-requisitos

- Node.js 20+
- Conta Supabase (banco e variáveis de ambiente)
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, e conforme uso: Anthropic/OpenAI, Evolution API, etc.

### Comandos

```bash
npm install
npm run dev    # http://localhost:3000
npm run build
npm run start
```

### Rotas públicas (sem login)

- `/` – Landing  
- `/login` – Login  
- `/planos` – Planos  
- `/cadastro` – Cadastro (se habilitado)  
- `/api/auth/login`, `/api/auth/logout`  
- `/api/whatsapp/webhook` (e subrotas de webhook)  
- `/api/alertas/cron` (cron de alertas)
- `/api/powerbi/refresh-alerts/cron` (cron de alertas de refresh)

---

## 13. Documentação complementar

| Documento | Conteúdo |
|-----------|----------|
| `DOCS_AUTH_MENU.md` | Login, JWT, middleware, redirecionamento, menu/sidebar por perfil |
| `DOCUMENTACAO_ACESSOS_SISTEMA.md` | Perfis Master, Admin, Dev, Visualizador; rotas e APIs por perfil |
| `DOCUMENTACAO_BANCO_DADOS.md` | Tabelas, relacionamentos, RLS, índices, queries |
| `DOCUMENTACAO_ARQUITETURA_PLANOS_USUARIOS.md` | Arquitetura de planos e usuários |
| `docs/DOCUMENTACAO_WHATSAPP_E_ASSISTENTE_IA.md` | Menu WhatsApp + Assistente IA, fluxos, tabelas |
| `docs/DOCUMENTACAO_SISTEMA_TELAS_E_CHAT.md` | Telas, caminhos, Chat IA (tela) vs WhatsApp |
| `docs/DOCUMENTACAO_POWERBI_CONEXOES.md` | Conexões Power BI, workspaces, datasets |
| `docs/CHAT_SISTEMA_TECNICO.md` | Chat IA técnico (APIs, contexto, DAX) |
| `docs/ASSISTENTE_IA_ANALISE.md` | Análise do assistente IA |
| `docs/WHATSAPP_EVOLUTION_API_TECNICO.md` | Evolution API, webhook, mensagens |
| `DOCUMENTACAO_ALERTAS_WHATSAPP.md` | Alertas e integração WhatsApp |

---

*Última atualização: fevereiro de 2025.*

---

## Resumo rápido das funcionalidades por área

| Área | Funcionalidades principais |
|------|----------------------------|
| **Power BI** | Conexões, relatórios, telas, ordem de atualização, alertas de refresh (WhatsApp), agendamento, gateways |
| **WhatsApp** | Instâncias, números autorizados, grupos, mensagens, webhook |
| **Alertas** | Alertas DAX (limite, anomalia, meta), disparo manual/cron, histórico |
| **Assistente IA** | Contextos, treinamento, perguntas pendentes, chat na tela Power BI |
| **Admin** | Desenvolvedores, grupos, usuários, cotas, logs |
| **Dev** | Grupos, usuários, cotas, relatórios, recursos, perfil |
| **Administrador** | Usuários do grupo, logs do grupo |
