import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Apenas master pode ver gateways
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: connections } = await supabase
      .from('powerbi_connections')
      .select('*');

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        gateways: [], 
        total: 0, 
        online: 0, 
        offline: 0, 
        partial: 0 
      });
    }

    const allGateways: any[] = [];
    const seenGatewayIds = new Set<string>();

    for (const connection of connections) {
      try {
        // Obter token
        const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: connection.client_id,
            client_secret: connection.client_secret,
            scope: 'https://analysis.windows.net/powerbi/api/.default',
          }),
        });

        if (!tokenResponse.ok) continue;

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Buscar gateways
        const gatewaysRes = await fetch(
          'https://api.powerbi.com/v1.0/myorg/gateways',
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!gatewaysRes.ok) continue;

        const gatewaysData = await gatewaysRes.json();
        const gateways = gatewaysData.value || [];

        for (const gateway of gateways) {
          if (seenGatewayIds.has(gateway.id)) continue;
          seenGatewayIds.add(gateway.id);

          // Buscar datasources do gateway
          let datasources: any[] = [];
          let onlineCount = 0;
          let offlineCount = 0;

          try {
            const dsRes = await fetch(
              `https://api.powerbi.com/v1.0/myorg/gateways/${gateway.id}/datasources`,
              { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            if (dsRes.ok) {
              const dsData = await dsRes.json();
              datasources = (dsData.value || []).map((ds: any) => {
                const status = ds.connectionDetails ? 'online' : 'unknown';
                if (status === 'online') onlineCount++;
                else offlineCount++;
                
                return {
                  id: ds.id,
                  datasourceName: ds.datasourceName || ds.datasourceType,
                  datasourceType: ds.datasourceType,
                  connectionDetails: ds.connectionDetails || '',
                  status
                };
              });
            }
          } catch (e) {
            console.error('Erro ao buscar datasources:', e);
          }

          // Determinar status do gateway
          let status: 'online' | 'offline' | 'partial' | 'unknown' = 'unknown';
          if (datasources.length === 0) {
            status = 'unknown';
          } else if (offlineCount === 0) {
            status = 'online';
          } else if (onlineCount === 0) {
            status = 'offline';
          } else {
            status = 'partial';
          }

          allGateways.push({
            id: gateway.id,
            name: gateway.name,
            type: gateway.type || 'Personal',
            status,
            datasources,
            datasourcesCount: datasources.length,
            onlineCount,
            offlineCount,
            connectionName: connection.name
          });
        }
      } catch (e) {
        console.error('Erro ao processar conexão:', e);
      }
    }

    // Calcular resumo
    const total = allGateways.length;
    const online = allGateways.filter(g => g.status === 'online').length;
    const offline = allGateways.filter(g => g.status === 'offline').length;
    const partial = allGateways.filter(g => g.status === 'partial').length;

    return NextResponse.json({
      gateways: allGateways,
      total,
      online,
      offline,
      partial
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}



