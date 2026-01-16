import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar grupos WhatsApp autorizados
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar role e grupos do usuário
    let userRole = 'user';
    let userGroupIds: string[] = [];

    if (user.is_master) {
      userRole = 'master';
    } else {
      // Verificar se é developer
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        userRole = 'developer';
        // Developer: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuário normal: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }
      }
    }

    // Módulos removidos - sempre disponível
    // Verificação de módulo removida (mantida apenas verificação de role para segurança)

    // SEGURANCA: Se passou group_id, validar acesso
    if (groupId && userRole !== 'master' && !userGroupIds.includes(groupId)) {
      return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
    }

    // Buscar grupos com datasets vinculados
    let query = supabase
      .from('whatsapp_authorized_groups')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_group_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .order('group_name', { ascending: true });

    // Filtrar por grupo
    if (groupId) {
      query = query.eq('company_group_id', groupId);
    } else if (userRole === 'admin' || userRole === 'developer') {
      // Admin e Developer: filtrar por grupos
      query = query.in('company_group_id', userGroupIds);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Erro ao buscar grupos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ groups: groups || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar grupo WhatsApp autorizado
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { group_id, group_name, purpose, instance_id, can_receive_alerts, company_group_id, datasets } = body;

    if (!group_id || !group_name) {
      return NextResponse.json({ error: 'ID do grupo e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar role e grupos do usuário
    let userRole = 'user';
    let userGroupIds: string[] = [];

    if (user.is_master) {
      userRole = 'master';
    } else {
      // Verificar se é developer
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        userRole = 'developer';
        // Developer: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuário normal: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }
      }
    }

    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Determinar company_group_id
    let groupId = company_group_id;

    if (userRole === 'admin' || userRole === 'developer') {
      // Admin e Developer: forçar para ser do seu grupo (primeiro grupo se não especificado)
      if (!groupId) {
        groupId = userGroupIds[0] || null;
      } else {
        // Verificar se o grupo especificado pertence ao usuário
        if (!userGroupIds.includes(groupId)) {
          return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
        }
      }
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    // Criar grupo
    const { data: newGroup, error: groupError } = await supabase
      .from('whatsapp_authorized_groups')
      .insert({
        company_group_id: groupId,
        instance_id: instance_id || null,
        group_id,
        group_name,
        purpose: purpose || null,
        can_receive_alerts: can_receive_alerts ?? true,
        is_active: true
      })
      .select()
      .single();

    if (groupError) {
      console.error('Erro ao criar grupo:', groupError);
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    // Criar vínculos de datasets
    if (datasets && Array.isArray(datasets) && datasets.length > 0) {
      const datasetInserts = datasets.map((d: any) => ({
        authorized_group_id: newGroup.id,
        connection_id: d.connection_id,
        dataset_id: d.dataset_id,
        dataset_name: d.dataset_name || null
      }));

      const { error: datasetError } = await supabase
        .from('whatsapp_group_datasets')
        .insert(datasetInserts);

      if (datasetError) {
        console.error('Erro ao vincular datasets:', datasetError);
        // Não retornar erro, apenas log
      }
    }

    // Buscar grupo completo com datasets
    const { data: completeGroup } = await supabase
      .from('whatsapp_authorized_groups')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_group_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .eq('id', newGroup.id)
      .single();

    return NextResponse.json({ group: completeGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar grupo WhatsApp autorizado
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, group_id, group_name, purpose, instance_id, can_receive_alerts, is_active, datasets } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar role e grupos do usuário
    let userRole = 'user';
    let userGroupIds: string[] = [];

    if (user.is_master) {
      userRole = 'master';
    } else {
      // Verificar se é developer
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        userRole = 'developer';
        // Developer: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuário normal: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }
      }
    }

    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Admin e Developer: verificar se grupo pertence ao seu grupo
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: group } = await supabase
        .from('whatsapp_authorized_groups')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!group || !userGroupIds.includes(group.company_group_id)) {
        return NextResponse.json({ error: 'Sem permissão para editar este grupo' }, { status: 403 });
      }
    }

    // Atualizar grupo
    const { data: updatedGroup, error: updateError } = await supabase
      .from('whatsapp_authorized_groups')
      .update({
        group_id,
        group_name,
        purpose: purpose || null,
        instance_id: instance_id || null,
        can_receive_alerts,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar grupo:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Atualizar datasets vinculados
    if (datasets !== undefined) {
      // Deletar vínculos antigos
      await supabase
        .from('whatsapp_group_datasets')
        .delete()
        .eq('authorized_group_id', id);

      // Inserir novos vínculos
      if (Array.isArray(datasets) && datasets.length > 0) {
        const datasetInserts = datasets.map((d: any) => ({
          authorized_group_id: id,
          connection_id: d.connection_id,
          dataset_id: d.dataset_id,
          dataset_name: d.dataset_name || null
        }));

        await supabase
          .from('whatsapp_group_datasets')
          .insert(datasetInserts);
      }
    }

    // Buscar grupo completo com datasets
    const { data: completeGroup } = await supabase
      .from('whatsapp_authorized_groups')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_group_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ group: completeGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir grupo WhatsApp autorizado
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar role e grupos do usuário
    let userRole = 'user';
    let userGroupIds: string[] = [];

    if (user.is_master) {
      userRole = 'master';
    } else {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      userGroupIds = memberships?.map(m => m.company_group_id) || [];
      if (memberships?.some(m => m.role === 'admin')) {
        userRole = 'admin';
      }
    }

    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Admin e Developer: verificar se grupo pertence ao seu grupo
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: group } = await supabase
        .from('whatsapp_authorized_groups')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!group || !userGroupIds.includes(group.company_group_id)) {
        return NextResponse.json({ error: 'Sem permissão para excluir este grupo' }, { status: 403 });
      }
    }

    // Excluir grupo (CASCADE já remove vínculos de datasets)
    const { error } = await supabase
      .from('whatsapp_authorized_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
