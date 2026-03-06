# 📊 PROMPT v7 — Documentação BI para Chat IA
## Conexão via MCP + Validação + Regras Assertivas + Formato Padronizado

---

## 🎯 OBJETIVO
Conectar ao Power BI Desktop via MCP, analisar o modelo, validar queries com dados reais e gerar documentação no formato exato do sistema de chat IA. A documentação deve conter **regras numeradas assertivas** que a IA consiga seguir sem ambiguidade.

---

## ⚡ FASE 1 — CONECTAR AO MODELO VIA MCP

### 1.1 Localizar instâncias abertas
Use o MCP do Power BI para listar os modelos abertos na máquina:
connection_operations → ListLocalInstances
Isso retorna as instâncias do Power BI Desktop abertas com porta, connectionString e nome do arquivo.

### 1.2 Conectar ao modelo
Com a connectionString retornada, conecte:
connection_operations → Connect
connectionString: "Data Source=localhost:{porta};Application Name=MCP-PBIModeling"

### 1.3 Confirmar conexão
Após conectar, execute:
model_operations → GetStats
Anote: nome do modelo, número de tabelas, medidas, colunas e relacionamentos.

---

## ⚡ FASE 2 — EXPLORAR O MODELO

### 2.1 Listar tabelas e medidas
model_operations → GetStats          → visão geral de todas as tabelas
measure_operations → List            → medidas de cada tabela relevante
column_operations → List             → colunas das tabelas de dimensão e fatos

### 2.2 Identificar medidas QA_ existentes
Verifique se já existem medidas com prefixo `QA_` (pasta "QA_ Consultas IA" ou similar). Se existirem, use-as como base. Se não existirem, crie conforme a Fase 3.

### 2.3 Mapear áreas de negócio
Identifique as áreas cobertas pelo modelo: vendas, financeiro, DRE, fluxo de caixa, estoque, RH, etc.

### 2.4 Identificar regras de negócio críticas
- Há filtros obrigatórios? (ex: excluir contas de controle, excluir cancelamentos)
- Há medidas que dependem do contexto? (ex: medidas que só funcionam com produto/garçom)
- Há relacionamentos ativos/inativos que afetam filtros de data?
- Há regimes diferentes? (Caixa vs Competência)
- Há erros de digitação nos nomes do modelo? (ex: "Adminsitrativas" com typo) — documentar EXATAMENTE como está

### 2.5 Identificar AMBIGUIDADES de medidas (CRÍTICO)
Detecte quando existem **duas ou mais medidas para o mesmo conceito**. Exemplos comuns:
- "Faturamento": uma medida para total geral, outra para detalhe por produto
- "CMV": uma medida de venda, outra do DRE, outra do fluxo de caixa
- "Vendas": medida de valor lançado vs valor recebido

Para CADA ambiguidade encontrada, documente:
- Qual medida usar em qual contexto
- Palavras-chave que indicam cada contexto
- Exemplos de perguntas para cada medida

Isso será transformado em REGRAS NUMERADAS na documentação final.

---

## ⚡ FASE 3 — CRIAR MEDIDAS QA_ (SE NECESSÁRIO)

Se o modelo **não tiver** medidas `QA_`, crie-as com prefixo obrigatório `QA_`. Se **já tiver**, pule esta fase.

**Regras:**
- Prefixo obrigatório: `QA_`
- Criar na tabela mais adequada ou em tabela de medidas existente
- Cada medida deve ser **autossuficiente** — não depender de slicer
- Nomes descritivos em português
- NÃO alterar medidas existentes

**Categorias a criar (adapte ao modelo real):**

| Categoria | Exemplos |
|-----------|---------|
| Valores Base | QA_Faturamento, QA_Venda_Total |
| Indicadores | QA_Ticket_Medio, QA_Preco_Medio |
| Rankings | QA_Top1_Produto_Nome, QA_Top1_Produto_Valor |
| Top N | QA_Top3_Produtos, QA_Top5_Produtos |
| Custos/Margem | QA_CMV, QA_Margem_Bruta, QA_Margem_Percentual |
| Temporal | QA_Variacao_MoM, QA_Vendas_Mes_Anterior, QA_Media_Diaria |
| Contadores | QA_Dias_Trabalhados, QA_Quantidades |
| Financeiro | QA_A_Pagar, QA_A_Receber, QA_Saldo_Atual |

---

## ⚡ FASE 4 — VALIDAR COM QUERIES REAIS

Execute ao menos **25 queries DAX** reais via MCP para obter valores concretos do modelo:
dax_query_operations → Execute

**Queries obrigatórias a validar:**

### Vendas (mínimo 8)
1. Faturamento total de um período recente
2. Faturamento do mês atual
3. Ticket médio do período
4. Quantidade de itens/vendas
5. Top 3 produtos por valor
6. Top 5 funcionários/garçons por valor
7. Top 3 grupos/categorias por valor
8. Margem % de um produto específico

### Financeiro (mínimo 7)
9. Saldo atual (se aplicável)
10. Entradas e saídas do fluxo de caixa
11. Contas a pagar vencidas
12. Contas a receber vencidas
13. Contas vencendo hoje
14. Despesa por subcategoria (top 5)
15. Busca de credor/fornecedor por nome parcial

### DRE / Estrutural (mínimo 5)
16. Faturamento por linha do DRE (se aplicável)
17. Resultado do fluxo de caixa
18. Resultado operacional
19. Comparativo com mês anterior
20. Faturamento por dimensão principal (filial, produto, vendedor)

### Testes de ambiguidade (mínimo 5)
21. Fazer a MESMA pergunta com medidas diferentes e comparar resultados
22. Testar "faturamento" com e sem agrupador de produto — confirmar qual medida usar em cada caso
23. Testar query financeira COM e SEM filtro obrigatório — confirmar que o filtro é necessário
24. Testar "CMV" em diferentes contextos (venda, DRE, fluxo) — documentar diferenças
25. Testar busca de entidade com filtro exato vs parcial

**Para cada query, registre:**
- O DAX exato executado
- O resultado obtido (valor real)
- Se o resultado faz sentido
- Se é a medida CORRETA para este tipo de pergunta

**Se uma medida retornar erro:** identifique a causa, documente o problema e use medida alternativa que funcione.

---

## ⚡ FASE 5 — GERAR DOCUMENTAÇÃO FINAL

Somente após as Fases 1–4, gere a documentação no formato exato abaixo.

**ATENÇÃO:** A seção "Instruções para a IA" deve usar formato de REGRAS NUMERADAS (não bullets genéricos). Cada regra deve ser assertiva e sem ambiguidade.

---

## 📄 FORMATO OBRIGATÓRIO DE SAÍDA

O arquivo .md deve começar DIRETAMENTE com `<!-- SECTION:BASE -->`, sem nenhum título ou texto antes.
```markdown
<!-- SECTION:BASE -->
# Visão Geral

## Sobre o Modelo
[Descrição detalhada: o que é, para que serve, qual negócio atende, quantas tabelas/medidas]
[Mencionar medidas QA_ e que são otimizadas para consultas de IA]
[Descrever qual medida usar para cada conceito principal]
[Se houver regras de contexto críticas, explicar aqui]

## Áreas Cobertas
- **[Área 1]:** [métricas disponíveis]
- **[Área 2]:** [métricas disponíveis]
- **[Área N]:** [métricas disponíveis]

## Regras de Negócio
- [Regra 1]
- [Regra 2]
- [Regra N — incluir TODAS as regras críticas identificadas na Fase 2]

## Instruções para a IA

### REGRA 1 — [TÍTULO] (CRÍTICO)
[Descrição clara e assertiva da regra]
- Quando aplica: [exemplos de perguntas]
- Quando NÃO aplica: [exemplos contrários]
- Na dúvida: [comportamento padrão]

### REGRA 2 — [TÍTULO] (CRÍTICO)
[Se for filtro obrigatório, listar TODAS as medidas afetadas]
[Se for escolha de medida, dar exemplos concretos de perguntas para cada opção]

### REGRA N — [TÍTULO]
[Cada modelo terá suas regras específicas. Exemplos comuns:]
- Escolha de medida de faturamento (quando há mais de uma)
- Filtros obrigatórios (contas a excluir, cancelamentos)
- Formato de filtro de data correto para o modelo
- DRE: perguntar regime antes de responder
- Busca de entidades (usar SEARCH parcial)
- Rankings: ordenação correta (DESC/ASC)
- Saldo: ignora filtro de data
<!-- END:BASE -->

<!-- SECTION:MEDIDAS -->
# Medidas

| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|
| QA_[Nome] | [Descrição] | [palavras-chave que o usuário usaria] | [Área] |
| [Medida existente] | [Descrição — incluir "REQUER filtro de [X]" se houver filtro obrigatório] | [palavras-chave] | [Área] |
| ... | ... | ... | ... |

(Mínimo 30 medidas. Incluir todas as QA_ + medidas existentes relevantes.
A coluna "Quando Usar" deve ter as palavras que o usuário digitaria no chat.
Se a medida depende de contexto, incluir na descrição: "usar quando HÁ produto/garçom" ou "usar quando NÃO há produto".)
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Colunas

| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| Tabela.Coluna | Tipo | Filtro / Agrupar / Exibir | [valores reais do modelo] |
| ... | ... | ... | ... |

(Mínimo 20 colunas. Formato obrigatório: Tabela.Coluna.
Incluir valores reais, não genéricos. Consultar o modelo para obter exemplos de valores.
Se houver typos nos nomes do modelo, documentar exatamente como estão.)
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Queries

| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | [Pergunta natural] | [Medida] | [Coluna ou -] | [Filtro ou -] |
| ... | ... | ... | ... | ... |

(Mínimo 35 queries. Usar APENAS queries validadas na Fase 4.
Incluir pelo menos 7 queries financeiras com filtro obrigatório documentado.)
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos

## Exemplo 1
**Pergunta:** [Pergunta natural do usuário]
**Medidas:** [Medida usada]
**Agrupadores:** [Coluna ou -]
**Filtros:** [Filtro ou -]
**Resposta:** "[Resposta formatada com valores REAIS da Fase 4]"
**DAX usado:** `[DAX exato executado na Fase 4]`

## Exemplo 2
...

(Mínimo 25 exemplos. Todos com valores REAIS. Todos com DAX usado.
Incluir pelo menos 5 exemplos financeiros com filtro obrigatório aplicado no DAX.
Incluir pelo menos 2 exemplos de ranking com ordenação correta.
Incluir pelo menos 1 exemplo de busca parcial de entidade.)
<!-- END:EXEMPLOS -->
```

---

## ⚠️ REGRAS CRÍTICAS

### OBRIGATÓRIO:
- [ ] Conectou ao BI via MCP (`connection_operations → ListLocalInstances → Connect`)
- [ ] Explorou tabelas, medidas e colunas do modelo real
- [ ] Identificou ambiguidades de medidas (Fase 2.5) e testou cada uma (Fase 4.21-25)
- [ ] Identificou e documentou TODAS as regras de negócio críticas
- [ ] Executou e validou ao menos 25 queries com dados reais
- [ ] Seção BASE contém "Instruções para a IA" com REGRAS NUMERADAS (não bullets genéricos)
- [ ] Seção MEDIDAS com mínimo 30 medidas, com "REQUER filtro" onde aplicável
- [ ] Seção TABELAS com mínimo 20 colunas com valores reais do modelo
- [ ] Seção QUERIES com mínimo 35 perguntas validadas (7+ financeiras)
- [ ] Seção EXEMPLOS com mínimo 25 exemplos com DAX e valores reais (5+ financeiros)
- [ ] Documentou medidas que causaram erro e a alternativa usada
- [ ] Arquivo começa com `<!-- SECTION:BASE -->` sem título antes

### PROIBIDO:
- ❌ Gerar documentação sem conectar ao modelo via MCP
- ❌ Inventar valores nos exemplos — usar APENAS dados reais
- ❌ Inventar nomes de tabelas, colunas ou medidas — usar APENAS o que existe no modelo
- ❌ Alterar ou deletar medidas existentes
- ❌ Omitir o DAX usado nos exemplos
- ❌ Omitir regras de negócio críticas (filtros obrigatórios, contextos de medidas, etc.)
- ❌ Usar bullets genéricos nas "Instruções para a IA" — usar REGRAS NUMERADAS
- ❌ Colocar título ou texto ANTES de `<!-- SECTION:BASE -->`

---

## 🔄 FLUXO RESUMIDO

LISTAR instâncias    → connection_operations: ListLocalInstances
CONECTAR             → connection_operations: Connect
EXPLORAR             → model_operations: GetStats + measure_operations: List + column_operations: List
IDENTIFICAR REGRAS   → Ambiguidades de medidas, filtros obrigatórios, contextos
CRIAR QA_            → measure_operations: Create (somente se não existirem)
VALIDAR              → dax_query_operations: Execute (mínimo 25 queries + testes de ambiguidade)
DOCUMENTAR           → Gerar .md no formato das seções com REGRAS NUMERADAS


**Comece pela Fase 1: liste as instâncias abertas na máquina.**
