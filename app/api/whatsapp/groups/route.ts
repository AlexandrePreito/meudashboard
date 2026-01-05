import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar grupos autorizados
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('whatsapp_groups')
      .select(`
        id,
        group_id,
        group_name,
        purpose,
        can_receive_alerts,
        is_active,
        created_at,
        instance:whatsapp_instances(id, name)
      `)
      .order('group_name', { ascending: true });

    // Se não for master, filtra por grupo
    if (!user.is_master) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.company_group_id) {
        query = query.eq('company_group_id', membership.company_group_id);
      }
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

// POST - Criar grupo autorizado
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { group_id, group_name, purpose, instance_id, can_receive_alerts, company_group_id } = body;

    if (!group_id || !group_name) {
      return NextResponse.json({ error: 'ID do grupo e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar grupo da empresa
    let companyGroupId = company_group_id;
    if (!companyGroupId) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      companyGroupId = membership?.company_group_id;
    }

    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    const { data: newGroup, error } = await supabase
      .from('whatsapp_groups')
      .insert({
        company_group_id: companyGroupId,
        instance_id: instance_id || null,
        group_id,
        group_name,
        purpose: purpose || null,
        can_receive_alerts: can_receive_alerts ?? true,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: newGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar grupo autorizado
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, group_id, group_name, purpose, instance_id, can_receive_alerts, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: updatedGroup, error } = await supabase
      .from('whatsapp_groups')
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

    if (error) {
      console.error('Erro ao atualizar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: updatedGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir grupo autorizado
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

    const { error } = await supabase
      .from('whatsapp_groups')
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

