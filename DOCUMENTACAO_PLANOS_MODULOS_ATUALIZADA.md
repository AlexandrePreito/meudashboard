# 📦 Documentação Atualizada - Planos e Módulos

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Mudanças Importantes](#mudanças-importantes)
3. [Sistema de Limites por Developer](#sistema-de-limites-por-developer)
4. [Recursos do Sistema](#recursos-do-sistema)
5. [Limites Disponíveis](#limites-disponíveis)
6. [Distribuição de Quotas](#distribuição-de-quotas)
7. [APIs de Gestão](#apis-de-gestão)
8. [Casos de Uso](#casos-de-uso)

---

## 🎯 Visão Geral

### O que mudou?

O sistema passou por uma **refatoração importante**:

1. **❌ Módulos Removidos**: Todos os recursos estão **sempre disponíveis**. Não há mais verificação de módulos ou necessidade de habilitar/desabilitar funcionalidades.
2. **✅ Limites por Developer**: Os limites agora são **definidos diretamente no desenvolvedor**, não mais através de planos pré-definidos.
3. **📊 Quotas Distribuíveis**: Developers podem distribuir seus limites entre os grupos de empresas.

### Arquitetura Atual

```
┌──────────────────────────────────────────────┐
│            TABELA: developers                 │
├──────────────────────────────────────────────┤
│  id, name, logo_url, primary_color,          │
│  max_companies,                              │
│  max_users,                                  │
│  max_powerbi_screens,                        │
│  max_daily_refreshes,                        │
│  max_chat_messages_per_day,                  │
│  max_alerts,                                 │
│  monthly_price                               │
└──────────────────────────────────────────────┘
                    ↓ (1:N)
┌──────────────────────────────────────────────┐
│        TABELA: company_groups                 │
├──────────────────────────────────────────────┤
│  id, name, developer_id,                     │
│  quota_users,                                │
│  quota_screens,                              │
│  quota_refreshes,                            │
│  quota_chat_messages,                        │
│  quota_alerts                                │
└──────────────────────────────────────────────┘
```

---

## 🔄 Mudanças Importantes

### Antes vs. Depois

#### ❌ ANTES (Sistema de Módulos)

```
✅ Verificava se módulo estava habilitado
✅ Bloqueava acesso se módulo não estivesse ativo
✅ Planos pré-definidos (Básico, Profissional, Enterprise)
✅ Limites vinham dos planos
```

**Problemas:**
- Complexidade desnecessária
- Múltiplas verificações de acesso
- Rigidez nos planos
- Dificuldade para customização

#### ✅ DEPOIS (Sistema Simplificado)

```
✅ Todos os recursos sempre disponíveis
✅ Sem verificações de módulos
✅ Limites definidos por developer
✅ Flexibilidade total na distribuição
```

**Vantagens:**
- Simplicidade
- Todos os recursos acessíveis
- Customização fácil
- Menos código para manter

---

## 👨‍💻 Sistema de Limites por Developer

### Tabela `developers`

Os limites são armazenados diretamente na tabela `developers`:

```sql
CREATE TABLE developers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  
  -- LIMITES DO DEVELOPER
  max_companies INTEGER DEFAULT 5,              -- Número máximo de grupos
  max_users INTEGER DEFAULT 50,                 -- Usuários total
  max_powerbi_screens INTEGER DEFAULT 10,       -- Telas Power BI
  max_daily_refreshes INTEGER DEFAULT 20,       -- Atualizações/dia
  max_chat_messages_per_day INTEGER DEFAULT 1000, -- Mensagens WhatsApp/dia
  max_alerts INTEGER DEFAULT 20,                -- Alertas máximo
  
  monthly_price DECIMAL(10,2),                  -- Preço mensal (opcional)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Campos de Limites

| Campo | Descrição | Padrão | Exemplo |
|-------|-----------|--------|---------|
| `max_companies` | Número máximo de grupos/empresas | 5 | 10 grupos |
| `max_users` | Total de usuários em todos os grupos | 50 | 100 usuários |
| `max_powerbi_screens` | Telas Power BI totais | 10 | 25 telas |
| `max_daily_refreshes` | Atualizações de datasets por dia | 20 | 50 atualizações |
| `max_chat_messages_per_day` | Mensagens WhatsApp por dia | 1000 | 5000 mensagens |
| `max_alerts` | Número máximo de alertas | 20 | 50 alertas |

### Exemplo de Developer

```json
{
  "id": "uuid-developer-123",
  "name": "Minha Empresa LTDA",
  "max_companies": 10,
  "max_users": 100,
  "max_powerbi_screens": 25,
  "max_daily_refreshes": 50,
  "max_chat_messages_per_day": 5000,
  "max_alerts": 50,
  "monthly_price": 999.00
}
```

---

## 🚀 Recursos do Sistema

### Todos os Recursos Sempre Disponíveis

Com a remoção do sistema de módulos, **todos os recursos estão sempre acessíveis**:

#### 📊 Power BI
- Dashboards e relatórios interativos
- Gestão de conexões
- Telas personalizadas
- Contextos de IA
- Ordem de atualização
- Gateways

#### 📱 WhatsApp
- Integração com Evolution API
- Gestão de instâncias
- Grupos autorizados
- Números autorizados
- Histórico de mensagens
- Webhooks
- Chat IA via WhatsApp

#### 🔔 Alertas
- Criação de alertas baseados em DAX
- Condições e triggers
- Agendamento automático
- Integração com WhatsApp
- Histórico de execuções

#### 🤖 Inteligência Artificial
- Geração de queries DAX
- Chat contextual com dados
- Templates de mensagem
- Análise de dashboards
- Assistente WhatsApp

**Nenhuma verificação de módulo é necessária!**

---

## 📊 Limites Disponíveis

### 1. Grupos/Empresas (`max_companies`)

**O que limita:**
- Número de grupos (`company_groups`) que o developer pode criar

**Validação:**
```typescript
// app/api/dev/groups/route.ts
const { count } = await supabase
  .from('company_groups')
  .select('*', { count: 'exact', head: true })
  .eq('developer_id', developerId)
  .eq('status', 'active');

if (count && count >= developer.max_companies) {
  return NextResponse.json({ 
    error: `Limite de ${developer.max_companies} grupos atingido` 
  }, { status: 403 });
}
```

---

### 2. Usuários Total (`max_users`)

**O que limita:**
- Soma de todos os usuários em todos os grupos do developer

**Distribuição:**
- O developer pode distribuir esse total entre os grupos
- Exemplo: 100 usuários totais = 50 no Grupo A + 30 no Grupo B + 20 no Grupo C

**Validação:**
```typescript
// app/api/dev/quotas/route.ts
const totalUsers = grupos.reduce((sum, g) => 
  sum + (g.allocated_users || 0), 0);

if (totalUsers > developer.max_users) {
  return NextResponse.json({ 
    error: `Quota de usuários (${totalUsers}) excede limite (${developer.max_users})` 
  }, { status: 400 });
}
```

---

### 3. Telas Power BI (`max_powerbi_screens`)

**O que limita:**
- Número total de telas Power BI que o developer pode criar

**Distribuição:**
- Pode ser distribuído entre os grupos

**Validação:**
```typescript
// app/api/powerbi/screens/route.ts
const { data: group } = await supabase
  .from('company_groups')
  .select('developer_id, developer:developers(max_powerbi_screens)')
  .eq('id', company_group_id)
  .single();

const maxScreens = group?.developer?.max_powerbi_screens || 10;

const { count } = await supabase
  .from('powerbi_dashboard_screens')
  .select('*', { count: 'exact', head: true })
  .eq('company_group_id', company_group_id);

if (count && count >= maxScreens) {
  return NextResponse.json({ 
    error: `Limite de ${maxScreens} telas atingido` 
  }, { status: 403 });
}
```

---

### 4. Atualizações/Dia (`max_daily_refreshes`)

**O que limita:**
- Número de atualizações de datasets Power BI por dia
- Resetado diariamente (00:00)

**Distribuição:**
- Pode ser distribuído entre os grupos

**Validação:**
```typescript
// Verifica uso do dia atual
const today = new Date().toISOString().split('T')[0];

const { count: todayRefreshes } = await supabase
  .from('powerbi_daily_refresh_count')
  .select('*', { count: 'exact', head: true })
  .eq('company_group_id', groupId)
  .eq('refresh_date', today);

if (todayRefreshes && todayRefreshes >= quota.max_refreshes) {
  return NextResponse.json({ 
    error: 'Limite de atualizações diárias atingido' 
  }, { status: 403 });
}
```

---

### 5. Mensagens Chat/Dia (`max_chat_messages_per_day`)

**O que limita:**
- Número de mensagens WhatsApp com IA por dia
- Resetado diariamente (00:00)

**Distribuição:**
- Pode ser distribuído entre os grupos

**Validação:**
```typescript
// app/api/whatsapp/webhook/route.ts
const today = new Date().toISOString().split('T')[0];

const { count: todayMessages } = await supabase
  .from('daily_usage')
  .select('*', { count: 'exact', head: true })
  .eq('company_group_id', groupId)
  .eq('usage_date', today)
  .eq('usage_type', 'whatsapp');

if (todayMessages && todayMessages >= quota.max_chat_messages) {
  return NextResponse.json({ 
    error: 'Limite de mensagens diárias atingido' 
  }, { status: 403 });
}
```

---

### 6. Alertas (`max_alerts`)

**O que limita:**
- Número máximo de alertas ativos que o developer pode ter

**Distribuição:**
- Pode ser distribuído entre os grupos

**Validação:**
```typescript
// app/api/dev/quotas/route.ts
const totalAlerts = grupos.reduce((sum, g) => 
  sum + (g.allocated_alerts || 0), 0);

if (totalAlerts > developer.max_alerts) {
  return NextResponse.json({ 
    error: `Quota de alertas (${totalAlerts}) excede limite (${developer.max_alerts})` 
  }, { status: 400 });
}
```

---

## 🎯 Distribuição de Quotas

### Como Funciona

O developer pode **distribuir seus limites** entre os grupos:

```
Developer com 100 usuários totais:

┌─────────────────────────────────────────┐
│  Grupo A: 50 usuários (alocado)         │
│  Grupo B: 30 usuários (alocado)         │
│  Grupo C: 20 usuários (alocado)         │
│  ─────────────────────────────────────  │
│  Total: 100 usuários ✅                 │
└─────────────────────────────────────────┘
```

### Página de Quotas

**Rota:** `/dev/quotas`

**Funcionalidades:**
- Visualizar limites totais do developer
- Ver distribuição atual entre grupos
- Ajustar quotas de cada grupo
- Validação em tempo real

**Interface:**
- Cards com totais e disponíveis
- Tabela com grupos e quotas
- Inputs para ajustar valores
- Validação de soma não exceder limite

### API de Quotas

**Endpoint:** `POST /api/dev/quotas`

**Request:**
```json
{
  "quotas": [
    {
      "company_group_id": "uuid-grupo-1",
      "allocated_users": 50,
      "allocated_screens": 10,
      "allocated_alerts": 10,
      "allocated_chat_messages": 500,
      "allocated_refreshes": 20
    },
    {
      "company_group_id": "uuid-grupo-2",
      "allocated_users": 30,
      "allocated_screens": 5,
      "allocated_alerts": 5,
      "allocated_chat_messages": 300,
      "allocated_refreshes": 15
    }
  ]
}
```

**Validações:**
1. Soma de usuários ≤ `max_users`
2. Soma de telas ≤ `max_powerbi_screens`
3. Soma de alertas ≤ `max_alerts`
4. Soma de mensagens ≤ `max_chat_messages_per_day`
5. Soma de atualizações ≤ `max_daily_refreshes`

---

## 📄 Página "Meu Plano"

### Localização

**Rota:** `/dev/plano`

### Funcionalidade

Exibe os limites do developer de forma visual e organizada.

### Estrutura

```typescript
// app/dev/plano/page.tsx

const items = [
  {
    icon: MonitorPlay,
    label: 'Telas Power BI',
    value: plan.max_powerbi_screens
  },
  {
    icon: Users,
    label: 'Usuários Total',
    value: plan.max_users
  },
  {
    icon: RefreshCw,
    label: 'Atualizações/Dia',
    value: plan.max_daily_refreshes
  },
  {
    icon: Building2,
    label: 'Grupos',
    value: plan.max_companies
  },
  {
    icon: MessageCircle,
    label: 'Mensagens Chat/Dia',
    value: plan.max_chat_messages_per_day
  },
  {
    icon: Bell,
    label: 'Alertas',
    value: plan.max_alerts
  }
];
```

### Fonte de Dados

```typescript
// Busca dados do developer via /api/user/groups
fetch('/api/user/groups')
  .then(res => res.json())
  .then(data => {
    if (data.developer) {
      setPlan({
        max_powerbi_screens: data.developer.max_powerbi_screens || 10,
        max_users: data.developer.max_users || 50,
        max_daily_refreshes: data.developer.max_daily_refreshes || 20,
        max_companies: data.developer.max_companies || 5,
        max_chat_messages_per_day: data.developer.max_chat_messages_per_day || 1000,
        max_alerts: data.developer.max_alerts || 20
      });
    }
  });
```

---

## 🔌 APIs de Gestão

### 1. Buscar Limites do Developer

**Endpoint:** `GET /api/user/groups`

**Response:**
```json
{
  "developer": {
    "id": "uuid",
    "name": "Minha Empresa",
    "max_companies": 10,
    "max_users": 100,
    "max_powerbi_screens": 25,
    "max_daily_refreshes": 50,
    "max_chat_messages_per_day": 5000,
    "max_alerts": 50,
    "monthly_price": 999.00
  },
  "groups": [...]
}
```

---

### 2. Dashboard do Developer

**Endpoint:** `GET /api/dev/dashboard`

**Response:**
```json
{
  "developer": {...},
  "plan": {
    "name": "Plano Personalizado",
    "max_groups": 10,
    "max_users": 100,
    "max_screens": 25,
    "max_alerts": 50,
    "max_whatsapp_per_day": 5000,
    "max_refreshes_per_day": 50
  },
  "stats": {
    "groups": { "used": 3, "limit": 10 },
    "users": { "used": 45, "limit": 100 },
    "screens": { "used": 12, "limit": 25 },
    "alerts": { "used": 8, "limit": 50 }
  },
  "usage_today": {
    "whatsapp": { "used": 250, "limit": 5000 },
    "refreshes": { "used": 15, "limit": 50 }
  },
  "groups": [...]
}
```

---

### 3. Verificar Limite de Telas

**Endpoint:** `POST /api/powerbi/screens`

**Validação:**
```typescript
// Busca limite do developer
const { data: group } = await supabase
  .from('company_groups')
  .select('developer_id, developer:developers(max_powerbi_screens)')
  .eq('id', company_group_id)
  .single();

const maxScreens = group?.developer?.max_powerbi_screens || 10;

// Verifica se pode criar
const { count } = await supabase
  .from('powerbi_dashboard_screens')
  .select('*', { count: 'exact', head: true })
  .eq('company_group_id', company_group_id);

if (count && count >= maxScreens) {
  return NextResponse.json({ 
    error: `Limite de ${maxScreens} telas atingido` 
  }, { status: 403 });
}
```

---

### 4. Verificar Limite de Grupos

**Endpoint:** `POST /api/dev/groups`

**Validação:**
```typescript
// Busca limite do developer
const { data: developer } = await supabase
  .from('developers')
  .select('max_companies')
  .eq('id', developerId)
  .single();

const maxCompanies = developer?.max_companies || 5;

// Conta grupos existentes
const { count } = await supabase
  .from('company_groups')
  .select('*', { count: 'exact', head: true })
  .eq('developer_id', developerId)
  .eq('status', 'active');

if (count && count >= maxCompanies) {
  return NextResponse.json({ 
    error: `Limite de ${maxCompanies} grupos atingido` 
  }, { status: 403 });
}
```

---

## 💡 Casos de Uso

### Caso 1: Developer Visualiza Seus Limites

```
1. Developer acessa /dev/plano
2. Sistema busca dados via /api/user/groups
3. Exibe 6 cards com limites:
   - Telas Power BI: 25
   - Usuários Total: 100
   - Atualizações/Dia: 50
   - Grupos: 10
   - Mensagens Chat/Dia: 5000
   - Alertas: 50
```

---

### Caso 2: Distribuir Quotas Entre Grupos

```
Developer com 100 usuários totais:

1. Acessa /dev/quotas
2. Vê:
   - Limite total: 100 usuários
   - Disponível: 100 usuários
   
3. Ajusta distribuição:
   - Grupo A: 50 usuários
   - Grupo B: 30 usuários
   - Grupo C: 20 usuários
   - Total: 100 ✅
   
4. Salva via POST /api/dev/quotas
5. Sistema valida e salva
```

---

### Caso 3: Tentar Criar Tela Além do Limite

```
Developer com limite de 10 telas:

1. Tenta criar 11ª tela via POST /api/powerbi/screens
2. Sistema busca limite do developer: 10
3. Conta telas existentes: 10
4. Retorna erro:
   {
     "error": "Limite de 10 telas atingido",
     "status": 403
   }
5. Developer precisa:
   - Remover uma tela existente, ou
   - Solicitar aumento de limite
```

---

### Caso 4: Verificar Uso Diário

```
Developer com limite de 5000 mensagens/dia:

1. Usuário envia mensagem via WhatsApp
2. Sistema verifica uso do dia via /api/whatsapp/webhook
3. Busca daily_usage para hoje:
   - Usado: 4500 mensagens
   - Limite: 5000 mensagens
   - Disponível: 500 mensagens ✅
   
4. Processa mensagem normalmente

---

Se usado >= limite:
4. Retorna erro:
   {
     "error": "Limite de mensagens diárias atingido",
     "status": 403
   }
```

---

## 📊 Resumo das Mudanças

### ✅ O que foi removido:

1. **Sistema de Módulos**
   - Verificações de `module_groups`
   - Verificações de `hasModule`
   - Bloqueios baseados em módulos
   - Código relacionado a módulos

2. **Planos Pré-definidos**
   - `powerbi_plans` ainda existe (para compatibilidade)
   - Mas limites agora vêm de `developers`
   - `company_groups.plan_id` não é mais usado para limites

3. **Verificações de Acesso a Módulos**
   - Sidebar não verifica módulos
   - Páginas não verificam módulos
   - APIs não verificam módulos

### ✅ O que foi adicionado:

1. **Limites por Developer**
   - 6 campos de limite na tabela `developers`
   - Validações baseadas em limites do developer

2. **Página "Meu Plano"**
   - Rota `/dev/plano`
   - Visualização dos limites

3. **Sistema de Quotas**
   - Distribuição de limites entre grupos
   - Validações de soma

4. **APIs Atualizadas**
   - `GET /api/dev/dashboard` - usa limites do developer
   - `GET /api/user/groups` - retorna limites do developer
   - `POST /api/powerbi/screens` - valida limite do developer
   - `POST /api/dev/groups` - valida limite do developer

---

## 🔍 Referências de Código

### Arquivos Importantes:

1. **Limites do Developer:**
   - `app/api/user/groups/route.ts` - Busca limites
   - `app/api/dev/dashboard/route.ts` - Dashboard com limites
   - `app/api/dev/quotas/route.ts` - Distribuição de quotas

2. **Validações de Limites:**
   - `app/api/powerbi/screens/route.ts` - Limite de telas
   - `app/api/dev/groups/route.ts` - Limite de grupos

3. **Interface:**
   - `app/dev/plano/page.tsx` - Página "Meu Plano"
   - `app/dev/quotas/page.tsx` - Página de Quotas
   - `app/dev/page.tsx` - Dashboard do Developer

4. **Estrutura do Banco:**
   - Tabela `developers` - Armazena limites
   - Tabela `company_groups` - Armazena quotas distribuídas

---

## 📝 Notas Importantes

### Compatibilidade

- A tabela `powerbi_plans` ainda existe no banco
- Mas não é mais usada para definir limites
- Pode ser removida em versões futuras

### Valores Padrão

Se um limite não estiver definido no developer, os seguintes valores padrão são usados:

- `max_companies`: 5
- `max_users`: 50
- `max_powerbi_screens`: 10
- `max_daily_refreshes`: 20
- `max_chat_messages_per_day`: 1000
- `max_alerts`: 20

### Reset Diário

Os limites diários (`max_daily_refreshes` e `max_chat_messages_per_day`) são resetados automaticamente à meia-noite (00:00 UTC).

---

**Documentação criada em:** Janeiro 2025  
**Versão:** 2.0.0  
**Última atualização:** 09/01/2025

---

## 🎯 Checklist de Migração

Para developers existentes, certifique-se de:

- [ ] Definir limites na tabela `developers`
- [ ] Distribuir quotas entre grupos via `/dev/quotas`
- [ ] Atualizar referências de `plan.max_*` para `developer.max_*`
- [ ] Remover verificações de módulos (se houver)
- [ ] Testar validações de limites

---

**Fim da Documentação**
