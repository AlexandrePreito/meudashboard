# 🔐 Documentação de Acessos do Sistema - MeuDashboard

## 📋 Índice

1. [Visão Geral dos Perfis](#visão-geral-dos-perfis)
2. [Perfil MASTER](#perfil-master)
3. [Perfil ADMIN](#perfil-admin)
4. [Perfil DEV (Developer)](#perfil-dev-developer)
5. [Perfil VISUALIZADOR (Viewer/User)](#perfil-visualizador-vieweruser)
6. [Estrutura de Pastas](#estrutura-de-pastas)
7. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
8. [Hierarquia de Permissões](#hierarquia-de-permissões)
9. [Rotas e APIs por Perfil](#rotas-e-apis-por-perfil)

---

## 🎯 Visão Geral dos Perfis

O sistema MeuDashboard possui 4 níveis de acesso principais:

| Perfil | Identificador | Descrição | Escopo |
|--------|--------------|-----------|--------|
| **MASTER** | `is_master: true` | Administrador global do sistema | Todo o sistema |
| **ADMIN** | `role: 'admin'` | Administrador de grupo(s) | Grupo(s) específico(s) |
| **DEV** | `is_developer: true` | Desenvolvedor/Revendedor | Grupos vinculados |
| **VISUALIZADOR** | `role: 'user'` ou `role: 'viewer'` | Usuário comum | Grupos atribuídos |

---

## 👑 Perfil MASTER

### Características

- **Campo no BD:** `users.is_master = true`
- **Acesso Global:** Pode acessar tudo no sistema
- **Sem Limitações:** Não possui restrições de grupo ou escopo
- **Permissões Especiais:** Único perfil que pode criar outros usuários master

### O que o MASTER pode fazer:

#### ✅ Gestão Global

- **Usuários:**
  - Criar, editar e excluir qualquer usuário do sistema
  - Tornar usuários master
  - Ver todos os usuários independente do grupo
  - Gerenciar status (active, suspended, pending)

- **Grupos (Company Groups):**
  - Criar, editar e excluir grupos
  - Configurar planos, limites e quotas
  - Associar módulos aos grupos
  - Personalizar cores, logos e configurações

- **Planos:**
  - Criar e gerenciar planos (powerbi_plans)
  - Definir limites de usuários, empresas, telas
  - Configurar limites de refreshes diários

- **Módulos:**
  - Ativar/desativar módulos globalmente
  - Associar módulos a grupos específicos

- **Desenvolvedores:**
  - Criar e gerenciar desenvolvedores
  - Vincular grupos a desenvolvedores
  - Configurar quotas e planos de desenvolvedores

#### ✅ Power BI

- Acessar todas as conexões Power BI de todos os grupos
- Gerenciar relatórios, datasets e telas de qualquer grupo
- Configurar ordem de atualização globalmente
- Ver e gerenciar todos os gateways

#### ✅ WhatsApp e Alertas

- Acessar todas as instâncias WhatsApp
- Gerenciar grupos e números autorizados de todos os grupos
- Ver histórico de mensagens global
- Criar e gerenciar alertas em qualquer grupo

#### ✅ Auditoria e Logs

- Ver todos os logs de atividade do sistema
- Acessar logs de IA, WhatsApp e alertas
- Visualizar estatísticas globais

### Rotas e Páginas Acessíveis:

```
/admin                    - Dashboard de administração
/admin/usuarios           - Gestão de usuários
/admin/grupos             - Gestão de grupos
/admin/desenvolvedores    - Gestão de desenvolvedores
/admin/relatorios         - Relatórios globais

/configuracoes            - Configurações (acesso completo)
/configuracoes/usuarios   - Usuários
/configuracoes/grupos     - Grupos
/configuracoes/planos     - Planos
/configuracoes/modulos    - Módulos
/configuracoes/logs       - Logs

/powerbi/*                - Todas as páginas Power BI (todas conexões)
/whatsapp/*               - Todas as páginas WhatsApp (todas instâncias)
/alertas/*                - Todas as páginas de alertas

/dashboard                - Dashboard principal
/perfil                   - Perfil do usuário
```

### APIs Acessíveis:

```
/api/admin/*              - Todas as APIs de administração
/api/config/*             - Todas as APIs de configuração
/api/powerbi/*            - Todas as APIs Power BI (sem filtro de grupo)
/api/whatsapp/*           - Todas as APIs WhatsApp (sem filtro de grupo)
/api/alertas/*            - Todas as APIs de alertas (sem filtro de grupo)
```

### Localização no Código:

- **Verificação:** `src/lib/auth.ts` - função `getAuthUser()`
- **Middleware:** `middleware.ts` - não filtra por grupo
- **Sidebar:** `src/components/layout/Sidebar.tsx` - mostra menu completo
- **APIs:** Todas as rotas verificam `user.is_master` antes de filtrar

---

## 🛡️ Perfil ADMIN

### Características

- **Campo no BD:** `user_group_membership.role = 'admin'` e `is_active = true`
- **Acesso Escopo:** Apenas grupos onde é admin
- **Pode ser admin de múltiplos grupos** através de múltiplos memberships
- **Não pode criar usuários master**

### O que o ADMIN pode fazer:

#### ✅ Gestão do Grupo

- **Usuários do Grupo:**
  - Criar, editar e excluir usuários dentro dos seus grupos
  - Definir roles (admin, manager, operator, viewer)
  - Gerenciar status dos usuários do grupo
  - Não pode ver ou gerenciar usuários de outros grupos

- **Configurações do Grupo:**
  - Personalizar cores e logo do grupo (via `/configuracoes/grupos`)
  - Configurar preferências visuais
  - Ver e gerenciar limites de quotas

#### ✅ Power BI (dentro do grupo)

- Gerenciar conexões Power BI do grupo
- Criar e editar telas/dashboards
- Configurar relatórios e datasets
- Definir ordem de atualização
- Gerenciar acesso de usuários às telas

#### ✅ WhatsApp e Alertas (dentro do grupo)

- Gerenciar instâncias WhatsApp do grupo
- Configurar números e grupos autorizados
- Criar e gerenciar alertas
- Ver histórico de mensagens do grupo

#### ❌ Limitações

- **NÃO pode:** Criar ou excluir grupos
- **NÃO pode:** Associar módulos a grupos (apenas master)
- **NÃO pode:** Gerenciar planos
- **NÃO pode:** Ver dados de outros grupos
- **NÃO pode:** Criar usuários master
- **NÃO pode:** Gerenciar desenvolvedores

### Rotas e Páginas Acessíveis:

```
/configuracoes            - Configurações (limitado)
/configuracoes/usuarios   - Usuários do grupo(s)
/configuracoes/grupos     - Personalização do grupo
/configuracoes/logs       - Logs do grupo

/powerbi/*                - Power BI (filtrado por grupo)
/whatsapp/*               - WhatsApp (filtrado por grupo)
/alertas/*                - Alertas (filtrado por grupo)

/dashboard                - Dashboard principal
/perfil                   - Perfil do usuário

/administrador/[id]/*     - Área administrativa do grupo (se for admin dele)
```

### APIs Acessíveis:

```
/api/config/users         - Com filtro de grupo (GET/POST/PUT/DELETE limitado)
/api/config/groups        - Apenas grupos onde é admin (GET)
/api/powerbi/*            - Filtrado por grupos onde é admin
/api/whatsapp/*           - Filtrado por grupos onde é admin
/api/alertas/*            - Filtrado por grupos onde é admin
```

### Verificação no Código:

A verificação de admin é feita através da função:

```typescript
// Função auxiliar para verificar grupos que usuário é admin
async function getUserAdminGroups(supabase: any, userId: string): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true);

  return memberships?.map((m: any) => m.company_group_id) || [];
}
```

**Localização:** `app/api/config/users/route.ts`, `app/api/config/groups/route.ts`

---

## 💻 Perfil DEV (Developer)

### Características

- **Campo no BD:** `users.developer_id` (vinculado a `developers.id`) OU `developer_users.user_id`
- **Acesso Escopo:** Grupos vinculados ao desenvolvedor (`company_groups.developer_id`)
- **Função:** Revendedores/Parceiros que gerenciam múltiplos grupos

### O que o DEV pode fazer:

#### ✅ Gestão dos Grupos Vinculados

- **Grupos:**
  - Ver e gerenciar todos os grupos onde `developer_id` aponta para ele
  - Criar novos grupos (vinculados automaticamente)
  - Configurar limites, quotas e planos dos grupos
  - Personalizar cores e configurações

- **Usuários dos Grupos:**
  - Ver todos os usuários dos grupos vinculados
  - Criar, editar usuários dentro dos grupos
  - Não pode ver usuários de grupos não vinculados

- **Distribuição de Cotas:**
  - Gerenciar quotas entre grupos (`/dev/quotas`)
  - Definir limites de uso (WhatsApp, IA, Alertas)

#### ✅ Relatórios e Estatísticas

- Dashboard específico de desenvolvedor (`/dev`)
- Relatórios de uso por grupo
- Estatísticas de performance
- Logs de acesso dos grupos

#### ✅ Power BI, WhatsApp e Alertas

- Acesso a todas as funcionalidades dos grupos vinculados
- Gerenciar telas, conexões e relatórios
- Configurar instâncias WhatsApp e alertas

#### ❌ Limitações

- **NÃO pode:** Gerenciar outros desenvolvedores
- **NÃO pode:** Criar usuários master
- **NÃO pode:** Acessar grupos não vinculados
- **NÃO pode:** Gerenciar módulos globalmente
- **NÃO pode:** Criar planos de desenvolvedor

### Rotas e Páginas Acessíveis:

```
/dev                      - Dashboard do desenvolvedor
/dev/groups               - Grupos gerenciados
/dev/groups/[id]          - Detalhes do grupo
/dev/usuarios             - Usuários dos grupos
/dev/quotas               - Distribuição de cotas
/dev/relatorios           - Relatórios
/dev/perfil               - Perfil do desenvolvedor
/dev/plano                - Plano do desenvolvedor

/powerbi/*                - Power BI (filtrado por grupos vinculados)
/whatsapp/*               - WhatsApp (filtrado por grupos vinculados)
/alertas/*                - Alertas (filtrado por grupos vinculados)

/dashboard                - Dashboard principal
/perfil                   - Perfil do usuário
```

### APIs Acessíveis:

```
/api/dev/*                - APIs específicas de desenvolvedor
/api/dev/dashboard        - Dashboard do dev
/api/dev/groups           - Grupos do dev
/api/dev/quotas           - Quotas do dev
/api/dev/usage            - Uso dos grupos

/api/config/users         - Filtrado por grupos do dev
/api/config/groups        - Apenas grupos do dev
/api/powerbi/*            - Filtrado por grupos do dev
/api/whatsapp/*           - Filtrado por grupos do dev
/api/alertas/*            - Filtrado por grupos do dev
```

### Verificação no Código:

```typescript
// Verificar se usuário é developer
export async function getUserDeveloperId(userId: string): Promise<string | null> {
  const adminSupabase = createAdminClient();
  
  // Buscar direto na tabela users (campo developer_id)
  const { data: userData } = await adminSupabase
    .from('users')
    .select('developer_id')
    .eq('id', userId)
    .single();
  
  if (userData?.developer_id) {
    return userData.developer_id;
  }
  
  // Fallback: buscar na tabela developer_users
  const { data } = await adminSupabase
    .from('developer_users')
    .select('developer_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();
  
  return data?.developer_id || null;
}
```

**Localização:** `src/lib/auth.ts` - função `getUserDeveloperId()`

### Estrutura de Dados:

```sql
-- Tabela developers
CREATE TABLE developers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT,
  -- ...
);

-- Vinculação direta (nova forma)
ALTER TABLE users ADD COLUMN developer_id UUID REFERENCES developers(id);

-- Vinculação via tabela (forma antiga)
CREATE TABLE developer_users (
  user_id UUID REFERENCES users(id),
  developer_id UUID REFERENCES developers(id),
  role TEXT, -- 'owner', 'admin', 'viewer'
  is_active BOOLEAN
);

-- Grupos vinculados ao desenvolvedor
CREATE TABLE company_groups (
  id UUID PRIMARY KEY,
  developer_id UUID REFERENCES developers(id),
  -- ...
);
```

---

## 👁️ Perfil VISUALIZADOR (Viewer/User)

### Características

- **Campo no BD:** `user_group_membership.role = 'user'` ou `role = 'viewer'` ou `role = 'operator'`
- **Acesso Escopo:** Apenas visualização de recursos atribuídos
- **Sem Permissões Administrativas**

### Tipos de Visualizador:

| Role | Descrição | Permissões |
|------|-----------|------------|
| **`viewer`** | Apenas visualização | Ver telas, relatórios, dashboard |
| **`user`** | Usuário comum | Ver telas atribuídas + funcionalidades básicas |
| **`operator`** | Operador | Pode disparar ações (alertas, mensagens) |

### O que o VISUALIZADOR pode fazer:

#### ✅ Visualização

- **Telas Power BI:**
  - Ver telas atribuídas via `powerbi_screen_users`
  - Acessar apenas telas onde tem `can_view = true`
  - Visualizar dashboards do grupo

- **Dashboard:**
  - Ver dashboard principal (`/dashboard`)
  - Visualizar estatísticas do grupo
  - Ver uso de recursos

- **Perfil:**
  - Ver e editar próprio perfil (`/perfil`)
  - Trocar senha
  - Ver grupos aos quais pertence

#### ✅ Funcionalidades Básicas (dependendo do role)

- **`operator`** ou `user`:**
  - Disparar alertas (se configurado)
  - Visualizar histórico de alertas
  - Ver mensagens WhatsApp (se permitido)

#### ❌ Limitações

- **NÃO pode:** Criar, editar ou excluir usuários
- **NÃO pode:** Criar ou editar grupos
- **NÃO pode:** Criar ou editar telas Power BI
- **NÃO pode:** Criar conexões Power BI
- **NÃO pode:** Gerenciar instâncias WhatsApp
- **NÃO pode:** Configurar alertas (apenas disparar)
- **NÃO pode:** Acessar páginas de configuração (exceto próprio perfil)
- **NÃO pode:** Ver logs administrativos

### Rotas e Páginas Acessíveis:

```
/dashboard                - Dashboard principal
/tela/[id]                - Tela Power BI (se tiver acesso)
/perfil                   - Próprio perfil
/trocar-senha             - Trocar senha

/powerbi                  - Dashboard Power BI (visualização)
/powerbi/relatorios       - Lista de relatórios (visualização)

/alertas                  - Alertas (visualização e disparo se operator)
/alertas/historico        - Histórico de alertas
```

### APIs Acessíveis:

```
/api/auth/me              - Dados do próprio usuário
/api/user/groups          - Grupos do usuário
/api/user/plan-quotas     - Quotas do plano

/api/powerbi/screens      - Com filtro only_mine=true (apenas telas atribuídas)
/api/powerbi/reports      - Relatórios do grupo (visualização)
/api/powerbi/embed        - Embed token (para telas autorizadas)

/api/alertas              - Lista de alertas (visualização)
/api/alertas/[id]/trigger - Disparar alerta (se operator)
```

### Verificação no Código:

```typescript
// Usuário comum precisa filtrar por permissão
const isRegularUser = !user?.is_master && !user?.is_developer && user?.role === 'user';

// Carregar telas filtradas
const needsFilter = !user?.is_master && !user?.is_developer && user?.role !== 'admin';
const url = needsFilter
  ? `/api/powerbi/screens?group_id=${groupId}&only_mine=true`
  : `/api/powerbi/screens?group_id=${groupId}`;
```

**Localização:** `src/components/layout/Sidebar.tsx` linha 122-189

### Controle de Acesso por Tela:

O acesso às telas é controlado pela tabela `powerbi_screen_users`:

```sql
CREATE TABLE powerbi_screen_users (
  screen_id UUID REFERENCES powerbi_screens(id),
  user_id UUID REFERENCES users(id),
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  user_filters JSONB, -- Filtros RLS específicos
  UNIQUE(screen_id, user_id)
);
```

---

## 📁 Estrutura de Pastas

### Pastas Principais por Perfil:

```
meudahsboard/
│
├── app/                          # Rotas Next.js
│   ├── admin/                    # ⭐ MASTER - Páginas administrativas
│   │   ├── page.tsx              # Dashboard admin
│   │   ├── usuarios/             # Gestão de usuários
│   │   ├── grupos/               # Gestão de grupos
│   │   ├── desenvolvedores/      # Gestão de desenvolvedores
│   │   └── relatorios/           # Relatórios globais
│   │
│   ├── dev/                      # 💻 DEV - Páginas de desenvolvedor
│   │   ├── page.tsx              # Dashboard dev
│   │   ├── groups/               # Grupos do dev
│   │   ├── usuarios/             # Usuários dos grupos
│   │   ├── quotas/               # Distribuição de cotas
│   │   ├── relatorios/           # Relatórios do dev
│   │   └── perfil/               # Perfil do dev
│   │
│   ├── configuracoes/            # ⭐ MASTER + 🛡️ ADMIN - Configurações
│   │   ├── page.tsx              # Página principal (usuários/grupos)
│   │   ├── grupos/               # Gestão de grupos (master) ou personalização (admin)
│   │   ├── planos/               # Planos (apenas master)
│   │   ├── modulos/              # Módulos (apenas master)
│   │   └── logs/                 # Logs de atividade
│   │
│   ├── administrador/            # 🛡️ ADMIN - Área administrativa do grupo
│   │   └── [id]/                 # ID do grupo
│   │       ├── page.tsx          # Dashboard do grupo
│   │       ├── usuarios/         # Usuários do grupo
│   │       └── telas/            # Telas do grupo
│   │
│   ├── powerbi/                  # ✅ Todos (com filtros)
│   │   ├── page.tsx              # Dashboard Power BI
│   │   ├── conexoes/             # Conexões (master/admin/dev)
│   │   ├── relatorios/           # Relatórios (visualização)
│   │   ├── telas/                # Telas (visualização)
│   │   └── ordem-atualizacao/    # Ordem de atualização (master/admin/dev)
│   │
│   ├── whatsapp/                 # ✅ Todos (com filtros)
│   │   ├── instancias/           # Instâncias (admin/dev/master)
│   │   ├── grupos/               # Grupos WhatsApp
│   │   └── numeros/              # Números autorizados
│   │
│   ├── alertas/                  # ✅ Todos (com filtros)
│   │   ├── page.tsx              # Lista de alertas
│   │   ├── novo/                 # Criar alerta (admin/dev/master)
│   │   └── historico/            # Histórico
│   │
│   ├── dashboard/                # ✅ Todos - Dashboard principal
│   ├── tela/[id]/                # 👁️ VISUALIZADOR - Tela Power BI específica
│   ├── perfil/                   # ✅ Todos - Próprio perfil
│   └── login/                    # 🔓 Pública - Login
│
├── app/api/                      # API Routes
│   ├── admin/                    # ⭐ MASTER - APIs administrativas
│   │   ├── users/                # CRUD de usuários
│   │   ├── groups/               # CRUD de grupos
│   │   ├── developers/           # CRUD de desenvolvedores
│   │   └── stats/                # Estatísticas globais
│   │
│   ├── dev/                      # 💻 DEV - APIs de desenvolvedor
│   │   ├── dashboard/            # Dashboard do dev
│   │   ├── groups/               # Grupos do dev
│   │   ├── quotas/               # Quotas do dev
│   │   └── usage/                # Uso dos grupos
│   │
│   ├── config/                   # ⭐ MASTER + 🛡️ ADMIN - APIs de configuração
│   │   ├── users/                # Usuários (filtrado por grupo)
│   │   ├── groups/               # Grupos (filtrado por permissão)
│   │   └── logs/                 # Logs (filtrado por grupo)
│   │
│   ├── powerbi/                  # ✅ Todos - APIs Power BI (com filtros)
│   ├── whatsapp/                 # ✅ Todos - APIs WhatsApp (com filtros)
│   ├── alertas/                  # ✅ Todos - APIs de alertas (com filtros)
│   └── auth/                     # 🔓 Públicas - Autenticação
│       ├── login/
│       ├── logout/
│       └── me/                   # Dados do usuário autenticado
│
├── src/
│   ├── lib/
│   │   └── auth.ts               # 🔑 Funções de autenticação e verificação
│   │
│   ├── components/
│   │   └── layout/
│   │       ├── Sidebar.tsx       # Menu lateral (filtrado por perfil)
│   │       └── MainLayout.tsx    # Layout principal
│   │
│   └── types/
│       └── index.ts              # Tipos TypeScript (User, AuthUser, etc.)
│
└── middleware.ts                 # 🛡️ Middleware de proteção de rotas
```

### Legenda de Ícones:

- ⭐ **MASTER** - Acesso exclusivo
- 🛡️ **ADMIN** - Acesso limitado ao grupo
- 💻 **DEV** - Acesso a grupos vinculados
- 👁️ **VISUALIZADOR** - Acesso apenas visual
- ✅ **Todos** - Todos os perfis (com filtros por permissão)
- 🔓 **Públicas** - Rotas sem autenticação

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais de Acesso:

#### 1. `users` - Usuários do Sistema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  
  -- Permissão Master
  is_master BOOLEAN DEFAULT false,
  
  -- Vinculação Developer
  developer_id UUID REFERENCES developers(id),
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'pending'
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

**Campos Relacionados a Acesso:**
- `is_master`: Define se é MASTER
- `developer_id`: Define se é DEV (se preenchido)
- `status`: Controla acesso (suspended = sem acesso)

#### 2. `user_group_membership` - Vínculo Usuário-Grupo

```sql
CREATE TABLE user_group_membership (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_group_id UUID REFERENCES company_groups(id),
  
  -- Role no grupo
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  
  -- Permissões específicas
  can_use_ai BOOLEAN DEFAULT false,
  can_refresh BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Permissões extras
  permissions JSONB DEFAULT '{}'::jsonb,
  
  UNIQUE(user_id, company_group_id)
);
```

**Campos Relacionados a Acesso:**
- `role`: Define se é ADMIN (`admin`) ou VISUALIZADOR (`viewer`, `operator`)
- `is_active`: Controla se membership está ativo
- `can_use_ai`, `can_refresh`: Permissões específicas

#### 3. `company_groups` - Grupos de Empresas

```sql
CREATE TABLE company_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  
  -- Vinculação Developer
  developer_id UUID REFERENCES developers(id),
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'trial'
  
  -- Quotas e limites
  quota_users INTEGER,
  quota_screens INTEGER,
  quota_whatsapp_per_day INTEGER,
  quota_ai_credits_per_day INTEGER,
  
  -- Personalização
  primary_color TEXT,
  logo_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campo Relacionado a Acesso:**
- `developer_id`: Define grupos vinculados a um DEV

#### 4. `developers` - Desenvolvedores/Revendedores

```sql
CREATE TABLE developers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  
  -- Plano do desenvolvedor
  plan_id UUID REFERENCES developer_plans(id),
  
  -- Quotas
  max_groups INTEGER,
  max_users INTEGER,
  max_screens INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Uso:**
- Vinculado via `users.developer_id` ou `developer_users`
- Define grupos que DEV pode gerenciar via `company_groups.developer_id`

#### 5. `powerbi_screen_users` - Controle de Acesso às Telas

```sql
CREATE TABLE powerbi_screen_users (
  id UUID PRIMARY KEY,
  screen_id UUID REFERENCES powerbi_screens(id),
  user_id UUID REFERENCES users(id),
  
  -- Permissões na tela
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_share BOOLEAN DEFAULT false,
  
  -- Filtros RLS específicos
  user_filters JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(screen_id, user_id)
);
```

**Uso:**
- Controla acesso granular às telas para VISUALIZADORES
- MASTER, ADMIN e DEV têm acesso a todas as telas do grupo

### Queries de Verificação de Acesso:

#### Verificar se usuário é Master:

```sql
SELECT is_master FROM users WHERE id = 'user-id';
```

#### Verificar grupos onde usuário é Admin:

```sql
SELECT company_group_id 
FROM user_group_membership 
WHERE user_id = 'user-id' 
  AND role = 'admin' 
  AND is_active = true;
```

#### Verificar se usuário é Developer:

```sql
-- Forma 1: Campo direto
SELECT developer_id FROM users WHERE id = 'user-id';

-- Forma 2: Via tabela
SELECT developer_id 
FROM developer_users 
WHERE user_id = 'user-id' 
  AND is_active = true;
```

#### Verificar telas que usuário pode ver:

```sql
-- Para MASTER/ADMIN/DEV: todas as telas do grupo
SELECT * FROM powerbi_screens 
WHERE company_group_id IN (-- grupos permitidos);

-- Para VISUALIZADOR: apenas telas atribuídas
SELECT s.* 
FROM powerbi_screens s
INNER JOIN powerbi_screen_users su ON s.id = su.screen_id
WHERE su.user_id = 'user-id' 
  AND su.can_view = true
  AND s.is_active = true;
```

---

## 🔐 Hierarquia de Permissões

```
┌─────────────────────────────────────────────────────┐
│                    MASTER                           │
│              (is_master = true)                     │
│  • Acesso total ao sistema                          │
│  • Sem limitações                                   │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├─── Pode criar e gerenciar
                  │
┌─────────────────▼───────────────────────────────────┐
│              DEVELOPER                              │
│         (developer_id preenchido)                   │
│  • Acesso a grupos vinculados                       │
│  • Pode gerenciar múltiplos grupos                  │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├─── Grupos vinculados via
                  │    company_groups.developer_id
                  │
┌─────────────────▼───────────────────────────────────┐
│                  ADMIN                              │
│    (user_group_membership.role = 'admin')          │
│  • Acesso ao grupo(s) onde é admin                  │
│  • Pode gerenciar usuários do grupo                 │
└─────────────────┬───────────────────────────────────┘
                  │
                  ├─── Membership ativo em
                  │    user_group_membership
                  │
┌─────────────────▼───────────────────────────────────┐
│              VISUALIZADOR                           │
│  (role = 'viewer' | 'user' | 'operator')           │
│  • Acesso apenas visual                             │
│  • Permissões granulares por tela                   │
└─────────────────────────────────────────────────────┘
```

### Regras de Prioridade:

1. **MASTER** sempre tem acesso total, independente de memberships
2. **DEV** tem acesso a grupos onde `developer_id` aponta para ele
3. **ADMIN** tem acesso a grupos onde tem membership com `role = 'admin'`
4. **VISUALIZADOR** tem acesso limitado por `powerbi_screen_users`

### Verificação em Cascata (do código):

```typescript
// Ordem de verificação:
1. Se is_master → Acesso total
2. Se developer_id → Acesso aos grupos do developer
3. Se membership com role='admin' → Acesso aos grupos admin
4. Caso contrário → Acesso visual limitado
```

---

## 🛣️ Rotas e APIs por Perfil

### Resumo Rápido:

| Rota/API | MASTER | ADMIN | DEV | VISUALIZADOR |
|----------|--------|-------|-----|--------------|
| `/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/dev/*` | ❌ | ❌ | ✅ | ❌ |
| `/configuracoes` | ✅ Completo | ✅ Limitado | ❌ | ❌ |
| `/configuracoes/planos` | ✅ | ❌ | ❌ | ❌ |
| `/configuracoes/modulos` | ✅ | ❌ | ❌ | ❌ |
| `/powerbi/*` | ✅ Todos | ✅ Grupo | ✅ Grupos DEV | ✅ Telas atribuídas |
| `/whatsapp/*` | ✅ Todos | ✅ Grupo | ✅ Grupos DEV | ✅ Visualização |
| `/alertas/*` | ✅ Todos | ✅ Grupo | ✅ Grupos DEV | ✅ Visual/Disparo |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ |
| `/tela/[id]` | ✅ | ✅ | ✅ | ✅ (se atribuída) |
| `/perfil` | ✅ | ✅ | ✅ | ✅ |
| `/api/admin/*` | ✅ | ❌ | ❌ | ❌ |
| `/api/dev/*` | ❌ | ❌ | ✅ | ❌ |
| `/api/config/*` | ✅ Sem filtro | ✅ Filtrado | ✅ Filtrado | ❌ |
| `/api/powerbi/*` | ✅ Sem filtro | ✅ Filtrado | ✅ Filtrado | ✅ Limitado |
| `/api/whatsapp/*` | ✅ Sem filtro | ✅ Filtrado | ✅ Filtrado | ✅ Limitado |
| `/api/alertas/*` | ✅ Sem filtro | ✅ Filtrado | ✅ Filtrado | ✅ Limitado |

### Detalhamento de Filtros:

#### APIs com Filtro de Grupo (para ADMIN e DEV):

```typescript
// Exemplo: /api/config/users
if (!user.is_master) {
  // ADMIN: filtrar por grupos onde é admin
  adminGroupIds = await getUserAdminGroups(supabase, user.id);
  
  // DEV: filtrar por grupos vinculados
  const developerId = await getUserDeveloperId(user.id);
  const { data: devGroups } = await supabase
    .from('company_groups')
    .select('id')
    .eq('developer_id', developerId);
  
  // Aplicar filtro na query
  query = query.in('company_group_id', adminGroupIds);
}
```

#### APIs com Filtro de Tela (para VISUALIZADOR):

```typescript
// Exemplo: /api/powerbi/screens
const isRegularUser = !user.is_master && !user.is_developer && user.role !== 'admin';

if (isRegularUser) {
  // Buscar apenas telas atribuídas via powerbi_screen_users
  query = query
    .select('*, screen_users!inner(user_id)')
    .eq('screen_users.user_id', user.id)
    .eq('screen_users.can_view', true);
}
```

---

## 📝 Notas Importantes

### 1. Verificação de Acesso Dupla

O sistema verifica acesso em **dois níveis**:

1. **Middleware (`middleware.ts`):** Verifica apenas autenticação (token JWT)
2. **API Routes:** Verificam permissões específicas (master/admin/dev/visualizador)

### 2. Filtros Aplicados

- **MASTER:** Sem filtros - vê tudo
- **DEV:** Filtro por `company_groups.developer_id`
- **ADMIN:** Filtro por `user_group_membership` com `role='admin'`
- **VISUALIZADOR:** Filtro por `powerbi_screen_users` e `user_group_membership`

### 3. Status do Usuário

Mesmo com permissões, se `users.status = 'suspended'`, o usuário **não tem acesso**.

### 4. Membership Inativo

Se `user_group_membership.is_active = false`, o usuário **perde acesso ao grupo**, mesmo sendo admin.

### 5. Múltiplos Grupos

Um usuário pode ter acesso a múltiplos grupos através de múltiplos memberships. ADMIN pode ser admin de vários grupos simultaneamente.

---

## 🔍 Localização das Verificações no Código

### Funções Principais:

1. **`src/lib/auth.ts`:**
   - `getAuthUser()`: Retorna usuário autenticado com `is_master`
   - `getUserDeveloperId()`: Verifica se é developer
   - `getAuthUserWithDeveloper()`: Retorna usuário com dados de developer

2. **`app/api/config/users/route.ts`:**
   - `getUserAdminGroups()`: Busca grupos onde usuário é admin
   - Lógica de filtros para GET/POST/PUT/DELETE

3. **`app/api/config/groups/route.ts`:**
   - Lógica de filtros para listar grupos permitidos

4. **`src/components/layout/Sidebar.tsx`:**
   - Exibe menus baseado em `user.is_master`, `user.is_developer`, `user.role`
   - Filtra itens do menu por perfil

5. **`middleware.ts`:**
   - Proteção básica de rotas (apenas autenticação)

---

**Última atualização:** Janeiro 2025

**Versão:** 1.0
