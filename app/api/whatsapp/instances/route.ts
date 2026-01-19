import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar instâncias
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
    let userGroupIds: string[] = [];
    if (!user.is_master) {
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

      if (userGroupIds.length === 0) {
        return NextResponse.json({ instances: [] });
      }

      // SEGURANCA: Se passou group_id, validar acesso
      if (groupId && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
      }
    }

    // Buscar instâncias conforme role
    let instances: any[] = [];

    if (groupId) {
      // Filtrar por grupo específico
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('instance_id')
        .eq('company_group_id', groupId);
      
      const instanceIds = instanceGroups?.map(ig => ig.instance_id) || [];
      
      if (instanceIds.length === 0) {
        return NextResponse.json({ instances: [] });
      }
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select(`
          *,
          groups:whatsapp_instance_groups(
            company_group:company_groups(id, name)
          )
        `)
        .in('id', instanceIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar instâncias:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      instances = data || [];
    } else if (user.is_master) {
      // Master vê todas, com os grupos vinculados
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select(`
          *,
          groups:whatsapp_instance_groups(
            company_group:company_groups(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar instâncias:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      instances = data || [];
    } else {
      // Desenvolvedor/Usuario: vê apenas instâncias vinculadas aos seus grupos
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('instance_id')
        .in('company_group_id', userGroupIds);
      
      const instanceIds = instanceGroups?.map(ig => ig.instance_id) || [];
      
      if (instanceIds.length === 0) {
        return NextResponse.json({ instances: [] });
      }
      
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select(`
          *,
          groups:whatsapp_instance_groups(
            company_group:company_groups(id, name)
          )
        `)
        .in('id', instanceIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar instâncias:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      instances = data || [];
    }

    return NextResponse.json({ instances });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar instância ou link_groups
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Action: link_groups (apenas Master)
    if (body.action === 'link_groups') {
      if (!user.is_master) {
        return NextResponse.json({ error: 'Apenas Master pode vincular grupos' }, { status: 403 });
      }

      const { instance_id, group_ids } = body;

      if (!instance_id || !Array.isArray(group_ids)) {
        return NextResponse.json({ error: 'instance_id e group_ids são obrigatórios' }, { status: 400 });
      }

      // Remover vínculos antigos
      await supabase
        .from('whatsapp_instance_groups')
        .delete()
        .eq('instance_id', instance_id);

      // Criar novos vínculos
      if (group_ids.length > 0) {
        const inserts = group_ids.map(gid => ({
          instance_id,
          company_group_id: gid,
          created_by: user.id
        }));

        const { error } = await supabase
          .from('whatsapp_instance_groups')
          .insert(inserts);

        if (error) {
          console.error('Erro ao vincular grupos:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
      }

      return NextResponse.json({ success: true, message: 'Grupos vinculados com sucesso' });
    }

    // Criar nova instância
    const { name, api_url, api_key, instance_name, group_ids } = body;

    if (!name || !api_url || !api_key || !instance_name) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Verificar se já existe instância com esse nome
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('instance_name', instance_name)
      .maybeSingle();

    if (existingInstance) {
      return NextResponse.json(
        { error: 'Já existe uma instância com esse nome. Use a instância existente.' },
        { status: 400 }
      );
    }

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

    // Criar instância
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .insert({
        name,
        api_url: api_url.replace(/\/$/, ''),
        api_key,
        instance_name,
        is_connected: isConnected,
        phone_number: phoneNumber,
        created_by: user.id,
        last_connected_at: isConnected ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (instanceError) {
      console.error('Erro ao criar instância:', instanceError);
      return NextResponse.json({ error: instanceError.message }, { status: 500 });
    }

    // Vincular grupos
    let groupsToLink: string[] = [];

    if (user.is_master && group_ids && Array.isArray(group_ids)) {
      // Master pode especificar os grupos
      groupsToLink = group_ids;
    } else if (!user.is_master) {
      // Desenvolvedor/Usuario: validar que os grupos pertencem a ele
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        // Desenvolvedor: validar que os grupos pertencem a ele
        if (group_ids && Array.isArray(group_ids) && group_ids.length > 0) {
          const { data: devGroups } = await supabase
            .from('company_groups')
            .select('id')
            .eq('developer_id', developerId)
            .in('id', group_ids);
          
          groupsToLink = devGroups?.map(g => g.id) || [];
        } else {
          // Se não especificou grupos, pega todos do desenvolvedor
          const { data: devGroups } = await supabase
            .from('company_groups')
            .select('id')
            .eq('developer_id', developerId)
            .eq('status', 'active');
          
          groupsToLink = devGroups?.map(g => g.id) || [];
        }
      } else {
        // Usuario comum: usar primeiro grupo do membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        
        groupsToLink = memberships?.map(m => m.company_group_id) || [];
      }
    }

    if (groupsToLink.length > 0) {
      const inserts = groupsToLink.map(gid => ({
        instance_id: instance.id,
        company_group_id: gid,
        created_by: user.id
      }));

      await supabase
        .from('whatsapp_instance_groups')
        .insert(inserts);
    }

    // Buscar instância com grupos vinculados
    const { data: createdInstance } = await supabase
      .from('whatsapp_instances')
      .select(`
        *,
        groups:whatsapp_instance_groups(
          company_group:company_groups(id, name)
        )
      `)
      .eq('id', instance.id)
      .single();

    return NextResponse.json({ instance: createdInstance });
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

    const body = await request.json();
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

    // Admin e Developer: verificar se instância está vinculada ao seu grupo
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('company_group_id')
        .eq('instance_id', body.id);

      const instanceGroupIds = instanceGroups?.map(ig => ig.company_group_id) || [];

      if (instanceGroupIds.length === 0) {
        return NextResponse.json({ error: 'Instância não está vinculada a nenhum grupo' }, { status: 404 });
      }

      // Verificar quais grupos da instância pertencem ao dev/admin
      const userLinkedGroups = instanceGroupIds.filter(gid => userGroupIds.includes(gid));

      if (userLinkedGroups.length === 0) {
        return NextResponse.json({ error: 'Sem permissão para editar esta instância' }, { status: 403 });
      }

      // Se a instância está vinculada a grupos de outros devs, não pode editar
      const allGroupsBelongToUser = instanceGroupIds.length === userLinkedGroups.length;
      
      if (!allGroupsBelongToUser) {
        return NextResponse.json({ 
          error: 'Esta instância está vinculada a outros grupos. Você não pode editá-la, apenas desvinculá-la do(s) seu(s) grupo(s).' 
        }, { status: 403 });
      }
    }

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
      .select(`
        *,
        groups:whatsapp_instance_groups(
          company_group:company_groups(id, name)
        )
      `)
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

    // Admin e Developer: verificar grupos vinculados à instância
    if (userRole === 'admin' || userRole === 'developer') {
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('company_group_id')
        .eq('instance_id', id);

      const instanceGroupIds = instanceGroups?.map(ig => ig.company_group_id) || [];

      if (instanceGroupIds.length === 0) {
        return NextResponse.json({ 
          error: 'Instância não está vinculada a nenhum grupo' 
        }, { status: 404 });
      }

      // Verificar quais grupos da instância pertencem ao dev/admin
      const userLinkedGroups = instanceGroupIds.filter(gid => userGroupIds.includes(gid));

      if (userLinkedGroups.length === 0) {
        return NextResponse.json({ 
          error: 'Você não tem acesso a esta instância' 
        }, { status: 403 });
      }

      // Verificar se TODOS os grupos vinculados pertencem ao dev/admin
      const allGroupsBelongToUser = instanceGroupIds.length === userLinkedGroups.length;

      if (allGroupsBelongToUser) {
        // Todos os grupos pertencem ao dev/admin: pode excluir completamente
        const { error } = await supabase
          .from('whatsapp_instances')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Erro ao excluir instância:', error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Instância excluída com sucesso' 
        });
      } else {
        // Há grupos de outros devs: apenas desvincular os grupos do dev/admin
        const { error: unlinkError } = await supabase
          .from('whatsapp_instance_groups')
          .delete()
          .eq('instance_id', id)
          .in('company_group_id', userLinkedGroups);

        if (unlinkError) {
          console.error('Erro ao desvincular grupos:', unlinkError);
          return NextResponse.json({ error: unlinkError.message }, { status: 500 });
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Instância desvinculada do(s) seu(s) grupo(s). A instância continua disponível para outros grupos.' 
        });
      }
    }

    // Master: pode excluir sempre
    if (userRole === 'master') {
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir instância:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Operação não permitida' }, { status: 403 });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
