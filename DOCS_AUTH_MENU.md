# Documentação: Autenticação e Navegação do Sistema

## 1. FLUXO DE LOGIN E REDIRECIONAMENTO

### Arquivo de Login
**Localização:** `app/api/auth/login/route.ts`

### Processo de Login

1. **Recebimento de Credenciais**
   - O endpoint `POST /api/auth/login` recebe `email` e `password`
   - Valida se ambos os campos foram fornecidos

2. **Busca do Usuário**
   ```typescript
   const { data: user, error } = await supabase
     .from('users')
     .select('id, email, full_name, password_hash, is_master, status, developer_id, is_developer_user')
     .eq('email', email.toLowerCase().trim())
     .single();
   ```

3. **Validações**
   - Verifica se o usuário existe
   - Verifica se o status é `'active'`
   - Compara senha usando `bcrypt.compare()`

4. **Criação do Token JWT**
   ```typescript
   const tokenData = {
     id: user.id,
     email: user.email,
     name: user.full_name,
     role: user.is_master ? 'master' : 'user',
     groupId: null,
     developerId: user.developer_id,
     isDeveloperUser: user.is_developer_user || false,
   };
   const token = jwt.sign(tokenData, jwtSecret, { expiresIn: '7d' });
   ```

5. **Cookie de Autenticação**
   - Token salvo em cookie `auth-token`
   - HttpOnly, Secure (em produção), SameSite: 'lax'
   - Expira em 7 dias

### Redirecionamento Após Login

**Arquivo:** `app/login/page.tsx` (linhas 112-122)

A lógica de redirecionamento acontece no frontend após receber resposta do login:

```typescript
if (response.ok && data.success) {
  // Salvar cor do tema para evitar flash
  if (data.user?.developer?.primary_color) {
    localStorage.setItem('theme-color', data.user.developer.primary_color);
  } else if (data.user?.group?.primary_color && data.user?.group?.use_developer_colors === false) {
    localStorage.setItem('theme-color', data.user.group.primary_color);
  }
  
  setTransitioning(true);
  setTimeout(() => {
    // Verifica tipo de usuário para redirecionar
    if (data.user?.isDeveloperUser && data.user?.developerId) {
      router.push('/dev');           // Desenvolvedor → /dev
    } else if (data.user?.role === 'master') {
      router.push('/admin');         // Master → /admin
    } else {
      router.push('/dashboard');     // Usuário comum → /dashboard
    }
  }, 800);
}
```

### Decisão de Redirecionamento

O sistema decide qual página mostrar baseado em:
- **`isDeveloperUser`** + **`developerId`**: Redireciona para `/dev`
- **`role === 'master'`**: Redireciona para `/admin`
- **Caso contrário**: Redireciona para `/dashboard`

### Verificações de Tipo de Usuário

**Campos verificados:**
- `is_master` (tabela `users`)
- `is_developer_user` (tabela `users`)
- `developer_id` (tabela `users`)
- `role` (tabela `user_group_membership` - apenas para usuários não-master)

---

## 2. MIDDLEWARE

### Arquivo
**Localização:** `middleware.ts` (raiz do projeto)

### Rotas Protegidas

O middleware protege **todas as rotas**, exceto as listadas como públicas.

### Rotas Públicas

```typescript
const publicRoutes = [
  '/',                                    // Landing page pública
  '/login',                               // Página de login
  '/planos',                              // Página de planos pública
  '/api/auth/login',                      // Endpoint de login
  '/api/auth/logout',                     // Endpoint de logout
  '/api/whatsapp/webhook',                // Webhooks do WhatsApp
  '/api/whatsapp/webhook/messages-upsert',
  '/api/whatsapp/webhook/contacts-update',
  '/api/whatsapp/webhook/chats-update',
  '/api/alertas/cron',                    // Cron job de alertas
];
```

### Lógica do Middleware

1. **Verificação de Rota Pública**
   ```typescript
   if (publicRoutes.includes(pathname)) {
     return NextResponse.next();
   }
   ```

2. **Proteção de Rotas de Desenvolvedor**
   ```typescript
   if (pathname.startsWith('/developer')) {
     const token = request.cookies.get('auth-token')?.value;
     if (!token) {
       return NextResponse.redirect(new URL('/login', request.url));
     }
   }
   ```

3. **Verificação de Token**
   ```typescript
   const token = request.cookies.get('auth-token')?.value;
   
   if (!token) {
     if (pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
     }
     return NextResponse.redirect(new URL('/login', request.url));
   }
   ```

4. **Validação do Token JWT**
   ```typescript
   try {
     const secret = getJwtSecret();
     await jwtVerify(token, secret);
     
     // Se token válido e está em /login, redireciona para /dashboard
     if (pathname === '/login') {
       return NextResponse.redirect(new URL('/dashboard', request.url));
     }
     return NextResponse.next();
   } catch (error) {
     // Token inválido
     if (pathname.startsWith('/api/')) {
       return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
     }
     return NextResponse.redirect(new URL('/login', request.url));
   }
   ```

### Redirecionamento Baseado em Role

**O middleware NÃO faz redirecionamento baseado em role/tipo de usuário.**

A verificação de role/tipo acontece apenas no login (frontend) e nas páginas/APIs que verificam permissões usando `getAuthUser()`.

### Configuração do Matcher

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
```

O middleware é aplicado a todas as rotas, exceto arquivos estáticos do Next.js.

---

## 3. MENU/SIDEBAR

### Arquivo Principal
**Localização:** `src/components/layout/Sidebar.tsx`

### Geração do Menu

O menu é **dinâmico** e baseado em:
- Tipo de usuário (`is_master`, `is_developer`, `role`)
- Página atual (`pathname`)
- Dados do contexto (`MenuContext`)

### Itens do Menu

Os itens do menu são definidos como **arrays estáticos** dentro do componente:

#### Menu Admin (Master)
```typescript
const adminMenuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/desenvolvedores', icon: Code, label: 'Desenvolvedores' },
  { href: '/admin/grupos', icon: Building2, label: 'Grupos' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { href: '/admin/relatorios', icon: BarChart3, label: 'Relatorios' },
];
```

#### Menu Developer
```typescript
const devMenuItems = [
  { href: '/dev', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dev/groups', icon: Building2, label: 'Grupos' },
  { href: '/dev/usuarios', icon: Users, label: 'Usuários' },
  { href: '/dev/quotas', icon: ArrowUpDown, label: 'Distribuir Cotas' },
  { href: '/dev/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dev/perfil', icon: Settings, label: 'Configurações' },
  { href: '/dev/plano', icon: CreditCard, label: 'Meu Plano' },
];
```

#### Menu Power BI
```typescript
const powerBIMenuItems = [
  { href: '/powerbi', icon: Activity, label: 'Dashboard' },
  { href: '/powerbi/conexoes', icon: LinkIcon, label: 'Conexões' },
  { href: '/powerbi/relatorios', icon: FileText, label: 'Relatórios' },
  { href: '/powerbi/telas', icon: Monitor, label: 'Telas' },
  { href: '/powerbi/contextos', icon: Brain, label: 'Contextos IA' },
  { href: '/powerbi/ordem-atualizacao', icon: ArrowUpDown, label: 'Ordem Atualização' },
];
```

#### Menu Configurações (Dinâmico)
```typescript
const configMenuItems = user?.is_master
  ? [
      { href: '/configuracoes', icon: Users, label: 'Usuários' },
      { href: '/configuracoes/grupos', icon: Building2, label: 'Grupos' },
      { href: '/configuracoes/planos', icon: Crown, label: 'Planos' },
      { href: '/configuracoes/modulos', icon: Puzzle, label: 'Módulos' },
      { href: '/configuracoes/logs', icon: FileText, label: 'Logs' },
    ]
  : user?.role === 'admin'
  ? [
      { href: '/configuracoes', icon: Users, label: 'Usuários' },
      { href: '/configuracoes/grupos', icon: Building2, label: 'Personalização' },
      { href: '/configuracoes/logs', icon: FileText, label: 'Logs' },
    ]
  : [
      { href: '/configuracoes', icon: User, label: 'Meu Perfil' },
      { href: '/configuracoes/logs', icon: FileText, label: 'Minhas Atividades' },
    ];
```

#### Menu WhatsApp
```typescript
const whatsappMenuItems = [
  { href: '/whatsapp', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/whatsapp/instancias', icon: Smartphone, label: 'Instâncias' },
  { href: '/whatsapp/numeros', icon: User, label: 'Números Autorizados' },
  { href: '/whatsapp/grupos', icon: UsersRound, label: 'Grupos Autorizados', hideForDeveloper: true },
  { href: '/whatsapp/mensagens', icon: MessageSquare, label: 'Mensagens' },
  { href: '/alertas', icon: Bell, label: 'Alertas' },
  { href: '/alertas/historico', icon: History, label: 'Histórico' },
  { href: '/whatsapp/webhook', icon: Webhook, label: 'Webhook', hideForDeveloper: true },
];
```

### Lógica de Exibição

O menu decide o que mostrar baseado em:

1. **Tipo de Usuário**
   ```typescript
   const isRegularUser = !user?.is_master && !user?.is_developer && user?.role === 'user';
   ```

2. **Página Atual**
   ```typescript
   const showPowerBIMenu = pathname.startsWith('/powerbi') && !isRegularUser;
   const showConfigMenu = pathname.startsWith('/configuracoes');
   const showWhatsAppMenu = pathname.startsWith('/whatsapp') || pathname.startsWith('/alertas');
   const showAdminMenu = pathname.startsWith('/admin');
   const showDevMenu = pathname.startsWith('/dev');
   ```

3. **Permissões**
   ```typescript
   const canSeeConfig = user?.is_master || user?.role === 'admin';
   ```

4. **Telas Power BI Dinâmicas**
   - Para usuários comuns: Carrega telas do grupo atual via API
   - Para admin/developer: Carrega todas as telas do grupo

### Filtragem por Permissões

**Nota:** O sistema de módulos foi removido. Todos os recursos estão sempre disponíveis.

Itens com `hideForDeveloper: true` são ocultados para desenvolvedores:
```typescript
{ href: '/whatsapp/grupos', ..., hideForDeveloper: true }
```

---

## 4. IDENTIFICAÇÃO DE ROLE

### Armazenamento de Role

**Tabela:** `user_group_membership`

**Estrutura:**
- `user_id`: ID do usuário
- `company_group_id`: ID do grupo
- `role`: 'admin' | 'manager' | 'operator' | 'viewer'
- `is_active`: Status da membership

### Verificação de Role

#### Backend (API Routes)

**Função:** `getAuthUser()` em `src/lib/auth.ts`

```typescript
export async function getAuthUser(): Promise<AuthUser | null> {
  // Busca usuário do token JWT
  // Retorna: { id, email, full_name, is_master, status, avatar_url }
}
```

**Endpoint:** `/api/auth/me` (linhas 23-53)

```typescript
if (!user.is_master && !isDeveloper) {
  const supabase = createAdminClient();
  
  // Buscar memberships do usuário
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id, role, can_use_ai, can_refresh')
    .eq('user_id', user.id)
    .eq('is_active', true);

  groupIds = memberships?.map(m => m.company_group_id) || [];
  const userRole = memberships?.some(m => m.role === 'admin') ? 'admin' : 'user';
  role = userRole;
}
```

**Regra de Role:**
- Se o usuário tem **qualquer membership** com `role === 'admin'` → role é `'admin'`
- Caso contrário → role é `'user'`

### Acesso ao Role no Frontend

1. **Via API `/api/auth/me`**
   ```typescript
   const res = await fetch('/api/auth/me', { credentials: 'include' });
   const data = await res.json();
   const role = data.user.role; // 'master' | 'developer' | 'admin' | 'user'
   ```

2. **Via MenuContext**
   ```typescript
   import { useMenu } from '@/contexts/MenuContext';
   const { user } = useMenu();
   const role = user?.role; // 'master' | 'developer' | 'admin' | 'user'
   ```

3. **Via MainLayout**
   - O `MainLayout` busca dados via `/api/auth/me` e armazena no estado
   - Disponibiliza via `MenuContext`

### Tipos de Role

- **`'master'`**: Usuário master (campo `is_master = true` na tabela `users`)
- **`'developer'`**: Usuário desenvolvedor (`is_developer_user = true` ou `developer_id` presente)
- **`'admin'`**: Administrador de grupo (qualquer `user_group_membership.role === 'admin'`)
- **`'user'`**: Usuário comum (qualquer outro caso)

### Hierarquia de Roles

1. **Master**: Acesso total ao sistema, todas as rotas `/admin`
2. **Developer**: Acesso a rotas `/dev`, gerencia seus próprios grupos
3. **Admin** (grupo): Pode gerenciar usuários e configurações do seu grupo
4. **User** (viewer/operator): Acesso limitado, apenas visualização e ações permitidas

---

## 5. ESTRUTURA DE ROTAS ATUAL

### Rotas Principais

#### `/dashboard`
- **Quem pode acessar:** Todos os usuários autenticados
- **Arquivo:** `app/dashboard/page.tsx`
- **Descrição:** Dashboard principal para usuários comuns

#### `/admin` e `/admin/*`
- **Quem pode acessar:** Apenas usuários `is_master = true`
- **Rotas:**
  - `/admin` → `app/admin/page.tsx`
  - `/admin/desenvolvedores` → `app/admin/desenvolvedores/page.tsx`
  - `/admin/grupos` → `app/admin/grupos/page.tsx`
  - `/admin/usuarios` → `app/admin/usuarios/page.tsx`
  - `/admin/relatorios` → `app/admin/relatorios/page.tsx`

#### `/dev` e `/dev/*`
- **Quem pode acessar:** Usuários desenvolvedores (`is_developer_user = true` ou `developer_id` presente)
- **Rotas:**
  - `/dev` → `app/dev/page.tsx`
  - `/dev/groups` → `app/dev/groups/page.tsx`
  - `/dev/groups/[id]` → `app/dev/groups/[id]/page.tsx`
  - `/dev/usuarios` → `app/dev/usuarios/page.tsx`
  - `/dev/quotas` → `app/dev/quotas/page.tsx`
  - `/dev/relatorios` → `app/dev/relatorios/page.tsx`
  - `/dev/perfil` → `app/dev/perfil/page.tsx`
  - `/dev/plano` → `app/dev/plano/page.tsx`

#### `/powerbi` e `/powerbi/*`
- **Quem pode acessar:** Todos os usuários autenticados (admin/master veem tudo, usuários comuns veem apenas suas telas)
- **Rotas:**
  - `/powerbi` → `app/powerbi/page.tsx`
  - `/powerbi/conexoes` → `app/powerbi/conexoes/page.tsx`
  - `/powerbi/relatorios` → `app/powerbi/relatorios/page.tsx`
  - `/powerbi/telas` → `app/powerbi/telas/page.tsx`
  - `/powerbi/contextos` → `app/powerbi/contextos/page.tsx`
  - `/powerbi/ordem-atualizacao` → `app/powerbi/ordem-atualizacao/page.tsx`
  - `/powerbi/gateways` → `app/powerbi/gateways/page.tsx`
  - `/tela/[id]` → `app/tela/[id]/page.tsx` (tela individual)

#### `/whatsapp` e `/whatsapp/*`
- **Quem pode acessar:** Todos os usuários autenticados (alguns itens ocultos para desenvolvedores)
- **Rotas:**
  - `/whatsapp` → `app/whatsapp/page.tsx`
  - `/whatsapp/instancias` → `app/whatsapp/instancias/page.tsx`
  - `/whatsapp/numeros` → `app/whatsapp/numeros/page.tsx`
  - `/whatsapp/grupos` → `app/whatsapp/grupos/page.tsx` (oculto para desenvolvedores)
  - `/whatsapp/mensagens` → `app/whatsapp/mensagens/page.tsx`
  - `/whatsapp/webhook` → `app/whatsapp/webhook/page.tsx` (oculto para desenvolvedores)

#### `/alertas` e `/alertas/*`
- **Quem pode acessar:** Todos os usuários autenticados
- **Rotas:**
  - `/alertas` → `app/alertas/page.tsx`
  - `/alertas/novo` → `app/alertas/novo/page.tsx`
  - `/alertas/[id]` → `app/alertas/[id]/page.tsx`
  - `/alertas/historico` → `app/alertas/historico/page.tsx`

#### `/configuracoes` e `/configuracoes/*`
- **Quem pode acessar:** 
  - Master: Todas as rotas
  - Admin: Algumas rotas
  - Usuários: Apenas perfil
- **Rotas:**
  - `/configuracoes` → `app/configuracoes/page.tsx`
  - `/configuracoes/grupos` → `app/configuracoes/grupos/page.tsx`
  - `/configuracoes/planos` → `app/configuracoes/planos/page.tsx` (apenas master)
  - `/configuracoes/modulos` → `app/configuracoes/modulos/page.tsx` (apenas master)
  - `/configuracoes/logs` → `app/configuracoes/logs/page.tsx`

### APIs Principais

#### `/api/auth/*`
- `/api/auth/login` → Login (público)
- `/api/auth/logout` → Logout (público)
- `/api/auth/me` → Dados do usuário autenticado
- `/api/auth/verify-password` → Verificar senha

#### `/api/powerbi/*`
- `/api/powerbi/screens` → CRUD de telas
- `/api/powerbi/reports` → Listar relatórios
- `/api/powerbi/connections` → CRUD de conexões
- `/api/powerbi/contexts` → CRUD de contextos IA
- E outros...

#### `/api/whatsapp/*`
- `/api/whatsapp/webhook` → Webhook de mensagens (público)
- `/api/whatsapp/instances` → CRUD de instâncias
- `/api/whatsapp/messages` → Listar mensagens
- E outros...

#### `/api/alertas/*`
- `/api/alertas` → CRUD de alertas
- `/api/alertas/cron` → Execução de alertas (público)
- `/api/alertas/historico` → Histórico de execuções

#### `/api/dev/*`
- `/api/dev/dashboard` → Dashboard do desenvolvedor
- `/api/dev/groups` → CRUD de grupos do desenvolvedor
- `/api/dev/quotas` → Gerenciamento de quotas
- E outros...

#### `/api/admin/*`
- `/api/admin/*` → Rotas exclusivas para master

---

## 6. DADOS DO USUÁRIO NO FRONTEND

### Context API

**Arquivo:** `src/contexts/MenuContext.tsx`

**Interface:**
```typescript
interface MenuContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  activeGroup: CompanyGroup | null;
  setActiveGroup: (group: CompanyGroup | null) => void;
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  developer: DeveloperInfo | null;
  setDeveloper: (developer: DeveloperInfo | null) => void;
}
```

**Uso:**
```typescript
import { useMenu } from '@/contexts/MenuContext';
const { user, activeGroup } = useMenu();
```

### API Endpoint Principal

**Endpoint:** `GET /api/auth/me`

**Arquivo:** `app/api/auth/me/route.ts`

**Resposta:**
```typescript
{
  user: {
    id: string;
    email: string;
    full_name: string;
    is_master: boolean;
    is_developer: boolean;
    status: 'active' | 'suspended';
    role: 'master' | 'developer' | 'admin' | 'user';
    can_use_ai: boolean;
    can_refresh: boolean;
  },
  role: string;
  groupIds: string[];
}
```

### Como Obter Dados do Usuário

#### 1. Via Fetch Direto
```typescript
async function loadUser() {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (res.ok) {
    const data = await res.json();
    setUser(data.user);
  }
}
```

#### 2. Via MainLayout (Recomendado)
O `MainLayout` (`src/components/layout/MainLayout.tsx`) já faz essa busca automaticamente:

```typescript
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      router.push('/login');
    }
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    router.push('/login');
  }
}
```

#### 3. Via MenuContext
Se o componente está dentro de um `MenuProvider`, pode usar:

```typescript
const { user } = useMenu();
```

### Informações Disponíveis

#### Do Usuário
- `id`: ID único do usuário
- `email`: Email do usuário
- `full_name`: Nome completo
- `is_master`: É usuário master?
- `is_developer`: É desenvolvedor?
- `status`: Status da conta ('active' | 'suspended')
- `role`: Role no sistema ('master' | 'developer' | 'admin' | 'user')
- `can_use_ai`: Pode usar IA?
- `can_refresh`: Pode atualizar dados?

#### Dos Grupos
- `groupIds`: Array de IDs dos grupos do usuário
- `activeGroup`: Grupo atualmente selecionado (via MenuContext)

#### Do Desenvolvedor (se aplicável)
- `developer.id`: ID do desenvolvedor
- `developer.name`: Nome do desenvolvedor
- `developer.logo_url`: URL do logo
- `developer.primary_color`: Cor primária do tema

### Persistência de Dados

- **Token JWT**: Salvo em cookie `auth-token` (HttpOnly)
- **Grupo Ativo**: Salvo em `localStorage` como `'active-group'`
- **Cor do Tema**: Salvo em `localStorage` como `'theme-color'`

### Verificação de Autenticação

Todos os componentes que precisam de dados do usuário devem:

1. Verificar se o usuário está autenticado
2. Redirecionar para `/login` se não estiver
3. Carregar dados via `/api/auth/me` ou `MenuContext`

**Exemplo:**
```typescript
useEffect(() => {
  const checkAuth = async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      router.push('/login');
    } else {
      const data = await res.json();
      setUser(data.user);
    }
  };
  checkAuth();
}, []);
```

---

## RESUMO

### Fluxo Completo

1. **Login** → `POST /api/auth/login` → Cria token JWT → Salva em cookie
2. **Middleware** → Verifica token em todas as requisições → Protege rotas
3. **Redirecionamento** → Frontend decide baseado em `isDeveloperUser`, `role === 'master'`
4. **Menu** → Renderiza baseado em `user.role`, `pathname`, permissões
5. **Dados do Usuário** → `/api/auth/me` → Disponibilizado via `MenuContext`
6. **Permissões** → Verificadas via `user_group_membership.role` e `is_master`, `is_developer`

### Tipos de Usuário e Acesso

| Tipo | `is_master` | `is_developer` | Role | Rotas Acessíveis |
|------|-------------|----------------|------|------------------|
| Master | `true` | `false` | `'master'` | `/admin/*`, todas as rotas |
| Developer | `false` | `true` | `'developer'` | `/dev/*`, grupos próprios |
| Admin (Grupo) | `false` | `false` | `'admin'` | Dashboard, Power BI, Configurações (limitado) |
| User | `false` | `false` | `'user'` | Dashboard, Power BI (apenas suas telas) |

---

**Documentação gerada em:** 2025-01-27  
**Versão do Sistema:** 2.0
