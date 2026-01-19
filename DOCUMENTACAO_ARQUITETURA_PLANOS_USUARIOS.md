# 🏗️ Documentação Completa - Arquitetura, Planos e Usuários

## 📋 Índice

1. [Arquitetura do Sistema](#arquitetura-do-sistema)
2. [Sistema de Planos e Quotas](#sistema-de-planos-e-quotas)
3. [Sistema de Usuários e Permissões](#sistema-de-usuários-e-permissões)
4. [Fluxos e Integrações](#fluxos-e-integrações)
5. [Segurança e Autenticação](#segurança-e-autenticação)

---

# 🏗️ Arquitetura do Sistema

## Visão Geral

O **MeuDashboard** é uma plataforma SaaS multi-tenant construída com tecnologias modernas, focada em integração com Power BI, automação via WhatsApp e inteligência artificial.

### Stack Tecnológica

```yaml
Frontend:
  - Framework: Next.js 16 (App Router)
  - Linguagem: TypeScript 5
  - Estilização: Tailwind CSS 4
  - UI Components: Lucide React Icons
  - Estado: React Context API + Hooks

Backend:
  - Runtime: Node.js (Edge Runtime para middleware)
  - API: Next.js API Routes
  - Autenticação: JWT (jsonwebtoken) + bcryptjs
  - Banco de Dados: PostgreSQL 15+ (Supabase)

Integrações:
  - Power BI: REST API + Embedded
  - IA: Anthropic Claude API (claude-sonnet-4-20250514)
  - WhatsApp: Evolution API
  - Storage: Supabase Storage
```

## Estrutura de Pastas

### Organização Geral

```
meudahsboard/
├── app/                          # Next.js App Router
│   ├── (pages)/                 # Páginas públicas e autenticadas
│   │   ├── login/               # Autenticação
│   │   ├── dashboard/           # Dashboard principal
│   │   ├── powerbi/             # Módulo Power BI
│   │   ├── whatsapp/            # Módulo WhatsApp
│   │   ├── alertas/             # Módulo de Alertas
│   │   ├── configuracoes/       # Configurações
│   │   ├── admin/               # Área Master
│   │   ├── dev/                 # Área Developer
│   │   └── administrador/       # Área Admin de Grupo
│   │
│   └── api/                     # API Routes (Backend)
│       ├── auth/                # Autenticação
│       ├── admin/               # APIs Master
│       ├── dev/                 # APIs Developer
│       ├── admin-group/         # APIs Admin de Grupo
│       ├── powerbi/             # APIs Power BI
│       ├── whatsapp/            # APIs WhatsApp
│       ├── alertas/             # APIs Alertas
│       ├── ai/                  # APIs IA
│       └── config/              # APIs Configurações
│
├── src/                          # Código fonte compartilhado
│   ├── components/              # Componentes React
│   │   ├── layout/             # Layout (Sidebar, Header, MainLayout)
│   │   ├── admin/              # Componentes Admin
│   │   ├── dashboard/           # Componentes Dashboard
│   │   ├── ui/                  # Componentes UI genéricos
│   │   └── whatsapp/           # Componentes WhatsApp
│   │
│   ├── contexts/                # Contextos React
│   │   ├── MenuContext.tsx     # Estado do menu
│   │   ├── ThemeContext.tsx    # Tema e cores dinâmicas
│   │   └── ToastContext.tsx    # Notificações
│   │
│   ├── hooks/                   # Hooks customizados
│   │   ├── useNotification.ts  # Hook de notificações
│   │   └── usePlanPermissions.ts # Hook de permissões
│   │
│   ├── lib/                     # Bibliotecas e utilitários
│   │   ├── auth.ts             # Autenticação e JWT
│   │   ├── supabase/           # Clientes Supabase
│   │   │   ├── admin.ts        # Cliente admin (service role)
│   │   │   └── client.ts       # Cliente público
│   │   ├── admin-helpers.ts    # Helpers para admin
│   │   ├── activity-log.ts     # Logging de atividades
│   │   ├── colors.ts           # Utilitários de cores
│   │   └── toast.tsx           # Sistema de toasts
│   │
│   ├── services/                # Serviços externos
│   └── types/                   # Tipagens TypeScript
│       └── index.ts            # Tipos compartilhados
│
├── public/                       # Arquivos estáticos
├── middleware.ts                 # Middleware Next.js (proteção de rotas)
├── package.json                  # Dependências
└── tsconfig.json                # Configuração TypeScript
```

## Camadas da Aplicação

### 1. Camada de Apresentação (Frontend)

```
┌─────────────────────────────────────────┐
│         CAMADA DE APRESENTAÇÃO           │
├─────────────────────────────────────────┤
│                                          │
│  📱 Páginas (app/*/page.tsx)            │
│     ├─ Componentes de Layout            │
│     ├─ Componentes de Negócio           │
│     └─ Hooks e Contextos                 │
│                                          │
│  🎨 UI Components                       │
│     ├─ Botões, Modais, Formulários      │
│     ├─ Tabelas, Cards, Listas           │
│     └─ Feedback (Toasts, Loading)        │
│                                          │
│  🔄 Estado Global                        │
│     ├─ ThemeContext (cores dinâmicas)    │
│     ├─ MenuContext (navegação)          │
│     └─ ToastContext (notificações)       │
│                                          │
└─────────────────────────────────────────┘
```

### 2. Camada de API (Backend)

```
┌─────────────────────────────────────────┐
│            CAMADA DE API                │
├─────────────────────────────────────────┤
│                                          │
│  🔐 Autenticação (app/api/auth/*)       │
│     ├─ POST /api/auth/login             │
│     ├─ POST /api/auth/logout            │
│     └─ GET  /api/auth/me                │
│                                          │
│  👑 Master APIs (app/api/admin/*)       │
│     ├─ Gestão de usuários               │
│     ├─ Gestão de grupos                 │
│     └─ Gestão de desenvolvedores       │
│                                          │
│  👨‍💻 Developer APIs (app/api/dev/*)    │
│     ├─ Dashboard e estatísticas         │
│     ├─ Gestão de grupos                 │
│     └─ Quotas e limites                 │
│                                          │
│  🏢 Admin APIs (app/api/admin-group/*)  │
│     ├─ Gestão de usuários do grupo      │
│     ├─ Logs e relatórios                │
│     └─ Ordem de telas                   │
│                                          │
│  📊 Power BI APIs (app/api/powerbi/*)   │
│     ├─ Conexões e relatórios            │
│     ├─ Telas e datasets                 │
│     └─ Refresh e atualizações           │
│                                          │
│  💬 WhatsApp APIs (app/api/whatsapp/*)  │
│     ├─ Instâncias e grupos              │
│     ├─ Mensagens e webhooks             │
│     └─ Números autorizados              │
│                                          │
│  🤖 IA APIs (app/api/ai/*)               │
│     ├─ Chat e conversas                 │
│     ├─ Contextos e modelos              │
│     └─ Geração de DAX e alertas          │
│                                          │
└─────────────────────────────────────────┘
```

### 3. Camada de Dados

```
┌─────────────────────────────────────────┐
│          CAMADA DE DADOS                │
├─────────────────────────────────────────┤
│                                          │
│  🗄️ Supabase PostgreSQL                 │
│     ├─ Tabelas Core                      │
│     │   ├─ users                         │
│     │   ├─ company_groups                 │
│     │   └─ developers                    │
│     │                                    │
│     ├─ Tabelas de Relacionamento         │
│     │   ├─ user_group_membership         │
│     │   └─ module_groups                 │
│     │                                    │
│     ├─ Tabelas de Funcionalidades        │
│     │   ├─ powerbi_*                     │
│     │   ├─ whatsapp_*                    │
│     │   ├─ ai_*                          │
│     │   └─ alertas                       │
│     │                                    │
│     └─ Tabelas de Auditoria              │
│         ├─ activity_logs                 │
│         └─ usage_summary                 │
│                                          │
│  🔐 Row Level Security (RLS)             │
│     └─ Políticas de acesso por tenant   │
│                                          │
│  📦 Supabase Storage                    │
│     └─ Logos, avatares, arquivos        │
│                                          │
└─────────────────────────────────────────┘
```

## Padrões Arquiteturais

### 1. Multi-Tenancy

O sistema implementa **multi-tenancy por grupo**:

```typescript
// Cada grupo é isolado
company_groups {
  id: UUID
  name: string
  developer_id: UUID  // Vinculado a um desenvolvedor
  // ... quotas e limites
}

// Usuários podem pertencer a múltiplos grupos
user_group_membership {
  user_id: UUID
  company_group_id: UUID
  role: 'admin' | 'user'
  is_active: boolean
}
```

### 2. Autenticação e Autorização

```typescript
// Fluxo de autenticação
1. Login → POST /api/auth/login
   ├─ Valida credenciais
   ├─ Gera JWT token
   └─ Define cookie httpOnly

2. Middleware → middleware.ts
   ├─ Verifica cookie
   ├─ Valida JWT
   └─ Protege rotas

3. API Routes → getAuthUser()
   ├─ Decodifica JWT
   ├─ Busca usuário no BD
   └─ Verifica permissões
```

### 3. Context API para Estado Global

```typescript
// ThemeContext - Cores dinâmicas por grupo/dev
const { primaryColor, setTheme } = useTheme();

// MenuContext - Estado do menu lateral
const { isOpen, toggle } = useMenu();

// ToastContext - Notificações
const { showToast } = useToast();
```

### 4. API Routes Pattern

```typescript
// Padrão de API Route
export async function GET(request: NextRequest) {
  // 1. Autenticação
  const user = await getAuthUser();
  if (!user) return 401;

  // 2. Validação de permissões
  if (!hasPermission(user, resource)) return 403;

  // 3. Lógica de negócio
  const data = await fetchData();

  // 4. Resposta
  return NextResponse.json(data);
}
```

## Fluxo de Requisição

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP Request
       ↓
┌──────────────────┐
│   Middleware     │ ← Verifica JWT, protege rotas
│  (middleware.ts) │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   Page/API       │ ← Renderiza página ou processa API
│  (app/**/*.tsx)  │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  getAuthUser()   │ ← Valida usuário e permissões
│  (lib/auth.ts)   │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│  Supabase Client │ ← Query no banco de dados
│  (lib/supabase)   │
└──────┬───────────┘
       │
       ↓
┌──────────────────┐
│   PostgreSQL     │ ← Retorna dados
│   (Supabase)     │
└──────────────────┘
```

---

# 💰 Sistema de Planos e Quotas

## Visão Geral

O sistema utiliza um modelo de **limites por desenvolvedor** com distribuição flexível de quotas entre grupos.

### Arquitetura de Planos

```
┌─────────────────────────────────────────────┐
│            DESENVOLVEDOR (Developer)        │
├─────────────────────────────────────────────┤
│  Limites Globais:                           │
│  ├─ max_companies: 10                       │
│  ├─ max_users: 100                          │
│  ├─ max_powerbi_screens: 50                 │
│  ├─ max_daily_refreshes: 200                │
│  ├─ max_chat_messages_per_day: 1000         │
│  ├─ max_alerts: 50                          │
│  └─ monthly_price: 999.00                   │
└──────────────────┬──────────────────────────┘
                   │ 1:N
                   ↓
┌─────────────────────────────────────────────┐
│         GRUPO (Company Group)               │
├─────────────────────────────────────────────┤
│  Quotas Distribuídas:                       │
│  ├─ quota_users: 20                         │
│  ├─ quota_screens: 10                        │
│  ├─ quota_refreshes: 50                     │
│  ├─ quota_chat_messages: 200                │
│  └─ quota_alerts: 10                        │
└─────────────────────────────────────────────┘
```

## Tabela `developers`

Armazena os limites globais de cada desenvolvedor/revendedor:

```sql
CREATE TABLE developers (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  
  -- Limites Globais
  max_companies INTEGER DEFAULT 10,
  max_users INTEGER DEFAULT 100,
  max_powerbi_screens INTEGER DEFAULT 50,
  max_daily_refreshes INTEGER DEFAULT 200,
  max_chat_messages_per_day INTEGER DEFAULT 1000,
  max_alerts INTEGER DEFAULT 50,
  
  -- Preço
  monthly_price DECIMAL(10,2) DEFAULT 0,
  
  -- Metadados
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Tabela `company_groups`

Armazena as quotas distribuídas para cada grupo:

```sql
CREATE TABLE company_groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  developer_id UUID REFERENCES developers(id),
  
  -- Quotas Distribuídas
  quota_users INTEGER DEFAULT 10,
  quota_screens INTEGER DEFAULT 5,
  quota_refreshes INTEGER DEFAULT 20,
  quota_chat_messages INTEGER DEFAULT 100,
  quota_alerts INTEGER DEFAULT 5,
  quota_whatsapp_per_day INTEGER DEFAULT 50,
  quota_ai_credits_per_day INTEGER DEFAULT 100,
  quota_alert_executions_per_day INTEGER DEFAULT 20,
  
  -- Configurações
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  use_developer_colors BOOLEAN DEFAULT true,
  
  -- Status
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP
);
```

## Regras de Distribuição

### 1. Validação de Limites

```typescript
// Ao criar/editar grupo, validar se quotas não excedem limites do dev
const totalQuotaUsers = sum(company_groups.quota_users WHERE developer_id = X);
if (totalQuotaUsers + newQuota > developer.max_users) {
  throw new Error('Limite de usuários excedido');
}
```

### 2. Verificação de Quotas

```typescript
// Ao criar recurso, verificar quota do grupo
async function createPowerBIScreen(groupId: string) {
  const group = await getGroup(groupId);
  const currentScreens = await countScreens(groupId);
  
  if (currentScreens >= group.quota_screens) {
    throw new Error('Quota de telas excedida');
  }
  
  // Criar tela...
}
```

### 3. Uso Diário

```typescript
// Contadores diários para limites
powerbi_daily_refresh_count {
  company_group_id: UUID
  refresh_date: DATE
  count: INTEGER
}

// Verificar antes de refresh
if (todayCount >= group.quota_refreshes) {
  throw new Error('Limite diário de refreshes atingido');
}
```

## Tipos de Limites

### 1. Limites Estáticos (Configuração)

- **Usuários**: Número máximo de usuários ativos
- **Telas Power BI**: Número máximo de telas criadas
- **Alertas**: Número máximo de alertas configurados

### 2. Limites Diários (Uso)

- **Refreshes Power BI**: Atualizações por dia
- **Mensagens WhatsApp**: Mensagens enviadas por dia
- **Mensagens IA**: Consultas ao chat por dia
- **Execuções de Alertas**: Alertas executados por dia

### 3. Limites Mensais (Uso)

- **Mensagens WhatsApp**: Total mensal
- **Créditos IA**: Total mensal

## APIs de Gestão de Planos

### Developer - Ver Quotas

```typescript
GET /api/dev/quotas
Response: {
  developer: {
    max_companies: 10,
    max_users: 100,
    // ...
  },
  used: {
    companies: 5,
    users: 45,
    // ...
  },
  available: {
    companies: 5,
    users: 55,
    // ...
  },
  groups: [
    {
      id: "...",
      name: "Grupo A",
      quotas: { users: 20, screens: 10, ... }
    }
  ]
}
```

### Admin - Distribuir Quotas

```typescript
PUT /api/dev/groups/[id]
Body: {
  quota_users: 25,
  quota_screens: 15,
  // ...
}
```

## Exemplo de Distribuição

```
Desenvolvedor "Tech Solutions"
├─ Limite Global: 100 usuários
│
├─ Grupo "Empresa A"
│  └─ Quota: 30 usuários (30% do total)
│
├─ Grupo "Empresa B"
│  └─ Quota: 40 usuários (40% do total)
│
└─ Grupo "Empresa C"
   └─ Quota: 30 usuários (30% do total)
   └─ Total usado: 100 usuários (100%)
```

---

# 👥 Sistema de Usuários e Permissões

## Hierarquia de Usuários

```
                    👑 MASTER
                    (is_master: true)
                         │
                         │ Acesso Global
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
   👨‍💻 DEVELOPER    🏢 ADMIN         👤 USER
   (is_developer)   (role: 'admin')   (role: 'user')
        │                │                │
        │                │                │
        │         ┌──────┴──────┐         │
        │         │             │         │
        │    Grupo A        Grupo B        │
        │    (admin)        (admin)        │
        │                                   │
        └───────────┬───────────────────────┘
                    │
              Grupos Vinculados
```

## Tipos de Usuários

### 1. 👑 MASTER

**Identificação:**
- Campo: `users.is_master = true`
- Acesso: Global (todo o sistema)

**Características:**
- Único perfil com acesso irrestrito
- Pode criar outros usuários master
- Gerencia desenvolvedores, grupos e planos
- Acessa todas as áreas administrativas

**Permissões:**
```typescript
✅ Criar/editar/excluir qualquer usuário
✅ Criar/editar/excluir desenvolvedores
✅ Criar/editar/excluir grupos
✅ Acessar todos os logs e relatórios
✅ Configurar planos e limites
✅ Acessar todas as APIs
```

**Rotas Acessíveis:**
- `/admin/*` - Área administrativa completa
- `/configuracoes/*` - Configurações globais
- Todas as rotas do sistema

### 2. 👨‍💻 DEVELOPER

**Identificação:**
- Campo: `users.is_developer = true` OU `users.is_developer_user = true`
- Campo: `users.developer_id = UUID` (vinculado a um desenvolvedor)

**Características:**
- Revendedor/parceiro do sistema
- Gerencia seus próprios grupos
- Distribui quotas entre grupos
- Visualiza estatísticas e uso

**Permissões:**
```typescript
✅ Criar/editar grupos vinculados ao seu developer_id
✅ Distribuir quotas entre grupos
✅ Ver estatísticas e uso dos grupos
✅ Gerenciar usuários dos seus grupos
✅ Acessar Power BI, WhatsApp, Alertas dos seus grupos
❌ Não pode criar outros desenvolvedores
❌ Não pode acessar grupos de outros desenvolvedores
```

**Rotas Acessíveis:**
- `/dev/*` - Dashboard e gestão de grupos
- `/powerbi/*` - Power BI (apenas grupos próprios)
- `/whatsapp/*` - WhatsApp (apenas grupos próprios)
- `/alertas/*` - Alertas (apenas grupos próprios)

### 3. 🏢 ADMIN (Administrador de Grupo)

**Identificação:**
- Campo: `user_group_membership.role = 'admin'`
- Campo: `user_group_membership.is_active = true`
- Escopo: Grupo(s) específico(s)

**Características:**
- Administra um ou mais grupos específicos
- Gerencia usuários do grupo
- Configura telas, alertas e WhatsApp do grupo
- Visualiza logs e relatórios do grupo

**Permissões:**
```typescript
✅ Criar/editar/excluir usuários do grupo
✅ Ativar/desativar usuários
✅ Ordenar telas para usuários
✅ Criar/editar/excluir telas Power BI do grupo
✅ Criar/editar/excluir alertas do grupo
✅ Gerenciar números WhatsApp do grupo
✅ Ver logs e relatórios do grupo
❌ Não pode criar outros grupos
❌ Não pode alterar quotas do grupo
❌ Não pode acessar outros grupos
```

**Rotas Acessíveis:**
- `/administrador/[id]/*` - Dashboard do grupo
- `/administrador/[id]/usuarios` - Gestão de usuários
- `/administrador/[id]/logs` - Logs do grupo
- `/powerbi/telas` - Telas (apenas do grupo)
- `/whatsapp/numeros` - Números (apenas do grupo)
- `/alertas/*` - Alertas (apenas do grupo)

### 4. 👤 USER (Visualizador)

**Identificação:**
- Campo: `user_group_membership.role = 'user'`
- Campo: `user_group_membership.is_active = true`
- Escopo: Grupo(s) atribuído(s)

**Características:**
- Usuário final do sistema
- Visualiza dashboards e telas Power BI
- Pode usar chat IA (se habilitado)
- Acesso limitado às funcionalidades

**Permissões:**
```typescript
✅ Visualizar telas Power BI atribuídas
✅ Usar chat IA (se can_use_ai = true)
✅ Ver dashboard do grupo
✅ Ver próprio perfil e logs
❌ Não pode criar/editar recursos
❌ Não pode gerenciar usuários
❌ Não pode configurar alertas
❌ Não pode acessar configurações administrativas
```

**Rotas Acessíveis:**
- `/dashboard` - Dashboard principal
- `/tela/[id]` - Visualizar telas Power BI
- `/configuracoes` - Próprio perfil
- `/configuracoes/logs` - Próprios logs

## Tabela `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Perfis
  is_master BOOLEAN DEFAULT false,
  is_developer BOOLEAN DEFAULT false,
  is_developer_user BOOLEAN DEFAULT false,
  developer_id UUID REFERENCES developers(id),
  
  -- Status
  status TEXT DEFAULT 'active', -- active, suspended, pending
  role TEXT DEFAULT 'user', -- user, admin, master
  
  -- Metadados
  avatar_url TEXT,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Tabela `user_group_membership`

Relacionamento N:N entre usuários e grupos:

```sql
CREATE TABLE user_group_membership (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  company_group_id UUID REFERENCES company_groups(id),
  
  -- Permissões no grupo
  role TEXT DEFAULT 'user', -- 'admin' | 'user'
  is_active BOOLEAN DEFAULT true,
  
  -- Permissões específicas
  can_use_ai BOOLEAN DEFAULT false,
  can_refresh BOOLEAN DEFAULT false,
  
  -- Metadados
  created_at TIMESTAMP
);
```

## Sistema de Autenticação

### Fluxo de Login

```typescript
1. POST /api/auth/login
   ├─ Recebe: { email, password }
   ├─ Busca usuário no BD
   ├─ Valida senha (bcrypt.compare)
   ├─ Busca grupos e roles
   ├─ Gera JWT token
   └─ Retorna: { token, user }

2. Cookie httpOnly
   ├─ Nome: 'auth_token'
   ├─ HttpOnly: true
   ├─ Secure: true (produção)
   └─ MaxAge: 7 dias

3. JWT Payload
   {
     id: string,
     email: string,
     name: string,
     role: 'master' | 'admin' | 'user',
     groupIds: string[],
     developerId: string | null,
     isDeveloperUser: boolean
   }
```

### Middleware de Proteção

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  
  if (!token) {
    return redirect('/login');
  }
  
  try {
    const decoded = jwt.verify(token.value, JWT_SECRET);
    // Permite acesso
  } catch {
    return redirect('/login');
  }
}
```

### Verificação de Permissões

```typescript
// lib/auth.ts
export async function getAuthUser() {
  const token = getTokenFromCookie();
  const decoded = jwt.decode(token);
  
  // Busca usuário atualizado no BD
  const user = await supabase
    .from('users')
    .select('*')
    .eq('id', decoded.id)
    .single();
  
  return user;
}

// Verificação de admin de grupo
export async function isUserAdminOfGroup(
  userId: string, 
  groupId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', userId)
    .eq('company_group_id', groupId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();
  
  return !!data;
}
```

## Matriz de Permissões

| Recurso | MASTER | DEVELOPER | ADMIN | USER |
|---------|--------|-----------|-------|------|
| **Usuários** |
| Criar usuários | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Editar usuários | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ✅ Próprio |
| Excluir usuários | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| **Grupos** |
| Criar grupos | ✅ | ✅ | ❌ | ❌ |
| Editar grupos | ✅ Todos | ✅ Seus | ✅ Seu | ❌ |
| Excluir grupos | ✅ Todos | ✅ Seus | ❌ | ❌ |
| **Power BI** |
| Criar telas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Editar telas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Excluir telas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Ver telas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ✅ Atribuídas |
| **WhatsApp** |
| Gerenciar instâncias | ✅ | ✅ | ❌ | ❌ |
| Gerenciar números | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Ver mensagens | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| **Alertas** |
| Criar alertas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Editar alertas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| Excluir alertas | ✅ Todos | ✅ Seus grupos | ✅ Seu grupo | ❌ |
| **IA** |
| Usar chat | ✅ | ✅ | ✅ | ✅ (se habilitado) |
| Criar contextos | ✅ Todos | ✅ Seus grupos | ❌ | ❌ |
| **Logs** |
| Ver todos os logs | ✅ | ✅ Seus grupos | ✅ Seu grupo | ✅ Próprios |
| **Configurações** |
| Acessar /admin | ✅ | ❌ | ❌ | ❌ |
| Acessar /dev | ❌ | ✅ | ❌ | ❌ |
| Acessar /administrador | ❌ | ❌ | ✅ | ❌ |
| Acessar /configuracoes | ✅ | ✅ | ✅ | ✅ |

## Casos de Uso

### Caso 1: Usuário Admin de Múltiplos Grupos

```typescript
// Usuário "João" é admin de 2 grupos
user_group_membership [
  { user_id: "joao", company_group_id: "grupo-a", role: "admin" },
  { user_id: "joao", company_group_id: "grupo-b", role: "admin" }
]

// Ao acessar /administrador
// Sistema redireciona para /administrador/[primeiro-grupo]
// Ou mostra seletor de grupos
```

### Caso 2: Usuário Comum em Múltiplos Grupos

```typescript
// Usuário "Maria" é user em 3 grupos
user_group_membership [
  { user_id: "maria", company_group_id: "grupo-x", role: "user" },
  { user_id: "maria", company_group_id: "grupo-y", role: "user" },
  { user_id: "maria", company_group_id: "grupo-z", role: "user" }
]

// Dashboard mostra telas de todos os grupos
// Filtro por grupo disponível
```

### Caso 3: Developer com Múltiplos Grupos

```typescript
// Developer "Tech Solutions" tem 5 grupos
company_groups [
  { id: "g1", developer_id: "tech-solutions", quota_users: 20 },
  { id: "g2", developer_id: "tech-solutions", quota_users: 30 },
  // ...
]

// Dashboard /dev mostra:
// - Total de quotas usadas
// - Distribuição entre grupos
// - Estatísticas consolidadas
```

---

# 🔄 Fluxos e Integrações

## Fluxo de Autenticação Completo

```
1. Usuário acessa /login
   ↓
2. Preenche email e senha
   ↓
3. POST /api/auth/login
   ├─ Valida credenciais
   ├─ Busca grupos e roles
   ├─ Gera JWT
   └─ Define cookie
   ↓
4. Redireciona conforme role:
   ├─ MASTER → /admin
   ├─ DEVELOPER → /dev
   ├─ ADMIN → /administrador/[id]
   └─ USER → /dashboard
   ↓
5. Middleware protege rotas
   ├─ Verifica cookie
   ├─ Valida JWT
   └─ Permite/nega acesso
```

## Fluxo de Criação de Grupo

```
1. Developer acessa /dev/groups
   ↓
2. Clica em "Novo Grupo"
   ↓
3. Preenche formulário
   ├─ Nome, logo, cores
   └─ Distribui quotas
   ↓
4. POST /api/dev/groups
   ├─ Valida quotas disponíveis
   ├─ Cria grupo
   └─ Retorna grupo criado
   ↓
5. Redireciona para /dev/groups/[id]
   └─ Mostra dashboard do grupo
```

## Integração Power BI

```
1. Admin configura conexão
   POST /api/powerbi/connections
   ↓
2. Sistema autentica com Power BI
   ├─ OAuth 2.0 Client Credentials
   └─ Armazena access_token
   ↓
3. Lista workspaces e relatórios
   GET /api/powerbi/reports
   ↓
4. Cria tela Power BI
   POST /api/powerbi/screens
   ├─ Vincula relatório
   └─ Configura permissões
   ↓
5. Usuário visualiza tela
   GET /tela/[id]
   ├─ Gera embed token
   └─ Renderiza Power BI Embedded
```

## Integração WhatsApp

```
1. Admin configura instância
   POST /api/whatsapp/instances
   ↓
2. Sistema conecta com Evolution API
   ├─ Webhook para mensagens
   └─ Armazena instância
   ↓
3. Admin autoriza números
   POST /api/whatsapp/authorized-numbers
   ↓
4. Webhook recebe mensagem
   POST /api/whatsapp/webhook
   ├─ Processa mensagem
   ├─ Consulta IA (se necessário)
   └─ Responde automaticamente
```

## Integração IA (Claude)

```
1. Usuário envia mensagem
   POST /api/ai/chat
   ↓
2. Sistema busca contexto
   ├─ Contextos do grupo
   └─ Histórico da conversa
   ↓
3. Chama Claude API
   ├─ Model: claude-sonnet-4
   ├─ System prompt
   └─ Messages
   ↓
4. Processa resposta
   ├─ Executa ações (se necessário)
   └─ Retorna resposta
   ↓
5. Salva no histórico
   └─ ai_conversations, ai_messages
```

---

# 🔐 Segurança e Autenticação

## Camadas de Segurança

### 1. Middleware (Edge Runtime)

```typescript
// middleware.ts
- Verifica cookie auth_token
- Valida assinatura JWT
- Verifica expiração
- Redireciona para /login se inválido
```

### 2. API Routes

```typescript
// Todas as APIs
- getAuthUser() valida usuário
- Verifica permissões específicas
- Retorna 401/403 se não autorizado
```

### 3. Row Level Security (RLS)

```sql
-- Políticas no Supabase
- Usuários só veem seus próprios dados
- Admins veem dados do grupo
- Developers veem dados dos seus grupos
```

### 4. Validação de Quotas

```typescript
// Antes de criar recurso
- Verifica quota disponível
- Bloqueia se exceder limite
- Retorna erro descritivo
```

## Boas Práticas

1. **Senhas**: Hash com bcrypt (salt rounds: 10)
2. **Tokens**: JWT com expiração de 7 dias
3. **Cookies**: HttpOnly, Secure (produção)
4. **Validação**: Sempre validar entrada do usuário
5. **Logs**: Registrar todas as ações importantes
6. **RLS**: Sempre usar políticas de segurança no Supabase

---

# 📊 Resumo Executivo

## Arquitetura

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Supabase PostgreSQL
- **Autenticação**: JWT + Cookies HttpOnly
- **Padrão**: Multi-tenant por grupo

## Planos

- **Modelo**: Limites por desenvolvedor
- **Distribuição**: Quotas flexíveis entre grupos
- **Tipos**: Estáticos, diários e mensais

## Usuários

- **Hierarquia**: Master > Developer > Admin > User
- **Permissões**: Baseadas em role e escopo
- **Multi-grupo**: Usuários podem pertencer a múltiplos grupos

---

**Última atualização**: Janeiro 2025  
**Versão do documento**: 1.0
