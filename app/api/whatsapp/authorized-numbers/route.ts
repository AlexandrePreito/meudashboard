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

    let query = supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        id,
        phone_number,
        name,
        can_receive_alerts,
        can_use_chat,
        is_active,
        created_at,
        instance:whatsapp_instances(id, name)
      `)
      .order('name', { ascending: true });

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
    const { phone_number, name, instance_id, can_receive_alerts, can_use_chat, company_group_id } = body;

    if (!phone_number || !name) {
      return NextResponse.json({ error: 'Telefone e nome são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar grupo
    let groupId = company_group_id;
    if (!groupId) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      groupId = membership?.company_group_id;
    }

    if (!groupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    const { data: newNumber, error } = await supabase
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

    if (error) {
      console.error('Erro ao criar número:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ number: newNumber });
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
    const { id, phone_number, name, instance_id, can_receive_alerts, can_use_chat, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: updatedNumber, error } = await supabase
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

    if (error) {
      console.error('Erro ao atualizar número:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ number: updatedNumber });
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

