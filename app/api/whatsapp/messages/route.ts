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
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      // SEGURANÇA: Se passou group_id, validar acesso
      if (groupId && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
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
      query = query.eq('company_group_id', groupId);
    } else if (!user.is_master && userGroupIds.length > 0) {
      query = query.in('company_group_id', userGroupIds);
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
      console.error('Erro ao buscar mensagens:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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

