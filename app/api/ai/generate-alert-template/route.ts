import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const CONDITION_LABELS: Record<string, string> = {
  greater_than: 'maior que',
  less_than: 'menor que',
  equals: 'igual a',
  not_equals: 'diferente de',
  greater_or_equal: 'maior ou igual a',
  less_or_equal: 'menor ou igual a'
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  warning: 'aviso',
  danger: 'perigo',
  success: 'sucesso',
  info: 'informação'
};

export async function POST(request: Request) {
  try {
    const { alert_name, alert_type, description, condition, threshold } = await request.json();

    if (!alert_name) {
      return NextResponse.json({ error: 'Nome do alerta é obrigatório' }, { status: 400 });
    }

    const conditionText = CONDITION_LABELS[condition] || condition;
    const alertTypeText = ALERT_TYPE_LABELS[alert_type] || alert_type;

    const prompt = `Você é um especialista em criar templates de mensagens para alertas de negócios no WhatsApp.

Crie um template de mensagem profissional, claro e objetivo para o seguinte alerta:

**Nome do Alerta:** ${alert_name}
**Tipo:** ${alertTypeText}
**Descrição:** ${description || 'Não informada'}
**Condição:** Quando o valor for ${conditionText} ${threshold}

**Regras importantes:**
1. Use emojis relevantes para tornar a mensagem mais visual
2. Use *negrito* para destacar informações importantes
3. Inclua OBRIGATORIAMENTE as seguintes variáveis no template (exatamente como está escrito):
   - {{nome_alerta}} - Nome do alerta
   - {{valor}} - Valor atual que disparou o alerta
   - {{data}} - Data do disparo
   - {{hora}} - Hora do disparo
4. Mantenha a mensagem concisa (máximo 5-6 linhas)
5. Use tom profissional mas amigável
6. Adapte o emoji e tom de acordo com o tipo de alerta (${alertTypeText})

Retorne APENAS o template da mensagem, sem explicações adicionais.`;

    // Tentar com diferentes modelos até encontrar um disponível
    const models = [
      'claude-3-5-sonnet-latest',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];

    let message;
    let lastError;

    for (const model of models) {
      try {
        message = await anthropic.messages.create({
          model,
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });
        break; // Se funcionou, sai do loop
      } catch (err: any) {
        lastError = err;
        console.log(`Tentando próximo modelo após erro com ${model}`);
        continue;
      }
    }

    if (!message) {
      throw lastError || new Error('Nenhum modelo disponível');
    }

    const template = message.content[0].type === 'text' 
      ? message.content[0].text.trim()
      : '🔔 *{{nome_alerta}}*\n\n📊 Valor: *{{valor}}*\n📅 {{data}} às {{hora}}';

    return NextResponse.json({ template });

  } catch (error: any) {
    console.error('Erro ao gerar template:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar template com IA' },
      { status: 500 }
    );
  }
}

