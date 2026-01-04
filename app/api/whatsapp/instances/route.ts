import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar instâncias
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('whatsapp_instances')
      .select('id, name, instance_name, api_url, phone_number, is_connected, last_connected_at, created_at')
      .order('created_at', { ascending: false });

    // Se não é master, filtra por grupos do usuário
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id);

      const groupIds = memberships?.map(m => m.company_group_id) || [];
      if (groupIds.length === 0) {
        return NextResponse.json({ instances: [] });
      }
      query = query.in('company_group_id', groupIds);
    }

    const { data: instances, error } = await query;

    if (error) {
      console.error('Erro ao buscar instâncias:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ instances: instances || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar instância
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { name, api_url, api_key, instance_name, company_group_id } = body;

    if (!name || !api_url || !api_key || !instance_name) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar conexão com Evolution API
    let isConnected = false;
    let phoneNumber = null;

    try {
      const statusRes = await fetch(`${api_url}/instance/connectionState/${instance_name}`, {
        headers: { 'apikey': api_key }
      });

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        isConnected = statusData.instance?.state === 'open';

        if (isConnected) {
          const infoRes = await fetch(`${api_url}/instance/fetchInstances`, {
            headers: { 'apikey': api_key }
          });
          if (infoRes.ok) {
            const instances = await infoRes.json();
            const inst = instances.find((i: any) => i.instance?.instanceName === instance_name);
            phoneNumber = inst?.instance?.owner?.split('@')[0] || null;
          }
        }
      }
    } catch (e) {
      console.log('Não foi possível verificar status da Evolution');
    }

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        company_group_id: company_group_id,
        name,
        api_url: api_url.replace(/\/$/, ''),
        api_key,
        instance_name,
        is_connected: isConnected,
        phone_number: phoneNumber,
        created_by: user.id,
        last_connected_at: isConnected ? new Date().toISOString() : null
      })
      .select('id, name, instance_name, api_url, phone_number, is_connected, last_connected_at, created_at')
      .single();

    if (error) {
      console.error('Erro ao criar instância:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ instance });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar instância
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    const updateData: any = {
      name: body.name,
      api_url: body.api_url?.replace(/\/$/, ''),
      instance_name: body.instance_name
    };

    if (body.api_key) {
      updateData.api_key = body.api_key;
    }

    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .update(updateData)
      .eq('id', body.id)
      .select('id, name, instance_name, api_url, phone_number, is_connected, last_connected_at, created_at')
      .single();

    if (error) {
      console.error('Erro ao atualizar instância:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ instance });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir instância
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir instância:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



