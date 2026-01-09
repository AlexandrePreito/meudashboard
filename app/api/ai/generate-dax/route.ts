import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { prompt, connection_id, dataset_id } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt é obrigatório' }, { status: 400 });
    }

    if (!connection_id || !dataset_id) {
      return NextResponse.json({ error: 'Conexão e Dataset são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar contexto do modelo
    const { data: context } = await supabase
      .from('ai_model_contexts')
      .select('context_content')
      .eq('connection_id', connection_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    const modelContext = context?.context_content || '';

    if (!modelContext) {
      return NextResponse.json({ 
        success: false,
        error: 'Contexto do modelo não encontrado. Configure o contexto IA primeiro.',
        suggestions: []
      });
    }

    // System prompt para gerar DAX
    const systemPrompt = `Você é um especialista em DAX (Data Analysis Expressions) para Power BI.

## SUA TAREFA
Analisar o pedido do usuário e:
1. Se for possível criar a DAX com as medidas/tabelas disponíveis: gerar a query
2. Se NÃO for possível (medida não existe, tabela não existe): informar o erro e sugerir alternativas

## FORMATO DE RESPOSTA (JSON)
Responda SEMPRE em JSON válido, sem markdown:

Se ENCONTROU as medidas/tabelas necessárias:
{"found": true, "dax": "EVALUATE ROW(...)", "description": "Descrição curta do que a query faz"}

Se NÃO ENCONTROU (medida/tabela não existe no contexto):
{"found": false, "error": "Não encontrei a medida 'Lucro Líquido' no modelo", "suggestions": ["QA_Faturamento", "QA_Ticket Médio", "QA_Qtd Vendas"]}

## REGRAS PARA GERAR DAX
1. Use SEMPRE o formato EVALUATE para retornar dados
2. Para valores únicos: EVALUATE ROW("NomeColuna", [Medida])
3. Para agrupamentos: EVALUATE SUMMARIZE(...) ou ADDCOLUMNS(...)
4. Use as medidas e tabelas EXATAMENTE como estão no contexto
5. Para filtrar por data, use CALCULATE com filtros apropriados
6. Para "ontem" ou "dia anterior": use TODAY() - 1
7. Para "última semana": use DATESINPERIOD ou filtro de 7 dias
8. Para "mês atual": filtre pelo mês e ano atual
9. SEMPRE ordene os resultados quando fizer sentido (ORDER BY)

## REGRAS PARA VALIDAÇÃO
1. ANTES de gerar a DAX, verifique se as medidas/tabelas existem no contexto
2. Se o usuário pedir algo que NÃO existe (ex: "lucro líquido" mas só tem "faturamento"), retorne found: false
3. Nas sugestões, liste as medidas mais próximas do que foi pedido
4. Seja específico no erro: "Não encontrei 'Lucro Líquido'" ao invés de "Erro genérico"

## PADRÕES DE DATA
- Ontem: Calendario[Data] = TODAY() - 1
- Últimos 7 dias: Calendario[Data] >= TODAY() - 7 && Calendario[Data] < TODAY()
- Mês atual: MONTH(Calendario[Data]) = MONTH(TODAY()) && YEAR(Calendario[Data]) = YEAR(TODAY())
- Mês anterior: MONTH(Calendario[Data]) = MONTH(TODAY()) - 1

## CONTEXTO DO MODELO DE DADOS (MEDIDAS E TABELAS DISPONÍVEIS)
${modelContext}

## EXEMPLOS

Pedido: "venda de ontem" (e existe [QA_Faturamento] no contexto)
Resposta:
{"found": true, "dax": "EVALUATE\\nROW(\\"Valor\\", CALCULATE([QA_Faturamento], Calendario[Data] = TODAY() - 1))", "description": "Faturamento do dia anterior"}

Pedido: "lucro líquido do mês" (e NÃO existe medida de lucro no contexto)
Resposta:
{"found": false, "error": "Não encontrei a medida 'Lucro Líquido' no modelo de dados", "suggestions": ["QA_Faturamento", "QA_Ticket Médio", "QA_Margem"]}

Pedido: "vendas por vendedor" (e NÃO existe tabela/coluna de vendedor no contexto)
Resposta:
{"found": false, "error": "Não encontrei informações de 'Vendedor' no modelo. Agrupamentos disponíveis: Filial, Produto, Cliente", "suggestions": ["Vendas por Filial", "Vendas por Produto", "Vendas por Cliente"]}`;

    // Chamar Claude para gerar a DAX
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analise e gere a query DAX para: "${prompt}"\n\nResponda APENAS com o JSON, sem explicações adicionais.`
        }
      ]
    });

    // Extrair texto da resposta
    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    // Limpar a resposta (remover markdown se houver)
    responseText = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Tentar parsear o JSON
    try {
      const parsed = JSON.parse(responseText);
      
      if (parsed.found === true && parsed.dax) {
        // Limpar a DAX (substituir \\n por quebras de linha reais)
        const cleanDax = parsed.dax.replace(/\\n/g, '\n');
        
        return NextResponse.json({ 
          success: true,
          dax_query: cleanDax,
          description: parsed.description || ''
        });
      } else {
        return NextResponse.json({ 
          success: false,
          error: parsed.error || 'Não foi possível gerar a DAX',
          suggestions: parsed.suggestions || []
        });
      }
    } catch (parseError) {
      // Se não conseguiu parsear, tenta usar o texto como DAX diretamente
      console.error('Erro ao parsear JSON da IA:', parseError);
      
      // Verifica se parece ser uma DAX válida
      if (responseText.toUpperCase().includes('EVALUATE')) {
        return NextResponse.json({ 
          success: true,
          dax_query: responseText
        });
      }
      
      return NextResponse.json({ 
        success: false,
        error: 'Não foi possível interpretar a resposta da IA',
        suggestions: []
      });
    }

  } catch (error: any) {
    console.error('Erro ao gerar DAX:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar DAX' }, { status: 500 });
  }
}
