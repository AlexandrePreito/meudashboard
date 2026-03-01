import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const WHATSAPP_NUMBER = '5562982289559';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      company_name,
      contact_name,
      phone,
      usage_type,
      groups_count,
      reports_count,
      users_count,
      wants_subdomain,
      ia_messages_per_day,
      alerts_per_day,
    } = body;

    if (!company_name?.trim() || !contact_name?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: 'Nome da empresa, nome do contato e telefone são obrigatórios' },
        { status: 400 }
      );
    }

    const validUsageTypes = ['empresa_final', 'revenda'];
    if (!usage_type || !validUsageTypes.includes(usage_type)) {
      return NextResponse.json(
        { error: 'Selecione o tipo de uso (empresa final ou revenda)' },
        { status: 400 }
      );
    }

    const validIaMessages = ['30', '50', '80', '100+'];
    if (!ia_messages_per_day || !validIaMessages.includes(ia_messages_per_day)) {
      return NextResponse.json(
        { error: 'Selecione a quantidade de mensagens de IA por dia' },
        { status: 400 }
      );
    }

    const validAlerts = ['10', '30', '50', '80', '100+'];
    if (!alerts_per_day || !validAlerts.includes(alerts_per_day)) {
      return NextResponse.json(
        { error: 'Selecione a quantidade de alertas por dia' },
        { status: 400 }
      );
    }

    const groups = Number(groups_count);
    const reports = Number(reports_count);
    const users = Number(users_count);

    if (isNaN(groups) || groups < 0 || isNaN(reports) || reports < 0 || isNaN(users) || users < 0) {
      return NextResponse.json(
        { error: 'Grupos, relatórios e usuários devem ser números válidos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: lead, error } = await supabase
      .from('lead_proposals')
      .insert({
        company_name: company_name.trim(),
        contact_name: contact_name.trim(),
        phone: phone.trim().replace(/\D/g, ''),
        usage_type,
        groups_count: groups,
        reports_count: reports,
        users_count: users,
        wants_subdomain: !!wants_subdomain,
        ia_messages_per_day,
        alerts_per_day,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[lead_proposals] Erro ao salvar:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar proposta. Tente novamente.' },
        { status: 500 }
      );
    }

    const usageLabel = usage_type === 'empresa_final' ? 'Empresa final (uso próprio)' : 'Revenda (para clientes)';
    const subdomainLabel = wants_subdomain ? 'Sim' : 'Não';

    const whatsappText = [
      '*Nova solicitação de proposta - MeuDashboard*',
      '',
      `*Empresa:* ${company_name.trim()}`,
      `*Contato:* ${contact_name.trim()}`,
      `*Telefone:* ${phone.trim()}`,
      '',
      `*Tipo de uso:* ${usageLabel}`,
      `*Grupos (empresas):* ${groups}`,
      `*Páginas de relatórios:* ${reports}`,
      `*Usuários:* ${users}`,
      `*Subdomínio próprio:* ${subdomainLabel}`,
      '',
      `*Mensagens IA/dia:* ${ia_messages_per_day}`,
      `*Alertas/dia:* ${alerts_per_day}`,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappText)}`;

    return NextResponse.json({
      success: true,
      id: lead?.id,
      whatsapp_url: whatsappUrl,
    });
  } catch (err) {
    console.error('[lead_proposals] Erro:', err);
    return NextResponse.json(
      { error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    );
  }
}
