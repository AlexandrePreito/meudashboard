import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// GET - Buscar conexão por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('powerbi_connections')
      .select(`
        *,
        company_group:company_groups(id, name)
      `)
      .eq('id', id)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        const isShared = data.developer_id && !data.company_group_id;
        if (isShared) {
          if (data.developer_id !== developerId) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
          }
        } else if (data.company_group_id) {
          const { data: group } = await supabase
            .from('company_groups')
            .select('id')
            .eq('id', data.company_group_id)
            .eq('developer_id', developerId)
            .single();
          if (!group) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
          }
        }
      } else {
        if (!data.company_group_id) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_group_id', data.company_group_id)
          .eq('is_active', true)
          .single();
        if (!membership) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar conexão
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissão
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para editar conexões' }, { status: 403 });
      }

      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id, developer_id')
        .eq('id', id)
        .single();

      if (!connection) {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }

      const isShared = connection.developer_id && !connection.company_group_id;
      if (isShared) {
        if (connection.developer_id !== developerId) {
          return NextResponse.json({ error: 'Sem permissão para editar esta conexão' }, { status: 403 });
        }
      } else {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', connection.company_group_id)
          .eq('developer_id', developerId)
          .single();
        if (!group) {
          return NextResponse.json({ error: 'Sem permissão para editar esta conexão' }, { status: 403 });
        }
      }
    }

    const body = await request.json();
    if (!user.is_master) {
      const devId = await getUserDeveloperId(user.id);

      if (body.developer_id && body.developer_id !== devId) {
        return NextResponse.json({ error: 'developer_id inválido' }, { status: 403 });
      }

      if (body.company_group_id) {
        const { data: targetGroup } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', body.company_group_id)
          .eq('developer_id', devId)
          .single();
        if (!targetGroup) {
          return NextResponse.json({ error: 'Grupo de destino não pertence a você' }, { status: 403 });
        }
      }
    }

    const { data, error } = await supabase
      .from('powerbi_connections')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    try {
      await logActivity({
        userId: user.id,
        actionType: 'update',
        module: 'powerbi',
        description: 'Conexão Power BI atualizada',
        entityType: 'connection',
        entityId: id,
      });
    } catch (_) {}
    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir conexão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissão
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para excluir conexões' }, { status: 403 });
      }

      // Buscar a conexão e verificar se pertence a um grupo do developer
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id, developer_id')
        .eq('id', id)
        .single();

      if (!connection) {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }

      const isShared = connection.developer_id && !connection.company_group_id;
      if (isShared) {
        if (connection.developer_id !== developerId) {
          return NextResponse.json({ error: 'Sem permissão para excluir esta conexão' }, { status: 403 });
        }
      } else {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', connection.company_group_id)
          .eq('developer_id', developerId)
          .single();
        if (!group) {
          return NextResponse.json({ error: 'Sem permissão para excluir esta conexão' }, { status: 403 });
        }
      }
    }

    const { error } = await supabase
      .from('powerbi_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    try {
      await logActivity({
        userId: user.id,
        actionType: 'delete',
        module: 'powerbi',
        description: 'Conexão Power BI excluída',
        entityType: 'connection',
        entityId: id,
      });
    } catch (_) {}
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
