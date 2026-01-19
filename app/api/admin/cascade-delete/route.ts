import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { type, id, password } = await request.json();

    if (!type || !id || !password) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar senha do usuário
    const { data: userData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    let isValid = false;

    if (userData?.password_hash) {
      // Se tem password_hash na tabela users, validar com bcrypt
      isValid = await bcrypt.compare(password, userData.password_hash);
    } else {
      // Se não tem, tentar validar via Supabase Auth
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
        if (authUser?.user?.email) {
          // Tentar fazer sign in para validar senha
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: authUser.user.email,
            password: password
          });
          isValid = !signInError && !!signInData?.user;
        }
      } catch (authError) {
        console.error('[Cascade Delete] Erro ao validar senha via Auth:', authError);
        isValid = false;
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    if (type === 'developer') {
      // Buscar grupos do desenvolvedor
      const { data: groups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', id);

      const groupIds = groups?.map(g => g.id) || [];

      // Excluir dados relacionados aos grupos
      if (groupIds.length > 0) {
        // Excluir telas Power BI
        await supabase.from('powerbi_dashboard_screens').delete().in('company_group_id', groupIds);
        
        // Excluir membros de grupos
        await supabase.from('user_group_membership').delete().in('company_group_id', groupIds);
        
        // Excluir conexões Power BI
        await supabase.from('powerbi_connections').delete().in('company_group_id', groupIds);
        
        // Excluir contextos de IA
        await supabase.from('ai_model_contexts').delete().in('company_group_id', groupIds);
        
        // Excluir alertas
        await supabase.from('ai_alerts').delete().in('company_group_id', groupIds);
        
        // Excluir números WhatsApp autorizados
        await supabase.from('whatsapp_authorized_numbers').delete().in('company_group_id', groupIds);
        
        // Excluir mensagens WhatsApp
        await supabase.from('whatsapp_messages').delete().in('company_group_id', groupIds);
        
        // Excluir vínculos de instâncias
        await supabase.from('whatsapp_instance_groups').delete().in('company_group_id', groupIds);
        
        // Excluir módulos do grupo
        await supabase.from('group_modules').delete().in('company_group_id', groupIds);
        
        // Excluir ordem de atualização
        await supabase.from('powerbi_refresh_order').delete().in('company_group_id', groupIds);
        
        // Excluir uso diário
        await supabase.from('daily_usage').delete().in('company_group_id', groupIds);
        
        // Excluir logs de atividade
        await supabase.from('activity_logs').delete().in('company_group_id', groupIds);
      }

      // Excluir grupos
      if (groupIds.length > 0) {
        await supabase.from('company_groups').delete().in('id', groupIds);
      }

      // Excluir desenvolvedor
      const { error } = await supabase.from('developers').delete().eq('id', id);

      if (error) {
        throw error;
      }

    } else if (type === 'group') {
      console.log('[Cascade Delete] Iniciando exclusão do grupo:', id);
      
      // Ordem de exclusão: primeiro tabelas dependentes, depois o grupo
      
      // 1. Buscar IDs de telas para excluir relacionamentos
      const { data: screens } = await supabase
        .from('powerbi_dashboard_screens')
        .select('id')
        .eq('company_group_id', id);
      const screenIds = screens?.map(s => s.id) || [];
      console.log('[Cascade Delete] Telas encontradas:', screenIds.length);
      
      // 2. Excluir relacionamentos de telas com usuários (N:N)
      if (screenIds.length > 0) {
        const { error: screenUsersError } = await supabase
          .from('powerbi_screen_users')
          .delete()
          .in('screen_id', screenIds);
        if (screenUsersError) {
          console.error('[Cascade Delete] Erro ao excluir powerbi_screen_users:', screenUsersError);
        }
      }
      
      // 3. Excluir ordem de telas por usuário
      const { error: orderError } = await supabase
        .from('user_screen_order')
        .delete()
        .eq('company_group_id', id);
      if (orderError) console.error('[Cascade Delete] Erro ao excluir user_screen_order:', orderError);
      
      // 4. Excluir telas Power BI
      const { error: screensError } = await supabase
        .from('powerbi_dashboard_screens')
        .delete()
        .eq('company_group_id', id);
      if (screensError) console.error('[Cascade Delete] Erro ao excluir telas:', screensError);
      
      // 5. Excluir contextos de IA
      const { error: contextsError } = await supabase
        .from('ai_model_contexts')
        .delete()
        .eq('company_group_id', id);
      if (contextsError) console.error('[Cascade Delete] Erro ao excluir contextos:', contextsError);
      
      // 6. Excluir alertas e logs de execução
      const { error: alertLogsError } = await supabase
        .from('alert_execution_logs')
        .delete()
        .eq('company_group_id', id);
      if (alertLogsError) console.error('[Cascade Delete] Erro ao excluir alert_execution_logs:', alertLogsError);
      
      const { error: alertsError } = await supabase
        .from('ai_alerts')
        .delete()
        .eq('company_group_id', id);
      if (alertsError) console.error('[Cascade Delete] Erro ao excluir alertas:', alertsError);
      
      // 7. Buscar IDs de números WhatsApp
      const { data: authorizedNumbers } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('id')
        .eq('company_group_id', id);
      const numberIds = authorizedNumbers?.map(n => n.id) || [];
      console.log('[Cascade Delete] Números WhatsApp encontrados:', numberIds.length);
      
      // 8. Excluir datasets relacionados aos números
      if (numberIds.length > 0) {
        const { error: numberDatasetsError } = await supabase
          .from('whatsapp_number_datasets')
          .delete()
          .in('authorized_number_id', numberIds);
        if (numberDatasetsError) console.error('[Cascade Delete] Erro ao excluir whatsapp_number_datasets:', numberDatasetsError);
      }
      
      // 9. Excluir números WhatsApp autorizados
      const { error: numbersError } = await supabase
        .from('whatsapp_authorized_numbers')
        .delete()
        .eq('company_group_id', id);
      if (numbersError) console.error('[Cascade Delete] Erro ao excluir números:', numbersError);
      
      // 10. Excluir mensagens WhatsApp
      const { error: messagesError } = await supabase
        .from('whatsapp_messages')
        .delete()
        .eq('company_group_id', id);
      if (messagesError) console.error('[Cascade Delete] Erro ao excluir mensagens:', messagesError);
      
      // 11. Excluir vínculos de instâncias
      const { error: instanceGroupsError } = await supabase
        .from('whatsapp_instance_groups')
        .delete()
        .eq('company_group_id', id);
      if (instanceGroupsError) console.error('[Cascade Delete] Erro ao excluir whatsapp_instance_groups:', instanceGroupsError);
      
      // 12. Excluir seleções de usuários WhatsApp
      const { error: selectionsError } = await supabase
        .from('whatsapp_user_selections')
        .delete()
        .eq('company_group_id', id);
      if (selectionsError) console.error('[Cascade Delete] Erro ao excluir whatsapp_user_selections:', selectionsError);
      
      // 13. Excluir contexto de usuários WhatsApp (se existir)
      const { error: userContextError } = await supabase
        .from('whatsapp_user_context')
        .delete()
        .eq('company_group_id', id);
      if (userContextError) console.error('[Cascade Delete] Erro ao excluir whatsapp_user_context:', userContextError);
      
      // 14. Excluir membros do grupo
      const { error: membershipError } = await supabase
        .from('user_group_membership')
        .delete()
        .eq('company_group_id', id);
      if (membershipError) {
        console.error('[Cascade Delete] Erro ao excluir membros:', membershipError);
        throw membershipError;
      }
      
      // 15. Excluir conexões Power BI
      const { error: connectionsError } = await supabase
        .from('powerbi_connections')
        .delete()
        .eq('company_group_id', id);
      if (connectionsError) console.error('[Cascade Delete] Erro ao excluir conexões:', connectionsError);
      
      // 16. Excluir módulos do grupo
      const { error: modulesError } = await supabase
        .from('group_modules')
        .delete()
        .eq('company_group_id', id);
      if (modulesError) console.error('[Cascade Delete] Erro ao excluir módulos:', modulesError);
      
      // 17. Excluir ordem de atualização
      const { error: refreshOrderError } = await supabase
        .from('powerbi_refresh_order')
        .delete()
        .eq('company_group_id', id);
      if (refreshOrderError) console.error('[Cascade Delete] Erro ao excluir refresh_order:', refreshOrderError);
      
      // 18. Excluir uso diário
      const { error: dailyUsageError } = await supabase
        .from('daily_usage')
        .delete()
        .eq('company_group_id', id);
      if (dailyUsageError) console.error('[Cascade Delete] Erro ao excluir daily_usage:', dailyUsageError);
      
      // 19. Excluir resumo de uso
      const { error: usageSummaryError } = await supabase
        .from('user_usage_summary')
        .delete()
        .eq('company_group_id', id);
      if (usageSummaryError) console.error('[Cascade Delete] Erro ao excluir user_usage_summary:', usageSummaryError);
      
      // 20. Excluir logs de atividade
      const { error: logsError } = await supabase
        .from('activity_logs')
        .delete()
        .eq('company_group_id', id);
      if (logsError) console.error('[Cascade Delete] Erro ao excluir logs:', logsError);

      // 21. Excluir grupo (por último)
      console.log('[Cascade Delete] Excluindo grupo:', id);
      const { error } = await supabase
        .from('company_groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[Cascade Delete] Erro ao excluir grupo:', error);
        throw error;
      }
      
      console.log('[Cascade Delete] Grupo excluído com sucesso:', id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cascade delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
