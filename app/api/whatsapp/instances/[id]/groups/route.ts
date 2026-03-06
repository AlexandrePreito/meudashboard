import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: instanceId } = await params;
    const supabase = createAdminClient();

    // Descobrir o developer_id dono da instância
    let targetDevId: string | null = null;

    // 1. Campo direto na instância
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('developer_id, created_by')
      .eq('id', instanceId)
      .single();

    if (instance?.developer_id) {
      targetDevId = instance.developer_id;
    }

    // 2. Fallback: buscar via created_by (quem criou a instância)
    if (!targetDevId && instance?.created_by) {
      const creatorDevId = await getUserDeveloperId(instance.created_by);
      if (creatorDevId) {
        targetDevId = creatorDevId;
      }
    }

    // 3. Fallback: developer mais frequente entre os grupos vinculados
    if (!targetDevId) {
      const { data: instanceGroups } = await supabase
        .from('whatsapp_instance_groups')
        .select('company_group:company_groups(developer_id)')
        .eq('instance_id', instanceId);

      const devCount: Record<string, number> = {};
      for (const ig of instanceGroups || []) {
        const cg = ig.company_group as any;
        const devId = Array.isArray(cg) ? cg[0]?.developer_id : cg?.developer_id;
        if (devId) devCount[devId] = (devCount[devId] || 0) + 1;
      }

      let maxCount = 0;
      for (const [devId, count] of Object.entries(devCount)) {
        if (count > maxCount) {
          maxCount = count;
          targetDevId = devId;
        }
      }
    }

    if (!targetDevId) {
      return NextResponse.json({ groups: [] });
    }

    // Se o usuário é developer, validar que é o dono
    if (!user.is_master) {
      const userDevId = await getUserDeveloperId(user.id);
      if (!userDevId || userDevId !== targetDevId) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    // Buscar apenas os grupos deste developer
    const { data: groups, error } = await supabase
      .from('company_groups')
      .select('id, name')
      .eq('developer_id', targetDevId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ groups: groups || [] });
  } catch (error: any) {
    console.error('Erro ao buscar grupos da instância:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
