/**
 * API Route - Logout
 * 
 * Endpoint POST para encerrar a sessão do usuário no sistema MeuDashboard.
 * 
 * Processo:
 * 1. Opcionalmente registra log de logout (se houver usuário)
 * 2. Encerra sessão aberta em user_sessions (ended_at, duration_minutes)
 * 3. Remove o cookie de autenticação
 * 4. Retorna confirmação de logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    try {
      await logActivity({
        userId: user?.id,
        actionType: 'logout',
        module: 'auth',
        description: user ? `Logout: ${user.email}` : 'Logout',
        entityType: 'user',
        entityId: user?.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    } catch (_) {}

    if (user?.id) {
      try {
        const supabase = createAdminClient();
        const { data: session } = await supabase
          .from('user_sessions')
          .select('id, started_at')
          .eq('user_id', user.id)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          const startedAt = new Date(session.started_at);
          const now = new Date();
          const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000);
          await supabase
            .from('user_sessions')
            .update({
              ended_at: now.toISOString(),
              duration_minutes: Math.min(durationMinutes, 480),
            })
            .eq('id', session.id);
        }
      } catch (e) {
        console.error('[Session] Erro ao encerrar sessão:', e);
      }
    }

    await removeAuthCookie();

    // Retorna resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Logout realizado',
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}




