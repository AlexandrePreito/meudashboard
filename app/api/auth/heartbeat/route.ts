import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function POST() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: session } = await supabase
      .from('user_sessions')
      .select('id, started_at')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date();

    if (session) {
      const startedAt = new Date(session.started_at);
      const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);

      if (durationMinutes > 480) {
        try {
          await supabase
            .from('user_sessions')
            .update({ ended_at: now.toISOString(), duration_minutes: 480 })
            .eq('id', session.id);

          await supabase.from('user_sessions').insert({
            user_id: user.id,
            started_at: now.toISOString(),
          });
        } catch (e) {
          console.error('[Heartbeat] Erro ao rotacionar sessão:', e);
        }
      } else {
        try {
          await supabase
            .from('user_sessions')
            .update({ duration_minutes: durationMinutes })
            .eq('id', session.id);
        } catch (e) {
          console.error('[Heartbeat] Erro ao atualizar sessão:', e);
        }
      }
    } else {
      try {
        await supabase.from('user_sessions').insert({
          user_id: user.id,
          started_at: now.toISOString(),
        });
      } catch (e) {
        console.error('[Heartbeat] Erro ao criar sessão:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
