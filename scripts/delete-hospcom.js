/**
 * Script para deletar o grupo "hospcom" e todos os usuários @hospcom.net
 * 
 * Uso: node scripts/delete-hospcom.js
 * 
 * ATENÇÃO: Esta é uma operação destrutiva e irreversível!
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteGroupManually(groupId) {
  console.log(`\n📦 Deletando grupo ${groupId}...`);
  
  try {
    // 1. Buscar IDs de telas
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('company_group_id', groupId);
    const screenIds = screens?.map(s => s.id) || [];
    console.log(`   - Telas encontradas: ${screenIds.length}`);
    
    // 2. Excluir relacionamentos de telas
    if (screenIds.length > 0) {
      await supabase.from('powerbi_screen_users').delete().in('screen_id', screenIds);
      await supabase.from('user_screen_order').delete().eq('company_group_id', groupId);
    }
    
    // 3. Excluir telas
    await supabase.from('powerbi_dashboard_screens').delete().eq('company_group_id', groupId);
    console.log('   ✅ Telas deletadas');
    
    // 4. Excluir contextos de IA
    await supabase.from('ai_model_contexts').delete().eq('company_group_id', groupId);
    console.log('   ✅ Contextos de IA deletados');
    
    // 5. Excluir alertas e logs
    await supabase.from('alert_execution_logs').delete().eq('company_group_id', groupId);
    await supabase.from('ai_alerts').delete().eq('company_group_id', groupId);
    console.log('   ✅ Alertas deletados');
    
    // 6. Buscar números WhatsApp
    const { data: authorizedNumbers } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('id')
      .eq('company_group_id', groupId);
    const numberIds = authorizedNumbers?.map(n => n.id) || [];
    console.log(`   - Números WhatsApp encontrados: ${numberIds.length}`);
    
    // 7. Excluir datasets relacionados
    if (numberIds.length > 0) {
      await supabase.from('whatsapp_number_datasets').delete().in('authorized_number_id', numberIds);
    }
    
    // 8. Excluir números WhatsApp
    await supabase.from('whatsapp_authorized_numbers').delete().eq('company_group_id', groupId);
    console.log('   ✅ Números WhatsApp deletados');
    
    // 9. Excluir mensagens WhatsApp
    await supabase.from('whatsapp_messages').delete().eq('company_group_id', groupId);
    console.log('   ✅ Mensagens WhatsApp deletadas');
    
    // 10. Excluir vínculos de instâncias
    await supabase.from('whatsapp_instance_groups').delete().eq('company_group_id', groupId);
    console.log('   ✅ Vínculos de instâncias deletados');
    
    // 11. Excluir seleções de usuários
    await supabase.from('whatsapp_user_selections').delete().eq('company_group_id', groupId);
    await supabase.from('whatsapp_user_context').delete().eq('company_group_id', groupId);
    console.log('   ✅ Dados de usuários WhatsApp deletados');
    
    // 12. Excluir membros do grupo
    await supabase.from('user_group_membership').delete().eq('company_group_id', groupId);
    console.log('   ✅ Membros do grupo deletados');
    
    // 13. Excluir conexões Power BI
    await supabase.from('powerbi_connections').delete().eq('company_group_id', groupId);
    console.log('   ✅ Conexões Power BI deletadas');
    
    // 14. Excluir módulos do grupo
    await supabase.from('group_modules').delete().eq('company_group_id', groupId);
    console.log('   ✅ Módulos do grupo deletados');
    
    // 15. Excluir ordem de atualização
    await supabase.from('powerbi_refresh_order').delete().eq('company_group_id', groupId);
    console.log('   ✅ Ordem de atualização deletada');
    
    // 16. Excluir uso diário
    await supabase.from('daily_usage').delete().eq('company_group_id', groupId);
    await supabase.from('user_usage_summary').delete().eq('company_group_id', groupId);
    console.log('   ✅ Dados de uso deletados');
    
    // 17. Excluir logs de atividade
    await supabase.from('activity_logs').delete().eq('company_group_id', groupId);
    console.log('   ✅ Logs de atividade deletados');
    
    // 18. Excluir grupo
    const { error } = await supabase
      .from('company_groups')
      .delete()
      .eq('id', groupId);
    
    if (error) throw error;
    
    console.log('   ✅ Grupo deletado com sucesso!');
    return true;
  } catch (error) {
    console.error('   ❌ Erro ao deletar grupo:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Iniciando exclusão do grupo hospcom e usuários @hospcom.net...\n');
  
  const results = {
    group: null,
    users: [],
    errors: []
  };

  try {
    // 1. Buscar o grupo "hospcom"
    console.log('🔍 Buscando grupo hospcom...');
    const { data: group, error: groupError } = await supabase
      .from('company_groups')
      .select('id, name, slug')
      .or('name.ilike.%hospcom%,slug.ilike.%hospcom%')
      .limit(1)
      .maybeSingle();

    if (groupError) {
      throw new Error(`Erro ao buscar grupo: ${groupError.message}`);
    }

    if (group) {
      results.group = {
        id: group.id,
        name: group.name,
        slug: group.slug
      };
      console.log(`✅ Grupo encontrado: ${group.name} (${group.id})`);
      
      // 2. Deletar o grupo
      await deleteGroupManually(group.id);
      console.log('\n✅ Grupo deletado com sucesso!\n');
    } else {
      console.log('⚠️  Grupo hospcom não encontrado\n');
    }

    // 3. Buscar e deletar usuários @hospcom.net
    console.log('🔍 Buscando usuários @hospcom.net...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .ilike('email', '%@hospcom.net');

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`);
    }

    if (users && users.length > 0) {
      console.log(`✅ Encontrados ${users.length} usuários para deletar:\n`);
      
      for (const userToDelete of users) {
        try {
          console.log(`   🗑️  Deletando usuário: ${userToDelete.email} (${userToDelete.full_name || 'Sem nome'})`);
          
          // Deletar do Supabase Auth
          try {
            const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userToDelete.id);
            if (authDeleteError && !authDeleteError.message.includes('not found')) {
              console.warn(`      ⚠️  Aviso ao deletar do Auth: ${authDeleteError.message}`);
            }
          } catch (authErr) {
            console.warn(`      ⚠️  Erro ao deletar do Auth (pode não existir): ${authErr.message}`);
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
            throw new Error(deleteError.message);
          }
          
          console.log(`      ✅ Usuário deletado: ${userToDelete.email}`);
          results.users.push({
            id: userToDelete.id,
            email: userToDelete.email,
            name: userToDelete.full_name
          });
        } catch (userErr) {
          console.error(`      ❌ Erro ao deletar usuário ${userToDelete.email}:`, userErr.message);
          results.errors.push(`Erro ao deletar usuário ${userToDelete.email}: ${userErr.message}`);
        }
      }
      
      console.log(`\n✅ ${results.users.length} usuário(s) deletado(s) com sucesso!\n`);
    } else {
      console.log('⚠️  Nenhum usuário @hospcom.net encontrado\n');
    }

    // Resumo
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMO DA OPERAÇÃO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Grupo deletado: ${results.group ? 'Sim' : 'Não'}`);
    if (results.group) {
      console.log(`   - Nome: ${results.group.name}`);
      console.log(`   - ID: ${results.group.id}`);
    }
    console.log(`✅ Usuários deletados: ${results.users.length}`);
    if (results.users.length > 0) {
      results.users.forEach(u => {
        console.log(`   - ${u.email} (${u.name || 'Sem nome'})`);
      });
    }
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Erros encontrados: ${results.errors.length}`);
      results.errors.forEach(e => console.log(`   - ${e}`));
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ Operação concluída com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
    console.error('\n⚠️  Alguns dados podem ter sido deletados parcialmente.');
    process.exit(1);
  }
}

main();
