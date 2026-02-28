import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

/**
 * GET — Lista recursos compartilhados do developer (developer_id = X, company_group_id IS NULL)
 * com estatísticas de uso (quantos grupos usam cada recurso).
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !user.is_master) {
      return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const effectiveDevId = user.is_master && request.nextUrl.searchParams.get('developer_id')
      ? request.nextUrl.searchParams.get('developer_id')
      : developerId;

    if (!effectiveDevId) {
      return NextResponse.json({
        connection: null,
        whatsappInstance: null,
        training: { contextsCount: 0, examplesCount: 0, queryLearningCount: 0 },
        groupsTotal: 0,
        usage: { connection: { total: 0, usingShared: 0 }, whatsapp: { total: 0, usingShared: 0 } }
      });
    }

    const { data: groups } = await supabase
      .from('company_groups')
      .select('id')
      .eq('developer_id', effectiveDevId)
      .eq('status', 'active');
    const groupIds = groups?.map(g => g.id) || [];
    const groupsTotal = groupIds.length;

    const { data: sharedConnections } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('developer_id', effectiveDevId)
      .is('company_group_id', null)
      .eq('is_active', true)
      .order('created_at');
    const connection = sharedConnections?.[0] || null;

    let connectionUsingShared = 0;
    if (connection && groupIds.length > 0) {
      for (const gid of groupIds) {
        const { data: gc } = await supabase
          .from('powerbi_connections')
          .select('id')
          .eq('company_group_id', gid)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();
        if (!gc) connectionUsingShared++;
      }
    }

    const { data: sharedInstances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('developer_id', effectiveDevId)
      .is('company_group_id', null)
      .order('created_at');
    const whatsappInstance = sharedInstances?.[0] || null;

    let whatsappUsingShared = 0;
    if (whatsappInstance && groupIds.length > 0) {
      for (const gid of groupIds) {
        const { data: wi } = await supabase
          .from('whatsapp_instances')
          .select('id')
          .eq('company_group_id', gid)
          .limit(1)
          .maybeSingle();
        if (!wi) whatsappUsingShared++;
      }
    }

    const [ctxRes, exRes] = await Promise.all([
      supabase
        .from('ai_model_contexts')
        .select('id', { count: 'exact', head: true })
        .eq('developer_id', effectiveDevId)
        .is('company_group_id', null)
        .eq('is_active', true),
      supabase
        .from('ai_training_examples')
        .select('id', { count: 'exact', head: true })
        .eq('developer_id', effectiveDevId)
        .is('company_group_id', null)
        .eq('is_validated', true)
    ]);
    const contextsCount = ctxRes.count ?? 0;
    const examplesCount = exRes.count ?? 0;

    const { count: queryLearningCount } = await supabase
      .from('ai_query_learning')
      .select('id', { count: 'exact', head: true })
      .in('company_group_id', groupIds);

    return NextResponse.json({
      connection: connection ? {
        ...connection,
        _source: 'developer',
        _label: `${connection.name} (compartilhada)`,
        usage: { total: groupsTotal, usingShared: connectionUsingShared }
      } : null,
      whatsappInstance: whatsappInstance ? {
        ...whatsappInstance,
        _source: 'developer',
        _label: whatsappInstance.instance_name || 'Compartilhada',
        usage: { total: groupsTotal, usingShared: whatsappUsingShared }
      } : null,
      training: {
        contextsCount,
        examplesCount,
        queryLearningCount: queryLearningCount ?? 0,
        groupsTotal
      },
      groupsTotal,
      usage: {
        connection: { total: groupsTotal, usingShared: connectionUsingShared },
        whatsapp: { total: groupsTotal, usingShared: whatsappUsingShared }
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[shared-resources GET]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST — Criar recurso compartilhado (type: 'connection' | 'whatsapp').
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });
    }

    const body = await request.json();
    const { type } = body;
    const supabase = createAdminClient();

    if (type === 'connection') {
      const { name, tenant_id, client_id, client_secret, workspace_id, show_page_navigation } = body;
      if (!name || !tenant_id || !client_id || !client_secret || !workspace_id) {
        return NextResponse.json({ error: 'Campos obrigatórios: name, tenant_id, client_id, client_secret, workspace_id' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('powerbi_connections')
        .insert({
          developer_id: developerId,
          company_group_id: null,
          name,
          tenant_id,
          client_id,
          client_secret,
          workspace_id,
          show_page_navigation: show_page_navigation ?? true,
          is_active: true
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ connection: data }, { status: 201 });
    }

    if (type === 'whatsapp') {
      const { instance_name, api_url, api_key } = body;
      if (!instance_name || !api_url || !api_key) {
        return NextResponse.json({ error: 'Campos obrigatórios: instance_name, api_url, api_key' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .insert({
          developer_id: developerId,
          company_group_id: null,
          instance_name,
          api_url: String(api_url).replace(/\/$/, ''),
          api_key,
          is_connected: false
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ whatsappInstance: data }, { status: 201 });
    }

    return NextResponse.json({ error: 'Tipo inválido. Use connection ou whatsapp.' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[shared-resources POST]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT — Atualizar recurso compartilhado (connection ou whatsapp por id).
 */
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, ...rest } = body;
    if (!type || !id) {
      return NextResponse.json({ error: 'type e id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (type === 'connection') {
      const { data: existing } = await supabase
        .from('powerbi_connections')
        .select('id, developer_id, company_group_id')
        .eq('id', id)
        .single();
      if (!existing || existing.developer_id !== developerId || existing.company_group_id != null) {
        return NextResponse.json({ error: 'Recurso não encontrado ou sem permissão' }, { status: 404 });
      }
      const { name, tenant_id, client_id, client_secret, workspace_id, show_page_navigation, is_active } = rest;
      const update: Record<string, unknown> = {};
      if (name !== undefined) update.name = name;
      if (tenant_id !== undefined) update.tenant_id = tenant_id;
      if (client_id !== undefined) update.client_id = client_id;
      if (client_secret !== undefined) update.client_secret = client_secret;
      if (workspace_id !== undefined) update.workspace_id = workspace_id;
      if (show_page_navigation !== undefined) update.show_page_navigation = show_page_navigation;
      if (is_active !== undefined) update.is_active = is_active;
      const { data, error } = await supabase
        .from('powerbi_connections')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ connection: data });
    }

    if (type === 'whatsapp') {
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id, developer_id, company_group_id')
        .eq('id', id)
        .single();
      if (!existing || existing.developer_id !== developerId || existing.company_group_id != null) {
        return NextResponse.json({ error: 'Recurso não encontrado ou sem permissão' }, { status: 404 });
      }
      const { instance_name, api_url, api_key, is_connected } = rest;
      const update: Record<string, unknown> = {};
      if (instance_name !== undefined) update.instance_name = instance_name;
      if (api_url !== undefined) update.api_url = String(api_url).replace(/\/$/, '');
      if (api_key !== undefined) update.api_key = api_key;
      if (is_connected !== undefined) update.is_connected = is_connected;
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .update(update)
        .eq('id', id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ whatsappInstance: data });
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[shared-resources PUT]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE — Remover recurso compartilhado (connection ou whatsapp por id).
 */
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    if (!type || !id) {
      return NextResponse.json({ error: 'type e id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (type === 'connection') {
      const { data: existing } = await supabase
        .from('powerbi_connections')
        .select('id, developer_id, company_group_id')
        .eq('id', id)
        .single();
      if (!existing || existing.developer_id !== developerId || existing.company_group_id != null) {
        return NextResponse.json({ error: 'Recurso não encontrado ou sem permissão' }, { status: 404 });
      }
      const { error } = await supabase.from('powerbi_connections').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    if (type === 'whatsapp') {
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id, developer_id, company_group_id')
        .eq('id', id)
        .single();
      if (!existing || existing.developer_id !== developerId || existing.company_group_id != null) {
        return NextResponse.json({ error: 'Recurso não encontrado ou sem permissão' }, { status: 404 });
      }
      const { error } = await supabase.from('whatsapp_instances').delete().eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[shared-resources DELETE]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
