# Documentação Completa do Sistema – MeuDashboard

Documento mestre do **MeuDashboard**: visão geral, arquitetura, stack, configuração, banco de dados, fluxos principais e índice da documentação técnica.

---

## Índice

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Arquitetura e stack técnico](#2-arquitetura-e-stack-técnico)
3. [Variáveis de ambiente](#3-variáveis-de-ambiente)
4. [Banco de dados – principais entidades](#4-banco-de-dados--principais-entidades)
5. [Segurança e autenticação](#5-segurança-e-autenticação)
6. [Fluxos principais](#6-fluxos-principais)
7. [Módulos do sistema](#7-módulos-do-sistema)
8. [Referência de páginas e APIs](#8-referência-de-páginas-e-apis)
9. [Documentação técnica existente](#9-documentação-técnica-existente)

---

## 1. Visão geral do produto

O **MeuDashboard** é uma plataforma **SaaS multi-tenant** que oferece:

- **Dashboards Power BI** embeddados por grupo/empresa, com gestão de conexões (Service Principal), relatórios, telas e usuários.
- **Assistente de IA** (Claude) que responde em linguagem natural e executa consultas **DAX** nos datasets do Power BI (no chat da tela e via **WhatsApp**).
- **WhatsApp** via **Evolution API**: instâncias, números e grupos autorizados, webhook para mensagens e integração com o assistente de IA.
- **Alertas** baseados em consultas DAX, com disparo manual ou agendado (cron) e notificação via WhatsApp.
- **Multi-tenancy** com hierarquia: **Master** (admin global) → **Desenvolvedor** (revendedor, grupos e cotas) → **Administrador de grupo** → **Usuário** (dashboard e telas).
- **Subdomínios** por desenvolvedor (ex.: `vion.meudashboard.org`) com marca e login isolados.

### Hierarquia de perfis

| Perfil | Descrição | Área principal |
|--------|-----------|----------------|
| **Master** | Administrador global do sistema | `/admin` |
| **Desenvolvedor** | Revendedor; gerencia grupos, usuários, cotas e recursos | `/dev` |
| **Administrador de grupo** | Gerencia usuários e telas de um grupo | `/administrador/[id]` |
| **Usuário** | Acesso ao dashboard e às telas Power BI | `/dashboard`, `/tela/[id]` |

---

## 2. Arquitetura e stack técnico

### Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS 4 |
| **Backend** | Next.js API Routes (App Router) |
| **Banco de dados** | Supabase (PostgreSQL) |
| **Autenticação** | JWT (jose), cookie `auth-token` (HttpOnly, 7 dias) |
| **IA** | Anthropic Claude (Haiku + Sonnet em estratégia híbrida), OpenAI (transcrição de áudio) |
| **E-mail** | Resend |
| **WhatsApp** | Evolution API (self-hosted ou externa) |
| **Power BI** | REST API, Service Principal, Embed |

### Estrutura do projeto

```
meudahsboard-v2/
├── app/
│   ├── api/                    # API Routes (~138 rotas)
│   │   ├── auth/               # Login, registro, senha, features
│   │   ├── admin/              # Master: usuários, grupos, desenvolvedores
│   │   ├── admin-group/        # Admin de grupo: usuários, logs, telas
│   │   ├── administrador/      # CRUD grupo e usuários do grupo
│   │   ├── dev/                 # Desenvolvedor: grupos, cotas, perfil
│   │   ├── user/                # Grupos do usuário, primeira tela
│   │   ├── powerbi/             # Conexões, relatórios, telas, embed, refresh, alertas
│   │   ├── whatsapp/            # Instâncias, números, grupos, webhook, fila
│   │   ├── assistente-ia/       # Contextos, treinamento, pendentes, execute-dax
│   │   ├── ai/                  # Chat, gerar alerta, feedback, uso
│   │   ├── alertas/             # CRUD alertas, trigger, cron, histórico
│   │   └── ...
│   ├── (auth)/                  # login, cadastro, esqueci-senha, etc.
│   ├── admin/                   # Área master
│   ├── dev/                     # Área desenvolvedor
│   ├── administrador/           # Área admin do grupo
│   ├── dashboard/               # Dashboard do usuário
│   ├── tela/[id]/               # Visualização Power BI + Chat IA
│   ├── powerbi/                 # Conexões, relatórios, telas, ordem, gateways
│   ├── whatsapp/                # Instâncias, números, grupos, mensagens, webhook
│   ├── assistente-ia/           # Contextos, treinar, pendentes, modelo
│   ├── alertas/                 # Listagem, novo, editar, histórico
│   └── ...
├── src/
│   ├── lib/
│   │   ├── auth.ts              # JWT, cookie, getAuthUser
│   │   ├── supabase.ts          # Cliente browser
│   │   ├── supabase/server.ts   # Cliente SSR
│   │   ├── supabase/admin.ts    # Service role (createAdminClient)
│   │   ├── ai/
│   │   │   ├── claude-client.ts # callClaude, hasToolUse, getToolUseBlocks, classifyError
│   │   │   ├── dax-engine.ts    # Execução DAX Power BI
│   │   │   ├── learning.ts      # saveQueryLearning, saveQueryResult
│   │   │   └── ...
│   │   ├── whatsapp/
│   │   │   ├── messaging.ts    # Envio de mensagens
│   │   │   └── audio.ts        # Transcrição (OpenAI)
│   │   ├── assistente-ia/
│   │   │   └── documentation-parser.ts
│   │   ├── email.ts, resend.ts
│   │   └── ...
│   ├── types/                   # User, CompanyGroup, Developer, etc.
│   ├── components/
│   └── contexts/
├── docs/                        # Documentação (este arquivo e demais .md)
├── supabase/
│   └── migrations/              # Migrations SQL
├── middleware.ts                # Proteção de rotas, subdomínios, JWT
└── next.config.ts
```

### Middleware

- **Domínio principal**: rotas públicas (landing, login, cadastro, esqueci-senha, termos, políticas); demais rotas exigem JWT em `auth-token`.
- **Subdomínio** (ex.: `vion.meudashboard.org`): bloqueio de `/admin`, `/dev`, `/cadastro`, `/administrador` e respectivas APIs; raiz redireciona para `/login`; cookie `x-subdomain` para personalização.

---

## 3. Variáveis de ambiente

Obrigatórias em produção:

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima Supabase (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (APIs e admin) |
| `JWT_SECRET` | Assinatura do JWT de sessão |

Para IA e integrações:

| Variável | Uso |
|----------|-----|
| `ANTHROPIC_API_KEY` | Claude (chat, assistente, DAX, alertas) |
| `OPENAI_API_KEY` | Transcrição de áudio (WhatsApp) |

Para e-mail:

| Variável | Uso |
|----------|-----|
| `RESEND_API_KEY` | Envio de e-mails (verificação, senha) |

Para cron (alertas e refresh):

| Variável | Uso |
|----------|-----|
| `CRON_SECRET` | Autenticação das rotas `/api/alertas/cron` e `/api/powerbi/refresh-alerts/cron` |

Opcionais:

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_SITE_URL` | URL base do site (links em e-mails, etc.) |
| `LOG_LEVEL` | Nível de log (`info`, `debug`, etc.) |

*Nota:* Não há `.env.example` no repositório; as variáveis são inferidas do código e da documentação.

---

## 4. Banco de dados – principais entidades

O banco é **PostgreSQL** no Supabase. Principais conjuntos de tabelas:

### Autenticação e multi-tenancy

- **users** – Usuários (email, nome, role, status).
- **company_groups** – Grupos de empresa (tenant lógico).
- **user_company_groups** ou equivalente – Vínculo usuário–grupo (role: admin, manager, operator, viewer).
- **developers** – Desenvolvedores/revendedores.
- **developer_plans** – Planos (limites: grupos, usuários, telas, alertas, mensagens WhatsApp, créditos IA, etc.).
- **developer_users** – Vínculo usuário–desenvolvedor (owner, admin, viewer).

### Power BI

- **powerbi_connections** – Conexões (tenant_id, client_id, client_secret, workspace_id) por `company_group_id`.
- **powerbi_reports** – Relatórios por conexão.
- **powerbi_screens** – Telas (relatório + título, ícone, usuários com acesso).
- **powerbi_refresh_*** – Ordem de atualização, agendamentos, alertas de refresh.
- **daily_usage** – Uso diário por grupo (WhatsApp, alertas, IA, refreshes).

### WhatsApp

- **whatsapp_instances** – Instâncias Evolution API (api_url, api_key, status).
- **whatsapp_instance_groups** – N:N instância–grupo.
- **whatsapp_authorized_numbers** – Números autorizados por grupo (alertas e/ou IA).
- **whatsapp_groups** – Grupos autorizados.
- **whatsapp_messages** – Histórico de mensagens (in/out).
- **whatsapp_message_queue** – Fila de retry quando Claude/DAX falham.

### Assistente de IA

- **ai_model_contexts** – Contextos por dataset (tipo: chat | dax; documentação e base DAX).
- **ai_training_examples** – Exemplos de treinamento com tags.
- **ai_unanswered_questions** – Perguntas pendentes para treinar.
- **query_learning** / lógica em **learning.ts** – Aprendizado de queries DAX (sucesso/erro).

### Alertas

- **alertas** – Regras (consulta DAX, condição, agendamento, destinatários WhatsApp).
- **refresh_alert_daily_log** – Log diário de alertas de refresh.

### Outros

- **email_verifications** – Tokens de verificação de e-mail.
- **lead_proposals** – Propostas comerciais da landing.

Migrations em `supabase/migrations/` e ajustes pontuais em `docs/migrations/`.

---

## 5. Segurança e autenticação

- **Login**: POST `/api/auth/login` (email, senha). Validação via Supabase (service role); geração de JWT com `jose` (payload: id, email, is_master, session_id); cookie `auth-token` (HttpOnly, 7 dias, secure em produção).
- **Rotas protegidas**: middleware lê `auth-token`, verifica JWT com `JWT_SECRET`; em falha retorna 401 (API) ou redireciona para `/login`.
- **Subdomínios**: mesmo JWT; rotas administrativas bloqueadas no middleware.
- **APIs públicas**: webhook WhatsApp, cron de alertas/refresh, leads, auth (login, registro, forgot/reset password).
- **Power BI**: credenciais (client_secret) armazenadas no Supabase; uso apenas server-side com service role.
- **Feature gates**: recurso `ai` e permissões por grupo/desenvolvedor controlam acesso ao assistente IA e funcionalidades ligadas.

---

## 6. Fluxos principais

### 6.1 Login e redirecionamento

1. Usuário acessa `/login` (ou `/` no subdomínio) e envia email/senha.
2. API valida no Supabase, verifica status e vínculos (master, developer, grupo).
3. Gera JWT e seta cookie `auth-token`; redireciona: Master → `/admin`, Desenvolvedor → `/dev`, demais → `/dashboard`.

### 6.2 Webhook WhatsApp → Assistente IA

1. Evolution API envia POST para `/api/whatsapp/webhook` (mensagem recebida).
2. Webhook identifica instância, número e grupo; valida se o número está autorizado e se o grupo tem dataset/conexão para IA.
3. Monta histórico de mensagens e prompt do sistema (documentação + base DAX do dataset).
4. **Estratégia híbrida Claude**: primeira chamada com **Haiku** (barato). Se a ferramenta `execute_dax` falhar, escala para **Sonnet** com o mesmo histórico + erro.
5. Loop de tool use (até 3 iterações): Claude chama `execute_dax` → backend executa DAX no Power BI → resultado volta para o modelo; em caso de erro de DAX com Haiku, nova chamada com Sonnet.
6. Resposta final é extraída; se evasiva ou falha, mensagem amigável; senão envia resposta pelo WhatsApp e grava em `whatsapp_messages`. Em erro temporário, mensagem pode ser enfileirada em `whatsapp_message_queue` para retry.

### 6.3 Chat na tela Power BI

1. Usuário na `/tela/[id]` envia pergunta no chat.
2. Front chama `/api/ai/chat` (ou equivalente) com contexto da tela (dataset, grupo).
3. Backend monta system prompt com contexto do dataset, chama Claude (com ou sem tool `execute_dax`), executa DAX se necessário e devolve resposta ao cliente.

### 6.4 Alertas (cron)

1. Cron externo chama `/api/alertas/cron` (e opcionalmente `/api/powerbi/refresh-alerts/cron`) com `CRON_SECRET`.
2. Sistema avalia condições DAX dos alertas e dispara notificações via WhatsApp quando configurado.

---

## 7. Módulos do sistema

| Módulo | Função principal | Documentação detalhada |
|--------|------------------|------------------------|
| **Power BI** | Conexões (Service Principal), relatórios, telas, embed, ordem de atualização, refresh, alertas de refresh | `docs/DOCUMENTACAO_POWERBI_CONEXOES.md`, `docs/POWERBI_DOCUMENTACAO.md` |
| **WhatsApp** | Instâncias, números/grupos autorizados, webhook, fila, mensagens | `docs/DOCUMENTACAO_WHATSAPP_E_ASSISTENTE_IA.md`, `docs/WHATSAPP_EVOLUTION_API_TECNICO.md` |
| **Assistente IA** | Contextos (chat + DAX), treinamento, pendentes, execute-dax, estratégia Haiku+Sonnet | `docs/PAGINA_CONTEXTOS_IA.md`, `docs/ASSISTENTE_IA_ANALISE.md`, `docs/DOCUMENTACAO_WHATSAPP_E_ASSISTENTE_IA.md` |
| **Alertas** | Regras DAX, disparo manual/cron, histórico | `docs/INVESTIGACAO_ALERTAS_ESTRUTURA.md` |
| **Telas e Chat** | Dashboard, tela Power BI, chat na tela | `docs/DOCUMENTACAO_SISTEMA_TELAS_E_CHAT.md`, `docs/CHAT_SISTEMA_TECNICO.md` |

---

## 8. Referência de páginas e APIs

Para listagem completa de **rotas de páginas** e **endpoints de API**, consulte:

- **[DOCUMENTACAO_COMPLETA_SISTEMA.md](./DOCUMENTACAO_COMPLETA_SISTEMA.md)** – Tabelas de todas as páginas (públicas, dashboard, admin, dev, Power BI, WhatsApp, alertas, assistente IA, configurações) e de todas as APIs (auth, user, admin, admin-group, dev, powerbi, whatsapp, assistente-ia, ai, alertas, config, planos, etc.), além de rotas públicas e fluxo de subdomínios.

Este documento (**DOCUMENTACAO_SISTEMA.md**) complementa aquele com visão de produto, arquitetura, ambiente, banco e fluxos.

---

## 9. Documentação técnica existente

| Documento | Conteúdo |
|-----------|----------|
| **DOCUMENTACAO_COMPLETA_SISTEMA.md** | Páginas e APIs – referência completa |
| **DOCUMENTACAO_WHATSAPP_E_ASSISTENTE_IA.md** | Menu WhatsApp, APIs WhatsApp, tabelas, assistente IA, integrações |
| **PAGINA_CONTEXTOS_IA.md** | Página Contextos da IA (documentação chat + base DAX), APIs, permissões |
| **DOCUMENTACAO_POWERBI_CONEXOES.md** | Conexões Power BI, estrutura de dados, APIs, autenticação |
| **POWERBI_DOCUMENTACAO.md** | Documentação geral Power BI |
| **DOCUMENTACAO_SISTEMA_TELAS_E_CHAT.md** | Telas e chat no sistema |
| **CHAT_SISTEMA_TECNICO.md** | Detalhes técnicos do chat |
| **WHATSAPP_EVOLUTION_API_TECNICO.md** | Integração técnica Evolution API |
| **ASSISTENTE_IA_ANALISE.md** | Análise do assistente de IA |
| **INVESTIGACAO_ALERTAS_ESTRUTURA.md** | Estrutura e investigação de alertas |

---

*Última atualização: março de 2026.*
