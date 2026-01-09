import { NextResponse } from 'next/server';
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
    const { alert_name, alert_type, description, condition, threshold, dax_query, dax_prompt } = body;

    if (!alert_name) {
      return NextResponse.json({ error: 'Nome do alerta é obrigatório' }, { status: 400 });
    }

    // Mapear condições para português
    const conditionMap: Record<string, string> = {
      'greater_than': 'maior que',
      'less_than': 'menor que',
      'equals': 'igual a',
      'not_equals': 'diferente de',
      'greater_or_equal': 'maior ou igual a',
      'less_or_equal': 'menor ou igual a',
    };

    // Mapear tipos de alerta
    const alertTypeMap: Record<string, { emoji: string, description: string }> = {
      'warning': { emoji: '⚠️', description: 'aviso' },
      'danger': { emoji: '🚨', description: 'perigo/urgente' },
      'success': { emoji: '✅', description: 'sucesso/positivo' },
      'info': { emoji: 'ℹ️', description: 'informativo' },
    };

    const alertInfo = alertTypeMap[alert_type] || alertTypeMap['info'];
    const conditionText = conditionMap[condition] || condition;

    const systemPrompt = `Você é um especialista em criar mensagens de alerta para WhatsApp.

## SUA TAREFA
Criar um template de mensagem de alerta baseado nas informações fornecidas.

## VARIÁVEIS DISPONÍVEIS (use exatamente assim)
- {{nome_alerta}} - Nome do alerta
- {{valor}} - Valor retornado pela query DAX
- {{data}} - Data do disparo
- {{hora}} - Hora do disparo
- {{condicao}} - Condição configurada
- {{threshold}} - Valor limite

## REGRAS
1. Use emojis apropriados para o tipo de alerta (${alertInfo.emoji} para ${alertInfo.description})
2. A mensagem deve ser clara e direta
3. Inclua sempre o valor ({{valor}}) de forma destacada
4. Inclua data e hora
5. Use *asteriscos* para negrito no WhatsApp
6. Se houver informação sobre o que a DAX faz (ex: vendas por filial), adapte a mensagem
7. Máximo 500 caracteres
8. NÃO use markdown além de *negrito*

## CONTEXTO DO ALERTA
- Nome: ${alert_name}
- Tipo: ${alertInfo.description}
- Descrição: ${description || 'Não informada'}
- Condição: ${conditionText} ${threshold}
- Query DAX: ${dax_query || 'Não informada'}
- O que o usuário pediu: ${dax_prompt || 'Não informado'}

## EXEMPLO DE SAÍDA
${alertInfo.emoji} *${alert_name}*

📊 Valor: *{{valor}}*
📅 {{data}} às {{hora}}

Condição: {{condicao}} {{threshold}}

Fique atento a essa informação!`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Gere o template de mensagem para este alerta. Retorne APENAS o template, sem explicações.`
        }
      ]
    });

    let template = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        template += block.text;
      }
    }

    // Limpar possíveis marcadores de código
    template = template
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/```/g, '')
      .trim();

    return NextResponse.json({ 
      success: true,
      template 
    });

  } catch (error: any) {
    console.error('Erro ao gerar template:', error);
    return NextResponse.json({ error: error.message || 'Erro ao gerar template' }, { status: 500 });
  }
}
