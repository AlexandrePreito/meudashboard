# 📊 PROMPT - Documentação para Chat da IA

## OBJETIVO
Gerar documentação otimizada para um assistente de IA responder perguntas sobre dados do Power BI.

**FOCO:** Qualidade > Quantidade. Documente medidas úteis para perguntas de usuários.

---

## INSTRUÇÕES

1. Analise o modelo conectado
2. Identifique as áreas de negócio
3. Selecione 20-50 medidas mais úteis para perguntas
4. Documente com contexto rico (quando usar, palavras-chave)
5. Liste colunas para filtros e agrupamentos
6. Crie queries e exemplos de perguntas

---

## FORMATO OBRIGATÓRIO

<!-- SECTION:BASE -->
# Visão Geral

## Sobre o Modelo
[Descreva o modelo: o que é, para que serve]

## Áreas Cobertas
- **[Área]:** [descrição]

## Regras de Negócio
- [Regras importantes]
<!-- END:BASE -->

<!-- SECTION:MEDIDAS -->
# Medidas

| Medida | Descrição | Quando Usar | Área |
|--------|-----------|-------------|------|
| [Nome] | [Descrição] | [palavras-chave] | [Área] |

## Detalhamento

### [Medida]
- **Descrição:** [completa]
- **Quando usar:** [palavras-chave]
- **Fórmula:** `[DAX]`
<!-- END:MEDIDAS -->

<!-- SECTION:TABELAS -->
# Colunas

| Coluna | Tipo | Uso | Valores |
|--------|------|-----|---------|
| [Tabela.Coluna] | [Tipo] | [Filtro/Agrupar] | [exemplos] |
<!-- END:TABELAS -->

<!-- SECTION:QUERIES -->
# Queries

| ID | Pergunta | Medidas | Agrupadores | Filtros |
|----|----------|---------|-------------|---------|
| Q01 | [pergunta] | [medidas] | [cols] | [filtros] |
<!-- END:QUERIES -->

<!-- SECTION:EXEMPLOS -->
# Exemplos

## Exemplo 1
**Pergunta:** [pergunta natural]
**Medidas:** [lista]
**Resposta:** "[modelo de resposta]"
<!-- END:EXEMPLOS -->
