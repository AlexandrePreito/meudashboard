# Documentação Chat IA - Modelo Dias (Cervejaria Dias)

<!-- SECTION:BASE -->
# Visão Geral

## Sobre o Modelo
O modelo **Dias** é o sistema de Business Intelligence da Cervejaria Dias, um restaurante/cervejaria em Goiânia. O modelo integra dados de vendas (PDV), financeiro (contas a pagar/receber, fluxo de caixa e DRE), estoque e gestão de funcionários.

O modelo possui medidas otimizadas com prefixo **QA_** (Query Assistant) na pasta "QA_ Consultas IA", projetadas especificamente para consultas de IA via chat. Para faturamento geral (sem detalhe de produto), usar `[Caixa]`. Para faturamento com detalhe de produto ou garçom, usar `[Vendas Valor Item]` e as demais medidas do conjunto de vendas por item.

O dataset contém 53 tabelas, 278 medidas e cobre dados de vendas, financeiro, DRE e estoque.

> ⚠️ **IMPORTANTE:** As medidas `[Vendas Valor Item]`, `[Vendas sem Servico]`, `[CMV]`, `[Margem Bruta]` etc. operam no contexto de **item de venda** — só funcionam corretamente quando agrupadas por produto, grupo ou garçom. A medida `[Caixa]` opera no contexto de **comanda** e é a correta para faturamento geral.

## Áreas Cobertas
- **Vendas:** Faturamento (`[Caixa]`), vendas por produto/garçom (`[Vendas Valor Item]`), ticket médio, quantidades, CMV, margem
- **Rankings:** Top produtos, garçons, grupos de produto
- **Temporal:** Comparativos MoM, média diária, dias trabalhados
- **Financeiro — Banco:** Saldo atual por conta (`Contas[saldo]`)
- **Financeiro — Fluxo de Caixa:** Entradas `[Recebido]`, saídas `[Pago]`, resultado
- **Contas a Pagar:** `[Pagar]`, vencidos, vencendo hoje
- **Contas a Receber:** `[Receber]`, vencidos, recebendo hoje
- **DRE:** Resultado por regime Caixa ou Competência, estruturado por `Movimentacoes[DRE]`

## Regras de Negócio
- **Faturamento geral** (sem produto/garçom) → usar `[Caixa]`
- **Faturamento por produto ou garçom** → usar `[Vendas Valor Item]` (e conjunto de medidas de item)
- **CMV com produto ou garçom** → usar `[CMV]` de Venda — não perguntar contexto
- **CMV em outros contextos** → perguntar: Venda, DRE ou Fluxo de Caixa?
- **Filtro obrigatório em QUALQUER consulta financeira** (Fluxo de Caixa, DRE, Saldo, CP, CR): `NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"})`
- **Saldo Atual** → `SUM(Contas[saldo])` com filtro de contas — ignora filtro de data, sempre retorna posição atual
- **DRE** → Sempre perguntar regime: Caixa ou Competência?
- **Fluxo de Caixa vs DRE** → Perguntar ao usuário qual deseja
- **CP/CR — Data por Status** → Aberto = `datavenc` (vencimento) / Baixado = `DataEmissaox` (emissão)
- **Credor** → Usar busca parcial com `SEARCH()` — há 693+ credores com nomes longos
- **Categoria de despesa** → Filtrar por `Movimentacoes[Camada04]` para subcategoria específica
- **Taxa de serviço** → `[Servico]` — aproximadamente 10% sobre vendas
- **Margem** = Vendas - CMV (calculado apenas no contexto de item de venda)

## Instruções para a IA
### REGRA 1 — ESCOLHA DA MEDIDA DE FATURAMENTO
- Se a pergunta NÃO menciona produto, garçom, grupo de produto → usar `[Caixa]`
- Se a pergunta MENCIONA produto, garçom, grupo ou categoria → usar `[Vendas Valor Item]`
- Na dúvida, usar `[Caixa]` (é o mais genérico)

### REGRA 2 — FILTRO OBRIGATÓRIO EM QUERIES FINANCEIRAS
TODA query que usa as medidas [Recebido], [Pago], [Pagar], [Receber], [CP Valor Vencidos], [CP Valor Hoje], [CR Valor Vencidos], [CR Valor Hoje], SUM(Contas[saldo]) ou qualquer coisa da tabela Movimentacoes ou Contas DEVE incluir:
```
NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"})
```
SEM EXCEÇÃO. Se esquecer este filtro, os valores estarão ERRADOS.

### REGRA 3 — DRE
- SEMPRE pergunte ao usuário: "Regime Caixa ou Competência?"
- Use EXATAMENTE os nomes das categorias DRE conforme documentado (atenção ao typo: "Adminsitrativas" com i antes do s)

### REGRA 4 — FILTRO DE DATA
- Formato correto: `MONTH(Calendario[Data]) = N, YEAR(Calendario[Data]) = AAAA`
- "hoje" → `Calendario[Data] = TODAY()`
- "ontem" → `Calendario[Data] = TODAY() - 1`
- "este mês" → `MONTH(Calendario[Data]) = MONTH(TODAY()), YEAR(Calendario[Data]) = YEAR(TODAY())`

### REGRA 5 — SALDO BANCÁRIO
- `SUM(Contas[saldo])` IGNORA filtro de data — sempre retorna posição atual
- Sempre incluir `Contas[tipo] = "B"` para filtrar apenas bancos
- Sempre incluir filtro de contas (REGRA 2)

### REGRA 6 — BUSCA DE CREDOR/FORNECEDOR
- Usar SEARCH parcial: `FILTER(Movimentacoes, SEARCH("TERMO", Movimentacoes[credor], 1, 0) > 0)`
- Há 693+ credores — nunca tentar filtro exato

<!-- SECTION:MEDIDAS -->
# Medidas

| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|
| QA_Faturamento | Faturamento total sem taxa de serviço (aponta para [Vendas Valor]) | faturamento, receita, quanto faturou, quanto entrou | Vendas |
| QA_Faturamento_com_Servico | Faturamento incluindo taxa de serviço | faturamento com serviço, faturamento bruto | Vendas |
| QA_Ticket_Medio | Ticket médio por comanda/mesa | ticket médio, consumo médio, média por mesa, média por comanda | Vendas |
| QA_Preco_Medio | Preço médio por item vendido | preço médio, média por item, preço médio produto | Vendas |
| QA_Quantidades | Quantidade total de itens vendidos | quantidade, itens vendidos, volume de vendas | Vendas |
| QA_Dias_Trabalhados | Dias com vendas registradas no período | dias trabalhados, quantos dias, dias operação | Vendas |
| QA_Media_Diaria | Média de faturamento por dia trabalhado | média por dia, venda por dia, media diaria | Vendas |
| QA_Servico | Valor total de taxa de serviço cobrada | taxa de serviço, gorjeta, 10 por cento, serviço | Vendas |
| QA_Desconto | Total de descontos concedidos | desconto, descontos, total desconto | Vendas |
| QA_CMV | Custo da Mercadoria Vendida (contexto item de venda) | CMV, custo, custo de vendas, custo produto | Custos |
| QA_CMV_Percentual | CMV como % do faturamento | CMV percentual, percentual custo, custo relativo | Custos |
| QA_Margem_Bruta | Margem bruta em R$ | margem, lucro bruto, margem em reais | Custos |
| QA_Margem_Percentual | Margem bruta como % | margem percentual, percentual margem, rentabilidade | Custos |
| QA_Custo_Medio | Custo médio por item vendido | custo médio, média de custo por item | Custos |
| QA_Variacao_MoM | Variação % faturamento mês a mês | crescimento mensal, variação mom, comparativo mês, cresceu quanto | Temporal |
| QA_Vendas_Mes_Anterior | Faturamento do mês anterior | mês passado, vendas anteriores, mês anterior, mês passado | Temporal |
| QA_Top1_Produto_Nome | Nome do produto mais vendido em valor | produto mais vendido, top produto, campeão vendas, maior produto | Rankings |
| QA_Top1_Produto_Valor | Valor de vendas do produto mais vendido | valor top produto, quanto vendeu o mais vendido | Rankings |
| QA_Top1_Garcom_Nome | Nome do garçom/funcionário que mais vendeu | melhor garçom, quem mais vendeu, funcionário top, garçom campeão | Rankings |
| QA_Top1_Garcom_Valor | Valor de vendas do garçom líder | quanto vendeu o melhor garçom, valor top garçom | Rankings |
| QA_Top1_Grupo_Nome | Grupo de produto com maior faturamento | grupo mais vendido, categoria campeã, top grupo | Rankings |
| QA_Top1_Grupo_Valor | Valor do grupo de produto líder | valor top grupo, quanto vendeu o grupo campeão | Rankings |
| QA_Top3_Produtos | Top 3 produtos por valor (lista concatenada) | três mais vendidos, top 3 produtos, melhores produtos | Rankings |
| QA_Top3_Garcons | Top 3 garçons por valor de vendas | três melhores garçons, top 3 funcionários, melhores garçons | Rankings |
| QA_Top5_Produtos | Top 5 produtos por valor de vendas | top 5 produtos, cinco mais vendidos | Rankings |
| QA_A_Pagar | Total de contas a pagar (abertas) | a pagar, obrigações, compromissos, contas a pagar | Financeiro |
| QA_A_Receber | Total de contas a receber (abertas) | a receber, recebíveis, créditos pendentes | Financeiro |
| QA_Saldo_Atual | Saldo atual em caixa e bancos (ignora filtro de data) | saldo, saldo atual, posição financeira, caixa banco | Financeiro |
| Caixa | Faturamento total por comanda (uso sem produto/garçom) | faturamento, caixa, quanto entrou no caixa | Vendas |
| Vendas Valor Item | Faturamento por item (uso com produto ou garçom) | faturamento por produto, vendas por garçom, faturamento item | Vendas |
| Vendas sem Servico | Faturamento sem taxa de serviço por item | vendas líquidas, sem serviço, sem taxa | Vendas |
| Servico | Taxa de serviço por item | taxa serviço por item, gorjeta item | Vendas |
| Margem Bruta | Margem bruta por item | margem por produto, lucro por item | Custos |
| Margem Percentual | Margem % por item | percentual margem produto, rentabilidade produto | Custos |
| CMV | CMV de venda por item | CMV produto, custo mercadoria produto | Custos |
| Preço Medio | Preço médio por item | preço médio item, ticket por item | Vendas |
| Quantidades | Quantidade de itens por contexto | quantidade produto, qtd garçom, volume item | Vendas |
| Ticket Medio | Ticket médio por comanda | ticket médio, consumo médio | Vendas |
| Dias Trabalhados | Dias com operação no período | dias trabalhados, dias operação | Vendas |
| Venda Media Dia | Média diária de faturamento | média diária, venda por dia | Vendas |
| Recebido | Entradas efetivadas (fluxo de caixa) | recebimentos, entradas pagas, quanto recebeu | Fluxo Caixa |
| Pago | Saídas efetivadas — valor negativo (fluxo de caixa) | pagamentos, saídas, despesas pagas, quanto pagou | Fluxo Caixa |
| Pagar | Contas a pagar (CP) — valor bruto | contas a pagar, CP, pagar | CP |
| Receber | Contas a receber (CR) — valor bruto | contas a receber, CR, receber | CR |
| CP Valor Vencidos | Contas a pagar vencidas (atrasadas) | atrasado pagar, vencido pagar, inadimplente pagar | CP |
| CP Valor Hoje | Contas a pagar vencendo hoje | pagar hoje, vence hoje pagar | CP |
| CR Valor Vencidos | Contas a receber vencidas (atrasadas) | atrasado receber, vencido receber, inadimplência | CR |
| CR Valor Hoje | Contas a receber vencendo hoje | receber hoje, vence hoje receber | CR |
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Colunas

| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| Calendario.Data | DateTime | Filtro | Range completo de datas do negócio |
| Calendario.Ano | Int64 | Filtro, Agrupar | 2023, 2024, 2025, 2026 |
| Calendario.Mês | Int64 | Filtro, Agrupar | 1 a 12 |
| Calendario.Nome do Mês | String | Agrupar, Exibir | Janeiro, Fevereiro, Março... Dezembro |
| Calendario.Dia | Int64 | Filtro, Agrupar | 1 a 31 |
| Calendario.Dia da Semana | Int64 | Filtro, Agrupar | 1 (Dom), 2 (Seg), 3 (Ter), 4 (Qua), 5 (Qui), 6 (Sex), 7 (Sab) |
| Calendario.Nome do Dia | String | Agrupar, Exibir | Domingo, Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado |
| Calendario.Mês Ano | String | Agrupar, Exibir | Jan/2025, Fev/2025, Mar/2025... |
| VendaItemGeral.material_descr | String | Filtro, Agrupar | CHOPE PILSEN 355ML, COUVERT, CHOPE PILSEN HH, DADINHOS DE QUEIJO... |
| VendaItemGeral.grupo_id | String | Filtro | ID do grupo de material |
| GrupoMaterial.descricao | String | Filtro, Agrupar | PETISCOS, PILSEN, DIVERSOS, MP - HORTIFRUTIGRANJEIROS, BEBIDAS DE REVENDA... |
| Funcionario.nome | String | Filtro, Agrupar | CLEBER, RODRIGO, OLIVER, DAVI, RIQUELME... |
| Movimentacoes.Camada01 | String | Filtro | Entradas, Saídas |
| Movimentacoes.Camada02 | String | Filtro, Agrupar | Contas do Ativo, Contas do Passivo |
| Movimentacoes.Camada03 | String | Filtro, Agrupar | EVENTOS EXTERNOS, GASTOS OPERACIONAIS, RECEITAS... |
| Movimentacoes.Camada04 | String | Filtro, Agrupar | ALUGUEL, SALARIOS/FOLHA DE PAGAMENTO, ENERGIA ELETRICA, GORJETAS, PROTEINAS / CARNES IN, ATACADO/ESTOQUE SECO/MERCEARIA, GERADOR DE ENERGIA... |
| Movimentacoes.Camada05 | String | Detalhe | Detalhe da movimentação |
| Movimentacoes.credor | String | Filtro (busca parcial) | 693+ credores: ITAU, BRAHMA, AMBEV, fornecedores... |
| Movimentacoes.datavenc | DateTime | Filtro (status Aberto) | Data de vencimento do título |
| Movimentacoes.DataEmissaox | DateTime | Filtro (status Baixado) | Data de emissão/pagamento |
| Movimentacoes.Tipo | String | Filtro | Receber, Pagar |
| Movimentacoes.Status | String | Filtro | Baixado, Aberto |
| Movimentacoes.DRE | String | Filtro DRE | (-) CMV - Restaurante, (-) CMV - Fábrica, (-) CMV - Eventos, (-) Impostos, (-) Desp. Adminsitrativas, (-) Desp. Colaboradores, (-) Marketing, (-) Despesas Financeiras, (-) Imobilizado, (+) Eventos, Sem Classificação |
| Contas.conta | String | Filtro, Agrupar | BANCO BRASIL, BANCO INTER, BANCO ITAU ALIM, BANCO ITAU CERV, BANCO ITAU DELI, CARTAO PAGBANK, CARTAO REDE, CIELO, CONTA ASSINADA, CONTA GAR. CAR., CONTA GARANTIDA, DELIVERY CAIXA, EVENTOS, FUNDO DE CAIXA, FUNDO FIXO, IFOOD ITAU, REDE ALIMENTOS, STAY BANK (excluir: ACERTO CX, VOUCHER, CORREÇÃO DADOS) |
| Contas.tipo | String | Filtro | B (Banco), C (Caixa) |
| Contas.saldo | Double | Análise | Saldo atual da conta |
| EstruturaDRE.Categoria | String | Estrutura DRE | (=) Faturamento, (+) Restaurante, (+) Cervejaria, (+) Eventos, (-) Impostos, (-) CMV - Restaurante, (-) CMV - Fábrica... |
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Queries

| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | Qual o faturamento total? | QA_Faturamento / [Caixa] | - | - |
| Q02 | Qual o faturamento deste mês? | [Caixa] | - | Calendario.Mês = atual, Calendario.Ano = atual |
| Q03 | Faturamento de janeiro de 2026? | [Caixa] | - | Mês=1, Ano=2026 |
| Q04 | Qual o faturamento por mês? | [Caixa] | Calendario.Mês Ano | - |
| Q05 | Qual o ticket médio? | QA_Ticket_Medio / [Ticket Medio] | - | Filtro de período |
| Q06 | Top 3 produtos mais vendidos | [Vendas Valor Item] | VendaItemGeral.material_descr | TOP 3 |
| Q07 | Top 5 produtos mais vendidos | [Vendas Valor Item] | VendaItemGeral.material_descr | TOP 5 |
| Q08 | Top 10 produtos mais vendidos | [Vendas Valor Item] | VendaItemGeral.material_descr | TOP 10 |
| Q09 | Quais os grupos/categorias mais vendidas? | [Vendas Valor Item] | GrupoMaterial.descricao | TOP 5 |
| Q10 | Qual o produto mais vendido? | QA_Top1_Produto_Nome, QA_Top1_Produto_Valor | - | Filtro de período |
| Q11 | Quem mais vendeu? / Top garçons | [Vendas Valor Item] | Funcionario.nome | TOP 5 |
| Q12 | Qual garçom vendeu mais? | QA_Top1_Garcom_Nome, QA_Top1_Garcom_Valor | - | Filtro de período |
| Q13 | Qual a margem do produto X? | [Margem Percentual] | VendaItemGeral.material_descr | Filtrar material_descr |
| Q14 | CMV do restaurante? | [Pago] (DRE) | - | DRE = "(-) CMV - Restaurante" + filtro contas |
| Q15 | Como estamos comparado ao mês anterior? | QA_Variacao_MoM, QA_Vendas_Mes_Anterior | - | - |
| Q16 | Qual o saldo atual? | [Saldo Atual] / QA_Saldo_Atual | - | Filtro de contas (excluir ACERTO CX, VOUCHER, CORREÇÃO DADOS) |
| Q17 | Saldo por banco? | SUM(Contas.saldo) | Contas.conta | Contas.tipo = B, excluir contas inválidas |
| Q18 | Quanto recebemos em janeiro? | [Recebido] | - | Mês=1, Ano=2026 + filtro contas |
| Q19 | Quanto pagamos em janeiro? | [Pago] | - | Mês=1, Ano=2026 + filtro contas |
| Q20 | Resultado do fluxo de caixa de janeiro? | [Recebido] + [Pago] | - | Mês=1, Ano=2026 + filtro contas |
| Q21 | Quanto temos a pagar? / Contas a pagar | [Pagar] / QA_A_Pagar | - | Filtro de status ou período |
| Q22 | Quanto temos a receber? / Contas a receber | [Receber] / QA_A_Receber | - | Filtro de status ou período |
| Q23 | Contas a pagar atrasadas? / Vencidas? | [CP Valor Vencidos] | - | - |
| Q24 | Contas a receber atrasadas? / Vencidas? | [CR Valor Vencidos] | - | - |
| Q25 | O que vence hoje para pagar? | [CP Valor Hoje] | - | - |
| Q26 | Despesa com aluguel? | [Pago] | - | Camada04 = "ALUGUEL" + filtro contas + período |
| Q27 | Despesa com energia elétrica? | [Pago] | - | Camada04 = "ENERGIA ELETRICA" + filtro contas |
| Q28 | Despesa com salários? | [Pago] | - | Camada04 = "SALARIOS/FOLHA DE PAGAMENTO" |
| Q29 | Quanto pagamos para o Itaú? | [Pago] | - | SEARCH("ITAU", credor) + filtro contas |
| Q30 | Despesas por categoria (Camada04) | [Pago] | Movimentacoes.Camada04 | Filtro contas + período |
| Q31 | DRE de janeiro? (regime caixa) | [Pago] / [Recebido] / [Caixa] | EstruturaDRE.Categoria | DRE mapeado + filtro contas |
| Q32 | Faturamento do DRE — quanto foi Restaurante vs Cervejaria vs Eventos? | [Caixa] / [Recebido] | Categoria DRE | Filtro de período |
| Q33 | Qual o resultado operacional? | calculado via DRE | - | Regime + período + filtro contas |
| Q34 | Vendas por dia da semana | [Caixa] | Calendario.Nome do Dia | Filtro de período |
| Q35 | Quantos dias trabalhamos este mês? | QA_Dias_Trabalhados | - | Filtro de período |
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos

## Exemplo 1
**Pergunta:** Qual o faturamento de janeiro de 2026?
**Medidas:** [Caixa]
**Agrupadores:** -
**Filtros:** Calendario.Mês = 1, Calendario.Ano = 2026
**Resposta:** "O faturamento de janeiro de 2026 foi de R$ 569.356,03."
**DAX usado:** `EVALUATE ROW("Caixa Jan 2026", CALCULATE([Caixa], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 2
**Pergunta:** Qual o ticket médio de janeiro de 2026?
**Medidas:** [Ticket Medio]
**Agrupadores:** -
**Filtros:** Mês = 1, Ano = 2026
**Resposta:** "O ticket médio de janeiro de 2026 foi de R$ 148,90."
**DAX usado:** `EVALUATE ROW("Ticket Medio", CALCULATE([Ticket Medio], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 3
**Pergunta:** Quantos itens vendemos em janeiro de 2026?
**Medidas:** [Quantidades]
**Agrupadores:** -
**Filtros:** Mês = 1, Ano = 2026
**Resposta:** "Em janeiro de 2026 foram vendidos 26.323 itens."
**DAX usado:** `EVALUATE ROW("Qtd Jan 2026", CALCULATE([Quantidades], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 4
**Pergunta:** Quais os top 3 produtos mais vendidos em janeiro de 2026?
**Medidas:** [Vendas Valor Item]
**Agrupadores:** VendaItemGeral.material_descr
**Filtros:** TOP 3, Mês = 1, Ano = 2026
**Resposta:** "Os 3 produtos mais vendidos em janeiro de 2026 foram: 1. CHOPE PILSEN 355ML — R$ 63.282,54 | 2. CHOPE PILSEN HH — R$ 19.499,65 | 3. COUVERT — R$ 18.215,36."
**DAX usado:** `EVALUATE TOPN(3, SUMMARIZECOLUMNS(VendaItemGeral[material_descr], "Faturamento", CALCULATE([Vendas Valor Item], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026)), [Faturamento], DESC)`

## Exemplo 5
**Pergunta:** Quais os grupos de produto mais vendidos em janeiro de 2026?
**Medidas:** [Vendas Valor Item]
**Agrupadores:** GrupoMaterial.descricao
**Filtros:** TOP 3, Mês = 1, Ano = 2026
**Resposta:** "Os 3 grupos mais vendidos em janeiro de 2026 foram: 1. PETISCOS — R$ 116.634,53 | 2. PILSEN — R$ 94.604,44 | 3. DIVERSOS — R$ 41.898,50."
**DAX usado:** `EVALUATE TOPN(3, SUMMARIZECOLUMNS(GrupoMaterial[descricao], "Faturamento", CALCULATE([Vendas Valor Item], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026)), [Faturamento], DESC)`

## Exemplo 6
**Pergunta:** Top 5 garçons que mais venderam em janeiro de 2026?
**Medidas:** [Vendas Valor Item]
**Agrupadores:** Funcionario.nome
**Filtros:** TOP 5, Mês = 1, Ano = 2026
**Resposta:** "Os 5 garçons que mais venderam em janeiro de 2026: 1. CLEBER — R$ 75.900,65 | 2. RODRIGO — R$ 70.975,18 | 3. OLIVER — R$ 65.856,12 | 4. DAVI — R$ 63.326,38 | 5. RIQUELME — R$ 62.065,68."
**DAX usado:** `EVALUATE TOPN(5, SUMMARIZECOLUMNS(Funcionario[nome], "Faturamento", CALCULATE([Vendas Valor Item], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026)), [Faturamento], DESC)`

## Exemplo 7
**Pergunta:** Qual a margem do Chope Pilsen 355ml em janeiro de 2026?
**Medidas:** [Margem Percentual]
**Agrupadores:** VendaItemGeral.material_descr
**Filtros:** material_descr = "CHOPE PILSEN 355ML", Mês = 1, Ano = 2026
**Resposta:** "A margem bruta do CHOPE PILSEN 355ML em janeiro de 2026 foi de 78,79%."
**DAX usado:** `EVALUATE FILTER(SUMMARIZECOLUMNS(VendaItemGeral[material_descr], "Margem %", CALCULATE([Margem Percentual], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026)), VendaItemGeral[material_descr] = "CHOPE PILSEN 355ML")`

## Exemplo 8
**Pergunta:** Qual o saldo atual dos bancos e caixas?
**Medidas:** SUM(Contas.saldo)
**Agrupadores:** -
**Filtros:** excluir ACERTO CX, VOUCHER, CORREÇÃO DADOS
**Resposta:** "O saldo atual consolidado em caixas e bancos é de -R$ 50.991,20." (saldo atual na data da consulta)
**DAX usado:** `EVALUATE ROW("Saldo Total", CALCULATE(SUM(Contas[saldo]), NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"})))`

## Exemplo 9
**Pergunta:** Quanto recebemos e pagamos em janeiro de 2026?
**Medidas:** [Recebido], [Pago]
**Agrupadores:** -
**Filtros:** Mês = 1, Ano = 2026 + filtro de contas
**Resposta:** "Em janeiro de 2026: Entradas (Recebido) — R$ 574.433,28 | Saídas (Pago) — R$ 833.853,14 | Resultado — -R$ 259.419,86."
**DAX usado:** `EVALUATE ROW("Recebido", CALCULATE([Recebido], NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026), "Pago", CALCULATE([Pago], NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 10
**Pergunta:** Quanto temos de contas a pagar atrasadas?
**Medidas:** [CP Valor Vencidos]
**Agrupadores:** -
**Filtros:** -
**Resposta:** "Há R$ 713.822,48 em contas a pagar vencidas (atrasadas)."
**DAX usado:** `EVALUATE ROW("CP Vencidos", [CP Valor Vencidos])`

## Exemplo 11
**Pergunta:** Quanto temos de contas a receber atrasadas?
**Medidas:** [CR Valor Vencidos]
**Agrupadores:** -
**Filtros:** -
**Resposta:** "Há R$ 379.561,82 em contas a receber vencidas (em atraso de clientes)."
**DAX usado:** `EVALUATE ROW("CR Vencidos", [CR Valor Vencidos])`

## Exemplo 12
**Pergunta:** Quanto temos a pagar hoje?
**Medidas:** [CP Valor Hoje]
**Agrupadores:** -
**Filtros:** -
**Resposta:** "Hoje vencem R$ 7.624,66 em contas a pagar."
**DAX usado:** `EVALUATE ROW("CP Hoje", [CP Valor Hoje])`

## Exemplo 13
**Pergunta:** Qual foi a despesa com aluguel em janeiro de 2026?
**Medidas:** [Pago]
**Agrupadores:** -
**Filtros:** Camada04 = "ALUGUEL", Mês = 1, Ano = 2026 + filtro de contas
**Resposta:** "A despesa com aluguel em janeiro de 2026 foi de R$ 36.509,48."
**DAX usado:** `EVALUATE ROW("Aluguel", CALCULATE([Pago], Movimentacoes[Camada04] = "ALUGUEL", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 14
**Pergunta:** Qual o faturamento do DRE de janeiro de 2026? Quanto foi Restaurante, Cervejaria e Eventos?
**Medidas:** [Caixa] para Restaurante, [Recebido] para Cervejaria e Eventos
**Agrupadores:** -
**Filtros:** Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "Faturamento DRE de janeiro de 2026 — (=) Total: R$ 640.849,93 | (+) Restaurante ([Caixa]): R$ 569.356,03 | (+) Cervejaria (DRE = 'Sem Classificação'): R$ 41.313,95 | (+) Eventos (DRE = '(+) Eventos'): R$ 30.179,95."
**DAX usado:** `EVALUATE ROW("Restaurante", CALCULATE([Caixa], MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026), "Cervejaria", CALCULATE([Recebido], Movimentacoes[DRE] = "Sem Classificação", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026), "Eventos", CALCULATE([Recebido], Movimentacoes[DRE] = "(+) Eventos", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 15
**Pergunta:** Quanto foram as despesas administrativas e de colaboradores em janeiro de 2026?
**Medidas:** [Pago]
**Agrupadores:** -
**Filtros:** DRE filtrado + Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "Em janeiro de 2026: Despesas Administrativas — R$ 194.623,51 | Despesas com Colaboradores — R$ 315.750,70."
**DAX usado:** `EVALUATE ROW("Adm", CALCULATE([Pago], Movimentacoes[DRE] = "(-) Desp. Adminsitrativas", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026), "Colaboradores", CALCULATE([Pago], Movimentacoes[DRE] = "(-) Desp. Colaboradores", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 16
**Pergunta:** Quanto pagamos para o Itaú em janeiro de 2026?
**Medidas:** [Pago]
**Agrupadores:** -
**Filtros:** SEARCH("ITAU", credor) + Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "Os pagamentos para credores com 'ITAU' no nome em janeiro de 2026 totalizaram [valor]. Use a busca parcial SEARCH para localizar o credor correto."
**DAX usado:** `EVALUATE ROW("Pago Itau", CALCULATE([Pago], FILTER(Movimentacoes, SEARCH("ITAU", Movimentacoes[credor], 1, 0) > 0), NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 17
**Pergunta:** Quais as maiores despesas por subcategoria em janeiro de 2026?
**Medidas:** [Pago]
**Agrupadores:** Movimentacoes.Camada04
**Filtros:** TOP 5 (ASC = maiores despesas), Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "As 5 maiores despesas por subcategoria em janeiro de 2026: 1. SALARIOS/FOLHA DE PAGAMENTO — R$ 130.023,83 | 2. PROTEINAS / CARNES IN — R$ 80.625,50 | 3. ATACADO/ESTOQUE SECO/MERCEARIA — R$ 57.793,49 | 4. GORJETAS — R$ 51.094,31 | 5. ENERGIA ELETRICA — R$ 41.774,60."
**DAX usado:** `EVALUATE TOPN(5, SUMMARIZECOLUMNS(Movimentacoes[Camada04], "Pago", CALCULATE([Pago], NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026)), [Pago], ASC)`

## Exemplo 18
**Pergunta:** Qual o CMV do restaurante no DRE de janeiro de 2026?
**Medidas:** [Pago]
**Agrupadores:** -
**Filtros:** DRE = "(-) CMV - Restaurante", Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "O CMV do Restaurante em janeiro de 2026 (DRE) foi de R$ 188.193,48."
**DAX usado:** `EVALUATE ROW("CMV Restaurante", CALCULATE([Pago], Movimentacoes[DRE] = "(-) CMV - Restaurante", NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}), MONTH(Calendario[Data]) = 1, YEAR(Calendario[Data]) = 2026))`

## Exemplo 19
**Pergunta:** Qual o resultado operacional de janeiro de 2026?
**Medidas:** [Caixa] + [Pago] (DREs filtrados)
**Agrupadores:** -
**Filtros:** DREs operacionais + Mês = 1, Ano = 2026 + filtro contas
**Resposta:** "O resultado operacional de janeiro de 2026 (regime caixa) foi de -R$ 125.872,99. O resultado financeiro (incluindo despesas financeiras) foi de -R$ 132.767,10 e o resultado final (lucro) foi de -R$ 170.485,38."
**DAX usado:** Somar `[Caixa]` (Faturamento Restaurante) + `[Recebido]` (Cervejaria e Eventos) + `[Pago]` filtrado por DREs: `(-) Impostos`, `(-) CMV - Restaurante`, `(-) CMV - Fábrica`, `(-) CMV - Eventos`, `(-) Desp. Adminsitrativas`, `(-) Desp. Colaboradores`, `(-) Marketing`

## Exemplo 20
**Pergunta:** Saldo por banco — qual banco tem mais saldo?
**Medidas:** SUM(Contas.saldo)
**Agrupadores:** Contas.conta
**Filtros:** Contas.tipo = "B", excluir contas inválidas
**Resposta:** "Saldo por conta bancária (atual): CARTAO REDE — R$ 76.257,46 | REDE ALIMENTOS — R$ 64.273,29 | BANCO ITAU DELI — R$ 16.950,70 | BANCO BRASIL — R$ 1.181,71 | CARTAO PAGBANK — R$ 1.065,92 | IFOOD ITAU — R$ 623,91 | BANCO INTER — R$ 0 | CONTA GAR. CAR. — R$ 0 | CIELO — R$ 0 | CONTA GARANTIDA — -R$ 168.794,78 | BANCO ITAU CERV — -R$ 82.900,09 | BANCO ITAU ALIM — -R$ 15.430,42."
**DAX usado:** `EVALUATE SUMMARIZECOLUMNS(Contas[conta], Contas[tipo], Contas[saldo], KEEPFILTERS(FILTER(ALL(Contas), Contas[tipo] = "B" && NOT(Contas[conta] IN {"ACERTO CX", "VOUCHER", "CORREÇÃO DADOS"}))))`
<!-- END:EXEMPLOS -->

---

## 📐 Mapeamento DRE Completo — Regime Caixa (Janeiro/2026 validado)

| Categoria DRE | Medida/Filtro | Valor Jan/2026 |
|---|---|---|
| **(=) Faturamento Total** | Soma das 3 linhas abaixo | **R$ 640.849,93** |
| **(+) Restaurante** | `[Caixa]` | R$ 569.356,03 |
| **(+) Cervejaria** | `[Recebido]` onde `DRE = "Sem Classificação"` | R$ 41.313,95 |
| **(+) Eventos** | `[Recebido]` onde `DRE = "(+) Eventos"` | R$ 30.179,95 |
| **(-) Impostos** | `[Pago]` onde `DRE = "(-) Impostos"` | R$ 26.435,15 |
| **(-) CMV - Restaurante** | `[Pago]` onde `DRE = "(-) CMV - Restaurante"` | R$ 188.193,48 |
| **(-) CMV - Fábrica** | `[Pago]` onde `DRE = "(-) CMV - Fábrica"` | R$ 32.243,83 |
| **(-) CMV - Eventos** | `[Pago]` onde `DRE = "(-) CMV - Eventos"` | R$ 4.176,25 |
| **(-) Desp. Administrativas** | `[Pago]` onde `DRE = "(-) Desp. Adminsitrativas"` *(atenção ao typo)* | R$ 194.623,51 |
| **(-) Desp. Colaboradores** | `[Pago]` onde `DRE = "(-) Desp. Colaboradores"` | R$ 315.750,70 |
| **(-) Marketing** | `[Pago]` onde `DRE = "(-) Marketing"` | R$ 5.300,00 |
| **(-) Despesas Financeiras** | `[Pago]` onde `DRE = "(-) Despesas Financeiras"` | R$ 6.894,11 |
| **(-) Imobilizado** | `[Pago]` onde `DRE = "(-) Imobilizado"` | R$ 37.718,28 |
| **(=) Resultado Operacional** | Faturamento - Impostos - CMVs - Adm - Colaboradores - Marketing | **-R$ 125.872,99** |
| **(=) Resultado Financeiro** | Resultado Operacional - Desp. Financeiras | **-R$ 132.767,10** |
| **(=) Resultado Final** | Resultado Financeiro + Rec. não Operacionais - Imobilizado | **-R$ 170.485,38** |

> ⚠️ **Atenção ao typo no modelo:** `DRE = "(-) Desp. Adminsitrativas"` (com "i" antes do "s") — usar exatamente esse texto no filtro DAX.

---
*Documentação gerada em 06/03/2026 — Conectada ao modelo Power BI Desktop (Dias, porta 58750) e validada com dados reais.*
