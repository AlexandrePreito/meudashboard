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
    const { prompt, connection_id, dataset_id, alert_name, alert_type } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Descreva o que você precisa monitorar' }, { status: 400 });
    }

    if (!connection_id || !dataset_id) {
      return NextResponse.json({ error: 'Conexão e Dataset são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar contexto com fallbacks (igual ao chat)
    let modelContext = '';

    // 1. Tentar por connection_id
    const { data: contextByConn } = await supabase
      .from('ai_model_contexts')
      .select('context_content')
      .eq('connection_id', connection_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (contextByConn?.context_content) {
      modelContext = contextByConn.context_content;
    } else {
      // 2. Buscar company_group_id da conexão (powerbi_connections NÃO tem dataset_id)
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', connection_id)
        .maybeSingle();

      if (connection?.company_group_id) {
        // 3. Tentar por dataset_id passado no body + company_group_id da conexão
        if (dataset_id) {
          const { data: ctxByDataset } = await supabase
            .from('ai_model_contexts')
            .select('context_content')
            .eq('dataset_id', dataset_id)
            .eq('company_group_id', connection.company_group_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (ctxByDataset?.context_content) {
            modelContext = ctxByDataset.context_content;
          }
        }

        // 4. Tentar qualquer contexto ativo do mesmo company_group
        if (!modelContext) {
          const { data: ctxByGroup } = await supabase
            .from('ai_model_contexts')
            .select('context_content')
            .eq('company_group_id', connection.company_group_id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
          if (ctxByGroup?.context_content) {
            modelContext = ctxByGroup.context_content;
          }
        }
      }
    }

    if (!modelContext) {
      return NextResponse.json({
        success: false,
        error: 'Contexto do modelo não encontrado. Configure o contexto IA primeiro.',
      });
    }

    const alertEmojis: Record<string, string> = {
      'warning': '⚠️',
      'danger': '🚨', 
      'success': '✅',
      'info': 'ℹ️',
    };
    const emoji = alertEmojis[alert_type] || '📊';

    const systemPrompt = `Você é um especialista em DAX para Power BI e mensagens WhatsApp.

## TAREFA
Gere uma query DAX E um template de mensagem WhatsApp baseado na descrição do usuário.

## RESPOSTA (JSON válido, sem markdown)
{
  "found": true,
  "dax": "EVALUATE ...",
  "template": "📊 *Título*\\n\\n{{valor}}\\n\\n📅 {{data}} às {{hora}}",
  "description": "O que este alerta faz"
}

Ou se não encontrar as medidas:
{
  "found": false,
  "error": "Mensagem de erro",
  "suggestions": ["sugestão1", "sugestão2"]
}

## REGRAS CRÍTICAS PARA DAX

### NUNCA faça isso (causa erro):
❌ FILTER(TabelaA, OutraTabela[Coluna] = valor)
❌ Calendario[Data] dentro de FILTER de outra tabela

### SEMPRE faça assim:
✅ Use CALCULATE com filtros de data
✅ Use VALUES() ou SUMMARIZE() para agrupar
✅ Filtros de data sempre com CALCULATE, não FILTER

### Padrão correto para agrupar por dimensão com filtro de data:
EVALUATE
UNION(
    ADDCOLUMNS(
        VALUES(Empresa[Filial]),
        "Valor", CALCULATE([Medida], Calendario[Data] >= TODAY() - X, Calendario[Data] < TODAY())
    ),
    ROW("Filial", "TOTAL", "Valor", CALCULATE([Medida], Calendario[Data] >= TODAY() - X, Calendario[Data] < TODAY(), ALL(Empresa)))
)
ORDER BY [Valor] DESC

### Padrão para valor único:
EVALUATE
ROW("Valor", CALCULATE([Medida], Calendario[Data] >= TODAY() - X, Calendario[Data] < TODAY()))

## REGRAS PARA TEMPLATE
1. Use ${emoji} como emoji principal
2. *asteriscos* para negrito no WhatsApp
3. Variáveis disponíveis: {{nome_alerta}}, {{valor}}, {{data}}, {{hora}}
4. {{valor}} conterá o resultado formatado da DAX (se for tabela, cada linha virá formatada)
5. O TEMPLATE DEVE REFLETIR EXATAMENTE O QUE O USUÁRIO PEDIU:
   - Se pediu "por filial" → mencione filiais no template
   - Se pediu "últimos X dias" → mencione o período no template
   - Se pediu "total no final" → mencione que há total
   - Se pediu "venda/faturamento" → use termos de venda
6. Seja específico e contextual, não genérico
7. Máximo 500 caracteres
8. Estrutura sugerida:
   - Linha 1: Emoji + Nome do alerta em negrito
   - Linha 2-3: Contexto do que está sendo mostrado (baseado no pedido)
   - Linha 4+: {{valor}} (resultado)
   - Linha final: Data e hora

## CONTEXTO DO MODELO
${modelContext}

## EXEMPLOS DE TEMPLATES CONTEXTUALIZADOS

Pedido: "faturamento por filial dos últimos 3 dias com total"
{
  "found": true,
  "dax": "EVALUATE\\nUNION(\\n    ADDCOLUMNS(\\n        VALUES(Empresa[Filial]),\\n        \\"Valor\\", CALCULATE([QA_Faturamento], Calendario[Data] >= TODAY() - 3, Calendario[Data] < TODAY())\\n    ),\\n    ROW(\\"Filial\\", \\"TOTAL\\", \\"Valor\\", CALCULATE([QA_Faturamento], Calendario[Data] >= TODAY() - 3, Calendario[Data] < TODAY(), ALL(Empresa)))\\n)\\nORDER BY [Valor] DESC",
  "template": "📊 *{{nome_alerta}}*\\n\\n🏢 *Faturamento por Filial (últimos 3 dias):*\\n\\n{{valor}}\\n\\n✅ Total incluído no final\\n\\n📅 {{data}} às {{hora}}",
  "description": "Faturamento dos últimos 3 dias agrupado por filial com total"
}

Pedido: "vendas de ontem"
{
  "found": true,
  "dax": "EVALUATE\\nROW(\\"Valor\\", CALCULATE([QA_Faturamento], Calendario[Data] = TODAY() - 1))",
  "template": "💰 *{{nome_alerta}}*\\n\\n📈 *Vendas de Ontem:*\\n*{{valor}}*\\n\\n📅 {{data}} às {{hora}}",
  "description": "Total de vendas do dia anterior"
}

Pedido: "top 10 clientes do mês"
{
  "found": true,
  "dax": "EVALUATE\\nTOPN(10,\\n    ADDCOLUMNS(\\n        VALUES(Cliente[Nome]),\\n        \\"Valor\\", CALCULATE([QA_Faturamento], MONTH(Calendario[Data]) = MONTH(TODAY()), YEAR(Calendario[Data]) = YEAR(TODAY()))\\n    ),\\n    [Valor], DESC\\n)",
  "template": "🏆 *{{nome_alerta}}*\\n\\n👥 *Top 10 Clientes do Mês:*\\n\\n{{valor}}\\n\\n📅 Atualizado em {{data}} às {{hora}}",
  "description": "Top 10 clientes por faturamento no mês atual"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Gere DAX e template para: "${prompt}"\n\nRetorne APENAS o JSON, nada mais.`
        }
      ]
    });

    let responseText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText += block.text;
      }
    }

    responseText = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const parsed = JSON.parse(responseText);
      
      if (parsed.found === true && parsed.dax) {
        const cleanDax = parsed.dax.replace(/\\n/g, '\n');
        const cleanTemplate = (parsed.template || '').replace(/\\n/g, '\n');
        
        return NextResponse.json({ 
          success: true,
          dax_query: cleanDax,
          message_template: cleanTemplate || `${emoji} *{{nome_alerta}}*\n\n📊 Valor: *{{valor}}*\n\n📅 {{data}} às {{hora}}`,
          description: parsed.description || ''
        });
      } else {
        return NextResponse.json({ 
          success: false,
          error: parsed.error || 'Não foi possível gerar',
          suggestions: parsed.suggestions || []
        });
      }
    } catch (parseError) {
      console.error('Erro parse:', parseError, responseText);
      return NextResponse.json({ 
        success: false,
        error: 'Erro ao interpretar resposta da IA'
      });
    }

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar' }, { status: 500 });
  }
}
