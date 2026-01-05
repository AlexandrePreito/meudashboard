import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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

    const supabase = createAdminClient();

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

