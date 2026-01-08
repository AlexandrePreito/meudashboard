import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar números autorizados
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

    // User não tem acesso
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissão para acessar este módulo' }, { status: 403 });
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

    // Admin: filtrar por grupos
    if (userRole === 'admin') {
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

    // Determinar company_group_id
    let groupId = company_group_id;

    if (userRole === 'admin') {
      // Admin: forçar para ser do seu grupo (primeiro grupo)
      groupId = userGroupIds[0] || null;
    }

    console.log('GroupId determinado:', groupId);

    if (!groupId) {
      console.log('❌ Erro: Grupo não encontrado');
      console.log('userRole:', userRole);
      console.log('userGroupIds:', userGroupIds);
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

    // Admin: verificar se número pertence ao seu grupo
    if (userRole === 'admin') {
      const { data: number } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!number || !userGroupIds.includes(number.company_group_id)) {
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

    // Admin: verificar se número pertence ao seu grupo
    if (userRole === 'admin') {
      const { data: number } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('company_group_id')
        .eq('id', id)
        .single();

      if (!number || !userGroupIds.includes(number.company_group_id)) {
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
