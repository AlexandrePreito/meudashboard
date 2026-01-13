import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id: sourceGroupId } = await params;
    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e slug são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Verificar se o grupo original pertence ao developer
    const { data: sourceGroup, error: sourceError } = await supabase
      .from('company_groups')
      .select('*')
      .eq('id', sourceGroupId)
      .eq('developer_id', developerId)
      .single();

    if (sourceError || !sourceGroup) {
      return NextResponse.json({ error: 'Grupo não encontrado ou sem permissão' }, { status: 404 });
    }

    // 2. Verificar limite de grupos do plano
    const { data: developer } = await supabase
      .from('developers')
      .select('plan:developer_plans(max_groups)')
      .eq('id', developerId)
      .single();

    const { count: currentGroups } = await supabase
      .from('company_groups')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', developerId);

    const maxGroups = developer?.plan?.max_groups || 0;
    if (currentGroups && currentGroups >= maxGroups) {
      return NextResponse.json(
        { error: `Limite de grupos atingido (${maxGroups})` },
        { status: 400 }
      );
    }

    // 3. Verificar se slug já existe
    const { data: existingSlug } = await supabase
      .from('company_groups')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json({ error: 'Este slug já está em uso' }, { status: 400 });
    }

    // 4. Criar o novo grupo (cópia do original)
    const { data: newGroup, error: createError } = await supabase
      .from('company_groups')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        developer_id: developerId,
        document: sourceGroup.document,
        email: sourceGroup.email,
        phone: sourceGroup.phone,
        logo_url: sourceGroup.logo_url,
        primary_color: sourceGroup.primary_color,
        secondary_color: sourceGroup.secondary_color,
        use_developer_logo: sourceGroup.use_developer_logo,
        use_developer_colors: sourceGroup.use_developer_colors,
        quota_users: sourceGroup.quota_users,
        quota_screens: sourceGroup.quota_screens,
        quota_alerts: sourceGroup.quota_alerts,
        quota_whatsapp_per_day: sourceGroup.quota_whatsapp_per_day,
        quota_ai_credits_per_day: sourceGroup.quota_ai_credits_per_day,
        quota_alert_executions_per_day: sourceGroup.quota_alert_executions_per_day,
        status: 'active',
      })
      .select()
      .single();

    if (createError || !newGroup) {
      console.error('Erro ao criar grupo:', createError);
      return NextResponse.json({ error: 'Erro ao criar grupo' }, { status: 500 });
    }

    // 5. Clonar conexões Power BI
    const { data: connections } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('company_group_id', sourceGroupId);

    if (connections && connections.length > 0) {
      const newConnections = connections.map(conn => ({
        company_group_id: newGroup.id,
        name: conn.name,
        tenant_id: conn.tenant_id,
        client_id: conn.client_id,
        client_secret: conn.client_secret,
        workspace_id: conn.workspace_id,
        show_page_navigation: conn.show_page_navigation,
      }));

      const { error: connError } = await supabase
        .from('powerbi_connections')
        .insert(newConnections);

      if (connError) {
        console.error('Erro ao clonar conexões:', connError);
      }
    }

    // 6. Vincular instâncias WhatsApp existentes ao novo grupo
    const { data: instanceGroups } = await supabase
      .from('whatsapp_instance_groups')
      .select('instance_id')
      .eq('company_group_id', sourceGroupId);

    if (instanceGroups && instanceGroups.length > 0) {
      const newInstanceLinks = instanceGroups.map(ig => ({
        instance_id: ig.instance_id,
        company_group_id: newGroup.id,
        created_by: user.id,
      }));

      const { error: instanceError } = await supabase
        .from('whatsapp_instance_groups')
        .insert(newInstanceLinks);

      if (instanceError) {
        console.error('Erro ao vincular instâncias:', instanceError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      group: newGroup,
      cloned: {
        connections: connections?.length || 0,
        whatsapp_instances: instanceGroups?.length || 0,
      }
    });

  } catch (error: any) {
    console.error('Erro ao clonar grupo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
