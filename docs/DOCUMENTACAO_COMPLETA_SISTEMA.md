# Documentação Completa do Sistema – MeuDashboard

Documento central com **endereços de páginas**, **APIs** e **funcionalidades** do **MeuDashboard** — plataforma SaaS de dashboards Power BI embeddados multi-tenant.

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Endereços de páginas](#2-endereços-de-páginas)
3. [APIs – referência completa](#3-apis--referência-completa)
4. [Funcionalidades por módulo](#4-funcionalidades-por-módulo)
5. [Rotas públicas e middleware](#5-rotas-públicas-e-middleware)
6. [Fluxo de subdomínios](#6-fluxo-de-subdomínios)

---

## 1. Visão geral

O **MeuDashboard** é uma aplicação web multi-tenant que integra:

- **Power BI** – Conexões (Service Principal), relatórios, telas (dashboards) embeddados, ordem de atualização, alertas de refresh
- **WhatsApp** – Evolution API: instâncias, números e grupos autorizados, webhook para mensagens
- **Assistente de IA** – Respostas em linguagem natural (Claude) + consultas DAX ao Power BI
- **Alertas** – Regras baseadas em DAX, disparo manual ou agendado (cron), notificação via WhatsApp

**Hierarquia de acesso:**

| Perfil | Descrição | Área principal |
|--------|-----------|----------------|
| **Master** | Administrador global | `/admin` |
| **Desenvolvedor** | Gerencia grupos, usuários e recursos | `/dev` |
| **Administrador de grupo** | Gerencia usuários e telas do grupo | `/administrador/[id]` |
| **Usuário** | Acesso ao dashboard e telas Power BI | `/dashboard`, `/tela/[id]` |

---

## 2. Endereços de páginas

### 2.1 Páginas públicas (sem login)

| Rota | Descrição |
|------|-----------|
| `/` | Landing page |
| `/login` | Login |
| `/cadastro` | Cadastro de desenvolvedores (com verificação de e-mail) |
| `/esqueci-senha` | Recuperação de senha |
| `/redefinir-senha` | Redefinição de senha via token |
| `/termos-de-uso` | Termos de uso |
| `/politica-de-privacidade` | Política de privacidade (LGPD) |
| `/politica-de-cookies` | Política de cookies |

### 2.2 Dashboard e visualização

| Rota | Descrição | Perfil |
|------|-----------|--------|
| `/dashboard` | Dashboard principal (telas do grupo, estatísticas) | Usuário |
| `/tela/[id]` | Visualização de tela Power BI + Chat IA | Usuário |
| `/perfil` | Perfil do usuário | Autenticado |
| `/meus-logs` | Logs de acesso do usuário | Autenticado |
| `/trocar-senha` | Troca de senha | Autenticado |

### 2.3 Área Master (admin)

| Rota | Descrição |
|------|-----------|
| `/admin` | Dashboard master (estatísticas) |
| `/admin/desenvolvedores` | CRUD de desenvolvedores |
| `/admin/grupos` | CRUD de grupos |
| `/admin/usuarios` | CRUD de usuários |

### 2.4 Área Desenvolvedor

| Rota | Descrição |
|------|-----------|
| `/dev` | Dashboard do desenvolvedor |
| `/dev/perfil` | Perfil, subdomínio, segurança, plano |
| `/dev/groups` | Grupos do desenvolvedor |
| `/dev/groups/[id]` | Detalhes e configuração do grupo |
| `/dev/usuarios` | Usuários do desenvolvedor |
| `/dev/quotas` | Cotas e limites por grupo |
| `/dev/recursos` | Recursos compartilhados |
| `/dev/relatorios` | Relatórios de acesso |

### 2.5 Administrador de grupo

| Rota | Descrição |
|------|-----------|
| `/administrador` | Hub (redireciona para grupo) |
| `/administrador/[id]` | Painel do administrador do grupo |
| `/administrador/[id]/usuarios` | Gestão de usuários do grupo |
| `/administrador/[id]/logs` | Logs do grupo |

### 2.6 Power BI

| Rota | Descrição |
|------|-----------|
| `/powerbi` | Redireciona para telas |
| `/powerbi/telas` | Gestão de telas (screens) |
| `/powerbi/conexoes` | Conexões Power BI |
| `/powerbi/relatorios` | Relatórios Power BI |
| `/powerbi/ordem-atualizacao` | Ordem de atualização de datasets |
| `/powerbi/gateways` | Gateways Power BI (master) |

### 2.7 WhatsApp

| Rota | Descrição |
|------|-----------|
| `/whatsapp` | Redireciona para mensagens |
| `/whatsapp/mensagens` | Histórico de mensagens |
| `/whatsapp/instancias` | Instâncias Evolution API |
| `/whatsapp/numeros` | Números autorizados |
| `/whatsapp/grupos` | Grupos WhatsApp |
| `/whatsapp/webhook` | Configuração do webhook |

### 2.8 Alertas

| Rota | Descrição |
|------|-----------|
| `/alertas` | Listagem de alertas |
| `/alertas/novo` | Criar alerta |
| `/alertas/[id]` | Editar alerta |
| `/alertas/historico` | Histórico de disparos |

### 2.9 Assistente de IA

| Rota | Descrição |
|------|-----------|
| `/assistente-ia` | Hub do assistente |
| `/assistente-ia/contextos` | Contextos/documentação da IA |
| `/assistente-ia/treinar` | Exemplos de treinamento |
| `/assistente-ia/treinar/novo` | Novo exemplo |
| `/assistente-ia/treinar/[id]` | Editar exemplo |
| `/assistente-ia/pendentes` | Perguntas pendentes para treinar |
| `/assistente-ia/modelo` | Metadados do modelo |

### 2.10 Configurações

| Rota | Descrição |
|------|-----------|
| `/configuracoes/logs` | Logs de configuração (admin) |

---

## 3. APIs – referência completa

### 3.1 Autenticação (`/api/auth/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/auth/login` | POST | Login (email, senha) |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/register` | POST | Cadastro de desenvolvedor |
| `/api/auth/verify-email` | POST | Verificação de e-mail |
| `/api/auth/me` | GET | Usuário atual |
| `/api/auth/me` | PUT | Atualizar perfil |
| `/api/auth/forgot-password` | POST | Esqueci senha |
| `/api/auth/reset-password` | POST | Redefinir senha |
| `/api/auth/change-password` | POST | Trocar senha |
| `/api/auth/verify-password` | POST | Verificar senha atual |
| `/api/auth/features` | GET | Features habilitadas para o usuário |
| `/api/auth/my-logs` | GET | Logs de acesso do usuário |

### 3.2 Usuário e grupo (`/api/user/`, `/api/dashboard/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/user/groups` | GET | Grupos do usuário |
| `/api/user/first-screen` | GET | Primeira tela do usuário |
| `/api/dashboard/group-stats` | GET | Estatísticas do grupo |

### 3.3 Admin Master (`/api/admin/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/admin/dashboard-stats` | GET | Estatísticas do painel master |
| `/api/admin/developers` | GET | Listar desenvolvedores |
| `/api/admin/developers` | POST | Criar desenvolvedor |
| `/api/admin/developers/[id]` | GET | Buscar desenvolvedor |
| `/api/admin/developers/[id]` | PUT | Atualizar desenvolvedor |
| `/api/admin/developers/[id]` | DELETE | Excluir desenvolvedor |
| `/api/admin/developers/[id]/quotas` | GET | Cotas do desenvolvedor |
| `/api/admin/developers/[id]/quotas` | PUT | Atualizar cotas |
| `/api/admin/developers/[id]/limits` | GET | Limites do desenvolvedor |
| `/api/admin/developers/[id]/limits` | PUT | Atualizar limites |
| `/api/admin/users` | GET | Listar usuários |
| `/api/admin/users/[id]` | GET | Buscar usuário |
| `/api/admin/users/[id]` | PUT | Atualizar usuário |
| `/api/admin/users/[id]` | DELETE | Excluir usuário |
| `/api/admin/groups` | GET | Listar grupos |
| `/api/admin/groups/[id]` | PATCH | Atualizar grupo |
| `/api/admin/groups/[id]` | DELETE | Excluir grupo |
| `/api/admin/cascade-preview` | GET | Preview de exclusão em cascata |
| `/api/admin/cascade-delete` | POST | Exclusão em cascata |
| `/api/admin/delete-hospcom` | POST | Exclusão específica |
| `/api/admin/stats` | GET | Estatísticas gerais |
| `/api/admin/reports` | GET | Relatórios |

### 3.4 Administrador de grupo (`/api/administrador/`, `/api/admin-group/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/administrador/[id]` | GET | Buscar grupo |
| `/api/administrador/[id]` | PUT | Atualizar grupo |
| `/api/administrador/[id]` | DELETE | Excluir grupo |
| `/api/administrador/[id]/users` | GET | Usuários do grupo |
| `/api/administrador/[id]/users` | POST | Adicionar usuário |
| `/api/administrador/[id]/users` | PUT | Atualizar usuário |
| `/api/administrador/[id]/users` | DELETE | Remover usuário |
| `/api/administrador/[id]/screens` | GET | Telas do grupo |
| `/api/administrador/[id]/screens` | POST | Adicionar tela |
| `/api/administrador/[id]/screens` | PUT | Atualizar tela |
| `/api/administrador/[id]/screens` | DELETE | Remover tela |
| `/api/admin-group` | GET | Grupos onde o usuário é admin |
| `/api/admin-group/usuarios` | GET, POST, PUT, DELETE | Usuários do grupo |
| `/api/admin-group/logs` | GET | Logs do grupo |
| `/api/admin-group/screen-order` | GET, POST | Ordem das telas |
| `/api/admin-group/relatorios` | GET | Relatórios do grupo |

### 3.5 Config (`/api/config/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/config/users` | GET, POST, PUT, DELETE | Usuários do grupo |
| `/api/config/groups` | GET, POST, PUT, DELETE | Grupos |
| `/api/config/logs` | GET, POST | Logs |
| `/api/config/logs/summary` | GET | Resumo de logs |

### 3.6 Desenvolvedor (`/api/dev/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/dev/dashboard` | GET | Dashboard do desenvolvedor |
| `/api/dev/dashboard-stats` | GET | Estatísticas do dashboard |
| `/api/dev/profile` | GET, PUT | Perfil do desenvolvedor |
| `/api/dev/subdomain` | GET, PUT | Subdomínio personalizado |
| `/api/dev/change-password` | PUT | Trocar senha |
| `/api/dev/quotas` | GET, PUT | Cotas por grupo |
| `/api/dev/onboarding-progress` | GET | Progresso do onboarding |
| `/api/dev/shared-resources` | GET, POST, PUT, DELETE | Recursos compartilhados |
| `/api/dev/users` | GET, POST, PUT, DELETE | Usuários |
| `/api/dev/users/screen-order` | GET, POST | Ordem de telas por usuário |
| `/api/dev/groups` | GET, POST | Grupos |
| `/api/dev/groups/[id]` | GET, PUT, DELETE | CRUD de grupo |
| `/api/dev/groups/[id]/clone` | POST | Clonar grupo |
| `/api/dev/groups/[id]/users` | GET, POST, PUT, DELETE | Usuários do grupo |
| `/api/dev/groups/[id]/screens` | GET, POST, PUT, DELETE | Telas do grupo |
| `/api/dev/groups/[id]/screens/[screenId]` | PUT, DELETE | Atualizar/remover tela |
| `/api/dev/access-logs` | GET | Logs de acesso |
| `/api/dev/usage` | GET | Uso do desenvolvedor |

### 3.7 Power BI (`/api/powerbi/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/powerbi/connections` | GET, POST | Conexões |
| `/api/powerbi/connections/[id]` | GET, PUT, DELETE | CRUD de conexão |
| `/api/powerbi/reports` | GET, POST | Relatórios |
| `/api/powerbi/reports/[id]` | GET, PUT, DELETE | CRUD de relatório |
| `/api/powerbi/reports/[id]/pages` | GET | Páginas do relatório |
| `/api/powerbi/screens` | GET, POST | Telas |
| `/api/powerbi/screens/[id]` | GET, PUT, DELETE | CRUD de tela |
| `/api/powerbi/screens/[id]/users` | GET | Usuários da tela |
| `/api/powerbi/screens/user-screen-ids` | GET | IDs de telas do usuário |
| `/api/powerbi/screens/set-user-screens` | POST | Definir telas do usuário |
| `/api/powerbi/embed` | POST | Token de embed |
| `/api/powerbi/refresh` | GET, POST | Refresh de datasets |
| `/api/powerbi/refresh-order` | GET, POST | Ordem de atualização |
| `/api/powerbi/refresh-schedules` | GET, POST, DELETE | Agendamentos de refresh |
| `/api/powerbi/refresh-alerts` | GET, POST, DELETE | Alertas de refresh |
| `/api/powerbi/refresh-alerts/cron` | GET | Cron de alertas de refresh |
| `/api/powerbi/datasets` | GET | Datasets |
| `/api/powerbi/datasets/status` | GET | Status dos datasets |
| `/api/powerbi/dataflows/sync` | GET, POST | Sincronizar dataflows |
| `/api/powerbi/dataflows/status` | GET | Status dos dataflows |
| `/api/powerbi/health` | GET | Saúde da integração |

### 3.8 WhatsApp (`/api/whatsapp/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/whatsapp/webhook` | GET, POST | Webhook Evolution API |
| `/api/whatsapp/webhook/process-queue` | GET, POST | Processar fila de mensagens |
| `/api/whatsapp/webhook/messages-upsert` | GET, POST | Upsert de mensagens |
| `/api/whatsapp/webhook/contacts-update` | GET, POST | Atualização de contatos |
| `/api/whatsapp/webhook/chats-update` | GET, POST | Atualização de chats |
| `/api/whatsapp/instances` | GET, POST, PUT, DELETE | Instâncias Evolution API |
| `/api/whatsapp/authorized-numbers` | GET, POST, PUT, DELETE | Números autorizados |
| `/api/whatsapp/groups` | GET, POST, PUT, DELETE | Grupos WhatsApp |
| `/api/whatsapp/messages` | GET | Mensagens |
| `/api/whatsapp/usage` | GET | Uso do WhatsApp |

### 3.9 Alertas (`/api/alertas/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/alertas` | GET, POST | Listar e criar alertas |
| `/api/alertas` | PUT, DELETE | Atualizar e excluir (id no body) |
| `/api/alertas/[id]` | GET, PUT, DELETE | Buscar, atualizar e excluir alerta |
| `/api/alertas/[id]/trigger` | POST | Disparar alerta manualmente |
| `/api/alertas/[id]/clone` | POST | Clonar alerta |
| `/api/alertas/historico` | GET | Histórico de disparos |
| `/api/alertas/cron` | GET | Cron de verificação (público) |

### 3.10 Assistente IA (`/api/assistente-ia/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/assistente-ia/context` | GET, POST, DELETE | Contextos do modelo |
| `/api/assistente-ia/datasets` | GET | Datasets para IA |
| `/api/assistente-ia/training` | GET, POST, PUT, DELETE | Exemplos de treinamento |
| `/api/assistente-ia/training/test` | POST | Testar treinamento |
| `/api/assistente-ia/pending` | GET, PATCH, DELETE | Perguntas pendentes |
| `/api/assistente-ia/model-metadata` | GET | Metadados do modelo |
| `/api/assistente-ia/model-structure` | GET | Estrutura do modelo |
| `/api/assistente-ia/questions` | GET | Perguntas |
| `/api/assistente-ia/questions/[id]` | POST | Ação em pergunta |
| `/api/assistente-ia/stats` | GET | Estatísticas da IA |
| `/api/assistente-ia/execute-dax` | POST | Executar DAX via IA |
| `/api/assistente-ia/column-values` | GET | Valores de coluna |

### 3.11 AI (`/api/ai/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/ai/chat` | POST | Chat com IA |
| `/api/ai/generate-alert` | POST | Gerar alerta via IA |
| `/api/ai/feedback` | POST | Feedback de respostas |
| `/api/ai/context/upload` | POST | Upload de contexto |
| `/api/ai/context/parse` | POST | Parse de contexto |
| `/api/ai/usage` | GET | Uso da IA |

### 3.12 Planos e upload (`/api/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/plans/developer` | GET | Plano do desenvolvedor |

### 3.13 Outros (`/api/`)

| Rota | Método | Descrição |
|------|--------|-----------|
| `/api/subdomain/check-availability` | GET | Verificar disponibilidade de subdomínio |
| `/api/subdomain/[slug]` | GET | Dados do subdomínio |
| `/api/modules/groups` | GET, POST, DELETE | Módulos/grupos |
| `/api/leads/proposta` | POST | Envio de proposta comercial |
| `/api/upload` | * | Upload genérico |
| `/api/upload/logo` | * | Upload de logo |
| `/api/usage/dashboard` | GET | Uso no dashboard |

---

## 4. Funcionalidades por módulo

### 4.1 Autenticação

- Login com e-mail e senha; JWT em cookie `auth-token` (HttpOnly, 7 dias)
- Cadastro de desenvolvedores com verificação de e-mail
- Recuperação e redefinição de senha
- Troca de senha para usuários autenticados
- Suporte a subdomínios (ex.: `vion.meudashboard.org`) com personalização de marca
- Redirecionamento pós-login: Master → `/admin`, Desenvolvedor → `/dev`, demais → `/dashboard`

### 4.2 Dashboard e telas Power BI

- Dashboard com cards das telas do grupo e estatísticas
- Visualização de tela Power BI em tela cheia com embed
- Chat IA na tela para perguntas em linguagem natural
- Refresh manual e navegação entre páginas do relatório
- Primeira tela configurável por usuário

### 4.3 Power BI – Configuração

- Conexões via Service Principal (tenant_id, client_id, client_secret, workspace_id)
- Relatórios e datasets das conexões
- Telas (screens): título, ícone, relatório vinculado, usuários com acesso
- Ordem de atualização de datasets (arrastar para reordenar)
- Agendamento de refresh
- Alertas de refresh via WhatsApp (erro, atraso, relatório diário)
- Gateways (apenas master)

### 4.4 WhatsApp

- Instâncias Evolution API (nome, URL, API key)
- Números autorizados para alertas e chat IA
- Grupos autorizados
- Histórico de mensagens
- Webhook para receber mensagens e acionar IA

### 4.5 Alertas

- Alertas baseados em consultas DAX (limite, anomalia, meta)
- Disparo manual e agendado (cron)
- Notificação via WhatsApp
- Histórico de disparos
- Clonagem de alertas

### 4.6 Assistente de IA

- Contextos/documentação por dataset (chat e DAX)
- Exemplos de treinamento com tags
- Perguntas pendentes para treinar
- Execução de DAX via IA
- Chat na tela Power BI e via WhatsApp

### 4.7 Área Master

- Dashboard com estatísticas (desenvolvedores, grupos, usuários, telas)
- CRUD de desenvolvedores com plano e cotas
- CRUD de grupos e usuários
- Exclusão em cascata com preview
- Logs de atividades

### 4.8 Área Desenvolvedor

- Dashboard com estatísticas dos grupos
- CRUD de grupos com clonagem
- Gestão de usuários e permissões
- Distribuição de cotas entre grupos
- Perfil: subdomínio, segurança, plano
- Recursos compartilhados
- Relatórios de acesso

### 4.9 Administrador de grupo

- Gestão de usuários do grupo (roles, permissões, telas)
- Logs do grupo
- Ordenação de telas

### 4.10 Leads e proposta

- Formulário de proposta comercial na landing
- Envio para WhatsApp (empresa, contato, tipo de uso, etc.)

---

## 5. Rotas públicas e middleware

### Domínio principal (meudashboard.org)

**Rotas públicas (sem login):**

- `/` — Landing
- `/login` — Login
- `/cadastro` — Cadastro
- `/esqueci-senha` — Esqueci senha
- `/redefinir-senha` — Redefinir senha
- `/termos-de-uso` — Termos de uso
- `/politica-de-privacidade` — Política de privacidade
- `/politica-de-cookies` — Política de cookies

**APIs públicas:**

- `/api/auth/login`, `/api/auth/logout`, `/api/auth/register`, `/api/auth/verify-email`
- `/api/auth/forgot-password`, `/api/auth/reset-password`
- `/api/whatsapp/webhook` (e subrotas)
- `/api/alertas/cron`
- `/api/leads/proposta`

**Demais rotas:** exigem JWT válido no cookie `auth-token`.

---

## 6. Fluxo de subdomínios

**Subdomínio** (ex.: `vion.meudashboard.org`):

- **Bloqueadas:** `/admin`, `/dev`, `/cadastro`, `/administrador`, `/api/admin`, `/api/dev`
- **Públicas:** `/`, `/login`, `/esqueci-senha`, `/redefinir-senha`, `/termos-de-uso`, `/politica-de-privacidade`, `/politica-de-cookies`
- **Raiz (`/`):** redireciona para `/login`
- **Cookie `x-subdomain`:** identifica o subdomínio para personalização
- **APIs e rotas protegidas:** exigem JWT válido

---

## Resumo rápido

| Área | Páginas principais | APIs principais |
|------|---------------------|-----------------|
| **Auth** | `/login`, `/cadastro` | `/api/auth/*` |
| **Dashboard** | `/dashboard`, `/tela/[id]` | `/api/user/*`, `/api/powerbi/embed` |
| **Admin** | `/admin/*` | `/api/admin/*` |
| **Dev** | `/dev/*` | `/api/dev/*` |
| **Power BI** | `/powerbi/*` | `/api/powerbi/*` |
| **WhatsApp** | `/whatsapp/*` | `/api/whatsapp/*` |
| **Alertas** | `/alertas/*` | `/api/alertas/*` |
| **Assistente IA** | `/assistente-ia/*` | `/api/assistente-ia/*`, `/api/ai/*` |

---

*Última atualização: fevereiro de 2026.*
