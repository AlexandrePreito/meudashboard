import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Listar números autorizados
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar grupos do usuario
    const { getUserDeveloperId } = await import('@/lib/auth');
    const developerId = await getUserDeveloperId(user.id);

    let userGroupIds: string[] = [];
    if (!user.is_master) {
      if (developerId) {
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }
      
      if (userGroupIds.length === 0) {
        return NextResponse.json({ numbers: [] });
      }

      // SEGURANCA: Se passou group_id, validar acesso
      if (groupId && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
      }
    }

    // Buscar números com datasets vinculados
    let query = supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_number_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .order('name', { ascending: true });

    // Filtrar por grupo
    if (groupId) {
      query = query.eq('company_group_id', groupId);
    } else if (!user.is_master) {
      query = query.in('company_group_id', userGroupIds);
    }

    const { data: numbers, error } = await query;

    if (error) {
      console.error('Erro ao buscar números:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ numbers: numbers || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar número autorizado
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    
    // ━━━━━━━━━ DEBUG LOGS ━━━━━━━━━
    console.log('━━━━━━━━━ POST /authorized-numbers ━━━━━━━━━');
    console.log('Body recebido:', JSON.stringify(body, null, 2));
    console.log('User ID:', user.id);
    console.log('User is_master:', user.is_master);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { phone_number, name, instance_id, can_receive_alerts, can_use_chat, company_group_id, datasets } = body;

    if (!phone_number || !name) {
      console.log('❌ Erro: Campos obrigatórios faltando - phone_number:', phone_number, 'name:', name);
      return NextResponse.json({ error: 'Telefone e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: master pode tudo, dev e admin só seus grupos
    if (!user.is_master) {
      const { getUserDeveloperId } = await import('@/lib/auth');
      const developerId = await getUserDeveloperId(user.id);
      
      // Verificar se é admin do grupo
      let isAdminOfGroup = false;
      if (company_group_id) {
        isAdminOfGroup = await isUserAdminOfGroup(user.id, company_group_id);
      }
      
      if (!developerId && !isAdminOfGroup) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
      
      // Verificar se o grupo pertence ao desenvolvedor ou admin
      if (!company_group_id) {
        return NextResponse.json({ error: 'company_group_id é obrigatório' }, { status: 400 });
      }
      
      if (developerId) {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', company_group_id)
          .eq('developer_id', developerId)
          .single();
          
        if (!group) {
          return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
        }
      } else if (!isAdminOfGroup) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
      }
    }

    // Determinar company_group_id
    const groupId = company_group_id;

    console.log('GroupId determinado:', groupId);

    if (!groupId) {
      console.log('❌ Erro: Grupo não encontrado');
      console.log('company_group_id recebido:', company_group_id);
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    // Criar número
    const { data: newNumber, error: numberError } = await supabase
      .from('whatsapp_authorized_numbers')
      .insert({
        company_group_id: groupId,
        instance_id: instance_id || null,
        phone_number: phone_number.replace(/\D/g, ''),
        name,
        can_receive_alerts: can_receive_alerts ?? true,
        can_use_chat: can_use_chat ?? true,
        is_active: true
      })
      .select()
      .single();

    if (numberError) {
      console.error('Erro ao criar número:', numberError);
      return NextResponse.json({ error: numberError.message }, { status: 500 });
    }

    // Criar vínculos de datasets
    if (datasets && Array.isArray(datasets) && datasets.length > 0) {
      const datasetInserts = datasets.map((d: any) => ({
        authorized_number_id: newNumber.id,
        connection_id: d.connection_id,
        dataset_id: d.dataset_id,
        dataset_name: d.dataset_name || null
      }));

      const { error: datasetError } = await supabase
        .from('whatsapp_number_datasets')
        .insert(datasetInserts);

      if (datasetError) {
        console.error('Erro ao vincular datasets:', datasetError);
        // Não retornar erro, apenas log
      }
    }

    // Buscar número completo com datasets
    const { data: completeNumber } = await supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_number_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .eq('id', newNumber.id)
      .single();

    return NextResponse.json({ number: completeNumber });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar número autorizado
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, phone_number, name, instance_id, can_receive_alerts, can_use_chat, is_active, datasets } = body;

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

    // Admin e Developer: verificar se número pertence ao seu grupo
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: number } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!number) {
        return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 });
      }

      // Verificar permissão: se admin, usar isUserAdminOfGroup; se developer, verificar grupos
      if (userRole === 'admin') {
        const isAdminOfGroup = await isUserAdminOfGroup(user.id, number.company_group_id);
        if (!isAdminOfGroup) {
          return NextResponse.json({ error: 'Sem permissão para editar este número' }, { status: 403 });
        }
      } else if (!userGroupIds.includes(number.company_group_id)) {
        return NextResponse.json({ error: 'Sem permissão para editar este número' }, { status: 403 });
      }
    }

    // Atualizar número
    const { data: updatedNumber, error: updateError } = await supabase
      .from('whatsapp_authorized_numbers')
      .update({
        phone_number: phone_number?.replace(/\D/g, ''),
        name,
        instance_id: instance_id || null,
        can_receive_alerts,
        can_use_chat,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar número:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Atualizar datasets vinculados
    if (datasets !== undefined) {
      // Deletar vínculos antigos
      await supabase
        .from('whatsapp_number_datasets')
        .delete()
        .eq('authorized_number_id', id);

      // Inserir novos vínculos
      if (Array.isArray(datasets) && datasets.length > 0) {
        const datasetInserts = datasets.map((d: any) => ({
          authorized_number_id: id,
          connection_id: d.connection_id,
          dataset_id: d.dataset_id,
          dataset_name: d.dataset_name || null
        }));

        await supabase
          .from('whatsapp_number_datasets')
          .insert(datasetInserts);
      }
    }

    // Buscar número completo com datasets
    const { data: completeNumber } = await supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        *,
        instance:whatsapp_instances(id, name),
        datasets:whatsapp_number_datasets(
          id,
          connection_id,
          dataset_id,
          dataset_name
        )
      `)
      .eq('id', id)
      .single();

    return NextResponse.json({ number: completeNumber });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir número autorizado
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
      // Verificar se é developer
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        userRole = 'developer';
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

    // Admin e Developer: verificar se número pertence ao seu grupo
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: number } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!number) {
        return NextResponse.json({ error: 'Número não encontrado' }, { status: 404 });
      }

      // Verificar permissão: se admin, usar isUserAdminOfGroup; se developer, verificar grupos
      if (userRole === 'admin') {
        const isAdminOfGroup = await isUserAdminOfGroup(user.id, number.company_group_id);
        if (!isAdminOfGroup) {
          return NextResponse.json({ error: 'Sem permissão para excluir este número' }, { status: 403 });
        }
      } else if (!userGroupIds.includes(number.company_group_id)) {
        return NextResponse.json({ error: 'Sem permissão para excluir este número' }, { status: 403 });
      }
    }

    // Excluir número (CASCADE já remove vínculos de datasets)
    const { error } = await supabase
      .from('whatsapp_authorized_numbers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir número:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
