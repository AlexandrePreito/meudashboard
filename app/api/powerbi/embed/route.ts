import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { getDeveloperIdForGroup, resolveConnectionForGroup } from '@/lib/shared-resources';

// POST - Gerar embed token
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { screen_id } = body;

    if (!screen_id) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: screen, error: screenError } = await supabase
      .from('powerbi_dashboard_screens')
      .select(`
        *,
        report:powerbi_reports(
          *,
          connection:powerbi_connections(*)
        )
      `)
      .eq('id', screen_id)
      .single();

    if (screenError || !screen) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    // SEGURANÇA: Validar acesso do usuário à tela
    // Ordem: 1) Master → total; 2) Developer dono do grupo → total; 3) Admin; 4) Viewer (screen_users)
    if (!user.is_master) {
      // 1. Verificar se é developer dono do grupo (não tem membership, mas é owner)
      const { data: groupData } = await supabase
        .from('company_groups')
        .select('developer_id')
        .eq('id', screen.company_group_id)
        .single();

      const userDeveloperId = await getUserDeveloperId(user.id);
      const isDeveloper = userDeveloperId != null && userDeveloperId === groupData?.developer_id;

      if (!isDeveloper) {
        // 2. Não é developer — precisa ter membership no grupo
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('id, role')
          .eq('user_id', user.id)
          .eq('company_group_id', screen.company_group_id)
          .eq('is_active', true)
          .maybeSingle();

        if (!membership) {
          console.warn('[SEGURANÇA /api/powerbi/embed] Acesso negado - sem membership:', {
            userId: user.id,
            screenId: screen_id,
            screenGroupId: screen.company_group_id
          });
          return NextResponse.json({ error: 'Sem permissão para acessar esta tela' }, { status: 403 });
        }

        const isAdmin = membership.role === 'admin';

        // 3. Admin tem acesso total, pular screen_users
        if (!isAdmin) {
          // 4. Viewer — verificar screen_users
          const { data: screenUsers } = await supabase
            .from('powerbi_screen_users')
            .select('user_id')
            .eq('screen_id', screen_id);

          if (screenUsers && screenUsers.length > 0) {
            const hasAccess = screenUsers.some(su => su.user_id === user.id);
            if (!hasAccess) {
              console.warn('[SEGURANÇA /api/powerbi/embed] Acesso negado - usuário não está na lista:', {
                userId: user.id,
                screenId: screen_id,
                allowedUserIds: screenUsers.map(su => su.user_id)
              });
              return NextResponse.json({ error: 'Sem permissão para acessar esta tela' }, { status: 403 });
            }
          }
        }
      }
      // Se isDeveloper = true, acesso liberado (pula toda verificação)
    }

    const report = screen.report;
    let connection = report?.connection;

    if (!connection) {
      const developerId = await getDeveloperIdForGroup(screen.company_group_id);
      if (developerId) {
        connection = await resolveConnectionForGroup(screen.company_group_id, developerId);
      }
    }

    if (!connection) {
      return NextResponse.json({ error: 'Nenhuma conexão Power BI configurada' }, { status: 404 });
    }

    // ── RLS Dinâmico ──────────────────────────────────────────
    let rlsIdentity: { username: string; roles: string[]; datasets: string[] } | null = null;
    const datasetId = report?.dataset_id || (connection as { dataset_id?: string })?.dataset_id;

    if (screen.rls_enabled) {
      if (!screen.rls_role_name) {
        console.warn(
          `[Embed] Tela ${screen_id} tem rls_enabled=true mas rls_role_name está vazio. Ignorando RLS.`
        );
      } else if (!datasetId) {
        console.warn(
          `[Embed] Tela ${screen_id} tem rls_enabled=true mas não há dataset_id. Ignorando RLS.`
        );
      } else {
        rlsIdentity = {
          username: user.email,
          roles: [screen.rls_role_name],
          datasets: [datasetId],
        };
        console.log('[RLS] Aplicando identidade:', {
          screenId: screen_id,
          userId: user.id,
          email: user.email,
          role: screen.rls_role_name,
        });
      }
    }
    // ── Fim RLS ───────────────────────────────────────────────

    // 1. Obter token do Azure AD
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Erro ao obter token Azure:', errorData);
      return NextResponse.json({ 
        error: 'Falha na autenticação Power BI: ' + (errorData.error_description || 'Erro desconhecido')
      }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Gerar embed token para o relatório
    const embedUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/reports/${report.report_id}/GenerateToken`;

    async function generateEmbedToken(useIdentity: boolean) {
      return fetch(embedUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessLevel: 'View',
          allowSaveAs: false,
          ...(useIdentity && rlsIdentity ? { identities: [rlsIdentity] } : {}),
        }),
      });
    }

    let embedResponse = await generateEmbedToken(!!rlsIdentity);

    if (!embedResponse.ok) {
      const errorData = await embedResponse.json();
      const errorMessage = errorData?.error?.message || errorData?.message || JSON.stringify(errorData);

      if (
        rlsIdentity &&
        (errorMessage.includes("shouldn't have effective identity") ||
          errorMessage.includes('effective identity') ||
          errorMessage.includes('EffectiveIdentity'))
      ) {
        console.warn(
          `[Embed] RLS configurado na tela mas o dataset não tem role. Gerando token sem identity. Screen: ${screen_id}`
        );
        await supabase
          .from('powerbi_dashboard_screens')
          .update({ rls_enabled: false, rls_role_name: '' })
          .eq('id', screen_id);

        embedResponse = await generateEmbedToken(false);
      }

      if (!embedResponse.ok) {
        const retryErrorData = await embedResponse.json();
        console.error('Erro ao gerar embed token:', retryErrorData);
        return NextResponse.json(
          {
            error:
              'Falha ao gerar token de visualização: ' +
              (retryErrorData?.error?.message || 'Erro desconhecido'),
          },
          { status: 500 }
        );
      }
    }

    const embedData = await embedResponse.json();

    // 3. Montar URL de embed
    const reportEmbedUrl = `https://app.powerbi.com/reportEmbed?reportId=${report.report_id}&groupId=${connection.workspace_id}`;

    return NextResponse.json({
      embedToken: embedData.token,
      embedUrl: reportEmbedUrl,
      reportId: report.report_id,
      expiration: embedData.expiration,
      defaultPage: report.default_page,
      showPageNavigation: connection.show_page_navigation,
      screenTitle: screen.title,
      screenIcon: screen.icon
    });
  } catch (error) {
    console.error('Erro ao gerar embed:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar embed' }, { status: 500 });
  }
}




