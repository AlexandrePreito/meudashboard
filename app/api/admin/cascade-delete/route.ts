import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { type, id, password } = await request.json();

    if (!type || !id || !password) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: userData } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(password, userData.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    if (type === 'developer') {
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('developer_id', id);

      const groupIds = groups?.map(g => g.id) || [];

      if (groupIds.length > 0) {
        await supabase.from('screens').delete().in('group_id', groupIds);
      }

      if (groupIds.length > 0) {
        await supabase.from('users').delete().in('group_id', groupIds);
      }

      await supabase.from('users').delete().eq('developer_id', id);

      if (groupIds.length > 0) {
        await supabase.from('groups').delete().in('id', groupIds);
      }

      const { error } = await supabase.from('developers').delete().eq('id', id);

      if (error) {
        throw error;
      }

    } else if (type === 'group') {
      await supabase.from('screens').delete().eq('group_id', id);
      await supabase.from('users').delete().eq('group_id', id);

      const { error } = await supabase.from('groups').delete().eq('id', id);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Cascade delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
