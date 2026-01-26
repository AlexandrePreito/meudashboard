Você é um especialista em Power BI e vai gerar uma documentação estruturada do modelo conectado.

## OBJETIVO
Gerar documentação para um sistema de IA que irá:
- Responder perguntas dos usuários
- Treinar exemplos de perguntas e respostas
- Configurar alertas automáticos

## FORMATO OBRIGATÓRIO
Use EXATAMENTE as tags <!-- SECTION:NOME --> e <!-- END:NOME --> conforme abaixo.
O sistema faz parse automático dessas tags.

## EXECUTE ESTAS OPERAÇÕES:

1. Liste todas as tabelas (table_operations: List)
2. Liste todas as medidas com fórmulas (measure_operations: List e Get)
3. Liste relacionamentos (relationship_operations: List)
4. Liste colunas das tabelas principais (column_operations: List)

## GERE A DOCUMENTAÇÃO NESTE FORMATO EXATO:

<!-- SECTION:BASE -->
# Visão Geral do Modelo

## Informações do Modelo
- **Tabelas:** [quantidade]
- **Medidas:** [quantidade]
- **Relacionamentos:** [quantidade]

## Áreas Cobertas
[Liste apenas áreas que EXISTEM no modelo]
- [Área]: [descrição]

## Estrutura Principal

### Tabelas Fato
| Tabela | Descrição | Colunas Principais |
|--------|-----------|-------------------|

### Tabelas Dimensão
| Tabela | Descrição | Uso |
|--------|-----------|-----|

## Relacionamentos Principais
| De | Para | Tipo | Coluna |
|----|------|------|--------|

## Regras de Negócio
- [regras identificadas no modelo]
<!-- END:BASE -->

<!-- SECTION:MEDIDAS -->
# Medidas DAX

## Lista de Medidas
| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|

## Detalhamento

### [NomeMedida]
- **Descrição:** [descrição]
- **Quando usar:** [tipos de perguntas]
- **Área:** [área]
- **Fórmula:**
```dax
[fórmula]
```
- **Tabela origem:** [tabela]
- **Colunas usadas:** [colunas]
- **Formato:** [moeda/número/percentual]

[Repetir para cada medida]
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Tabelas e Colunas

## Colunas de Tempo
| Coluna | Formato | Uso | Valores |
|--------|---------|-----|---------|
| Calendario.Ano | Tabela.Coluna | Filtro, Agrupar | 2023, 2024 |
| Calendario.Mês | Tabela.Coluna | Filtro, Agrupar | 1-12 |
| Calendario.Nome do Mês | Tabela.Coluna | Agrupar | Janeiro, Fevereiro |

## Colunas de Dimensão

### [NomeTabela]
| Coluna | Formato | Uso | Valores |
|--------|---------|-----|---------|
| [Tabela].[Coluna] | Tabela.Coluna | [Filtro/Agrupar] | [exemplos] |

## Colunas de Status/Tipo
| Coluna | Valores Possíveis | Descrição |
|--------|-------------------|-----------|
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Queries Pré-configuradas

## Queries de Totais
| ID | Pergunta Exemplo | Medidas | Agrupadores | Filtros |
|----|------------------|---------|-------------|---------|
| Q001 | [pergunta] | [Medida] | - | - |

## Queries por Tempo
| ID | Pergunta Exemplo | Medidas | Agrupadores | Filtros |
|----|------------------|---------|-------------|---------|
| Q010 | Faturamento por mês | [Medida] | Calendario.Mês | - |
| Q011 | Vendas por dia da semana | [Medida] | Calendario.Nome do Dia | - |

## Queries por Dimensão
| ID | Pergunta Exemplo | Medidas | Agrupadores | Filtros |
|----|------------------|---------|-------------|---------|
| Q020 | Top produtos vendidos | [Medida] | [Tabela.Coluna] | - |

## Queries Combinadas
| ID | Pergunta Exemplo | Medidas | Agrupadores | Filtros |
|----|------------------|---------|-------------|---------|
| Q030 | Vendas por produto por mês | [Medida] | [Dim], Calendario.Mês | - |
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos de Perguntas e Respostas

## Exemplo 1: Total Simples
**Pergunta:** Qual o faturamento total?
**Medidas:** [Medida]
**Agrupadores:** -
**Filtros:** -
**Resposta modelo:** "O faturamento total é de R$ [valor]."

## Exemplo 2: Com Filtro de Tempo
**Pergunta:** Qual o faturamento de janeiro?
**Medidas:** [Medida]
**Filtros:** Calendario.Mês = 1
**Resposta modelo:** "O faturamento de janeiro foi de R$ [valor]."

## Exemplo 3: Com Agrupamento
**Pergunta:** Quais os produtos mais vendidos?
**Medidas:** [Medida]
**Agrupadores:** [Tabela.Coluna]
**Ordenação:** DESC
**Limite:** TOP 10
**Resposta modelo:** "Os 10 produtos mais vendidos são: 1) [produto] ([valor])..."

## Exemplo 4: Por Tempo
**Pergunta:** Como foram as vendas por mês?
**Medidas:** [Medida]
**Agrupadores:** Calendario.Mês
**Resposta modelo:** "A evolução de vendas por mês: Janeiro R$ [valor], Fevereiro R$ [valor]..."

## Exemplo 5: Comparação
**Pergunta:** Qual a diferença entre janeiro e fevereiro?
**Medidas:** [Medida]
**Agrupadores:** Calendario.Nome do Mês
**Filtros:** Calendario.Mês IN (1, 2)
**Resposta modelo:** "Janeiro teve R$ [valor] e Fevereiro R$ [valor]. Diferença de R$ [diff]."

[Adicionar mais exemplos conforme as medidas do modelo]
<!-- END:EXEMPLOS -->

---

## REGRAS
1. Use APENAS o que existe no modelo
2. Formato Tabela.Coluna para colunas
3. Queries realistas para o negócio
4. Ignore colunas técnicas (IDs, FKs)

## VERIFICAÇÃO
- [ ] Todas as seções têm tags corretas
- [ ] Todas as medidas documentadas
- [ ] Colunas no formato Tabela.Coluna
- [ ] Queries cobrem combinações úteis
