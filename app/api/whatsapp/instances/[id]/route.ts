import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const supabase = createAdminClient();

    // Buscar instância
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });
    }

    // Verificar permissão (se não for master, verificar se tem acesso)
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const userGroupIds = memberships?.map(m => m.company_group_id) || [];

      // Verificar se instância está vinculada a algum grupo do usuário
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('company_group_id')
        .eq('instance_id', id);

      const instanceGroupIds = instanceGroups?.map(ig => ig.company_group_id) || [];
      const hasAccess = instanceGroupIds.some(gid => userGroupIds.includes(gid));

      if (!hasAccess) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    // Ação: QR Code
    if (action === 'qrcode') {
      try {
        // Chamar a Evolution API para obter o QR code
        const evolutionUrl = `${instance.api_url}/instance/connect/${instance.instance_name}`;
        
        const response = await fetch(evolutionUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': instance.api_key
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro Evolution API:', errorText);
          return NextResponse.json({ 
            error: 'Erro ao obter QR Code da Evolution API',
            details: errorText
          }, { status: response.status });
        }

        const data = await response.json();
        
        // A Evolution API pode retornar o QR code em diferentes formatos
        // Verificar estrutura da resposta
        return NextResponse.json({
          qrcode: data.qrcode || data.base64 || data.code || data,
          status: data.state || data.status || 'unknown'
        });

      } catch (fetchError: any) {
        console.error('Erro ao chamar Evolution API:', fetchError);
        return NextResponse.json({ 
          error: 'Erro de conexão com Evolution API',
          details: fetchError.message
        }, { status: 500 });
      }
    }

    // Ação: Status da conexão
    if (action === 'status') {
      try {
        const evolutionUrl = `${instance.api_url}/instance/connectionState/${instance.instance_name}`;
        
        const response = await fetch(evolutionUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': instance.api_key
          }
        });

        if (!response.ok) {
          return NextResponse.json({ 
            error: 'Erro ao obter status' 
          }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);

      } catch (fetchError: any) {
        return NextResponse.json({ 
          error: 'Erro de conexão',
          details: fetchError.message
        }, { status: 500 });
      }
    }

    // Sem action, retornar dados da instância
    return NextResponse.json({ instance });

  } catch (error: any) {
    console.error('Erro na rota /api/whatsapp/instances/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir instância específica
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar permissão
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const userGroupIds = memberships?.map(m => m.company_group_id) || [];
      const isAdmin = memberships?.some(m => m.role === 'admin');

      if (!isAdmin) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }

      // Verificar se instância está vinculada APENAS ao grupo do admin
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('company_group_id')
        .eq('instance_id', id);

      const instanceGroupIds = instanceGroups?.map(ig => ig.company_group_id) || [];
      
      // Admin só pode excluir se a instância pertence APENAS ao seu grupo
      const belongsOnlyToUserGroups = instanceGroupIds.every(gid => userGroupIds.includes(gid));
      
      if (!belongsOnlyToUserGroups) {
        return NextResponse.json({ 
          error: 'Não é possível excluir. Instância vinculada a outros grupos.' 
        }, { status: 403 });
      }
    }

    // Excluir (CASCADE já remove vínculos)
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao excluir instância:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
