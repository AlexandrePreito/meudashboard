import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Buscar TODOS os screens (telas)
    const { data: screens, error: screensError } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, is_active, last_refresh_date, refresh_status, company_group_id');

    // Buscar TODOS os reports (relatórios)
    const { data: reports, error: reportsError } = await supabase
      .from('powerbi_reports')
      .select('id, name, is_active, last_refresh_date, refresh_status, connection_id, connection:powerbi_connections(company_group_id)');

    if (screensError || reportsError) {
      console.error('Erro ao buscar recursos:', { screensError, reportsError });
    }

    const allScreens = screens || [];
    const allReports = reports || [];

    // Calcular estatísticas
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let datasetsOk = 0;
    let datasetsFailed = 0;
    let datasetsStale = 0;

    let dataflowsOk = 0;
    let dataflowsFailed = 0;
    let dataflowsStale = 0;

    // Processar screens (datasets)
    for (const screen of allScreens) {
      if (!screen.is_active) continue;

      if (screen.refresh_status === 'Failed' || screen.refresh_status === 'Error') {
        datasetsFailed++;
      } else {
        const lastRefresh = screen.last_refresh_date ? new Date(screen.last_refresh_date) : null;
        if (!lastRefresh || lastRefresh < oneDayAgo) {
          datasetsStale++;
        } else {
          datasetsOk++;
        }
      }
    }

    // Processar reports (dataflows)
    for (const report of allReports) {
      if (!report.is_active) continue;

      if (report.refresh_status === 'Failed' || report.refresh_status === 'Error') {
        dataflowsFailed++;
      } else {
        const lastRefresh = report.last_refresh_date ? new Date(report.last_refresh_date) : null;
        if (!lastRefresh || lastRefresh < oneDayAgo) {
          dataflowsStale++;
        } else {
          dataflowsOk++;
        }
      }
    }

    const totalActive = allScreens.filter(s => s.is_active).length + allReports.filter(r => r.is_active).length;
    const totalOk = datasetsOk + dataflowsOk;
    const totalFailed = datasetsFailed + dataflowsFailed;
    const totalStale = datasetsStale + dataflowsStale;
    
    const healthPercentage = totalActive > 0 ? Math.round((totalOk / totalActive) * 100) : 0;

    return NextResponse.json({
      summary: {
        healthPercentage,
        total: totalActive,
        updated: totalOk,
        failed: totalFailed,
        stale: totalStale
      },
      datasets: {
        total: allScreens.filter(s => s.is_active).length,
        ok: datasetsOk,
        failed: datasetsFailed,
        stale: datasetsStale
      },
      dataflows: {
        total: allReports.filter(r => r.is_active).length,
        ok: dataflowsOk,
        failed: dataflowsFailed,
        stale: dataflowsStale
      }
    });

  } catch (error) {
    console.error('Erro na API de health:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
