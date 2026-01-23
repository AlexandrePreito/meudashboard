import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { question, dataset_id, company_group_id } = body;

    if (!question || !dataset_id) {
      return NextResponse.json(
        { success: false, error: 'Pergunta e dataset_id são obrigatórios' },
        { status: 400 }
      );
    }

    const groupId = company_group_id || membership.company_group_id;

    // Buscar conexão do grupo
    const { data: connections, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .limit(1);

    // Debug: Log de erros e resultados
    if (connError) {
      console.error('❌ Erro ao buscar conexões:', connError);
      return NextResponse.json({
        success: false,
        error: `Erro ao buscar conexões: ${connError.message}`
      }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      // Verificar se existe conexão inativa para dar mensagem mais útil
      const { data: inactiveConnections } = await supabase
        .from('powerbi_connections')
        .select('id, name, is_active')
        .eq('company_group_id', groupId)
        .eq('is_active', false)
        .limit(1);

      if (inactiveConnections && inactiveConnections.length > 0) {
        return NextResponse.json({
          success: false,
          error: `Conexão Power BI "${inactiveConnections[0].name}" existe mas está inativa. Ative em Power BI > Conexões.`
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: 'Nenhuma conexão Power BI encontrada no grupo. Configure uma em Power BI > Conexões.'
      }, { status: 404 });
    }

    const connection = connections[0];

    // Buscar relatório com o dataset_id
    const { data: reports } = await supabase
      .from('powerbi_reports')
      .select('*')
      .eq('dataset_id', dataset_id)
      .eq('connection_id', connection.id)
      .limit(1);

    const report = reports?.[0];

    if (!report) {
      return NextResponse.json({
        success: false,
        error: 'Relatório não encontrado para este dataset'
      });
    }

    // Buscar contexto do modelo
    const { data: modelContext } = await supabase
      .from('ai_model_contexts')
      .select('context_content')
      .eq('connection_id', connection.id)
      .eq('dataset_id', dataset_id)
      .single();

    const contextData = modelContext?.context_content || 'Nenhum contexto disponível';

    // FASE 1: Gerar query DAX
    const phase1Prompt = `Você é um especialista em DAX para Power BI.

CONTEXTO: ${contextData}

PERGUNTA: ${question}

Gere uma query DAX válida começando com EVALUATE. 
Exemplo: EVALUATE ROW("Total", SUM(Vendas[Valor]))

Retorne APENAS o código DAX, sem explicações ou markdown.`;

    const phase1Response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: phase1Prompt }],
    });

    let daxQuery = phase1Response.content[0].type === 'text' 
      ? phase1Response.content[0].text.trim() 
      : '';

    // Limpar markdown
    daxQuery = daxQuery
      .replace(/```dax\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    // Garantir que começa com EVALUATE
    if (!daxQuery.toUpperCase().startsWith('EVALUATE')) {
      daxQuery = `EVALUATE\n${daxQuery}`;
    }
    
    if (!daxQuery || daxQuery.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Query DAX vazia - não foi possível gerar a query'
      }, { status: 400 });
    }

    // Obter token Power BI
    const token = await getPowerBIToken(connection);

    // Executar DAX no Power BI
    const powerbiUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${dataset_id}/executeQueries`;
    
    const powerbiRes = await fetch(powerbiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        queries: [{ query: daxQuery }],
        serializerSettings: { includeNulls: true },
      }),
    });

    if (!powerbiRes.ok) {
      const errorText = await powerbiRes.text();
      console.error('❌ Erro Power BI completo:', errorText);
      console.error('❌ Status:', powerbiRes.status);
      console.error('❌ Status Text:', powerbiRes.statusText);
      return NextResponse.json({
        success: false,
        error: `Erro ao executar DAX (${powerbiRes.status}): ${errorText}`
      }, { status: powerbiRes.status });
    }

    const daxResult = await powerbiRes.json();

    // FASE 2: Formatar resposta
    const phase2Prompt = `Você acabou de executar esta query DAX:

${daxQuery}

E recebeu este resultado:
${JSON.stringify(daxResult, null, 2)}

A pergunta original era: "${question}"

Formate uma resposta clara e objetiva em português para enviar ao usuário via WhatsApp. Use apenas os dados retornados.`;

    const phase2Response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: phase2Prompt }],
    });

    const formattedResponse = phase2Response.content[0].type === 'text'
      ? phase2Response.content[0].text
      : 'Não foi possível formatar a resposta';

    return NextResponse.json({
      success: true,
      data: {
        response: formattedResponse,
        dax_query: daxQuery,
        dax_result: daxResult
      }
    });

  } catch (error: any) {
    console.error('❌ Erro completo:', error);
    console.error('❌ Stack:', error.stack);
    console.error('❌ Message:', error.message);
    console.error('❌ Name:', error.name);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Erro desconhecido ao processar teste'
      },
      { status: 500 }
    );
  }
}

// Função auxiliar para obter token Power BI
async function getPowerBIToken(connection: any): Promise<string> {
  try {
    const tokenRes = await fetch(`https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
        grant_type: 'client_credentials',
      }),
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenData.access_token) {
      console.error('❌ Token não gerado:', tokenData);
      throw new Error('Falha ao gerar token: ' + JSON.stringify(tokenData));
    }
    
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ Erro ao gerar token:', error);
    throw error;
  }
}