import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar mensagens
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const direction = searchParams.get('direction'); // incoming, outgoing
    const phone = searchParams.get('phone');
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Se não for master, buscar grupos do usuário
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      // Verificar se é developer
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        // Developer: buscar grupos pelo developer_id
        const { data: devGroups, error: devGroupsError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        if (devGroupsError) {
          console.error('[ERROR /api/whatsapp/messages] Erro ao buscar grupos do dev:', {
            message: devGroupsError.message,
            details: devGroupsError.details,
            hint: devGroupsError.hint,
            code: devGroupsError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos do desenvolvedor', details: devGroupsError.message }, { status: 500 });
        }

        userGroupIds = devGroups?.map(g => String(g.id)) || [];
        
        console.log('[DEBUG /api/whatsapp/messages] Grupos do desenvolvedor:', {
          developerId,
          userGroupIds,
          totalGrupos: userGroupIds.length,
          requestedGroupId: groupId || 'nenhum'
        });
        
        // SEGURANÇA: Validar group_id se passado
        if (groupId) {
          const groupIdStr = String(groupId);
          
          if (userGroupIds.length === 0) {
            console.warn('[SEGURANÇA /api/whatsapp/messages] Dev sem grupos mas tentando acessar grupo específico:', {
              developerId,
              requestedGroupId: groupIdStr
            });
            return NextResponse.json({ error: 'Nenhum grupo encontrado para este desenvolvedor' }, { status: 403 });
          }
          
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/whatsapp/messages] Dev tentando acessar grupo de outro dev:', {
              developerId,
              requestedGroupId: groupIdStr,
              allowedGroupIds: userGroupIds,
              groupIdInList: hasAccess
            });
            return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
          }
          console.log('[DEBUG /api/whatsapp/messages] Validação OK - grupo pertence ao dev');
        }
      } else {
        // Usuário normal: buscar via membership
        const { data: memberships, error: membershipError } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipError) {
          console.error('[ERROR /api/whatsapp/messages] Erro ao buscar memberships:', {
            message: membershipError.message,
            details: membershipError.details,
            hint: membershipError.hint,
            code: membershipError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar memberships', details: membershipError.message }, { status: 500 });
        }

        userGroupIds = memberships?.map(m => String(m.company_group_id)) || [];
        
        // SEGURANÇA: Se passou group_id, validar acesso
        if (groupId) {
          const groupIdStr = String(groupId);
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/whatsapp/messages] Acesso negado (membership):', {
              userId: user.id,
              groupId: groupIdStr,
              userGroupIds
            });
            return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
          }
        }
      }
      
      if (userGroupIds.length === 0) {
        console.log('[DEBUG /api/whatsapp/messages] Nenhum grupo encontrado para o usuário');
        return NextResponse.json({ messages: [], stats: { total: 0, sent: 0, received: 0, today: 0 } });
      }
    }

    let query = supabase
      .from('whatsapp_messages')
      .select(`
        id,
        direction,
        phone_number,
        group_id,
        sender_name,
        message_content,
        message_type,
        media_url,
        status,
        external_id,
        created_at,
        instance:whatsapp_instances(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por grupo
    if (groupId) {
      const groupIdStr = String(groupId);
      query = query.eq('company_group_id', groupIdStr);
      console.log('[DEBUG /api/whatsapp/messages] Filtrando por group_id:', groupIdStr);
    } else if (!user.is_master && userGroupIds.length > 0) {
      query = query.in('company_group_id', userGroupIds);
      console.log('[DEBUG /api/whatsapp/messages] Filtrando por userGroupIds:', userGroupIds);
    }

    // Filtros opcionais
    if (direction) {
      query = query.eq('direction', direction);
    }
    if (phone) {
      query = query.ilike('phone_number', `%${phone}%`);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('[ERROR /api/whatsapp/messages] Erro ao buscar mensagens:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[DEBUG /api/whatsapp/messages] Mensagens retornadas:', {
      total: messages?.length || 0,
      groupId: groupId || 'todos',
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)'
    });

    // Calcular estatísticas
    const allMessages = messages || [];
    const stats = {
      total: allMessages.length,
      sent: allMessages.filter(m => m.direction === 'outgoing').length,
      received: allMessages.filter(m => m.direction === 'incoming').length,
      today: allMessages.filter(m => {
        const msgDate = new Date(m.created_at).toDateString();
        const today = new Date().toDateString();
        return msgDate === today;
      }).length
    };

    return NextResponse.json({ messages: allMessages, stats });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

