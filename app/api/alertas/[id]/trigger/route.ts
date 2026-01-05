import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// POST - Disparar alerta manualmente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Buscar o alerta
    const { data: alert, error: alertError } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    if (!alert.is_enabled) {
      return NextResponse.json({ error: 'Alerta está desativado' }, { status: 400 });
    }

    // Variáveis para a mensagem
    const now = new Date();
    const variables: Record<string, string> = {
      '{{nome_alerta}}': alert.name,
      '{{valor}}': 'Teste Manual',
      '{{data}}': now.toLocaleDateString('pt-BR'),
      '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      '{{condicao}}': alert.condition || '-',
      '{{threshold}}': alert.threshold?.toLocaleString('pt-BR') || '-',
    };

    // Substituir variáveis no template
    let message = alert.message_template || '🔔 *{{nome_alerta}}*\n\nDisparo manual realizado em {{data}} às {{hora}}';
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Resultados do envio
    const results = {
      numbers: [] as { phone: string; success: boolean; error?: string }[],
      groups: [] as { groupId: string; success: boolean; error?: string }[]
    };

    // Buscar instância WhatsApp ativa
    let instanceData: any = null;
    if (alert.notify_whatsapp) {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      instanceData = instance;
    }

    // Enviar para números
    if (alert.notify_whatsapp && alert.whatsapp_number && instanceData) {
      const numbers = alert.whatsapp_number.split(',').filter(Boolean);
      
      for (const phone of numbers) {
        try {
          const response = await fetch(`${instanceData.base_url}/message/sendText/${instanceData.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instanceData.api_key
            },
            body: JSON.stringify({
              number: phone.replace(/\D/g, ''),
              text: message
            })
          });

          if (response.ok) {
            results.numbers.push({ phone, success: true });
          } else {
            const errorData = await response.json().catch(() => ({}));
            results.numbers.push({ phone, success: false, error: errorData.message || 'Erro ao enviar' });
          }
        } catch (err: any) {
          results.numbers.push({ phone, success: false, error: err.message });
        }
      }
    }

    // Enviar para grupos
    if (alert.notify_whatsapp && alert.whatsapp_group_id && instanceData) {
      const groups = alert.whatsapp_group_id.split(',').filter(Boolean);
      
      for (const groupId of groups) {
        try {
          const response = await fetch(`${instanceData.base_url}/message/sendText/${instanceData.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instanceData.api_key
            },
            body: JSON.stringify({
              number: groupId,
              text: message
            })
          });

          if (response.ok) {
            results.groups.push({ groupId, success: true });
          } else {
            const errorData = await response.json().catch(() => ({}));
            results.groups.push({ groupId, success: false, error: errorData.message || 'Erro ao enviar' });
          }
        } catch (err: any) {
          results.groups.push({ groupId, success: false, error: err.message });
        }
      }
    }

    // Atualizar timestamp
    await supabase
      .from('ai_alerts')
      .update({ 
        last_triggered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString()
      })
      .eq('id', id);

    // Registrar no histórico
    await supabase
      .from('ai_alert_history')
      .insert({
        alert_id: id,
        triggered_at: new Date().toISOString(),
        trigger_type: 'manual',
        value_at_trigger: null,
        notification_sent: alert.notify_whatsapp,
        notification_details: JSON.stringify(results)
      });

    // Contar sucessos
    const successCount = 
      results.numbers.filter(r => r.success).length + 
      results.groups.filter(r => r.success).length;
    
    const totalCount = results.numbers.length + results.groups.length;

    if (!alert.notify_whatsapp) {
      return NextResponse.json({ 
        success: true, 
        message: 'Alerta disparado! (WhatsApp não configurado)'
      });
    }

    if (totalCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Alerta disparado! (Nenhum destinatário configurado)'
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Alerta disparado! ${successCount}/${totalCount} mensagens enviadas.`,
      results
    });

  } catch (error: any) {
    console.error('Erro ao disparar alerta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

