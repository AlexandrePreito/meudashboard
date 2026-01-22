import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserGroupMembership } from '@/lib/auth';

// GET: Estatísticas de evolução
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para acessar estatísticas' },
        { status: 403 }
      );
    }

    // Obter parâmetros
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : new Date().getMonth() + 1;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : new Date().getFullYear();
    const view = searchParams.get('view') || 'day';

    // Total de exemplos
    const { count: totalExamples } = await supabase
      .from('ai_training_examples')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', membership.company_group_id)
      .eq('is_validated', true);

    // Total de perguntas pendentes
    const { count: totalPending } = await supabase
      .from('ai_unanswered_questions')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', membership.company_group_id)
      .eq('status', 'pending');

    let statsData: any[] = [];
    let monthlyData: any[] = [];

    if (view === 'month') {
      // Buscar dados de todo o ano para agregar por mês
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: allStats } = await supabase
        .from('ai_assistant_stats')
        .select('*')
        .eq('company_group_id', membership.company_group_id)
        .gte('stat_date', startDateStr)
        .lte('stat_date', endDateStr)
        .order('stat_date', { ascending: true });

      // Agregar por mês
      const monthlyMap = new Map();
      
      (allStats || []).forEach((stat: any) => {
        const date = new Date(stat.stat_date);
        const monthKey = date.getMonth() + 1;
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, {
            stat_date: new Date(year, monthKey - 1, 1).toISOString(),
            questions_asked: 0,
            questions_answered: 0,
            questions_failed: 0
          });
        }
        
        const monthData = monthlyMap.get(monthKey);
        monthData.questions_asked += stat.questions_asked || 0;
        monthData.questions_answered += stat.questions_answered || 0;
        monthData.questions_failed += stat.questions_failed || 0;
      });

      monthlyData = Array.from(monthlyMap.values());
      statsData = allStats || [];
    } else {
      // Estatísticas do mês selecionado (visualização diária)
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data: monthStats } = await supabase
        .from('ai_assistant_stats')
        .select('*')
        .eq('company_group_id', membership.company_group_id)
        .gte('stat_date', startDateStr)
        .lte('stat_date', endDateStr)
        .order('stat_date', { ascending: true });

      statsData = monthStats || [];
    }

    // Calcular taxa de sucesso dos últimos 7 e 30 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stats7d = statsData.filter(s => 
      new Date(s.stat_date) >= sevenDaysAgo
    );

    const stats30d = statsData.slice(-30);

    const calculate7dRate = () => {
      const total = stats7d.reduce((sum, s) => sum + (s.questions_asked || 0), 0);
      const answered = stats7d.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
      return total > 0 ? (answered / total) * 100 : 0;
    };

    const calculate30dRate = () => {
      const total = stats30d.reduce((sum, s) => sum + (s.questions_asked || 0), 0);
      const answered = stats30d.reduce((sum, s) => sum + (s.questions_answered || 0), 0);
      return total > 0 ? (answered / total) * 100 : 0;
    };

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total_examples: totalExamples || 0,
          total_pending: totalPending || 0,
          success_rate_7d: calculate7dRate(),
          success_rate_30d: calculate30dRate()
        },
        daily: statsData,
        monthly: monthlyData
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
