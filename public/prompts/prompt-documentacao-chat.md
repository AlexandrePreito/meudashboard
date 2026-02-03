# 📊 PROMPT v4 - Documentação para Chat IA
## FORMATO OBRIGATÓRIO COM TABELAS

---

## ⚠️ REGRA CRÍTICA
**TODAS as 5 seções são OBRIGATÓRIAS e devem usar TABELA MARKDOWN.**

O sistema REJEITARÁ documentações que:
- ❌ Não tenham a seção TABELAS
- ❌ Não tenham a seção QUERIES em formato de TABELA
- ❌ Usem código DAX solto em vez de tabela

---

## INSTRUÇÕES

1. Analise o modelo Power BI conectado
2. Preencha TODAS as 5 seções abaixo
3. Use EXATAMENTE os formatos de tabela especificados
4. NÃO coloque queries em formato de código - use TABELA

---

## FORMATO OBRIGATÓRIO DE SAÍDA

Copie e preencha EXATAMENTE este template:

```markdown
<!-- SECTION:BASE -->
# [Nome do Modelo]

## Sobre
[Descrição do modelo - 2-3 parágrafos]

## Áreas de Negócio
- **[Área 1]:** [descrição]
- **[Área 2]:** [descrição]

## Regras Importantes
- [Regra 1]
- [Regra 2]
<!-- END:BASE -->

<!-- SECTION:MEDIDAS -->
# Medidas Disponíveis

| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|
| NomeMedida1 | Descrição da medida | palavras, chave, busca | Área |
| NomeMedida2 | Descrição da medida | palavras, chave, busca | Área |
| NomeMedida3 | Descrição da medida | palavras, chave, busca | Área |

(Mínimo 20 medidas)
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Colunas para Filtros e Agrupamentos

| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| Calendario[Ano] | Número | Filtro/Agrupar | 2023, 2024, 2025 |
| Calendario[Mes] | Número | Filtro/Agrupar | 1, 2, 3... 12 |
| Calendario[NomeMes] | Texto | Agrupar | Janeiro, Fevereiro... |
| Empresa[Nome] | Texto | Filtro/Agrupar | Lista de empresas |
| Filial[Nome] | Texto | Filtro/Agrupar | Lista de filiais |
| Vendedor[Nome] | Texto | Filtro/Agrupar | Nomes de vendedores |
| Produto[Nome] | Texto | Filtro/Agrupar | Nomes de produtos |
| Produto[Categoria] | Texto | Filtro/Agrupar | Categorias |

(Mínimo 10 colunas - liste todas as colunas úteis para filtrar ou agrupar dados)
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Mapeamento de Perguntas

| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | Qual o faturamento total? | Faturamento | - | - |
| Q02 | Qual o faturamento deste mês? | Faturamento | - | Mes atual |
| Q03 | Qual o faturamento por filial? | Faturamento | Filial[Nome] | - |
| Q04 | Quem são os top 10 vendedores? | Faturamento | Vendedor[Nome] | TOP 10 |
| Q05 | Qual o ticket médio? | TicketMedio | - | - |
| Q06 | Quantas vendas foram feitas? | QtdVendas | - | - |
| Q07 | Qual o faturamento por mês? | Faturamento | Calendario[NomeMes] | - |
| Q08 | Quais os produtos mais vendidos? | QtdVendas | Produto[Nome] | TOP 10 |
| Q09 | Qual o faturamento de janeiro? | Faturamento | - | Mes = 1 |
| Q10 | Como está a evolução mensal? | Faturamento | Calendario[NomeMes] | Ano atual |

(Mínimo 10 queries - mapeie perguntas comuns que usuários farão)
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos de Perguntas e Respostas

## Exemplo 1
**Pergunta:** Qual o faturamento total?
**Medidas:** Faturamento
**Agrupadores:** -
**Filtros:** -
**Resposta:** "O faturamento total é de **R$ 1.234.567,89**."

## Exemplo 2
**Pergunta:** Quem são os 5 melhores vendedores?
**Medidas:** Faturamento
**Agrupadores:** Vendedor[Nome]
**Filtros:** TOP 5
**Resposta:** "Os 5 melhores vendedores são:
1. João Silva - R$ 150.000
2. Maria Santos - R$ 120.000
3. Pedro Costa - R$ 100.000
4. Ana Souza - R$ 90.000
5. Carlos Lima - R$ 80.000"

## Exemplo 3
**Pergunta:** Qual o faturamento de novembro?
**Medidas:** Faturamento
**Agrupadores:** -
**Filtros:** Mes = 11
**Resposta:** "O faturamento de novembro foi de **R$ 234.567,89**."

(Mínimo 5 exemplos)
<!-- END:EXEMPLOS -->
```

---

## CHECKLIST ANTES DE ENVIAR

Verifique OBRIGATORIAMENTE:

- [ ] Seção BASE tem descrição do modelo e regras
- [ ] Seção MEDIDAS tem tabela com pelo menos 20 medidas
- [ ] Seção TABELAS tem tabela com pelo menos 10 colunas
- [ ] Seção QUERIES tem tabela com pelo menos 10 perguntas mapeadas
- [ ] Seção EXEMPLOS tem pelo menos 5 exemplos completos

**Se alguma seção estiver faltando ou não usar formato de tabela, o sistema REJEITARÁ a documentação!**

---

## ❌ ERROS COMUNS - NÃO FAÇA ISSO

### ERRADO - Queries em código DAX:
```markdown
### Q01 - Faturamento Total
```dax
EVALUATE ROW("Faturamento", [Faturamento])
```
```

### CORRETO - Queries em tabela:
```markdown
| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | Qual o faturamento total? | Faturamento | - | - |
```### ERRADO - Sem seção TABELAS:
(seção simplesmente não existe)### CORRETO - Seção TABELAS com colunas:
```markdown
<!-- SECTION:TABELAS -->
| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| Calendario[Ano] | Número | Filtro | 2023, 2024 |
<!-- END:TABELAS -->
```