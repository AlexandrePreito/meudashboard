# Documentação: Sistema de Acessos e Restrições

## Índice

1. [Visão Geral](#visão-geral)
2. [Tipos de Usuários](#tipos-de-usuários)
3. [Sistema de Grupos](#sistema-de-grupos)
4. [Hierarquia de Acessos](#hierarquia-de-acessos)
5. [Padrão de Verificação de Acesso](#padrão-de-verificação-de-acesso)
6. [APIs e Rotas](#apis-e-rotas)
7. [Exemplos Práticos](#exemplos-práticos)
8. [Restrições por Módulo](#restrições-por-módulo)

---

## Visão Geral

O sistema MeuDashboard implementa um modelo hierárquico de acesso baseado em **tipos de usuários** e **grupos de empresas** (company groups). Cada usuário pode ter diferentes níveis de acesso dependendo do seu tipo e associações com grupos.

### Conceitos Fundamentais

- **Master**: Usuário com acesso total ao sistema
- **Desenvolvedor**: Usuário que cria e gerencia seus próprios grupos
- **Admin**: Usuário com papel administrativo dentro de um grupo
- **Usuário Comum**: Usuário com acesso limitado aos grupos onde tem membership
- **Company Group**: Grupo de empresas que compartilha recursos e configurações

---

## Tipos de Usuários

### 1. Master (`is_master = true`)

**Características:**
- Acesso total e irrestrito ao sistema
- Pode visualizar e gerenciar todos os grupos, usuários e recursos
- Não possui restrições de acesso
- Pode criar desenvolvedores e grupos
- Acessa área administrativa em `/admin`

**Identificação:**
```typescript
user.is_master === true
```

**Permissões:**
- ✅ Visualizar todos os grupos
- ✅ Criar/editar/excluir qualquer recurso
- ✅ Gerenciar desenvolvedores
- ✅ Acessar relatórios globais
- ✅ Não possui filtros de acesso

**Redirecionamento após login:**
```
/login → /admin
```

---

### 2. Desenvolvedor (`is_developer_user = true`, `developer_id` presente)

**Características:**
- Usuário vinculado a uma conta de desenvolvedor (`developers` table)
- Cria e gerencia seus próprios grupos de empresas
- Cada grupo criado tem `developer_id` = ID do desenvolvedor
- Acesso limitado apenas aos grupos que criou
- Acessa área do desenvolvedor em `/dev`

**Identificação:**
```typescript
// Na tabela users:
user.developer_id !== null
user.is_developer_user === true

// Função de verificação:
const developerId = await getUserDeveloperId(user.id);
// Retorna o developer_id se for desenvolvedor, null caso contrário
```

**Permissões:**
- ✅ Criar grupos (que automaticamente terão `developer_id` = seu ID)
- ✅ Gerenciar grupos criados por ele
- ✅ Visualizar recursos dos grupos criados
- ✅ Gerenciar usuários dos seus grupos
- ❌ Não pode acessar grupos de outros desenvolvedores
- ❌ Não pode acessar grupos sem `developer_id`

**Redirecionamento após login:**
```
/login → /dev
```

**Queries típicas:**
```typescript
// Buscar grupos do desenvolvedor
const { data: groups } = await supabase
  .from('company_groups')
  .select('id, name, ...')
  .eq('developer_id', developerId)
  .eq('status', 'active');

// Verificar se grupo pertence ao desenvolvedor
const { data: group } = await supabase
  .from('company_groups')
  .select('id')
  .eq('id', company_group_id)
  .eq('developer_id', developerId)
  .single();
```

---

### 3. Admin de Grupo (`role = 'admin'` em `user_group_membership`)

**Características:**
- Usuário comum com papel de administrador em um ou mais grupos
- Acesso administrativo limitado aos grupos onde tem `role = 'admin'`
- Pode gerenciar usuários e recursos dentro dos grupos administrados
- Não pode criar grupos novos

**Identificação:**
```typescript
// Verificar membership com role admin
const { data: memberships } = await supabase
  .from('user_group_membership')
  .select('company_group_id, role')
  .eq('user_id', user.id)
  .eq('role', 'admin')
  .eq('is_active', true);
```

**Permissões:**
- ✅ Gerenciar usuários dos grupos administrados
- ✅ Visualizar recursos dos grupos administrados
- ✅ Criar/editar recursos nos grupos administrados
- ❌ Não pode criar grupos
- ❌ Não pode acessar grupos onde não tem role admin

---

### 4. Usuário Comum

**Características:**
- Usuário com membership ativo em um ou mais grupos
- Acesso limitado aos recursos dos grupos onde tem membership
- Não possui permissões administrativas
- Role padrão: `'viewer'`, `'operator'`, `'manager'` (não admin)

**Identificação:**
```typescript
// Verificar membership
const { data: memberships } = await supabase
  .from('user_group_membership')
  .select('company_group_id')
  .eq('user_id', user.id)
  .eq('is_active', true);
```

**Permissões:**
- ✅ Visualizar recursos dos grupos onde tem membership
- ✅ Usar recursos conforme role (viewer/operator/manager)
- ❌ Não pode gerenciar usuários
- ❌ Não pode criar/editar recursos administrativos
- ❌ Não pode acessar grupos sem membership

---

## Sistema de Grupos

### Company Groups

Cada grupo de empresa (`company_groups`) representa uma organização ou cliente que usa o sistema. Grupos podem ser criados por:

1. **Master**: Qualquer grupo, sem restrições
2. **Desenvolvedor**: Grupos vinculados ao seu `developer_id`

### Estrutura da Tabela `company_groups`

```typescript
interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  developer_id: string | null;  // ID do desenvolvedor que criou o grupo
  logo_url: string | null;
  primary_color: string | null;
  use_developer_logo: boolean;  // Se deve usar logo do desenvolvedor
  use_developer_colors: boolean; // Se deve usar cores do desenvolvedor
  status: 'active' | 'inactive';
  plan_id: string | null;
  // ... outros campos
}
```

### User Group Membership

Tabela que relaciona usuários a grupos, definindo o papel (role) de cada usuário:

```typescript
interface UserGroupMembership {
  id: string;
  user_id: string;
  company_group_id: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

**Roles disponíveis:**
- `admin`: Administrador do grupo
- `manager`: Gerente
- `operator`: Operador
- `viewer`: Visualizador (somente leitura)

---

## Hierarquia de Acessos

### Prioridade de Verificação

Ao verificar acesso a um recurso, o sistema segue esta ordem:

1. **Master** → Acesso total (não verifica mais nada)
2. **Desenvolvedor** → Verifica se o grupo tem `developer_id` = seu ID
3. **Admin** → Verifica se tem `role = 'admin'` no grupo
4. **Usuário Comum** → Verifica se tem membership ativo no grupo

### Fluxograma de Verificação

```
┌─────────────────┐
│  Requisição     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ user.is_master? │───SIM───► Acesso Total ✅
└────────┬────────┘
         │ NÃO
         ▼
┌─────────────────┐
│ É Desenvolvedor?│───SIM───► Verifica developer_id do grupo
└────────┬────────┘           │
         │ NÃO                │
         ▼                    │
┌─────────────────┐           │
│ Tem Membership? │───SIM───► │
└────────┬────────┘           │
         │                    │
         │ NÃO                │
         ▼                    │
    ❌ Sem Acesso            │
         │                    │
         └────────────────────┘
                    │
                    ▼
              ✅ Acesso Permitido
```

---

## Padrão de Verificação de Acesso

### Padrão para GET (Listagem)

```typescript
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { getUserDeveloperId } = await import('@/lib/auth');
  const developerId = await getUserDeveloperId(user.id);

  let userGroupIds: string[] = [];
  
  if (!user.is_master) {
    if (developerId) {
      // Desenvolvedor: buscar grupos pelo developer_id
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      userGroupIds = devGroups?.map(g => g.id) || [];
    } else {
      // Usuário comum: buscar via membership
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true);
      userGroupIds = memberships?.map(m => m.company_group_id) || [];
    }
    
    if (userGroupIds.length === 0) {
      return NextResponse.json({ items: [] });
    }
  }

  // Filtrar resultados por userGroupIds (se não for master)
  let query = supabase.from('tabela').select('*');
  
  if (!user.is_master && userGroupIds.length > 0) {
    query = query.in('company_group_id', userGroupIds);
  }

  const { data, error } = await query;
  return NextResponse.json({ items: data || [] });
}
```

### Padrão para POST/PUT/DELETE (Criação/Edição)

```typescript
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const { company_group_id, ...outrosCampos } = body;
  
  const supabase = createAdminClient();

  // Verificar permissão: master pode tudo, dev só seus grupos
  if (!user.is_master) {
    const { getUserDeveloperId } = await import('@/lib/auth');
    const developerId = await getUserDeveloperId(user.id);
    
    if (!developerId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    
    // Verificar se o grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', company_group_id)
      .eq('developer_id', developerId)
      .single();
      
    if (!group) {
      return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
    }
  }

  // Prosseguir com criação/edição
  const { data, error } = await supabase
    .from('tabela')
    .insert({ company_group_id, ...outrosCampos })
    .select()
    .single();

  return NextResponse.json({ item: data });
}
```

### Função Auxiliar para Verificação de Permissões

Para APIs que precisam de verificação mais complexa (como contextos IA):

```typescript
async function checkPermissions(supabase: any, user: any, groupId?: string | null) {
  let userGroupIds: string[] = [];
  let userRole = 'user';

  if (user.is_master) {
    userRole = 'master';
  } else {
    const { getUserDeveloperId } = await import('@/lib/auth');
    const developerId = await getUserDeveloperId(user.id);

    if (developerId) {
      // Desenvolvedor: buscar grupos pelo developer_id
      userRole = 'developer';
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      userGroupIds = devGroups?.map((g: any) => g.id) || [];
    } else {
      // Usuário comum: buscar via membership
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      userGroupIds = memberships?.map((m: any) => m.company_group_id) || [];
      
      if (memberships?.some((m: any) => m.role === 'admin')) {
        userRole = 'admin';
      }
    }
  }

  // Validar acesso ao grupo específico
  if (groupId && userRole !== 'master' && userRole !== 'developer' && !userGroupIds.includes(groupId)) {
    return { allowed: false, userRole, userGroupIds, error: 'Sem permissão para este grupo' };
  }

  // Para developer, validar se o grupo pertence a ele
  if (groupId && userRole === 'developer' && !userGroupIds.includes(groupId)) {
    return { allowed: false, userRole, userGroupIds, error: 'Sem permissão para este grupo' };
  }

  return { allowed: true, userRole, userGroupIds, error: null };
}
```

---

## APIs e Rotas

### Autenticação

**`/api/auth/login`** (POST)
- Autentica usuário e retorna token JWT
- Inclui `developer_id`, `is_developer_user` no payload
- Redireciona: Master → `/admin`, Desenvolvedor → `/dev`, Outros → `/dashboard`

**`/api/auth/me`** (GET)
- Retorna dados do usuário autenticado
- Inclui `is_developer` baseado em `getUserDeveloperId()`

**`/api/user/groups`** (GET)
- Retorna grupos disponíveis para o usuário
- Master: todos os grupos ativos
- Desenvolvedor: grupos onde `developer_id` = seu ID
- Outros: grupos via `user_group_membership`
- Retorna também dados do desenvolvedor para tema

### Área do Desenvolvedor (`/dev`)

**`/api/dev/profile`** (GET, PUT)
- Gerencia perfil do desenvolvedor (nome, logo, cor primária)

**`/api/dev/groups`** (GET, POST, PUT, DELETE)
- Gerencia grupos do desenvolvedor
- POST: cria grupo com `developer_id` automaticamente
- GET: retorna apenas grupos do desenvolvedor
- PUT/DELETE: valida se grupo pertence ao desenvolvedor

**`/api/dev/usage`** (GET)
- Retorna dados de uso dos grupos do desenvolvedor

**`/api/dev/access-logs`** (GET)
- Retorna logs de acesso dos grupos do desenvolvedor

### Área Administrativa (`/admin`)

**`/api/admin/developers`** (GET, POST)
- Apenas Master pode acessar
- Gerencia desenvolvedores do sistema

**`/api/admin/groups`** (GET)
- Apenas Master pode acessar
- Lista todos os grupos do sistema

**`/api/admin/users`** (GET)
- Apenas Master pode acessar
- Lista todos os usuários do sistema

### Power BI

**`/api/powerbi/connections`** (GET, POST, PUT, DELETE)
- GET: Master vê todas; Desenvolvedor vê dos seus grupos; Outros via membership
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/powerbi/reports`** (GET, POST)
- GET: Filtrado por grupos do usuário
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/powerbi/screens`** (GET, POST)
- GET: Filtrado por grupos do usuário
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/powerbi/datasets`** (GET)
- Valida acesso ao grupo da conexão
- Master: acesso total
- Desenvolvedor: acesso se grupo pertence a ele
- Outros: acesso via membership

### WhatsApp

**`/api/whatsapp/instances`** (GET, POST, PUT, DELETE)
- GET: Filtrado por grupos do usuário
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/whatsapp/authorized-numbers`** (GET, POST, PUT, DELETE)
- GET: Filtrado por grupos do usuário
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/whatsapp/groups`** (GET, POST, PUT, DELETE)
- GET: Filtrado por grupos do usuário
- POST: Master pode criar; Desenvolvedor pode criar para seus grupos

**`/api/whatsapp/messages`** (GET, POST)
- GET: Filtrado por grupos do usuário
- POST: Envio limitado aos grupos com acesso

### IA (Contextos)

**`/api/ai/contexts`** (GET, POST, PUT, DELETE)
- Usa função `checkPermissions()` para verificar acesso
- Master: acesso total
- Desenvolvedor: acesso aos grupos criados
- Admin: acesso aos grupos administrados
- Usuário comum: sem acesso

---

## Exemplos Práticos

### Exemplo 1: Desenvolvedor Criando um Grupo

```typescript
// POST /api/dev/groups
const user = await getAuthUser(); // user.developer_id existe
const developerId = await getUserDeveloperId(user.id);

const { data: newGroup } = await supabase
  .from('company_groups')
  .insert({
    name: 'Novo Grupo',
    developer_id: developerId, // Automaticamente vinculado
    status: 'active',
    // ... outros campos
  })
  .select()
  .single();

// Grupo criado com developer_id = ID do desenvolvedor
```

### Exemplo 2: Verificando Acesso a um Recurso

```typescript
// GET /api/powerbi/reports?group_id=123
const user = await getAuthUser();
const groupId = '123';

if (user.is_master) {
  // Acesso total - não precisa verificar
  const reports = await getAllReports();
  return reports;
}

const developerId = await getUserDeveloperId(user.id);

if (developerId) {
  // Desenvolvedor: verificar se grupo pertence a ele
  const { data: group } = await supabase
    .from('company_groups')
    .select('id')
    .eq('id', groupId)
    .eq('developer_id', developerId)
    .single();
  
  if (!group) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  
  // Buscar reports do grupo
  const reports = await getReportsByGroup(groupId);
  return reports;
} else {
  // Usuário comum: verificar membership
  const { data: membership } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .single();
  
  if (!membership) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  
  // Buscar reports do grupo
  const reports = await getReportsByGroup(groupId);
  return reports;
}
```

### Exemplo 3: Listagem Filtrada por Grupos

```typescript
// GET /api/whatsapp/instances
const user = await getAuthUser();
const developerId = await getUserDeveloperId(user.id);

let userGroupIds: string[] = [];

if (!user.is_master) {
  if (developerId) {
    // Desenvolvedor: buscar seus grupos
    const { data: devGroups } = await supabase
      .from('company_groups')
      .select('id')
      .eq('developer_id', developerId)
      .eq('status', 'active');
    userGroupIds = devGroups?.map(g => g.id) || [];
  } else {
    // Usuário comum: buscar via membership
    const { data: memberships } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .eq('is_active', true);
    userGroupIds = memberships?.map(m => m.company_group_id) || [];
  }
  
  if (userGroupIds.length === 0) {
    return NextResponse.json({ instances: [] });
  }
}

// Buscar instâncias vinculadas aos grupos
const { data: instanceGroups } = await supabase
  .from('whatsapp_instance_groups')
  .select('instance_id')
  .in('company_group_id', userGroupIds.length > 0 ? userGroupIds : []);
  
const instanceIds = instanceGroups?.map(ig => ig.instance_id) || [];

const { data: instances } = await supabase
  .from('whatsapp_instances')
  .select('*')
  .in('id', instanceIds);

return NextResponse.json({ instances });
```

---

## Restrições por Módulo

### Power BI

**Conexões:**
- Master: Ver todas, criar/editar qualquer
- Desenvolvedor: Ver dos seus grupos, criar/editar nos seus grupos
- Admin: Ver dos grupos administrados, criar/editar nos grupos administrados
- Usuário comum: Ver dos grupos com membership

**Relatórios:**
- Master: Ver todos, criar/editar qualquer
- Desenvolvedor: Ver dos grupos criados, criar nos grupos criados
- Outros: Ver dos grupos com membership

**Telas:**
- Master: Ver todas, criar/editar qualquer
- Desenvolvedor: Ver dos grupos criados, criar nos grupos criados
- Outros: Ver dos grupos com membership

### WhatsApp

**Instâncias:**
- Master: Ver todas, criar/editar qualquer
- Desenvolvedor: Ver dos grupos criados, criar nos grupos criados
- Outros: Ver dos grupos com membership

**Números Autorizados:**
- Master: Ver todos, criar/editar qualquer
- Desenvolvedor: Ver dos grupos criados, criar nos grupos criados
- Outros: Ver dos grupos com membership

**Grupos Autorizados:**
- Master: Ver todos, criar/editar qualquer
- Desenvolvedor: Ver dos grupos criados, criar nos grupos criados
- Outros: Ver dos grupos com membership

### IA (Contextos)

- Master: Acesso total
- Desenvolvedor: Acesso aos grupos criados
- Admin: Acesso aos grupos administrados
- Usuário comum: **SEM ACESSO**

### Alertas

- Master: Ver todos
- Desenvolvedor: Ver dos grupos criados
- Admin: Ver dos grupos administrados
- Usuário comum: Ver dos grupos com membership

---

## Funções Utilitárias

### `getUserDeveloperId(userId: string): Promise<string | null>`

Localização: `src/lib/auth.ts`

**Descrição:**
Busca o `developer_id` de um usuário. Primeiro verifica na tabela `users` (campo `developer_id`), depois na tabela `developer_users` (fallback para compatibilidade).

**Uso:**
```typescript
import { getUserDeveloperId } from '@/lib/auth';

const developerId = await getUserDeveloperId(user.id);
if (developerId) {
  // Usuário é desenvolvedor
}
```

**Retorno:**
- `string`: ID do desenvolvedor se o usuário for desenvolvedor
- `null`: Se o usuário não for desenvolvedor

### `getAuthUser(): Promise<AuthUser | null>`

Localização: `src/lib/auth.ts`

**Descrição:**
Retorna os dados do usuário autenticado a partir do token JWT no cookie.

**Uso:**
```typescript
import { getAuthUser } from '@/lib/auth';

const user = await getAuthUser();
if (!user) {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}
```

**Retorno:**
- `AuthUser`: Objeto com dados do usuário
- `null`: Se não estiver autenticado

---

## Fluxos de Acesso Comuns

### Fluxo 1: Login e Redirecionamento

```
1. Usuário faz login em /login
2. API /api/auth/login valida credenciais
3. Verifica tipo de usuário:
   - is_master → Redireciona para /admin
   - is_developer_user + developer_id → Redireciona para /dev
   - Outros → Redireciona para /dashboard
4. Token JWT armazenado em cookie 'auth-token'
```

### Fluxo 2: Acesso a Recurso por Grupo

```
1. Requisição chega na API (ex: /api/powerbi/reports?group_id=123)
2. Middleware verifica autenticação
3. API verifica tipo de usuário:
   - Master → Retorna todos os recursos
   - Desenvolvedor → Verifica se group.developer_id = seu ID
   - Admin → Verifica membership com role='admin'
   - Usuário → Verifica membership ativo
4. Se acesso permitido, retorna recursos filtrados
5. Se acesso negado, retorna 403
```

### Fluxo 3: Criação de Recurso

```
1. Requisição POST chega na API
2. API verifica autenticação
3. Se não for master:
   a. Verifica se é desenvolvedor
   b. Se for desenvolvedor, valida que company_group_id pertence a ele
   c. Se não for, retorna 403
4. Cria recurso com company_group_id validado
5. Retorna recurso criado
```

---

## Segurança e Boas Práticas

### ✅ Boas Práticas

1. **Sempre verificar autenticação primeiro**
   ```typescript
   const user = await getAuthUser();
   if (!user) {
     return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
   }
   ```

2. **Usar import dinâmico para getUserDeveloperId**
   ```typescript
   const { getUserDeveloperId } = await import('@/lib/auth');
   ```
   Evita problemas de dependência circular.

3. **Validar acesso ao grupo antes de criar/editar**
   ```typescript
   if (!user.is_master) {
     // Validar que grupo pertence ao desenvolvedor
     const { data: group } = await supabase
       .from('company_groups')
       .select('id')
       .eq('id', company_group_id)
       .eq('developer_id', developerId)
       .single();
   }
   ```

4. **Retornar arrays vazios em vez de erro quando não há acesso**
   ```typescript
   if (userGroupIds.length === 0) {
     return NextResponse.json({ items: [] });
   }
   ```

5. **Usar filtros SQL quando possível**
   ```typescript
   query = query.in('company_group_id', userGroupIds);
   ```
   Mais eficiente que filtrar no código.

### ❌ Anti-padrões

1. **Não confiar apenas no frontend**
   - Sempre validar no backend
   - Não confiar em parâmetros da URL

2. **Não permitir acesso sem validação**
   - Não assumir que usuário tem acesso
   - Sempre verificar grupo antes de retornar dados

3. **Não usar lógica de acesso complexa**
   - Preferir padrões simples e claros
   - Evitar múltiplas condições aninhadas

4. **Não esquecer de validar em DELETE**
   - Validar acesso antes de excluir
   - Não permitir exclusão de recursos de outros desenvolvedores

---

## Tabelas do Banco de Dados

### `users`
```sql
- id (uuid, PK)
- email (string)
- full_name (string)
- password_hash (string)
- is_master (boolean)
- is_developer_user (boolean)
- developer_id (uuid, FK → developers.id)
- status ('active' | 'inactive' | 'suspended')
```

### `developers`
```sql
- id (uuid, PK)
- name (string)
- email (string)
- logo_url (string, nullable)
- primary_color (string, nullable)
- status ('active' | 'inactive')
```

### `company_groups`
```sql
- id (uuid, PK)
- name (string)
- slug (string)
- developer_id (uuid, FK → developers.id, nullable)
- logo_url (string, nullable)
- primary_color (string, nullable)
- use_developer_logo (boolean)
- use_developer_colors (boolean)
- status ('active' | 'inactive')
- plan_id (uuid, FK → plans.id, nullable)
```

### `user_group_membership`
```sql
- id (uuid, PK)
- user_id (uuid, FK → users.id)
- company_group_id (uuid, FK → company_groups.id)
- role ('admin' | 'manager' | 'operator' | 'viewer')
- is_active (boolean)
- created_at (timestamp)
- updated_at (timestamp)
```

---

## Conclusão

Este sistema de acesso e restrições garante que:

1. **Master** tenha controle total do sistema
2. **Desenvolvedores** possam gerenciar seus próprios grupos e recursos
3. **Admins** possam gerenciar grupos específicos
4. **Usuários comuns** tenham acesso limitado aos recursos dos grupos onde participam

A hierarquia de acesso é clara e consistente em todas as APIs, garantindo segurança e facilidade de manutenção.

Para dúvidas ou atualizações, consulte os arquivos de código em `src/lib/auth.ts` e `app/api/**/route.ts`.
