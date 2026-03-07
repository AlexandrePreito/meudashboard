import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// GET - Listar conexões
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterGroupId = searchParams.get('company_group_id') || searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar grupos do usuario
    let userGroupIds: string[] = [];
    
    if (!user.is_master) {
      // Primeiro verificar se é desenvolvedor
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Desenvolvedor: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuario comum: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      const devId = await getUserDeveloperId(user.id);
      if (userGroupIds.length === 0 && !devId) {
        return NextResponse.json({ connections: [] });
      }

      // SEGURANCA: Se passou group_id, validar acesso
      if (filterGroupId && !userGroupIds.includes(filterGroupId)) {
        return NextResponse.json({ error: 'Sem permissao para este grupo' }, { status: 403 });
      }
    }

    let connections: Record<string, unknown>[] = [];

    if (filterGroupId) {
      // Com filtro: conexões do grupo + compartilhadas do developer
      const { data: groupConns, error: groupErr } = await supabase
        .from('powerbi_connections')
        .select(`*, company_group:company_groups(id, name)`)
        .eq('company_group_id', filterGroupId)
        .order('name');
      if (!groupErr) connections = groupConns || [];

      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: shared } = await supabase
          .from('powerbi_connections')
          .select('*, company_group:company_groups(id, name)')
          .eq('developer_id', developerId)
          .is('company_group_id', null)
          .order('name');
        const sharedWithSource = (shared || []).map((c: Record<string, unknown>) => ({
          ...c,
          _source: 'developer',
          _label: `${c.name} (compartilhada)`
        }));
        connections = [...connections, ...sharedWithSource];
      }
    } else if (!user.is_master) {
      // Sem filtro: conexões dos grupos do dev + compartilhadas
      if (userGroupIds.length > 0) {
        const { data: groupConns, error: groupErr } = await supabase
          .from('powerbi_connections')
          .select(`*, company_group:company_groups(id, name)`)
          .in('company_group_id', userGroupIds)
          .order('name');
        if (!groupErr) connections = groupConns || [];
      }

      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: shared } = await supabase
          .from('powerbi_connections')
          .select('*, company_group:company_groups(id, name)')
          .eq('developer_id', developerId)
          .is('company_group_id', null)
          .order('name');
        const sharedWithSource = (shared || []).map((c: Record<string, unknown>) => ({
          ...c,
          _source: 'developer',
          _label: `${c.name} (compartilhada)`
        }));
        connections = [...connections, ...sharedWithSource];
      }
    } else {
      // Master: todas
      const { data, error } = await supabase
        .from('powerbi_connections')
        .select(`*, company_group:company_groups(id, name)`)
        .order('name');
      if (!error) connections = data || [];
    }

    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar conexão
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { company_group_id, developer_id, name, tenant_id, client_id, client_secret, workspace_id, show_page_navigation } = body;

    const isShared = !company_group_id && developer_id;

    // Verificar permissão: master pode tudo, dev só seus grupos ou shared
    if (!user.is_master) {
      const devId = await getUserDeveloperId(user.id);
      
      if (!devId) {
        return NextResponse.json({ error: 'Sem permissão para criar conexões' }, { status: 403 });
      }

      if (isShared) {
        if (developer_id !== devId) {
          return NextResponse.json({ error: 'developer_id inválido' }, { status: 403 });
        }
      } else {
        const supabaseCheck = createAdminClient();
        const { data: group } = await supabaseCheck
          .from('company_groups')
          .select('id')
          .eq('id', company_group_id)
          .eq('developer_id', devId)
          .single();

        if (!group) {
          return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
        }
      }
    }

    if ((!company_group_id && !developer_id) || !name || !tenant_id || !client_id || !client_secret || !workspace_id) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ========== VERIFICAÇÃO DE TENANT ID DUPLICADO ==========
    const currentDevId = isShared ? developer_id : null;
    let targetGroupDevId: string | null = null;
    if (!isShared && company_group_id) {
      const { data: tg } = await supabase
        .from('company_groups')
        .select('developer_id')
        .eq('id', company_group_id)
        .single();
      targetGroupDevId = tg?.developer_id || null;
    }

    if (!user.is_master) {
      const checkDevId = currentDevId || targetGroupDevId;

      if (checkDevId) {
        const { data: currentDev } = await supabase
          .from('developers')
          .select('allow_shared_tenant')
          .eq('id', checkDevId)
          .single();

        if (!currentDev?.allow_shared_tenant) {
          const { data: existingConnections } = await supabase
            .from('powerbi_connections')
            .select('id, company_group_id, developer_id, company_group:company_groups(developer_id)')
            .eq('tenant_id', tenant_id);

          const usedByOtherDev = (existingConnections || []).some((conn: { company_group?: { developer_id?: string } | { developer_id?: string }[]; developer_id?: string }) => {
            const connDevId = conn.developer_id;
            const groupDevId = conn.company_group ? (Array.isArray(conn.company_group) ? conn.company_group[0]?.developer_id : conn.company_group?.developer_id) : null;
            const ownerDevId = connDevId || groupDevId;
            return ownerDevId && ownerDevId !== checkDevId;
          });

          if (usedByOtherDev) {
            return NextResponse.json({
              error: 'Este Tenant ID já está sendo utilizado por outra conta. Se você é o proprietário deste tenant, entre em contato com o suporte para liberação.',
              code: 'TENANT_DUPLICATE'
            }, { status: 409 });
          }
        }
      }
    }
    // ========== FIM VERIFICAÇÃO TENANT ID ==========

    const { data, error } = await supabase
      .from('powerbi_connections')
      .insert({
        company_group_id: isShared ? null : company_group_id,
        developer_id: isShared ? developer_id : null,
        name,
        tenant_id,
        client_id,
        client_secret,
        workspace_id,
        show_page_navigation: show_page_navigation ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      await logActivity({
        userId: user.id,
        companyGroupId: isShared ? undefined : company_group_id,
        actionType: 'create',
        module: 'powerbi',
        description: `Conexão Power BI criada: ${name || 'sem nome'}`,
        entityType: 'connection',
        entityId: data?.id,
      });
    } catch (_) {}

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}




