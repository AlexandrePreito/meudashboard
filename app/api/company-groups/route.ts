import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: groups, error } = await supabase
      .from('company_groups')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Erro ao buscar grupos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ groups: groups || [] });

  } catch (error: any) {
    console.error('Erro ao buscar grupos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

