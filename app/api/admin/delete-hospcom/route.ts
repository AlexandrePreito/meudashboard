import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

/**
 * Script para deletar o grupo "hospcom" e todos os usuários @hospcom.net
 * ATENÇÃO: Esta é uma operação destrutiva e irreversível!
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user || !user.is_master) {
      return NextResponse.json({ error: 'Apenas master pode executar esta operação' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const results: any = {
      group: null,
      users: [],
      errors: []
    };

    // 1. Buscar o grupo "hospcom"
    console.log('[Delete Hospcom] Buscando grupo hospcom...');
    const { data: group, error: groupError } = await supabase
      .from('company_groups')
      .select('id, name, slug')
      .or('name.ilike.%hospcom%,slug.ilike.%hospcom%')
      .limit(1)
      .maybeSingle();

    if (groupError) {
      console.error('[Delete Hospcom] Erro ao buscar grupo:', groupError);
      results.errors.push(`Erro ao buscar grupo: ${groupError.message}`);
    }

    if (group) {
      results.group = {
        id: group.id,
        name: group.name,
        slug: group.slug
      };
      console.log('[Delete Hospcom] Grupo encontrado:', results.group);

      // 2. Deletar o grupo manualmente (cascade delete completo)
      await deleteGroupManually(supabase, group.id, results);
    } else {
      console.log('[Delete Hospcom] Grupo hospcom não encontrado');
    }

    // 3. Buscar e deletar usuários @hospcom.net
    console.log('[Delete Hospcom] Buscando usuários @hospcom.net...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .ilike('email', '%@hospcom.net');

    if (usersError) {
      console.error('[Delete Hospcom] Erro ao buscar usuários:', usersError);
      results.errors.push(`Erro ao buscar usuários: ${usersError.message}`);
    }

    if (users && users.length > 0) {
      console.log(`[Delete Hospcom] Encontrados ${users.length} usuários para deletar`);
      
      for (const userToDelete of users) {
        try {
          // Deletar do Supabase Auth primeiro
          try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);
            if (authDeleteError) {
              console.warn(`[Delete Hospcom] Erro ao deletar do Auth (pode não existir): ${authDeleteError.message}`);
            }
          } catch (authErr: any) {
            console.warn(`[Delete Hospcom] Erro ao deletar do Auth: ${authErr.message}`);
          }

          // Deletar memberships
          await supabase
            .from('user_group_membership')
            .delete()
            .eq('user_id', userToDelete.id);

          // Deletar da tabela users
          const { error: deleteError } = await supabase
            .from('users')
            .delete()
            .eq('id', userToDelete.id);

          if (deleteError) {
            console.error(`[Delete Hospcom] Erro ao deletar usuário ${userToDelete.email}:`, deleteError);
            results.errors.push(`Erro ao deletar usuário ${userToDelete.email}: ${deleteError.message}`);
          } else {
            console.log(`[Delete Hospcom] Usuário deletado: ${userToDelete.email}`);
            results.users.push({
              id: userToDelete.id,
              email: userToDelete.email,
              name: userToDelete.full_name
            });
          }
        } catch (userErr: any) {
          console.error(`[Delete Hospcom] Erro ao processar usuário ${userToDelete.email}:`, userErr);
          results.errors.push(`Erro ao processar usuário ${userToDelete.email}: ${userErr.message}`);
        }
      }
    } else {
      console.log('[Delete Hospcom] Nenhum usuário @hospcom.net encontrado');
    }

    return NextResponse.json({
      success: true,
      message: 'Operação concluída',
      results: {
        groupDeleted: !!results.group,
        groupInfo: results.group,
        usersDeleted: results.users.length,
        users: results.users,
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    });
  } catch (error: any) {
    console.error('[Delete Hospcom] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro ao executar operação',
      details: error.message 
    }, { status: 500 });
  }
}

async function deleteGroupManually(supabase: any, groupId: string, results: any) {
  console.log('[Delete Hospcom] Iniciando exclusão manual do grupo...');
  
  try {
    // Ordem de exclusão: primeiro tabelas dependentes, depois o grupo
    
    // 1. Buscar IDs de telas
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('company_group_id', groupId);
    const screenIds = screens?.map((s: { id: string }) => s.id) || [];
    
    // 2. Excluir relacionamentos de telas
    if (screenIds.length > 0) {
      await supabase.from('powerbi_screen_users').delete().in('screen_id', screenIds);
      await supabase.from('user_screen_order').delete().eq('company_group_id', groupId);
    }
    
    // 3. Excluir telas
    await supabase.from('powerbi_dashboard_screens').delete().eq('company_group_id', groupId);
    
    // 4. Excluir contextos de IA
    await supabase.from('ai_model_contexts').delete().eq('company_group_id', groupId);
    
    // 5. Excluir alertas e logs
    await supabase.from('alert_execution_logs').delete().eq('company_group_id', groupId);
    await supabase.from('ai_alerts').delete().eq('company_group_id', groupId);
    
    // 6. Buscar números WhatsApp
    const { data: authorizedNumbers } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('id')
      .eq('company_group_id', groupId);
    const numberIds = authorizedNumbers?.map((n: { id: string }) => n.id) || [];
    
    // 7. Excluir datasets relacionados
    if (numberIds.length > 0) {
      await supabase.from('whatsapp_number_datasets').delete().in('authorized_number_id', numberIds);
    }
    
    // 8. Excluir números WhatsApp
    await supabase.from('whatsapp_authorized_numbers').delete().eq('company_group_id', groupId);
    
    // 9. Excluir mensagens WhatsApp
    await supabase.from('whatsapp_messages').delete().eq('company_group_id', groupId);
    
    // 10. Excluir vínculos de instâncias
    await supabase.from('whatsapp_instance_groups').delete().eq('company_group_id', groupId);
    
    // 11. Excluir seleções de usuários
    await supabase.from('whatsapp_user_selections').delete().eq('company_group_id', groupId);
    
    // 12. Excluir contexto de usuários
    await supabase.from('whatsapp_user_context').delete().eq('company_group_id', groupId);
    
    // 13. Excluir membros do grupo
    await supabase.from('user_group_membership').delete().eq('company_group_id', groupId);
    
    // 14. Excluir conexões Power BI
    await supabase.from('powerbi_connections').delete().eq('company_group_id', groupId);
    
    // 15. Excluir módulos do grupo
    await supabase.from('group_modules').delete().eq('company_group_id', groupId);
    
    // 16. Excluir ordem de atualização
    await supabase.from('powerbi_refresh_order').delete().eq('company_group_id', groupId);
    
    // 17. Excluir uso diário
    await supabase.from('daily_usage').delete().eq('company_group_id', groupId);
    
    // 18. Excluir resumo de uso
    await supabase.from('user_usage_summary').delete().eq('company_group_id', groupId);
    
    // 19. Excluir logs de atividade
    await supabase.from('activity_logs').delete().eq('company_group_id', groupId);
    
    // 20. Excluir grupo
    const { error } = await supabase
      .from('company_groups')
      .delete()
      .eq('id', groupId);
    
    if (error) {
      throw error;
    }
    
    console.log('[Delete Hospcom] Grupo deletado manualmente com sucesso');
  } catch (error: any) {
    console.error('[Delete Hospcom] Erro ao deletar grupo manualmente:', error);
    results.errors.push(`Erro ao deletar grupo: ${error.message}`);
    throw error;
  }
}
