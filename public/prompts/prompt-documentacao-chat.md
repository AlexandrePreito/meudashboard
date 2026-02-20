# 📊 PROMPT v5 - Documentação Inteligente para Chat IA
## COM CRIAÇÃO DE MEDIDAS, VALIDAÇÃO E DOCUMENTAÇÃO

---

## 🎯 OBJETIVO
Criar uma documentação completa e testada para o assistente de IA responder perguntas de negócio via WhatsApp/Chat. O processo tem **3 fases obrigatórias** que garantem qualidade.

---

## ⚡ FASE 1 — ANÁLISE E CRIAÇÃO DE MEDIDAS OTIMIZADAS

### 1.1 Analisar o modelo
Antes de documentar qualquer coisa, analise o modelo conectado:
- Liste todas as tabelas e seus relacionamentos
- Liste todas as medidas existentes
- Identifique as áreas de negócio (vendas, financeiro, RH, estoque, etc.)
- Identifique as colunas úteis para filtros e agrupamentos

### 1.2 Criar medidas QA_ otimizadas
Crie novas medidas DAX com prefixo **QA_** (Query Assistant) otimizadas para consultas de IA. Essas medidas são **adicionais** — NÃO altere medidas existentes.

**Regras para criação de medidas QA_:**
- Prefixo obrigatório: `QA_`
- Criar na tabela mais adequada do modelo (ou em uma tabela de medidas se existir)
- Cada medida deve ser **autossuficiente** (não depender de seleções de slicer)
- Usar nomes descritivos em português: `QA_Faturamento`, `QA_Ticket_Medio`, `QA_Top1_Produto_Nome`
- Incluir medidas de Rankings (Top1, Top3, Top5, Top10)
- Incluir medidas temporais (MoM, YoY, média diária)
- Incluir medidas de contagem (qtd clientes, qtd produtos, dias trabalhados)

**Categorias obrigatórias de medidas QA_ a criar:**

| Categoria | Medidas Sugeridas | Prioridade |
|-----------|------------------|------------|
| **Valores Base** | QA_Faturamento, QA_Venda_Total, QA_Quantidade | ALTA |
| **Indicadores** | QA_Ticket_Medio, QA_Preco_Medio | ALTA |
| **Rankings** | QA_Top1_[Dimensão]_Nome, QA_Top1_[Dimensão]_Valor | ALTA |
| **Top N** | QA_Top3_[Dimensão], QA_Top5_[Dimensão] | MÉDIA |
| **Custos/Margem** | QA_CMV, QA_Margem_Bruta, QA_Margem_Percentual | MÉDIA |
| **Temporal** | QA_Variacao_MoM, QA_Variacao_YoY, QA_Media_Diaria | MÉDIA |
| **Contadores** | QA_Dias_Trabalhados, QA_Qtd_Clientes, QA_Qtd_Produtos_Vendidos | BAIXA |
| **Financeiro** | QA_A_Pagar, QA_A_Receber, QA_Saldo (se houver dados) | BAIXA |

**Exemplo de medidas a criar:**

```dax
-- Faturamento base
QA_Faturamento = SUM(Vendas[Valor])

-- Top 1 produto por valor
QA_Top1_Produto_Nome = 
VAR TopProduto = TOPN(1, ALL(Produto[Nome]), CALCULATE(SUM(Vendas[Valor])), DESC)
RETURN MAXX(TopProduto, Produto[Nome])

QA_Top1_Produto_Valor = 
VAR TopProduto = TOPN(1, ALL(Produto[Nome]), CALCULATE(SUM(Vendas[Valor])), DESC)
RETURN MAXX(TopProduto, CALCULATE(SUM(Vendas[Valor])))

-- Variação MoM
QA_Variacao_MoM = 
VAR VendaAtual = [QA_Faturamento]
VAR VendaAnterior = CALCULATE([QA_Faturamento], DATEADD(Calendario[Data], -1, MONTH))
RETURN IF(VendaAnterior <> 0, DIVIDE(VendaAtual - VendaAnterior, VendaAnterior), BLANK())

-- Ticket Médio
QA_Ticket_Medio = DIVIDE([QA_Faturamento], [QA_Qtd_Vendas])
```

**IMPORTANTE:** Adapte os nomes das tabelas e colunas ao modelo real. Os exemplos acima são templates.

### 1.3 Testar cada medida criada
Após criar, execute uma query DAX para validar cada medida:
```dax
EVALUATE ROW("Resultado", [QA_Faturamento])
```

Se der erro, corrija antes de prosseguir.

---

## ⚡ FASE 2 — VALIDAÇÃO INTERATIVA DE PERGUNTAS

### 2.1 Simular perguntas de usuários
Faça pelo menos **20 perguntas** que um usuário típico faria e valide as respostas:

**Perguntas obrigatórias para validar:**
1. "Qual o faturamento total?"
2. "Qual o faturamento deste mês?"
3. "Faturamento por [principal dimensão]?" (filial, vendedor, produto, etc.)
4. "Qual o produto/item mais vendido?"
5. "Quem mais vendeu?" (vendedor/funcionário)
6. "Top 10 produtos"
7. "Qual o ticket médio?"
8. "Como está comparado ao mês anterior?"
9. "Vendas por mês"
10. "Qual dia da semana vende mais?"
11-20. Perguntas específicas do negócio

### 2.2 Para cada pergunta, registre:
- A pergunta natural do usuário
- Qual query DAX foi executada
- O resultado obtido
- Se o resultado faz sentido (validação)

### 2.3 Corrigir problemas encontrados
Se alguma query retornar dados incorretos ou erro:
- Ajuste a medida QA_ correspondente
- Crie medidas novas se necessário
- Re-teste até funcionar

---

## ⚡ FASE 3 — GERAR DOCUMENTAÇÃO FINAL

Somente após as Fases 1 e 2, gere a documentação no formato abaixo.

### FORMATO OBRIGATÓRIO DE SAÍDA

```markdown
<!-- SECTION:BASE -->
# [Nome do Modelo/Empresa]

## Sobre
[Descrição detalhada do modelo - o que é, para que serve, qual negócio atende]
[Mencionar prefixo QA_ e que essas medidas são otimizadas para consultas de IA]
[Descrever qual medida usar para cada conceito principal - ex: "Para faturamento real, use QA_Faturamento"]

## Áreas Cobertas
- **[Área 1]:** [lista de métricas disponíveis]
- **[Área 2]:** [lista de métricas disponíveis]
- **[Área 3]:** [lista de métricas disponíveis]

## Regras de Negócio
- [Regra 1 - ex: Faturamento = valor recebido, não valor lançado]
- [Regra 2 - ex: Vendas válidas excluem cancelamentos]
- [Regra 3 - ex: CMV = quantidade × custo unitário]
- [Regra 4 - ex: Margem = Vendas - CMV]

## Instruções para a IA
- Sempre usar medidas com prefixo QA_ quando disponíveis
- Para rankings, usar QA_Top1_ ou QA_Top3_ ao invés de construir TOPN manualmente
- Para comparativos temporais, usar QA_Variacao_MoM e QA_Variacao_YoY
- Quando o usuário pedir "faturamento", usar QA_Faturamento (não QA_Venda_Total)
- [Outras instruções específicas do modelo]
<!-- END:BASE -->

<!-- SECTION:MEDIDAS -->
# Medidas

| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|
| QA_Faturamento | [Descrição] | faturamento, receita, quanto faturou | Vendas |
| QA_Venda_Total | [Descrição] | vendas, quanto vendeu, total vendido | Vendas |
| ... | ... | ... | ... |

(Incluir TODAS as medidas QA_ criadas + medidas existentes úteis. Mínimo 20.)
(A coluna "Quando Usar" deve ter palavras-chave que o usuário usaria na pergunta)
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Colunas

| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| Calendario.Data | DateTime | Filtro | [Range de datas] |
| Calendario.Ano | Int64 | Filtro, Agrupar | [Anos disponíveis] |
| Calendario.Mês | Int64 | Filtro, Agrupar | 1 a 12 |
| Calendario.Nome do Mês | String | Agrupar, Exibir | Janeiro, Fevereiro... |
| [Tabela].[Coluna] | [Tipo] | [Uso] | [Exemplos de valores reais] |
| ... | ... | ... | ... |

(Mínimo 10 colunas. Use formato Tabela.Coluna. Inclua valores reais, não genéricos.)
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Queries

| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | Qual o faturamento total? | QA_Faturamento | - | - |
| Q02 | Quanto vendemos este mês? | QA_Venda_Total | - | Calendario.Mês = atual |
| Q03 | Faturamento por filial | QA_Faturamento | [Dimensão].Nome | - |
| Q04 | Top 10 produtos | QA_Venda_Total | Produto.Nome | TOP 10 |
| ... | ... | ... | ... | ... |

(Mínimo 20 queries. Usar as perguntas VALIDADAS na Fase 2.)
(Cada query deve ter sido testada e confirmada que retorna dados corretos.)
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos

## Exemplo 1
**Pergunta:** [Pergunta natural do usuário]
**Medidas:** [QA_Medida usada]
**Agrupadores:** [Coluna ou -]
**Filtros:** [Filtro ou -]
**Resposta:** "[Resposta formatada com valores REAIS obtidos na validação]"
**DAX usado:** `EVALUATE ROW("Faturamento", [QA_Faturamento])`

## Exemplo 2
...

(Mínimo 15 exemplos. Usar dados REAIS da Fase 2, não inventados.)
(INCLUIR o DAX usado após a Resposta em cada exemplo — isso ajuda a IA a montar queries similares.)
(O formato dos campos Pergunta/Medidas/Agrupadores/Filtros/Resposta deve ser IDÊNTICO ao modelo abaixo:)
<!-- END:EXEMPLOS -->
```

---

## ⚠️ REGRAS CRÍTICAS

### OBRIGATÓRIO:
- [ ] Fase 1 executada: medidas QA_ criadas e testadas no modelo
- [ ] Fase 2 executada: pelo menos 20 perguntas validadas com respostas corretas
- [ ] Seção BASE tem instruções específicas para a IA
- [ ] Seção MEDIDAS tem tabela com pelo menos 20 medidas (incluindo QA_)
- [ ] Seção TABELAS tem tabela com pelo menos 10 colunas com valores reais
- [ ] Seção QUERIES tem tabela com pelo menos 20 perguntas VALIDADAS
- [ ] Seção EXEMPLOS tem pelo menos 15 exemplos com DAX usado e valores reais
- [ ] Todos os exemplos usam dados REAIS obtidos na Fase 2

### PROIBIDO:
- ❌ Gerar documentação sem ter criado medidas QA_
- ❌ Gerar documentação sem ter validado perguntas
- ❌ Usar valores inventados nos exemplos (usar valores reais da validação)
- ❌ Deixar seção TABELAS sem colunas
- ❌ Omitir o DAX usado nos exemplos
- ❌ Alterar medidas existentes do modelo (criar novas com prefixo QA_)

### DIFERENÇAS DO v4 → v5:
| Aspecto | v4 (antigo) | v5 (novo) |
|---------|-------------|-----------|
| Medidas | Documenta o que existe | **Cria medidas QA_ otimizadas** |
| Validação | Nenhuma | **20+ perguntas testadas** |
| Exemplos | Valores fictícios | **Valores reais do modelo** |
| DAX nos exemplos | Não inclui | **Inclui DAX usado após Resposta** |
| Instruções IA | Não tem | **Seção de instruções na BASE** |
| Mínimo queries | 10 | **20 validadas** |
| Mínimo exemplos | 5 | **15 com DAX** |

---

## 🔄 FLUXO RESUMIDO

```
1. ANALISAR modelo → Entender tabelas, medidas, relacionamentos
2. CRIAR medidas QA_ → Adicionar ao modelo (não alterar existentes)  
3. TESTAR medidas → Executar DAX e validar resultados
4. FAZER 20+ PERGUNTAS → Simular usuário, anotar respostas
5. CORRIGIR problemas → Ajustar medidas que não funcionaram
6. GERAR DOCUMENTAÇÃO → Usando dados reais das fases anteriores
```

**Comece pela Fase 1. Analise o modelo conectado e me diga quais medidas QA_ você sugere criar.**
