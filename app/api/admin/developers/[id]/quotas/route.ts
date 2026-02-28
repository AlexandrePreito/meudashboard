import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - Buscar cotas atuais (do primeiro grupo ou zeros)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = getSupabase();

    const { data: group } = await supabase
      .from('company_groups')
      .select('quota_users, quota_screens, quota_alerts, quota_whatsapp_per_day, quota_ai_credits_per_day')
      .eq('developer_id', id)
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      quota_users: group?.quota_users ?? 0,
      quota_screens: group?.quota_screens ?? 0,
      quota_alerts: group?.quota_alerts ?? 0,
      quota_whatsapp_per_day: group?.quota_whatsapp_per_day ?? 0,
      quota_ai_credits_per_day: group?.quota_ai_credits_per_day ?? 0
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar cotas de todos os grupos do developer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabase();

    const {
      quota_users,
      quota_screens,
      quota_alerts,
      quota_whatsapp_per_day,
      quota_ai_credits_per_day
    } = body;

    const updateData: Record<string, number> = {};
    if (quota_users !== undefined) updateData.quota_users = Number(quota_users) || 0;
    if (quota_screens !== undefined) updateData.quota_screens = Number(quota_screens) || 0;
    if (quota_alerts !== undefined) updateData.quota_alerts = Number(quota_alerts) || 0;
    if (quota_whatsapp_per_day !== undefined) updateData.quota_whatsapp_per_day = Number(quota_whatsapp_per_day) || 0;
    if (quota_ai_credits_per_day !== undefined) updateData.quota_ai_credits_per_day = Number(quota_ai_credits_per_day) || 0;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase
      .from('company_groups')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('developer_id', id);

    if (error) {
      console.error('Erro ao atualizar cotas:', error);
      return NextResponse.json({ error: 'Erro ao atualizar cotas' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
