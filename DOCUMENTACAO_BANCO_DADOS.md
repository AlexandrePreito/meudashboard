# 🗄️ Documentação Completa - Banco de Dados Supabase

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Diagrama de Relacionamento](#diagrama-de-relacionamento)
3. [Tabelas Core (Usuários e Grupos)](#tabelas-core)
4. [Tabelas de Módulos e Planos](#tabelas-de-módulos-e-planos)
5. [Tabelas Power BI](#tabelas-power-bi)
6. [Tabelas WhatsApp](#tabelas-whatsapp)
7. [Tabelas de Alertas](#tabelas-de-alertas)
8. [Tabelas de IA](#tabelas-de-ia)
9. [Tabelas de Auditoria](#tabelas-de-auditoria)
10. [Triggers e Funções](#triggers-e-funções)
11. [Índices de Performance](#índices-de-performance)
12. [Políticas RLS](#políticas-rls)
13. [Queries Úteis](#queries-úteis)
14. [Migrations e Versionamento](#migrations-e-versionamento)

---

## 🎯 Visão Geral

### Características do Banco

```yaml
SGBD: PostgreSQL 15+ (Supabase)
Charset: UTF-8
Timezone: UTC
Total de Tabelas: 23+
Relacionamentos: N:N, 1:N
Features:
  - Row Level Security (RLS)
  - Triggers automáticos
  - JSONB para flexibilidade
  - UUIDs para IDs
  - Timestamps automáticos
  - Soft deletes em algumas tabelas
```

### Organização das Tabelas

```
┌─────────────────────────────────────────────┐
│              CAMADAS DO BANCO                │
├─────────────────────────────────────────────┤
│                                              │
│  1️⃣ CORE (Base)                             │
│     └─ users, company_groups, companies     │
│                                              │
│  2️⃣ CONTROLE DE ACESSO                      │
│     └─ user_group_memberships               │
│                                              │
│  3️⃣ LICENCIAMENTO                           │
│     └─ modules, module_groups, plans        │
│                                              │
│  4️⃣ FUNCIONALIDADES                         │
│     ├─ Power BI (connections, screens...)   │
│     ├─ WhatsApp (instances, groups...)      │
│     ├─ Alertas (alertas, history...)        │
│     └─ IA (contexts, usage...)              │
│                                              │
│  5️⃣ AUDITORIA                               │
│     └─ activity_logs, ai_usage_logs         │
│                                              │
└─────────────────────────────────────────────┘
```

---

## 📊 Diagrama de Relacionamento

### Relacionamento Geral

```
┌──────────────┐
│    users     │──────┐
└──────────────┘      │
                      │ N:N (via user_group_memberships)
                      │
                      ↓
              ┌───────────────┐
              │company_groups │←──────┐
              └───────────────┘       │
                      │               │
                      │ 1:N           │ 1:N
                      ↓               │
              ┌───────────────┐       │
              │  companies    │       │
              └───────────────┘       │
                                      │
              ┌───────────────┐       │
              │powerbi_plans  │───────┘ (plan_id)
              └───────────────┘

┌───────────────┐       ┌────────────────────┐
│   modules     │←──────│  module_groups     │
└───────────────┘  N:N  └────────────────────┘
                              │
                              │ N:1
                              ↓
                        ┌───────────────┐
                        │company_groups │
                        └───────────────┘
```

### Relacionamento Power BI

```
┌───────────────────┐
│ company_groups    │
└───────────────────┘
         │
         │ 1:N
         ↓
┌──────────────────────────┐
│ powerbi_connections      │
└──────────────────────────┘
         │
         ├──── 1:N ────→ ┌────────────────────┐
         │               │ powerbi_datasets   │
         │               └────────────────────┘
         │                       │
         │                       │ 1:N
         │                       ↓
         │               ┌────────────────────┐
         │               │ ai_model_contexts  │
         │               └────────────────────┘
         │
         └──── 1:N ────→ ┌────────────────────┐
                         │ powerbi_screens    │
                         └────────────────────┘
                                 │
                                 │ N:N (via powerbi_screen_users)
                                 ↓
                         ┌────────────────────┐
                         │      users         │
                         └────────────────────┘
```

### Relacionamento WhatsApp

```
┌───────────────────┐
│ company_groups    │
└───────────────────┘
         │
         │ 1:N
         ├──→ ┌─────────────────────────┐
         │    │ whatsapp_instances      │
         │    └─────────────────────────┘
         │
         ├──→ ┌─────────────────────────┐
         │    │ whatsapp_groups         │
         │    └─────────────────────────┘
         │
         ├──→ ┌─────────────────────────┐
         │    │ whatsapp_authorized_nums│
         │    └─────────────────────────┘
         │
         └──→ ┌─────────────────────────┐
              │ whatsapp_messages       │
              └─────────────────────────┘
```

---

## 📋 Tabelas Core

### 1. `users` (Usuários do Sistema)

**Descrição:** Tabela principal de autenticação e perfil de usuários.

```sql
CREATE TABLE users (
  -- Identificação (UUID do Supabase Auth)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados pessoais
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  
  -- Permissões globais
  is_master BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadados
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_master ON users(is_master);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema com autenticação Supabase';
COMMENT ON COLUMN users.is_master IS 'Administrador global do sistema';
COMMENT ON COLUMN users.metadata IS 'Dados extras flexíveis (preferências, configurações)';
```

**Campos:**

| Campo | Tipo | Nullable | Default | Descrição |
|-------|------|----------|---------|-----------|
| `id` | UUID | NOT NULL | - | ID do Supabase Auth |
| `full_name` | TEXT | NOT NULL | - | Nome completo |
| `email` | TEXT | NOT NULL | - | Email único |
| `avatar_url` | TEXT | NULL | NULL | URL do avatar |
| `is_master` | BOOLEAN | NOT NULL | false | Admin global? |
| `is_active` | BOOLEAN | NOT NULL | true | Usuário ativo? |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | Data de criação |
| `updated_at` | TIMESTAMPTZ | NOT NULL | NOW() | Última atualização |
| `last_login_at` | TIMESTAMPTZ | NULL | NULL | Último login |
| `metadata` | JSONB | NOT NULL | {} | Dados extras |

**Exemplo de dados:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "full_name": "João da Silva",
  "email": "joao@empresa.com",
  "avatar_url": "https://...",
  "is_master": false,
  "is_active": true,
  "metadata": {
    "phone": "+5511999999999",
    "theme": "dark",
    "notifications_enabled": true
  }
}
```

---

### 2. `company_groups` (Grupos de Empresas)

**Descrição:** Representa um grupo/licença que pode conter múltiplas empresas.

```sql
CREATE TABLE company_groups (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  
  -- Licenciamento
  plan_id UUID REFERENCES powerbi_plans(id),
  
  -- Limites customizados (sobrescreve plano)
  max_users INTEGER,
  max_companies INTEGER,
  max_powerbi_screens INTEGER,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  
  -- Configurações
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Billing
  subscription_start_date DATE,
  subscription_end_date DATE,
  billing_email TEXT
);

-- Índices
CREATE INDEX idx_company_groups_status ON company_groups(status);
CREATE INDEX idx_company_groups_plan_id ON company_groups(plan_id);
CREATE INDEX idx_company_groups_created_by ON company_groups(created_by);

-- Comentários
COMMENT ON TABLE company_groups IS 'Grupos de empresas com licenciamento independente';
COMMENT ON COLUMN company_groups.max_users IS 'Limite customizado de usuários (null = usar do plano)';
COMMENT ON COLUMN company_groups.settings IS 'Configurações personalizadas do grupo';
```

**Campos:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único |
| `name` | TEXT | Nome do grupo |
| `plan_id` | UUID | Plano contratado (FK) |
| `max_users` | INTEGER | Limite customizado usuários |
| `max_companies` | INTEGER | Limite customizado empresas |
| `max_powerbi_screens` | INTEGER | Limite customizado telas |
| `status` | TEXT | active, suspended, cancelled |
| `logo_url` | TEXT | URL do logotipo |
| `primary_color` | TEXT | Cor primária (hex) |
| `settings` | JSONB | Configurações extras |
| `subscription_start_date` | DATE | Início assinatura |
| `subscription_end_date` | DATE | Fim assinatura |
| `billing_email` | TEXT | Email de cobrança |

**Exemplo de settings:**

```json
{
  "allow_user_registration": false,
  "require_2fa": false,
  "session_timeout_minutes": 480,
  "default_language": "pt-BR",
  "custom_domain": "dashboard.empresa.com"
}
```

---

### 3. `companies` (Empresas)

**Descrição:** Empresas dentro de um grupo (ex: filiais).

```sql
CREATE TABLE companies (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Dados da empresa
  name TEXT NOT NULL,
  cnpj TEXT,
  tax_id TEXT,
  
  -- Endereço
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'BR',
  postal_code TEXT,
  
  -- Contato
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_companies_company_group_id ON companies(company_group_id);
CREATE INDEX idx_companies_cnpj ON companies(cnpj);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Comentários
COMMENT ON TABLE companies IS 'Empresas/Filiais dentro de um grupo';
COMMENT ON COLUMN companies.cnpj IS 'CNPJ apenas para Brasil';
COMMENT ON COLUMN companies.tax_id IS 'ID fiscal para outros países';
```

**Exemplo:**

```json
{
  "id": "uuid",
  "company_group_id": "uuid-do-grupo",
  "name": "Filial Centro",
  "cnpj": "12.345.678/0001-99",
  "city": "São Paulo",
  "state": "SP",
  "is_active": true
}
```

---

### 4. `user_group_memberships` (Associação Usuário ↔ Grupo)

**Descrição:** Relacionamento N:N entre usuários e grupos com role.

```sql
CREATE TABLE user_group_memberships (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Role no grupo
  role TEXT NOT NULL DEFAULT 'viewer' 
    CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Permissões extras (opcional)
  permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  -- Constraint: usuário não pode estar duas vezes no mesmo grupo
  UNIQUE(user_id, company_group_id)
);

-- Índices
CREATE INDEX idx_user_group_memberships_user_id ON user_group_memberships(user_id);
CREATE INDEX idx_user_group_memberships_group_id ON user_group_memberships(company_group_id);
CREATE INDEX idx_user_group_memberships_role ON user_group_memberships(role);
CREATE INDEX idx_user_group_memberships_is_active ON user_group_memberships(is_active);

-- Comentários
COMMENT ON TABLE user_group_memberships IS 'Usuários pertencentes a grupos com roles';
COMMENT ON COLUMN user_group_memberships.role IS 'Papel do usuário: admin, manager, operator, viewer';
COMMENT ON COLUMN user_group_memberships.permissions IS 'Permissões específicas granulares';
```

**Roles e Permissões:**

| Role | Descrição | Permissões Típicas |
|------|-----------|-------------------|
| `admin` | Administrador do grupo | Tudo exceto deletar grupo |
| `manager` | Gerente | Criar/editar recursos, gerenciar usuários |
| `operator` | Operador | Usar recursos, disparar ações |
| `viewer` | Visualizador | Apenas visualizar |

**Exemplo de permissions:**

```json
{
  "can_create_screens": true,
  "can_delete_alerts": false,
  "can_send_whatsapp": true,
  "max_alerts": 50
}
```

---

## 🧩 Tabelas de Módulos e Planos

### 5. `modules` (Módulos do Sistema)

```sql
CREATE TABLE modules (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Package',
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_modules_name ON modules(name);
CREATE INDEX idx_modules_sort_order ON modules(sort_order);
CREATE INDEX idx_modules_is_enabled ON modules(is_enabled);

-- Dados padrão
INSERT INTO modules (name, display_name, description, icon, sort_order)
VALUES 
  ('powerbi', 'Power BI', 'Dashboards e relatórios interativos', 'BarChart3', 1),
  ('whatsapp', 'WhatsApp', 'Integração com WhatsApp', 'MessageCircle', 2),
  ('alertas', 'Alertas', 'Sistema de alertas automáticos', 'Bell', 3),
  ('ia', 'Inteligência Artificial', 'Assistente de IA', 'Bot', 4);
```

---

### 6. `module_groups` (Módulos Habilitados por Grupo)

```sql
CREATE TABLE module_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, company_group_id)
);

-- Índices
CREATE INDEX idx_module_groups_module_id ON module_groups(module_id);
CREATE INDEX idx_module_groups_company_group_id ON module_groups(company_group_id);
```

---

### 7. `powerbi_plans` (Planos de Licenciamento)

```sql
CREATE TABLE powerbi_plans (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Limites
  max_daily_refreshes INTEGER NOT NULL DEFAULT 1,
  max_powerbi_screens INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_companies INTEGER NOT NULL DEFAULT 2,
  
  -- Apresentação
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Preço (opcional)
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_powerbi_plans_display_order ON powerbi_plans(display_order);
CREATE INDEX idx_powerbi_plans_is_active ON powerbi_plans(is_active);

-- Planos padrão
INSERT INTO powerbi_plans (name, description, max_daily_refreshes, max_powerbi_screens, max_users, max_companies, display_order)
VALUES 
  ('Plano Básico', 'Ideal para pequenas empresas', 5, 3, 5, 1, 1),
  ('Plano Profissional', 'Para empresas em crescimento', 20, 10, 20, 5, 2),
  ('Plano Enterprise', 'Recursos ilimitados', 999, 999, 999, 999, 3);
```

---

## 📊 Tabelas Power BI

### 8. `powerbi_connections` (Conexões Power BI)

```sql
CREATE TABLE powerbi_connections (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Dados da conexão
  name TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  
  -- Credenciais (criptografadas)
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL, -- Usar Supabase Vault em produção
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_powerbi_connections_group_id ON powerbi_connections(company_group_id);
CREATE INDEX idx_powerbi_connections_is_active ON powerbi_connections(is_active);
CREATE INDEX idx_powerbi_connections_workspace_id ON powerbi_connections(workspace_id);

COMMENT ON TABLE powerbi_connections IS 'Conexões com workspaces do Power BI';
COMMENT ON COLUMN powerbi_connections.client_secret IS 'ATENÇÃO: Usar Supabase Vault para segurança';
```

---

### 9. `powerbi_datasets` (Datasets Power BI)

```sql
CREATE TABLE powerbi_datasets (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Dados do Power BI
  dataset_id TEXT NOT NULL, -- ID no Power BI
  name TEXT NOT NULL,
  
  -- Configurações de refresh
  is_refreshable BOOLEAN DEFAULT true,
  configured_by TEXT,
  
  -- Metadata
  tables JSONB DEFAULT '[]'::jsonb,
  measures JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_refresh_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_powerbi_datasets_connection_id ON powerbi_datasets(connection_id);
CREATE INDEX idx_powerbi_datasets_group_id ON powerbi_datasets(company_group_id);
CREATE INDEX idx_powerbi_datasets_dataset_id ON powerbi_datasets(dataset_id);

COMMENT ON COLUMN powerbi_datasets.tables IS 'Lista de tabelas do dataset';
COMMENT ON COLUMN powerbi_datasets.measures IS 'Lista de medidas DAX disponíveis';
```

**Exemplo de tables e measures:**

```json
{
  "tables": [
    {"name": "Vendas", "rowCount": 150000},
    {"name": "Clientes", "rowCount": 5000},
    {"name": "Produtos", "rowCount": 1200}
  ],
  "measures": [
    {"name": "Total Vendas", "expression": "SUM(Vendas[Valor])"},
    {"name": "Ticket Médio", "expression": "DIVIDE([Total Vendas], [Qtd Vendas])"}
  ]
}
```

---

### 10. `powerbi_screens` (Telas/Dashboards)

```sql
CREATE TABLE powerbi_screens (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  
  -- Dados da tela
  name TEXT NOT NULL,
  description TEXT,
  
  -- Embed Info
  report_id TEXT NOT NULL,
  dataset_id TEXT,
  page_name TEXT,
  
  -- Configurações de exibição
  show_filter_pane BOOLEAN DEFAULT false,
  show_page_navigation BOOLEAN DEFAULT true,
  
  -- Filtros RLS (Row Level Security)
  filters JSONB DEFAULT '[]'::jsonb,
  
  -- Publicação
  is_public BOOLEAN DEFAULT false,
  public_url_token TEXT UNIQUE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_powerbi_screens_group_id ON powerbi_screens(company_group_id);
CREATE INDEX idx_powerbi_screens_connection_id ON powerbi_screens(connection_id);
CREATE INDEX idx_powerbi_screens_report_id ON powerbi_screens(report_id);
CREATE INDEX idx_powerbi_screens_is_active ON powerbi_screens(is_active);
CREATE INDEX idx_powerbi_screens_public_url_token ON powerbi_screens(public_url_token);

COMMENT ON TABLE powerbi_screens IS 'Telas/Dashboards do Power BI configuradas';
COMMENT ON COLUMN powerbi_screens.filters IS 'Filtros RLS aplicados dinamicamente';
COMMENT ON COLUMN powerbi_screens.public_url_token IS 'Token para acesso público (sem login)';
```

**Exemplo de filters:**

```json
[
  {
    "$schema": "http://powerbi.com/product/schema#basic",
    "target": {
      "table": "Vendas",
      "column": "Filial"
    },
    "operator": "In",
    "values": ["Filial Centro", "Filial Sul"]
  }
]
```

---

### 11. `powerbi_screen_users` (Controle de Acesso por Tela)

```sql
CREATE TABLE powerbi_screen_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id UUID NOT NULL REFERENCES powerbi_screens(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Permissões
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  
  -- Filtros específicos do usuário
  user_filters JSONB DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES users(id),
  
  UNIQUE(screen_id, user_id)
);

-- Índices
CREATE INDEX idx_powerbi_screen_users_screen_id ON powerbi_screen_users(screen_id);
CREATE INDEX idx_powerbi_screen_users_user_id ON powerbi_screen_users(user_id);

COMMENT ON TABLE powerbi_screen_users IS 'Controle granular de acesso às telas';
COMMENT ON COLUMN powerbi_screen_users.user_filters IS 'Filtros RLS específicos por usuário';
```

---

### 12. `powerbi_refresh_order` (Ordem de Atualização)

```sql
CREATE TABLE powerbi_refresh_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Items na ordem
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(company_group_id)
);

-- Índice
CREATE INDEX idx_powerbi_refresh_order_group ON powerbi_refresh_order(company_group_id);

COMMENT ON COLUMN powerbi_refresh_order.items IS 'Array JSON com datasets/dataflows na ordem';
```

**Exemplo de items:**

```json
[
  {
    "id": "uuid1",
    "name": "Dataset Base",
    "type": "dataset",
    "dataset_id": "powerbi-dataset-id",
    "order": 1
  },
  {
    "id": "uuid2",
    "name": "Dataflow Vendas",
    "type": "dataflow",
    "dataflow_id": "powerbi-dataflow-id",
    "order": 2
  },
  {
    "id": "uuid3",
    "name": "Dataset Final",
    "type": "dataset",
    "dataset_id": "powerbi-dataset-id-2",
    "order": 3
  }
]
```

---

### 13. `powerbi_refresh_log` (Log de Atualizações)

```sql
CREATE TABLE powerbi_refresh_log (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  dataset_id TEXT NOT NULL,
  
  -- Tipo
  refresh_type TEXT NOT NULL CHECK (refresh_type IN ('manual', 'scheduled', 'api')),
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Contexto
  triggered_by UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX idx_powerbi_refresh_log_group_id ON powerbi_refresh_log(company_group_id);
CREATE INDEX idx_powerbi_refresh_log_dataset_id ON powerbi_refresh_log(dataset_id);
CREATE INDEX idx_powerbi_refresh_log_started_at ON powerbi_refresh_log(started_at);
CREATE INDEX idx_powerbi_refresh_log_status ON powerbi_refresh_log(status);

COMMENT ON TABLE powerbi_refresh_log IS 'Histórico de atualizações de datasets';
```

---

## 📱 Tabelas WhatsApp

### 14. `whatsapp_instances` (Instâncias WhatsApp)

```sql
CREATE TABLE whatsapp_instances (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Dados da instância
  name TEXT NOT NULL,
  instance_name TEXT NOT NULL UNIQUE, -- Nome na Evolution API
  
  -- Conexão
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL, -- Criptografar em produção
  
  -- Status
  status TEXT DEFAULT 'disconnected' 
    CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
  qr_code TEXT, -- QR code temporário
  phone_number TEXT, -- Número conectado
  
  -- Webhook
  webhook_url TEXT,
  webhook_events TEXT[] DEFAULT ARRAY['messages.upsert'],
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_connected_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_whatsapp_instances_group_id ON whatsapp_instances(company_group_id);
CREATE INDEX idx_whatsapp_instances_instance_name ON whatsapp_instances(instance_name);
CREATE INDEX idx_whatsapp_instances_status ON whatsapp_instances(status);

COMMENT ON TABLE whatsapp_instances IS 'Instâncias WhatsApp via Evolution API';
COMMENT ON COLUMN whatsapp_instances.qr_code IS 'QR code para conexão (temporário)';
```

---

### 15. `whatsapp_groups` (Grupos WhatsApp)

```sql
CREATE TABLE whatsapp_groups (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  
  -- Dados do grupo
  group_id TEXT NOT NULL, -- ID do WhatsApp (ex: 5511999999999-1234567890@g.us)
  group_name TEXT NOT NULL,
  description TEXT,
  
  -- Participantes
  participants JSONB DEFAULT '[]'::jsonb,
  admins JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(instance_id, group_id)
);

-- Índices
CREATE INDEX idx_whatsapp_groups_company_group_id ON whatsapp_groups(company_group_id);
CREATE INDEX idx_whatsapp_groups_instance_id ON whatsapp_groups(instance_id);
CREATE INDEX idx_whatsapp_groups_group_id ON whatsapp_groups(group_id);

COMMENT ON TABLE whatsapp_groups IS 'Grupos WhatsApp cadastrados para envio';
```

**Exemplo de participants e admins:**

```json
{
  "participants": [
    {"number": "5511999999999", "name": "João Silva"},
    {"number": "5511888888888", "name": "Maria Santos"}
  ],
  "admins": [
    {"number": "5511999999999", "name": "João Silva"}
  ]
}
```

---

### 16. `whatsapp_authorized_numbers` (Números Autorizados)

```sql
CREATE TABLE whatsapp_authorized_numbers (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  
  -- Dados do número
  phone_number TEXT NOT NULL, -- Formato: 5511999999999
  name TEXT,
  
  -- Categorização
  tags TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(instance_id, phone_number)
);

-- Índices
CREATE INDEX idx_whatsapp_authorized_numbers_group_id ON whatsapp_authorized_numbers(company_group_id);
CREATE INDEX idx_whatsapp_authorized_numbers_instance_id ON whatsapp_authorized_numbers(instance_id);
CREATE INDEX idx_whatsapp_authorized_numbers_phone ON whatsapp_authorized_numbers(phone_number);
CREATE INDEX idx_whatsapp_authorized_numbers_tags ON whatsapp_authorized_numbers USING GIN(tags);

COMMENT ON TABLE whatsapp_authorized_numbers IS 'Números autorizados para envio individual';
COMMENT ON COLUMN whatsapp_authorized_numbers.tags IS 'Tags para segmentação (ex: "clientes", "fornecedores")';
```

---

### 17. `whatsapp_messages` (Mensagens WhatsApp)

```sql
CREATE TABLE whatsapp_messages (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  
  -- Destinatário
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('number', 'group')),
  recipient_id TEXT NOT NULL, -- phone number ou group_id
  
  -- Mensagem
  message_type TEXT NOT NULL DEFAULT 'text' 
    CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  message_content TEXT NOT NULL,
  media_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  error_message TEXT,
  
  -- IDs externos
  whatsapp_message_id TEXT, -- ID retornado pelo WhatsApp
  
  -- Contexto
  alert_id UUID, -- Se veio de um alerta
  campaign_id UUID, -- Se veio de uma campanha
  
  -- Timing
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_whatsapp_messages_group_id ON whatsapp_messages(company_group_id);
CREATE INDEX idx_whatsapp_messages_instance_id ON whatsapp_messages(instance_id);
CREATE INDEX idx_whatsapp_messages_recipient_id ON whatsapp_messages(recipient_id);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_alert_id ON whatsapp_messages(alert_id);

COMMENT ON TABLE whatsapp_messages IS 'Histórico de mensagens enviadas';
```

---

## 🔔 Tabelas de Alertas

### 18. `alertas` (Alertas Configurados)

```sql
CREATE TABLE alertas (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Dados básicos
  name TEXT NOT NULL,
  description TEXT,
  alert_type TEXT NOT NULL DEFAULT 'scheduled_report'
    CHECK (alert_type IN ('threshold', 'anomaly', 'comparison', 'goal', 'scheduled_report')),
  
  -- Conexão Power BI
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  dataset_id TEXT NOT NULL,
  dax_query TEXT NOT NULL,
  
  -- Condição
  condition TEXT CHECK (condition IN ('greater_than', 'less_than', 'equals', 'not_equals', 'greater_or_equal', 'less_or_equal')),
  threshold DECIMAL(18,4),
  
  -- Agendamento
  schedule_type TEXT NOT NULL DEFAULT 'once'
    CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly', 'custom_cron')),
  schedule_time TIME, -- Ex: 08:00:00
  schedule_days INTEGER[] DEFAULT '{}', -- 0-6 (domingo-sábado)
  schedule_cron TEXT, -- Ex: "0 8 * * 1-5"
  
  -- Notificação WhatsApp
  whatsapp_instance_id UUID REFERENCES whatsapp_instances(id),
  message_template TEXT NOT NULL,
  recipient_type TEXT CHECK (recipient_type IN ('numbers', 'groups', 'both')),
  recipient_numbers TEXT[] DEFAULT '{}',
  recipient_groups TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  next_execution_at TIMESTAMP WITH TIME ZONE,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_alertas_company_group_id ON alertas(company_group_id);
CREATE INDEX idx_alertas_connection_id ON alertas(connection_id);
CREATE INDEX idx_alertas_is_active ON alertas(is_active);
CREATE INDEX idx_alertas_next_execution_at ON alertas(next_execution_at) WHERE is_active = true;
CREATE INDEX idx_alertas_alert_type ON alertas(alert_type);

COMMENT ON TABLE alertas IS 'Alertas configurados baseados em DAX';
COMMENT ON COLUMN alertas.schedule_days IS 'Array de dias da semana (0=domingo, 6=sábado)';
COMMENT ON COLUMN alertas.message_template IS 'Template com variáveis: {{nome_alerta}}, {{valor}}, {{data}}, {{hora}}';
```

---

### 19. `alert_history` (Histórico de Execuções)

```sql
CREATE TABLE alert_history (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Execução
  execution_type TEXT NOT NULL CHECK (execution_type IN ('manual', 'scheduled', 'test')),
  
  -- Resultado da DAX
  dax_result JSONB,
  dax_value DECIMAL(18,4),
  condition_met BOOLEAN,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  
  -- Notificações enviadas
  notifications_sent INTEGER DEFAULT 0,
  notifications_failed INTEGER DEFAULT 0,
  
  -- Timing
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_duration_ms INTEGER,
  
  -- Contexto
  executed_by UUID REFERENCES users(id)
);

-- Índices
CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id);
CREATE INDEX idx_alert_history_group_id ON alert_history(company_group_id);
CREATE INDEX idx_alert_history_executed_at ON alert_history(executed_at DESC);
CREATE INDEX idx_alert_history_status ON alert_history(status);

COMMENT ON TABLE alert_history IS 'Histórico de execuções de alertas';
COMMENT ON COLUMN alert_history.dax_result IS 'Resultado completo da query DAX';
COMMENT ON COLUMN alert_history.dax_value IS 'Valor extraído para comparação';
```

---

## 🤖 Tabelas de IA

### 20. `ai_model_contexts` (Contextos de IA)

```sql
CREATE TABLE ai_model_contexts (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  
  -- Dados do contexto
  name TEXT NOT NULL,
  description TEXT,
  
  -- Conteúdo do contexto
  context_content TEXT NOT NULL, -- Markdown com estrutura do modelo
  
  -- Configurações
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  temperature DECIMAL(2,1) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4000,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(connection_id, name)
);

-- Índices
CREATE INDEX idx_ai_model_contexts_group_id ON ai_model_contexts(company_group_id);
CREATE INDEX idx_ai_model_contexts_connection_id ON ai_model_contexts(connection_id);
CREATE INDEX idx_ai_model_contexts_is_active ON ai_model_contexts(is_active);

COMMENT ON TABLE ai_model_contexts IS 'Contextos de modelo de dados para IA';
COMMENT ON COLUMN ai_model_contexts.context_content IS 'Estrutura do modelo: tabelas, colunas, medidas, relacionamentos';
```

**Exemplo de context_content:**

```markdown
# Modelo de Dados - Sistema de Vendas

## Tabelas

### Vendas
- Data (date)
- ValorVenda (decimal)
- Quantidade (integer)
- ClienteID (FK)
- ProdutoID (FK)
- FilialID (FK)

### Clientes
- ClienteID (PK)
- Nome (text)
- CPF (text)
- Cidade (text)

### Produtos
- ProdutoID (PK)
- Nome (text)
- Categoria (text)
- PrecoUnitario (decimal)

## Medidas DAX

- [QA_Faturamento] = SUM(Vendas[ValorVenda])
- [QA_Ticket Médio] = DIVIDE([QA_Faturamento], DISTINCTCOUNT(Vendas[VendaID]))
- [QA_Qtd Vendas] = COUNT(Vendas[VendaID])

## Relacionamentos

Vendas[ClienteID] → Clientes[ClienteID]
Vendas[ProdutoID] → Produtos[ProdutoID]
```

---

### 21. `ai_usage_logs` (Log de Uso da IA)

```sql
CREATE TABLE ai_usage_logs (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo de uso
  feature TEXT NOT NULL CHECK (feature IN ('generate_dax', 'generate_template', 'chat', 'analyze')),
  
  -- Prompt e resposta
  prompt TEXT NOT NULL,
  response TEXT,
  
  -- Modelo usado
  model TEXT NOT NULL,
  
  -- Consumo
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  estimated_cost DECIMAL(10,6),
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
  error_message TEXT,
  
  -- Timing
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_ai_usage_logs_group_id ON ai_usage_logs(company_group_id);
CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_feature ON ai_usage_logs(feature);

COMMENT ON TABLE ai_usage_logs IS 'Log de uso da API de IA para cobrança e auditoria';
COMMENT ON COLUMN ai_usage_logs.estimated_cost IS 'Custo estimado em USD baseado no pricing da Anthropic';
```

---

## 📝 Tabelas de Auditoria

### 22. `activity_logs` (Log de Atividades)

```sql
CREATE TABLE activity_logs (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ação
  action_type TEXT NOT NULL, -- Ex: 'user_created', 'screen_deleted', 'alert_triggered'
  description TEXT NOT NULL,
  
  -- Contexto
  entity_type TEXT, -- Ex: 'user', 'screen', 'alert'
  entity_id UUID,
  
  -- Dados antes/depois (para auditoria)
  old_data JSONB,
  new_data JSONB,
  
  -- Metadados
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_activity_logs_group_id ON activity_logs(company_group_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

COMMENT ON TABLE activity_logs IS 'Log de todas as atividades do sistema para auditoria';
```

**Exemplo de uso:**

```json
{
  "action_type": "alert_created",
  "description": "Alerta 'Vendas Diárias' criado",
  "entity_type": "alert",
  "entity_id": "uuid-do-alerta",
  "new_data": {
    "name": "Vendas Diárias",
    "schedule": "daily",
    "is_active": true
  },
  "metadata": {
    "source": "web_app",
    "session_id": "abc123"
  }
}
```

---

### 23. `audit_trail` (Trilha de Auditoria Completa)

```sql
CREATE TABLE audit_trail (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Quem?
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  user_role TEXT,
  
  -- O quê?
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  record_id UUID NOT NULL,
  
  -- Quando?
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  
  -- Contexto
  ip_address INET,
  application TEXT DEFAULT 'web'
);

-- Índices
CREATE INDEX idx_audit_trail_table_name ON audit_trail(table_name);
CREATE INDEX idx_audit_trail_record_id ON audit_trail(record_id);
CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_executed_at ON audit_trail(executed_at DESC);

COMMENT ON TABLE audit_trail IS 'Trilha de auditoria completa de todas as alterações críticas';
```

---

## ⚙️ Triggers e Funções

### Trigger: Atualizar `updated_at` Automaticamente

```sql
-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas relevantes
CREATE TRIGGER trigger_update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_company_groups_updated_at
  BEFORE UPDATE ON company_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_alertas_updated_at
  BEFORE UPDATE ON alertas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Etc...
```

---

### Trigger: Log de Auditoria Automático

```sql
-- Função para criar log de auditoria em operações críticas
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_trail (
    user_id,
    user_email,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    changed_fields,
    ip_address
  ) VALUES (
    auth.uid(), -- ID do usuário logado (Supabase Auth)
    auth.email(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN 
        (SELECT array_agg(key) 
         FROM jsonb_each(to_jsonb(NEW)) 
         WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key)
      ELSE NULL
    END,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar em tabelas críticas
CREATE TRIGGER audit_alertas
  AFTER INSERT OR UPDATE OR DELETE ON alertas
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_trail();
```

---

### Trigger: Calcular Próxima Execução de Alerta

```sql
CREATE OR REPLACE FUNCTION calculate_next_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    CASE NEW.schedule_type
      WHEN 'daily' THEN
        NEW.next_execution_at = (CURRENT_DATE + INTERVAL '1 day' + NEW.schedule_time)::TIMESTAMPTZ;
      
      WHEN 'weekly' THEN
        -- Calcular próximo dia da semana baseado em schedule_days
        NEW.next_execution_at = (
          SELECT (date_trunc('week', CURRENT_DATE) + (day || ' days')::INTERVAL + NEW.schedule_time)::TIMESTAMPTZ
          FROM unnest(NEW.schedule_days) day
          WHERE (date_trunc('week', CURRENT_DATE) + (day || ' days')::INTERVAL) > CURRENT_TIMESTAMP
          ORDER BY day
          LIMIT 1
        );
      
      WHEN 'monthly' THEN
        NEW.next_execution_at = (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month' + NEW.schedule_time)::TIMESTAMPTZ;
      
      ELSE
        NEW.next_execution_at = NULL;
    END CASE;
  ELSE
    NEW.next_execution_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_next_execution
  BEFORE INSERT OR UPDATE OF schedule_type, schedule_time, schedule_days, is_active
  ON alertas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_next_execution();
```

---

## 🚀 Índices de Performance

### Índices Compostos para Queries Comuns

```sql
-- Query: Buscar telas ativas de um grupo
CREATE INDEX idx_powerbi_screens_group_active 
  ON powerbi_screens(company_group_id, is_active) 
  WHERE is_active = true;

-- Query: Buscar alertas prontos para executar
CREATE INDEX idx_alertas_ready_to_execute 
  ON alertas(next_execution_at, is_active) 
  WHERE is_active = true AND next_execution_at IS NOT NULL;

-- Query: Buscar mensagens por status e data
CREATE INDEX idx_whatsapp_messages_status_date 
  ON whatsapp_messages(status, created_at DESC);

-- Query: Log de atividades por grupo e período
CREATE INDEX idx_activity_logs_group_date 
  ON activity_logs(company_group_id, created_at DESC);

-- Query: Uso de IA por usuário e período
CREATE INDEX idx_ai_usage_user_date 
  ON ai_usage_logs(user_id, created_at DESC);
```

### Índices JSONB

```sql
-- Buscar em metadados JSONB
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
CREATE INDEX idx_company_groups_settings ON company_groups USING GIN(settings);
CREATE INDEX idx_powerbi_datasets_measures ON powerbi_datasets USING GIN(measures);

-- Exemplo de query:
-- SELECT * FROM users WHERE metadata @> '{"theme": "dark"}';
```

---

## 🔒 Políticas RLS (Row Level Security)

### Ativar RLS em Todas as Tabelas

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerbi_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE powerbi_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
-- Etc...
```

### Políticas para `users`

```sql
-- Master pode ver todos
CREATE POLICY "Master can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.is_master = true
    )
  );

-- Usuário pode ver a si mesmo
CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Usuário pode atualizar a si mesmo
CREATE POLICY "Users can update themselves"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Políticas para `company_groups`

```sql
-- Master pode tudo
CREATE POLICY "Master can manage all groups"
  ON company_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.is_master = true
    )
  );

-- Admin do grupo pode ver e editar
CREATE POLICY "Admins can manage their groups"
  ON company_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid()
        AND ugm.company_group_id = company_groups.id
        AND ugm.role = 'admin'
        AND ugm.is_active = true
    )
  );

-- Membros podem visualizar
CREATE POLICY "Members can view their groups"
  ON company_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid()
        AND ugm.company_group_id = company_groups.id
        AND ugm.is_active = true
    )
  );
```

### Políticas para `powerbi_screens`

```sql
-- Usuário pode ver telas do seu grupo
CREATE POLICY "Users can view screens from their groups"
  ON powerbi_screens FOR SELECT
  USING (
    company_group_id IN (
      SELECT company_group_id FROM user_group_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Admin e Manager podem criar
CREATE POLICY "Admins and managers can create screens"
  ON powerbi_screens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid()
        AND ugm.company_group_id = powerbi_screens.company_group_id
        AND ugm.role IN ('admin', 'manager')
        AND ugm.is_active = true
    )
  );

-- Admin e Manager podem editar
CREATE POLICY "Admins and managers can update screens"
  ON powerbi_screens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid()
        AND ugm.company_group_id = powerbi_screens.company_group_id
        AND ugm.role IN ('admin', 'manager')
        AND ugm.is_active = true
    )
  );

-- Apenas Admin pode deletar
CREATE POLICY "Only admins can delete screens"
  ON powerbi_screens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_memberships ugm
      WHERE ugm.user_id = auth.uid()
        AND ugm.company_group_id = powerbi_screens.company_group_id
        AND ugm.role = 'admin'
        AND ugm.is_active = true
    )
  );
```

### Política para Telas Públicas

```sql
-- Qualquer um pode ver tela pública (sem autenticação)
CREATE POLICY "Public screens are accessible to everyone"
  ON powerbi_screens FOR SELECT
  USING (is_public = true AND is_active = true);
```

---

## 📊 Queries Úteis

### 1. Listar Grupos com Uso Atual vs Limites

```sql
SELECT 
  cg.id,
  cg.name as grupo,
  pp.name as plano,
  
  -- Usuários
  (SELECT COUNT(*) FROM user_group_memberships 
   WHERE company_group_id = cg.id AND is_active = true) as usuarios_atual,
  COALESCE(cg.max_users, pp.max_users) as usuarios_max,
  
  -- Telas
  (SELECT COUNT(*) FROM powerbi_screens 
   WHERE company_group_id = cg.id AND is_active = true) as telas_atual,
  COALESCE(cg.max_powerbi_screens, pp.max_powerbi_screens) as telas_max,
  
  -- Atualizações hoje
  (SELECT COUNT(*) FROM powerbi_refresh_log 
   WHERE company_group_id = cg.id 
   AND DATE(started_at) = CURRENT_DATE) as refresh_hoje,
  pp.max_daily_refreshes as refresh_max
  
FROM company_groups cg
LEFT JOIN powerbi_plans pp ON cg.plan_id = pp.id
WHERE cg.status = 'active'
ORDER BY cg.name;
```

### 2. Top 10 Usuários Mais Ativos

```sql
SELECT 
  u.full_name,
  u.email,
  COUNT(DISTINCT al.id) as total_atividades,
  MAX(al.created_at) as ultima_atividade
FROM users u
JOIN activity_logs al ON u.id = al.user_id
WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.full_name, u.email
ORDER BY total_atividades DESC
LIMIT 10;
```

### 3. Alertas que Devem Executar nas Próximas 24h

```sql
SELECT 
  a.id,
  a.name,
  a.next_execution_at,
  cg.name as grupo,
  a.alert_type,
  a.schedule_type
FROM alertas a
JOIN company_groups cg ON a.company_group_id = cg.id
WHERE a.is_active = true
  AND a.next_execution_at IS NOT NULL
  AND a.next_execution_at <= NOW() + INTERVAL '24 hours'
ORDER BY a.next_execution_at ASC;
```

### 4. Histórico de Mensagens WhatsApp por Grupo

```sql
SELECT 
  cg.name as grupo,
  DATE(wm.created_at) as data,
  COUNT(*) as total_mensagens,
  COUNT(*) FILTER (WHERE wm.status = 'sent') as enviadas,
  COUNT(*) FILTER (WHERE wm.status = 'delivered') as entregues,
  COUNT(*) FILTER (WHERE wm.status = 'failed') as falhas
FROM whatsapp_messages wm
JOIN company_groups cg ON wm.company_group_id = cg.id
WHERE wm.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY cg.name, DATE(wm.created_at)
ORDER BY data DESC, grupo;
```

### 5. Uso de IA por Grupo (Últimos 30 dias)

```sql
SELECT 
  cg.name as grupo,
  COUNT(*) as total_requests,
  SUM(aul.tokens_total) as tokens_total,
  SUM(aul.estimated_cost) as custo_estimado_usd,
  AVG(aul.response_time_ms) as tempo_medio_ms,
  COUNT(*) FILTER (WHERE aul.feature = 'generate_dax') as dax_geradas,
  COUNT(*) FILTER (WHERE aul.feature = 'chat') as chats
FROM ai_usage_logs aul
JOIN company_groups cg ON aul.company_group_id = cg.id
WHERE aul.created_at >= CURRENT_DATE - INTERVAL '30 days'
  AND aul.status = 'success'
GROUP BY cg.name
ORDER BY tokens_total DESC;
```

### 6. Telas Mais Acessadas

```sql
-- Assumindo que há uma tabela de views/acessos
SELECT 
  ps.name as tela,
  cg.name as grupo,
  COUNT(DISTINCT al.user_id) as usuarios_unicos,
  COUNT(*) as total_acessos,
  MAX(al.created_at) as ultimo_acesso
FROM powerbi_screens ps
JOIN company_groups cg ON ps.company_group_id = cg.id
JOIN activity_logs al ON al.entity_id = ps.id 
  AND al.entity_type = 'screen' 
  AND al.action_type = 'screen_viewed'
WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ps.id, ps.name, cg.name
ORDER BY total_acessos DESC
LIMIT 10;
```

### 7. Relatório de Saúde dos Alertas

```sql
SELECT 
  a.name as alerta,
  a.is_active,
  a.last_execution_at,
  COUNT(ah.id) as total_execucoes,
  COUNT(*) FILTER (WHERE ah.status = 'success') as sucessos,
  COUNT(*) FILTER (WHERE ah.status = 'failed') as falhas,
  ROUND(
    COUNT(*) FILTER (WHERE ah.status = 'success')::numeric / 
    NULLIF(COUNT(ah.id), 0) * 100, 
    2
  ) as taxa_sucesso_pct
FROM alertas a
LEFT JOIN alert_history ah ON a.id = ah.alert_id 
  AND ah.executed_at >= CURRENT_DATE - INTERVAL '30 days'
WHERE a.is_active = true
GROUP BY a.id, a.name, a.is_active, a.last_execution_at
ORDER BY taxa_sucesso_pct ASC NULLS FIRST;
```

---

## 🔄 Migrations e Versionamento

### Estrutura de Migrations

```
migrations/
  ├── 001_initial_schema.sql
  ├── 002_add_modules.sql
  ├── 003_add_plans.sql
  ├── 004_add_whatsapp.sql
  ├── 005_add_alerts.sql
  ├── 006_add_ai_features.sql
  └── 007_add_audit_trail.sql
```

### Template de Migration

```sql
-- Migration: 001_initial_schema.sql
-- Description: Cria estrutura base de usuários e grupos
-- Author: Sistema
-- Date: 2024-01-01

BEGIN;

-- Criar tabelas
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS company_groups (...);
-- Etc...

-- Criar índices
CREATE INDEX ...;

-- Criar triggers
CREATE TRIGGER ...;

-- Inserir dados iniciais (seeds)
INSERT INTO ...;

-- Versionar migration
INSERT INTO schema_migrations (version, description, executed_at)
VALUES ('001', 'Initial schema', NOW());

COMMIT;
```

### Tabela de Controle de Migrations

```sql
CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_ms INTEGER,
  checksum TEXT
);
```

---

## 📌 Resumo de Estatísticas

```sql
-- View com estatísticas gerais do banco
CREATE OR REPLACE VIEW database_stats AS
SELECT 
  (SELECT COUNT(*) FROM users WHERE is_active = true) as usuarios_ativos,
  (SELECT COUNT(*) FROM company_groups WHERE status = 'active') as grupos_ativos,
  (SELECT COUNT(*) FROM powerbi_screens WHERE is_active = true) as telas_ativas,
  (SELECT COUNT(*) FROM alertas WHERE is_active = true) as alertas_ativos,
  (SELECT COUNT(*) FROM whatsapp_instances WHERE status = 'connected') as whatsapp_conectados,
  (SELECT COUNT(*) FROM whatsapp_messages WHERE created_at >= CURRENT_DATE) as mensagens_hoje,
  (SELECT SUM(tokens_total) FROM ai_usage_logs WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as tokens_ia_mes;
```

---

## 🎯 Diagrama ER Completo (Texto)

```
┌──────────────┐       ┌──────────────────────┐       ┌──────────────┐
│    users     │──────▶│user_group_memberships│◀──────│company_groups│
└──────────────┘  1:N  └──────────────────────┘  N:1  └──────────────┘
                                                             │
                                                             │ 1:N
                                                             ▼
                                                        ┌──────────────┐
                                                        │  companies   │
                                                        └──────────────┘

┌──────────────┐       ┌──────────────────────┐
│   modules    │──────▶│   module_groups      │
└──────────────┘  1:N  └──────────────────────┘
                              │
                              │ N:1
                              ▼
                        ┌──────────────┐
                        │company_groups│
                        └──────────────┘
                              │
                              │ N:1
                              ▼
                        ┌──────────────┐
                        │powerbi_plans │
                        └──────────────┘

┌───────────────────┐
│ company_groups    │
└───────────────────┘
         │
         ├──▶ powerbi_connections (1:N)
         │         └──▶ powerbi_datasets (1:N)
         │         └──▶ powerbi_screens (1:N)
         │
         ├──▶ whatsapp_instances (1:N)
         │         └──▶ whatsapp_groups (1:N)
         │         └──▶ whatsapp_authorized_numbers (1:N)
         │
         ├──▶ alertas (1:N)
         │         └──▶ alert_history (1:N)
         │
         ├──▶ ai_model_contexts (1:N)
         └──▶ activity_logs (1:N)
```

---

**Documentação criada em:** Janeiro 2024  
**Versão:** 1.0.0  
**Última atualização:** 09/01/2026  
**Total de Tabelas Documentadas:** 23

---

## 🔗 Referências

- [Documentação Supabase](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [JSONB em PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html)
