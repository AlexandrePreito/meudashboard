import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 });
    }

    // Developers tem role = 'developer'
    const isDeveloper = membership.role === 'developer';

    // Bloquear viewer e operator (apenas para usuarios normais)
    if (!isDeveloper && (membership.role === 'viewer' || membership.role === 'operator')) {
      return NextResponse.json({ success: false, error: 'Sem permissao' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const countsOnly = searchParams.get('counts') === 'true';

    let groupIds: string[] = [];

    if (isDeveloper) {
      // Para developers: buscar todos os grupos que ele gerencia via user_id
      const { data: user } = await supabase
        .from('users')
        .select('developer_id')
        .eq('id', membership.user_id)
        .single();

      if (user?.developer_id) {
        const { data: groups, error: groupsError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', user.developer_id);

        if (!groupsError && groups) {
          groupIds = groups.map(g => g.id);
        }
      }

      // Fallback: usar o company_group_id do membership se nao encontrar grupos
      if (groupIds.length === 0 && membership.company_group_id) {
        groupIds = [membership.company_group_id];
      }
    } else if (membership.company_group_id) {
      groupIds = [membership.company_group_id];
    }

    // Se pediu apenas contadores, retornar todos de uma vez
    if (countsOnly) {
      if (groupIds.length === 0) {
        return NextResponse.json({
          success: true,
          counts: {
            total: 0,
            pending: 0,
            resolved: 0,
            ignored: 0
          }
        });
      }

      const [totalResult, pendingResult, resolvedResult, ignoredResult] = await Promise.all([
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).in('company_group_id', groupIds),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).in('company_group_id', groupIds).eq('status', 'pending'),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).in('company_group_id', groupIds).eq('status', 'resolved'),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).in('company_group_id', groupIds).eq('status', 'ignored')
      ]);

      return NextResponse.json({
        success: true,
        counts: {
          total: totalResult.count || 0,
          pending: pendingResult.count || 0,
          resolved: resolvedResult.count || 0,
          ignored: ignoredResult.count || 0
        }
      });
    }

    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, data: [], total: 0, limit, offset });
    }

    let query = supabase
      .from('ai_unanswered_questions')
      .select('*', { count: 'exact' })
      .in('company_group_id', groupIds)
      .eq('status', status)
      .order('priority_score', { ascending: false })
      .order('last_asked_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('user_question', '%' + search + '%');
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [], total: count || 0, limit, offset });

  } catch (error: any) {
    console.error('Erro na API questions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}