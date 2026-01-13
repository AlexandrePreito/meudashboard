import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Nao e desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Teste COM join
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .select(`
        *,
        plan:developer_plans(*)
      `)
      .eq('id', developerId)
      .single();

    if (devError) {
      return NextResponse.json({ 
        error: 'Erro no join', 
        devError: devError.message,
        code: devError.code,
        details: devError.details
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      developer 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Erro catch', 
      message: error.message 
    }, { status: 500 });
  }
}