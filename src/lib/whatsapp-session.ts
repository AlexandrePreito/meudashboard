// src/lib/whatsapp-session.ts
import { SupabaseClient } from '@supabase/supabase-js';

// TIPOS
export interface AvailableDataset {
  authorized_number_id: string;
  phone_number: string;
  user_name: string;
  company_group_id: string;
  connection_id: string;
  dataset_id: string;
  dataset_name: string;
  context_id: string | null;
  context_name: string | null;
  connection_name: string | null;
  option_number: number;
}

export interface ActiveSession {
  id: string;
  authorized_number_id: string;
  phone_number: string;
  connection_id: string;
  dataset_id: string;
  dataset_name: string;
  context_id: string | null;
  selected_at: string;
  last_activity_at: string;
  expires_at: string;
}

export interface SessionResult {
  hasSession: boolean;
  session: ActiveSession | null;
  needsSelection: boolean;
  availableDatasets: AvailableDataset[];
  menuMessage?: string;
}

// FUNÇÕES

// Busca datasets disponíveis para um telefone
export async function getAvailableDatasets(
  supabase: SupabaseClient,
  phone: string
): Promise<AvailableDataset[]> {
  const { data, error } = await supabase
    .from('whatsapp_available_datasets')
    .select('*')
    .eq('phone_number', phone)
    .order('option_number');
  
  if (error) {
    console.error('[getAvailableDatasets] Erro:', error.message);
    return [];
  }
  
  return data || [];
}

// Busca sessão ativa
export async function getActiveSession(
  supabase: SupabaseClient,
  phone: string
): Promise<ActiveSession | null> {
  const { data, error } = await supabase
    .from('whatsapp_active_sessions')
    .select('*')
    .eq('phone_number', phone)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  
  if (error) {
    console.error('[getActiveSession] Erro:', error.message);
    return null;
  }
  
  return data;
}

// Cria ou atualiza sessão
export async function setActiveSession(
  supabase: SupabaseClient,
  phone: string,
  dataset: AvailableDataset
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_active_sessions')
    .upsert({
      authorized_number_id: dataset.authorized_number_id,
      phone_number: phone,
      connection_id: dataset.connection_id,
      dataset_id: dataset.dataset_id,
      dataset_name: dataset.dataset_name,
      context_id: dataset.context_id,
      selected_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'phone_number' });
  
  if (error) {
    console.error('[setActiveSession] Erro:', error.message);
    return false;
  }
  
  return true;
}

// Atualiza última atividade
export async function updateSessionActivity(
  supabase: SupabaseClient,
  phone: string
): Promise<void> {
  await supabase
    .from('whatsapp_active_sessions')
    .update({
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('phone_number', phone);
}

// Limpa sessão
export async function clearSession(
  supabase: SupabaseClient,
  phone: string
): Promise<boolean> {
  const { error } = await supabase
    .from('whatsapp_active_sessions')
    .delete()
    .eq('phone_number', phone);
  
  if (error) {
    console.error('[clearSession] Erro:', error.message);
    return false;
  }
  
  return true;
}

// Verifica se é comando de troca
export function isChangeCommand(message: string): boolean {
  const commands = ['trocar', 'sair', 'mudar', 'voltar', 'menu', '/trocar', '/sair', '/mudar'];
  return commands.includes(message.trim().toLowerCase());
}

// Encontra dataset pelo input do usuário
export function findDatasetByInput(
  datasets: AvailableDataset[],
  input: string
): AvailableDataset | null {
  const normalized = input.trim().toLowerCase();
  const num = parseInt(normalized);

  // Se é número puro, buscar por option_number
  if (/^\d+$/.test(normalized) && num > 0 && num <= datasets.length) {
    return datasets.find(d => d.option_number === num) || null;
  }

  // Se é texto, buscar APENAS por nome EXATO (não parcial)
  return datasets.find(d =>
    (d.dataset_name || '').toLowerCase() === normalized ||
    (d.context_name || '').toLowerCase() === normalized ||
    (d.connection_name || '').toLowerCase() === normalized
  ) || null;
}

// Gera menu de seleção
export function generateSelectionMenu(
  datasets: AvailableDataset[],
  userName?: string
): string {
  const greeting = userName ? `Olá, *${userName}*! ` : 'Olá! ';
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
  const options = datasets.map(d => {
    const emoji = emojis[d.option_number - 1] || `${d.option_number}.`;
    const name = d.dataset_name || d.context_name || 'Dataset';
    return `${emoji} *${name}*`;
  }).join('\n');

  return `${greeting}📊 Você tem acesso a múltiplos sistemas.

Qual deseja usar agora?

${options}

💡 *Responda com o número ou nome.*
🔄 Digite *trocar* a qualquer momento para mudar.`;
}

// Gera confirmação de seleção
export function generateSelectionConfirmation(dataset: AvailableDataset): string {
  const name = dataset.dataset_name || dataset.context_name || 'Dataset';
  return `✅ *${name}* selecionado!

Agora pode fazer suas perguntas. 

💡 Digite *trocar* para mudar de sistema.`;
}

// Gera rodapé
export function generateFooter(datasetName: string): string {
  return `\n\n─────────────\n📊 *${datasetName}*`;
}

// FUNÇÃO PRINCIPAL
export async function resolveSession(
  supabase: SupabaseClient,
  phone: string,
  message: string,
  authorizedNumber: any
): Promise<SessionResult> {
  
  // Se é comando de troca
  if (isChangeCommand(message)) {
    await clearSession(supabase, phone);
    const datasets = await getAvailableDatasets(supabase, phone);
    
    if (datasets.length === 0) {
      return {
        hasSession: false,
        session: null,
        needsSelection: false,
        availableDatasets: [],
        menuMessage: '❌ Seu número não tem acesso a nenhum sistema.'
      };
    }
    
    if (datasets.length === 1) {
      await setActiveSession(supabase, phone, datasets[0]);
      const newSession = await getActiveSession(supabase, phone);
      return {
        hasSession: true,
        session: newSession,
        needsSelection: false,
        availableDatasets: datasets,
        menuMessage: `🔄 Você só tem acesso a *${datasets[0].dataset_name}*. Continuando...`
      };
    }
    
    return {
      hasSession: false,
      session: null,
      needsSelection: true,
      availableDatasets: datasets,
      menuMessage: generateSelectionMenu(datasets, authorizedNumber?.name)
    };
  }

  // Buscar sessão ativa
  const session = await getActiveSession(supabase, phone);
  if (session) {
    await updateSessionActivity(supabase, phone);
    return {
      hasSession: true,
      session,
      needsSelection: false,
      availableDatasets: []
    };
  }

  // Buscar sessão EXPIRADA RECENTE (últimas 48h)
  // Se o usuário tinha sessão recente e manda "1","2","3", provavelmente é sugestão, não seleção
  const isShortMessage = /^[1-3]$/.test(message.trim());
  if (isShortMessage) {
    const { data: recentSession } = await supabase
      .from('whatsapp_active_sessions')
      .select('*')
      .eq('phone_number', phone)
      .gt('expires_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (recentSession) {
      // Reativar sessão expirada
      console.log('[resolveSession] Reativando sessão expirada para mensagem curta:', message);

      const datasets = await getAvailableDatasets(supabase, phone);
      const previousDataset = datasets.find(d => d.dataset_id === recentSession.dataset_id);

      if (previousDataset) {
        await setActiveSession(supabase, phone, previousDataset);
        const newSession = await getActiveSession(supabase, phone);
        return {
          hasSession: true,
          session: newSession,
          needsSelection: false,
          availableDatasets: datasets
        };
      }
    }
  }

  // Buscar datasets disponíveis
  const datasets = await getAvailableDatasets(supabase, phone);

  if (datasets.length === 0) {
    return {
      hasSession: false,
      session: null,
      needsSelection: false,
      availableDatasets: [],
      menuMessage: '❌ Seu número não tem acesso a nenhum sistema.'
    };
  }

  if (datasets.length === 1) {
    await setActiveSession(supabase, phone, datasets[0]);
    const newSession = await getActiveSession(supabase, phone);
    return {
      hasSession: true,
      session: newSession,
      needsSelection: false,
      availableDatasets: datasets
    };
  }

  // Verificar se mensagem é seleção de dataset
  const selected = findDatasetByInput(datasets, message);
  if (selected) {
    await setActiveSession(supabase, phone, selected);
    const newSession = await getActiveSession(supabase, phone);

    // Se a mensagem era APENAS um número ou nome de dataset, mostrar confirmação
    // Se era uma pergunta real que por coincidência contém nome do dataset, iniciar sessão e processar
    const isDirectSelection = /^\d+$/.test(message.trim()) ||
      datasets.some(d =>
        (d.dataset_name || '').toLowerCase() === message.trim().toLowerCase() ||
        (d.context_name || '').toLowerCase() === message.trim().toLowerCase() ||
        (d.connection_name || '').toLowerCase() === message.trim().toLowerCase()
      );

    if (isDirectSelection) {
      return {
        hasSession: false,
        session: null,
        needsSelection: false,
        availableDatasets: datasets,
        menuMessage: generateSelectionConfirmation(selected)
      };
    }

    // Era uma pergunta — ativar sessão e deixar processar
    return {
      hasSession: true,
      session: newSession,
      needsSelection: false,
      availableDatasets: datasets
    };
  }

  // Mostrar menu
  return {
    hasSession: false,
    session: null,
    needsSelection: true,
    availableDatasets: datasets,
    menuMessage: generateSelectionMenu(datasets, authorizedNumber?.name)
  };
}
