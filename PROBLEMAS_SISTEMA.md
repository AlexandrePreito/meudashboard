# Documentação de Problemas do Sistema

**Data de Criação:** 2025-01-27  
**Última Atualização:** 2025-01-27  
**Versão:** 1.0

---

## 📋 Índice

1. [Problemas Resolvidos Recentemente](#problemas-resolvidos-recentemente)
2. [Problemas Conhecidos](#problemas-conhecidos)
3. [Problemas Temporários](#problemas-temporários)
4. [Recomendações](#recomendações)

---

## ✅ Problemas Resolvidos Recentemente

### 1. Erro 500 na API de Relatórios Power BI

**Status:** ✅ RESOLVIDO  
**Data:** 2025-01-27

**Descrição:**
A API `/api/powerbi/reports` estava retornando erro 500 ao ser chamada.

**Causa:**
- A tabela `powerbi_reports` não possui a coluna `company_group_id` diretamente
- O código tentava filtrar diretamente por `company_group_id` na tabela `powerbi_reports`
- A relação correta é: `powerbi_reports.connection_id` → `powerbi_connections.id` → `powerbi_connections.company_group_id`

**Solução Implementada:**
```typescript
// ANTES (ERRADO):
reportsQuery = reportsQuery.eq('company_group_id', targetGroupId);

// DEPOIS (CORRETO):
// 1. Buscar conexões do grupo primeiro
const { data: connections } = await supabase
  .from('powerbi_connections')
  .select('id')
  .eq('company_group_id', targetGroupId)
  .eq('is_active', true);

const groupConnectionIds = connections?.map(c => c.id) || [];

// 2. Filtrar relatórios pelas conexões do grupo
reportsQuery = reportsQuery.in('connection_id', groupConnectionIds);
```

**Arquivo Modificado:**
- `app/api/powerbi/reports/route.ts`

---

### 2. Erro de Sintaxe do JOIN no Supabase

**Status:** ✅ RESOLVIDO  
**Data:** 2025-01-27

**Descrição:**
Erro ao fazer JOIN entre `powerbi_reports` e `powerbi_connections`:
```
column powerbi_connections.name does not exist
code: "42703"
```

**Causa:**
- Sintaxe incorreta do JOIN do Supabase
- Supabase não conseguia identificar a foreign key corretamente

**Solução Implementada:**
Implementado JOIN manual em JavaScript em vez de usar JOIN nativo do Supabase:

```typescript
// PASSO 1: Buscar relatórios
const { data: reports } = await supabase
  .from('powerbi_reports')
  .select('*')
  .in('connection_id', groupConnectionIds);

// PASSO 2: Buscar conexões separadamente
const { data: connections } = await supabase
  .from('powerbi_connections')
  .select('id, name, workspace_name, company_group_id, is_active')
  .eq('company_group_id', targetGroupId);

// PASSO 3: Fazer JOIN manual
const reportsWithConnections = reports.map((report: any) => {
  const connection = connections?.find((c: any) => c.id === report.connection_id) || null;
  return {
    ...report,
    connection: connection,
    powerbi_connections: connection, // Compatibilidade com código antigo
  };
});
```

**Arquivo Modificado:**
- `app/api/powerbi/reports/route.ts`

---

### 3. Sistema Não Localizava Conexões Power BI

**Status:** ✅ RESOLVIDO  
**Data:** 2025-01-27

**Descrição:**
O sistema não encontrava conexões Power BI mesmo quando já estavam cadastradas na página de conexões.

**Causa:**
- O sistema buscava conexões sem filtrar pelo grupo selecionado no menu superior
- O frontend não estava usando o `activeGroup` do contexto
- A API não estava sendo chamada com o grupo correto

**Solução Implementada:**

**Frontend (`app/assistente-ia/treinar/novo/page.tsx`):**
- Adicionado `useMenu()` para acessar `activeGroup`
- Ajustado `loadDatasets()` para buscar relatórios baseado no grupo selecionado
- Adicionado verificação de conexão ao carregar a página

**API (`app/api/powerbi/reports/route.ts`):**
- API agora busca automaticamente o grupo do usuário logado
- Não depende mais de query parameters `group_id`
- Filtra relatórios corretamente pelo grupo

**Arquivos Modificados:**
- `app/assistente-ia/treinar/novo/page.tsx`
- `app/api/powerbi/reports/route.ts`

---

### 4. Mensagens de Erro Pobres para Usuário

**Status:** ✅ RESOLVIDO  
**Data:** 2025-01-27

**Descrição:**
Mensagens de erro genéricas não ajudavam o usuário a entender o problema ou como resolver.

**Solução Implementada:**

**API de Teste (`app/api/assistente-ia/training/test/route.ts`):**
- Diferencia entre conexão inativa e sem conexão
- Mensagens específicas e acionáveis
- Sugere ações específicas para o usuário

**Frontend (`app/assistente-ia/treinar/novo/page.tsx`):**
- Adicionado diálogo `window.confirm` para redirecionar usuário
- Verificação proativa de conexão ao carregar página
- Alertas informativos sobre o estado das conexões

**Exemplo de Mensagens:**
```typescript
// Conexão inativa
"Conexão 'Nome da Conexão' existe mas está inativa. Ative em Power BI > Conexões."

// Sem conexão
"Nenhuma conexão Power BI encontrada. Crie uma em Power BI > Conexões."

// Sem relatório ativo
"Nenhum relatório ativo encontrado para este dataset. Verifique em Power BI > Relatórios."
```

**Arquivos Modificados:**
- `app/api/assistente-ia/training/test/route.ts`
- `app/assistente-ia/treinar/novo/page.tsx`

---

### 5. Redeclaração de Variáveis (Erro de Compilação)

**Status:** ✅ RESOLVIDO  
**Data:** 2025-01-27

**Descrição:**
Erro de compilação: "cannot reassign to a variable declared with `const`" e "the name `connectionIds` is defined multiple times".

**Causa:**
- Variável `connectionIds` declarada múltiplas vezes no mesmo escopo
- Uso de `const` onde deveria ser `let`

**Solução Implementada:**
Renomeadas as variáveis para evitar conflitos:
- `connectionIds` → `groupConnectionIds` (para conexões do grupo)
- Criada `reportConnectionIds` (para conexões dos relatórios encontrados)

**Arquivo Modificado:**
- `app/api/powerbi/reports/route.ts`

---

## ⚠️ Problemas Conhecidos

### 1. Cache do Turbopack em Desenvolvimento

**Status:** ⚠️ CONHECIDO  
**Severidade:** Baixa  
**Impacto:** Desenvolvimento

**Descrição:**
O Turbopack (compilador do Next.js) às vezes mantém versões antigas de arquivos em cache, causando erros de compilação mesmo quando o código está correto.

**Sintomas:**
- Erros que apontam para código que já foi corrigido
- Mensagens de erro referenciando linhas/colunas que não correspondem ao código atual
- Erros que desaparecem após reiniciar o servidor

**Workaround:**
1. Reiniciar o servidor Next.js (Ctrl+C e depois `npm run dev`)
2. Limpar cache: `rm -rf .next` (ou `Remove-Item -Recurse -Force .next` no PowerShell)
3. Aguardar alguns segundos para o Turbopack recarregar

**Exemplo Recente:**
Erro mostrando `connectionIds` quando o arquivo já tinha `groupConnectionIds` - resolvido após reiniciar servidor.

**Recomendação:**
- Sempre verificar o código no arquivo antes de assumir que o erro é real
- Se o código está correto mas o erro persiste, reiniciar o servidor
- Documentar quando houver suspeita de cache

---

### 2. Estrutura de Dados: powerbi_reports sem company_group_id

**Status:** ⚠️ CONHECIDO (Arquitetura)  
**Severidade:** Média  
**Impacto:** Desenvolvimento e Performance

**Descrição:**
A tabela `powerbi_reports` não possui a coluna `company_group_id` diretamente. O grupo é obtido através da relação:
```
powerbi_reports.connection_id → powerbi_connections.id → powerbi_connections.company_group_id
```

**Impacto:**
- Requer JOIN adicional para filtrar por grupo
- Queries mais complexas (2-3 consultas ao invés de 1)
- Possível impacto na performance com muitos relatórios

**Solução Atual:**
JOIN manual em JavaScript após buscar dados.

**Recomendação Futura:**
- Considerar adicionar `company_group_id` diretamente na tabela `powerbi_reports`
- Isso simplificaria queries e melhoraria performance
- Manter sincronização com `powerbi_connections.company_group_id`

**Arquivos Afetados:**
- `app/api/powerbi/reports/route.ts`
- Qualquer query que precise filtrar relatórios por grupo

---

### 3. Verificação de Conexão Power BI na Página de Treino

**Status:** ⚠️ CONHECIDO (UX)  
**Severidade:** Baixa  
**Impacto:** Experiência do Usuário

**Descrição:**
A verificação de conexão Power BI ao carregar a página pode ser intrusiva se executada sempre, mostrando diálogos mesmo quando o usuário já tem conexão.

**Comportamento Atual:**
- Verificação executa no `useEffect` ao carregar página
- Mostra `window.confirm` se não houver conexão ativa
- Pode interromper o fluxo do usuário

**Recomendação:**
- Considerar verificação silenciosa inicial
- Mostrar aviso visual apenas se necessário
- Adicionar opção para desabilitar verificação automática

**Arquivos Afetados:**
- `app/assistente-ia/treinar/novo/page.tsx` (função `checkConnection`)

---

## 🔄 Problemas Temporários

### 1. Cache do Turbopack (Atual)

**Status:** 🔄 TEMPORÁRIO  
**Resolução:** Reiniciar servidor Next.js

**Observação:**
Este é um problema conhecido do Turbopack em desenvolvimento. Não afeta produção.

---

## 📝 Recomendações

### Curto Prazo

1. **Documentar Schema do Banco:**
   - Criar documentação clara da estrutura das tabelas
   - Especialmente relações entre `powerbi_reports`, `powerbi_connections` e `company_groups`

2. **Melhorar Tratamento de Erros:**
   - Padronizar mensagens de erro em todas as APIs
   - Adicionar códigos de erro únicos para facilitar debug

3. **Testes de Integração:**
   - Adicionar testes para fluxo completo de busca de relatórios
   - Testar cenários com e sem conexões ativas

### Médio Prazo

1. **Otimizar Queries:**
   - Avaliar adicionar `company_group_id` em `powerbi_reports`
   - Considerar índices para melhorar performance

2. **Melhorar UX:**
   - Tornar verificação de conexão menos intrusiva
   - Adicionar indicadores visuais de status

3. **Monitoramento:**
   - Adicionar logging estruturado
   - Métricas de performance das APIs

### Longo Prazo

1. **Refatoração:**
   - Considerar usar Prisma ou outro ORM para melhor tipagem
   - Simplificar lógica de JOIN manual

2. **Documentação:**
   - Manter este documento atualizado
   - Adicionar diagramas de arquitetura

---

## 🔍 Checklist de Debug

Antes de reportar um problema, verifique:

- [ ] O código no arquivo está correto?
- [ ] O servidor Next.js foi reiniciado recentemente?
- [ ] O cache foi limpo (`.next` folder)?
- [ ] As dependências estão atualizadas?
- [ ] O erro aparece no console do navegador E no terminal do servidor?

---

## 📞 Suporte

Para problemas não documentados:
1. Verificar logs do console do navegador (F12)
2. Verificar logs do terminal do servidor Next.js
3. Verificar logs do Supabase (se aplicável)
4. Documentar o problema neste arquivo antes de buscar ajuda

---

**Última Revisão:** 2025-01-27  
**Próxima Revisão:** Semanal ou quando novos problemas forem identificados
