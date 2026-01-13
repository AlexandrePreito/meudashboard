# 🧩 Documentação Completa - Módulos e Planos

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Módulos do Sistema](#módulos-do-sistema)
3. [Planos e Licenciamento](#planos-e-licenciamento)
4. [Integração Módulos ↔ Planos](#integração-módulos--planos)
5. [APIs de Gestão](#apis-de-gestão)
6. [Casos de Uso Práticos](#casos-de-uso-práticos)
7. [Migração e Upgrade](#migração-e-upgrade)
8. [Monitoramento e Limites](#monitoramento-e-limites)

---

## 🎯 Visão Geral

### O que são Módulos?

**Módulos** são funcionalidades isoladas que podem ser **ativadas ou desativadas** para cada grupo de empresas. Isso permite criar **pacotes personalizados** de recursos.

### O que são Planos?

**Planos** definem os **limites quantitativos** de recursos que um grupo pode usar (usuários, telas, alertas, etc). Funcionam como camadas de licenciamento.

### Relação entre Módulos e Planos

```
┌────────────────────────────────────────────────────┐
│                    PLANO                            │
│  Define: Quantos recursos (limites numéricos)      │
├────────────────────────────────────────────────────┤
│  • 20 usuários                                      │
│  • 10 telas Power BI                                │
│  • 100 alertas                                      │
│  • 20 atualizações/dia                              │
└────────────────────────────────────────────────────┘
                         +
┌────────────────────────────────────────────────────┐
│                   MÓDULOS                           │
│  Define: Quais funcionalidades (habilitado/não)    │
├────────────────────────────────────────────────────┤
│  ✅ Power BI                                        │
│  ✅ WhatsApp                                        │
│  ✅ Alertas                                         │
│  ❌ IA (não habilitado)                            │
└────────────────────────────────────────────────────┘
                         =
┌────────────────────────────────────────────────────┐
│              EXPERIÊNCIA DO GRUPO                   │
├────────────────────────────────────────────────────┤
│  Pode usar:                                         │
│  ✅ Até 10 telas Power BI                          │
│  ✅ Enviar mensagens WhatsApp                      │
│  ✅ Criar até 100 alertas                          │
│  ❌ Não tem chat IA                                │
└────────────────────────────────────────────────────┘
```

### Exemplo Real

```
🏢 Empresa XYZ Ltda
    │
    ├─ 📦 Plano: Profissional
    │   ├─ 20 usuários
    │   ├─ 10 telas
    │   ├─ 100 alertas
    │   └─ 20 atualizações/dia
    │
    └─ 🧩 Módulos Habilitados:
        ├─ ✅ Power BI
        ├─ ✅ WhatsApp
        └─ ✅ Alertas
        └─ ❌ IA (não habilitado)
```

**Resultado:**
- Usuários veem menu com: Power BI, WhatsApp, Alertas
- IA não aparece no sistema
- Limites aplicados: máximo 10 telas, 20 usuários, etc

---

## 🧩 Módulos do Sistema

### Arquitetura de Módulos

```
┌─────────────────────────────────────────────────────┐
│                  BANCO DE DADOS                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  📊 Tabela: modules                                 │
│  ┌────────────────────────────────────────┐        │
│  │ id, name, display_name, description,   │        │
│  │ icon, is_enabled, sort_order           │        │
│  └────────────────────────────────────────┘        │
│                    ↓                                 │
│  🔗 Tabela: module_groups                           │
│  ┌────────────────────────────────────────┐        │
│  │ module_id, company_group_id            │        │
│  └────────────────────────────────────────┘        │
│                    ↓                                 │
│  🏢 Tabela: company_groups                          │
│  ┌────────────────────────────────────────┐        │
│  │ id, name, status, plan_id              │        │
│  └────────────────────────────────────────┘        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Tabela `modules`

**Estrutura completa:**

```sql
CREATE TABLE modules (
  -- Identificação única
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Nome técnico (usado em código)
  -- Exemplos: 'powerbi', 'whatsapp', 'alertas', 'ia'
  name TEXT UNIQUE NOT NULL,
  
  -- Nome para exibição (UI)
  -- Exemplos: 'Power BI', 'WhatsApp', 'Alertas', 'Inteligência Artificial'
  display_name TEXT NOT NULL,
  
  -- Descrição detalhada
  description TEXT,
  
  -- Ícone (Lucide React)
  -- Exemplos: 'BarChart3', 'MessageCircle', 'Bell', 'Bot'
  icon TEXT NOT NULL DEFAULT 'Package',
  
  -- Módulo ativo no sistema?
  -- false = Módulo em desenvolvimento, não disponível
  is_enabled BOOLEAN DEFAULT true,
  
  -- Ordem de exibição no menu
  sort_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_modules_name ON modules(name);
CREATE INDEX idx_modules_sort_order ON modules(sort_order);
CREATE INDEX idx_modules_is_enabled ON modules(is_enabled);
```

**Campos explicados:**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | Identificador único | `a1b2c3d4-...` |
| `name` | TEXT | Nome técnico (código) | `powerbi` |
| `display_name` | TEXT | Nome exibido | `Power BI` |
| `description` | TEXT | Descrição longa | `Dashboards e relatórios...` |
| `icon` | TEXT | Ícone Lucide React | `BarChart3` |
| `is_enabled` | BOOLEAN | Ativo no sistema? | `true` |
| `sort_order` | INTEGER | Ordem no menu | `1` |

### Tabela `module_groups`

**Tabela de relacionamento N:N (Módulo ↔ Grupo)**

```sql
CREATE TABLE module_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Módulo habilitado
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  
  -- Para qual grupo
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  
  -- Data de habilitação
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Um módulo só pode estar habilitado uma vez por grupo
  UNIQUE(module_id, company_group_id)
);

-- Índices
CREATE INDEX idx_module_groups_module_id ON module_groups(module_id);
CREATE INDEX idx_module_groups_company_group_id ON module_groups(company_group_id);
```

**Por que essa estrutura?**

```
✅ Flexibilidade: Cada grupo tem módulos independentes
✅ Escalabilidade: Adicionar novos módulos é simples
✅ Controle: Habilitar/desabilitar sem afetar outros grupos
✅ Auditoria: Saber quando módulo foi habilitado
```

---

### Módulos Disponíveis

#### 1. 📊 Power BI

```yaml
Nome: powerbi
Display: Power BI
Ícone: BarChart3
Descrição: Dashboards e relatórios interativos do Power BI

Funcionalidades:
  - Visualização de relatórios embutidos
  - Gestão de conexões com Power BI
  - Cadastro de telas (dashboards)
  - Gestão de datasets
  - Contextos de IA para análise
  - Ordem de atualização de datasets
  - Gateways on-premise

Rotas:
  - /powerbi (hub principal)
  - /powerbi/conexoes
  - /powerbi/telas
  - /powerbi/relatorios
  - /powerbi/datasets
  - /powerbi/contextos
  - /powerbi/gateways
  - /powerbi/ordem-atualizacao
  - /tela/[id] (visualização)

APIs:
  - GET/POST /api/powerbi/connections
  - GET /api/powerbi/datasets
  - POST /api/powerbi/execute-dax
  - POST /api/powerbi/embed-token
  - GET/POST /api/powerbi/screens

Permissões por Role:
  admin: Gerenciar conexões, configurações
  manager: Criar telas, contextos
  operator: Visualizar telas
  viewer: Apenas visualizar

Limitado por Plano:
  - max_powerbi_screens (número de telas)
  - max_daily_refreshes (atualizações/dia)
```

**Quando habilitar:**
- Cliente usa Power BI e quer dashboards embutidos
- Precisa de relatórios interativos
- Quer análise de dados visual

---

#### 2. 📱 WhatsApp

```yaml
Nome: whatsapp
Display: WhatsApp
Ícone: MessageCircle
Descrição: Integração com WhatsApp e gestão de mensagens

Funcionalidades:
  - Integração com Evolution API
  - Gestão de instâncias WhatsApp
  - Cadastro de grupos
  - Cadastro de números
  - Envio de mensagens
  - Histórico de mensagens
  - Webhooks para receber mensagens

Rotas:
  - /whatsapp (hub principal)
  - /whatsapp/instancias
  - /whatsapp/grupos
  - /whatsapp/numeros
  - /whatsapp/mensagens
  - /whatsapp/webhook

APIs:
  - GET/POST /api/whatsapp/instances
  - GET/POST /api/whatsapp/groups
  - GET/POST /api/whatsapp/numbers
  - POST /api/whatsapp/send-message
  - POST /api/whatsapp/webhook

Permissões por Role:
  admin: Configurar instâncias, webhooks
  manager: Adicionar grupos/números, enviar
  operator: Enviar mensagens
  viewer: Ver histórico

Limitado por Plano:
  - Não tem limites específicos
  - Mas depende de ter instância ativa
```

**Quando habilitar:**
- Cliente quer enviar notificações WhatsApp
- Precisa de alertas automáticos
- Quer comunicação com clientes

---

#### 3. 🔔 Alertas

```yaml
Nome: alertas
Display: Alertas
Ícone: Bell
Descrição: Sistema de alertas automáticos baseados em dados

Funcionalidades:
  - Criação de alertas baseados em DAX
  - Condições (maior que, menor que, etc)
  - Agendamento (diário, semanal, mensal)
  - Integração com WhatsApp
  - Histórico de execuções
  - Disparo manual
  - CRON automático (Vercel)

Rotas:
  - /alertas (lista)
  - /alertas/novo (criar)
  - /alertas/[id] (editar)
  - /alertas/historico

APIs:
  - GET/POST /api/alertas
  - PUT /api/alertas
  - DELETE /api/alertas/:id
  - POST /api/alertas/:id/trigger
  - GET /api/alertas/:id/historico
  - GET /api/alertas/cron (CRON job)

Tipos de Alerta:
  - threshold: Limite
  - anomaly: Anomalia
  - comparison: Comparação
  - goal: Meta
  - scheduled_report: Relatório programado

Permissões por Role:
  admin: Criar, editar, deletar qualquer
  manager: Criar, editar próprios
  operator: Disparar manualmente
  viewer: Não tem acesso

Limitado por Plano:
  - Número máximo de alertas
  - Frequência de execução

Dependências:
  - Módulo Power BI (para executar DAX)
  - Módulo WhatsApp (para enviar notificações)
```

**Quando habilitar:**
- Cliente quer monitoramento automático
- Precisa de notificações baseadas em dados
- Quer relatórios programados

---

#### 4. 🤖 Inteligência Artificial

```yaml
Nome: ia
Display: Inteligência Artificial
Ícone: Bot
Descrição: Assistente de IA para análise de dados

Funcionalidades:
  - Geração de queries DAX
  - Geração de templates de mensagem
  - Chat contextual com dados
  - Análise de dashboards
  - Sugestões inteligentes

Rotas:
  - Sem rotas específicas
  - Integrado nas telas Power BI
  - Integrado na criação de alertas

APIs:
  - POST /api/ai/generate-dax
  - POST /api/ai/generate-alert
  - POST /api/ai/generate-alert-template
  - POST /api/ai/chat

Modelo:
  - Anthropic Claude Sonnet 4
  - Contextos específicos por dataset

Permissões por Role:
  admin: Acesso total
  manager: Acesso total
  operator: Chat apenas
  viewer: Chat apenas (se habilitado)

Limitado por Plano:
  - Consumo de API (tokens)
  - Número de conversas/dia

Dependências:
  - Módulo Power BI (para contextos)
  - ANTHROPIC_API_KEY configurada

Custos:
  ⚠️ Módulo com custo adicional
  - Consumo de API Claude é cobrado
```

**Quando habilitar:**
- Cliente quer IA para análise
- Precisa gerar DAX sem conhecer linguagem
- Quer chat inteligente com dados

---

### Ciclo de Vida de um Módulo

```
1️⃣ DESENVOLVIMENTO
   ┌─────────────────────────────────┐
   │ Master cria módulo              │
   │ INSERT INTO modules (           │
   │   name = 'novo_modulo',         │
   │   is_enabled = false            │
   │ )                               │
   └─────────────────────────────────┘
   Estado: Não visível para ninguém

2️⃣ ATIVAÇÃO NO SISTEMA
   ┌─────────────────────────────────┐
   │ Master habilita                 │
   │ UPDATE modules                  │
   │ SET is_enabled = true           │
   │ WHERE name = 'novo_modulo'      │
   └─────────────────────────────────┘
   Estado: Visível para Master

3️⃣ HABILITAÇÃO PARA GRUPO
   ┌─────────────────────────────────┐
   │ Master ou Admin do grupo        │
   │ INSERT INTO module_groups (     │
   │   module_id,                    │
   │   company_group_id              │
   │ )                               │
   └─────────────────────────────────┘
   Estado: Disponível para grupo

4️⃣ USO PELOS USUÁRIOS
   ┌─────────────────────────────────┐
   │ Usuários do grupo veem módulo   │
   │ Menu exibe opção                │
   │ Rotas acessíveis                │
   │ APIs funcionam                  │
   └─────────────────────────────────┘
   Estado: Em uso

5️⃣ DESABILITAÇÃO (se necessário)
   ┌─────────────────────────────────┐
   │ DELETE FROM module_groups       │
   │ WHERE company_group_id = X      │
   │ AND module_id = Y               │
   └─────────────────────────────────┘
   Estado: Removido do grupo

6️⃣ DESATIVAÇÃO NO SISTEMA (raro)
   ┌─────────────────────────────────┐
   │ UPDATE modules                  │
   │ SET is_enabled = false          │
   └─────────────────────────────────┘
   Estado: Desabilitado para todos
```

---

### Como os Módulos Afetam o Sistema

#### 1. Menu Lateral Dinâmico

```typescript
// src/components/layout/MainLayout.tsx

// Buscar módulos habilitados para o grupo do usuário
const { data: enabledModules } = await supabase
  .from('module_groups')
  .select(`
    module:modules!inner(
      name,
      display_name,
      icon,
      sort_order
    )
  `)
  .eq('company_group_id', currentGroupId)
  .order('module.sort_order');

// Renderizar menu dinamicamente
{enabledModules.map(({ module }) => (
  <MenuItem
    key={module.name}
    icon={module.icon}
    label={module.display_name}
    href={`/${module.name}`}
  />
))}
```

**Exemplo de saída:**

```jsx
// Grupo com Power BI e WhatsApp habilitados:
<nav>
  <MenuItem icon="BarChart3" label="Power BI" href="/powerbi" />
  <MenuItem icon="MessageCircle" label="WhatsApp" href="/whatsapp" />
</nav>

// Grupo com todos módulos:
<nav>
  <MenuItem icon="BarChart3" label="Power BI" href="/powerbi" />
  <MenuItem icon="MessageCircle" label="WhatsApp" href="/whatsapp" />
  <MenuItem icon="Bell" label="Alertas" href="/alertas" />
  <MenuItem icon="Bot" label="Inteligência Artificial" href="/ia" />
</nav>
```

#### 2. Proteção de Rotas

```typescript
// middleware.ts ou na página

async function checkModuleAccess(
  userId: string,
  moduleName: string
): Promise<boolean> {
  
  // 1. Buscar grupo do usuário
  const { data: membership } = await supabase
    .from('user_group_memberships')
    .select('company_group_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  
  if (!membership) return false;
  
  // 2. Verificar se módulo está habilitado
  const { data: moduleAccess } = await supabase
    .from('module_groups')
    .select('id')
    .eq('company_group_id', membership.company_group_id)
    .eq('module_id', (
      await supabase
        .from('modules')
        .select('id')
        .eq('name', moduleName)
        .single()
    ).data.id)
    .maybeSingle();
  
  return !!moduleAccess;
}

// Uso na página:
export default async function AlertasPage() {
  const user = await getAuthUser();
  
  // Verificar acesso ao módulo
  const hasAccess = await checkModuleAccess(user.id, 'alertas');
  
  if (!hasAccess) {
    return <ErrorPage message="Módulo não habilitado para seu grupo" />;
  }
  
  // Renderizar página normalmente
  return <AlertasList />;
}
```

#### 3. APIs com Validação de Módulo

```typescript
// app/api/alertas/route.ts

export async function GET(request: Request) {
  const user = await getAuthUser();
  
  // Validar módulo habilitado
  const hasModule = await checkModuleAccess(user.id, 'alertas');
  
  if (!hasModule) {
    return NextResponse.json(
      { error: 'Módulo Alertas não habilitado' },
      { status: 403 }
    );
  }
  
  // Continuar com a lógica...
}
```

---

## 📦 Planos e Licenciamento

### Arquitetura de Planos

```
┌──────────────────────────────────────────────┐
│         Tabela: powerbi_plans                 │
├──────────────────────────────────────────────┤
│  id, name, description,                      │
│  max_daily_refreshes,                        │
│  max_powerbi_screens,                        │
│  max_users,                                  │
│  max_companies,                              │
│  is_active, display_order                    │
└──────────────────────────────────────────────┘
                    ↓ (1:N)
┌──────────────────────────────────────────────┐
│        Tabela: company_groups                 │
├──────────────────────────────────────────────┤
│  id, name, plan_id,                          │
│  max_users (pode ser customizado),           │
│  max_companies (pode ser customizado)        │
└──────────────────────────────────────────────┘
```

### Tabela `powerbi_plans`

```sql
CREATE TABLE powerbi_plans (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Limites de recursos
  max_daily_refreshes INTEGER NOT NULL DEFAULT 1,
  max_powerbi_screens INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_companies INTEGER NOT NULL DEFAULT 2,
  
  -- Status e apresentação
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_powerbi_plans_display_order ON powerbi_plans(display_order);
CREATE INDEX idx_powerbi_plans_is_active ON powerbi_plans(is_active);
```

**Campos explicados:**

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `name` | Nome do plano | "Plano Básico" |
| `description` | Descrição comercial | "Ideal para pequenas empresas" |
| `max_daily_refreshes` | Atualizações Power BI por dia | 5 |
| `max_powerbi_screens` | Número máximo de telas/dashboards | 3 |
| `max_users` | Usuários simultâneos | 10 |
| `max_companies` | Empresas por grupo | 2 |
| `is_active` | Plano disponível para venda? | true |
| `display_order` | Ordem de exibição | 1, 2, 3 |

### Relação com `company_groups`

```sql
ALTER TABLE company_groups 
ADD COLUMN plan_id UUID REFERENCES powerbi_plans(id);

-- Índice
CREATE INDEX idx_company_groups_plan_id ON company_groups(plan_id);
```

**Customização de limites:**

Os grupos herdam limites do plano, mas podem ser **customizados**:

```sql
-- Grupo herda limites do plano
SELECT 
  cg.name as grupo,
  pp.name as plano,
  cg.max_users,  -- Pode ser diferente do plano
  pp.max_users as plano_max_users
FROM company_groups cg
JOIN powerbi_plans pp ON cg.plan_id = pp.id;
```

---

### Planos Padrão do Sistema

#### 📦 Plano Básico

```yaml
Nome: Plano Básico
Descrição: Ideal para pequenas empresas iniciantes
Preço Sugerido: R$ 199/mês

Limites:
  max_daily_refreshes: 5
  max_powerbi_screens: 3
  max_users: 5
  max_companies: 1

Módulos Sugeridos:
  ✅ Power BI
  ✅ WhatsApp
  ❌ Alertas
  ❌ IA

Perfil de Cliente:
  - Pequenas empresas
  - 1 a 5 funcionários
  - Poucos dashboards
  - Uso básico

Casos de Uso:
  - Acompanhar vendas diárias
  - Relatórios simples
  - Notificações WhatsApp manuais
```

**SQL de criação:**
```sql
INSERT INTO powerbi_plans (
  name,
  description,
  max_daily_refreshes,
  max_powerbi_screens,
  max_users,
  max_companies,
  display_order,
  is_active
) VALUES (
  'Plano Básico',
  'Ideal para pequenas empresas',
  5,
  3,
  5,
  1,
  1,
  true
);
```

---

#### 📦 Plano Profissional

```yaml
Nome: Plano Profissional
Descrição: Para empresas em crescimento
Preço Sugerido: R$ 499/mês

Limites:
  max_daily_refreshes: 20
  max_powerbi_screens: 10
  max_users: 20
  max_companies: 5

Módulos Sugeridos:
  ✅ Power BI
  ✅ WhatsApp
  ✅ Alertas
  ❌ IA

Perfil de Cliente:
  - Médias empresas
  - 10 a 20 funcionários
  - Múltiplos dashboards
  - Automação de alertas

Casos de Uso:
  - Dashboards por departamento
  - Alertas automáticos
  - Relatórios programados
  - Múltiplas filiais
```

**SQL de criação:**
```sql
INSERT INTO powerbi_plans (
  name,
  description,
  max_daily_refreshes,
  max_powerbi_screens,
  max_users,
  max_companies,
  display_order,
  is_active
) VALUES (
  'Plano Profissional',
  'Para empresas em crescimento',
  20,
  10,
  20,
  5,
  2,
  true
);
```

---

#### 📦 Plano Enterprise

```yaml
Nome: Plano Enterprise
Descrição: Recursos ilimitados para grandes empresas
Preço Sugerido: R$ 999/mês ou customizado

Limites:
  max_daily_refreshes: 999 (ilimitado)
  max_powerbi_screens: 999 (ilimitado)
  max_users: 999 (ilimitado)
  max_companies: 999 (ilimitado)

Módulos Sugeridos:
  ✅ Power BI
  ✅ WhatsApp
  ✅ Alertas
  ✅ IA

Perfil de Cliente:
  - Grandes empresas
  - 50+ funcionários
  - Dezenas de dashboards
  - Uso intensivo de IA

Casos de Uso:
  - Centenas de dashboards
  - Alertas complexos
  - IA para análise avançada
  - Múltiplas empresas/grupos
  - Suporte prioritário
```

**SQL de criação:**
```sql
INSERT INTO powerbi_plans (
  name,
  description,
  max_daily_refreshes,
  max_powerbi_screens,
  max_users,
  max_companies,
  display_order,
  is_active
) VALUES (
  'Plano Enterprise',
  'Recursos ilimitados',
  999,
  999,
  999,
  999,
  3,
  true
);
```

---

### Tabela Comparativa de Planos

| Recurso | Básico | Profissional | Enterprise |
|---------|--------|--------------|------------|
| **Preço/mês** | R$ 199 | R$ 499 | R$ 999+ |
| **Atualizações/dia** | 5 | 20 | Ilimitado |
| **Telas Power BI** | 3 | 10 | Ilimitado |
| **Usuários** | 5 | 20 | Ilimitado |
| **Empresas** | 1 | 5 | Ilimitado |
| **Power BI** | ✅ | ✅ | ✅ |
| **WhatsApp** | ✅ | ✅ | ✅ |
| **Alertas** | ❌ | ✅ | ✅ |
| **IA** | ❌ | ❌ | ✅ |
| **Suporte** | Email | Email + Chat | Prioritário |
| **SLA** | 48h | 24h | 4h |

---

### Aplicação de Limites

#### Validação antes de Criar Recurso

```typescript
// Verificar se pode criar nova tela
async function canCreateScreen(groupId: string): Promise<{
  allowed: boolean;
  current: number;
  max: number;
  message?: string;
}> {
  
  // 1. Buscar plano do grupo
  const { data: group } = await supabase
    .from('company_groups')
    .select('plan_id, max_powerbi_screens')
    .eq('id', groupId)
    .single();
  
  // 2. Buscar limites (pode estar customizado no grupo)
  const maxScreens = group.max_powerbi_screens;
  
  // 3. Contar telas existentes
  const { count: currentScreens } = await supabase
    .from('powerbi_screens')
    .select('*', { count: 'exact', head: true })
    .eq('company_group_id', groupId);
  
  // 4. Verificar
  if (currentScreens >= maxScreens) {
    return {
      allowed: false,
      current: currentScreens,
      max: maxScreens,
      message: `Limite de ${maxScreens} telas atingido. Faça upgrade do plano.`
    };
  }
  
  return {
    allowed: true,
    current: currentScreens,
    max: maxScreens
  };
}

// Uso na API
export async function POST(request: Request) {
  const body = await request.json();
  
  // Verificar limite
  const check = await canCreateScreen(body.company_group_id);
  
  if (!check.allowed) {
    return NextResponse.json({
      error: check.message,
      current: check.current,
      max: check.max,
      upgrade_url: '/configuracoes/planos'
    }, { status: 402 }); // 402 Payment Required
  }
  
  // Criar tela...
}
```

#### Validação de Usuários

```typescript
async function canAddUser(groupId: string): Promise<boolean> {
  const { data: group } = await supabase
    .from('company_groups')
    .select('max_users')
    .eq('id', groupId)
    .single();
  
  const { count: currentUsers } = await supabase
    .from('user_group_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('company_group_id', groupId)
    .eq('is_active', true);
  
  return currentUsers < group.max_users;
}
```

#### Validação de Atualizações Diárias

```typescript
async function canRefreshDataset(groupId: string): Promise<boolean> {
  // 1. Buscar limite
  const { data: group } = await supabase
    .from('company_groups')
    .select(`
      plan:powerbi_plans!inner(max_daily_refreshes)
    `)
    .eq('id', groupId)
    .single();
  
  const maxRefreshes = group.plan.max_daily_refreshes;
  
  // 2. Contar atualizações hoje
  const today = new Date().toISOString().split('T')[0];
  
  const { count: todayRefreshes } = await supabase
    .from('powerbi_refresh_log')
    .select('*', { count: 'exact', head: true })
    .eq('company_group_id', groupId)
    .gte('executed_at', `${today}T00:00:00`)
    .lt('executed_at', `${today}T23:59:59`);
  
  return todayRefreshes < maxRefreshes;
}
```

---

## 🔗 Integração Módulos ↔ Planos

### Cenários de Combinação

#### Cenário 1: Plano Básico com Módulos Limitados

```
🏢 Padaria Pão Quente
    │
    ├─ 📦 Plano: Básico
    │   ├─ 5 usuários máx
    │   ├─ 3 telas máx
    │   └─ 5 atualizações/dia
    │
    └─ 🧩 Módulos: Power BI, WhatsApp
        │
        ├─ ✅ Pode:
        │   ├─ Ver 3 dashboards
        │   ├─ Enviar mensagens WhatsApp
        │   └─ 5 usuários ativos
        │
        └─ ❌ Não pode:
            ├─ Criar alertas (módulo desabilitado)
            ├─ Usar IA (módulo desabilitado)
            └─ Adicionar 6º usuário (limite do plano)
```

#### Cenário 2: Plano Profissional com Todos Módulos

```
🏢 Rede de Supermercados ABC
    │
    ├─ 📦 Plano: Profissional
    │   ├─ 20 usuários máx
    │   ├─ 10 telas máx
    │   └─ 20 atualizações/dia
    │
    └─ 🧩 Módulos: Power BI, WhatsApp, Alertas, IA
        │
        ├─ ✅ Pode:
        │   ├─ 10 dashboards
        │   ├─ Criar até 100 alertas
        │   ├─ Usar IA para gerar DAX
        │   ├─ Chat IA com dados
        │   └─ 20 usuários
        │
        └─ ⚠️ Atenção:
            └─ IA tem custo adicional por uso
```

#### Cenário 3: Plano Enterprise Customizado

```
🏢 Holding Empresarial XYZ
    │
    ├─ 📦 Plano: Enterprise (Customizado)
    │   ├─ 50 usuários (customizado de 999)
    │   ├─ 30 telas (customizado de 999)
    │   └─ Ilimitado atualizações
    │
    └─ 🧩 Módulos: Apenas Power BI e Alertas
        │
        └─ 📝 Observação:
            Mesmo com plano Enterprise, desabilitou
            WhatsApp e IA por não usar
```

---

## 🔌 APIs de Gestão

### APIs de Módulos

#### `GET /api/modules`
Lista todos os módulos disponíveis no sistema.

**Response:**
```json
{
  "modules": [
    {
      "id": "uuid",
      "name": "powerbi",
      "display_name": "Power BI",
      "description": "Dashboards e relatórios...",
      "icon": "BarChart3",
      "is_enabled": true,
      "sort_order": 1
    }
  ]
}
```

---

#### `GET /api/modules/group/:groupId`
Lista módulos habilitados para um grupo específico.

**Response:**
```json
{
  "enabled_modules": [
    {
      "module_id": "uuid",
      "name": "powerbi",
      "display_name": "Power BI",
      "enabled_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/modules/group/:groupId/toggle`
Habilita ou desabilita um módulo para um grupo.

**Request:**
```json
{
  "module_id": "uuid-do-modulo",
  "enabled": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Módulo Power BI habilitado para o grupo"
}
```

**Código de implementação:**
```typescript
export async function POST(
  request: Request,
  { params }: { params: { groupId: string } }
) {
  const user = await getAuthUser();
  
  // Apenas master ou admin do grupo
  if (!user.is_master) {
    const isAdmin = await checkRole(user.id, params.groupId, 'admin');
    if (!isAdmin) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
  }
  
  const { module_id, enabled } = await request.json();
  
  if (enabled) {
    // Habilitar
    await supabase
      .from('module_groups')
      .insert({
        module_id,
        company_group_id: params.groupId
      });
  } else {
    // Desabilitar
    await supabase
      .from('module_groups')
      .delete()
      .eq('module_id', module_id)
      .eq('company_group_id', params.groupId);
  }
  
  return NextResponse.json({ success: true });
}
```

---

### APIs de Planos

#### `GET /api/plans`
Lista todos os planos disponíveis.

**Response:**
```json
{
  "plans": [
    {
      "id": "uuid",
      "name": "Plano Básico",
      "description": "Ideal para pequenas empresas",
      "max_daily_refreshes": 5,
      "max_powerbi_screens": 3,
      "max_users": 5,
      "max_companies": 1,
      "is_active": true,
      "display_order": 1
    }
  ]
}
```

---

#### `POST /api/plans`
Cria um novo plano (apenas Master).

**Request:**
```json
{
  "name": "Plano Startup",
  "description": "Para startups",
  "max_daily_refreshes": 10,
  "max_powerbi_screens": 5,
  "max_users": 10,
  "max_companies": 2,
  "display_order": 2
}
```

---

#### `PUT /api/plans/:id`
Atualiza um plano existente.

---

#### `POST /api/company-groups/:id/change-plan`
Altera o plano de um grupo.

**Request:**
```json
{
  "new_plan_id": "uuid-plano-profissional"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Plano alterado para Profissional",
  "old_plan": "Plano Básico",
  "new_plan": "Plano Profissional",
  "new_limits": {
    "max_users": 20,
    "max_powerbi_screens": 10,
    "max_daily_refreshes": 20
  }
}
```

---

#### `GET /api/company-groups/:id/usage`
Retorna uso atual vs limites do plano.

**Response:**
```json
{
  "plan": {
    "name": "Plano Profissional",
    "limits": {
      "max_users": 20,
      "max_powerbi_screens": 10,
      "max_daily_refreshes": 20
    }
  },
  "usage": {
    "users": {
      "current": 12,
      "max": 20,
      "percentage": 60
    },
    "screens": {
      "current": 7,
      "max": 10,
      "percentage": 70
    },
    "refreshes_today": {
      "current": 15,
      "max": 20,
      "percentage": 75
    }
  },
  "warnings": [
    "Você está usando 70% das telas disponíveis"
  ]
}
```

---

## 💡 Casos de Uso Práticos

### Caso 1: Onboarding de Novo Cliente

```
1️⃣ MASTER CRIA GRUPO
   POST /api/company-groups
   {
     "name": "Empresa Nova Ltda",
     "plan_id": "uuid-plano-profissional"
   }

2️⃣ MASTER HABILITA MÓDULOS INICIAIS
   POST /api/modules/group/:groupId/toggle
   { "module_id": "uuid-powerbi", "enabled": true }
   
   POST /api/modules/group/:groupId/toggle
   { "module_id": "uuid-whatsapp", "enabled": true }

3️⃣ MASTER CRIA ADMIN DO GRUPO
   POST /api/user
   {
     "email": "admin@empresanova.com",
     "full_name": "João Admin",
     "company_group_id": "uuid-grupo",
     "role": "admin"
   }

4️⃣ ADMIN DO GRUPO CONFIGURA
   - Adiciona outros usuários
   - Configura conexão Power BI
   - Cadastra telas
   - Configura WhatsApp

5️⃣ CLIENTE COMEÇA A USAR
   - Usuários acessam dashboards
   - Limite de 10 telas aplicado
   - Máximo 20 usuários
```

---

### Caso 2: Cliente Quer Adicionar Módulo IA

```
📧 CLIENTE SOLICITA
   "Quero usar o chat IA com meus dados"

1️⃣ VERIFICAR PLANO ATUAL
   GET /api/company-groups/:id
   → Plano: Profissional
   → Módulos: Power BI, WhatsApp, Alertas

2️⃣ VERIFICAR SE PLANO SUPORTA IA
   → Profissional não inclui IA por padrão
   → IA disponível apenas no Enterprise

3️⃣ DUAS OPÇÕES:
   
   Opção A: Fazer Upgrade
   ────────────────────
   PUT /api/company-groups/:id
   { "plan_id": "uuid-enterprise" }
   
   POST /api/modules/group/:id/toggle
   { "module_id": "uuid-ia", "enabled": true }
   
   Opção B: Adicionar IA ao Plano Atual (custom)
   ──────────────────────────────────────────────
   Negociar valor adicional (ex: +R$ 200/mês)
   
   POST /api/modules/group/:id/toggle
   { "module_id": "uuid-ia", "enabled": true }
   
   Adicionar nota: "IA contratada separadamente"

4️⃣ CLIENTE ACESSA IA
   - Menu exibe "Inteligência Artificial"
   - Botão IA aparece nas telas Power BI
   - Pode gerar DAX com IA
```

---

### Caso 3: Limite de Telas Atingido

```
⚠️ ADMIN TENTA CRIAR 11ª TELA
   POST /api/powerbi/screens
   {
     "name": "Dashboard de Logística"
   }

❌ SISTEMA RETORNA ERRO
   {
     "error": "Limite de telas atingido",
     "current": 10,
     "max": 10,
     "message": "Você atingiu o limite de 10 telas do Plano Profissional",
     "upgrade": {
       "suggestion": "Plano Enterprise",
       "new_limit": "Ilimitado",
       "url": "/configuracoes/planos"
     }
   }

💡 SOLUÇÕES:
   
   1. Deletar tela antiga
      DELETE /api/powerbi/screens/:id
   
   2. Fazer upgrade
      PUT /api/company-groups/:id
      { "plan_id": "uuid-enterprise" }
   
   3. Customizar limite (negociação)
      PUT /api/company-groups/:id
      { "max_powerbi_screens": 15 }
      (sem mudar plano, cobrar diferença)
```

---

### Caso 4: Múltiplos Grupos, Planos Diferentes

```
👤 MASTER gerencia 3 clientes:

🏢 Cliente A - Padaria
   ├─ Plano: Básico (R$ 199/mês)
   ├─ Módulos: Power BI, WhatsApp
   ├─ Limites: 3 telas, 5 usuários
   └─ Uso: 2 telas, 3 usuários

🏢 Cliente B - Rede Supermercados
   ├─ Plano: Profissional (R$ 499/mês)
   ├─ Módulos: Power BI, WhatsApp, Alertas
   ├─ Limites: 10 telas, 20 usuários
   └─ Uso: 8 telas, 15 usuários

🏢 Cliente C - Holding
   ├─ Plano: Enterprise (R$ 999/mês)
   ├─ Módulos: Todos
   ├─ Limites: Ilimitado
   └─ Uso: 45 telas, 78 usuários

📊 DASHBOARD DO MASTER
   GET /api/master/overview
   
   {
     "total_groups": 3,
     "total_revenue": 1697,
     "groups": [
       {
         "name": "Padaria",
         "plan": "Básico",
         "revenue": 199,
         "usage": {
           "screens": "2/3",
           "users": "3/5"
         }
       },
       ...
     ]
   }
```

---

## 🔄 Migração e Upgrade

### Upgrade de Plano

```typescript
async function upgradePlan(
  groupId: string,
  newPlanId: string
): Promise<{
  success: boolean;
  changes: any;
}> {
  
  // 1. Buscar plano atual
  const { data: group } = await supabase
    .from('company_groups')
    .select(`
      current_plan:powerbi_plans!plan_id(*)
    `)
    .eq('id', groupId)
    .single();
  
  // 2. Buscar novo plano
  const { data: newPlan } = await supabase
    .from('powerbi_plans')
    .select('*')
    .eq('id', newPlanId)
    .single();
  
  // 3. Validar upgrade (não pode fazer downgrade acidentalmente)
  if (newPlan.max_users < group.current_plan.max_users) {
    throw new Error('Não é possível reduzir limites em upgrade');
  }
  
  // 4. Atualizar grupo
  await supabase
    .from('company_groups')
    .update({
      plan_id: newPlanId,
      max_users: newPlan.max_users,
      max_companies: newPlan.max_companies,
      // max_powerbi_screens é implícito do plano
    })
    .eq('id', groupId);
  
  // 5. Registrar log
  await supabase
    .from('activity_logs')
    .insert({
      company_group_id: groupId,
      action_type: 'plan_upgrade',
      description: `Upgrade: ${group.current_plan.name} → ${newPlan.name}`,
      metadata: {
        old_plan: group.current_plan.name,
        new_plan: newPlan.name,
        old_limits: group.current_plan,
        new_limits: newPlan
      }
    });
  
  // 6. Retornar mudanças
  return {
    success: true,
    changes: {
      from: group.current_plan.name,
      to: newPlan.name,
      limits: {
        users: `${group.current_plan.max_users} → ${newPlan.max_users}`,
        screens: `${group.current_plan.max_powerbi_screens} → ${newPlan.max_powerbi_screens}`,
        refreshes: `${group.current_plan.max_daily_refreshes} → ${newPlan.max_daily_refreshes}`
      }
    }
  };
}
```

### Downgrade de Plano

```typescript
async function downgradePlan(
  groupId: string,
  newPlanId: string
): Promise<{
  allowed: boolean;
  issues?: string[];
}> {
  
  // 1. Verificar uso atual
  const usage = await checkCurrentUsage(groupId);
  
  // 2. Buscar limites do novo plano
  const { data: newPlan } = await supabase
    .from('powerbi_plans')
    .select('*')
    .eq('id', newPlanId)
    .single();
  
  // 3. Validar se downgrade é possível
  const issues: string[] = [];
  
  if (usage.users > newPlan.max_users) {
    issues.push(
      `Você tem ${usage.users} usuários, mas novo plano limita a ${newPlan.max_users}. ` +
      `Remova ${usage.users - newPlan.max_users} usuários primeiro.`
    );
  }
  
  if (usage.screens > newPlan.max_powerbi_screens) {
    issues.push(
      `Você tem ${usage.screens} telas, mas novo plano limita a ${newPlan.max_powerbi_screens}. ` +
      `Remova ${usage.screens - newPlan.max_powerbi_screens} telas primeiro.`
    );
  }
  
  // 4. Se houver problemas, não permite
  if (issues.length > 0) {
    return {
      allowed: false,
      issues
    };
  }
  
  // 5. Se OK, fazer downgrade
  await supabase
    .from('company_groups')
    .update({ plan_id: newPlanId })
    .eq('id', groupId);
  
  return { allowed: true };
}
```

---

## 📊 Monitoramento e Limites

### Dashboard de Uso

```typescript
async function getUsageDashboard(groupId: string) {
  // Buscar plano
  const { data: group } = await supabase
    .from('company_groups')
    .select(`
      plan:powerbi_plans!inner(*)
    `)
    .eq('id', groupId)
    .single();
  
  // Contar recursos
  const [users, screens, alerts, todayRefreshes] = await Promise.all([
    supabase
      .from('user_group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .eq('is_active', true),
    
    supabase
      .from('powerbi_screens')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId),
    
    supabase
      .from('alertas')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId),
    
    supabase
      .from('powerbi_refresh_log')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .gte('executed_at', new Date().toISOString().split('T')[0])
  ]);
  
  return {
    plan: {
      name: group.plan.name,
      limits: {
        max_users: group.plan.max_users,
        max_screens: group.plan.max_powerbi_screens,
        max_refreshes_daily: group.plan.max_daily_refreshes
      }
    },
    usage: {
      users: {
        current: users.count,
        max: group.plan.max_users,
        percentage: (users.count / group.plan.max_users) * 100,
        status: users.count >= group.plan.max_users ? 'critical' : 
                users.count >= group.plan.max_users * 0.8 ? 'warning' : 'ok'
      },
      screens: {
        current: screens.count,
        max: group.plan.max_powerbi_screens,
        percentage: (screens.count / group.plan.max_powerbi_screens) * 100,
        status: screens.count >= group.plan.max_powerbi_screens ? 'critical' : 
                screens.count >= group.plan.max_powerbi_screens * 0.8 ? 'warning' : 'ok'
      },
      refreshes: {
        current: todayRefreshes.count,
        max: group.plan.max_daily_refreshes,
        percentage: (todayRefreshes.count / group.plan.max_daily_refreshes) * 100,
        status: todayRefreshes.count >= group.plan.max_daily_refreshes ? 'critical' : 
                todayRefreshes.count >= group.plan.max_daily_refreshes * 0.8 ? 'warning' : 'ok'
      }
    },
    recommendations: []
  };
}
```

**Exemplo de saída:**
```json
{
  "plan": {
    "name": "Plano Profissional",
    "limits": {
      "max_users": 20,
      "max_screens": 10,
      "max_refreshes_daily": 20
    }
  },
  "usage": {
    "users": {
      "current": 15,
      "max": 20,
      "percentage": 75,
      "status": "ok"
    },
    "screens": {
      "current": 9,
      "max": 10,
      "percentage": 90,
      "status": "warning"
    },
    "refreshes": {
      "current": 18,
      "max": 20,
      "percentage": 90,
      "status": "warning"
    }
  },
  "recommendations": [
    "Você está usando 90% das telas. Considere upgrade para Plano Enterprise.",
    "Você está usando 90% das atualizações diárias."
  ]
}
```

---

## 📌 Resumo Visual

```
┌────────────────────────────────────────────────────┐
│          MÓDULOS vs PLANOS                          │
├────────────────────────────────────────────────────┤
│                                                     │
│  🧩 MÓDULOS (O QUE você pode usar)                │
│  ├─ Power BI: Dashboards                          │
│  ├─ WhatsApp: Mensagens                           │
│  ├─ Alertas: Monitoramento                        │
│  └─ IA: Análise inteligente                       │
│                                                     │
│  📦 PLANOS (QUANTO você pode usar)                │
│  ├─ Básico: Limites baixos                        │
│  ├─ Profissional: Limites médios                  │
│  └─ Enterprise: Ilimitado                         │
│                                                     │
│  🔗 JUNTOS DEFINEM A EXPERIÊNCIA                  │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

**Documentação criada em:** Janeiro 2024  
**Versão:** 1.0.0  
**Última atualização:** 09/01/2026
