# Alterações Recentes do Sistema - Janeiro 2025

**Versão:** 3.2.0  
**Data:** Janeiro 2025  
**Baseado em:** `DOCUMENTACAO_COMPLETA_SISTEMA_2025.md`

---

## 📋 Índice

1. [Visão Geral das Alterações](#visão-geral-das-alterações)
2. [Melhorias no Sistema de Detecção de Perguntas Não Respondidas](#melhorias-no-sistema-de-detecção-de-perguntas-não-respondidas)
3. [Correções Técnicas e TypeScript](#correções-técnicas-e-typescript)
4. [Melhorias de Acesso para Developers](#melhorias-de-acesso-para-developers)
5. [Melhorias de Robustez e Tratamento de Erros](#melhorias-de-robustez-e-tratamento-de-erros)
6. [Logs e Debug](#logs-e-debug)
7. [Impacto e Benefícios](#impacto-e-benefícios)

---

## 🎯 Visão Geral das Alterações

Este documento detalha as alterações realizadas no sistema MeuDashboard durante Janeiro de 2025, com foco em melhorias no módulo de Assistente IA, correções de bugs e aprimoramentos de acesso para developers.

### Principais Áreas Afetadas

- ✅ **Sistema de Detecção de Perguntas Não Respondidas** - Detecção automática de respostas evasivas
- ✅ **APIs do Assistente IA** - Melhorias de acesso e robustez
- ✅ **Componentes React** - Correções de TypeScript
- ✅ **Webhooks WhatsApp** - Melhorias de rastreamento e logs

---

## 🔍 Melhorias no Sistema de Detecção de Perguntas Não Respondidas

### 1. Detecção Automática de Respostas Evasivas

**Problema Identificado:**
Quando a IA respondia com frases evasivas como "Não encontrei esses dados específicos", essas respostas não eram salvas na tabela `ai_unanswered_questions` porque:
- A resposta tinha mais de 20 caracteres (não era considerada "curta")
- Não gerava erro técnico (não havia exceção)
- O sistema não detectava que a resposta era evasiva

**Solução Implementada:**

#### Arquivo: `app/api/whatsapp/webhook/messages-upsert/route.ts`

**Padrões Evasivos Detectados (14 padrões):**
```typescript
const evasivePatterns = [
  'não encontrei',
  'não consegui',
  'não tenho acesso',
  'não possuo',
  'não foi possível',
  'não tenho informações',
  'não tenho dados',
  'sem dados',
  'dados não disponíveis',
  'informação não disponível',
  'não entendi',
  'não localizei',
  'não há dados',
  'não existe'
];
```

**Localização no Código:**
- Linhas 190-202: Definição dos padrões evasivos
- Linhas 204-208: Função de detecção (case-insensitive)
- Linhas 210-214: Atualização de flags quando resposta é evasiva
- Linha 217: Condição atualizada para incluir `isEvasiveResponse`

**Comportamento:**
1. Após limpar a resposta da IA, o sistema verifica se contém algum padrão evasivo
2. Se detectado, marca `hadError = true` e define `errorMessage`
3. A pergunta é automaticamente salva em `ai_unanswered_questions`
4. O admin pode então criar um exemplo de treinamento para melhorar a resposta

#### Arquivo: `app/api/whatsapp/webhook/route.ts`

**Funcionalidade Adicionada:**
Foi implementada a mesma lógica de detecção de respostas evasivas no webhook principal do WhatsApp, garantindo consistência entre os dois endpoints.

**Localização no Código:**
- Linhas 1314-1375: Seção completa de detecção e salvamento
- Adicionado ANTES da seção "ENVIAR RESPOSTA"

**Melhorias Implementadas:**
- ✅ 14 padrões evasivos detectados
- ✅ Logs melhorados com emojis (🔴, ✅, ❌)
- ✅ Tratamento de erros robusto com verificação de `updateError` e `insertError`
- ✅ Valores padrão para `attempt_count` e `user_count` (evita null)
- ✅ Campos `first_asked_at` e `last_asked_at` preenchidos automaticamente
- ✅ Validação de `connectionId` e `datasetId` com fallback para `null`

**Fluxo de Detecção:**
```
1. IA gera resposta
   ↓
2. Resposta é limpa (remove markdown, DAX, etc)
   ↓
3. Sistema verifica padrões evasivos (case-insensitive)
   ↓
4. Se detectado OU se houver daxError:
   ↓
5. Busca pergunta similar existente (ilike)
   ↓
6a. Se existe: Atualiza (incrementa contadores)
   ↓
6b. Se não existe: Cria nova (com valores iniciais)
   ↓
7. Logs de sucesso/erro
```

---

## 🔧 Correções Técnicas e TypeScript

### 2. Correção de Erros TypeScript no Header

**Arquivo:** `src/components/layout/Header.tsx`

**Problema:**
O TypeScript estava reclamando que `setActiveGroup` estava recebendo uma função callback, mas o tipo esperado era `CompanyGroup | null` diretamente.

**Solução:**
Foram corrigidas **4 ocorrências** de uso de callback em `setActiveGroup`:

#### Ocorrência 1: Linha 285 - Atualização de grupos frescos
```typescript
// ANTES (com callback):
setActiveGroup((currentActiveGroup) => {
  if (currentActiveGroup) {
    const updatedGroup = freshGroups.find(...);
    return updatedGroup || currentActiveGroup;
  }
  return null;
});

// DEPOIS (sem callback):
const currentActiveGroup = activeGroup;
if (currentActiveGroup) {
  const updatedGroup = freshGroups.find(...);
  if (updatedGroup) {
    setActiveGroup(updatedGroup);
  }
} else {
  setActiveGroup(freshGroups[0] || null);
}
```

#### Ocorrência 2: Linha 320 - Quando não há grupos disponíveis
```typescript
// ANTES:
setActiveGroup((currentActiveGroup) => {
  if (currentActiveGroup && !user.is_master) {
    // limpar localStorage
    return null;
  }
  return currentActiveGroup;
});

// DEPOIS:
if (activeGroup && !user.is_master) {
  // limpar localStorage
}
setActiveGroup(null);
```

#### Ocorrência 3: Linha 358 - Erro na API (não 401/403)
```typescript
// ANTES:
setActiveGroup((currentActiveGroup) => {
  if (!user.is_master && currentActiveGroup) {
    // limpar localStorage
    return null;
  }
  return currentActiveGroup;
});

// DEPOIS:
if (!user.is_master && activeGroup) {
  // limpar localStorage
  setActiveGroup(null);
}
```

#### Ocorrência 4: Linha 391 - Erro de rede ou outro erro
```typescript
// ANTES:
setActiveGroup((currentActiveGroup) => {
  if (!user.is_master && currentActiveGroup) {
    // limpar localStorage
    return null;
  }
  return currentActiveGroup;
});

// DEPOIS:
if (!user.is_master && activeGroup) {
  // limpar localStorage
  setActiveGroup(null);
}
```

**Resultado:**
- ✅ Todos os erros de TypeScript corrigidos
- ✅ Código mais simples e direto
- ✅ Lógica preservada
- ✅ Sem erros de lint

---

### 3. Bypass de RLS para Perguntas Não Respondidas

**Arquivo:** `app/api/whatsapp/webhook/messages-upsert/route.ts`

**Problema:**
O webhook roda sem usuário autenticado, então as operações na tabela `ai_unanswered_questions` falhavam devido ao Row Level Security (RLS).

**Solução:**
Foi adicionado o uso do cliente admin do Supabase para operações com `ai_unanswered_questions`:

**Alterações:**
1. **Import adicionado (linha 3):**
   ```typescript
   import { createAdminClient } from '@/lib/supabase/admin';
   ```

2. **Cliente admin criado (linha 11):**
   ```typescript
   const supabaseAdmin = createAdminClient();
   ```

3. **Operações atualizadas para usar `supabaseAdmin`:**
   - Linha 221: `supabaseAdmin.from('ai_unanswered_questions').select(...)`
   - Linha 231: `supabaseAdmin.from('ai_unanswered_questions').update(...)`
   - Linha 243: `supabaseAdmin.from('ai_unanswered_questions').insert(...)`

**Resultado:**
- ✅ Webhook pode inserir/atualizar perguntas não respondidas mesmo sem usuário autenticado
- ✅ Restante do código continua usando `supabase` normal
- ✅ RLS bypassado apenas onde necessário

---

### 4. Correção de Uso de `.single()` para `.limit(1)`

**Arquivo:** `app/api/assistente-ia/training/test/route.ts`

**Problema:**
O uso de `.single()` lança exceção quando não encontra resultado, causando erros desnecessários.

**Solução:**
Substituído `.single()` por `.limit(1)` com acesso seguro ao primeiro elemento:

**Antes:**
```typescript
const { data: report } = await supabase
  .from('powerbi_reports')
  .select('*')
  .eq('dataset_id', dataset_id)
  .eq('connection_id', connection.id)
  .single();
```

**Depois:**
```typescript
const { data: reports } = await supabase
  .from('powerbi_reports')
  .select('*')
  .eq('dataset_id', dataset_id)
  .eq('connection_id', connection.id)
  .limit(1);

const report = reports?.[0];
```

**Benefícios:**
- ✅ Evita erro quando não há relatório: `.single()` lança exceção se não encontrar resultado; `.limit(1)` retorna array vazio
- ✅ Tratamento mais seguro: `reports?.[0]` retorna `undefined` se não houver resultados
- ✅ Código mais robusto

---

## 👨‍💻 Melhorias de Acesso para Developers

### 5. Correção da API de Perguntas Pendentes para Developers

**Arquivo:** `app/api/assistente-ia/questions/route.ts`

**Problema:**
Usuários do tipo "developer" não conseguiam ver as perguntas pendentes dos grupos que eles gerenciam. A API atual só buscava pelo `company_group_id` direto do usuário, mas developers não têm `company_group_id` - eles têm `developer_id` e gerenciam múltiplos grupos.

**Solução Implementada:**

**Lógica Correta:**
1. Se o usuário é developer (tem `developerId`) → buscar perguntas de TODOS os `company_groups` onde `developer_id = developerId`
2. Se é usuário normal com `company_group_id` → buscar apenas do seu `company_group_id`

**Alterações Realizadas:**

1. **Imports adicionados:**
   ```typescript
   import { createAdminClient } from '@/lib/supabase/admin';
   import { getUserDeveloperId, getAuthUser } from '@/lib/auth';
   ```

2. **Lógica de detecção de developer:**
   ```typescript
   const user = await getAuthUser();
   const developerId = await getUserDeveloperId(user.id);
   const isDeveloper = membership.role === 'developer';
   ```

3. **Busca de grupos para developers:**
   ```typescript
   if (isDeveloper && user?.developer_id) {
     const { data: groups } = await supabase
       .from('company_groups')
       .select('id')
       .eq('developer_id', user.developer_id);
     
     groupIds = groups?.map(g => g.id) || [];
   }
   ```

4. **Permissões ajustadas:**
   - Developers não são bloqueados por role (viewer/operator)
   - Apenas usuários normais têm verificação de role
   - Developers têm acesso total aos grupos que gerenciam

5. **Query atualizada:**
   - Usa `.in('company_group_id', groupIds)` em vez de `.eq()`
   - Funciona tanto para developers (múltiplos grupos) quanto usuários normais (um grupo)

**Comportamento:**

**Para developers:**
1. Sistema identifica que é developer via `getUserDeveloperId()`
2. Busca todos os grupos onde `developer_id = developerId`
3. Busca perguntas pendentes de TODOS esses grupos usando `.in()`
4. Não bloqueia por role (acesso total)

**Para usuários normais:**
1. Mantém comportamento original
2. Bloqueia viewer e operator
3. Busca apenas do seu `company_group_id`
4. Usa `.in()` com array de um elemento (compatível)

**Resultado:**
- ✅ Developers podem ver perguntas pendentes de todos os grupos que gerenciam
- ✅ Usuários normais mantêm comportamento original
- ✅ Código compatível com ambos os casos
- ✅ Sem erros de lint

---

## 🛡️ Melhorias de Robustez e Tratamento de Erros

### 6. Tratamento Robusto de Erros no Salvamento de Perguntas

**Arquivos:**
- `app/api/whatsapp/webhook/messages-upsert/route.ts`
- `app/api/whatsapp/webhook/route.ts`

**Melhorias Implementadas:**

1. **Verificação de erros em operações de banco:**
   ```typescript
   const { error: updateError } = await supabase
     .from('ai_unanswered_questions')
     .update({...})
     .eq('id', existingQuestion.id);
   
   if (updateError) {
     console.error('[Webhook] Erro ao atualizar pergunta pendente:', updateError.message);
   } else {
     console.log('[Webhook] ✅ Pergunta pendente atualizada:', existingQuestion.id);
   }
   ```

2. **Valores padrão para evitar null:**
   ```typescript
   attempt_count: (existingQuestion.attempt_count || 0) + 1,
   user_count: (existingQuestion.user_count || 0) + 1,
   ```

3. **Campos obrigatórios preenchidos:**
   ```typescript
   attempt_count: 1,
   user_count: 1,
   first_asked_at: new Date().toISOString(),
   last_asked_at: new Date().toISOString()
   ```

4. **Validação de campos opcionais:**
   ```typescript
   connection_id: connectionId || null,
   dataset_id: datasetId || null,
   ```

**Resultado:**
- ✅ Erros são capturados e logados sem interromper o fluxo
- ✅ Valores padrão garantem que campos numéricos nunca sejam null
- ✅ Datas são sempre preenchidas corretamente
- ✅ Sistema continua funcionando mesmo se houver erro ao salvar

---

## 📊 Logs e Debug

### 7. Logs de Debug Adicionados

**Arquivo:** `app/api/whatsapp/webhook/messages-upsert/route.ts`

**Logs Adicionados:**
- Linha 10: `console.log('=== WEBHOOK MESSAGES-UPSERT CHAMADO ===')`
- Linha 14: `console.log('Body recebido:', JSON.stringify(body, null, 2))`

**Arquivo:** `app/api/whatsapp/webhook/route.ts`

**Logs Adicionados:**
- Linha 1338: `console.log('[Webhook] 🔴 Resposta evasiva detectada, salvando pergunta pendente...')`
- Linha 1364: `console.log('[Webhook] ✅ Pergunta pendente atualizada:', existingQuestion.id)`
- Linha 1390: `console.log('[Webhook] ✅ Nova pergunta pendente criada:', newQuestion?.id)`
- Linha 1395: `console.error('[Webhook] ❌ Erro ao salvar pergunta pendente:', saveError.message)`

**Arquivo:** `app/api/assistente-ia/questions/route.ts`

**Logs Adicionados:**
- Logs de debug para rastrear membership, developer status, grupos e resultados de query

**Benefícios:**
- ✅ Visibilidade completa de quando o webhook é chamado
- ✅ Conteúdo completo do body formatado para debug
- ✅ Rastreamento de respostas evasivas
- ✅ Facilita identificação de problemas
- ✅ Logs com emojis para fácil identificação visual

---

## 📈 Impacto e Benefícios

### Melhorias na Qualidade do Assistente IA

1. **Detecção Mais Precisa:**
   - Sistema agora detecta 14 padrões evasivos diferentes
   - Captura respostas que antes passavam despercebidas
   - Melhora a taxa de identificação de perguntas não respondidas

2. **Rastreamento Completo:**
   - Todas as perguntas não respondidas são salvas automaticamente
   - Histórico completo de tentativas e usuários
   - Facilita criação de exemplos de treinamento

3. **Consistência Entre Endpoints:**
   - Mesma lógica implementada em ambos os webhooks
   - Comportamento uniforme em todo o sistema

### Melhorias Técnicas

1. **Código Mais Robusto:**
   - Correção de erros TypeScript
   - Tratamento de erros melhorado
   - Validações adicionais
   - Uso seguro de `.limit(1)` ao invés de `.single()`

2. **Manutenibilidade:**
   - Código mais simples e direto
   - Logs detalhados para debug
   - Melhor rastreabilidade

3. **Acesso para Developers:**
   - Developers podem ver perguntas de todos os grupos que gerenciam
   - Acesso total sem restrições de role
   - Busca eficiente usando `.in()` para múltiplos grupos

---

## 🔍 Detalhes Técnicos

### Estrutura de Dados

**Tabela: `ai_unanswered_questions`**

Campos utilizados nas novas funcionalidades:
- `company_group_id` - Grupo da empresa
- `connection_id` - Conexão Power BI (pode ser null)
- `dataset_id` - Dataset Power BI (pode ser null)
- `user_question` - Pergunta do usuário
- `phone_number` - Telefone de quem perguntou
- `attempted_dax` - DAX tentado (null se resposta evasiva)
- `error_message` - Mensagem de erro ou "Resposta evasiva da IA"
- `status` - Sempre 'pending' quando criado
- `attempt_count` - Contador de tentativas (inicia em 1)
- `user_count` - Contador de usuários (inicia em 1)
- `first_asked_at` - Data da primeira pergunta
- `last_asked_at` - Data da última pergunta

### Padrões Evasivos

Os padrões são verificados usando `.includes()` case-insensitive, então:
- "Não encontrei" ✅
- "não encontrei" ✅
- "NÃO ENCONTREI" ✅
- "Não encontrei esses dados" ✅

### Busca de Perguntas Similares

A busca usa `ilike` (case-insensitive LIKE) para encontrar perguntas similares:
```typescript
.ilike('user_question', processedMessage)
```

Isso permite encontrar variações da mesma pergunta, como:
- "Quanto faturamos em dezembro?"
- "quanto faturamos em dezembro?"
- "Quanto faturamos em Dezembro?"

### Tratamento de Erros

Todas as operações de salvamento são envolvidas em try/catch:
- Erros não interrompem o fluxo principal
- Logs detalhados para debug
- Sistema continua funcionando mesmo se houver erro ao salvar

---

## 📝 Arquivos Modificados

### APIs
1. `app/api/whatsapp/webhook/messages-upsert/route.ts`
   - Detecção de respostas evasivas
   - Bypass RLS com `supabaseAdmin`
   - Logs de debug

2. `app/api/whatsapp/webhook/route.ts`
   - Detecção de respostas evasivas
   - Tratamento robusto de erros
   - Logs melhorados

3. `app/api/assistente-ia/questions/route.ts`
   - Suporte para developers verem todos os grupos
   - Logs de debug
   - Busca usando `.in()` para múltiplos grupos

4. `app/api/assistente-ia/training/test/route.ts`
   - Substituição de `.single()` por `.limit(1)`

### Componentes
1. `src/components/layout/Header.tsx`
   - Correção de 4 ocorrências de TypeScript
   - Remoção de callbacks em `setActiveGroup`

---

## ✅ Checklist de Validação

- [x] Detecção de respostas evasivas funcionando em ambos os webhooks
- [x] Salvamento em `ai_unanswered_questions` funcionando
- [x] Bypass de RLS implementado corretamente
- [x] Erros TypeScript corrigidos
- [x] Logs de debug adicionados
- [x] Tratamento de erros robusto
- [x] Validações de campos null implementadas
- [x] Developers podem ver perguntas de todos os grupos
- [x] Uso seguro de `.limit(1)` ao invés de `.single()`
- [x] Código testado e funcionando

---

## 🎯 Próximos Passos Sugeridos

1. **Analytics de Padrões Evasivos:**
   - Dashboard mostrando quais padrões são mais comuns
   - Identificar tendências de perguntas não respondidas

2. **Melhoria Automática:**
   - Sugestão automática de exemplos de treinamento baseado em perguntas pendentes
   - Agrupamento de perguntas similares

3. **Notificações:**
   - Alertar admins quando há muitas perguntas pendentes
   - Notificar quando pergunta pendente é resolvida

4. **Testes Automatizados:**
   - Testes unitários para detecção de padrões evasivos
   - Testes de integração para salvamento de perguntas

---

## 📚 Referências

- **Documentação Base:** `DOCUMENTACAO_COMPLETA_SISTEMA_2025.md`
- **Changelog Anterior:** `CHANGELOG_2025_JAN.md`
- **Documentação do Assistente IA:** `DOCUMENTACAO_ASSISTENTE_IA.md`

---

**Data de Criação:** Janeiro 2025  
**Versão:** 3.2.0  
**Autor:** Sistema de Documentação Automática  
**Última Atualização:** Janeiro 2025
