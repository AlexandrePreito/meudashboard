# 🔧 PROMPT - Extrair Base de DAX

## OBJETIVO
Extrair TODAS as medidas e colunas do modelo Power BI em formato JSON para importar no sistema.

---

## INSTRUÇÕES

1. Liste TODAS as medidas do modelo
2. Liste TODAS as colunas de tabelas dimensão
3. Gere o JSON no formato especificado

---

## FORMATO JSON OBRIGATÓRIO

```json
{
  "modelo": "[NOME DO MODELO]",
  "data_extracao": "[DATA]",
  "medidas": [
    {
      "nome": "NomeMedida",
      "tabela": "TabelaOrigem",
      "formula": "FORMULA DAX COMPLETA",
      "descricao": "descrição se existir ou null",
      "pasta": "DisplayFolder se existir ou null",
      "formato": "formato se existir ou null"
    }
  ],
  "colunas": [
    {
      "tabela": "NomeTabela",
      "coluna": "NomeColuna",
      "tipo": "String/Int64/Double/DateTime/Boolean",
      "exemplo_valores": ["valor1", "valor2", "valor3"]
    }
  ]
}
```

---

## DICAS DE EXTRAÇÃO

Para medidas, use:
```
measure_operations com operation: "List" para listar todas
measure_operations com operation: "Get" para pegar fórmula de cada uma
```

Para colunas, liste de tabelas como:
- Calendario (datas)
- Tabelas de dimensão (Empresa, Produto, Funcionario, etc.)
- Tabelas de fato (apenas colunas de filtro, não todas)

---

## EXECUTE AGORA

1. Conecte ao modelo
2. Extraia todas as medidas com fórmulas
3. Extraia colunas relevantes
4. Gere o JSON completo
5. Entregue para importação
