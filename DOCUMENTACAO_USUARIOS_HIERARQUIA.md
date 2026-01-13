# 👥 Documentação Completa - Usuários, Login, Grupos e Hierarquia

## 📋 Índice

1. [Visão Geral da Arquitetura Multi-Tenant](#visão-geral-da-arquitetura-multi-tenant)
2. [Sistema de Autenticação](#sistema-de-autenticação)
3. [Usuários](#usuários)
4. [Grupos de Empresas](#grupos-de-empresas)
5. [Hierarquia e Permissões](#hierarquia-e-permissões)
6. [Planos e Licenciamento](#planos-e-licenciamento)
7. [Módulos do Sistema](#módulos-do-sistema)
8. [Fluxos Completos](#fluxos-completos)
9. [Casos de Uso Avançados](#casos-de-uso-avançados)
10. [Segurança](#segurança)

---

## 🏗️ Visão Geral da Arquitetura Multi-Tenant

### O que é Multi-Tenant?

O MeuDashboard é uma aplicação **multi-tenant**, onde:
- **Um único sistema** serve múltiplos clientes (tenants)
- Cada cliente (grupo) tem seus **dados isolados**
- **Usuários podem pertencer a múltiplos grupos**
- Cada grupo tem suas **configurações independentes**

### Pirâmide Hierárquica

```
                    🏢 MEUDASHBOARD (Sistema)
                            │
                ┌───────────┴───────────┐
                │                       │
        📦 PLANO BÁSICO          📦 PLANO ENTERPRISE
                │                       │
        ┌───────┴───────┐       ┌───────┴───────┐
        │               │       │               │
    🏢 Grupo A      🏢 Grupo B  🏢 Grupo C  🏢 Grupo D
        │               │       │               │
    ┌───┴───┐       ┌───┴───┐  └───┬───┬───────┘
    │       │       │       │      │   │
   👤A1   👤A2    👤B1   👤B2    👤C1 👤C2
```

### Exemplo Real

```
🏢 MeuDashboard SaaS
    │
    ├─ 📦 Plano Básico (R$ 199/mês)
    │   └─ 🏢 Padaria Pão Quente
    │       ├─ 👤 João (dono) - admin
    │       ├─ 👤 Maria (gerente) - manager
    │       └─ 👤 Pedro (vendedor) - viewer
    │       │
    │       ├─ 📊 3 dashboards Power BI
    │       ├─ 🔔 5 alertas configurados
    │       └─ 📱 1 instância WhatsApp
    │
    └─ 📦 Plano Enterprise (R$ 999/mês)
        └─ 🏢 Rede de Supermercados ABC
            ├─ 👤 Carlos (diretor) - admin
            ├─ 👤 Ana (analista) - manager
            ├─ 👤 Paulo (gerente loja 1) - operator
            └─ 👤 Lucia (gerente loja 2) - operator
            │
            ├─ 📊 50 dashboards Power BI
            ├─ 🔔 200 alertas ativos
            └─ 📱 3 instâncias WhatsApp
```

---

## 🔐 Sistema de Autenticação

### Tecnologias Utilizadas

- **JWT (JSON Web Tokens)** - Tokens assinados com HS256
- **Cookies HTTP-Only** - Armazenamento seguro no navegador
- **bcrypt** - Hash de senhas (salt rounds: 10)
- **Session ID** - Controle de sessão única

### Arquitetura de Segurança

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADAS DE SEGURANÇA                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1️⃣ MIDDLEWARE (Edge Runtime)                           │
│     ├─ Verifica existência do cookie auth_token         │
│     ├─ Valida assinatura JWT (HS256)                    │
│     ├─ Verifica expiração do token                      │
│     └─ Bloqueia acesso se inválido                      │
│                                                           │
│  2️⃣ GETAUTHUSER() (Server Side)                         │
│     ├─ Decodifica JWT do cookie                         │
│     ├─ Busca usuário no banco de dados                  │
│     ├─ Compara session_id (JWT vs Banco)                │
│     ├─ Verifica status do usuário (active/suspended)    │
│     └─ Retorna usuário ou null                          │
│                                                           │
│  3️⃣ AUTORIZAÇÃO (Por Recurso)                           │
│     ├─ Valida role do usuário no grupo                  │
│     ├─ Verifica módulos habilitados                     │
│     ├─ Aplica limites do plano                          │
│     └─ Permite/nega acesso ao recurso                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Login Detalhado

```
┌──────────────────────────────────────────────────────────────┐
│                     FLUXO DE LOGIN                            │
└──────────────────────────────────────────────────────────────┘

1. USUÁRIO PREENCHE FORMULÁRIO
   ┌─────────────────────┐
   │ Email: joão@xyz.com │
   │ Senha: ••••••••••• │
   └─────────────────────┘
           │
           ↓
2. FRONTEND ENVIA POST /api/auth/login
   {
     "email": "joão@xyz.com",
     "password": "senha123"
   }
           │
           ↓
3. API VALIDA CREDENCIAIS
   ┌──────────────────────────────────┐
   │ SELECT * FROM users              │
   │ WHERE email = 'joão@xyz.com'     │
   └──────────────────────────────────┘
           │
           ↓
4. API COMPARA SENHA COM HASH (bcrypt)
   ┌──────────────────────────────────┐
   │ bcrypt.compare(                  │
   │   'senha123',                    │
   │   '$2a$10$...' // hash do banco  │
   │ )                                │
   └──────────────────────────────────┘
           │
           ↓ ✅ Senha válida
5. API GERA SESSION_ID ÚNICO
   ┌──────────────────────────────────┐
   │ sessionId = crypto.randomUUID()  │
   │ // Exemplo: "a1b2c3d4-..."       │
   └──────────────────────────────────┘
           │
           ↓
6. API SALVA SESSION_ID NO BANCO
   ┌──────────────────────────────────┐
   │ UPDATE users                     │
   │ SET current_session_id = sessionId│
   │ WHERE id = userId                │
   └──────────────────────────────────┘
   📌 IMPORTANTE: Isso invalida sessões anteriores!
           │
           ↓
7. API CRIA TOKEN JWT
   ┌──────────────────────────────────┐
   │ {                                │
   │   "id": "uuid-do-usuario",       │
   │   "email": "joão@xyz.com",       │
   │   "is_master": false,            │
   │   "session_id": "a1b2c3d4-...",  │
   │   "iat": 1704808800,             │
   │   "exp": 1705413600  // 7 dias   │
   │ }                                │
   └──────────────────────────────────┘
           │
           ↓
8. API ASSINA TOKEN (HS256)
   ┌──────────────────────────────────┐
   │ HMACSHA256(                      │
   │   base64(header) + "." +         │
   │   base64(payload),               │
   │   JWT_SECRET                     │
   │ )                                │
   └──────────────────────────────────┘
   Resultado: eyJhbGciOiJIUzI1NiIs...
           │
           ↓
9. API DEFINE COOKIE HTTP-ONLY
   ┌──────────────────────────────────┐
   │ Set-Cookie: auth_token=eyJ...    │
   │ HttpOnly; Secure; SameSite=Lax;  │
   │ Max-Age=604800; Path=/;          │
   │ Domain=.meudashboard.org         │
   └──────────────────────────────────┘
   🔒 JavaScript não pode acessar
           │
           ↓
10. API RETORNA DADOS DO USUÁRIO
   ┌──────────────────────────────────┐
   │ {                                │
   │   "success": true,               │
   │   "user": {                      │
   │     "id": "uuid",                │
   │     "email": "joão@xyz.com",     │
   │     "full_name": "João Silva",   │
   │     "is_master": false           │
   │   }                              │
   │ }                                │
   └──────────────────────────────────┘
           │
           ↓
11. FRONTEND SALVA DADOS NO ESTADO
    ┌──────────────────────────────────┐
    │ localStorage.setItem(            │
    │   'user',                        │
    │   JSON.stringify(user)           │
    │ )                                │
    └──────────────────────────────────┘
           │
           ↓
12. FRONTEND REDIRECIONA
    window.location.href = '/dashboard'
```

### Sessão Única (Single Session)

#### Por que Sessão Única?

1. **Segurança:** Evita múltiplos logins simultâneos
2. **Controle:** Empresa sabe exatamente quem está usando
3. **Licenciamento:** Impede compartilhamento de credenciais

#### Como Funciona?

```
CENÁRIO: João faz login no Notebook às 8h
         João faz login no Celular às 9h

┌─────────────────────────────────────────────────────────┐
│ LINHA DO TEMPO                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 08:00 - 💻 NOTEBOOK                                     │
│ ┌────────────────────────────────────┐                 │
│ │ Login de João                      │                 │
│ │ session_id: "aaa-111"              │                 │
│ │                                    │                 │
│ │ Banco de dados:                    │                 │
│ │ current_session_id = "aaa-111"     │                 │
│ │                                    │                 │
│ │ JWT do Notebook:                   │                 │
│ │ { session_id: "aaa-111" }          │                 │
│ │                                    │                 │
│ │ ✅ NOTEBOOK ESTÁ LOGADO            │                 │
│ └────────────────────────────────────┘                 │
│                                                          │
│ 09:00 - 📱 CELULAR                                      │
│ ┌────────────────────────────────────┐                 │
│ │ Login de João                      │                 │
│ │ session_id: "bbb-222" (NOVO)       │                 │
│ │                                    │                 │
│ │ Banco de dados:                    │                 │
│ │ current_session_id = "bbb-222" ⬅️  │                 │
│ │ (Substituiu "aaa-111")             │                 │
│ │                                    │                 │
│ │ JWT do Celular:                    │                 │
│ │ { session_id: "bbb-222" }          │                 │
│ │                                    │                 │
│ │ ✅ CELULAR ESTÁ LOGADO             │                 │
│ └────────────────────────────────────┘                 │
│                                                          │
│ 09:01 - 💻 NOTEBOOK (próxima requisição)               │
│ ┌────────────────────────────────────┐                 │
│ │ getAuthUser() valida:              │                 │
│ │                                    │                 │
│ │ JWT: { session_id: "aaa-111" }     │                 │
│ │ Banco: current_session_id = "bbb-222"│                │
│ │                                    │                 │
│ │ "aaa-111" ≠ "bbb-222"              │                 │
│ │                                    │                 │
│ │ ❌ SESSÃO INVALIDADA                │                 │
│ │ ↳ Redireciona para /login          │                 │
│ └────────────────────────────────────┘                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Código de Validação

```typescript
// src/lib/auth.ts - getAuthUser()

export async function getAuthUser(): Promise<AuthUser | null> {
  // 1. Pega token do cookie
  const token = cookieStore.get('auth_token')?.value;
  
  // 2. Decodifica JWT
  const payload = await verifyToken(token);
  const sessionIdFromToken = payload.session_id;
  
  // 3. Busca usuário no banco
  const { data: user } = await supabase
    .from('users')
    .select('id, email, current_session_id, ...')
    .eq('id', payload.id)
    .single();
  
  // 4. Compara session_id
  if (user.current_session_id !== sessionIdFromToken) {
    return null; // ❌ Sessão invalidada
  }
  
  // 5. Retorna usuário
  return user; // ✅ Sessão válida
}
```

### Logout

#### Fluxo de Logout

```
1. Usuário clica em "Sair"
   │
   ↓
2. Frontend: POST /api/auth/logout
   │
   ↓
3. API remove cookie
   ┌──────────────────────────────────┐
   │ Set-Cookie: auth_token=;         │
   │ Max-Age=0; Path=/;               │
   └──────────────────────────────────┘
   │
   ↓
4. API registra log
   ┌──────────────────────────────────┐
   │ INSERT INTO activity_logs (      │
   │   user_id,                       │
   │   action_type = 'logout',        │
   │   ...                            │
   │ )                                │
   └──────────────────────────────────┘
   │
   ↓
5. API retorna sucesso
   │
   ↓
6. Frontend limpa estado
   ┌──────────────────────────────────┐
   │ localStorage.clear()             │
   │ sessionStorage.clear()           │
   └──────────────────────────────────┘
   │
   ↓
7. Frontend redireciona
   window.location.href = '/login'
```

---

## 👤 Usuários

### Tabela `users`

```sql
CREATE TABLE users (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  
  -- Autenticação
  password_hash TEXT NOT NULL,              -- bcrypt hash
  current_session_id UUID,                  -- Sessão ativa
  
  -- Informações Pessoais
  full_name TEXT,
  avatar_url TEXT,
  
  -- Permissões
  is_master BOOLEAN DEFAULT false,          -- Super admin
  status TEXT DEFAULT 'active',             -- active | suspended | pending
  
  -- Auditoria
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tipos de Usuário

#### 1. Usuário Master (Super Admin)

```
👑 USUÁRIO MASTER
   │
   ├─ Campo: is_master = true
   ├─ NÃO está vinculado a grupos específicos
   ├─ Acesso TOTAL a todo o sistema
   │
   └─ Permissões:
       ├─ ✅ Ver TODOS os grupos
       ├─ ✅ Criar/editar/deletar grupos
       ├─ ✅ Criar/editar/deletar planos
       ├─ ✅ Habilitar/desabilitar módulos
       ├─ ✅ Ver logs de TODOS os grupos
       ├─ ✅ Gerenciar usuários de TODOS os grupos
       └─ ✅ Configurações globais do sistema
```

**Exemplo:**
```json
{
  "id": "uuid-master",
  "email": "admin@meudashboard.org",
  "full_name": "Administrador do Sistema",
  "is_master": true,
  "status": "active"
}
```

**Casos de Uso:**
- Onboarding de novos clientes (criar grupo)
- Suporte técnico (acessar dados de cliente)
- Monitoramento do sistema
- Gestão de planos e preços

#### 2. Usuário Regular

```
👤 USUÁRIO REGULAR
   │
   ├─ Campo: is_master = false
   ├─ Vinculado a 1 ou + grupos via user_group_memberships
   ├─ Permissões baseadas em role no grupo
   │
   └─ Acesso:
       ├─ Apenas grupos aos quais pertence
       ├─ Apenas módulos habilitados no grupo
       ├─ Limitado pelo plano do grupo
       └─ Controlado pela role no grupo
```

**Exemplo:**
```json
{
  "id": "uuid-joao",
  "email": "joao@empresaxyz.com",
  "full_name": "João Silva",
  "is_master": false,
  "status": "active",
  "groups": [
    {
      "company_group_id": "uuid-grupo-xyz",
      "role": "admin"
    }
  ]
}
```

### Status de Usuário

| Status | Descrição | Pode Fazer Login? |
|--------|-----------|-------------------|
| **active** | Usuário ativo | ✅ Sim |
| **suspended** | Conta suspensa temporariamente | ❌ Não |
| **pending** | Aguardando ativação (novo usuário) | ❌ Não |

### Ciclo de Vida do Usuário

```
1️⃣ CRIAÇÃO
   ┌────────────────────────────────┐
   │ Admin cria usuário             │
   │ Status: pending                │
   │ Email: enviado com senha temp  │
   └────────────────────────────────┘
           ↓
2️⃣ PRIMEIRO LOGIN
   ┌────────────────────────────────┐
   │ Usuário faz login              │
   │ Sistema força troca de senha   │
   │ Status: active                 │
   └────────────────────────────────┘
           ↓
3️⃣ USO NORMAL
   ┌────────────────────────────────┐
   │ Usuário usa sistema            │
   │ Logs registrados               │
   │ Permissões aplicadas           │
   └────────────────────────────────┘
           ↓
4️⃣ SUSPENSÃO (opcional)
   ┌────────────────────────────────┐
   │ Admin suspende usuário         │
   │ Status: suspended              │
   │ Sessões invalidadas            │
   └────────────────────────────────┘
           ↓
5️⃣ REATIVAÇÃO ou REMOÇÃO
   ┌────────────────────────────────┐
   │ Opção A: Status → active       │
   │ Opção B: DELETE FROM users     │
   └────────────────────────────────┘
```

---

## 🏢 Grupos de Empresas

### Tabela `company_groups`

```sql
CREATE TABLE company_groups (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,                         -- URL-friendly (ex: empresa-xyz)
  
  -- Informações
  description TEXT,
  logo_url TEXT,
  
  -- Plano
  plan_id UUID REFERENCES powerbi_plans(id),
  
  -- Status
  status TEXT DEFAULT 'active',             -- active | suspended | trial
  
  -- Limites (copiados do plano, podem ser customizados)
  max_users INTEGER DEFAULT 10,
  max_companies INTEGER DEFAULT 2,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Status de Grupo

| Status | Descrição | Usuários Podem Acessar? |
|--------|-----------|-------------------------|
| **active** | Grupo ativo e funcional | ✅ Sim |
| **suspended** | Grupo suspenso (não pagou, violação) | ❌ Não |
| **trial** | Período de teste (ex: 14 dias grátis) | ✅ Sim (com limites) |

### Ciclo de Vida do Grupo

```
1️⃣ CRIAÇÃO (Master)
   ┌────────────────────────────────┐
   │ Master cria grupo              │
   │ Define:                        │
   │ ├─ Nome                        │
   │ ├─ Slug                        │
   │ ├─ Plano                       │
   │ └─ Status: trial (14 dias)     │
   └────────────────────────────────┘
           ↓
2️⃣ CONFIGURAÇÃO INICIAL
   ┌────────────────────────────────┐
   │ Master ou Admin do grupo:      │
   │ ├─ Adiciona usuários           │
   │ ├─ Configura Power BI          │
   │ ├─ Habilita módulos            │
   │ └─ Configura WhatsApp          │
   └────────────────────────────────┘
           ↓
3️⃣ PERÍODO DE TRIAL
   ┌────────────────────────────────┐
   │ Status: trial                  │
   │ Usuários usam o sistema        │
   │ Todos os recursos disponíveis  │
   │ Contador: 14 dias              │
   └────────────────────────────────┘
           ↓
4️⃣ CONVERSÃO EM CLIENTE
   ┌────────────────────────────────┐
   │ Cliente confirma pagamento     │
   │ Status: active                 │
   │ Plano: conforme contratado     │
   └────────────────────────────────┘
           ↓
5️⃣ USO CONTÍNUO
   ┌────────────────────────────────┐
   │ Renovação mensal/anual         │
   │ Pode fazer upgrade de plano    │
   │ Pode adicionar módulos         │
   └────────────────────────────────┘
           ↓
6️⃣ SUSPENSÃO (se não pagar)
   ┌────────────────────────────────┐
   │ Status: suspended              │
   │ Usuários não conseguem acessar │
   │ Dados preservados (30 dias)    │
   └────────────────────────────────┘
           ↓
7️⃣ REATIVAÇÃO ou EXCLUSÃO
   ┌────────────────────────────────┐
   │ Opção A: Paga → Status active  │
   │ Opção B: 30 dias → Exclusão    │
   └────────────────────────────────┘
```

### Isolamento de Dados

**CRÍTICO:** Cada grupo tem dados completamente isolados.

```sql
-- Todas as tabelas têm company_group_id

CREATE TABLE powerbi_screens (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  ...
);

CREATE TABLE alertas (
  id UUID PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id),
  ...
);

-- Sempre filtrar por company_group_id!
SELECT * FROM alertas 
WHERE company_group_id = 'uuid-do-grupo-do-usuario';
```

**Row Level Security (RLS) no Supabase:**

```sql
-- Política de segurança
CREATE POLICY "users_see_own_group_data"
ON alertas
FOR SELECT
USING (
  company_group_id IN (
    SELECT company_group_id 
    FROM user_group_memberships 
    WHERE user_id = auth.uid()
  )
);
```

---

## 🎭 Hierarquia e Permissões

### Tabela `user_group_memberships`

```sql
CREATE TABLE user_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Permissões
  role TEXT NOT NULL,                       -- admin | manager | operator | viewer
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint
  UNIQUE(user_id, company_group_id)
);
```

### Roles (Papéis)

#### 1. Admin (Administrador do Grupo)

```
👨‍💼 ADMIN
   │
   ├─ Gerencia o grupo
   ├─ Pode fazer TUDO dentro do grupo
   │
   └─ Permissões:
       ├─ ✅ Gerenciar usuários
       │   ├─ Adicionar usuários
       │   ├─ Remover usuários
       │   └─ Alterar roles
       │
       ├─ ✅ Configurações
       │   ├─ Editar nome/logo do grupo
       │   ├─ Configurar Power BI
       │   ├─ Configurar WhatsApp
       │   └─ Habilitar/desabilitar módulos
       │
       ├─ ✅ Alertas
       │   ├─ Criar alertas
       │   ├─ Editar alertas
       │   ├─ Deletar alertas
       │   └─ Ver histórico
       │
       ├─ ✅ Dashboards
       │   ├─ Cadastrar telas
       │   ├─ Editar telas
       │   └─ Deletar telas
       │
       └─ ✅ Logs e Relatórios
           └─ Ver todos os logs do grupo
```

#### 2. Manager (Gerente)

```
👨‍💼 MANAGER
   │
   ├─ Gerencia conteúdo
   ├─ NÃO gerencia usuários
   │
   └─ Permissões:
       ├─ ✅ Alertas
       │   ├─ Criar alertas
       │   ├─ Editar alertas (próprios)
       │   ├─ Deletar alertas (próprios)
       │   └─ Ver histórico
       │
       ├─ ✅ Dashboards
       │   ├─ Cadastrar telas
       │   ├─ Editar telas
       │   └─ Configurar contextos IA
       │
       ├─ ❌ Usuários
       │   └─ Não pode gerenciar
       │
       └─ ❌ Configurações
           └─ Não pode alterar
```

#### 3. Operator (Operador)

```
👨‍💻 OPERATOR
   │
   ├─ Executa ações
   ├─ NÃO cria/edita
   │
   └─ Permissões:
       ├─ ✅ Alertas
       │   ├─ Ver alertas
       │   ├─ Disparar manualmente
       │   └─ Ver histórico
       │
       ├─ ✅ Dashboards
       │   ├─ Ver todas as telas
       │   └─ Usar chat IA
       │
       ├─ ❌ Criar/Editar
       │   ├─ Não pode criar alertas
       │   └─ Não pode editar telas
       │
       └─ ❌ Configurações
           └─ Acesso negado
```

#### 4. Viewer (Visualizador)

```
👀 VIEWER
   │
   ├─ Apenas visualiza
   ├─ Acesso read-only
   │
   └─ Permissões:
       ├─ ✅ Dashboards
       │   ├─ Ver telas
       │   └─ Usar chat IA (se habilitado)
       │
       ├─ ❌ Alertas
       │   └─ Não pode ver alertas
       │
       └─ ❌ Tudo mais
           └─ Acesso negado
```

### Matriz de Permissões Completa

| Recurso | Admin | Manager | Operator | Viewer |
|---------|-------|---------|----------|--------|
| **Usuários** | | | | |
| - Adicionar usuário | ✅ | ❌ | ❌ | ❌ |
| - Remover usuário | ✅ | ❌ | ❌ | ❌ |
| - Alterar role | ✅ | ❌ | ❌ | ❌ |
| **Alertas** | | | | |
| - Criar alerta | ✅ | ✅ | ❌ | ❌ |
| - Editar alerta | ✅ | ✅ (próprio) | ❌ | ❌ |
| - Deletar alerta | ✅ | ✅ (próprio) | ❌ | ❌ |
| - Disparar manual | ✅ | ✅ | ✅ | ❌ |
| - Ver histórico | ✅ | ✅ | ✅ | ❌ |
| **Dashboards** | | | | |
| - Cadastrar tela | ✅ | ✅ | ❌ | ❌ |
| - Editar tela | ✅ | ✅ | ❌ | ❌ |
| - Deletar tela | ✅ | ✅ | ❌ | ❌ |
| - Visualizar tela | ✅ | ✅ | ✅ | ✅ |
| - Chat IA | ✅ | ✅ | ✅ | ✅ |
| **WhatsApp** | | | | |
| - Configurar instância | ✅ | ❌ | ❌ | ❌ |
| - Adicionar grupos | ✅ | ✅ | ❌ | ❌ |
| - Adicionar números | ✅ | ✅ | ❌ | ❌ |
| - Ver mensagens | ✅ | ✅ | ✅ | ❌ |
| **Power BI** | | | | |
| - Gerenciar conexões | ✅ | ❌ | ❌ | ❌ |
| - Gerenciar datasets | ✅ | ✅ | ❌ | ❌ |
| - Criar contextos IA | ✅ | ✅ | ❌ | ❌ |
| **Configurações** | | | | |
| - Editar grupo | ✅ | ❌ | ❌ | ❌ |
| - Habilitar módulos | ✅ | ❌ | ❌ | ❌ |
| - Ver logs | ✅ | ❌ | ❌ | ❌ |

### Exemplo de Validação de Permissão

```typescript
// No backend - verificar role
async function checkPermission(
  userId: string, 
  groupId: string, 
  requiredRole: 'admin' | 'manager' | 'operator' | 'viewer'
): Promise<boolean> {
  
  // Buscar membership do usuário
  const { data: membership } = await supabase
    .from('user_group_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .single();
  
  if (!membership) return false;
  
  // Hierarquia de roles
  const roleHierarchy = {
    'admin': 4,
    'manager': 3,
    'operator': 2,
    'viewer': 1
  };
  
  // Usuário tem role suficiente?
  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
}

// Uso:
if (await checkPermission(userId, groupId, 'manager')) {
  // Permitir criar alerta
} else {
  return { error: 'Sem permissão' };
}
```

---

## 📦 Planos e Licenciamento

### Tabela `powerbi_plans`

```sql
CREATE TABLE powerbi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Informações
  name TEXT NOT NULL,
  description TEXT,
  
  -- Limites
  max_daily_refreshes INTEGER NOT NULL DEFAULT 1,
  max_powerbi_screens INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_companies INTEGER NOT NULL DEFAULT 2,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Planos Padrão

```
📦 PLANO BÁSICO (R$ 199/mês)
   ├─ Atualizações/dia: 5
   ├─ Telas Power BI: 3
   ├─ Usuários: 5
   ├─ Empresas: 1
   └─ Módulos: Power BI, WhatsApp

📦 PLANO PROFISSIONAL (R$ 499/mês)
   ├─ Atualizações/dia: 20
   ├─ Telas Power BI: 10
   ├─ Usuários: 20
   ├─ Empresas: 5
   └─ Módulos: Power BI, WhatsApp, Alertas, IA

📦 PLANO ENTERPRISE (R$ 999/mês)
   ├─ Atualizações/dia: Ilimitado (999)
   ├─ Telas Power BI: Ilimitado (999)
   ├─ Usuários: Ilimitado (999)
   ├─ Empresas: Ilimitado (999)
   └─ Módulos: Todos + Suporte prioritário
```

### Aplicação de Limites

```typescript
// Verificar limite antes de criar recurso
async function canCreateScreen(groupId: string): Promise<boolean> {
  // 1. Buscar plano do grupo
  const { data: group } = await supabase
    .from('company_groups')
    .select('plan_id')
    .eq('id', groupId)
    .single();
  
  const { data: plan } = await supabase
    .from('powerbi_plans')
    .select('max_powerbi_screens')
    .eq('id', group.plan_id)
    .single();
  
  // 2. Contar telas existentes
  const { count } = await supabase
    .from('powerbi_screens')
    .select('*', { count: 'exact', head: true })
    .eq('company_group_id', groupId);
  
  // 3. Verificar se pode criar mais
  return (count || 0) < plan.max_powerbi_screens;
}

// Uso na API:
if (!await canCreateScreen(groupId)) {
  return { 
    error: 'Limite de telas atingido',
    current: count,
    max: plan.max_powerbi_screens,
    upgrade: 'Considere fazer upgrade do plano'
  };
}
```

---

## 🧩 Módulos do Sistema

### Tabela `modules`

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  name TEXT UNIQUE NOT NULL,                -- powerbi, whatsapp, alertas, ia
  display_name TEXT NOT NULL,               -- Power BI, WhatsApp, etc
  
  -- Apresentação
  description TEXT,
  icon TEXT NOT NULL,                       -- Nome do ícone Lucide React
  
  -- Status
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela `module_groups`

```sql
CREATE TABLE module_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  company_group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, company_group_id)
);
```

### Módulos Disponíveis

```
1️⃣ POWER BI
   ├─ Nome: powerbi
   ├─ Ícone: BarChart3
   ├─ Descrição: Dashboards e relatórios interativos
   └─ Funcionalidades:
       ├─ Visualização de relatórios
       ├─ Gestão de telas
       ├─ Contextos de IA
       └─ Ordem de atualização

2️⃣ WHATSAPP
   ├─ Nome: whatsapp
   ├─ Ícone: MessageCircle
   ├─ Descrição: Integração com WhatsApp
   └─ Funcionalidades:
       ├─ Gestão de instâncias
       ├─ Grupos e números
       ├─ Envio de mensagens
       └─ Histórico

3️⃣ ALERTAS
   ├─ Nome: alertas
   ├─ Ícone: Bell
   ├─ Descrição: Sistema de alertas automáticos
   └─ Funcionalidades:
       ├─ Criação de alertas
       ├─ Execução automática (CRON)
       ├─ Histórico de execuções
       └─ Integração com WhatsApp

4️⃣ IA
   ├─ Nome: ia
   ├─ Ícone: Bot
   ├─ Descrição: Inteligência Artificial
   └─ Funcionalidades:
       ├─ Geração de DAX
       ├─ Geração de templates
       ├─ Chat contextual
       └─ Análise de dados
```

### Habilitação de Módulos

```typescript
// Habilitar módulo para um grupo
async function enableModuleForGroup(
  groupId: string, 
  moduleName: string
): Promise<void> {
  
  // 1. Buscar module_id
  const { data: module } = await supabase
    .from('modules')
    .select('id')
    .eq('name', moduleName)
    .eq('is_enabled', true)
    .single();
  
  // 2. Inserir em module_groups
  await supabase
    .from('module_groups')
    .insert({
      module_id: module.id,
      company_group_id: groupId
    });
}

// Desabilitar módulo
async function disableModuleForGroup(
  groupId: string, 
  moduleName: string
): Promise<void> {
  
  const { data: module } = await supabase
    .from('modules')
    .select('id')
    .eq('name', moduleName)
    .single();
  
  await supabase
    .from('module_groups')
    .delete()
    .eq('module_id', module.id)
    .eq('company_group_id', groupId);
}
```

### Navegação Dinâmica

O menu lateral é gerado dinamicamente baseado nos módulos habilitados:

```typescript
// Buscar módulos habilitados para o grupo do usuário
const { data: enabledModules } = await supabase
  .from('module_groups')
  .select(`
    modules (
      name,
      display_name,
      icon,
      sort_order
    )
  `)
  .eq('company_group_id', userGroupId)
  .order('modules.sort_order');

// Renderizar menu
{enabledModules.map(module => (
  <MenuItem 
    icon={module.modules.icon}
    label={module.modules.display_name}
    href={`/${module.modules.name}`}
  />
))}
```

---

## 🔄 Fluxos Completos

### Fluxo: Novo Usuário Entrando no Sistema

```
1️⃣ ADMIN CRIA USUÁRIO
   POST /api/user
   {
     "email": "novo@empresa.com",
     "full_name": "Maria Costa",
     "company_group_id": "uuid-grupo",
     "role": "manager"
   }
   ↓
2️⃣ SISTEMA GERA SENHA TEMPORÁRIA
   password = crypto.randomBytes(8)
   password_hash = bcrypt.hash(password, 10)
   ↓
3️⃣ SISTEMA CRIA REGISTRO
   INSERT INTO users (email, password_hash, status)
   VALUES ('novo@empresa.com', '$2a$10...', 'pending')
   ↓
4️⃣ SISTEMA CRIA MEMBERSHIP
   INSERT INTO user_group_memberships 
   (user_id, company_group_id, role)
   VALUES (user_id, group_id, 'manager')
   ↓
5️⃣ SISTEMA ENVIA EMAIL
   "Bem-vindo ao MeuDashboard!
    Email: novo@empresa.com
    Senha temporária: Abc12345
    Acesse: https://meudashboard.org/login"
   ↓
6️⃣ USUÁRIO FAZ PRIMEIRO LOGIN
   POST /api/auth/login
   ↓
7️⃣ SISTEMA DETECTA STATUS "PENDING"
   Redireciona para /trocar-senha
   ↓
8️⃣ USUÁRIO CRIA NOVA SENHA
   PUT /api/user/change-password
   status = 'active'
   ↓
9️⃣ USUÁRIO ACESSA DASHBOARD
   Vê apenas módulos habilitados no grupo
   Permissões baseadas em role "manager"
```

### Fluxo: Verificação de Permissão

```
1️⃣ USUÁRIO FAZ REQUISIÇÃO
   GET /api/alertas/novo
   Cookie: auth_token=eyJ...
   ↓
2️⃣ MIDDLEWARE VALIDA JWT
   jwtVerify(token, JWT_SECRET)
   ✅ Token válido
   ↓
3️⃣ GETAUTHUSER() VALIDA SESSÃO
   SELECT * FROM users WHERE id = jwt.id
   Compara session_id
   ✅ Sessão válida
   ↓
4️⃣ API BUSCA MEMBERSHIP
   SELECT role FROM user_group_memberships
   WHERE user_id = user.id
   AND company_group_id = request.groupId
   ↓
5️⃣ API VERIFICA ROLE
   role = 'manager'
   Required role = 'manager'
   ✅ Permissão OK
   ↓
6️⃣ API VERIFICA MÓDULO
   SELECT * FROM module_groups
   WHERE company_group_id = group.id
   AND module_id = (SELECT id FROM modules WHERE name = 'alertas')
   ✅ Módulo habilitado
   ↓
7️⃣ API VERIFICA LIMITE
   Contar alertas do grupo
   Comparar com plano
   ✅ Dentro do limite
   ↓
8️⃣ API RETORNA DADOS
   200 OK
   { "success": true, ... }
```

---

## 🎯 Casos de Uso Avançados

### Caso 1: Usuário em Múltiplos Grupos

João trabalha em 2 empresas: XYZ e ABC

```
👤 João Silva
   │
   ├─ 🏢 Grupo XYZ
   │   ├─ Role: admin
   │   ├─ Módulos: Power BI, WhatsApp, Alertas
   │   └─ Pode:
   │       ├─ Gerenciar usuários da XYZ
   │       ├─ Ver/criar alertas da XYZ
   │       └─ Configurar WhatsApp da XYZ
   │
   └─ 🏢 Grupo ABC
       ├─ Role: viewer
       ├─ Módulos: Power BI
       └─ Pode:
           └─ Apenas ver dashboards da ABC
```

**Como trocar de grupo:**

```typescript
// Frontend: Seletor de grupo
<select onChange={(e) => switchGroup(e.target.value)}>
  <option value="uuid-xyz">Empresa XYZ</option>
  <option value="uuid-abc">Empresa ABC</option>
</select>

// Armazenar no localStorage
localStorage.setItem('current_group_id', selectedGroupId);

// Todas as APIs filtram por current_group_id
```

### Caso 2: Upgrade de Plano

Empresa XYZ quer fazer upgrade de Básico para Profissional

```
1️⃣ SITUAÇÃO ATUAL
   ├─ Plano: Básico
   ├─ Usuários: 5/5 (limite atingido)
   ├─ Telas: 3/3
   └─ Alertas: 10/20

2️⃣ ADMIN SOLICITA UPGRADE
   Master do sistema:
   PUT /api/company-groups/:id
   {
     "plan_id": "uuid-plano-profissional"
   }

3️⃣ SISTEMA ATUALIZA
   UPDATE company_groups
   SET plan_id = 'uuid-profissional',
       max_users = 20,
       max_companies = 5
   WHERE id = 'uuid-xyz'

4️⃣ NOVOS LIMITES
   ├─ Usuários: 5/20 ✅
   ├─ Telas: 3/10 ✅
   ├─ Alertas: 10/50 ✅
   └─ Atualizações/dia: 5 → 20 ✅

5️⃣ ADMIN PODE ADICIONAR MAIS USUÁRIOS
   Antes: "Limite atingido"
   Agora: Pode adicionar 15 usuários
```

### Caso 3: Suspensão de Grupo por Não Pagamento

```
1️⃣ DIA 1 - VENCIMENTO
   Sistema envia email:
   "Seu pagamento vence hoje"

2️⃣ DIA 5 - ATRASO
   Sistema envia email:
   "Pagamento em atraso - 5 dias"

3️⃣ DIA 10 - SUSPENSÃO
   Master do sistema:
   PUT /api/company-groups/:id
   { "status": "suspended" }
   
   UPDATE company_groups
   SET status = 'suspended'
   WHERE id = 'uuid-grupo'

4️⃣ USUÁRIOS TENTAM ACESSAR
   getAuthUser() valida:
   ├─ JWT válido ✅
   ├─ Session ID válido ✅
   ├─ Busca grupo do usuário
   └─ group.status = 'suspended' ❌
   
   Retorna erro:
   "Grupo suspenso por falta de pagamento"

5️⃣ DADOS PRESERVADOS (30 DIAS)
   ├─ Todos os dados mantidos no banco
   ├─ Alertas desabilitados
   └─ CRON ignora alertas do grupo

6️⃣ REATIVAÇÃO
   Cliente paga:
   PUT /api/company-groups/:id
   { "status": "active" }
   
   ✅ Acesso restaurado imediatamente
```

---

## 🔒 Segurança

### Camadas de Segurança

```
🔒 CAMADA 1: MIDDLEWARE
   ├─ Valida JWT
   ├─ Verifica expiração
   └─ Bloqueia se inválido

🔒 CAMADA 2: GETAUTHUSER()
   ├─ Valida session_id
   ├─ Verifica status do usuário
   └─ Retorna null se suspenso

🔒 CAMADA 3: AUTORIZAÇÃO
   ├─ Valida role no grupo
   ├─ Verifica módulos habilitados
   └─ Aplica limites do plano

🔒 CAMADA 4: RLS (Row Level Security)
   ├─ PostgreSQL Policies
   ├─ Filtra por company_group_id
   └─ Isolamento total de dados
```

### Boas Práticas Implementadas

✅ **Senhas:**
- bcrypt com 10 salt rounds
- Nunca retornar password_hash nas APIs
- Forçar troca no primeiro login

✅ **Tokens:**
- JWT assinado com HS256
- Secret de 256 bits
- Expiração de 7 dias
- Renovação automática

✅ **Cookies:**
- HTTP-Only (JavaScript não acessa)
- Secure (HTTPS apenas em prod)
- SameSite=Lax (proteção CSRF)
- Domain correto (.meudashboard.org)

✅ **Sessões:**
- Login único (session_id)
- Invalidação automática
- Timeout por inatividade

✅ **Dados:**
- Isolamento por company_group_id
- RLS no Supabase
- Validação em todas as APIs

✅ **Logs:**
- Todas ações registradas
- IP e User-Agent capturados
- Auditoria completa

---

## 📊 Resumo Visual

```
┌─────────────────────────────────────────────────────────┐
│               ARQUITETURA COMPLETA                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  👑 MASTER (Super Admin)                                │
│     ├─ Gerencia tudo                                    │
│     └─ Não está em grupos                               │
│                                                          │
│  📦 PLANO                                                │
│     ├─ Define limites                                   │
│     └─ Básico | Profissional | Enterprise              │
│                                                          │
│  🏢 GRUPO (Company Group)                               │
│     ├─ Cliente/Tenant                                   │
│     ├─ Tem um plano                                     │
│     ├─ Módulos habilitados                              │
│     └─ Dados isolados                                   │
│                                                          │
│  👤 USUÁRIO                                              │
│     ├─ Pode estar em vários grupos                      │
│     ├─ Login único (session_id)                         │
│     └─ JWT + Cookie HTTP-Only                           │
│                                                          │
│  🎭 MEMBERSHIP (Vínculo Usuário ↔ Grupo)               │
│     ├─ admin: Gerencia tudo no grupo                   │
│     ├─ manager: Cria alertas/dashboards                │
│     ├─ operator: Executa                                │
│     └─ viewer: Apenas vê                                │
│                                                          │
│  🧩 MÓDULO                                               │
│     ├─ Power BI                                         │
│     ├─ WhatsApp                                         │
│     ├─ Alertas                                          │
│     └─ IA                                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Documentação criada em:** Janeiro 2024  
**Versão:** 1.0.0  
**Última atualização:** 09/01/2026
