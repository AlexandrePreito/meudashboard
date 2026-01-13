# 🚀 Guia Rápido - MeuDashboard

## 📌 Índice Rápido

- [Conceitos Fundamentais](#conceitos-fundamentais)
- [Fluxo de Autenticação](#fluxo-de-autenticação)
- [Hierarquia de Usuários](#hierarquia-de-usuários)
- [Como Funciona um Alerta](#como-funciona-um-alerta)
- [Casos de Uso Comuns](#casos-de-uso-comuns)

---

## 🎯 Conceitos Fundamentais

### O que é o MeuDashboard?

É uma **plataforma SaaS multi-tenant** que integra:
- **Power BI** para visualização de dados
- **WhatsApp** para comunicação
- **Alertas Inteligentes** para monitoramento
- **IA Contextual** para análise de dados

### Estrutura Básica

```
┌─────────────────────────────────────────┐
│           MEUDASHBOARD                   │
├─────────────────────────────────────────┤
│                                          │
│  👥 GRUPOS (Multi-tenant)                │
│  ├─ 🏢 Empresa A                         │
│  │   ├─ 👤 Usuários                     │
│  │   ├─ 📊 Dashboards Power BI          │
│  │   ├─ 🔔 Alertas                      │
│  │   └─ 📱 WhatsApp                     │
│  │                                       │
│  └─ 🏢 Empresa B                         │
│      ├─ 👤 Usuários                     │
│      └─ ...                              │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🔐 Fluxo de Autenticação

### Login Único (Single Session)

O sistema permite **apenas uma sessão ativa por usuário**. Se você fizer login em outro dispositivo, a sessão anterior é automaticamente desconectada.

### Como Funciona?

```
1. Usuário → Email + Senha
   ↓
2. Sistema → Valida credenciais (bcrypt)
   ↓
3. Sistema → Gera session_id único
   ↓
4. Banco → Salva session_id no usuário
   ↓
5. Sistema → Cria JWT com session_id
   ↓
6. Cookie → Armazena JWT (HTTP-Only, 7 dias)
   ↓
7. Toda requisição → Valida JWT + session_id
```

### Validação de Sessão

```
Requisição → Cookie auth_token
    ↓
Middleware → Valida JWT
    ↓
getAuthUser() → Busca usuário no banco
    ↓
Compara session_id do JWT com session_id do banco
    ↓
✅ Iguais: Acesso permitido
❌ Diferentes: Sessão invalidada (outro login)
```

---

## 👥 Hierarquia de Usuários

### Estrutura Completa

```
📦 PLANO (Plan)
    │
    ├─ Define limites:
    │  ├─ Máx. usuários
    │  ├─ Máx. telas Power BI
    │  ├─ Máx. empresas
    │  └─ Máx. atualizações/dia
    │
    ↓
🏢 GRUPO DE EMPRESAS (Company Group)
    │
    ├─ Tem um plano associado
    ├─ Módulos habilitados
    ├─ Usuários membros
    │
    ↓
👤 USUÁRIO (User)
    │
    ├─ Pode estar em vários grupos
    ├─ Tem role em cada grupo
    │
    ↓
🎭 ROLE (Papel no grupo)
    │
    ├─ admin: Gerencia tudo no grupo
    ├─ manager: Cria alertas, dashboards
    ├─ operator: Executa alertas
    └─ viewer: Apenas visualiza
```

### Exemplo Prático

```
👤 João Silva (joão@empresa.com)
    │
    ├─ 🏢 Grupo: Empresa XYZ
    │   └─ Role: admin
    │       ├─ ✅ Pode gerenciar usuários
    │       ├─ ✅ Pode criar alertas
    │       ├─ ✅ Pode configurar WhatsApp
    │       └─ ✅ Pode ver todos os dashboards
    │
    └─ 🏢 Grupo: Empresa ABC
        └─ Role: viewer
            ├─ ❌ Não pode gerenciar
            ├─ ❌ Não pode criar alertas
            └─ ✅ Pode apenas ver dashboards
```

### Usuário Master

```
👑 MASTER (Super Admin)
    │
    ├─ is_master: true
    ├─ Não está vinculado a grupos
    ├─ Acesso total ao sistema
    │
    └─ Pode:
        ├─ Gerenciar todos os grupos
        ├─ Criar/editar planos
        ├─ Habilitar/desabilitar módulos
        └─ Ver logs de todo o sistema
```

---

## 🔔 Como Funciona um Alerta

### Fluxo Completo

```
1️⃣ CONFIGURAÇÃO
   ┌────────────────────────────────┐
   │ • Nome: "Vendas Diárias"       │
   │ • DAX: EVALUATE ROW(...)       │
   │ • Condição: maior que 10.000   │
   │ • Horário: 08:00, 18:00        │
   │ • WhatsApp: 5562982289559      │
   └────────────────────────────────┘
           ↓
2️⃣ EXECUÇÃO (CRON - A cada hora)
   ┌────────────────────────────────┐
   │ Vercel Cron → /api/alertas/cron│
   │                                 │
   │ Para cada alerta ativo:         │
   │ ├─ Verifica horário             │
   │ ├─ Executa DAX no Power BI     │
   │ ├─ Avalia condição              │
   │ └─ Se atende condição...        │
   └────────────────────────────────┘
           ↓
3️⃣ FORMATAÇÃO
   ┌────────────────────────────────┐
   │ DAX retorna:                    │
   │ [{ "Valor": 15000 }]           │
   │                                 │
   │ Formata como:                   │
   │ R$ 15.000,00                   │
   │                                 │
   │ Substitui variáveis:            │
   │ {{valor}} → R$ 15.000,00       │
   │ {{data}} → 09/01/2024          │
   │ {{hora}} → 08:00               │
   └────────────────────────────────┘
           ↓
4️⃣ ENVIO
   ┌────────────────────────────────┐
   │ Evolution API                   │
   │ ├─ POST /message/sendText      │
   │ ├─ Body: {                     │
   │ │   "number": "5562982289559", │
   │ │   "text": "📊 *Vendas...*" │
   │ │ }                            │
   │ └─ WhatsApp recebe mensagem    │
   └────────────────────────────────┘
           ↓
5️⃣ REGISTRO
   ┌────────────────────────────────┐
   │ Salva em alerta_historico:     │
   │ ├─ executed_at: 08:00          │
   │ ├─ status: success             │
   │ ├─ dax_result: {...}           │
   │ └─ message_sent: true          │
   └────────────────────────────────┘
```

### Tipos de Alerta

| Tipo | Quando Usar | Exemplo |
|------|-------------|---------|
| **threshold** | Monitorar se valor ultrapassa limite | "Alertar se vendas > R$ 10.000" |
| **scheduled_report** | Enviar relatório em horários fixos | "Enviar vendas às 8h e 18h" |
| **anomaly** | Detectar valores anormais | "Alertar se vendas muito diferentes da média" |
| **goal** | Acompanhar metas | "Alertar quando atingir 80% da meta" |
| **comparison** | Comparar períodos | "Alertar se vendas hoje < ontem" |

### Formatação de Múltiplas Linhas

Quando a DAX retorna uma tabela:

**DAX:**
```dax
EVALUATE
ADDCOLUMNS(
    VALUES(Empresa[Filial]),
    "Valor", [QA_Faturamento]
)
```

**Resultado:**
```
Centro: R$ 31.107,46
Sul: R$ 13.323,70
Norte: R$ 10.771,12
```

**Se houver linha "TOTAL":**
```
Centro: R$ 31.107,46
Sul: R$ 13.323,70
━━━━━━━━━━━━━━
*TOTAL*: R$ 41.878,58
```

---

## 💡 Casos de Uso Comuns

### 1. Criar um Alerta de Vendas Diárias

**Objetivo:** Receber vendas por filial todo dia às 8h

**Passos:**

1. **Acessar:** `/alertas/novo`

2. **Aba Geral:**
   - Nome: "Vendas Diárias por Filial"
   - Tipo: Relatório programado

3. **Aba Mensagem:**
   - Conexão: Selecione sua conexão Power BI
   - Dataset: Selecione seu dataset
   - Descrição IA: "Quero o faturamento por filial de ontem com total no final"
   - Clique: **Gerar com IA**
   
   ✨ A IA gera automaticamente:
   - Query DAX
   - Template da mensagem

4. **Aba Condição:**
   - Condição: sempre executar
   - (Ou configure limite se quiser alertar apenas acima de um valor)

5. **Aba Agendamento:**
   - Frequência: Diário
   - Horários: 08:00
   - Dias da semana: Segunda a Sexta

6. **WhatsApp:**
   - Marque: ✅ Notificar WhatsApp
   - Adicione números ou grupos

7. **Salvar**

**Resultado:**
Todo dia útil às 8h você recebe:

```
📊 Vendas Diárias por Filial

🏢 Resultado por Filial:

Centro: R$ 31.107,46
Sul: R$ 13.323,70
Norte: R$ 10.771,12
━━━━━━━━━━━━━━
*TOTAL*: R$ 55.652,28

📅 09/01/2024 às 08:00
```

---

### 2. Adicionar um Dashboard Power BI

**Objetivo:** Disponibilizar um relatório Power BI para usuários

**Passos:**

1. **Acessar:** `/powerbi/telas`

2. **Novo:**
   - Nome: "Dashboard de Vendas"
   - Conexão: Selecione conexão
   - Relatório: Selecione do Power BI
   - Ícone: Escolha um ícone
   - Página padrão: (opcional)

3. **Contexto IA (opcional):**
   - Acessar: `/powerbi/contextos`
   - Criar contexto com tabelas/medidas
   - Isso permite o chat IA funcionar nesta tela

4. **Acessar:**
   - Menu lateral → Dashboard de Vendas
   - Ou direto: `/tela/[id-da-tela]`

---

### 3. Configurar WhatsApp

**Objetivo:** Integrar Evolution API para enviar mensagens

**Passos:**

1. **Instância Evolution API:**
   - Acessar: `/whatsapp/instancias`
   - Adicionar: Nome, URL API, API Key
   - Testar conexão

2. **Grupos WhatsApp:**
   - Acessar: `/whatsapp/grupos`
   - Adicionar: Nome, Group ID
   - Group ID formato: `120363123456789@g.us`

3. **Números:**
   - Acessar: `/whatsapp/numeros`
   - Adicionar: Número, Nome de contato
   - Formato: `5562982289559`

4. **Usar em Alertas:**
   - Ao criar alerta, selecione números/grupos
   - Mensagens serão enviadas automaticamente

---

### 4. Gerenciar Usuários e Permissões

**Objetivo:** Adicionar usuário ao grupo com permissões específicas

**Passos:**

1. **Criar Usuário:**
   - Acessar: `/configuracoes` (como admin)
   - Usuários → Adicionar
   - Email, Nome, Senha

2. **Vincular ao Grupo:**
   - Selecionar grupo
   - Adicionar usuário
   - Escolher role:
     - **admin**: Gerencia tudo
     - **manager**: Cria alertas
     - **operator**: Executa
     - **viewer**: Apenas vê

3. **Módulos:**
   - Acessar: `/configuracoes/modulos`
   - Habilitar/desabilitar módulos para o grupo
   - Exemplo: Desabilitar IA se não usar

4. **Limites:**
   - Plano define limites automáticos
   - Para alterar: `/configuracoes/planos`

---

### 5. Usar IA para Gerar DAX

**Objetivo:** Criar query DAX sem conhecer a linguagem

**Passos:**

1. **Criar Contexto:**
   - Acessar: `/powerbi/contextos`
   - Selecionar: Conexão + Dataset
   - Gerar contexto automático (busca do Power BI)
   - Ou adicionar manualmente tabelas/medidas

2. **Criar Alerta:**
   - Acessar: `/alertas/novo`
   - Aba Mensagem
   - Campo "Descreva o que você precisa monitorar"

3. **Descrever em Português:**
   - "Vendas de ontem"
   - "Faturamento por filial dos últimos 7 dias"
   - "Top 10 clientes do mês"
   - "Ticket médio da semana"

4. **Gerar:**
   - Clique: **✨ Gerar com IA**
   - IA analisa contexto
   - Gera DAX + Template
   - Você pode editar se quiser

5. **Testar:**
   - Clique: **Testar** ao lado da query
   - Vê o resultado antes de salvar

---

### 6. Chat com IA sobre Dados

**Objetivo:** Fazer perguntas sobre dados de um dashboard

**Passos:**

1. **Pré-requisito:**
   - Tela precisa ter contexto IA configurado
   - Módulo IA habilitado no grupo

2. **Acessar Dashboard:**
   - Exemplo: `/tela/66c7ea7e-284e-4fdb-9d1c-5c0ad1e11830`

3. **Abrir Chat:**
   - Botão **✱** no canto superior direito

4. **Perguntar:**
   - "Qual foi o faturamento de ontem?"
   - "Qual filial vendeu mais?"
   - "Comparar vendas desta semana com semana passada"

5. **IA Responde:**
   - Analisa contexto da tela
   - Executa DAX se necessário
   - Responde com dados reais

---

## 🔧 Troubleshooting

### Alerta não dispara

**Verificar:**
1. ✅ Alerta está ativo?
2. ✅ Horário configurado correto?
3. ✅ Dias da semana corretos?
4. ✅ Conexão Power BI ativa?
5. ✅ Instância WhatsApp conectada?
6. ✅ Ver histórico: `/alertas/historico`

### Sessão desconectando sozinha

**Causa:** Outro dispositivo fez login com o mesmo usuário.

**Solução:** Sistema permite apenas 1 sessão ativa. Faça logout nos outros dispositivos.

### DAX com erro

**Solução:**
1. Testar DAX direto no Power BI Desktop
2. Verificar medidas existem no dataset
3. Verificar sintaxe (EVALUATE, vírgulas, colchetes)
4. Ver logs em `/alertas/historico`

### WhatsApp não envia

**Verificar:**
1. ✅ Evolution API está online?
2. ✅ Instance está conectada?
3. ✅ Número/Group ID correto?
4. ✅ API Key válida?
5. ✅ Ver logs da Evolution API

---

## 📞 Suporte

Para dúvidas ou problemas:
- **Documentação completa:** `DOCUMENTACAO_COMPLETA.md`
- **Logs:** `/configuracoes/logs`
- **Histórico de alertas:** `/alertas/historico`

---

**Última atualização:** Janeiro 2024
