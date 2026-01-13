import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - Buscar desenvolvedor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getSupabase();

    const { data: developer, error } = await supabase
      .from('developers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json({ developer });
  } catch (error: any) {
    console.error('Erro ao buscar desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar desenvolvedor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Campos basicos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.document !== undefined) updateData.document = body.document;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.plan_id !== undefined) updateData.plan_id = body.plan_id || null;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.primary_color !== undefined) updateData.primary_color = body.primary_color;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Responsavel
    if (body.responsible_name !== undefined) updateData.responsible_name = body.responsible_name;
    if (body.responsible_email !== undefined) updateData.responsible_email = body.responsible_email;
    if (body.responsible_phone !== undefined) updateData.responsible_phone = body.responsible_phone;

    // Endereco
    if (body.address_street !== undefined) updateData.address_street = body.address_street;
    if (body.address_number !== undefined) updateData.address_number = body.address_number;
    if (body.address_complement !== undefined) updateData.address_complement = body.address_complement;
    if (body.address_neighborhood !== undefined) updateData.address_neighborhood = body.address_neighborhood;
    if (body.address_city !== undefined) updateData.address_city = body.address_city;
    if (body.address_state !== undefined) updateData.address_state = body.address_state;
    if (body.address_zip !== undefined) updateData.address_zip = body.address_zip;

    const { data: developer, error } = await supabase
      .from('developers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ developer });
  } catch (error: any) {
    console.error('Erro ao atualizar desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir desenvolvedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getSupabase();

    // Verificar se tem grupos vinculados
    const { count: groupsCount } = await supabase
      .from('company_groups')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', id);

    if (groupsCount && groupsCount > 0) {
      return NextResponse.json({
        error: `Este desenvolvedor possui ${groupsCount} grupo(s) vinculado(s). Remova os grupos primeiro.`
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('developers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
